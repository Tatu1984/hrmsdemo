import Link from 'next/link';
import { getSession } from '@/lib/auth';

export default async function NotFound() {
  const session = await getSession();

  // Determine home link based on user role
  let homeLink = '/login';
  if (session) {
    switch (session.role) {
      case 'ADMIN':
        homeLink = '/admin/dashboard';
        break;
      case 'MANAGER':
        homeLink = '/manager/dashboard';
        break;
      case 'EMPLOYEE':
        homeLink = '/employee/dashboard';
        break;
      default:
        homeLink = '/login';
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900">404</h1>
        <p className="text-xl text-gray-600 mt-4">Page not found</p>
        <p className="text-gray-500 mt-2">The page you are looking for does not exist.</p>
        <Link
          href={homeLink}
          className="mt-6 inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
