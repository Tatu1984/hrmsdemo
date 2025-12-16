import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { TaskDialog } from '@/components/forms/task-dialog';
import { Folder, FolderOpen, ChevronRight, ChevronDown, Plus } from 'lucide-react';
import { ProjectTasksAccordion } from '@/components/tasks/ProjectTasksAccordion';

export default async function TasksPage() {
  // Get all projects with their tasks and milestones
  const projects = await prisma.project.findMany({
    include: {
      tasks: {
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              employeeId: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-gray-600">Organize tasks by projects and milestones</p>
        </div>
      </div>

      <div className="space-y-4">
        {projects.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              No projects found. Create a project first to add tasks.
            </CardContent>
          </Card>
        ) : (
          projects.map((project) => (
            <ProjectTasksAccordion
              key={project.id}
              project={project}
              employees={employees}
            />
          ))
        )}
      </div>
    </div>
  );
}