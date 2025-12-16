import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await getSession();

  if (session) {
    switch (session.role) {
      case 'ADMIN':
        redirect('/admin/dashboard');
      case 'MANAGER':
        redirect('/manager/dashboard');
      case 'EMPLOYEE':
        redirect('/employee/dashboard');
      default:
        redirect('/login');
    }
  }

  redirect('/login');
}
