import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default async function TasksPage() {
  const tasks = await prisma.task.findMany({
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          employeeId: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-gray-600">Manage and assign tasks to team members</p>
        </div>
        <Button className="bg-blue-600">
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Task</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Assigned To</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Due Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tasks.map((task) => {
                  return (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{task.title}</td>
                      <td className="px-4 py-3 text-sm">{task.project?.name || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm">{task.employee?.name || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant={
                          task.priority === 'URGENT' ? 'destructive' :
                          task.priority === 'HIGH' ? 'default' : 'secondary'
                        }>
                          {task.priority}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant={task.status === 'COMPLETED' ? 'default' : 'secondary'}>
                          {task.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">{task.dueDate ? formatDate(task.dueDate) : 'No deadline'}</td>
                      <td className="px-4 py-3 text-sm">
                        <Button variant="outline" size="sm">Edit</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}