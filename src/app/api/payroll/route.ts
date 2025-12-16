import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { isFriday, isMonday, isSaturday, isSunday } from '@/lib/attendance-utils';

// GET /api/payroll - Get payroll records
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const employeeId = searchParams.get('employeeId');

    const where: any = {};

    // Role-based filtering
    if (session.role === 'EMPLOYEE') {
      where.employeeId = session.employeeId;
    } else if (session.role === 'MANAGER') {
      // Managers see their own + team payroll
      const teamMembers = await prisma.employee.findMany({
        where: { reportingHeadId: session.employeeId },
      });
      const teamIds = [session.employeeId!, ...teamMembers.map(t => t.id)];
      where.employeeId = { in: teamIds };
    }

    if (month) {
      where.month = parseInt(month);
    }

    if (year) {
      where.year = parseInt(year);
    }

    if (employeeId && session.role === 'ADMIN') {
      where.employeeId = employeeId;
    }

    const payroll = await prisma.payroll.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            designation: true,
            department: true,
          },
        },
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ],
    });

    return NextResponse.json(payroll);
  } catch (error) {
    console.error('Error fetching payroll:', error);
    return NextResponse.json({ error: 'Failed to fetch payroll' }, { status: 500 });
  }
}

// POST /api/payroll - Generate payroll
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { month, year, employeeIds } = body;

    if (!month || !year) {
      return NextResponse.json({ error: 'Month and year required' }, { status: 400 });
    }

    // Get employees to process
    const where: any = {};
    if (employeeIds && employeeIds.length > 0) {
      where.id = { in: employeeIds };
    }

    const employees = await prisma.employee.findMany({ where });

    const payrollRecords = [];

    for (const emp of employees) {
      // Check if payroll already exists
      const existing = await prisma.payroll.findFirst({
        where: {
          employeeId: emp.id,
          month: parseInt(month),
          year: parseInt(year),
        },
      });

      if (existing) {
        continue; // Skip if already exists
      }

      // AUTHORITATIVE PAYROLL LOGIC
      console.log(`\n=== Payroll Calculation for ${emp.name} (${emp.employeeId}) ===`);
      console.log(`Month: ${month}, Year: ${year}`);

      // Calculate calculation_date (today or last day of month if past)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const monthStartDate = new Date(year, month - 1, 1);
      monthStartDate.setHours(0, 0, 0, 0);

      const monthEndDate = new Date(year, month, 0);
      monthEndDate.setHours(0, 0, 0, 0);

      // calculation_date is min(today, month_end)
      let calculationDate = new Date(today);
      if (today > monthEndDate) {
        calculationDate = new Date(monthEndDate);
      }
      calculationDate.setHours(0, 0, 0, 0);

      console.log(`Month start: ${monthStartDate.toISOString().split('T')[0]}`);
      console.log(`Month end: ${monthEndDate.toISOString().split('T')[0]}`);
      console.log(`Calculation date: ${calculationDate.toISOString().split('T')[0]}`);

      // Get employee join and leave dates
      const joinDate = new Date(emp.dateOfJoining);
      joinDate.setHours(0, 0, 0, 0);

      // Note: Employee model doesn't have leaveDate yet, so we'll use null for now
      const leaveDate = null; // emp.leaveDate ? new Date(emp.leaveDate) : null;

      console.log(`Join date: ${joinDate.toISOString().split('T')[0]}`);
      console.log(`Leave date: ${leaveDate ? leaveDate.toISOString().split('T')[0] : 'N/A'}`);

      // Determine effective attendance window
      // effective_start = max(join_date, month_start_date)
      const effectiveStart = joinDate > monthStartDate ? new Date(joinDate) : new Date(monthStartDate);
      effectiveStart.setHours(0, 0, 0, 0);

      // effective_end = min(calculation_date, leave_date if provided else calculation_date)
      let effectiveEnd = new Date(calculationDate);
      if (leaveDate && leaveDate < calculationDate) {
        effectiveEnd = new Date(leaveDate);
      }
      effectiveEnd.setHours(0, 0, 0, 0);

      console.log(`Effective start: ${effectiveStart.toISOString().split('T')[0]}`);
      console.log(`Effective end: ${effectiveEnd.toISOString().split('T')[0]}`);

      // Get attendance records
      const attendance = await prisma.attendance.findMany({
        where: {
          employeeId: emp.id,
          date: {
            gte: monthStartDate,
            lte: monthEndDate,
          },
        },
        orderBy: { date: 'asc' },
      });

      console.log(`Total attendance records found: ${attendance.length}`);

      // Calculate present_days
      let presentDays = 0;

      // Helper function to check if a weekend should be marked absent due to cascade rule
      const isWeekendCascadedAbsent = (date: Date): boolean => {
        // Saturday: check if Friday was absent
        if (isSaturday(date)) {
          const fridayDate = new Date(date);
          fridayDate.setDate(fridayDate.getDate() - 1);
          fridayDate.setHours(0, 0, 0, 0);
          const fridayAttendance = attendance.find(a => {
            const aDate = new Date(a.date);
            aDate.setHours(0, 0, 0, 0);
            return aDate.getTime() === fridayDate.getTime();
          });
          if (fridayAttendance?.status === 'ABSENT') {
            return true;
          }
        }

        // Sunday: check if Monday was absent
        if (isSunday(date)) {
          const mondayDate = new Date(date);
          mondayDate.setDate(mondayDate.getDate() + 1);
          mondayDate.setHours(0, 0, 0, 0);
          const mondayAttendance = attendance.find(a => {
            const aDate = new Date(a.date);
            aDate.setHours(0, 0, 0, 0);
            return aDate.getTime() === mondayDate.getTime();
          });
          if (mondayAttendance?.status === 'ABSENT') {
            return true;
          }
        }

        return false;
      };

      // If effective_end < effective_start, present_days = 0
      if (effectiveEnd < effectiveStart) {
        console.log('Warning: effective_end < effective_start, present_days = 0');
        presentDays = 0;
      } else {
        // Count days - iterate through each day in the effective window
        let fullPresentDays = 0;
        let halfDays = 0;
        let cascadedAbsentDays = 0;

        const currentDate = new Date(effectiveStart);
        while (currentDate <= effectiveEnd) {
          const dayOfWeek = currentDate.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6

          // Check if there's an attendance record for this day
          const dayAttendance = attendance.find(a => {
            const aDate = new Date(a.date);
            aDate.setHours(0, 0, 0, 0);
            return aDate.getTime() === currentDate.getTime();
          });

          if (dayAttendance) {
            // Use the explicit attendance record
            if (dayAttendance.status === 'PRESENT' ||
                dayAttendance.status === 'LEAVE' ||
                dayAttendance.status === 'WEEKEND' ||
                dayAttendance.status === 'HOLIDAY') {
              fullPresentDays += 1;
            } else if (dayAttendance.status === 'HALF_DAY') {
              halfDays += 1;
            }
            // ABSENT status counts as 0
          } else {
            // No attendance record - check if it's a weekend
            if (isWeekend) {
              // Check weekend cascade rule:
              // - Saturday is absent if Friday was absent
              // - Sunday is absent if Monday was absent
              if (isWeekendCascadedAbsent(currentDate)) {
                cascadedAbsentDays += 1;
                // Do not count as present
              } else {
                // Weekends are paid days even without attendance record
                fullPresentDays += 1;
              }
            }
            // Weekdays without attendance record count as 0 (absent)
          }

          currentDate.setDate(currentDate.getDate() + 1);
        }

        presentDays = fullPresentDays + (0.5 * halfDays);
        console.log(`Full present days: ${fullPresentDays}, Half days: ${halfDays}, Cascaded absent weekends: ${cascadedAbsentDays}`);
      }

      console.log(`Present days (calculated): ${presentDays}`);

      // Salary calculation based on salaryType
      const isVariable = emp.salaryType === 'VARIABLE';
      const monthlySalary = emp.salary;

      let totalPaid = 0;
      let fixedPaid = 0;
      let variablePaid = 0;
      let basicSalary = 0;
      let variablePay = 0;
      let salesTargetUSD = 0;
      let achievedUpfront = 0;

      if (isVariable) {
        // Variable salary employee
        const fixedPart = monthlySalary * 0.70;
        const variablePart = monthlySalary * 0.30;

        basicSalary = fixedPart;
        variablePay = variablePart;

        // Calculate fixed paid based on attendance
        fixedPaid = (fixedPart / 30) * presentDays;

        // Calculate gross target and required upfront
        const grossTarget = monthlySalary / 10;
        const requiredUpfront = 0.30 * grossTarget;

        salesTargetUSD = grossTarget;

        // Get actual achieved upfront from sales data
        const salesData = await prisma.sale.findMany({
          where: {
            closedBy: emp.id,
            month: parseInt(month),
            year: parseInt(year),
            status: { in: ['CONFIRMED', 'DELIVERED', 'PAID'] },
          },
        });

        achievedUpfront = salesData.reduce((sum, sale) => sum + sale.netAmount, 0);

        // Calculate variable ratio
        let variableRatio = 0;
        if (requiredUpfront > 0) {
          variableRatio = Math.min(1.0, achievedUpfront / requiredUpfront);
        }

        variablePaid = variablePart * variableRatio;

        totalPaid = fixedPaid + variablePaid;

        console.log(`Variable salary calculation:`, {
          monthlySalary,
          fixedPart,
          variablePart,
          presentDays,
          fixedPaid: fixedPaid.toFixed(2),
          grossTarget,
          requiredUpfront,
          achievedUpfront,
          variableRatio: variableRatio.toFixed(2),
          variablePaid: variablePaid.toFixed(2),
          totalPaid: totalPaid.toFixed(2),
        });
      } else {
        // Fixed salary employee
        const perDayRate = monthlySalary / 30;
        totalPaid = perDayRate * presentDays;

        basicSalary = monthlySalary;
        variablePay = 0;
        fixedPaid = totalPaid;
        variablePaid = 0;

        console.log(`Fixed salary calculation:`, {
          monthlySalary,
          perDayRate,
          presentDays,
          totalPaid: totalPaid.toFixed(2),
        });
      }

      // Round to 2 decimal places
      const basicPayable = Math.round(fixedPaid * 100) / 100;
      const variablePayable = Math.round(variablePaid * 100) / 100;
      const grossSalary = Math.round(totalPaid * 100) / 100;

      // Deductions
      const professionalTax = 200; // Fixed P.tax
      const tds = 0; // TDS deactivated
      const penalties = 0; // Will be input by admin
      const advancePayment = 0; // Will be input by admin
      const otherDeductions = 0;

      const totalDeductions = professionalTax + tds + penalties + advancePayment + otherDeductions;

      // Net Salary
      const netSalary = Math.round((grossSalary - totalDeductions) * 100) / 100;

      console.log(`Gross salary: ${grossSalary}`);
      console.log(`Total deductions: ${totalDeductions}`);
      console.log(`Net salary: ${netSalary}\n`);

      // Calculate working days and absent days for display
      const workingDays = Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const daysAbsent = Math.max(0, workingDays - presentDays);

      const payrollRecord = await prisma.payroll.create({
        data: {
          employeeId: emp.id,
          month: parseInt(month),
          year: parseInt(year),
          workingDays: workingDays,
          daysPresent: Math.round(presentDays * 10) / 10,
          daysAbsent: Math.round(daysAbsent * 10) / 10,

          basicSalary,
          variablePay,
          salesTarget: salesTargetUSD,
          targetAchieved: achievedUpfront,

          basicPayable,
          variablePayable,
          grossSalary,

          professionalTax,
          tds,
          penalties,
          advancePayment,
          otherDeductions,
          totalDeductions,

          netSalary,
          status: 'PENDING',
        },
        include: {
          employee: {
            select: {
              id: true,
              employeeId: true,
              name: true,
              designation: true,
              department: true,
              employeeType: true,
            },
          },
        },
      });

      console.log(`✓ Payroll record created for ${emp.name}`);
      payrollRecords.push(payrollRecord);
    }

    console.log(`\n=== PAYROLL GENERATION COMPLETE ===`);
    console.log(`Total records generated: ${payrollRecords.length}`);

    return NextResponse.json({
      success: true,
      message: `Generated ${payrollRecords.length} payroll records`,
      payroll: payrollRecords,
    }, { status: 201 });
  } catch (error) {
    console.error('Generate payroll error:', error);
    return NextResponse.json({ error: 'Failed to generate payroll' }, { status: 500 });
  }
}

// PUT /api/payroll - Update payroll status
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'ID and status required' }, { status: 400 });
    }

    const payroll = await prisma.payroll.update({
      where: { id },
      data: { status },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, payroll });
  } catch (error) {
    console.error('Update payroll error:', error);
    return NextResponse.json({ error: 'Failed to update payroll' }, { status: 500 });
  }
}

// DELETE /api/payroll - Delete payroll record
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Payroll ID required' }, { status: 400 });
    }

    await prisma.payroll.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete payroll error:', error);
    return NextResponse.json({ error: 'Failed to delete payroll' }, { status: 500 });
  }
}
