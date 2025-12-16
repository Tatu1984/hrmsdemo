import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import TeamDailyUpdatesCalendar from '@/components/admin/TeamDailyUpdatesCalendar';

export default async function ManagerDailyUpdatesPage() {
  const session = await getSession();

  if (!session || session.role !== 'MANAGER' || !session.employeeId) {
    redirect('/login');
  }

  // Fetch team members (subordinates) who are developers
  const teamMembers = await prisma.employee.findMany({
    where: {
      reportingHeadId: session.employeeId,
      OR: [
        { designation: { contains: 'Developer', mode: 'insensitive' } },
        { designation: { contains: 'Engineer', mode: 'insensitive' } },
        { designation: { contains: 'Programmer', mode: 'insensitive' } },
      ],
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
        <h1 className="text-3xl font-bold">Team Daily Updates</h1>
        <p className="text-gray-500 mt-1">View daily work progress from your team members</p>
      </div>

      <TeamDailyUpdatesCalendar employees={teamMembers} />
    </div>
  );
}
