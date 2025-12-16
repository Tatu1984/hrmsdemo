# Attendance Management System

## Overview
The HRMS includes a comprehensive attendance management system with calendar-based editing, automatic marking, and holiday integration.

## Key Features

### 1. Calendar-Based Attendance Editing
**Location:** `/admin/attendance/edit`

- Select any employee and view their monthly attendance in a calendar view
- Navigate between months using arrow buttons
- Color-coded day cells:
  - 🟢 **Green (PRESENT)** - Employee worked and punched in/out
  - 🟡 **Yellow (HALF_DAY)** - Employee worked less than required hours
  - 🔴 **Red (ABSENT)** - Employee did not punch in on a weekday
  - 🔵 **Blue (LEAVE)** - Employee on approved leave
  - 🟣 **Purple (HOLIDAY)** - Company holiday (auto-marked as present)
  - ⚪ **Gray (Weekend)** - Saturday/Sunday (auto-marked as present)
- Click any day to edit or create attendance record
- All changes are logged in the audit trail

### 2. Holiday Management
**Location:** `/admin/attendance/holidays`

- Admin-only interface to manage company holidays
- Add/delete holidays with name, date, and description
- Mark holidays as mandatory or optional
- Year-based filtering
- Holidays automatically appear in attendance calendar

### 3. Automatic Attendance Marking

#### Daily Automated Process (Vercel Cron)
A scheduled job runs **daily at 11:59 PM** to automatically mark attendance:

**Weekends (Saturday/Sunday):**
- ✅ Automatically marked as **PRESENT** (Weekly Off)
- No punch-in/out required

**Company Holidays:**
- ✅ Automatically marked as **HOLIDAY**
- No punch-in/out required

**Weekdays (Monday-Friday):**
- ❌ Employees with no punch-in are marked as **ABSENT**
- ✅ Employees who punched in are marked based on hours worked

#### Cron Configuration
The system uses Vercel Cron Jobs configured in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-attendance",
      "schedule": "59 23 * * *"
    }
  ]
}
```

**Schedule:** `59 23 * * *` means 11:59 PM every day

**Endpoint:** `/api/cron/daily-attendance`

**Authentication:** Uses `CRON_SECRET` environment variable for security

### 4. Punch-In/Out Logic

#### Date Assignment Rule
**IMPORTANT:** Attendance is always recorded on the **punch-in date**, not the punch-out date.

**Example:**
- Employee punches in: **Nov 1, 2024 at 9:00 PM**
- Employee works overnight and punches out: **Nov 2, 2024 at 1:00 AM**
- ✅ Attendance is recorded for: **November 1st**
- ❌ Attendance is NOT recorded for: November 2nd

This ensures that overnight shifts are correctly attributed to the day they started.

#### Status Calculation
When an employee punches out, the system calculates:
1. **Total Hours** = Punch Out Time - Punch In Time - Break Duration
2. **Idle Time** = Time with no activity (tracked via activity logs)
3. **Work Hours** = Total Hours - Idle Time

**Status Rules:**
- **Full-time employees:**
  - ≥ 6 hours = **PRESENT**
  - < 6 hours = **HALF_DAY**
- **Interns/Part-time:**
  - ≥ 3 hours = **PRESENT**
  - < 3 hours = **HALF_DAY**

### 5. Change Log & Audit Trail
**Location:** `/admin/reports/change-log`

All attendance modifications are logged with:
- Who made the change (user name and role)
- What was changed (before/after values)
- When it was changed (timestamp)
- Where it came from (IP address, user agent)

Filter by:
- Entity type (Attendance, Employee, Payroll, etc.)
- User
- Date range

## API Endpoints

### Attendance APIs

#### `GET /api/attendance`
Fetch attendance records with filters
- Query params: `employeeId`, `date`, `startDate`, `endDate`
- Returns array of attendance records

#### `POST /api/attendance`
Two modes:
1. **Punch In/Out** (Employees):
   ```json
   {
     "action": "punch-in" | "punch-out" | "break-start" | "break-end",
     "employeeId": "emp123"
   }
   ```

2. **Manual Create** (Admin/Manager):
   ```json
   {
     "employeeId": "emp123",
     "date": "2024-11-17",
     "status": "PRESENT",
     "punchIn": "2024-11-17T09:00:00Z",
     "punchOut": "2024-11-17T18:00:00Z",
     "totalHours": 9,
     "breakDuration": 1
   }
   ```

#### `PUT /api/attendance`
Edit existing attendance (Admin/Manager only)
```json
{
  "attendanceId": "att123",
  "status": "PRESENT",
  "date": "2024-11-17",
  "punchIn": "2024-11-17T09:00:00Z",
  "punchOut": "2024-11-17T18:00:00Z",
  "totalHours": 9,
  "breakDuration": 1
}
```

### Holiday APIs

#### `GET /api/holidays?year=2024`
Fetch holidays for a specific year

#### `POST /api/holidays` (Admin only)
Create new holiday
```json
{
  "name": "Republic Day",
  "date": "2024-01-26",
  "isOptional": false,
  "description": "National Holiday"
}
```

#### `DELETE /api/holidays?id={id}` (Admin only)
Delete a holiday

### Cron APIs

#### `GET /api/cron/daily-attendance`
Automated daily attendance marking (Vercel Cron)
- Requires: `Authorization: Bearer {CRON_SECRET}` header

#### `POST /api/cron/daily-attendance`
Manual trigger for specific date
```json
{
  "date": "2024-11-17",
  "secret": "your-cron-secret"
}
```

### Audit Log APIs

#### `GET /api/audit-log`
Fetch change logs
- Query params: `entityType`, `userId`, `limit`, `offset`

## Environment Variables

Required variables in `.env`:

```bash
# Database
DATABASE_URL="postgresql://..."

# Authentication
JWT_SECRET="your-jwt-secret"

# Cron Jobs
CRON_SECRET="your-cron-secret"
```

**Important:** In production, ensure you:
1. Set a strong `CRON_SECRET` in Vercel environment variables
2. Keep the secret confidential (don't commit to git)

## Database Models

### Attendance
```prisma
model Attendance {
  id            String    @id @default(cuid())
  employeeId    String
  date          DateTime  // Date of punch-in (locks attendance to this date)
  punchIn       DateTime?
  punchOut      DateTime?
  status        String    // PRESENT, HALF_DAY, ABSENT, LEAVE, HOLIDAY
  totalHours    Float?
  breakDuration Float?
  idleTime      Float?
  // ... relations
}
```

### Holiday
```prisma
model Holiday {
  id          String   @id @default(cuid())
  name        String   // Holiday name
  date        DateTime // Date of holiday
  year        Int      // Year for filtering
  isOptional  Boolean  @default(false)
  description String?
}
```

### AuditLog
```prisma
model AuditLog {
  id          String   @id @default(cuid())
  userId      String   // Who made the change
  userName    String
  userRole    String
  action      String   // CREATE, UPDATE, DELETE
  entityType  String   // Attendance, Employee, etc.
  entityId    String
  entityName  String?
  changes     Json?    // Before/after values
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())
}
```

## User Permissions

### Admin
- ✅ View all employees' attendance
- ✅ Edit any attendance record (past/present)
- ✅ Create manual attendance entries
- ✅ Manage holidays
- ✅ View change logs

### Manager
- ✅ View team attendance
- ✅ Edit team attendance records
- ✅ Create manual attendance for team members
- ❌ Cannot manage holidays
- ✅ View change logs

### Employee
- ✅ View own attendance
- ✅ Punch in/out for self
- ❌ Cannot edit past attendance
- ❌ Cannot edit others' attendance
- ❌ Cannot view change logs

## Best Practices

1. **Holiday Setup:**
   - Add holidays at the beginning of each year
   - Include all national and company holidays
   - Mark optional holidays clearly

2. **Manual Attendance Entry:**
   - Use calendar edit view for historical corrections
   - Always add a reason in the change log
   - Verify weekend/holiday markings

3. **Cron Job Monitoring:**
   - Check Vercel cron logs regularly
   - Ensure CRON_SECRET is set in production
   - Monitor for failed runs

4. **Audit Trail:**
   - Review change logs weekly
   - Investigate suspicious changes
   - Use filters to track specific employees

## Troubleshooting

### Cron Job Not Running
1. Check Vercel deployment logs
2. Verify `CRON_SECRET` is set in environment variables
3. Check cron schedule in `vercel.json`
4. Test manually with POST endpoint

### Attendance Not Auto-Marking
1. Verify holidays are properly configured
2. Check if date is correctly set (timezone issues)
3. Review cron job execution logs
4. Test with manual trigger

### Calendar Not Showing Holidays
1. Ensure holiday year matches current month
2. Check holiday date format
3. Verify API is returning holidays
4. Clear browser cache

## Future Enhancements

- [ ] Shift-based attendance (morning/evening shifts)
- [ ] Geolocation-based punch in/out
- [ ] Facial recognition attendance
- [ ] Mobile app for punch in/out
- [ ] Overtime calculation
- [ ] Attendance analytics dashboard
