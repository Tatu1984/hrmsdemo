import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/work-items - Get work items from all integrations
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform'); // Filter by platform: AZURE_DEVOPS, ASANA, CONFLUENCE
    const status = searchParams.get('status'); // Filter by status
    const employeeId = searchParams.get('employeeId'); // For manager viewing team member's work

    const where: any = {};

    // Role-based filtering
    if (session.role === 'EMPLOYEE') {
      // Employees see only their assigned work items
      where.assignedToId = session.employeeId;
    } else if (session.role === 'MANAGER') {
      if (employeeId) {
        // Manager viewing specific employee
        where.assignedToId = employeeId;
      } else {
        // Manager sees their own + team work items
        const teamMembers = await prisma.employee.findMany({
          where: { reportingHeadId: session.employeeId },
          select: { id: true },
        });
        const teamIds = [session.employeeId!, ...teamMembers.map(t => t.id)];
        where.assignedToId = { in: teamIds };
      }
    }
    // ADMIN sees all work items (no filter needed)

    if (platform) {
      where.platform = platform;
    }

    if (status) {
      where.status = status;
    }

    const workItems = await prisma.workItem.findMany({
      where,
      include: {
        connection: {
          select: {
            id: true,
            platform: true,
            name: true,
          },
        },
      },
      orderBy: [
        { createdDate: 'desc' },
      ],
    });

    // Get employee details for assigned work items
    const employeeIds = [...new Set(workItems.map(w => w.assignedToId).filter(Boolean))];
    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds as string[] } },
      select: { id: true, name: true, designation: true },
    });

    const employeeMap = new Map(employees.map(e => [e.id, e]));

    // Enrich work items with employee details
    const enrichedWorkItems = workItems.map(item => ({
      ...item,
      assignedEmployee: item.assignedToId ? employeeMap.get(item.assignedToId) : null,
    }));

    return NextResponse.json(enrichedWorkItems);
  } catch (error) {
    console.error('Error fetching work items:', error);
    return NextResponse.json({ error: 'Failed to fetch work items' }, { status: 500 });
  }
}

// POST /api/work-items - Sync work items from integrations
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { connectionId } = body;

    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
    }

    // Get the integration connection
    const connection = await prisma.integrationConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Integration connection not found' }, { status: 404 });
    }

    // Sync logic will be implemented per platform
    // For now, return success message
    return NextResponse.json({
      success: true,
      message: `Sync started for ${connection.platform}`,
    });
  } catch (error) {
    console.error('Error syncing work items:', error);
    return NextResponse.json({ error: 'Failed to sync work items' }, { status: 500 });
  }
}
