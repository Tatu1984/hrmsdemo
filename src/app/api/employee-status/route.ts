import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

// Real-time employee status API
// Returns current status of all employees: ACTIVE, IDLE, BUSY, OFFLINE

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins and managers can view all employee statuses
    if (session.role !== 'ADMIN' && session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all employees with their attendance for today
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        designation: true,
        department: true,
        profilePicture: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Get today's attendance for all employees
    const todayAttendance = await prisma.attendance.findMany({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        activityLogs: {
          orderBy: {
            timestamp: 'desc',
          },
          take: 1, // Get most recent activity
        },
      },
    });

    // Create a map of employee attendance
    const attendanceMap = new Map(
      todayAttendance.map((att) => [att.employeeId, att])
    );

    // Calculate status for each employee
    const employeeStatuses = employees.map((employee) => {
      const attendance = attendanceMap.get(employee.id);

      if (!attendance || !attendance.punchIn) {
        // Not punched in today
        return {
          ...employee,
          status: 'OFFLINE',
          statusColor: 'gray',
          punchIn: null,
          punchOut: null,
          totalHours: 0,
          idleTime: 0,
          lastActivity: null,
          lastActivityMinutesAgo: null,
        };
      }

      if (attendance.punchOut) {
        // Already punched out
        return {
          ...employee,
          status: 'OFFLINE',
          statusColor: 'gray',
          punchIn: attendance.punchIn,
          punchOut: attendance.punchOut,
          totalHours: attendance.totalHours || 0,
          idleTime: attendance.idleTime || 0,
          lastActivity: attendance.punchOut,
          lastActivityMinutesAgo: Math.floor(
            (now.getTime() - new Date(attendance.punchOut).getTime()) / 60000
          ),
        };
      }

      // Employee is punched in
      const lastActivity = attendance.activityLogs[0];
      const lastActivityTime = lastActivity
        ? new Date(lastActivity.timestamp)
        : new Date(attendance.punchIn);
      const minutesSinceLastActivity = Math.floor(
        (now.getTime() - lastActivityTime.getTime()) / 60000
      );

      // Calculate current working hours
      const currentHours =
        (now.getTime() - new Date(attendance.punchIn).getTime()) / (1000 * 60 * 60);

      let status: string;
      let statusColor: string;

      if (minutesSinceLastActivity <= 5) {
        // Active in last 5 minutes
        status = 'ACTIVE';
        statusColor = 'green';
      } else if (minutesSinceLastActivity <= 15) {
        // Idle for 5-15 minutes
        status = 'IDLE';
        statusColor = 'yellow';
      } else {
        // Idle for more than 15 minutes (possibly away)
        status = 'AWAY';
        statusColor = 'orange';
      }

      return {
        ...employee,
        status,
        statusColor,
        punchIn: attendance.punchIn,
        punchOut: attendance.punchOut,
        totalHours: currentHours,
        idleTime: attendance.idleTime || 0,
        lastActivity: lastActivityTime,
        lastActivityMinutesAgo: minutesSinceLastActivity,
      };
    });

    // Group by status for summary
    const summary = {
      active: employeeStatuses.filter((e) => e.status === 'ACTIVE').length,
      idle: employeeStatuses.filter((e) => e.status === 'IDLE').length,
      away: employeeStatuses.filter((e) => e.status === 'AWAY').length,
      offline: employeeStatuses.filter((e) => e.status === 'OFFLINE').length,
      total: employees.length,
    };

    return NextResponse.json({
      employees: employeeStatuses,
      summary,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching employee status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee status', details: error.message },
      { status: 500 }
    );
  }
}
