import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { isSaturday, isSunday } from '@/lib/attendance-utils';

// GET /api/reports - Generate reports
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // attendance, payroll, tasks, leaves
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const employeeId = searchParams.get('employeeId');

    if (!type) {
      return NextResponse.json({ error: 'Report type required' }, { status: 400 });
    }

    let report: any = {};

    switch (type) {
      case 'attendance':
        report = await generateAttendanceReport(session, startDate, endDate, employeeId);
        break;

      case 'payroll':
        report = await generatePayrollReport(session, startDate, endDate, employeeId);
        break;

      case 'tasks':
        report = await generateTasksReport(session, startDate, endDate, employeeId);
        break;

      case 'leaves':
        report = await generateLeavesReport(session, startDate, endDate, employeeId);
        break;

      case 'overview':
        report = await generateOverviewReport(session);
        break;

      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}

// Attendance Report
async function generateAttendanceReport(session: any, startDate: string | null, endDate: string | null, employeeId: string | null) {
  const where: any = {};

  // Role-based filtering
  if (session.role === 'EMPLOYEE') {
    where.employeeId = session.employeeId;
  } else if (session.role === 'MANAGER') {
    const teamMembers = await prisma.employee.findMany({
      where: { reportingHeadId: session.employeeId },
    });
    const teamIds = [session.employeeId!, ...teamMembers.map(t => t.id)];
    where.employeeId = { in: teamIds };
  }

  if (employeeId && session.role === 'ADMIN') {
    where.employeeId = employeeId;
  }

  if (startDate && endDate) {
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
          designation: true,
          department: true,
        },
      },
    },
    orderBy: {
      date: 'asc',
    },
  });

  // Helper function to check if a weekend should be marked absent due to cascade rule
  const isWeekendCascadedAbsent = (record: typeof attendance[0]): boolean => {
    const date = new Date(record.date);

    // Saturday: check if Friday was absent
    if (isSaturday(date)) {
      const fridayDate = new Date(date);
      fridayDate.setDate(fridayDate.getDate() - 1);
      fridayDate.setHours(0, 0, 0, 0);
      const fridayAttendance = attendance.find(a => {
        const aDate = new Date(a.date);
        aDate.setHours(0, 0, 0, 0);
        return aDate.getTime() === fridayDate.getTime() && a.employeeId === record.employeeId;
      });
      if (fridayAttendance?.status === 'ABSENT') {
        return true;
      }
    }

    // Sunday: check if Monday was absent
    if (isSunday(date)) {
      const mondayDate = new Date(date);
      mondayDate.setDate(mondayDate.getDate() + 1);
      mondayDate.setHours(0, 0, 0, 0);
      const mondayAttendance = attendance.find(a => {
        const aDate = new Date(a.date);
        aDate.setHours(0, 0, 0, 0);
        return aDate.getTime() === mondayDate.getTime() && a.employeeId === record.employeeId;
      });
      if (mondayAttendance?.status === 'ABSENT') {
        return true;
      }
    }

    return false;
  };

  // Count cascaded absences (weekends that should be marked absent due to adjacent weekday absence)
  const cascadedAbsentDays = attendance.filter(a =>
    (a.status === 'WEEKEND' || a.status === 'PRESENT') && isWeekendCascadedAbsent(a)
  ).length;

  // Calculate statistics
  const stats = {
    totalRecords: attendance.length,
    presentDays: attendance.filter(a =>
      (a.status === 'PRESENT' ||
      a.status === 'WEEKEND' ||
      a.status === 'HOLIDAY' ||
      a.status === 'LEAVE') && !isWeekendCascadedAbsent(a)
    ).length,
    absentDays: attendance.filter(a => a.status === 'ABSENT').length + cascadedAbsentDays,
    cascadedAbsentDays: cascadedAbsentDays,
    halfDays: attendance.filter(a => a.status === 'HALF_DAY').length,
    leaveDays: attendance.filter(a => a.status === 'LEAVE').length,
    weekendDays: attendance.filter(a => a.status === 'WEEKEND' && !isWeekendCascadedAbsent(a)).length,
    holidayDays: attendance.filter(a => a.status === 'HOLIDAY').length,
    totalHours: attendance.reduce((sum, a) => sum + (a.totalHours || 0), 0),
    avgHoursPerDay: 0,
  };

  const workingDays = attendance.filter(a => a.status === 'PRESENT').length;
  if (workingDays > 0) {
    stats.avgHoursPerDay = stats.totalHours / workingDays;
  }

  return {
    type: 'attendance',
    dateRange: { startDate, endDate },
    stats,
    records: attendance,
  };
}

// Payroll Report
async function generatePayrollReport(session: any, startDate: string | null, endDate: string | null, employeeId: string | null) {
  const where: any = {};

  // Role-based filtering
  if (session.role === 'EMPLOYEE') {
    where.employeeId = session.employeeId;
  } else if (session.role === 'MANAGER') {
    const teamMembers = await prisma.employee.findMany({
      where: { reportingHeadId: session.employeeId },
    });
    const teamIds = [session.employeeId!, ...teamMembers.map(t => t.id)];
    where.employeeId = { in: teamIds };
  }

  if (employeeId && session.role === 'ADMIN') {
    where.employeeId = employeeId;
  }

  const payroll = await prisma.payroll.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          employeeId: true,
          name: true,
          designation: true,
          department: true,
        },
      },
    },
    orderBy: [
      { year: 'desc' },
      { month: 'desc' },
    ],
  });

  const stats = {
    totalRecords: payroll.length,
    totalGross: payroll.reduce((sum, p) => sum + p.grossSalary, 0),
    totalDeductions: payroll.reduce((sum, p) => sum + p.deductions, 0),
    totalNet: payroll.reduce((sum, p) => sum + p.netSalary, 0),
  };

  return {
    type: 'payroll',
    stats,
    records: payroll,
  };
}

// Tasks Report
async function generateTasksReport(session: any, startDate: string | null, endDate: string | null, employeeId: string | null) {
  const where: any = {};

  // Role-based filtering
  if (session.role === 'EMPLOYEE') {
    where.assignedTo = session.employeeId;
  } else if (session.role === 'MANAGER') {
    const teamMembers = await prisma.employee.findMany({
      where: { reportingHeadId: session.employeeId },
    });
    const teamIds = [session.employeeId!, ...teamMembers.map(t => t.id)];
    where.assignedTo = { in: teamIds };
  }

  if (employeeId && session.role === 'ADMIN') {
    where.assignedTo = employeeId;
  }

  if (startDate && endDate) {
    where.createdAt = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          employeeId: true,
          name: true,
          designation: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const stats = {
    totalTasks: tasks.length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    pending: tasks.filter(t => t.status === 'PENDING').length,
    onHold: tasks.filter(t => t.status === 'HOLD').length,
    urgent: tasks.filter(t => t.priority === 'URGENT').length,
    high: tasks.filter(t => t.priority === 'HIGH').length,
  };

  return {
    type: 'tasks',
    dateRange: { startDate, endDate },
    stats,
    records: tasks,
  };
}

// Leaves Report
async function generateLeavesReport(session: any, startDate: string | null, endDate: string | null, employeeId: string | null) {
  const where: any = {};

  // Role-based filtering
  if (session.role === 'EMPLOYEE') {
    where.employeeId = session.employeeId;
  } else if (session.role === 'MANAGER') {
    const teamMembers = await prisma.employee.findMany({
      where: { reportingHeadId: session.employeeId },
    });
    const teamIds = [session.employeeId!, ...teamMembers.map(t => t.id)];
    where.employeeId = { in: teamIds };
  }

  if (employeeId && session.role === 'ADMIN') {
    where.employeeId = employeeId;
  }

  if (startDate && endDate) {
    where.startDate = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  const leaves = await prisma.leave.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          employeeId: true,
          name: true,
          designation: true,
          department: true,
        },
      },
    },
    orderBy: {
      startDate: 'desc',
    },
  });

  const stats = {
    totalRequests: leaves.length,
    approved: leaves.filter(l => l.status === 'APPROVED').length,
    rejected: leaves.filter(l => l.status === 'REJECTED').length,
    pending: leaves.filter(l => l.status === 'PENDING').length,
    cancelled: leaves.filter(l => l.status === 'CANCELLED').length,
    totalDays: leaves.filter(l => l.status === 'APPROVED').reduce((sum, l) => sum + l.days, 0),
    sickLeave: leaves.filter(l => l.leaveType === 'SICK').length,
    casualLeave: leaves.filter(l => l.leaveType === 'CASUAL').length,
    earnedLeave: leaves.filter(l => l.leaveType === 'EARNED').length,
  };

  return {
    type: 'leaves',
    dateRange: { startDate, endDate },
    stats,
    records: leaves,
  };
}

// Overview Report (Dashboard stats)
async function generateOverviewReport(session: any) {
  const employees = await prisma.employee.count();
  const projects = await prisma.project.count({ where: { status: 'ACTIVE' } });
  const leaves = await prisma.leave.count({ where: { status: 'PENDING' } });

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const payroll = await prisma.payroll.findMany({
    where: {
      month: currentMonth,
      year: currentYear,
    },
  });

  const totalPayroll = payroll.reduce((sum, p) => sum + p.netSalary, 0);

  return {
    type: 'overview',
    stats: {
      totalEmployees: employees,
      activeProjects: projects,
      pendingLeaves: leaves,
      monthlyPayroll: totalPayroll,
    },
  };
}
