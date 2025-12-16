import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * Calculate idle time based on activity logs
 * @param attendanceId - The attendance record ID
 * @param punchInTime - Punch in timestamp in milliseconds
 * @param punchOutTime - Punch out timestamp in milliseconds
 * @returns Idle time in hours
 */
async function calculateIdleTime(
  attendanceId: string,
  punchInTime: number,
  punchOutTime: number
): Promise<number> {
  const IDLE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes in milliseconds

  // Get all activity logs for this attendance
  const activityLogs = await prisma.activityLog.findMany({
    where: { attendanceId },
    orderBy: { timestamp: 'asc' },
  });

  if (activityLogs.length === 0) {
    // No activity logs means user was completely idle
    const totalTimeMs = punchOutTime - punchInTime;
    return totalTimeMs / (1000 * 60 * 60); // Convert to hours
  }

  let totalIdleMs = 0;
  let lastActivityTime = punchInTime;

  // Calculate gaps between activities
  for (const log of activityLogs) {
    const logTime = new Date(log.timestamp).getTime();
    const gapMs = logTime - lastActivityTime;

    // If gap is longer than threshold, consider it idle time
    if (gapMs > IDLE_THRESHOLD_MS) {
      totalIdleMs += gapMs - IDLE_THRESHOLD_MS; // Subtract threshold to be fair
    }

    lastActivityTime = logTime;
  }

  // Check gap between last activity and punch out
  const finalGapMs = punchOutTime - lastActivityTime;
  if (finalGapMs > IDLE_THRESHOLD_MS) {
    totalIdleMs += finalGapMs - IDLE_THRESHOLD_MS;
  }

  // Convert to hours
  return totalIdleMs / (1000 * 60 * 60);
}

// GET /api/attendance - Get attendance records
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query
    const where: any = {};

    if (employeeId) {
      where.employeeId = employeeId;
    } else if (session.role === 'EMPLOYEE') {
      // Employees can only see their own attendance
      where.employeeId = session.employeeId!;
    } else if (session.role === 'MANAGER') {
      // Managers can see their team's attendance
      const manager = await prisma.employee.findUnique({
        where: { id: session.employeeId! },
        include: { subordinates: true },
      });

      if (manager) {
        where.employeeId = {
          in: [manager.id, ...manager.subordinates.map(s => s.id)],
        };
      }
    }
    // Admins can see all attendance (no filter)

    if (date) {
      const dateObj = new Date(date);
      where.date = {
        gte: new Date(dateObj.setHours(0, 0, 0, 0)),
        lte: new Date(dateObj.setHours(23, 59, 59, 999)),
      };
    } else if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            email: true,
            designation: true,
            department: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(attendance);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance' },
      { status: 500 }
    );
  }
}

// POST /api/attendance - Punch in/out
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, employeeId } = body; // action: 'punch-in', 'punch-out', 'break-start', 'break-end'

    // Employees can only punch for themselves
    const targetEmployeeId = session.role === 'EMPLOYEE' ? session.employeeId! : employeeId;

    if (!targetEmployeeId) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find today's attendance record
    let attendance = await prisma.attendance.findFirst({
      where: {
        employeeId: targetEmployeeId,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    const now = new Date();

    if (action === 'punch-in') {
      if (attendance) {
        return NextResponse.json(
          { error: 'Already punched in today' },
          { status: 400 }
        );
      }

      attendance = await prisma.attendance.create({
        data: {
          employeeId: targetEmployeeId,
          date: today,
          punchIn: now,
          status: 'PRESENT',
        },
        include: {
          employee: {
            select: {
              id: true,
              employeeId: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return NextResponse.json(attendance);
    }

    if (!attendance) {
      return NextResponse.json(
        { error: 'No punch-in record found for today' },
        { status: 400 }
      );
    }

    if (action === 'punch-out') {
      if (attendance.punchOut) {
        return NextResponse.json(
          { error: 'Already punched out today' },
          { status: 400 }
        );
      }

      // Calculate total hours and break duration
      const punchInTime = attendance.punchIn ? new Date(attendance.punchIn).getTime() : 0;
      const punchOutTime = now.getTime();
      let totalHours = (punchOutTime - punchInTime) / (1000 * 60 * 60);

      let breakDuration = 0;
      // Calculate break time if any
      if (attendance.breakStart && attendance.breakEnd) {
        const breakStartTime = new Date(attendance.breakStart).getTime();
        const breakEndTime = new Date(attendance.breakEnd).getTime();
        breakDuration = (breakEndTime - breakStartTime) / (1000 * 60 * 60);
        totalHours -= breakDuration;
      }

      // Calculate idle time based on activity logs
      const idleTime = await calculateIdleTime(attendance.id, punchInTime, punchOutTime);

      // Subtract idle time from total hours for actual work time
      const actualWorkHours = Math.max(0, totalHours - idleTime);

      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          punchOut: now,
          totalHours: Math.round(totalHours * 100) / 100, // Round to 2 decimal places
          breakDuration: Math.round(breakDuration * 100) / 100,
          idleTime: Math.round(idleTime * 100) / 100,
          status: actualWorkHours >= 4 ? 'PRESENT' : 'HALF_DAY',
        },
        include: {
          employee: {
            select: {
              id: true,
              employeeId: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return NextResponse.json(attendance);
    }

    if (action === 'break-start') {
      if (attendance.breakStart) {
        return NextResponse.json(
          { error: 'Break already started' },
          { status: 400 }
        );
      }

      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: { breakStart: now },
        include: {
          employee: {
            select: {
              id: true,
              employeeId: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return NextResponse.json(attendance);
    }

    if (action === 'break-end') {
      if (!attendance.breakStart) {
        return NextResponse.json(
          { error: 'No break started' },
          { status: 400 }
        );
      }

      if (attendance.breakEnd) {
        return NextResponse.json(
          { error: 'Break already ended' },
          { status: 400 }
        );
      }

      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: { breakEnd: now },
        include: {
          employee: {
            select: {
              id: true,
              employeeId: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return NextResponse.json(attendance);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing attendance:', error);
    return NextResponse.json(
      { error: 'Failed to process attendance' },
      { status: 500 }
    );
  }
}
