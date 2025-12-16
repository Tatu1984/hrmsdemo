import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createAzureDevOpsClient } from '@/lib/integrations/azure-devops-client';

// GET /api/integrations/azure-devops/project - Get detailed project information
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');
    const projectName = searchParams.get('projectName');

    if (!connectionId || !projectName) {
      return NextResponse.json(
        { error: 'Connection ID and project name are required' },
        { status: 400 }
      );
    }

    // Get the connection
    const connection = await prisma.integrationConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || connection.platform !== 'AZURE_DEVOPS') {
      return NextResponse.json(
        { error: 'Invalid Azure DevOps connection' },
        { status: 404 }
      );
    }

    // Create Azure DevOps client
    const client = createAzureDevOpsClient(
      connection.organizationUrl,
      connection.accessToken
    );

    // Fetch all data in parallel
    const [repositories, pipelines, builds, workItems] = await Promise.all([
      client.getRepositories(projectName),
      client.getPipelines(projectName),
      client.getBuilds(projectName, { top: 20 }),
      prisma.workItem.findMany({
        where: {
          connectionId,
          projectName,
        },
        include: {
          commits: {
            orderBy: { commitDate: 'desc' },
            take: 10,
          },
        },
        orderBy: { modifiedDate: 'desc' },
        take: 50,
      }),
    ]);

    // Get recent commits for each repository
    const reposWithCommits = await Promise.all(
      repositories.map(async (repo) => {
        const commits = await client.getCommits(projectName, repo.id, { top: 10 });
        const pullRequests = await client.getPullRequests(projectName, repo.id, {
          status: 'active',
          top: 10,
        });
        return {
          ...repo,
          commits,
          pullRequests,
        };
      })
    );

    return NextResponse.json({
      projectName,
      repositories: reposWithCommits,
      pipelines,
      builds,
      workItems,
    });
  } catch (error) {
    console.error('Error fetching Azure DevOps project details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project details' },
      { status: 500 }
    );
  }
}
