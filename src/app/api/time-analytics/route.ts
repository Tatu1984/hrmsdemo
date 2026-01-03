import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, eachDayOfInterval } from 'date-fns';

interface TimeAnalyticsSummary {
  totalWorkHours: number;
  totalBreakHours: number;
  totalIdleHours: number;
  averageWorkHours: number;
  employeeCount: number;
  daysAnalyzed: number;
}

interface ChartDataPoint {
  date: string;
  workHours: number;
  breakHours: number;
  idleHours: number;
}

interface EmployeeChartData {
  name: string;
  employeeId: string;
  workHours: number;
  breakHours: number;
  idleHours: number;
}

interface DistributionData {
  category: string;
  hours: number;
  percentage: number;
}

interface EmployeeDetail {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  totalWorkHours: number;
  totalBreakHours: number;
  totalIdleHours: number;
  daysPresent: number;
  avgDailyHours: number;
}

interface TimeAnalyticsResponse {
  summary: TimeAnalyticsSummary;
  chartData: {
    byDate: ChartDataPoint[];
    byEmployee: EmployeeChartData[];
    distribution: DistributionData[];
  };
  employeeDetails: EmployeeDetail[];
}

// GET /api/time-analytics - Get time analytics data
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'week'; // day, week, month
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const employeeIdFilter = searchParams.get('employeeId');
    const departmentFilter = searchParams.get('department');

    // Calculate date range based on view
    let startDate: Date;
    let endDate: Date;
    const now = new Date();

    if (startDateParam && endDateParam) {
      startDate = startOfDay(new Date(startDateParam));
      endDate = endOfDay(new Date(endDateParam));
    } else {
      switch (view) {
        case 'day':
          startDate = startOfDay(now);
          endDate = endOfDay(now);
          break;
        case 'month':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case 'week':
        default:
          startDate = startOfWeek(now, { weekStartsOn: 1 }); // Monday
          endDate = endOfWeek(now, { weekStartsOn: 1 });
          break;
      }
    }

    // Build role-based employee filter
    const employeeWhere: any = { isActive: true };

    if (session.role === 'EMPLOYEE') {
      // Employees can only see their own data
      employeeWhere.id = session.employeeId;
    } else if (session.role === 'MANAGER') {
      // Managers can see their team's data
      const manager = await prisma.employee.findUnique({
        where: { id: session.employeeId! },
        include: { subordinates: { select: { id: true } } },
      });

      if (manager) {
        employeeWhere.id = {
          in: [manager.id, ...manager.subordinates.map(s => s.id)],
        };
      }
    }
    // Admins can see all employees (no additional filter)

    // Apply optional filters (Admin/Manager only)
    if (employeeIdFilter && session.role !== 'EMPLOYEE') {
      employeeWhere.id = employeeIdFilter;
    }

    if (departmentFilter && session.role === 'ADMIN') {
      employeeWhere.department = departmentFilter;
    }

    // Get all employees matching filter
    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      select: {
        id: true,
        employeeId: true,
        name: true,
        department: true,
        designation: true,
      },
    });

    const employeeIds = employees.map(e => e.id);

    // Fetch attendance data for the date range
    const attendanceData = await prisma.attendance.findMany({
      where: {
        employeeId: { in: employeeIds },
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: { in: ['PRESENT', 'HALF_DAY'] },
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            department: true,
            designation: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    // Calculate summary statistics
    const totalWorkHours = attendanceData.reduce((sum, a) => sum + (a.totalHours || 0), 0);
    const totalBreakHours = attendanceData.reduce((sum, a) => sum + (a.breakDuration || 0), 0);
    const totalIdleHours = attendanceData.reduce((sum, a) => sum + (a.idleTime || 0), 0);
    const uniqueEmployees = new Set(attendanceData.map(a => a.employeeId)).size;
    const uniqueDates = new Set(attendanceData.map(a => format(a.date, 'yyyy-MM-dd'))).size;
    const averageWorkHours = uniqueEmployees > 0 ? totalWorkHours / uniqueEmployees : 0;

    const summary: TimeAnalyticsSummary = {
      totalWorkHours: Math.round(totalWorkHours * 100) / 100,
      totalBreakHours: Math.round(totalBreakHours * 100) / 100,
      totalIdleHours: Math.round(totalIdleHours * 100) / 100,
      averageWorkHours: Math.round(averageWorkHours * 100) / 100,
      employeeCount: uniqueEmployees,
      daysAnalyzed: uniqueDates,
    };

    // Chart data by date
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
    const byDate: ChartDataPoint[] = dateRange.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayData = attendanceData.filter(a => format(a.date, 'yyyy-MM-dd') === dateStr);

      return {
        date: format(date, 'MMM dd'),
        workHours: Math.round(dayData.reduce((sum, a) => sum + (a.totalHours || 0), 0) * 100) / 100,
        breakHours: Math.round(dayData.reduce((sum, a) => sum + (a.breakDuration || 0), 0) * 100) / 100,
        idleHours: Math.round(dayData.reduce((sum, a) => sum + (a.idleTime || 0), 0) * 100) / 100,
      };
    });

    // Chart data by employee
    const employeeMap = new Map<string, {
      name: string;
      employeeId: string;
      workHours: number;
      breakHours: number;
      idleHours: number;
      daysPresent: number;
    }>();

    attendanceData.forEach(a => {
      const existing = employeeMap.get(a.employeeId) || {
        name: a.employee.name,
        employeeId: a.employee.employeeId,
        workHours: 0,
        breakHours: 0,
        idleHours: 0,
        daysPresent: 0,
      };

      existing.workHours += a.totalHours || 0;
      existing.breakHours += a.breakDuration || 0;
      existing.idleHours += a.idleTime || 0;
      existing.daysPresent += 1;

      employeeMap.set(a.employeeId, existing);
    });

    const byEmployee: EmployeeChartData[] = Array.from(employeeMap.values())
      .map(e => ({
        name: e.name,
        employeeId: e.employeeId,
        workHours: Math.round(e.workHours * 100) / 100,
        breakHours: Math.round(e.breakHours * 100) / 100,
        idleHours: Math.round(e.idleHours * 100) / 100,
      }))
      .sort((a, b) => b.workHours - a.workHours);

    // Distribution data (pie chart)
    const totalTime = totalWorkHours + totalBreakHours + totalIdleHours;
    const distribution: DistributionData[] = [
      {
        category: 'Work Hours',
        hours: Math.round(totalWorkHours * 100) / 100,
        percentage: totalTime > 0 ? Math.round((totalWorkHours / totalTime) * 10000) / 100 : 0,
      },
      {
        category: 'Break Hours',
        hours: Math.round(totalBreakHours * 100) / 100,
        percentage: totalTime > 0 ? Math.round((totalBreakHours / totalTime) * 10000) / 100 : 0,
      },
      {
        category: 'Idle Hours',
        hours: Math.round(totalIdleHours * 100) / 100,
        percentage: totalTime > 0 ? Math.round((totalIdleHours / totalTime) * 10000) / 100 : 0,
      },
    ];

    // Employee details table
    const employeeDetails: EmployeeDetail[] = employees.map(emp => {
      const empData = employeeMap.get(emp.id);
      const daysPresent = empData?.daysPresent || 0;
      const workHours = empData?.workHours || 0;

      return {
        id: emp.id,
        employeeId: emp.employeeId,
        employeeName: emp.name,
        department: emp.department || 'N/A',
        designation: emp.designation || 'N/A',
        totalWorkHours: Math.round(workHours * 100) / 100,
        totalBreakHours: Math.round((empData?.breakHours || 0) * 100) / 100,
        totalIdleHours: Math.round((empData?.idleHours || 0) * 100) / 100,
        daysPresent,
        avgDailyHours: daysPresent > 0 ? Math.round((workHours / daysPresent) * 100) / 100 : 0,
      };
    }).sort((a, b) => b.totalWorkHours - a.totalWorkHours);

    const response: TimeAnalyticsResponse = {
      summary,
      chartData: {
        byDate,
        byEmployee,
        distribution,
      },
      employeeDetails,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching time analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch time analytics' },
      { status: 500 }
    );
  }
}
