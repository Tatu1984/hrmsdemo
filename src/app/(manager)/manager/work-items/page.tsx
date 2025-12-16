import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import ProjectWorkItemsView from '@/components/integrations/ProjectWorkItemsView';

export default async function ManagerWorkItemsPage() {
  const session = await getSession();

  if (!session || session.role !== 'MANAGER') {
    redirect('/login');
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Team Work Items</h1>
        <p className="text-gray-500 mt-1">
          Monitor your team's tasks and productivity across Azure DevOps, Asana, and Confluence organized by project
        </p>
      </div>

      <ProjectWorkItemsView />
    </div>
  );
}
