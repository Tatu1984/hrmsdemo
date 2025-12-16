import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * POST /api/attendance/activity
 * Log user activity heartbeat to track active work time
 *
 * This endpoint is called every 30 seconds by the ActivityTracker component
 * when user activity is detected (mouse, keyboard, scroll, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      timestamp,
      active,
      suspicious,
      patternType,
      patternDetails,
      // Enhanced fields
      confidence,
      confidenceScore,
      durationMs,
      patternStartTime,
      // Fingerprint data
      userAgent,
      browserName,
      browserVersion,
      osName,
      osVersion,
      deviceType,
      screenResolution,
      timezone,
      language,
    } = body;

    // Get IP address from request headers
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown';

    // Find today's attendance record
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await prisma.attendance.findFirst({
      where: {
        employeeId: session.employeeId,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    if (!attendance) {
      return NextResponse.json(
        { error: 'No active attendance record found. Please punch in first.' },
        { status: 400 }
      );
    }

    if (attendance.punchOut) {
      return NextResponse.json(
        { error: 'Already punched out for today' },
        { status: 400 }
      );
    }

    // Log the activity with all enhanced fields
    await prisma.activityLog.create({
      data: {
        attendanceId: attendance.id,
        timestamp: new Date(timestamp),
        active: active !== false, // Default to true
        suspicious: suspicious === true, // Default to false
        patternType: patternType || null,
        patternDetails: patternDetails || null,
        // Enhanced detection fields
        confidence: confidence || null,
        confidenceScore: confidenceScore ? parseFloat(confidenceScore) : null,
        durationMs: durationMs ? parseInt(durationMs) : null,
        patternStartTime: patternStartTime ? new Date(patternStartTime) : null,
        // Fingerprint/Device info
        ipAddress: ipAddress,
        userAgent: userAgent || null,
        browserName: browserName || null,
        browserVersion: browserVersion || null,
        osName: osName || null,
        osVersion: osVersion || null,
        deviceType: deviceType || null,
        screenResolution: screenResolution || null,
        timezone: timezone || null,
        language: language || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Activity logged successfully'
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    return NextResponse.json(
      { error: 'Failed to log activity' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/attendance/activity
 * Get activity logs for a specific attendance record
 * Used by admin/manager to view detailed activity timeline
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const attendanceId = searchParams.get('attendanceId');

    if (!attendanceId) {
      return NextResponse.json(
        { error: 'Attendance ID is required' },
        { status: 400 }
      );
    }

    // Get the attendance record to check permissions
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: { employee: true },
    });

    if (!attendance) {
      return NextResponse.json(
        { error: 'Attendance record not found' },
        { status: 404 }
      );
    }

    // Permission check
    if (session.role === 'EMPLOYEE' && attendance.employeeId !== session.employeeId) {
      return NextResponse.json(
        { error: 'You can only view your own activity logs' },
        { status: 403 }
      );
    }

    if (session.role === 'MANAGER') {
      // Check if this employee reports to the manager
      const employee = await prisma.employee.findUnique({
        where: { id: attendance.employeeId },
        select: { reportingHeadId: true },
      });

      if (employee?.reportingHeadId !== session.employeeId) {
        return NextResponse.json(
          { error: 'You can only view activity logs of your team members' },
          { status: 403 }
        );
      }
    }

    // Fetch activity logs
    const activityLogs = await prisma.activityLog.findMany({
      where: { attendanceId },
      orderBy: { timestamp: 'asc' },
    });

    return NextResponse.json({
      activityLogs,
      totalLogs: activityLogs.length
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}
