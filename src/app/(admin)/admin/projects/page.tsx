import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { ProjectDialog } from '@/components/forms/project-dialog';
import Link from 'next/link';

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
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
      tasks: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-gray-600">Manage all projects and milestones</p>
        </div>
        <ProjectDialog />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => {
          return (
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
                    <span className="text-gray-500">Manager:</span>
                    <span className="font-medium">Not assigned</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Start Date:</span>
                    <span className="font-medium">{formatDate(project.startDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Team Members:</span>
                    <span className="font-medium">{project.members.length}</span>
                  </div>
                </div>
                <Link href={`/admin/projects/${project.id}`}>
                  <Button variant="outline" className="w-full mt-4">View Details</Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
