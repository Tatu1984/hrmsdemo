import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import Sidebar from '@/components/shared/sidebar';
import Navbar from '@/components/shared/navbar';
import { PopupMessenger } from '@/components/messenger/PopupMessenger';
import { ActivityHeartbeat } from '@/components/employee/ActivityHeartbeat';

const sidebarItems = [
  { icon: 'LayoutDashboard', label: 'Dashboard', href: '/employee/dashboard' },
  { icon: 'Clock', label: 'Attendance', href: '/employee/attendance' },
  { icon: 'Calendar', label: 'Leaves', href: '/employee/leaves' },
  { icon: 'FolderKanban', label: 'Projects', href: '/employee/projects', children: [
    { icon: 'CheckSquare', label: 'Tasks', href: '/employee/tasks' },
    { icon: 'FileText', label: 'Daily Updates', href: '/employee/daily-updates' },
    { icon: 'Layers', label: 'Work Items', href: '/employee/work-items' },
  ]},
  { icon: 'BookOpen', label: 'Documentation', href: '/employee/documentation' },
  { icon: 'MessageSquare', label: 'Messages', href: '/employee/messages' },
  { icon: 'Receipt', label: 'Payslips', href: '/employee/payslips' },
];

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  
  if (!session || session.role !== 'EMPLOYEE') {
    redirect('/login');
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <ActivityHeartbeat />
      <Sidebar items={sidebarItems} baseUrl="/employee" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar userName={session.name} userRole="Employee" />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
      <PopupMessenger currentUserId={session.userId} currentUserName={session.name} />
    </div>
  );
}