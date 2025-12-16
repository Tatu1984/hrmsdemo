import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from './lib/auth';

const publicPaths = ['/login'];
const adminPaths = ['/admin'];
const managerPaths = ['/manager'];
const employeePaths = ['/employee'];

// Map URL paths to permission keys
const pathToPermissionMap: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/employees': 'employees',
  '/attendance': 'attendance',
  '/leaves': 'leaves',
  '/projects': 'projects',
  '/tasks': 'tasks',
  '/payroll': 'payroll',
  '/accounts': 'accounts',
  '/invoices': 'invoices',
  '/reports': 'reports',
  '/leads': 'leads',
  '/sales': 'sales',
  '/messages': 'messages',
  '/settings': 'settings',
};

function checkSectionPermission(pathname: string, permissions: any): boolean {
  // Admin role has access to everything
  if (!permissions) {
    return true; // If no permissions set, allow access (backward compatibility)
  }

  // Find the section from the pathname
  for (const [path, permissionKey] of Object.entries(pathToPermissionMap)) {
    if (pathname.includes(path)) {
      return permissions[permissionKey] === true;
    }
  }

  // Allow dashboard by default
  return true;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const token = request.cookies.get('session')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const session = await decrypt(token);
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Check role-based access
  if (adminPaths.some(path => pathname.startsWith(path)) && session.role !== 'ADMIN') {
    return NextResponse.redirect(new URL(`/${session.role.toLowerCase()}/dashboard`, request.url));
  }

  if (managerPaths.some(path => pathname.startsWith(path)) && session.role !== 'MANAGER') {
    return NextResponse.redirect(new URL(`/${session.role.toLowerCase()}/dashboard`, request.url));
  }

  if (employeePaths.some(path => pathname.startsWith(path)) && session.role !== 'EMPLOYEE') {
    return NextResponse.redirect(new URL(`/${session.role.toLowerCase()}/dashboard`, request.url));
  }

  // Check section-level permissions (except for admins who have full access)
  if (session.role !== 'ADMIN' && session.permissions) {
    const hasPermission = checkSectionPermission(pathname, session.permissions);
    if (!hasPermission) {
      // Redirect to dashboard if no permission
      return NextResponse.redirect(new URL(`/${session.role.toLowerCase()}/dashboard`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};