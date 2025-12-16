import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { LeaveApplicationForm } from '@/components/employee/LeaveApplicationForm';

export default async function EmployeeLeavesPage() {
  const session = await getSession();

  const leaves = await prisma.leave.findMany({
    where: {
      employeeId: session!.employeeId!,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Calculate leave balance
  const currentYear = new Date().getFullYear();
  const approvedLeaves = leaves.filter(
    l => l.status === 'APPROVED' && new Date(l.startDate).getFullYear() === currentYear
  );
  const totalLeavesUsed = approvedLeaves.reduce((sum, l) => sum + l.days, 0);
  const totalLeaves = 24;
  const leavesRemaining = totalLeaves - totalLeavesUsed;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Leaves</h1>
          <p className="text-gray-600">Apply for and manage your leave requests</p>
        </div>
        <LeaveApplicationForm />
      </div>

      {/* Leave Balance */}
      <div className="grid grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">Total Leaves</p>
              <p className="text-3xl font-bold">{totalLeaves}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">Leaves Used</p>
              <p className="text-3xl font-bold text-orange-600">{totalLeavesUsed}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">Leaves Remaining</p>
              <p className="text-3xl font-bold text-green-600">{leavesRemaining}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leave History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Leave Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Start Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">End Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Days</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No leave requests yet. Apply for your first leave above!
                    </td>
                  </tr>
                ) : (
                  leaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <Badge variant="outline">{leave.leaveType}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">{formatDate(leave.startDate.toString())}</td>
                      <td className="px-4 py-3 text-sm">{formatDate(leave.endDate.toString())}</td>
                      <td className="px-4 py-3 text-sm">{leave.days}</td>
                      <td className="px-4 py-3 text-sm max-w-xs truncate">{leave.reason}</td>
                      <td className="px-4 py-3 text-sm">
                        <Badge
                          variant={
                            leave.status === 'APPROVED' ? 'default' :
                            leave.status === 'REJECTED' ? 'destructive' :
                            leave.status === 'PENDING' ? 'secondary' :
                            'outline'
                          }
                        >
                          {leave.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}