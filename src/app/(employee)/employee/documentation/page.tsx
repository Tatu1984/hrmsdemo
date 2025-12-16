import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import DocumentationViewer from '@/components/documentation/DocumentationViewer';

export default async function EmployeeDocumentationPage() {
  const session = await getSession();

  if (!session || session.role !== 'EMPLOYEE') {
    redirect('/login');
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Documentation</h1>
        <p className="text-gray-500 mt-1">
          Browse and export Confluence documentation
        </p>
      </div>

      <DocumentationViewer />
    </div>
  );
}
