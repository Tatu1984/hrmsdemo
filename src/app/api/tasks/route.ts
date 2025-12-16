import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/tasks - Get all tasks
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');

    const where: any = {};

    // Role-based filtering
    if (session.role === 'EMPLOYEE') {
      where.assignedTo = session.employeeId;
    } else if (session.role === 'MANAGER') {
      // Manager sees their own tasks + team tasks
      const teamMembers = await prisma.employee.findMany({
        where: { reportingHeadId: session.employeeId },
      });
      const teamIds = [session.employeeId!, ...teamMembers.map(t => t.id)];
      where.assignedTo = { in: teamIds };
    }

    if (projectId) {
      where.projectId = projectId;
    }

    if (status) {
      where.status = status;
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
            status: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST /api/tasks - Create new task
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, projectId, assignedTo, priority, status, dueDate } = body;

    if (!title || !assignedTo) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify assigned employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: assignedTo },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // If manager, verify they manage the employee
    if (session.role === 'MANAGER') {
      if (employee.reportingHeadId !== session.employeeId && assignedTo !== session.employeeId) {
        return NextResponse.json({ error: 'Unauthorized to assign task to this employee' }, { status: 401 });
      }
    }

    const task = await prisma.task.create({
      data: {
        title,
        description: description || '',
        projectId: projectId || null,
        assignedTo,
        priority: priority || 'MEDIUM',
        status: status || 'PENDING',
        dueDate: dueDate ? new Date(dueDate) : null,
      },
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

    return NextResponse.json({ success: true, task }, { status: 201 });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

// PUT /api/tasks - Update task
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, description, assignedTo, priority, status, dueDate } = body;

    if (!id) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
    }

    const existing = await prisma.task.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            reportingHeadId: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Permission checks
    if (session.role === 'EMPLOYEE') {
      // Employees can only update status of their own tasks
      if (existing.assignedTo !== session.employeeId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      // Employees can only update status
      if (title || description || assignedTo || priority || dueDate) {
        return NextResponse.json({ error: 'Employees can only update task status' }, { status: 401 });
      }
    } else if (session.role === 'MANAGER') {
      // Managers can update tasks of their team members
      const isOwnTask = existing.assignedTo === session.employeeId;
      const isTeamTask = existing.employee.reportingHeadId === session.employeeId;

      if (!isOwnTask && !isTeamTask) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const updateData: any = {
      title: title || existing.title,
      description: description !== undefined ? description : existing.description,
      priority: priority || existing.priority,
      status: status || existing.status,
      dueDate: dueDate ? new Date(dueDate) : existing.dueDate,
    };

    // Only admin and manager can reassign tasks
    if (assignedTo && (session.role === 'ADMIN' || session.role === 'MANAGER')) {
      updateData.assignedTo = assignedTo;
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// DELETE /api/tasks - Delete task
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
    }

    // If manager, verify they manage the assigned employee
    if (session.role === 'MANAGER') {
      const task = await prisma.task.findUnique({
        where: { id },
        include: {
          employee: {
            select: {
              reportingHeadId: true,
            },
          },
        },
      });

      if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }

      if (task.employee.reportingHeadId !== session.employeeId && task.assignedTo !== session.employeeId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    await prisma.task.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
