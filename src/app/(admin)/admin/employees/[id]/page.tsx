import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import EmployeeProfile from '@/components/employee/EmployeeProfile';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AdminEmployeeProfilePage({ params }: PageProps) {
  const session = await getSession();

  if (!session || session.role !== 'ADMIN') {
    redirect('/login');
  }

  const { id } = await params;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/employees"
          className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Employees
        </Link>
      </div>

      <EmployeeProfile employeeId={id} canEdit={true} />
    </div>
  );
}
