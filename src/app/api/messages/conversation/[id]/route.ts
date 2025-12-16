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
    const recipientUserId = params.id;
    // Get current user's employee record
    const currentUser = await prisma.user.findUnique({
      where: { id: session.id },
      include: {
        employee: true,
      },
    });
    // Get recipient's employee record
    const recipientUser = await prisma.user.findUnique({
      where: { id: recipientUserId },
      include: {
        employee: true,
      },
    });
    if (!currentUser?.employee || !recipientUser?.employee) {
      return NextResponse.json({ error: 'Employee records not found' }, { status: 404 });
    }
    // Fetch all messages between these two users
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          {
            senderId: currentUser.employee.id,
            recipientId: recipientUser.employee.id,
          },
          {
            senderId: recipientUser.employee.id,
            recipientId: currentUser.employee.id,
          },
        ],
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    // Mark messages from recipient as read
    await prisma.message.updateMany({
      where: {
        senderId: recipientUser.employee.id,
        recipientId: currentUser.employee.id,
        read: false,
      },
      data: {
        read: true,
      },
    });
    // Transform messages to include user IDs instead of employee IDs
    const transformedMessages = messages.map((msg) => ({
      id: msg.id,
      senderId: msg.senderId === currentUser.employee!.id ? session.id : recipientUserId,
      content: msg.content,
      createdAt: msg.createdAt,
      read: msg.read,
    }));
    return NextResponse.json(transformedMessages);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
  }
}