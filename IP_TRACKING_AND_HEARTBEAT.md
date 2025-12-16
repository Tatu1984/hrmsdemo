# IP Address Tracking & Enhanced Heartbeat System

## Overview

This document describes the IP address tracking and enhanced heartbeat persistence system implemented in the HRMS.

## Features Implemented

### 1. IP Address Tracking

**Database Schema:**
- Added `punchInIp` field to Attendance model - captures IP when employee punches in
- Added `punchOutIp` field to Attendance model - captures IP when employee punches out

**IP Detection:**
- Created `/src/lib/ip.ts` utility that extracts client IP from:
  - `x-real-ip` header
  - `x-forwarded-for` header (takes first IP from comma-separated list)
  - `cf-connecting-ip` (Cloudflare)
  - `true-client-ip` (Cloudflare Enterprise)
  - `x-client-ip`
  - `x-cluster-client-ip`
  - `forwarded` header
  - Request IP property (Vercel/Next.js)
  - Fallback: "unknown"

**Where IP is Captured:**
- Punch In: IP captured in `/src/app/api/attendance/route.ts` when action='punch-in'
- Punch Out: IP captured when action='punch-out'
- Stored in database alongside attendance records

**UI Display:**
- IP address shown in employee dashboard attendance controls
- Appears as small text below buttons: "IP: 192.168.1.1"
- Visible when employee is punched in

### 2. Cookie-Based Heartbeat Persistence

**Problem Solved:**
Browser tabs close, computers sleep, or users navigate away - but we need heartbeat tracking to continue until punch-out.

**Solution:**
Multi-layer approach using both cookies and server-side cron:

**Layer 1: Client-Side Cookies**
- Set `hrms_punched_in=true` cookie on punch-in (24h expiry)
- Set `hrms_attendance_id=<id>` cookie to track current session
- Cookies persist across:
  - Browser restarts
  - Tab closes
  - Computer sleep/wake
  - Page navigation

**Layer 2: Server-Side Auto-Heartbeat (Already Exists)**
- Vercel cron job runs every 3 minutes: `/api/attendance/auto-heartbeat`
- Checks all employees with `punchIn` set but no `punchOut`
- Creates "inactive" heartbeat entries for gaps > 3.5 minutes
- Configured in `/vercel.json`

**How It Works Together:**

1. **Employee punches in:**
   - Sets `hrms_punched_in=true` in localStorage
   - Sets `hrms_punched_in=true` cookie (24h)
   - Sets `hrms_attendance_id=<id>` cookie
   - Client-side heartbeat starts (every 3 mins)

2. **Employee closes browser tab:**
   - Client heartbeat stops
   - Cookies remain in browser
   - Server cron picks up after 3.5 minutes
   - Creates inactive heartbeats every 3 mins

3. **Employee reopens browser:**
   - Cookies still present
   - Client reads cookies
   - Resumes client-side heartbeats
   - Server cron automatically backs off (client is active)

4. **Employee punches out:**
   - Clears both localStorage and cookies
   - Server cron stops creating heartbeats (no punchOut record)

## Files Modified

### Database
- `prisma/schema.prisma` - Added punchInIp, punchOutIp fields

### Backend
- `src/lib/ip.ts` - NEW: IP extraction utility
- `src/app/api/attendance/route.ts` - Captures IP on punch-in/out

### Frontend
- `src/components/employee/AttendanceControls.tsx` - Cookie management, IP display

### Configuration
- `vercel.json` - Cron job already configured (unchanged)

## Testing

### Test IP Tracking:
1. Punch in as employee
2. Check database: `SELECT punchInIp FROM "Attendance" WHERE date = CURRENT_DATE`
3. Should see your IP address

### Test Cookie Persistence:
1. Punch in
2. Open DevTools → Application → Cookies
3. Verify `hrms_punched_in=true` and `hrms_attendance_id=<id>`
4. Close browser completely
5. Reopen browser
6. Check cookies - they should still be there
7. Server cron will maintain heartbeats

### Test Auto-Heartbeat:
1. Punch in
2. Close all browser tabs
3. Wait 10 minutes
4. Check `ActivityLog` table - should have heartbeats created by server
5. Open browser, punch out

## Security Considerations

**IP Address Privacy:**
- IPs stored for audit purposes only
- Can be used to detect:
  - Unusual login locations
  - VPN usage
  - Proxy usage
  - Potential account sharing

**Cookie Security:**
- `SameSite=Lax` prevents CSRF attacks
- `path=/` ensures cookies available across all routes
- 24h expiry automatically cleans up old sessions
- Cookies only track punch status, not authentication

**MAC Address:**
Note: Browser JavaScript cannot access MAC addresses due to security restrictions. This is by design in all modern browsers. MAC addresses can only be captured server-side using device fingerprinting libraries (not recommended due to privacy concerns).

## Monitoring

**Check if system is working:**

1. **Active Heartbeats:**
```sql
SELECT e.name, a.punchIn, a.punchInIp, COUNT(al.*) as heartbeats
FROM "Attendance" a
JOIN "Employee" e ON a.employeeId = e.id
LEFT JOIN "ActivityLog" al ON al.attendanceId = a.id
WHERE a.date = CURRENT_DATE AND a.punchOut IS NULL
GROUP BY e.name, a.punchIn, a.punchInIp;
```

2. **IP Addresses Today:**
```sql
SELECT name, punchInIp, punchOutIp, punchIn, punchOut
FROM "Attendance" a
JOIN "Employee" e ON a.employeeId = e.id
WHERE a.date = CURRENT_DATE;
```

3. **Server Heartbeat Activity:**
```sql
SELECT e.name, al.timestamp, al.active
FROM "ActivityLog" al
JOIN "Attendance" a ON al.attendanceId = a.id
JOIN "Employee" e ON a.employeeId = e.id
WHERE a.date = CURRENT_DATE
ORDER BY al.timestamp DESC
LIMIT 20;
```

## Environment Variables

Required for auto-heartbeat cron:
```
CRON_SECRET=<your-secret-from-vercel-setup>
```

## Deployment

System is fully deployed and operational:
- Database schema updated (Prisma push completed)
- IP tracking active
- Cookie persistence active
- Auto-heartbeat cron already configured in Vercel
- All changes committed and pushed to production

## Future Enhancements

Potential improvements (not currently implemented):
- [ ] IP geolocation lookup for location tracking
- [ ] Alerts for IP changes during same session
- [ ] Device fingerprinting (browser, OS, screen resolution)
- [ ] Service Worker for true background heartbeats
- [ ] WebSocket connection for real-time tracking
- [ ] Mobile app with native background location tracking
