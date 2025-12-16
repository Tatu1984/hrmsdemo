import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPayroll() {
  console.log('💰 Seeding payroll data...');

  // Get all employees
  const employees = await prisma.employee.findMany();

  if (employees.length === 0) {
    console.log('No employees found. Please run the main seed first.');
    return;
  }

  // Update employees with salary components
  for (const emp of employees) {
    // Only Sales department gets 70% basic + 30% variable structure
    const isSales = emp.department === 'Sales';
    const basicSalary = isSales ? emp.salary * 0.7 : emp.salary; // 70% basic for sales, 100% for others
    const variablePay = isSales ? emp.salary * 0.3 : 0; // 30% variable only for sales
    const salesTarget = isSales ? 100000 : null; // Sales target only for sales dept

    await prisma.employee.update({
      where: { id: emp.id },
      data: {
        basicSalary,
        variablePay,
        salesTarget,
        employeeType: isSales ? 'Sales' : emp.department === 'Development' ? 'Technical' : 'Operations',
      },
    });
  }

  console.log('✅ Updated employee salary components');

  // Create attendance data for the current month
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  for (const emp of employees) {
    // Create attendance for first 20 days of the month
    for (let day = 1; day <= 20; day++) {
      const date = new Date(currentYear, currentMonth, day);

      // Skip weekends (Saturday = 6, Sunday = 0)
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      // Randomly assign some absences and half days
      const random = Math.random();
      let status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE' = 'PRESENT';
      let totalHours = 8;
      let breakDuration = 1;
      let idleTime = 0.5;

      if (random < 0.05) {
        status = 'ABSENT';
        totalHours = 0;
        breakDuration = 0;
        idleTime = 0;
      } else if (random < 0.1) {
        status = 'HALF_DAY';
        totalHours = 4;
        breakDuration = 0.5;
        idleTime = 0.2;
      } else if (random < 0.15) {
        status = 'LEAVE';
        totalHours = 0;
        breakDuration = 0;
        idleTime = 0;
      } else {
        // Vary work hours slightly
        totalHours = 7 + Math.random() * 2; // 7-9 hours
        breakDuration = 0.5 + Math.random() * 0.5; // 0.5-1 hour
        idleTime = Math.random() * 1; // 0-1 hour
      }

      const punchIn = status !== 'ABSENT' && status !== 'LEAVE'
        ? new Date(currentYear, currentMonth, day, 9, Math.floor(Math.random() * 30))
        : null;

      const punchOut = punchIn && (status === 'PRESENT' || status === 'HALF_DAY')
        ? new Date(punchIn.getTime() + totalHours * 60 * 60 * 1000)
        : null;

      await prisma.attendance.create({
        data: {
          employeeId: emp.id,
          date,
          punchIn,
          punchOut,
          totalHours: Math.round(totalHours * 100) / 100,
          breakDuration: Math.round(breakDuration * 100) / 100,
          idleTime: Math.round(idleTime * 100) / 100,
          status,
        },
      });
    }
  }

  console.log('✅ Created attendance records for current month');

  // Generate payroll for current month
  const workingDays = 22; // Approximate working days in a month

  for (const emp of employees) {
    // Get attendance data
    const attendance = await prisma.attendance.findMany({
      where: {
        employeeId: emp.id,
        date: {
          gte: new Date(currentYear, currentMonth, 1),
          lte: new Date(currentYear, currentMonth + 1, 0),
        },
      },
    });

    const presentDays = attendance.filter(a => a.status === 'PRESENT').length;
    const halfDays = attendance.filter(a => a.status === 'HALF_DAY').length;
    const leaveDays = attendance.filter(a => a.status === 'LEAVE').length;
    const absentDays = workingDays - presentDays - halfDays - leaveDays;

    const effectiveDays = presentDays + (halfDays * 0.5);

    // Salary components - department specific
    const isSales = emp.department === 'Sales';
    const basicSalary = emp.basicSalary || (isSales ? emp.salary * 0.7 : emp.salary);
    const variablePay = emp.variablePay || (isSales ? emp.salary * 0.3 : 0);
    const salesTarget = emp.salesTarget || 0;

    // Calculate payable amounts
    const basicPayable = (basicSalary / workingDays) * effectiveDays;

    // For demo: Sales employees get 50-80% variable pay based on "achievement"
    // Non-sales employees have no variable component
    const targetAchieved = salesTarget > 0 ? salesTarget * (0.5 + Math.random() * 0.3) : 0;
    const achievementPercent = salesTarget > 0 ? (targetAchieved / salesTarget) * 100 : 0;
    const variablePayable = isSales ? (variablePay * achievementPercent) / 100 : 0;

    const grossSalary = basicPayable + variablePayable;

    // Deductions
    const professionalTax = 200;
    const tds = grossSalary * 0.1; // 10% TDS
    const penalties = Math.random() < 0.2 ? 500 + Math.random() * 1000 : 0; // Random penalties for 20% employees
    const advancePayment = Math.random() < 0.3 ? 2000 + Math.random() * 3000 : 0; // Random advances for 30% employees
    const otherDeductions = 0;

    const totalDeductions = professionalTax + tds + penalties + advancePayment + otherDeductions;
    const netSalary = grossSalary - totalDeductions;

    await prisma.payroll.create({
      data: {
        employeeId: emp.id,
        month: currentMonth + 1,
        year: currentYear,
        workingDays,
        daysPresent: presentDays,
        daysAbsent: absentDays,

        basicSalary,
        variablePay,
        salesTarget,
        targetAchieved,

        basicPayable: Math.round(basicPayable * 100) / 100,
        variablePayable: Math.round(variablePayable * 100) / 100,
        grossSalary: Math.round(grossSalary * 100) / 100,

        professionalTax,
        tds: Math.round(tds * 100) / 100,
        penalties: Math.round(penalties * 100) / 100,
        advancePayment: Math.round(advancePayment * 100) / 100,
        otherDeductions,
        totalDeductions: Math.round(totalDeductions * 100) / 100,

        netSalary: Math.round(netSalary * 100) / 100,
        status: 'PENDING',
      },
    });
  }

  console.log(`✅ Generated payroll for ${employees.length} employees`);
  console.log('\n💼 Payroll Summary:');
  console.log(`   Month: ${new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
  console.log(`   Employees: ${employees.length}`);
  console.log(`   Working Days: ${workingDays}`);
}

seedPayroll()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
