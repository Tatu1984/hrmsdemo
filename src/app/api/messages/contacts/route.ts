import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's employee record
    const currentUser = await prisma.user.findUnique({
      where: { id: session.id },
      include: {
        employee: {
          include: {
            reportingHead: true,
          },
        },
      },
    });

    if (!currentUser || !currentUser.employee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Get messaging permissions for current user
    const permissions = await prisma.messagingPermission.findUnique({
      where: { userId: session.id },
    });

    const canMessagePeers = permissions?.canMessagePeers ?? true;
    const canMessageManager = permissions?.canMessageManager ?? true;
    const canMessageDirector = permissions?.canMessageDirector ?? false;

    // Fetch all employees except current user
    const allEmployees = await prisma.employee.findMany({
      where: {
        id: { not: currentUser.employee.id },
      },
      include: {
        user: {
          select: {
            id: true,
            role: true,
          },
        },
        reportingHead: {
          select: {
            id: true,
          },
        },
      },
    });

    // Build list of allowed contacts based on permissions
    const contacts = allEmployees.filter((employee) => {
      // Check if this is a peer (same department and designation)
      const isPeer = employee.department === currentUser.employee!.department &&
                     employee.designation === currentUser.employee!.designation;

      // Check if this is the user's manager
      const isManager = currentUser.employee!.reportingHeadId === employee.id;

      // Check if this is a director/founder (ADMIN or top-level MANAGER)
      const isDirector = employee.user?.role === 'ADMIN' ||
                        (employee.user?.role === 'MANAGER' && !employee.reportingHead);

      // Allow contact based on permissions
      if (isPeer && canMessagePeers) return true;
      if (isManager && canMessageManager) return true;
      if (isDirector && canMessageDirector) return true;

      return false;
    });

    // Get unread message counts for all contacts in a single query (fixes N+1)
    const contactIds = contacts.map(c => c.id);
    const unreadCounts = await prisma.message.groupBy({
      by: ['senderId'],
      where: {
        senderId: { in: contactIds },
        recipientId: currentUser.employee!.id,
        read: false,
      },
      _count: true,
    });

    // Create a map for O(1) lookup
    const unreadMap = new Map(unreadCounts.map(u => [u.senderId, u._count]));

    const contactsWithUnread = contacts.map(contact => ({
      id: contact.user?.id || contact.id,
      name: contact.name,
      designation: contact.designation,
      online: false, // TODO: Implement real-time online status
      unreadCount: unreadMap.get(contact.id) || 0,
    }));

    return NextResponse.json(contactsWithUnread);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}
