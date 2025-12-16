import { NextRequest } from 'next/server';

/**
 * Get the client's IP address from the request
 * Supports various proxy headers and deployment environments
 */
export function getClientIp(request: NextRequest): string {
  // Try various headers in order of preference
  const headers = [
    'x-real-ip',
    'x-forwarded-for',
    'cf-connecting-ip', // Cloudflare
    'true-client-ip',   // Cloudflare Enterprise
    'x-client-ip',
    'x-cluster-client-ip',
    'forwarded',
  ];

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ip = value.split(',')[0].trim();
      if (ip) {
        return ip;
      }
    }
  }

  // Fallback to connection IP (Next.js/Vercel)
  const ip = request.ip;
  if (ip) {
    return ip;
  }

  // Last resort
  return 'unknown';
}
