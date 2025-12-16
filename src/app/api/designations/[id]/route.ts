import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET single designation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const designation = await prisma.designation.findUnique({
      where: { id },
      include: {
        department: true,
        parent: true,
        children: true,
      },
    });

    if (!designation) {
      return NextResponse.json({ error: 'Designation not found' }, { status: 404 });
    }

    return NextResponse.json(designation);
  } catch (error) {
    console.error('Error fetching designation:', error);
    return NextResponse.json({ error: 'Failed to fetch designation' }, { status: 500 });
  }
}

// PUT update designation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, level, departmentId, parentId, description, isActive } = body;

    // Check if designation exists
    const existing = await prisma.designation.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Designation not found' }, { status: 404 });
    }

    // Check for duplicate name (excluding current designation)
    if (name && name !== existing.name) {
      const duplicate = await prisma.designation.findUnique({
        where: { name },
      });
      if (duplicate) {
        return NextResponse.json({ error: 'Designation with this name already exists' }, { status: 400 });
      }
    }

    // Prevent circular reference
    if (parentId === id) {
      return NextResponse.json({ error: 'Designation cannot be its own parent' }, { status: 400 });
    }

    const designation = await prisma.designation.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        level: level !== undefined ? level : existing.level,
        departmentId: departmentId !== undefined ? departmentId : existing.departmentId,
        parentId: parentId !== undefined ? parentId : existing.parentId,
        description: description !== undefined ? description : existing.description,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      },
      include: {
        department: true,
        parent: true,
        children: true,
      },
    });

    return NextResponse.json(designation);
  } catch (error) {
    console.error('Error updating designation:', error);
    return NextResponse.json({ error: 'Failed to update designation' }, { status: 500 });
  }
}

// DELETE designation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if designation exists
    const existing = await prisma.designation.findUnique({
      where: { id },
      include: {
        children: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Designation not found' }, { status: 404 });
    }

    // Check if designation has children
    if (existing.children.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete designation with child designations. Remove children first.' },
        { status: 400 }
      );
    }

    // Check if any employees have this designation
    const employeesWithDesignation = await prisma.employee.count({
      where: { designation: existing.name },
    });

    if (employeesWithDesignation > 0) {
      return NextResponse.json(
        { error: `Cannot delete designation. ${employeesWithDesignation} employee(s) have this designation.` },
        { status: 400 }
      );
    }

    await prisma.designation.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Designation deleted successfully' });
  } catch (error) {
    console.error('Error deleting designation:', error);
    return NextResponse.json({ error: 'Failed to delete designation' }, { status: 500 });
  }
}
