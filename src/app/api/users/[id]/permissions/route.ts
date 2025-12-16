import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
type RouteContext = {
  params: Promise<{ id: string }>;
};
// PUT - Update user permissions
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
    const { permissions } = body;
    const user = await prisma.user.update({
      where: { id: params.id },
      data: {
        permissions: JSON.stringify(permissions),
      },
    });
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user permissions:', error);
    return NextResponse.json({ error: 'Failed to update permissions' }, { status: 500 });
  }
}