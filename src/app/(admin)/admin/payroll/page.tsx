import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PayrollDialog } from '@/components/forms/payroll-dialog';
import { PayrollTable } from '@/components/payroll/PayrollTable';

export default async function PayrollPage() {
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      employeeId: true,
      name: true,
      salary: true,
      department: true,
    },
  });

  const payrolls = await prisma.payroll.findMany({
    include: {
      employee: {
        select: {
          employeeId: true,
          name: true,
          department: true,
        },
      },
    },
    orderBy: [
      { year: 'desc' },
      { month: 'desc' },
    ],
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payroll</h1>
          <p className="text-gray-600">Manage employee salaries and payroll</p>
        </div>
        <PayrollDialog employees={employees} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payroll History</CardTitle>
        </CardHeader>
        <CardContent>
          <PayrollTable payrolls={payrolls} />
        </CardContent>
      </Card>
    </div>
  );
}