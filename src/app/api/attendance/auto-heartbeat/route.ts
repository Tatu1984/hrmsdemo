import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Auto-Heartbeat Background Service
 *
 * This endpoint fills in missing heartbeats for employees who are punched in
 * but have no client activity (browser closed/minimized or user idle/AFK).
 * These heartbeats are marked as INACTIVE to track idle time.
 *
 * Call this endpoint every 3 minutes via a cron job or scheduled task.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify this is called from a trusted source (optional: add API key auth)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'default-secret';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find all employees who are currently punched in (punchIn exists, punchOut is null)
    const activeAttendances = await prisma.attendance.findMany({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
        punchIn: { not: null },
        punchOut: null,
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log(`[Auto-Heartbeat] Found ${activeAttendances.length} active attendances`);

    const results = [];

    for (const attendance of activeAttendances) {
      // Get the last activity log for this attendance
      const lastActivity = await prisma.activityLog.findFirst({
        where: { attendanceId: attendance.id },
        orderBy: { timestamp: 'desc' },
      });

      const lastHeartbeatTime = lastActivity?.timestamp || attendance.punchIn;
      const timeSinceLastHeartbeat = now.getTime() - new Date(lastHeartbeatTime!).getTime();
      const minutesSinceLastHeartbeat = timeSinceLastHeartbeat / (1000 * 60);

      // If it's been more than 3.5 minutes since last heartbeat, create a heartbeat
      if (minutesSinceLastHeartbeat >= 3.5) {
        console.log(`[Auto-Heartbeat] Creating heartbeat for ${attendance.employee.name} (last: ${minutesSinceLastHeartbeat.toFixed(1)}min ago)`);

        await prisma.activityLog.create({
          data: {
            attendanceId: attendance.id,
            timestamp: now,
            active: false, // Mark as inactive - no client activity detected, likely idle/AFK
          },
        });

        results.push({
          employeeId: attendance.employeeId,
          employeeName: attendance.employee.name,
          lastHeartbeat: lastHeartbeatTime,
          minutesSince: minutesSinceLastHeartbeat,
          action: 'created_inactive_heartbeat',
        });
      } else {
        results.push({
          employeeId: attendance.employeeId,
          employeeName: attendance.employee.name,
          lastHeartbeat: lastHeartbeatTime,
          minutesSince: minutesSinceLastHeartbeat,
          action: 'no_action_needed',
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: activeAttendances.length,
      heartbeatsCreated: results.filter(r => r.action === 'created_inactive_heartbeat').length,
      timestamp: now,
      results,
    });
  } catch (error: any) {
    console.error('[Auto-Heartbeat] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process auto-heartbeats', details: error.message },
      { status: 500 }
    );
  }
}

// Allow GET for manual testing
export async function GET() {
  return NextResponse.json({
    message: 'Auto-Heartbeat Service',
    instructions: 'Use POST with Authorization header to trigger auto-heartbeat',
  });
}
