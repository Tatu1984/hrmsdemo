import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/integrations/work-items - Get work items with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const platform = searchParams.get('platform');
    const status = searchParams.get('status');
    const connectionId = searchParams.get('connectionId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query filters
    const where: any = {};

    // Role-based access
    if (session.role === 'EMPLOYEE') {
      // Employees can only see their own work items
      where.assignedToId = session.employeeId;
    } else if (session.role === 'MANAGER' && employeeId) {
      // Manager viewing specific employee
      where.assignedToId = employeeId;
    }
    // Managers without employeeId filter and Admins can see all work items (no assignedToId filter)

    // Apply additional filters
    if (employeeId && session.role === 'ADMIN') {
      where.assignedToId = employeeId;
    }

    if (platform) {
      where.platform = platform;
    }

    if (status) {
      where.status = status;
    }

    if (connectionId) {
      where.connectionId = connectionId;
    }

    if (startDate || endDate) {
      where.createdDate = {};
      if (startDate) where.createdDate.gte = new Date(startDate);
      if (endDate) where.createdDate.lte = new Date(endDate);
    }

    const workItems = await prisma.workItem.findMany({
      where,
      include: {
        connection: {
          select: {
            name: true,
            platform: true,
          },
        },
        commits: {
          select: {
            id: true,
            commitHash: true,
            commitMessage: true,
            commitDate: true,
            filesChanged: true,
            linesAdded: true,
            linesDeleted: true,
          },
          orderBy: {
            commitDate: 'desc',
          },
          take: 5,
        },
      },
      orderBy: {
        modifiedDate: 'desc',
      },
      take: 100,
    });

    return NextResponse.json(workItems);
  } catch (error) {
    console.error('Error fetching work items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch work items' },
      { status: 500 }
    );
  }
}
