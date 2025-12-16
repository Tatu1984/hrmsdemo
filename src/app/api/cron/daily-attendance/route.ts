import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  isFriday,
  isMonday,
  processWeekendCascade,
} from '@/lib/attendance-utils';

/**
 * Daily cron job to:
 * 1. Mark weekends (Saturday/Sunday) as PRESENT for all employees (unless cascaded absent)
 * 2. Mark holidays as PRESENT for all employees
 * 3. Mark weekdays with no punch-in as ABSENT for all employees
 * 4. Apply weekend cascade rule:
 *    - If absent on Friday → Following Saturday is marked ABSENT
 *    - If absent on Monday → Preceding Sunday is marked ABSENT
 *
 * Should be called daily at end of day (e.g., 11:59 PM)
 * Can be triggered by Vercel Cron, external cron service, or manually
 */
export async function GET(request: NextRequest) {
  try {
    // Simple authentication check (you can use a cron secret)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get target date (default to yesterday to process previous day)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - 1); // Process yesterday
    targetDate.setHours(0, 0, 0, 0);

    const results = {
      date: targetDate.toISOString(),
      weekendsMarked: 0,
      holidaysMarked: 0,
      absentsMarked: 0,
      cascadedAbsents: 0,
      alreadyExists: 0,
      errors: [] as any[],
    };

    // Check if it's a weekend
    const dayOfWeek = targetDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6

    // Check if it's a holiday
    const holiday = await prisma.holiday.findFirst({
      where: {
        date: {
          gte: targetDate,
          lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    const isHoliday = !!holiday;

    // Get all active employees
    const employees = await prisma.employee.findMany({
      select: { id: true, name: true, employeeId: true, dateOfJoining: true },
    });

    for (const employee of employees) {
      try {
        // Check if employee joined after the target date
        const joiningDate = new Date(employee.dateOfJoining);
        joiningDate.setHours(0, 0, 0, 0);

        if (targetDate < joiningDate) {
          // Employee hasn't joined yet, skip
          continue;
        }

        // Check if attendance already exists
        const existingAttendance = await prisma.attendance.findFirst({
          where: {
            employeeId: employee.id,
            date: {
              gte: targetDate,
              lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
            },
          },
        });

        if (existingAttendance) {
          results.alreadyExists++;
          continue;
        }

        // Auto-mark based on day type
        if (isWeekend) {
          // Mark weekend as PRESENT (weekly off)
          await prisma.attendance.create({
            data: {
              employeeId: employee.id,
              date: targetDate,
              status: 'PRESENT',
              punchIn: null,
              punchOut: null,
              totalHours: 0,
              breakDuration: 0,
            },
          });
          results.weekendsMarked++;
        } else if (isHoliday) {
          // Mark holiday as PRESENT
          await prisma.attendance.create({
            data: {
              employeeId: employee.id,
              date: targetDate,
              status: 'HOLIDAY',
              punchIn: null,
              punchOut: null,
              totalHours: 0,
              breakDuration: 0,
            },
          });
          results.holidaysMarked++;
        } else {
          // Weekday with no attendance = ABSENT
          await prisma.attendance.create({
            data: {
              employeeId: employee.id,
              date: targetDate,
              status: 'ABSENT',
              punchIn: null,
              punchOut: null,
              totalHours: 0,
              breakDuration: 0,
            },
          });
          results.absentsMarked++;

          // Apply weekend cascade rule for absences
          // Friday absent → Saturday absent
          // Monday absent → Sunday absent
          if (isFriday(targetDate) || isMonday(targetDate)) {
            const { cascadedRecords } = await processWeekendCascade(employee.id, targetDate);
            results.cascadedAbsents += cascadedRecords.length;
          }
        }
      } catch (error) {
        console.error(`Error processing employee ${employee.employeeId}:`, error);
        results.errors.push({
          employeeId: employee.employeeId,
          name: employee.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      isWeekend,
      isHoliday,
      holidayName: holiday?.name || null,
      totalEmployees: employees.length,
      results,
    });
  } catch (error) {
    console.error('Daily attendance cron error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process daily attendance',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering with custom date
export async function POST(request: NextRequest) {
  try {
    // Admin authentication for manual trigger
    const body = await request.json();
    const { date, secret } = body;

    const cronSecret = process.env.CRON_SECRET || 'your-secret-key';
    if (secret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const results = {
      date: targetDate.toISOString(),
      weekendsMarked: 0,
      holidaysMarked: 0,
      absentsMarked: 0,
      cascadedAbsents: 0,
      alreadyExists: 0,
      errors: [] as any[],
    };

    const dayOfWeek = targetDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const holiday = await prisma.holiday.findFirst({
      where: {
        date: {
          gte: targetDate,
          lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    const isHoliday = !!holiday;

    const employees = await prisma.employee.findMany({
      select: { id: true, name: true, employeeId: true, dateOfJoining: true },
    });

    for (const employee of employees) {
      try {
        // Check if employee joined after the target date
        const joiningDate = new Date(employee.dateOfJoining);
        joiningDate.setHours(0, 0, 0, 0);

        if (targetDate < joiningDate) {
          // Employee hasn't joined yet, skip
          continue;
        }

        const existingAttendance = await prisma.attendance.findFirst({
          where: {
            employeeId: employee.id,
            date: {
              gte: targetDate,
              lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
            },
          },
        });

        if (existingAttendance) {
          results.alreadyExists++;
          continue;
        }

        if (isWeekend) {
          await prisma.attendance.create({
            data: {
              employeeId: employee.id,
              date: targetDate,
              status: 'PRESENT',
              punchIn: null,
              punchOut: null,
              totalHours: 0,
              breakDuration: 0,
            },
          });
          results.weekendsMarked++;
        } else if (isHoliday) {
          await prisma.attendance.create({
            data: {
              employeeId: employee.id,
              date: targetDate,
              status: 'HOLIDAY',
              punchIn: null,
              punchOut: null,
              totalHours: 0,
              breakDuration: 0,
            },
          });
          results.holidaysMarked++;
        } else {
          await prisma.attendance.create({
            data: {
              employeeId: employee.id,
              date: targetDate,
              status: 'ABSENT',
              punchIn: null,
              punchOut: null,
              totalHours: 0,
              breakDuration: 0,
            },
          });
          results.absentsMarked++;

          // Apply weekend cascade rule for absences
          // Friday absent → Saturday absent
          // Monday absent → Sunday absent
          if (isFriday(targetDate) || isMonday(targetDate)) {
            const { cascadedRecords } = await processWeekendCascade(employee.id, targetDate);
            results.cascadedAbsents += cascadedRecords.length;
          }
        }
      } catch (error) {
        console.error(`Error processing employee ${employee.employeeId}:`, error);
        results.errors.push({
          employeeId: employee.employeeId,
          name: employee.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      isWeekend,
      isHoliday,
      holidayName: holiday?.name || null,
      totalEmployees: employees.length,
      results,
    });
  } catch (error) {
    console.error('Manual attendance trigger error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process attendance',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
