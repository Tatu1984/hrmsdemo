import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getClientIp } from '@/lib/ip';
import { BrowserEventType } from '@prisma/client';

// POST /api/browser-activity - Log browser activity event
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      eventType,
      sessionId,
      tabId,
      browserName,
      browserVersion,
      osName,
      osVersion,
      deviceType,
      screenResolution,
      timezone,
      language,
      pageUrl,
      pagePath,
      duration,
      metadata,
    } = body;

    // Validate event type
    if (!eventType || !Object.values(BrowserEventType).includes(eventType)) {
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      );
    }

    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || undefined;

    const log = await prisma.browserActivityLog.create({
      data: {
        userId: session.userId,
        userName: session.name,
        userRole: session.role,
        employeeId: session.employeeId || null,
        eventType: eventType as BrowserEventType,
        sessionId,
        tabId,
        browserName,
        browserVersion,
        osName,
        osVersion,
        deviceType,
        screenResolution,
        timezone,
        language,
        ipAddress,
        userAgent,
        pageUrl,
        pagePath,
        duration,
        metadata,
      },
    });

    return NextResponse.json({ success: true, logId: log.id });
  } catch (error) {
    console.error('Error logging browser activity:', error);
    return NextResponse.json(
      { error: 'Failed to log browser activity' },
      { status: 500 }
    );
  }
}

// GET /api/browser-activity - Get browser activity logs (Admin/Manager only)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role === 'EMPLOYEE') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const employeeId = searchParams.get('employeeId');
    const eventType = searchParams.get('eventType');
    const sessionId = searchParams.get('sessionId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (eventType) {
      where.eventType = eventType as BrowserEventType;
    }

    if (sessionId) {
      where.sessionId = sessionId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [logs, total] = await Promise.all([
      prisma.browserActivityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.browserActivityLog.count({ where }),
    ]);

    // Get unique users for filter dropdown
    const uniqueUsers = await prisma.browserActivityLog.findMany({
      where: {},
      select: {
        userId: true,
        userName: true,
        userRole: true,
      },
      distinct: ['userId'],
    });

    return NextResponse.json({ logs, total, users: uniqueUsers });
  } catch (error) {
    console.error('Error fetching browser activity logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch browser activity logs' },
      { status: 500 }
    );
  }
}
