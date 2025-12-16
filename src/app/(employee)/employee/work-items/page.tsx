import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import WorkItemsDisplay from '@/components/integrations/WorkItemsDisplay';

export default async function EmployeeWorkItemsPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Work Items</h1>
        <p className="text-gray-500 mt-1">
          View your tasks from Azure DevOps, Asana, and Confluence in one place
        </p>
      </div>

      <WorkItemsDisplay employeeId={session.employeeId || undefined} showFilters={true} />
    </div>
  );
}
