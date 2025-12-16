import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/daily-work-updates - Fetch daily work updates
export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.employeeId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const month = searchParams.get('month'); // Format: YYYY-MM
    const date = searchParams.get('date'); // Format: YYYY-MM-DD

    // If specific employee is requested, check permissions
    const requestedEmployeeId = employeeId || session.employeeId;

    // Only allow viewing own updates unless ADMIN or MANAGER
    if (session.role === 'EMPLOYEE' && requestedEmployeeId !== session.employeeId) {
      return NextResponse.json(
        { error: 'You can only view your own work updates' },
        { status: 403 }
      );
    }

    // Build query filters
    const where: any = {
      employeeId: requestedEmployeeId,
    };

    if (date) {
      // Fetch for a specific date
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);

      where.date = {
        gte: targetDate,
        lt: nextDate,
      };
    } else if (month) {
      // Fetch for a specific month
      const [year, monthNum] = month.split('-').map(Number);
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 1);

      where.date = {
        gte: startDate,
        lt: endDate,
      };
    } else {
      // Default: Fetch last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      where.date = {
        gte: thirtyDaysAgo,
      };
    }

    const updates = await prisma.dailyWorkUpdate.findMany({
      where,
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      updates,
    });

  } catch (error) {
    console.error('Error fetching daily work updates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily work updates' },
      { status: 500 }
    );
  }
}

// POST /api/daily-work-updates - Create or update a daily work update
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.employeeId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { date, workCompleted, obstaclesOvercome, tasksLeft } = body;

    // Validate required fields
    if (!date || !workCompleted) {
      return NextResponse.json(
        { error: 'Date and work completed are required' },
        { status: 400 }
      );
    }

    const employeeId = session.employeeId;
    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID not found' },
        { status: 400 }
      );
    }

    // Parse and normalize the date (set to start of day)
    const updateDate = new Date(date);
    updateDate.setHours(0, 0, 0, 0);

    // Upsert (create or update) the daily work update
    const update = await prisma.dailyWorkUpdate.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date: updateDate,
        },
      },
      update: {
        workCompleted,
        obstaclesOvercome: obstaclesOvercome || null,
        tasksLeft: tasksLeft || null,
      },
      create: {
        employeeId,
        date: updateDate,
        workCompleted,
        obstaclesOvercome: obstaclesOvercome || null,
        tasksLeft: tasksLeft || null,
      },
    });

    return NextResponse.json({
      success: true,
      update,
    });

  } catch (error) {
    console.error('Error creating/updating daily work update:', error);
    return NextResponse.json(
      { error: 'Failed to save daily work update' },
      { status: 500 }
    );
  }
}

// DELETE /api/daily-work-updates - Delete a daily work update
export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.employeeId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Update ID is required' },
        { status: 400 }
      );
    }

    // Verify the update belongs to the current employee
    const existingUpdate = await prisma.dailyWorkUpdate.findUnique({
      where: { id },
    });

    if (!existingUpdate) {
      return NextResponse.json(
        { error: 'Update not found' },
        { status: 404 }
      );
    }

    if (session.role === 'EMPLOYEE' && existingUpdate.employeeId !== session.employeeId) {
      return NextResponse.json(
        { error: 'You can only delete your own updates' },
        { status: 403 }
      );
    }

    await prisma.dailyWorkUpdate.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Daily work update deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting daily work update:', error);
    return NextResponse.json(
      { error: 'Failed to delete daily work update' },
      { status: 500 }
    );
  }
}
