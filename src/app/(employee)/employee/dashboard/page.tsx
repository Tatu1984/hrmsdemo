import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckSquare, MessageSquare, Activity } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { AttendanceControls } from '@/components/employee/AttendanceControls';
import { format } from 'date-fns';

export default async function EmployeeDashboard() {
  const session = await getSession();

  const employee = await prisma.employee.findUnique({
    where: { id: session!.employeeId! },
    include: {
      reportingHead: {
        select: {
          id: true,
          name: true,
          designation: true,
        },
      },
    },
  });

  // Find the CEO (top of hierarchy - no reporting head and designation is CEO)
  const ceo = await prisma.employee.findFirst({
    where: {
      designation: { contains: 'CEO', mode: 'insensitive' },
      reportingHeadId: null,
    },
    select: {
      id: true,
      name: true,
      designation: true,
    },
  });

  const tasks = await prisma.task.findMany({
    where: { assignedTo: session!.employeeId! },
  });

  const leaves = await prisma.leave.findMany({
    where: { employeeId: session!.employeeId! },
  });

  const messages = await prisma.message.findMany({
    where: {
      recipientId: session!.employeeId!,
      read: false,
    },
  });

  // Get today's attendance record
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const activeAttendance = await prisma.attendance.findFirst({
    where: {
      employeeId: session!.employeeId!,
      date: {
        gte: today,
        lt: tomorrow,
      },
    },
  });

  // Calculate attendance percentage (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentAttendance = await prisma.attendance.findMany({
    where: {
      employeeId: session!.employeeId!,
      date: { gte: thirtyDaysAgo },
    },
  });

  const presentDays = recentAttendance.filter(a =>
    a.status === 'PRESENT' ||
    a.status === 'WEEKEND' ||
    a.status === 'HOLIDAY' ||
    a.status === 'LEAVE'
  ).length;
  const attendancePercentage = recentAttendance.length > 0
    ? ((presentDays / recentAttendance.length) * 100).toFixed(1)
    : '0.0';

  const activeTasks = tasks.filter(t => t.status !== 'COMPLETED').length;
  const approvedLeaves = leaves.filter(l => l.status === 'APPROVED').length;
  const leavesLeft = 24 - approvedLeaves; // Assuming 24 total leaves

  return (
    <div className="p-6 space-y-6">
      {/* Top Action Bar */}
      <Card className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">Today&apos;s Status</h3>
              <p className="text-sm text-blue-100">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right mr-6">
                <p className="text-sm text-blue-100">Current Salary</p>
                <p className="text-2xl font-bold">{formatCurrency(employee?.salary || 0)}</p>
              </div>
              <AttendanceControls attendance={activeAttendance} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Attendance %</p>
                <p className="text-2xl font-bold">{attendancePercentage}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Leaves Left</p>
                <p className="text-2xl font-bold">{leavesLeft} days</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-orange-100 p-3 rounded-lg">
                <CheckSquare className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Tasks</p>
                <p className="text-2xl font-bold">{activeTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <MessageSquare className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">New Messages</p>
                <p className="text-2xl font-bold">{messages.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Company Hierarchy */}
      <Card>
        <CardHeader>
          <CardTitle>Company Hierarchy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              {/* CEO */}
              {ceo && (
                <>
                  <div className="inline-block">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-2xl font-bold mb-2">
                      {ceo.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <p className="font-semibold">{ceo.name}</p>
                    <p className="text-xs text-gray-500">{ceo.designation}</p>
                  </div>
                  <div className="h-8 w-px bg-gray-300 mx-auto"></div>
                </>
              )}
              {/* Reporting Head (Manager) - only show if different from CEO */}
              {employee?.reportingHead && employee.reportingHead.id !== ceo?.id && (
                <>
                  <div className="inline-block">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xl font-bold mb-2">
                      {employee.reportingHead.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <p className="font-semibold">
                      {employee.reportingHead.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {employee.reportingHead.designation}
                    </p>
                    <Badge className="mt-1">Your Manager</Badge>
                  </div>
                  <div className="h-8 w-px bg-gray-300 mx-auto"></div>
                </>
              )}
              {/* Show "Your Manager" badge for CEO if reporting directly to CEO */}
              {employee?.reportingHead && employee.reportingHead.id === ceo?.id && (
                <>
                  <Badge className="-mt-2 mb-2">Your Manager</Badge>
                </>
              )}
              {/* Current Employee */}
              <div className="inline-block">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold mb-2">
                  YOU
                </div>
                <p className="font-semibold">{employee?.name}</p>
                <p className="text-xs text-gray-500">{employee?.designation}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* HR Policies */}
      <Card>
        <CardHeader>
          <CardTitle>HR Policies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <h4 className="font-semibold mb-1">Work From Home Policy</h4>
              <p className="text-sm text-gray-600">Employees can work from home up to 2 days per week with prior approval.</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
              <h4 className="font-semibold mb-1">Leave Policy</h4>
              <p className="text-sm text-gray-600">24 days earned leave, 12 days casual leave, 12 days sick leave annually.</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
              <h4 className="font-semibold mb-1">Code of Conduct</h4>
              <p className="text-sm text-gray-600">Maintain professional behavior and adhere to company values at all times.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
