import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getClientIp } from '@/lib/ip';
import { isFriday, isMonday, processWeekendCascade } from '@/lib/attendance-utils';

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
  // Idle time calculation strategy:
  // - Count only client-reported inactive heartbeats (user AFK with browser open)
  // - Server heartbeats (browser closed) are not counted as idle
  // - Each inactive heartbeat = 3 minutes of idle time

  const activityLogs = await prisma.activityLog.findMany({
    where: {
      attendanceId,
      active: false, // Only count inactive heartbeats
    },
    orderBy: { timestamp: 'asc' },
  });

  // Each inactive heartbeat represents 3 minutes of inactivity
  const HEARTBEAT_INTERVAL_MS = 3 * 60 * 1000;
  const totalIdleMs = activityLogs.length * HEARTBEAT_INTERVAL_MS;

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

// POST /api/attendance - Punch in/out or Manual create (Admin/Manager)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, employeeId, status, date, punchIn, punchOut, totalHours, breakDuration } = body;

    console.log('POST /api/attendance received:', { action, employeeId, status, date, hasSession: !!session, role: session?.role });

    // Check if this is a manual attendance creation (for calendar edit)
    if (!action && (session.role === 'ADMIN' || session.role === 'MANAGER')) {
      // Manual attendance creation
      if (!employeeId || !date || !status) {
        return NextResponse.json({ error: 'Employee ID, date, and status are required' }, { status: 400 });
      }

      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      // Check if record already exists for this employee and date
      const existingRecord = await prisma.attendance.findFirst({
        where: {
          employeeId,
          date: {
            gte: targetDate,
            lt: nextDay,
          },
        },
      });

      let attendance;
      if (existingRecord) {
        // Update existing record - redirect to PUT logic
        return NextResponse.json(
          { error: 'Record already exists. Use PUT to update.' },
          { status: 400 }
        );
      }

      // Create new record
      attendance = await prisma.attendance.create({
        data: {
          employeeId,
          date: targetDate,
          status,
          punchIn: punchIn ? new Date(punchIn) : null,
          punchOut: punchOut ? new Date(punchOut) : null,
          totalHours: totalHours || 0,
          breakDuration: breakDuration || 0,
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

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          userName: session.name,
          userRole: session.role,
          action: 'CREATE',
          entityType: 'Attendance',
          entityId: attendance.id,
          entityName: `${attendance.employee.name} - ${new Date(date).toLocaleDateString()}`,
          changes: {
            status: { from: null, to: status },
            date: { from: null, to: new Date(date) },
          },
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      // Apply weekend cascade rule for ABSENT status
      // Friday absent → Saturday absent, Monday absent → Sunday absent
      if (status === 'ABSENT' && (isFriday(targetDate) || isMonday(targetDate))) {
        await processWeekendCascade(employeeId, targetDate);
      }

      return NextResponse.json(attendance, { status: 201 });
    }

    // Regular punch in/out flow
    // Employees can only punch for themselves
    const targetEmployeeId = session.role === 'EMPLOYEE' ? session.employeeId! : employeeId;

    if (!targetEmployeeId) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
    }

    const now = new Date();

    if (action === 'punch-in') {
      // For punch-in, check if already punched in TODAY
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayAttendance = await prisma.attendance.findFirst({
        where: {
          employeeId: targetEmployeeId,
          date: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

      if (todayAttendance) {
        return NextResponse.json(
          { error: 'Already punched in for today.' },
          { status: 400 }
        );
      }

      // Create new attendance record with today's date
      // IMPORTANT: Use the date of punch-in, not calendar day
      const punchInDate = new Date(now);
      punchInDate.setHours(0, 0, 0, 0);

      // Capture IP address
      const ipAddress = getClientIp(request);

      const attendance = await prisma.attendance.create({
        data: {
          employeeId: targetEmployeeId,
          date: punchInDate, // Date when they punched in (locks the work to this date)
          punchIn: now,
          punchInIp: ipAddress,
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

    // For all other actions, find today's attendance record
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await prisma.attendance.findFirst({
      where: {
        employeeId: targetEmployeeId,
        date: {
          gte: today,
          lt: tomorrow,
        },
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

    if (!attendance) {
      return NextResponse.json(
        { error: 'No attendance record found for today. Please punch in first.' },
        { status: 400 }
      );
    }

    if (action === 'punch-out') {
      if (attendance.punchOut) {
        return NextResponse.json(
          { error: 'Already punched out' },
          { status: 400 }
        );
      }

      // Calculate total hours and break duration
      const punchInTime = attendance.punchIn ? new Date(attendance.punchIn).getTime() : 0;
      const punchOutTime = now.getTime();

      // Total elapsed time
      let totalElapsedHours = (punchOutTime - punchInTime) / (1000 * 60 * 60);

      // Calculate break time if any
      let breakDuration = 0;
      if (attendance.breakStart && attendance.breakEnd) {
        const breakStartTime = new Date(attendance.breakStart).getTime();
        const breakEndTime = new Date(attendance.breakEnd).getTime();
        breakDuration = (breakEndTime - breakStartTime) / (1000 * 60 * 60);
      } else if (attendance.breakStart && !attendance.breakEnd) {
        // Break started but not ended - calculate break duration until punch out
        const breakStartTime = new Date(attendance.breakStart).getTime();
        breakDuration = (punchOutTime - breakStartTime) / (1000 * 60 * 60);
      }

      // Calculate idle time based on activity logs
      const idleTime = await calculateIdleTime(attendance.id, punchInTime, punchOutTime);

      // Calculate total work hours: Total time - Break time
      const totalHours = totalElapsedHours - breakDuration;

      // Determine attendance status based on total hours (NOT actual work hours)
      // Logic: < 6 hours total = HALF_DAY, >= 6 hours = PRESENT
      const attendanceStatus = totalHours >= 6 ? 'PRESENT' : 'HALF_DAY';

      console.log('Punch-out calculation:', {
        totalElapsedHours: totalElapsedHours.toFixed(2),
        breakDuration: breakDuration.toFixed(2),
        idleTime: idleTime.toFixed(2),
        totalHours: totalHours.toFixed(2),
        status: attendanceStatus,
      });

      // Capture IP address for punch out
      const ipAddress = getClientIp(request);

      const updatedAttendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          punchOut: now,
          punchOutIp: ipAddress,
          totalHours: Math.round(totalHours * 100) / 100, // Total work time (excluding breaks)
          breakDuration: Math.round(breakDuration * 100) / 100,
          idleTime: Math.round(idleTime * 100) / 100,
          status: attendanceStatus,
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

      return NextResponse.json(updatedAttendance);
    }

    if (action === 'break-start') {
      // Check if break is currently active (started but not ended)
      if (attendance.breakStart && !attendance.breakEnd) {
        return NextResponse.json(
          { error: 'Break already started' },
          { status: 400 }
        );
      }

      // If a previous break was completed, reset breakEnd to allow a new break
      const breakData: { breakStart: Date; breakEnd?: null } = { breakStart: now };
      if (attendance.breakEnd) {
        breakData.breakEnd = null;
      }

      const updatedAttendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: breakData,
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

      return NextResponse.json(updatedAttendance);
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

      const updatedAttendance = await prisma.attendance.update({
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

      return NextResponse.json(updatedAttendance);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing attendance:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      {
        error: 'Failed to process attendance',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/attendance - Edit attendance record (Admin/Manager only for backdated changes)
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized - Admin/Manager only' }, { status: 401 });
    }

    const body = await request.json();
    const { attendanceId, status, punchIn, punchOut, date, totalHours, breakDuration } = body;

    if (!attendanceId) {
      return NextResponse.json({ error: 'Attendance ID required' }, { status: 400 });
    }

    // Find the attendance record
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
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

    if (!attendance) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
    }

    // Build change log
    const changes: any = {};
    if (status && status !== attendance.status) {
      changes.status = { from: attendance.status, to: status };
    }
    if (date && new Date(date).getTime() !== new Date(attendance.date).getTime()) {
      changes.date = { from: attendance.date, to: new Date(date) };
    }
    if (punchIn && punchIn !== attendance.punchIn?.toString()) {
      changes.punchIn = { from: attendance.punchIn, to: new Date(punchIn) };
    }
    if (punchOut && punchOut !== attendance.punchOut?.toString()) {
      changes.punchOut = { from: attendance.punchOut, to: new Date(punchOut) };
    }
    if (totalHours !== undefined && totalHours !== attendance.totalHours) {
      changes.totalHours = { from: attendance.totalHours, to: totalHours };
    }
    if (breakDuration !== undefined && breakDuration !== attendance.breakDuration) {
      changes.breakDuration = { from: attendance.breakDuration, to: breakDuration };
    }

    // Build update data
    const updateData: any = {};
    if (status) updateData.status = status;
    if (punchIn) updateData.punchIn = new Date(punchIn);
    if (punchOut) updateData.punchOut = new Date(punchOut);
    if (date) updateData.date = new Date(date);
    if (totalHours !== undefined) updateData.totalHours = totalHours;
    if (breakDuration !== undefined) updateData.breakDuration = breakDuration;

    // Update the attendance record
    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendanceId },
      data: updateData,
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

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        userName: session.name,
        userRole: session.role,
        action: 'UPDATE',
        entityType: 'Attendance',
        entityId: attendanceId,
        entityName: `${attendance.employee.name} - ${new Date(attendance.date).toLocaleDateString()}`,
        changes,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    // Apply weekend cascade rule if status was changed to ABSENT
    // Friday absent → Saturday absent, Monday absent → Sunday absent
    if (status === 'ABSENT' && attendance.status !== 'ABSENT') {
      const attendanceDate = new Date(updatedAttendance.date);
      attendanceDate.setHours(0, 0, 0, 0);
      if (isFriday(attendanceDate) || isMonday(attendanceDate)) {
        await processWeekendCascade(attendance.employeeId, attendanceDate);
      }
    }

    return NextResponse.json(updatedAttendance);
  } catch (error) {
    console.error('Error updating attendance:', error);
    return NextResponse.json(
      { error: 'Failed to update attendance' },
      { status: 500 }
    );
  }
}
