import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/integrations/user-mappings - Get user mappings and unmapped users
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
    }

    // Get existing mappings
    const existingMappings = await prisma.integrationUserMapping.findMany({
      where: { connectionId },
    });

    // Get all work items for this connection
    const workItems = await prisma.workItem.findMany({
      where: {
        connectionId,
        NOT: [
          { assignedTo: null },
          { assignedToName: null },
        ],
      },
      select: {
        assignedTo: true,
        assignedToName: true,
        metadata: true,
      },
    });

    console.log(`Found ${workItems.length} work items with assigned users`);

    // Extract unique users
    const usersMap = new Map();

    workItems.forEach((item) => {
      if (item.assignedTo && item.assignedToName && !usersMap.has(item.assignedTo)) {
        const metadata = item.metadata as any;
        const email = metadata?.['System.AssignedTo']?.uniqueName ||
                     metadata?.assignee?.email ||
                     '';

        usersMap.set(item.assignedTo, {
          externalId: item.assignedTo,
          externalUsername: item.assignedToName,
          externalEmail: email,
        });
      }
    });

    console.log(`Extracted ${usersMap.size} unique users`);

    // Merge with existing mappings
    const allUsers = Array.from(usersMap.values()).map((user) => {
      const existing = existingMappings.find((m) => m.externalUserId === user.externalId);
      return {
        id: existing?.id,
        externalId: user.externalId,
        externalUsername: user.externalUsername,
        externalEmail: user.externalEmail,
        employeeId: existing?.employeeId,
      };
    });

    console.log(`Returning ${allUsers.length} users for connectionId ${connectionId}`);
    return NextResponse.json(allUsers);
  } catch (error) {
    console.error('Error fetching user mappings:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({
      error: 'Failed to fetch user mappings',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// POST /api/integrations/user-mappings - Save user mappings
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { connectionId, mappings } = body;

    if (!connectionId || !Array.isArray(mappings)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Delete existing mappings for this connection
    await prisma.integrationUserMapping.deleteMany({
      where: { connectionId },
    });

    // Create new mappings
    const createPromises = mappings
      .filter((m: any) => m.employeeId)
      .map((mapping: any) =>
        prisma.integrationUserMapping.create({
          data: {
            connectionId,
            externalUserId: mapping.externalId,
            externalName: mapping.externalUsername,
            externalEmail: mapping.externalEmail,
            employeeId: mapping.employeeId,
            employeeEmail: mapping.employeeEmail || '',
          },
        })
      );

    await Promise.all(createPromises);

    // Update work items with the new employee mappings
    for (const mapping of mappings) {
      if (mapping.employeeId) {
        await prisma.workItem.updateMany({
          where: {
            connectionId,
            assignedTo: mapping.externalId,
          },
          data: {
            assignedToId: mapping.employeeId,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving user mappings:', error);
    return NextResponse.json({ error: 'Failed to save user mappings' }, { status: 500 });
  }
}
