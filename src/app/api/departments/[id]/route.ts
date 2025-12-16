import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET single department
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        designations: true,
      },
    });

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    return NextResponse.json(department);
  } catch (error) {
    console.error('Error fetching department:', error);
    return NextResponse.json({ error: 'Failed to fetch department' }, { status: 500 });
  }
}

// PUT update department
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, code, description, headId, parentId, isActive } = body;

    // Check if department exists
    const existing = await prisma.department.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    // Check for duplicate name (excluding current department)
    if (name && name !== existing.name) {
      const duplicate = await prisma.department.findUnique({
        where: { name },
      });
      if (duplicate) {
        return NextResponse.json({ error: 'Department with this name already exists' }, { status: 400 });
      }
    }

    // Check for duplicate code (excluding current department)
    if (code && code !== existing.code) {
      const duplicate = await prisma.department.findUnique({
        where: { code },
      });
      if (duplicate) {
        return NextResponse.json({ error: 'Department with this code already exists' }, { status: 400 });
      }
    }

    // Prevent circular reference
    if (parentId === id) {
      return NextResponse.json({ error: 'Department cannot be its own parent' }, { status: 400 });
    }

    const department = await prisma.department.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        code: code !== undefined ? code : existing.code,
        description: description !== undefined ? description : existing.description,
        headId: headId !== undefined ? headId : existing.headId,
        parentId: parentId !== undefined ? parentId : existing.parentId,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      },
      include: {
        parent: true,
        children: true,
        designations: true,
      },
    });

    return NextResponse.json(department);
  } catch (error) {
    console.error('Error updating department:', error);
    return NextResponse.json({ error: 'Failed to update department' }, { status: 500 });
  }
}

// DELETE department
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if department exists
    const existing = await prisma.department.findUnique({
      where: { id },
      include: {
        children: true,
        designations: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    // Check if department has children
    if (existing.children.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete department with sub-departments. Remove sub-departments first.' },
        { status: 400 }
      );
    }

    // Check if department has designations
    if (existing.designations.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete department with linked designations. Remove designations first.' },
        { status: 400 }
      );
    }

    // Check if any employees belong to this department
    const employeesInDepartment = await prisma.employee.count({
      where: { department: existing.name },
    });

    if (employeesInDepartment > 0) {
      return NextResponse.json(
        { error: `Cannot delete department. ${employeesInDepartment} employee(s) belong to this department.` },
        { status: 400 }
      );
    }

    await prisma.department.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting department:', error);
    return NextResponse.json({ error: 'Failed to delete department' }, { status: 500 });
  }
}
