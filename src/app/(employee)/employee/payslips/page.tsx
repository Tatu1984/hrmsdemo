import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { formatCurrency, getMonthName } from '@/lib/utils';

export default async function EmployeePayslipsPage() {
  const session = await getSession();
  const payroll = await prisma.payroll.findMany({
    where: {
      employeeId: session!.employeeId!,
    },
    orderBy: [
      { year: 'desc' },
      { month: 'desc' },
    ],
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payslips</h1>
        <p className="text-gray-600">View and download your salary slips</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {payroll.map((pay) => (
          <Card key={pay.id}>
            <CardHeader>
              <CardTitle>{getMonthName(pay.month)} {pay.year}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Basic Salary:</span>
                  <span className="font-semibold">{formatCurrency(pay.basicSalary)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Variable Pay:</span>
                  <span className="font-semibold text-green-600">+ {formatCurrency(pay.variablePay)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Gross Salary:</span>
                  <span className="font-semibold">{formatCurrency(pay.grossSalary)}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Professional Tax:</span>
                    <span className="text-red-600">- {formatCurrency(pay.professionalTax)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>TDS:</span>
                    <span className="text-red-600">- {formatCurrency(pay.tds)}</span>
                  </div>
                  {pay.penalties > 0 && (
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Penalties:</span>
                      <span className="text-red-600">- {formatCurrency(pay.penalties)}</span>
                    </div>
                  )}
                  {pay.advancePayment > 0 && (
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Advance:</span>
                      <span className="text-red-600">- {formatCurrency(pay.advancePayment)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-semibold mt-2">
                    <span>Total Deductions:</span>
                    <span className="text-red-600">- {formatCurrency(pay.totalDeductions)}</span>
                  </div>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Net Salary:</span>
                  <span className="text-blue-600">{formatCurrency(pay.netSalary)}</span>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Days: {pay.daysPresent} Present, {pay.daysAbsent} Absent
                </div>
              </div>
              <Button variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download Payslip
              </Button>
            </CardContent>
          </Card>
        ))}
        {payroll.length === 0 && (
          <Card className="col-span-2">
            <CardContent className="p-8 text-center">
              <p className="text-gray-600">No payslips available yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}