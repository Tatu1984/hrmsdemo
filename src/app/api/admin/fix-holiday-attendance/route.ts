import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * API to fix attendance records that were incorrectly marked as ABSENT on holiday dates.
 * This will update all ABSENT records on holiday dates to HOLIDAY status.
 *
 * POST /api/admin/fix-holiday-attendance
 * Body: { startDate?: string, endDate?: string }
 *
 * If no dates provided, it will check all attendance records.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { startDate, endDate } = body;

    // Get all holidays
    const holidayWhere: any = {};
    if (startDate) {
      holidayWhere.date = { ...holidayWhere.date, gte: new Date(startDate) };
    }
    if (endDate) {
      holidayWhere.date = { ...holidayWhere.date, lte: new Date(endDate) };
    }

    const holidays = await prisma.holiday.findMany({
      where: Object.keys(holidayWhere).length > 0 ? holidayWhere : undefined,
      select: { date: true, name: true },
    });

    if (holidays.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No holidays found in the specified range',
        fixed: 0,
      });
    }

    let totalFixed = 0;
    const fixedDetails: any[] = [];

    for (const holiday of holidays) {
      const holidayDate = new Date(holiday.date);
      const year = holidayDate.getFullYear();
      const month = holidayDate.getMonth();
      const day = holidayDate.getDate();

      // Create date range to match both UTC and local stored dates
      const startOfDayUTC = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      const endOfDayUTC = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

      const localStart = new Date(year, month, day, 0, 0, 0, 0);
      const localEnd = new Date(year, month, day, 23, 59, 59, 999);

      // Find all ABSENT records on this holiday date
      const absentRecords = await prisma.attendance.findMany({
        where: {
          status: 'ABSENT',
          OR: [
            {
              date: {
                gte: startOfDayUTC,
                lte: endOfDayUTC,
              },
            },
            {
              date: {
                gte: localStart,
                lte: localEnd,
              },
            },
          ],
        },
        include: {
          employee: {
            select: { name: true, employeeId: true },
          },
        },
      });

      if (absentRecords.length > 0) {
        // Update all ABSENT records to HOLIDAY
        const result = await prisma.attendance.updateMany({
          where: {
            id: { in: absentRecords.map(r => r.id) },
          },
          data: {
            status: 'HOLIDAY',
          },
        });

        totalFixed += result.count;

        fixedDetails.push({
          holiday: holiday.name,
          date: holidayDate.toISOString().split('T')[0],
          employeesFixed: absentRecords.map(r => ({
            name: r.employee.name,
            employeeId: r.employee.employeeId,
          })),
          count: result.count,
        });
      }
    }

    // Create audit log
    if (totalFixed > 0) {
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          userName: session.name,
          userRole: session.role,
          action: 'UPDATE',
          entityType: 'Attendance',
          entityId: 'bulk-fix',
          entityName: `Fixed ${totalFixed} holiday attendance records`,
          changes: {
            action: 'fix-holiday-attendance',
            totalFixed,
            details: fixedDetails,
          },
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${totalFixed} attendance records that were incorrectly marked as ABSENT on holidays`,
      totalFixed,
      details: fixedDetails,
    });
  } catch (error) {
    console.error('Error fixing holiday attendance:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fix holiday attendance',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Preview what would be fixed without making changes
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Get all holidays
    const holidayWhere: any = {};
    if (startDate) {
      holidayWhere.date = { ...holidayWhere.date, gte: new Date(startDate) };
    }
    if (endDate) {
      holidayWhere.date = { ...holidayWhere.date, lte: new Date(endDate) };
    }

    const holidays = await prisma.holiday.findMany({
      where: Object.keys(holidayWhere).length > 0 ? holidayWhere : undefined,
      select: { date: true, name: true },
    });

    const preview: any[] = [];
    let totalToFix = 0;

    for (const holiday of holidays) {
      const holidayDate = new Date(holiday.date);
      const year = holidayDate.getFullYear();
      const month = holidayDate.getMonth();
      const day = holidayDate.getDate();

      const startOfDayUTC = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      const endOfDayUTC = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

      const localStart = new Date(year, month, day, 0, 0, 0, 0);
      const localEnd = new Date(year, month, day, 23, 59, 59, 999);

      const absentRecords = await prisma.attendance.findMany({
        where: {
          status: 'ABSENT',
          OR: [
            {
              date: {
                gte: startOfDayUTC,
                lte: endOfDayUTC,
              },
            },
            {
              date: {
                gte: localStart,
                lte: localEnd,
              },
            },
          ],
        },
        include: {
          employee: {
            select: { name: true, employeeId: true },
          },
        },
      });

      if (absentRecords.length > 0) {
        totalToFix += absentRecords.length;
        preview.push({
          holiday: holiday.name,
          date: holidayDate.toISOString().split('T')[0],
          employees: absentRecords.map(r => ({
            name: r.employee.name,
            employeeId: r.employee.employeeId,
          })),
          count: absentRecords.length,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Found ${totalToFix} ABSENT records on holiday dates that can be fixed`,
      totalToFix,
      preview,
      instruction: 'Send a POST request to this endpoint to apply the fix',
    });
  } catch (error) {
    console.error('Error previewing holiday attendance fix:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to preview',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
