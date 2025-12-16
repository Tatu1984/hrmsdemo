import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPayroll() {
  try {
    console.log('=== CHECKING NOVEMBER 2024 PAYROLL ===\n');

    // Get all employees
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        employeeId: true,
        name: true,
        salary: true,
        salaryType: true,
      },
    });

    console.log(`Found ${employees.length} employees\n`);

    const month = 11;
    const year = 2024;

    for (const emp of employees) {
      console.log(`\n--- ${emp.name} (${emp.employeeId}) ---`);
      console.log(`Salary Type: ${emp.salaryType}`);
      console.log(`Base Salary: ₹${emp.salary}`);

      // Get attendance for November
      const startDate = new Date(year, month - 1, 1);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(year, month, 0);
      endDate.setHours(23, 59, 59, 999);

      const attendance = await prisma.attendance.findMany({
        where: {
          employeeId: emp.id,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { date: 'asc' },
      });

      console.log(`\nAttendance Records (${attendance.length}):`);
      attendance.forEach(a => {
        const dateStr = new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
        console.log(`  ${dateStr}: ${a.status}`);
      });

      // Count weekends in November
      let weekendDays = 0;
      for (let day = 1; day <= endDate.getDate(); day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          weekendDays++;
        }
      }

      // Count by status
      const statusCounts = {
        PRESENT: attendance.filter(a => a.status === 'PRESENT').length,
        HALF_DAY: attendance.filter(a => a.status === 'HALF_DAY').length,
        ABSENT: attendance.filter(a => a.status === 'ABSENT').length,
        LEAVE: attendance.filter(a => a.status === 'LEAVE').length,
        WEEKEND: attendance.filter(a => a.status === 'WEEKEND').length,
        HOLIDAY: attendance.filter(a => a.status === 'HOLIDAY').length,
      };

      console.log('\nStatus Breakdown:');
      console.log(`  PRESENT: ${statusCounts.PRESENT}`);
      console.log(`  HALF_DAY: ${statusCounts.HALF_DAY}`);
      console.log(`  ABSENT: ${statusCounts.ABSENT}`);
      console.log(`  LEAVE: ${statusCounts.LEAVE}`);
      console.log(`  WEEKEND: ${statusCounts.WEEKEND}`);
      console.log(`  HOLIDAY: ${statusCounts.HOLIDAY}`);

      const totalDaysInMonth = endDate.getDate();
      const totalWorkingDays = totalDaysInMonth - weekendDays;

      const paidFullDays = statusCounts.PRESENT + statusCounts.LEAVE + statusCounts.HOLIDAY;
      const paidHalfDays = statusCounts.HALF_DAY;
      const effectivePaidDays = paidFullDays + (paidHalfDays * 0.5);
      const absentDays = totalWorkingDays - effectivePaidDays;

      console.log('\nCalculation:');
      console.log(`  Total Days in November: ${totalDaysInMonth}`);
      console.log(`  Weekend Days: ${weekendDays}`);
      console.log(`  Total Working Days: ${totalWorkingDays}`);
      console.log(`  Paid Full Days (PRESENT+LEAVE+HOLIDAY): ${paidFullDays}`);
      console.log(`  Paid Half Days: ${paidHalfDays}`);
      console.log(`  Effective Paid Days: ${effectivePaidDays}`);
      console.log(`  Absent Days: ${absentDays}`);

      // Calculate salary
      const isSales = emp.salaryType === 'VARIABLE';
      const basicSalary = isSales ? (emp.salary * 0.7) : emp.salary;
      const perDayBasic = basicSalary / totalWorkingDays;
      const basicPayable = perDayBasic * effectivePaidDays;

      console.log('\nSalary Calculation:');
      console.log(`  Basic Salary: ₹${basicSalary.toFixed(2)}`);
      console.log(`  Per Day Basic: ₹${perDayBasic.toFixed(2)}`);
      console.log(`  Basic Payable: ₹${basicPayable.toFixed(2)}`);
      console.log(`  Formula: (${basicSalary} / ${totalWorkingDays}) * ${effectivePaidDays} = ${basicPayable.toFixed(2)}`);

      // Check existing payroll
      const existingPayroll = await prisma.payroll.findFirst({
        where: {
          employeeId: emp.id,
          month: month,
          year: year,
        },
      });

      if (existingPayroll) {
        console.log('\n⚠️  EXISTING PAYROLL FOUND:');
        console.log(`  Days Present: ${existingPayroll.daysPresent}`);
        console.log(`  Days Absent: ${existingPayroll.daysAbsent}`);
        console.log(`  Basic Payable: ₹${existingPayroll.basicPayable}`);
        console.log(`  Gross Salary: ₹${existingPayroll.grossSalary}`);
        console.log(`  Net Salary: ₹${existingPayroll.netSalary}`);

        if (Math.abs(existingPayroll.basicPayable - basicPayable) > 0.01) {
          console.log(`\n❌ MISMATCH! Should be ₹${basicPayable.toFixed(2)} but showing ₹${existingPayroll.basicPayable}`);
        } else {
          console.log('\n✅ Payroll matches calculation');
        }
      } else {
        console.log('\nℹ️  No payroll record exists yet');
      }

      console.log('\n' + '='.repeat(60));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPayroll();
