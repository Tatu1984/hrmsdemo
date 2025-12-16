import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import IntegrationsManager from '@/components/integrations/IntegrationsManager';

export default async function AdminIntegrationsPage() {
  const session = await getSession();

  if (!session || session.role !== 'ADMIN') {
    redirect('/login');
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-gray-500 mt-1">
          Connect Azure DevOps, Asana, and Confluence to sync work items and track team productivity
        </p>
      </div>

      <IntegrationsManager />
    </div>
  );
}
