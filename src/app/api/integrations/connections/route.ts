import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createAzureDevOpsClient } from '@/lib/integrations/azure-devops-client';
import { createAsanaClient } from '@/lib/integrations/asana-client';

// GET /api/integrations/connections - Get all integration connections
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connections = await prisma.integrationConnection.findMany({
      include: {
        userMappings: {
          select: {
            id: true,
            employeeId: true,
            employeeEmail: true,
            externalUserId: true,
            externalEmail: true,
            externalName: true,
          },
        },
        _count: {
          select: {
            workItems: true,
            commits: true,
            confluencePages: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Don't expose access tokens
    const sanitizedConnections = connections.map(conn => ({
      ...conn,
      accessToken: '***',
      refreshToken: '***',
    }));

    return NextResponse.json(sanitizedConnections);
  } catch (error) {
    console.error('Error fetching connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    );
  }
}

// POST /api/integrations/connections - Create new integration connection
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      platform,
      name,
      authType,
      accessToken,
      organizationUrl,
      organizationName,
      workspaceId,
      confluenceSpaceKey,
      confluenceEmail,
    } = body;

    // For Confluence, store email in organizationName field for now
    const finalOrgName = platform === 'CONFLUENCE' ? confluenceEmail : organizationName;

    // Validate required fields
    if (!platform || !name || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Test connection before saving
    let isValid = false;
    if (platform === 'AZURE_DEVOPS') {
      if (!organizationUrl) {
        return NextResponse.json(
          { error: 'Organization URL is required for Azure DevOps' },
          { status: 400 }
        );
      }
      const client = createAzureDevOpsClient(organizationUrl, accessToken);
      isValid = await client.testConnection();
    } else if (platform === 'ASANA') {
      const client = createAsanaClient(accessToken);
      isValid = await client.testConnection();

      // If no workspace ID provided, get the first one
      if (!workspaceId) {
        const workspaces = await client.getWorkspaces();
        if (workspaces.length > 0) {
          body.workspaceId = workspaces[0].gid;
        }
      }
    } else if (platform === 'CONFLUENCE') {
      if (!organizationUrl) {
        return NextResponse.json(
          { error: 'Organization URL is required for Confluence' },
          { status: 400 }
        );
      }
      if (!confluenceEmail) {
        return NextResponse.json(
          { error: 'Email is required for Confluence' },
          { status: 400 }
        );
      }
      const { createConfluenceClient } = await import('@/lib/integrations/confluence-client');
      const client = createConfluenceClient(organizationUrl, confluenceEmail, accessToken);
      isValid = await client.testConnection();
    } else {
      return NextResponse.json(
        { error: 'Invalid platform' },
        { status: 400 }
      );
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Connection test failed. Please check your credentials.' },
        { status: 400 }
      );
    }

    // Create connection
    const connection = await prisma.integrationConnection.create({
      data: {
        platform,
        name,
        authType: authType || 'PAT',
        accessToken, // TODO: Encrypt this in production
        organizationUrl,
        organizationName: finalOrgName,
        workspaceId: body.workspaceId,
        confluenceSpaceKey: confluenceSpaceKey || null,
        isActive: true,
        createdBy: session.employeeId,
      },
    });

    return NextResponse.json({
      ...connection,
      accessToken: '***', // Don't return token
    });
  } catch (error) {
    console.error('Error creating connection:', error);
    return NextResponse.json(
      { error: 'Failed to create connection' },
      { status: 500 }
    );
  }
}

// DELETE /api/integrations/connections/:id - Delete connection
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
    }

    await prisma.integrationConnection.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting connection:', error);
    return NextResponse.json(
      { error: 'Failed to delete connection' },
      { status: 500 }
    );
  }
}
