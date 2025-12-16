import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession, hashPassword } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employees = await prisma.employee.findMany({
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Check if email already exists
    const existing = await prisma.employee.findUnique({
      where: { email: body.email },
    });

    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    // Generate employee ID
    const lastEmployee = await prisma.employee.findFirst({
      orderBy: { employeeId: 'desc' },
    });

    let empId: string;
    if (lastEmployee && lastEmployee.employeeId.startsWith('EMP')) {
      const lastNum = parseInt(lastEmployee.employeeId.replace('EMP', ''));
      empId = `EMP${String(lastNum + 1).padStart(3, '0')}`;
    } else {
      empId = 'EMP001';
    }

    // Create employee
    const newEmployee = await prisma.employee.create({
      data: {
        employeeId: empId,
        name: body.name,
        email: body.email,
        phone: body.phone,
        altPhone: body.altPhone,
        altEmail: body.altEmail,
        emergencyContactName: body.emergencyContactName,
        emergencyContactPhone: body.emergencyContactPhone,
        emergencyContactRelation: body.emergencyContactRelation,
        address: body.address,
        designation: body.designation,
        salaryType: body.salaryType || 'FIXED',
        salary: parseFloat(body.salary),
        variablePay: body.variablePay ? parseFloat(body.variablePay) : undefined,
        department: body.department,
        reportingHeadId: body.reportingHeadId || undefined,
        dateOfJoining: new Date(body.dateOfJoining),
        profilePicture: body.profilePicture,
        documents: body.documents || undefined,
      },
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

    // Create user account
    const hashedPwd = await hashPassword('12345678'); // Default password
    await prisma.user.create({
      data: {
        email: body.email,
        username: body.email.split('@')[0],
        password: hashedPwd,
        role: 'EMPLOYEE',
        employeeId: newEmployee.id,
      },
    });

    return NextResponse.json(newEmployee, { status: 201 });
  } catch (error) {
    console.error('Create employee error:', error);
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
  }
}