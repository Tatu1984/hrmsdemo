import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function EmployeeProjectsPage() {
  const session = await getSession();

  if (!session || !session.employeeId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">Unable to load projects. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Find projects where employee is either a member OR has tasks assigned
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        {
          members: {
            some: {
              employeeId: session.employeeId,
            },
          },
        },
        {
          tasks: {
            some: {
              assignedTo: session.employeeId,
            },
          },
        },
      ],
    },
    include: {
      members: {
        include: {
          employee: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      tasks: {
        where: {
          assignedTo: session.employeeId,
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
        <h1 className="text-3xl font-bold">My Projects</h1>
        <p className="text-gray-600">View your assigned projects and tasks</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map((project) => (
          <Card key={project.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{project.name}</CardTitle>
                <Badge variant={project.status === 'ACTIVE' ? 'default' : 'secondary'}>
                  {project.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">{project.description}</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Start Date:</span>
                  <span className="font-medium">{formatDate(project.startDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">My Tasks:</span>
                  <span className="font-medium">{project.tasks.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Team Members:</span>
                  <span className="font-medium">{project.members.length}</span>
                </div>
              </div>
              <Link
                href={`/employee/tasks?project=${project.id}`}
                className="inline-flex w-full mt-4 items-center justify-center rounded-md border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground px-4 py-2 text-sm font-medium transition-all"
              >
                View My Tasks
              </Link>
            </CardContent>
          </Card>
        ))}
        {projects.length === 0 && (
          <Card className="col-span-2">
            <CardContent className="p-8 text-center">
              <p className="text-gray-600">No projects assigned yet.</p>
              <p className="text-sm text-gray-500 mt-2">
                When you're assigned to a project, it will appear here.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
