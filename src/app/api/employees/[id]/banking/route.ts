import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/employees/[id]/banking - Get banking details
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

    const { id: employeeId } = await params;

    // Authorization: Only admin, manager, or the employee themselves can view
    if (
      session.role !== 'ADMIN' &&
      session.role !== 'MANAGER' &&
      session.employeeId !== employeeId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const bankingDetails = await prisma.bankingDetails.findUnique({
      where: { employeeId },
    });

    return NextResponse.json(bankingDetails);
  } catch (error) {
    console.error('Error fetching banking details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch banking details' },
      { status: 500 }
    );
  }
}

// POST /api/employees/[id]/banking - Create/Update banking details
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const params = await context.params;
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: employeeId } = params;

    // Authorization: Only admin or the employee themselves can update
    if (session.role !== 'ADMIN' && session.employeeId !== employeeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      bankName,
      branchName,
      accountHolderName,
      accountNumber,
      accountType,
      ifscCode,
      swiftCode,
      upiId,
      panNumber,
      pfAccountNumber,
      esiNumber,
      uanNumber,
    } = body;

    // Validate required fields
    if (!bankName || !accountHolderName || !accountNumber || !ifscCode) {
      return NextResponse.json(
        { error: 'Bank name, account holder name, account number, and IFSC code are required' },
        { status: 400 }
      );
    }

    // Upsert banking details
    const bankingDetails = await prisma.bankingDetails.upsert({
      where: { employeeId },
      create: {
        employeeId,
        bankName,
        branchName,
        accountHolderName,
        accountNumber,
        accountType,
        ifscCode,
        swiftCode,
        upiId,
        panNumber,
        pfAccountNumber,
        esiNumber,
        uanNumber,
      },
      update: {
        bankName,
        branchName,
        accountHolderName,
        accountNumber,
        accountType,
        ifscCode,
        swiftCode,
        upiId,
        panNumber,
        pfAccountNumber,
        esiNumber,
        uanNumber,
      },
    });

    return NextResponse.json(bankingDetails);
  } catch (error) {
    console.error('Error saving banking details:', error);
    return NextResponse.json(
      { error: 'Failed to save banking details' },
      { status: 500 }
    );
  }
}

// PUT /api/employees/[id]/banking/verify - Verify banking details (Admin only)
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

    const { id: employeeId } = params;

    const bankingDetails = await prisma.bankingDetails.update({
      where: { employeeId },
      data: {
        isVerified: true,
        verifiedBy: session.employeeId || session.id,
        verifiedAt: new Date(),
      },
    });

    return NextResponse.json(bankingDetails);
  } catch (error) {
    console.error('Error verifying banking details:', error);
    return NextResponse.json(
      { error: 'Failed to verify banking details' },
      { status: 500 }
    );
  }
}
