import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/projects - Get all projects
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = {};

    // Role-based filtering
    if (session.role === 'MANAGER') {
      // Managers see only their projects
      where.members = {
        some: {
          employeeId: session.employeeId,
        },
      };
    }

    if (status) {
      where.status = status;
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        members: {
          include: {
            employee: {
              select: {
                id: true,
                employeeId: true,
                name: true,
                designation: true,
              },
            },
          },
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// POST /api/projects - Create new project
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      startDate,
      endDate,
      status,
      memberIds,
      milestones,
      successCriteria,
      projectType,
      totalBudget,
      upfrontPayment,
      leadId,
      saleId
    } = body;

    if (!name || !description || !startDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate Project ID
    const lastProject = await prisma.project.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { projectId: true },
    });

    let projectNumber = 1;
    if (lastProject && lastProject.projectId) {
      const match = lastProject.projectId.match(/PRJ(\d+)/);
      if (match) {
        projectNumber = parseInt(match[1]) + 1;
      }
    }

    const projectId = `PRJ${projectNumber.toString().padStart(5, '0')}`;

    // Format milestones for storage
    const milestonesData = milestones && milestones.length > 0 ? {
      milestones: milestones.map((m: any, idx: number) => ({
        id: `milestone-${idx + 1}`,
        name: m.name,
        successCriteria: m.successCriteria,
        payment: parseFloat(m.payment) || 0,
        dueDate: m.dueDate,
        status: 'pending'
      }))
    } : null;

    // Create project with members
    const project = await prisma.project.create({
      data: {
        projectId,
        name,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        status: status || 'ACTIVE',
        projectType: projectType || 'MILESTONE',
        totalBudget: totalBudget || 0,
        upfrontPayment: upfrontPayment || 0,
        milestones: milestonesData,
        successCriteria: successCriteria || '',
        leadId: leadId || null,
        saleId: saleId || null,
        members: {
          create: (memberIds || []).map((employeeId: string) => ({
            employeeId,
          })),
        },
      },
      include: {
        members: {
          include: {
            employee: {
              select: {
                id: true,
                employeeId: true,
                name: true,
                designation: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, project }, { status: 201 });
  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}

// PUT /api/projects - Update project
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, description, startDate, endDate, status, memberIds, milestones, successCriteria } = body;

    if (!id) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    // Check if project exists
    const existing = await prisma.project.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // If manager, check if they're part of the project
    if (session.role === 'MANAGER') {
      const isMember = existing.members.some(m => m.employeeId === session.employeeId);
      if (!isMember) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Update project
    const updateData: any = {
      name: name || existing.name,
      description: description || existing.description,
      startDate: startDate ? new Date(startDate) : existing.startDate,
      endDate: endDate ? new Date(endDate) : existing.endDate,
      status: status || existing.status,
      milestones: milestones !== undefined ? milestones : existing.milestones,
      successCriteria: successCriteria !== undefined ? successCriteria : existing.successCriteria,
    };

    // Update members if provided
    if (memberIds) {
      await prisma.projectMember.deleteMany({
        where: { projectId: id },
      });

      updateData.members = {
        create: memberIds.map((employeeId: string) => ({
          employeeId,
        })),
      };
    }

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        members: {
          include: {
            employee: {
              select: {
                id: true,
                employeeId: true,
                name: true,
                designation: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error('Update project error:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

// DELETE /api/projects - Delete project
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    // Delete project (cascade will handle members and tasks)
    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete project error:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
