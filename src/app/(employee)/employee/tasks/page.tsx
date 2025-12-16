import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

export default async function EmployeeTasksPage() {
  const session = await getSession();

  const tasks = await prisma.task.findMany({
    where: {
      assignedTo: session!.employeeId!,
    },
    include: {
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

  const taskStats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'PENDING').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Tasks</h1>
        <p className="text-gray-600">Track and manage your assigned tasks</p>
      </div>

      {/* Task Stats */}
      <div className="grid grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-gray-500 mb-2">Total Tasks</p>
            <p className="text-3xl font-bold">{taskStats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-gray-500 mb-2">Pending</p>
            <p className="text-3xl font-bold text-gray-600">{taskStats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-gray-500 mb-2">In Progress</p>
            <p className="text-3xl font-bold text-blue-600">{taskStats.inProgress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-gray-500 mb-2">Completed</p>
            <p className="text-3xl font-bold text-green-600">{taskStats.completed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle>All Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tasks.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No tasks assigned yet.</p>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{task.title}</h3>
                        <Badge
                          variant={
                            task.status === 'COMPLETED' ? 'default' :
                            task.status === 'IN_PROGRESS' ? 'secondary' :
                            'outline'
                          }
                        >
                          {task.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {task.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Project: <span className="font-medium">{task.project.name}</span></span>
                        {task.dueDate && (
                          <span>Due: <span className="font-medium">{formatDate(task.dueDate.toString())}</span></span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
