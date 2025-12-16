import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { LeaveActionButtons } from '@/components/admin/LeaveActionButtons';
import { EditLeaveDialog } from '@/components/admin/EditLeaveDialog';

export default async function LeaveManagementPage() {
  const leaves = await prisma.leave.findMany({
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          employeeId: true,
          designation: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leave Management</h1>
        <p className="text-gray-600">Review and manage employee leave requests</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Leave Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Dates</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Days</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Admin Comment</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {leaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <div className="font-medium">{leave.employee.name}</div>
                          <div className="text-xs text-gray-500">{leave.employee.employeeId}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant="outline">{leave.leaveType}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="text-xs">
                          <div>{formatDate(leave.startDate.toString())}</div>
                          <div className="text-gray-500">to {formatDate(leave.endDate.toString())}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">{leave.days}</td>
                      <td className="px-4 py-3 text-sm max-w-xs">
                        <div className="truncate" title={leave.reason}>{leave.reason}</div>
                      </td>
                      <td className="px-4 py-3 text-sm max-w-xs">
                        {leave.adminComment ? (
                          <div className="text-xs italic text-gray-600 truncate" title={leave.adminComment}>
                            {leave.adminComment}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge
                          variant={
                            leave.status === 'APPROVED' ? 'default' :
                            leave.status === 'REJECTED' ? 'destructive' :
                            leave.status === 'HOLD' ? 'secondary' :
                            'outline'
                          }
                        >
                          {leave.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-2">
                          <EditLeaveDialog leave={leave} />
                          <LeaveActionButtons leaveId={leave.id} currentStatus={leave.status} />
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}