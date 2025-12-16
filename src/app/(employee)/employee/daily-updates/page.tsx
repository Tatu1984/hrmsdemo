import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import DailyWorkUpdateCalendar from '@/components/employee/DailyWorkUpdateCalendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';

export default async function DailyUpdatesPage() {
  const session = await getSession();

  if (!session || !session.employeeId) {
    redirect('/login');
  }

  const employee = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: {
      id: true,
      name: true,
      designation: true,
      department: true,
    },
  });

  if (!employee) {
    redirect('/login');
  }

  // Check if employee is a developer (based on designation)
  const isDeveloper = employee.designation?.toLowerCase().includes('developer') ||
                      employee.designation?.toLowerCase().includes('engineer') ||
                      employee.designation?.toLowerCase().includes('programmer');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Daily Work Updates</h1>
          <p className="text-gray-500 mt-1">Track your daily progress and communicate with your team</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {employee.designation}
        </Badge>
      </div>

      {isDeveloper ? (
        <DailyWorkUpdateCalendar />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Feature Not Available
            </CardTitle>
            <CardDescription>
              Daily Work Updates are currently available only for employees in developer, engineer, or programmer roles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                Your current designation is <strong>{employee.designation}</strong>.
                This feature is designed for technical team members to log their daily development work,
                obstacles, and collaboration needs.
              </p>
              <p className="text-sm text-gray-600 mt-2">
                If you believe you should have access to this feature, please contact your manager or HR.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
