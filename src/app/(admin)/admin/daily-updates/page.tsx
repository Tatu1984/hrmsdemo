import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import TeamDailyUpdatesCalendar from '@/components/admin/TeamDailyUpdatesCalendar';

export default async function AdminDailyUpdatesPage() {
  const session = await getSession();

  if (!session || session.role !== 'ADMIN') {
    redirect('/login');
  }

  // Fetch all developers
  const developers = await prisma.employee.findMany({
    where: {
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
        <h1 className="text-3xl font-bold">Daily Work Updates</h1>
        <p className="text-gray-500 mt-1">View daily work progress from all developers</p>
      </div>

      <TeamDailyUpdatesCalendar employees={developers} />
    </div>
  );
}
