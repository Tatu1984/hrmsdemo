import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import ProjectWorkItemsView from '@/components/integrations/ProjectWorkItemsView';

export default async function AdminWorkItemsPage() {
  const session = await getSession();

  if (!session || session.role !== 'ADMIN') {
    redirect('/login');
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">All Work Items</h1>
        <p className="text-gray-500 mt-1">
          View all work items from Azure DevOps, Asana, and Confluence organized by project
        </p>
      </div>

      <ProjectWorkItemsView />
    </div>
  );
}
