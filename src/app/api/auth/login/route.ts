import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { setSession, verifyPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email/Username and password are required' }, { status: 400 });
    }

    // Try to find user by email or username
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { username: email }, // Allow login with username too
        ],
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            isActive: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Check if employee is active (if user has an associated employee)
    if (user.employee && !user.employee.isActive) {
      return NextResponse.json({ error: 'Account has been deactivated. Please contact admin.' }, { status: 403 });
    }

    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    await setSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId || undefined,
      name: user.employee?.name || user.username,
      permissions: user.permissions || null,
    });

    return NextResponse.json({
      success: true,
      role: user.role,
      name: user.employee?.name || user.username,
    });
  } catch (error) {
    console.error('Login error:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    }, { status: 500 });
  }
}