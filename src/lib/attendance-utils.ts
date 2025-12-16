/**
 * Attendance Utility Functions
 *
 * Contains logic for:
 * - Weekend cascade absences (Friday absent → Saturday absent, Monday absent → Sunday absent)
 * - Leave attendance marking
 */

import { prisma } from '@/lib/db';

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Check if a date is a Friday (day = 5)
 */
export function isFriday(date: Date): boolean {
  return date.getDay() === 5;
}

/**
 * Check if a date is a Monday (day = 1)
 */
export function isMonday(date: Date): boolean {
  return date.getDay() === 1;
}

/**
 * Check if a date is a Saturday (day = 6)
 */
export function isSaturday(date: Date): boolean {
  return date.getDay() === 6;
}

/**
 * Check if a date is a Sunday (day = 0)
 */
export function isSunday(date: Date): boolean {
  return date.getDay() === 0;
}

/**
 * Get the next day from a given date
 */
export function getNextDay(date: Date): Date {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  nextDay.setHours(0, 0, 0, 0);
  return nextDay;
}

/**
 * Get the previous day from a given date
 */
export function getPreviousDay(date: Date): Date {
  const prevDay = new Date(date);
  prevDay.setDate(prevDay.getDate() - 1);
  prevDay.setHours(0, 0, 0, 0);
  return prevDay;
}

/**
 * Weekend Cascade Absence Rule:
 * - If employee is ABSENT on Friday, the following Saturday should also be marked as ABSENT
 * - If employee is ABSENT on Monday, the preceding Sunday should also be marked as ABSENT
 *
 * This function applies the cascade rule for a given employee and date
 */
export async function applyWeekendCascadeRule(
  employeeId: string,
  date: Date
): Promise<{ cascadedDate: Date | null; action: 'saturday_absent' | 'sunday_absent' | null }> {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  // Case 1: Friday absent → Mark Saturday as absent
  if (isFriday(targetDate)) {
    const saturdayDate = getNextDay(targetDate);
    return {
      cascadedDate: saturdayDate,
      action: 'saturday_absent',
    };
  }

  // Case 2: Monday absent → Mark Sunday as absent (previous day)
  if (isMonday(targetDate)) {
    const sundayDate = getPreviousDay(targetDate);
    return {
      cascadedDate: sundayDate,
      action: 'sunday_absent',
    };
  }

  return { cascadedDate: null, action: null };
}

/**
 * Mark a cascaded weekend day as ABSENT due to adjacent weekday absence
 */
export async function markCascadedWeekendAbsent(
  employeeId: string,
  date: Date,
  reason: 'friday_absent' | 'monday_absent'
): Promise<any> {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);

  // Check if attendance record already exists
  const existing = await prisma.attendance.findFirst({
    where: {
      employeeId,
      date: {
        gte: targetDate,
        lt: nextDay,
      },
    },
  });

  if (existing) {
    // Update existing record to ABSENT if it was marked as WEEKEND/PRESENT
    if (existing.status === 'WEEKEND' || existing.status === 'PRESENT') {
      return await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status: 'ABSENT',
        },
      });
    }
    return existing;
  }

  // Create new attendance record as ABSENT
  return await prisma.attendance.create({
    data: {
      employeeId,
      date: targetDate,
      status: 'ABSENT',
      punchIn: null,
      punchOut: null,
      totalHours: 0,
      breakDuration: 0,
    },
  });
}

/**
 * Process weekend cascade for a specific employee and date
 * Call this when marking an employee as ABSENT
 */
export async function processWeekendCascade(
  employeeId: string,
  absentDate: Date
): Promise<{ cascadedRecords: any[] }> {
  const cascadedRecords: any[] = [];
  const targetDate = new Date(absentDate);
  targetDate.setHours(0, 0, 0, 0);

  // If absent on Friday, mark Saturday as absent
  if (isFriday(targetDate)) {
    const saturdayDate = getNextDay(targetDate);
    const record = await markCascadedWeekendAbsent(
      employeeId,
      saturdayDate,
      'friday_absent'
    );
    cascadedRecords.push(record);
  }

  // If absent on Monday, mark Sunday (previous day) as absent
  if (isMonday(targetDate)) {
    const sundayDate = getPreviousDay(targetDate);
    const record = await markCascadedWeekendAbsent(
      employeeId,
      sundayDate,
      'monday_absent'
    );
    cascadedRecords.push(record);
  }

  return { cascadedRecords };
}

/**
 * Mark attendance records as LEAVE for all days in a leave period
 * Call this when a leave is APPROVED
 */
export async function markLeaveAttendance(
  employeeId: string,
  startDate: Date,
  endDate: Date
): Promise<{ updatedRecords: any[]; createdRecords: any[] }> {
  const updatedRecords: any[] = [];
  const createdRecords: any[] = [];

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Iterate through each day in the leave period
  const currentDate = new Date(start);
  while (currentDate <= end) {
    const dayStart = new Date(currentDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(currentDate);
    dayEnd.setDate(dayEnd.getDate() + 1);

    // Check if attendance record exists for this date
    const existing = await prisma.attendance.findFirst({
      where: {
        employeeId,
        date: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
    });

    if (existing) {
      // Update existing record to LEAVE
      const updated = await prisma.attendance.update({
        where: { id: existing.id },
        data: { status: 'LEAVE' },
      });
      updatedRecords.push(updated);
    } else {
      // Create new attendance record as LEAVE
      const created = await prisma.attendance.create({
        data: {
          employeeId,
          date: dayStart,
          status: 'LEAVE',
          punchIn: null,
          punchOut: null,
          totalHours: 0,
          breakDuration: 0,
        },
      });
      createdRecords.push(created);
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return { updatedRecords, createdRecords };
}

/**
 * Revert attendance records when a leave is CANCELLED or REJECTED
 * This should revert LEAVE status back to original status or delete if created for leave
 */
export async function revertLeaveAttendance(
  employeeId: string,
  startDate: Date,
  endDate: Date
): Promise<{ revertedRecords: any[] }> {
  const revertedRecords: any[] = [];

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Find all LEAVE records in this date range for the employee
  const leaveRecords = await prisma.attendance.findMany({
    where: {
      employeeId,
      date: {
        gte: start,
        lte: end,
      },
      status: 'LEAVE',
    },
  });

  for (const record of leaveRecords) {
    const recordDate = new Date(record.date);
    const dayOfWeek = recordDate.getDay();

    // Determine what the status should be if not on leave
    let newStatus: 'WEEKEND' | 'ABSENT' = 'ABSENT';
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      newStatus = 'WEEKEND';
    }

    // If the record has no punch data, it was likely created for the leave
    // Revert it to the appropriate status
    const updated = await prisma.attendance.update({
      where: { id: record.id },
      data: { status: newStatus },
    });
    revertedRecords.push(updated);
  }

  return { revertedRecords };
}

/**
 * Check if a weekend day should be marked as absent due to adjacent weekday absence
 * This is used for display purposes in calendars
 */
export async function isWeekendCascadedAbsent(
  employeeId: string,
  weekendDate: Date
): Promise<{ isCascaded: boolean; reason: string | null }> {
  const targetDate = new Date(weekendDate);
  targetDate.setHours(0, 0, 0, 0);

  // Only process weekend days
  if (!isWeekend(targetDate)) {
    return { isCascaded: false, reason: null };
  }

  // Check if Saturday - look for Friday absence
  if (isSaturday(targetDate)) {
    const fridayDate = getPreviousDay(targetDate);
    const fridayNextDay = new Date(fridayDate);
    fridayNextDay.setDate(fridayNextDay.getDate() + 1);

    const fridayAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        date: {
          gte: fridayDate,
          lt: fridayNextDay,
        },
      },
    });

    if (fridayAttendance?.status === 'ABSENT') {
      return { isCascaded: true, reason: 'Friday was absent' };
    }
  }

  // Check if Sunday - look for Monday absence
  if (isSunday(targetDate)) {
    const mondayDate = getNextDay(targetDate);
    const mondayNextDay = new Date(mondayDate);
    mondayNextDay.setDate(mondayNextDay.getDate() + 1);

    const mondayAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        date: {
          gte: mondayDate,
          lt: mondayNextDay,
        },
      },
    });

    if (mondayAttendance?.status === 'ABSENT') {
      return { isCascaded: true, reason: 'Monday was absent' };
    }
  }

  return { isCascaded: false, reason: null };
}

/**
 * Get all dates that should be marked absent due to weekend cascade for a date range
 */
export async function getWeekendCascadeAbsences(
  employeeId: string,
  startDate: Date,
  endDate: Date
): Promise<{ date: Date; reason: string }[]> {
  const cascadedAbsences: { date: Date; reason: string }[] = [];

  // Get all absences in the date range
  const absences = await prisma.attendance.findMany({
    where: {
      employeeId,
      status: 'ABSENT',
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  for (const absence of absences) {
    const absentDate = new Date(absence.date);
    absentDate.setHours(0, 0, 0, 0);

    // Friday absent → Saturday absent
    if (isFriday(absentDate)) {
      const saturdayDate = getNextDay(absentDate);
      cascadedAbsences.push({
        date: saturdayDate,
        reason: 'Friday was absent',
      });
    }

    // Monday absent → Sunday absent
    if (isMonday(absentDate)) {
      const sundayDate = getPreviousDay(absentDate);
      cascadedAbsences.push({
        date: sundayDate,
        reason: 'Monday was absent',
      });
    }
  }

  return cascadedAbsences;
}
