# Heartbeat Tracking System

## Overview

The heartbeat tracking system ensures attendance tracking continues even when employees close their browser tabs or minimize windows. This is achieved through a combination of **client-side persistence** and **server-side backfilling**.

## How It Works

### 1. Client-Side Tracking (Primary)

The `ActivityHeartbeat` component:
- Sends heartbeats every 3 minutes when employee is punched in
- Uses **localStorage** to persist punch-in status across tabs
- Detects when tab becomes visible again and catches up on missed heartbeats
- Tracks user activity (keyboard, mouse, scroll) to determine active/inactive status

**Key localStorage flags:**
- `hrms_punched_in`: `"true"` when punched in, `"false"` when punched out
- `hrms_last_activity`: Timestamp of last user interaction
- `hrms_last_heartbeat`: Timestamp of last successful heartbeat

### 2. Server-Side Backfilling (Backup)

The auto-heartbeat service fills in gaps when:
- Browser tab is completely closed
- Computer is sleeping
- Network is down
- User is on a different device

**Endpoint:** `/api/attendance/auto-heartbeat`

## Setup Instructions

### Option 1: Vercel Cron (Recommended for Vercel deployments)

1. Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/attendance/auto-heartbeat",
      "schedule": "*/3 * * * *"
    }
  ]
}
```

2. Set environment variable in Vercel:
```
CRON_SECRET=your-random-secret-key-here
```

3. The cron job runs every 3 minutes automatically

### Option 2: External Cron Service (e.g., cron-job.org)

1. Go to [cron-job.org](https://cron-job.org) or similar service
2. Create a new cron job:
   - **URL:** `https://your-domain.com/api/attendance/auto-heartbeat`
   - **Method:** POST
   - **Schedule:** Every 3 minutes (`*/3 * * * *`)
   - **Headers:**
     ```
     Authorization: Bearer your-random-secret-key-here
     Content-Type: application/json
     ```

3. Set the same secret in your environment:
```
CRON_SECRET=your-random-secret-key-here
```

### Option 3: Manual Testing

Test the auto-heartbeat system manually:

```bash
curl -X POST https://your-domain.com/api/attendance/auto-heartbeat \
  -H "Authorization: Bearer your-secret-key" \
  -H "Content-Type: application/json"
```

## How It Handles Different Scenarios

### Scenario 1: Browser Tab Closed
1. Employee punches in → `hrms_punched_in` set to `true`
2. Employee closes browser tab
3. Client heartbeat stops
4. After 3.5 minutes, server auto-heartbeat kicks in
5. Server creates "inactive" heartbeat entries every 3 minutes
6. Employee opens tab again → client takes over, sends fresh heartbeat
7. Employee punches out → `hrms_punched_in` set to `false`, server stops

### Scenario 2: Tab Minimized/Hidden
1. Browser reduces timer frequency (browser optimization)
2. When tab becomes visible, checks `hrms_last_heartbeat`
3. If > 3 minutes passed, immediately sends catch-up heartbeat
4. Resumes normal 3-minute intervals

### Scenario 3: Multiple Tabs Open
1. All tabs listen to `storage` events
2. When one tab punches out, all tabs detect via localStorage change
3. All tabs stop their heartbeat intervals

### Scenario 4: Computer Sleep
1. Computer wakes up, timers may have drifted
2. Visibility API detects tab is visible again
3. Checks time since last heartbeat
4. Sends catch-up heartbeat if needed
5. Server auto-heartbeat fills any large gaps

## Activity vs Inactive Heartbeats

- **Active heartbeat:** User had keyboard/mouse activity within last 5 minutes
- **Inactive heartbeat:** No user activity (likely AFK or tab closed)
- Server auto-heartbeats are always marked as "inactive"

## Idle Time Calculation

The system calculates idle time based on gaps in heartbeats:
- Gaps > 5 minutes are considered idle time
- Idle time is subtracted from total working hours
- Automatically updated on each heartbeat

## Testing the System

### Test 1: Normal Flow
1. Punch in as employee
2. Wait 3 minutes
3. Check browser console for heartbeat logs
4. Verify heartbeat in database (ActivityLog table)

### Test 2: Tab Close Recovery
1. Punch in
2. Close browser tab
3. Wait 10 minutes
4. Run auto-heartbeat cron manually
5. Check database - should have inactive heartbeats filled in
6. Open browser again, punch out

### Test 3: Multiple Tabs
1. Open HRMS in 2 tabs
2. Punch in from Tab 1
3. Both tabs should start heartbeats
4. Punch out from Tab 2
5. Both tabs should stop heartbeats

## Monitoring

Check auto-heartbeat service health:

```bash
curl https://your-domain.com/api/attendance/auto-heartbeat
```

Response:
```json
{
  "message": "Auto-Heartbeat Service",
  "instructions": "Use POST with Authorization header to trigger auto-heartbeat"
}
```

Execute auto-heartbeat:
```bash
curl -X POST https://your-domain.com/api/attendance/auto-heartbeat \
  -H "Authorization: Bearer your-secret" \
  -H "Content-Type: application/json"
```

Response shows all processed employees and actions taken.

## Security Considerations

1. **Authorization Required:** Auto-heartbeat endpoint requires `Authorization` header
2. **Secret Key:** Use strong random secret (minimum 32 characters)
3. **HTTPS Only:** Always use HTTPS in production
4. **Rate Limiting:** Consider rate limiting the endpoint

## Troubleshooting

### Heartbeats Not Sending
- Check browser console for errors
- Verify `hrms_punched_in` in localStorage
- Check if employee is actually punched in
- Verify attendance record exists for today

### Auto-Heartbeat Not Working
- Check cron job is running (Vercel logs or external service)
- Verify `CRON_SECRET` environment variable is set
- Check authorization header matches secret
- Review server logs for errors

### Gaps in Activity Logs
- This is normal if employee closed tab and auto-heartbeat wasn't set up yet
- Set up the cron job to prevent future gaps
- Gaps will be filled retroactively once cron runs

## Performance Impact

- **Client-side:** Minimal - one fetch request every 3 minutes
- **Server-side:** Lightweight - simple database queries
- **Database:** Indexed queries, efficient even with thousands of records
- **Network:** ~1KB payload per heartbeat

## Future Enhancements

Potential improvements (not currently implemented):
- [ ] Service Worker for true background execution
- [ ] WebSocket connection for real-time heartbeat
- [ ] Mobile app with native background tasks
- [ ] Desktop app with system tray (Electron)
