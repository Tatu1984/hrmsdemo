import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import AzureProjectDetails from '@/components/integrations/AzureProjectDetails';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{
    projectName: string;
  }>;
  searchParams: Promise<{
    connectionId?: string;
  }>;
}

export default async function EmployeeProjectDetailsPage({
  params,
  searchParams,
}: PageProps) {
  const session = await getSession();

  if (!session || session.role !== 'EMPLOYEE') {
    redirect('/login');
  }

  const { projectName: encodedProjectName } = await params;
  const { connectionId } = await searchParams;
  const projectName = decodeURIComponent(encodedProjectName);

  if (!connectionId) {
    redirect('/employee/work-items');
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/employee/work-items"
          className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Work Items
        </Link>
      </div>

      <AzureProjectDetails connectionId={connectionId} projectName={projectName} />
    </div>
  );
}
