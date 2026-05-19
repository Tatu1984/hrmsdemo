import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const params = await context.params;
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: {
        reportingHead: {
          select: {
            id: true,
            name: true,
            employeeId: true,
          },
        },
        subordinates: {
          select: {
            id: true,
            name: true,
            employeeId: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error('Error fetching employee:', error);
    return NextResponse.json({ error: 'Failed to fetch employee' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  const params = await context.params;
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Build update data only with provided fields (supports partial updates)
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.altPhone !== undefined) updateData.altPhone = body.altPhone;
    if (body.altEmail !== undefined) updateData.altEmail = body.altEmail;
    if (body.emergencyContactName !== undefined) updateData.emergencyContactName = body.emergencyContactName;
    if (body.emergencyContactPhone !== undefined) updateData.emergencyContactPhone = body.emergencyContactPhone;
    if (body.emergencyContactRelation !== undefined) updateData.emergencyContactRelation = body.emergencyContactRelation;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.designation !== undefined) updateData.designation = body.designation;
    if (body.salary !== undefined) updateData.salary = parseFloat(body.salary);
    if (body.department !== undefined) updateData.department = body.department;
    if (body.reportingHeadId !== undefined) updateData.reportingHeadId = body.reportingHeadId || null;
    if (body.dateOfJoining !== undefined) updateData.dateOfJoining = new Date(body.dateOfJoining);
    if (body.profilePicture !== undefined) updateData.profilePicture = body.profilePicture;
    if (body.documents !== undefined) updateData.documents = body.documents;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const updatedEmployee = await prisma.employee.update({
      where: { id: params.id },
      data: updateData,
      include: {
        reportingHead: {
          select: {
            id: true,
            name: true,
            employeeId: true,
          },
        },
      },
    });

    // Update user email if changed
    if (body.email !== undefined) {
      await prisma.user.updateMany({
        where: { employeeId: params.id },
        data: {
          email: body.email,
          username: body.email.split('@')[0],
        },
      });
    }

    return NextResponse.json({ success: true, employee: updatedEmployee });
  } catch (error) {
    console.error('Update employee error:', error);
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  const params = await context.params;
  try{
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employeeId = params.id;

    const existing = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!existing) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Employee has many related records across the schema. Most relations do NOT
    // have onDelete: Cascade, so a bare prisma.employee.delete() fails with a FK
    // violation. Clean everything up in a transaction, then delete the employee.
    await prisma.$transaction(
      async (tx) => {
        // Unlink subordinates so they're not orphaned by the cascade
        await tx.employee.updateMany({
          where: { reportingHeadId: employeeId },
          data: { reportingHeadId: null },
        });

        // FK-related rows that would block the delete
        await tx.task.deleteMany({ where: { assignedTo: employeeId } });
        await tx.projectMember.deleteMany({ where: { employeeId } });
        await tx.payroll.deleteMany({ where: { employeeId } });
        await tx.leave.deleteMany({ where: { employeeId } });
        await tx.message.deleteMany({ where: { senderId: employeeId } });
        // ActivityLog cascades from Attendance
        await tx.attendance.deleteMany({ where: { employeeId } });

        // Loosely-coupled rows (no FK but reference the employee by id)
        await tx.dailyWorkUpdate.deleteMany({ where: { employeeId } });
        await tx.salesTarget.deleteMany({ where: { employeeId } });
        await tx.browserActivityLog.deleteMany({ where: { employeeId } });
        await tx.developerCommit.deleteMany({ where: { employeeId } });
        await tx.integrationUserMapping.deleteMany({ where: { employeeId } });
        await tx.aIPrediction.deleteMany({ where: { employeeId } });
        await tx.aISkillGap.deleteMany({ where: { employeeId } });
        await tx.aILearningRecommendation.deleteMany({ where: { employeeId } });
        await tx.aIMentorMatch.deleteMany({
          where: { OR: [{ mentorId: employeeId }, { menteeId: employeeId }] },
        });
        await tx.aIChatSession.deleteMany({ where: { employeeId } });

        // Linked user account
        await tx.user.deleteMany({ where: { employeeId } });

        // BankingDetails + EmployeeDocument cascade via the schema, so the
        // employee row can finally go.
        await tx.employee.delete({ where: { id: employeeId } });
      },
      { timeout: 30000 }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete employee error:', error);
    const message =
      error?.code === 'P2003'
        ? 'Cannot delete employee: related records still reference them.'
        : error?.message || 'Failed to delete employee';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
