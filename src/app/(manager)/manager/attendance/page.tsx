import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import TeamAttendanceCalendar from '@/components/attendance/TeamAttendanceCalendar';

export default async function ManagerAttendancePage() {
  const session = await getSession();

  if (!session || session.role !== 'MANAGER' || !session.employeeId) {
    redirect('/login');
  }

  // Fetch team members (subordinates)
  const teamMembers = await prisma.employee.findMany({
    where: {
      reportingHeadId: session.employeeId,
    },
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
        <p className="text-gray-500 mt-1">Monitor attendance, working hours, and idle time for your team members</p>
      </div>

      <TeamAttendanceCalendar employees={teamMembers} />
    </div>
  );
}
