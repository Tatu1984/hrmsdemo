import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/messages - Get messages
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // sent or received

    const where: any = {};

    if (type === 'sent') {
      where.senderId = session.employeeId;
    } else if (type === 'received') {
      where.recipientId = session.employeeId;
    } else {
      // Both sent and received
      where.OR = [
        { senderId: session.employeeId },
        { recipientId: session.employeeId },
      ];
    }

    // Admin can see all messages if tracked
    if (session.role === 'ADMIN') {
      const tracked = searchParams.get('tracked');
      if (tracked === 'true') {
        delete where.OR;
        where.tracked = true;
      }
    }

    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            designation: true,
          },
        },
        recipient: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            designation: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST /api/messages - Send new message
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { recipientId, subject, content, tracked } = body;

    if (!recipientId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get current user's employee record
    const currentUser = await prisma.user.findUnique({
      where: { id: session.id },
      include: { employee: true },
    });

    if (!currentUser?.employee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Check if recipientId is a user ID or employee ID
    let recipientEmployeeId = recipientId;

    // Try to find as user ID first (for popup messenger)
    const recipientUser = await prisma.user.findUnique({
      where: { id: recipientId },
      include: { employee: true },
    });

    if (recipientUser?.employee) {
      recipientEmployeeId = recipientUser.employee.id;
    } else {
      // Verify it's a valid employee ID
      const recipient = await prisma.employee.findUnique({
        where: { id: recipientId },
      });

      if (!recipient) {
        return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
      }
    }

    const message = await prisma.message.create({
      data: {
        senderId: currentUser.employee.id,
        recipientId: recipientEmployeeId,
        subject: subject || '',
        content,
        tracked: tracked || false,
        read: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            employeeId: true,
            name: true,
          },
        },
        recipient: {
          select: {
            id: true,
            employeeId: true,
            name: true,
          },
        },
      },
    });

    // Return with user ID as senderId for popup messenger
    return NextResponse.json({
      id: message.id,
      senderId: session.id,
      content: message.content,
      createdAt: message.createdAt,
      read: message.read,
    }, { status: 201 });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

// PUT /api/messages - Mark message as read/unread or update tracked status
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, read, tracked } = body;

    if (!id) {
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 });
    }

    const existing = await prisma.message.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Only recipient can mark as read
    if (read !== undefined && existing.recipientId !== session.employeeId) {
      return NextResponse.json({ error: 'Only recipient can mark message as read' }, { status: 401 });
    }

    // Only admin can change tracked status
    if (tracked !== undefined && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admin can update tracked status' }, { status: 401 });
    }

    const updateData: any = {};
    if (read !== undefined) updateData.read = read;
    if (tracked !== undefined) updateData.tracked = tracked;

    const message = await prisma.message.update({
      where: { id },
      data: updateData,
      include: {
        sender: {
          select: {
            id: true,
            employeeId: true,
            name: true,
          },
        },
        recipient: {
          select: {
            id: true,
            employeeId: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('Update message error:', error);
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
  }
}

// DELETE /api/messages - Delete message
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 });
    }

    const message = await prisma.message.findUnique({
      where: { id },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Only sender or admin can delete
    if (message.senderId !== session.employeeId && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.message.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
