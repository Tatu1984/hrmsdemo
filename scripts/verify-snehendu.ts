import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function verify() {
  const snehendu = await prisma.employee.findFirst({
    where: { employeeId: 'EMP003' }
  });

  if (!snehendu) {
    console.log('Employee not found');
    return;
  }

  const attendance = await prisma.attendance.findMany({
    where: {
      employeeId: snehendu.id,
      date: {
        gte: new Date(2025, 10, 1),
        lte: new Date(2025, 10, 30, 23, 59, 59)
      }
    },
    orderBy: { date: 'asc' }
  });

  console.log('Snehendu Roy (EMP003)');
  console.log('Salary: ₹' + snehendu.salary);
  console.log('\nAttendance records:');

  const counts = { PRESENT: 0, HALF_DAY: 0, ABSENT: 0, WEEKEND: 0, LEAVE: 0, HOLIDAY: 0 };
  attendance.forEach(a => {
    const date = new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    console.log(`  ${date}: ${a.status}`);
    counts[a.status]++;
  });

  console.log('\nCounts:');
  console.log(`  PRESENT: ${counts.PRESENT}`);
  console.log(`  HALF_DAY: ${counts.HALF_DAY}`);
  console.log(`  WEEKEND: ${counts.WEEKEND}`);
  console.log(`  ABSENT: ${counts.ABSENT}`);

  const paidDays = counts.PRESENT + (counts.HALF_DAY * 0.5) + counts.WEEKEND;
  const perDay = snehendu.salary / 30;
  const expectedSalary = perDay * paidDays;

  console.log('\nCalculation:');
  console.log(`  Per day: ₹${snehendu.salary} / 30 = ₹${perDay.toFixed(2)}`);
  console.log(`  Paid days: ${counts.PRESENT} + (${counts.HALF_DAY} × 0.5) + ${counts.WEEKEND} = ${paidDays}`);
  console.log(`  Basic Payable: ₹${perDay.toFixed(2)} × ${paidDays} = ₹${expectedSalary.toFixed(2)}`);

  const tds = expectedSalary * 0.1;
  const netSalary = expectedSalary - 200 - tds;
  console.log(`  After deductions (P.Tax ₹200 + TDS 10%): ₹${netSalary.toFixed(2)}`);

  await prisma.$disconnect();
}

verify();
