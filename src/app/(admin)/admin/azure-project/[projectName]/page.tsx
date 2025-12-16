import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import AzureProjectDetails from '@/components/integrations/AzureProjectDetails';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: {
    projectName: string;
  };
  searchParams: {
    connectionId?: string;
  };
}

export default async function AdminProjectDetailsPage({
  params,
  searchParams,
}: PageProps) {
  const session = await getSession();

  if (!session || session.role !== 'ADMIN') {
    redirect('/login');
  }

  const projectName = decodeURIComponent(params.projectName);
  const connectionId = searchParams.connectionId;

  if (!connectionId) {
    redirect('/admin/work-items');
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/work-items"
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
