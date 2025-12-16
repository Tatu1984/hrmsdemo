import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { markLeaveAttendance, revertLeaveAttendance } from '@/lib/attendance-utils';

// GET /api/leaves - Get leave requests
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');

    const where: any = {};

    if (employeeId) {
      where.employeeId = employeeId;
    } else if (session.role === 'EMPLOYEE') {
      // Employees can only see their own leaves
      where.employeeId = session.employeeId!;
    } else if (session.role === 'MANAGER') {
      // Managers can see their team's leaves
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
    // Admins can see all leaves

    if (status) {
      where.status = status;
    }

    const leaves = await prisma.leave.findMany({
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(leaves);
  } catch (error) {
    console.error('Error fetching leaves:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaves' },
      { status: 500 }
    );
  }
}

// POST /api/leaves - Apply for leave
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { leaveType, startDate, endDate, reason, employeeId } = body;

    // Validate required fields
    if (!leaveType || !startDate || !endDate || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Employees can only apply for themselves unless admin/manager
    const targetEmployeeId = session.role === 'EMPLOYEE' ? session.employeeId! : (employeeId || session.employeeId!);

    // Calculate days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (days <= 0) {
      return NextResponse.json(
        { error: 'Invalid date range' },
        { status: 400 }
      );
    }

    // Check if applying for past dates (only sick leave allowed for historical data)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today && leaveType !== 'SICK') {
      return NextResponse.json(
        { error: 'Only sick leaves can be applied for past dates' },
        { status: 400 }
      );
    }

    // Check for overlapping leaves
    const overlapping = await prisma.leave.findFirst({
      where: {
        employeeId: targetEmployeeId,
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [
          {
            AND: [
              { startDate: { lte: start } },
              { endDate: { gte: start } },
            ],
          },
          {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: end } },
            ],
          },
          {
            AND: [
              { startDate: { gte: start } },
              { endDate: { lte: end } },
            ],
          },
        ],
      },
    });

    if (overlapping) {
      return NextResponse.json(
        { error: 'You already have a leave request for these dates' },
        { status: 400 }
      );
    }

    const leave = await prisma.leave.create({
      data: {
        employeeId: targetEmployeeId,
        leaveType,
        startDate: start,
        endDate: end,
        days,
        reason,
        status: 'PENDING',
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

    return NextResponse.json(leave, { status: 201 });
  } catch (error) {
    console.error('Error creating leave:', error);
    return NextResponse.json(
      { error: 'Failed to create leave request' },
      { status: 500 }
    );
  }
}

// PUT /api/leaves - Update leave status (approve/reject/cancel)
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, adminComment, leaveType, startDate, endDate, reason } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Leave ID required' },
        { status: 400 }
      );
    }

    // Find the leave request
    const leave = await prisma.leave.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!leave) {
      return NextResponse.json({ error: 'Leave not found' }, { status: 404 });
    }

    // Permission check
    if (status === 'CANCELLED') {
      // Only the employee can cancel their own leave
      if (session.role === 'EMPLOYEE' && leave.employeeId !== session.employeeId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    } else if (status === 'APPROVED' || status === 'REJECTED' || status === 'HOLD') {
      // Only admin or manager can approve/reject/hold
      if (session.role === 'EMPLOYEE') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      // Managers can only approve their subordinates' leaves
      if (session.role === 'MANAGER') {
        const isSubordinate = await prisma.employee.findFirst({
          where: {
            id: leave.employeeId,
            reportingHeadId: session.employeeId,
          },
        });

        if (!isSubordinate && leave.employeeId !== session.employeeId) {
          return NextResponse.json(
            { error: 'You can only approve leaves for your team members' },
            { status: 403 }
          );
        }
      }
    }

    const updateData: any = {};

    // Update status if provided
    if (status) updateData.status = status;

    // Update leave details if provided (admin/manager only)
    if (session.role === 'ADMIN' || session.role === 'MANAGER') {
      if (leaveType) updateData.leaveType = leaveType;
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        updateData.startDate = start;
        updateData.endDate = end;
        updateData.days = days;
      }
      if (reason) updateData.reason = reason;
      if (adminComment !== undefined) updateData.adminComment = adminComment;
    }

    const updatedLeave = await prisma.leave.update({
      where: { id },
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

    // Handle attendance marking based on leave status change
    if (status === 'APPROVED') {
      // Mark all days in the leave period as LEAVE status in attendance
      await markLeaveAttendance(
        leave.employeeId,
        updatedLeave.startDate,
        updatedLeave.endDate
      );
    } else if (status === 'REJECTED' || status === 'CANCELLED') {
      // If a previously approved leave is now rejected/cancelled, revert the attendance
      if (leave.status === 'APPROVED') {
        await revertLeaveAttendance(
          leave.employeeId,
          leave.startDate,
          leave.endDate
        );
      }
    }

    return NextResponse.json(updatedLeave);
  } catch (error) {
    console.error('Error updating leave:', error);
    return NextResponse.json(
      { error: 'Failed to update leave request' },
      { status: 500 }
    );
  }
}
