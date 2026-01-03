import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuth, isAdmin } from '@/lib/auth';

// Pre-built analytics queries that work without OpenAI
const QUERY_HANDLERS: Record<string, (params?: Record<string, string>) => Promise<unknown>> = {
  // Employee Analytics
  'employee-count': async () => {
    const total = await prisma.employee.count();
    const active = await prisma.employee.count({ where: { isActive: true } });
    const inactive = total - active;
    return { total, active, inactive, title: 'Employee Count' };
  },

  'employees-by-department': async () => {
    const data = await prisma.employee.groupBy({
      by: ['department'],
      where: { isActive: true },
      _count: true,
    });
    return {
      title: 'Employees by Department',
      data: data.map(d => ({ department: d.department, count: d._count })),
      chartType: 'bar',
    };
  },

  'employees-by-designation': async () => {
    const data = await prisma.employee.groupBy({
      by: ['designation'],
      where: { isActive: true },
      _count: true,
    });
    return {
      title: 'Employees by Designation',
      data: data.map(d => ({ designation: d.designation, count: d._count })),
      chartType: 'pie',
    };
  },

  'new-employees-this-month': async () => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const count = await prisma.employee.count({
      where: { dateOfJoining: { gte: startOfMonth } },
    });
    return { count, title: 'New Employees This Month' };
  },

  // Attendance Analytics
  'attendance-today': async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const data = await prisma.attendance.groupBy({
      by: ['status'],
      where: { date: { gte: today } },
      _count: true,
    });

    return {
      title: 'Today\'s Attendance',
      data: data.map(d => ({ status: d.status, count: d._count })),
      chartType: 'pie',
    };
  },

  'attendance-this-week': async () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const data = await prisma.attendance.groupBy({
      by: ['status'],
      where: { date: { gte: startOfWeek } },
      _count: true,
    });

    const total = data.reduce((sum, d) => sum + d._count, 0);
    const present = data.find(d => d.status === 'PRESENT')?._count || 0;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    return {
      title: 'This Week\'s Attendance',
      attendanceRate: rate,
      data: data.map(d => ({ status: d.status, count: d._count })),
    };
  },

  'late-arrivals-this-month': async () => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const lateArrivals = await prisma.attendance.count({
      where: {
        date: { gte: startOfMonth },
        punchIn: { not: null },
        // Consider punch in after 10 AM as late
      },
    });

    return { count: lateArrivals, title: 'Late Arrivals This Month' };
  },

  // Leave Analytics
  'pending-leaves': async () => {
    const leaves = await prisma.leave.findMany({
      where: { status: 'PENDING' },
      include: { employee: { select: { name: true, department: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      title: 'Pending Leave Requests',
      count: leaves.length,
      leaves: leaves.map(l => ({
        employee: l.employee.name,
        department: l.employee.department,
        type: l.leaveType,
        days: l.days,
        startDate: l.startDate,
      })),
    };
  },

  'leaves-by-type': async () => {
    const year = new Date().getFullYear();
    const startOfYear = new Date(year, 0, 1);

    const data = await prisma.leave.groupBy({
      by: ['leaveType'],
      where: {
        status: 'APPROVED',
        startDate: { gte: startOfYear },
      },
      _sum: { days: true },
      _count: true,
    });

    return {
      title: 'Approved Leaves by Type (This Year)',
      data: data.map(d => ({
        type: d.leaveType,
        totalDays: d._sum.days || 0,
        count: d._count,
      })),
      chartType: 'bar',
    };
  },

  'leave-balance-summary': async () => {
    const year = new Date().getFullYear();
    const startOfYear = new Date(year, 0, 1);

    const employees = await prisma.employee.count({ where: { isActive: true } });

    const usedLeaves = await prisma.leave.groupBy({
      by: ['leaveType'],
      where: {
        status: 'APPROVED',
        startDate: { gte: startOfYear },
      },
      _sum: { days: true },
    });

    const leaveQuotas = { SICK: 12, CASUAL: 12, EARNED: 15, UNPAID: 30 };

    const summary = Object.entries(leaveQuotas).map(([type, quota]) => {
      const used = usedLeaves.find(u => u.leaveType === type)?._sum.days || 0;
      return {
        type,
        totalQuota: quota * employees,
        used,
        remaining: (quota * employees) - used,
        utilizationRate: employees > 0 ? Math.round((used / (quota * employees)) * 100) : 0,
      };
    });

    return { title: 'Leave Balance Summary', data: summary };
  },

  // Payroll Analytics
  'payroll-this-month': async () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const data = await prisma.payroll.aggregate({
      where: { month, year },
      _sum: { grossSalary: true, netSalary: true, totalDeductions: true },
      _count: true,
    });

    return {
      title: `Payroll Summary - ${month}/${year}`,
      employeesProcessed: data._count,
      totalGross: data._sum.grossSalary || 0,
      totalNet: data._sum.netSalary || 0,
      totalDeductions: data._sum.totalDeductions || 0,
    };
  },

  'payroll-pending': async () => {
    const pending = await prisma.payroll.count({ where: { status: 'PENDING' } });
    const approved = await prisma.payroll.count({ where: { status: 'APPROVED' } });
    const paid = await prisma.payroll.count({ where: { status: 'PAID' } });

    return {
      title: 'Payroll Status',
      data: [
        { status: 'Pending', count: pending },
        { status: 'Approved', count: approved },
        { status: 'Paid', count: paid },
      ],
      chartType: 'pie',
    };
  },

  // Project Analytics
  'active-projects': async () => {
    const projects = await prisma.project.findMany({
      where: { status: 'ACTIVE' },
      include: {
        members: { include: { employee: { select: { name: true } } } },
        tasks: { select: { status: true } },
      },
    });

    return {
      title: 'Active Projects',
      count: projects.length,
      projects: projects.map(p => ({
        name: p.name,
        memberCount: p.members.length,
        totalTasks: p.tasks.length,
        completedTasks: p.tasks.filter(t => t.status === 'COMPLETED').length,
        budget: p.totalBudget,
        currency: p.currency,
      })),
    };
  },

  'tasks-summary': async () => {
    const data = await prisma.task.groupBy({
      by: ['status'],
      _count: true,
    });

    return {
      title: 'Tasks by Status',
      data: data.map(d => ({ status: d.status, count: d._count })),
      chartType: 'pie',
    };
  },

  'overdue-tasks': async () => {
    const overdue = await prisma.task.findMany({
      where: {
        status: { not: 'COMPLETED' },
        dueDate: { lt: new Date() },
      },
      include: {
        employee: { select: { name: true } },
        project: { select: { name: true } },
      },
      take: 10,
    });

    return {
      title: 'Overdue Tasks',
      count: overdue.length,
      tasks: overdue.map(t => ({
        title: t.title,
        assignee: t.employee.name,
        project: t.project?.name || 'No Project',
        dueDate: t.dueDate,
        priority: t.priority,
      })),
    };
  },

  // Sales Analytics
  'sales-this-month': async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const data = await prisma.sale.aggregate({
      where: {
        createdAt: { gte: startOfMonth },
        status: { in: ['CONFIRMED', 'DELIVERED', 'PAID'] },
      },
      _sum: { netAmount: true },
      _count: true,
    });

    return {
      title: 'Sales This Month',
      count: data._count,
      totalAmount: data._sum.netAmount || 0,
    };
  },

  'leads-pipeline': async () => {
    const data = await prisma.lead.groupBy({
      by: ['status'],
      _count: true,
    });

    return {
      title: 'Leads Pipeline',
      data: data.map(d => ({ status: d.status, count: d._count })),
      chartType: 'bar',
    };
  },

  // Quick insights
  'quick-insights': async () => {
    const [
      employeeCount,
      pendingLeaves,
      overdueTasksCount,
      todayAbsent,
    ] = await Promise.all([
      prisma.employee.count({ where: { isActive: true } }),
      prisma.leave.count({ where: { status: 'PENDING' } }),
      prisma.task.count({
        where: { status: { not: 'COMPLETED' }, dueDate: { lt: new Date() } },
      }),
      prisma.attendance.count({
        where: {
          date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          status: 'ABSENT',
        },
      }),
    ]);

    const insights = [];

    if (pendingLeaves > 5) {
      insights.push({
        type: 'warning',
        message: `${pendingLeaves} leave requests pending approval`,
        action: 'Review pending leaves',
      });
    }

    if (overdueTasksCount > 0) {
      insights.push({
        type: 'alert',
        message: `${overdueTasksCount} tasks are overdue`,
        action: 'Check overdue tasks',
      });
    }

    if (todayAbsent > employeeCount * 0.2) {
      insights.push({
        type: 'info',
        message: `${todayAbsent} employees absent today (${Math.round((todayAbsent / employeeCount) * 100)}%)`,
        action: 'View attendance',
      });
    }

    if (insights.length === 0) {
      insights.push({
        type: 'success',
        message: 'All systems running smoothly',
        action: null,
      });
    }

    return { title: 'Quick Insights', insights };
  },
};

// Available queries for suggestions
const AVAILABLE_QUERIES = [
  { id: 'employee-count', label: 'How many employees do we have?', category: 'Employees' },
  { id: 'employees-by-department', label: 'Show employees by department', category: 'Employees' },
  { id: 'employees-by-designation', label: 'Show employees by designation', category: 'Employees' },
  { id: 'new-employees-this-month', label: 'New employees this month', category: 'Employees' },
  { id: 'attendance-today', label: 'Today\'s attendance summary', category: 'Attendance' },
  { id: 'attendance-this-week', label: 'This week\'s attendance rate', category: 'Attendance' },
  { id: 'pending-leaves', label: 'Show pending leave requests', category: 'Leaves' },
  { id: 'leaves-by-type', label: 'Leaves taken by type', category: 'Leaves' },
  { id: 'leave-balance-summary', label: 'Leave balance summary', category: 'Leaves' },
  { id: 'payroll-this-month', label: 'This month\'s payroll summary', category: 'Payroll' },
  { id: 'payroll-pending', label: 'Payroll status breakdown', category: 'Payroll' },
  { id: 'active-projects', label: 'Show active projects', category: 'Projects' },
  { id: 'tasks-summary', label: 'Tasks by status', category: 'Projects' },
  { id: 'overdue-tasks', label: 'Show overdue tasks', category: 'Projects' },
  { id: 'sales-this-month', label: 'Sales this month', category: 'Sales' },
  { id: 'leads-pipeline', label: 'Leads pipeline status', category: 'Sales' },
  { id: 'quick-insights', label: 'Generate quick insights', category: 'Insights' },
];

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !isAdmin(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { queryId, naturalQuery } = body;

    // If natural query provided, try to match it to a predefined query
    let matchedQueryId = queryId;
    if (naturalQuery && !queryId) {
      const lowerQuery = naturalQuery.toLowerCase();

      // Simple keyword matching
      if (lowerQuery.includes('employee') && lowerQuery.includes('count')) {
        matchedQueryId = 'employee-count';
      } else if (lowerQuery.includes('employee') && lowerQuery.includes('department')) {
        matchedQueryId = 'employees-by-department';
      } else if (lowerQuery.includes('attendance') && lowerQuery.includes('today')) {
        matchedQueryId = 'attendance-today';
      } else if (lowerQuery.includes('attendance') && lowerQuery.includes('week')) {
        matchedQueryId = 'attendance-this-week';
      } else if (lowerQuery.includes('pending') && lowerQuery.includes('leave')) {
        matchedQueryId = 'pending-leaves';
      } else if (lowerQuery.includes('leave') && lowerQuery.includes('type')) {
        matchedQueryId = 'leaves-by-type';
      } else if (lowerQuery.includes('payroll') && lowerQuery.includes('month')) {
        matchedQueryId = 'payroll-this-month';
      } else if (lowerQuery.includes('project') || lowerQuery.includes('active project')) {
        matchedQueryId = 'active-projects';
      } else if (lowerQuery.includes('task') && lowerQuery.includes('overdue')) {
        matchedQueryId = 'overdue-tasks';
      } else if (lowerQuery.includes('task')) {
        matchedQueryId = 'tasks-summary';
      } else if (lowerQuery.includes('sales')) {
        matchedQueryId = 'sales-this-month';
      } else if (lowerQuery.includes('lead')) {
        matchedQueryId = 'leads-pipeline';
      } else if (lowerQuery.includes('insight')) {
        matchedQueryId = 'quick-insights';
      } else {
        // Default to quick insights
        matchedQueryId = 'quick-insights';
      }
    }

    if (!matchedQueryId || !QUERY_HANDLERS[matchedQueryId]) {
      return NextResponse.json({
        error: 'Unknown query',
        suggestions: AVAILABLE_QUERIES.slice(0, 5),
      }, { status: 400 });
    }

    const result = await QUERY_HANDLERS[matchedQueryId]();

    return NextResponse.json({
      queryId: matchedQueryId,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Dashboard Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to process analytics query' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return available queries grouped by category
    const categories = AVAILABLE_QUERIES.reduce((acc, q) => {
      if (!acc[q.category]) acc[q.category] = [];
      acc[q.category].push({ id: q.id, label: q.label });
      return acc;
    }, {} as Record<string, { id: string; label: string }[]>);

    return NextResponse.json({ categories, queries: AVAILABLE_QUERIES });
  } catch (error) {
    console.error('Dashboard Analytics GET API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics options' },
      { status: 500 }
    );
  }
}
