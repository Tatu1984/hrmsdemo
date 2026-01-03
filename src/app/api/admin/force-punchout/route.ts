import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuth, isAdmin } from '@/lib/auth';

/**
 * Admin API to force punch-out an employee
 * Use when an employee forgot to punch out or their session is stuck
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !isAdmin(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const body = await request.json();
    const { employeeId, employeeCode } = body;

    if (!employeeId && !employeeCode) {
      return NextResponse.json({ error: 'employeeId or employeeCode required' }, { status: 400 });
    }

    // Find employee
    let employee;
    if (employeeCode) {
      employee = await prisma.employee.findFirst({
        where: { employeeId: employeeCode },
      });
    } else {
      employee = await prisma.employee.findUnique({
        where: { id: employeeId },
      });
    }

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find today's attendance record
    const attendance = await prisma.attendance.findFirst({
      where: {
        employeeId: employee.id,
        date: {
          gte: today,
          lt: tomorrow,
        },
        punchIn: { not: null },
        punchOut: null, // Only if not already punched out
      },
    });

    if (!attendance) {
      return NextResponse.json({
        error: 'No active attendance found',
        message: 'Employee is either not punched in today or already punched out'
      }, { status: 400 });
    }

    // Calculate total hours
    const punchInTime = new Date(attendance.punchIn!);
    const totalHours = (now.getTime() - punchInTime.getTime()) / (1000 * 60 * 60);

    // Force punch out
    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        punchOut: now,
        totalHours: Math.round(totalHours * 100) / 100,
        status: totalHours >= 8 ? 'PRESENT' : totalHours >= 4 ? 'HALF_DAY' : 'PRESENT',
      },
    });

    return NextResponse.json({
      success: true,
      message: `Force punched out ${employee.name} (${employee.employeeId})`,
      attendance: {
        punchIn: attendance.punchIn,
        punchOut: now,
        totalHours: Math.round(totalHours * 100) / 100,
      },
    });
  } catch (error: any) {
    console.error('Force punch-out error:', error);
    return NextResponse.json(
      { error: 'Failed to force punch-out', details: error.message },
      { status: 500 }
    );
  }
}

// GET to check status
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !isAdmin(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeCode = searchParams.get('employeeCode');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find all employees with active (not punched out) attendance
    const activeAttendance = await prisma.attendance.findMany({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
        punchIn: { not: null },
        punchOut: null,
        ...(employeeCode && {
          employee: {
            employeeId: employeeCode,
          },
        }),
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            name: true,
          },
        },
        activityLogs: {
          orderBy: { timestamp: 'desc' },
          take: 5,
        },
      },
    });

    return NextResponse.json({
      activeEmployees: activeAttendance.map(a => ({
        employeeId: a.employee.employeeId,
        name: a.employee.name,
        punchIn: a.punchIn,
        lastActivity: a.activityLogs[0]?.timestamp || a.punchIn,
        activityCount: a.activityLogs.length,
        hoursWorking: Math.round(
          ((new Date().getTime() - new Date(a.punchIn!).getTime()) / (1000 * 60 * 60)) * 100
        ) / 100,
      })),
      count: activeAttendance.length,
    });
  } catch (error: any) {
    console.error('Get active employees error:', error);
    return NextResponse.json(
      { error: 'Failed to get active employees', details: error.message },
      { status: 500 }
    );
  }
}
