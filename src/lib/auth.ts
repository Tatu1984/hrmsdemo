import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import * as bcrypt from 'bcryptjs';
import { cache } from 'react';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  employeeId?: string;
  name: string;
  permissions?: any;
}

export async function encrypt(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // 7 days instead of 24h to prevent auto-logout
    .sign(secret);
}

export async function decrypt(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);

    // Validate payload structure
    if (
      typeof payload.userId === 'string' &&
      typeof payload.email === 'string' &&
      (payload.role === 'ADMIN' || payload.role === 'MANAGER' || payload.role === 'EMPLOYEE') &&
      typeof payload.name === 'string'
    ) {
      return {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        employeeId: typeof payload.employeeId === 'string' ? payload.employeeId : undefined,
        name: payload.name,
        permissions: payload.permissions || null,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export const getSession = cache(async (): Promise<JWTPayload | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return null;
  return decrypt(token);
});

export async function setSession(payload: JWTPayload): Promise<void> {
  const token = await encrypt(payload);
  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // Important for cross-site navigation
    maxAge: 60 * 60 * 24 * 7, // 7 days to match JWT expiration
    path: '/',
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Verify auth from request (for API routes)
export async function verifyAuth(request: Request): Promise<JWTPayload | null> {
  // Try to get token from cookie
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const token = cookies['session'];
    if (token) {
      return decrypt(token);
    }
  }

  // Try Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return decrypt(token);
  }

  return null;
}

// Check if user is admin
export function isAdmin(role: string): boolean {
  return role === 'ADMIN';
}

// Check if user is manager or above
export function isManagerOrAbove(role: string): boolean {
  return role === 'ADMIN' || role === 'MANAGER';
}