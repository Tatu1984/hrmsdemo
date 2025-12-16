import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import TeamAttendanceCalendar from '@/components/attendance/TeamAttendanceCalendar';

export default async function AdminAttendancePage() {
  const session = await getSession();

  if (!session || session.role !== 'ADMIN') {
    redirect('/login');
  }

  // Fetch all employees
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      employeeId: true,
      name: true,
      designation: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Team Attendance & Activity</h1>
        <p className="text-gray-500 mt-1">Monitor attendance, working hours, and idle time for all employees</p>
      </div>

      <TeamAttendanceCalendar employees={employees} />
    </div>
  );
}
