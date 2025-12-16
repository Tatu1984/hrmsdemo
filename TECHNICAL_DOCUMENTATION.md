# HRMS - Technical Documentation

**Version:** 1.0.0
**Last Updated:** December 6, 2025
**Project:** Infiniti Tech Partners HRMS

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Core Algorithms](#core-algorithms)
5. [Database Schema](#database-schema)
6. [API Documentation](#api-documentation)
7. [Authentication & Authorization](#authentication--authorization)
8. [Setup & Deployment](#setup--deployment)
9. [Environment Variables](#environment-variables)
10. [Cron Jobs & Background Services](#cron-jobs--background-services)

---

## System Overview

The HRMS (Human Resource Management System) is a comprehensive enterprise application designed for Infiniti Tech Partners to manage:

- **Employee Management**: Complete employee lifecycle management
- **Attendance Tracking**: Advanced attendance with idle detection and suspicious activity monitoring
- **Leave Management**: Leave requests, approvals, and tracking
- **Project Management**: Project allocation, task management with milestones
- **Payroll Processing**: Automated salary calculations with variable pay support
- **Sales CRM**: Lead management, sales tracking, and commission calculation
- **Accounting**: Income/expense tracking, invoice management
- **Messaging System**: Internal communication with permission controls
- **Integrations**: Azure DevOps, Asana, and Confluence integration
- **Document Management**: HR policies, company hierarchy, employee documents

### Key Features

- ✅ **Role-Based Access Control** (Admin, Manager, Employee)
- ✅ **Real-time Activity Monitoring** with bot/automation detection
- ✅ **Automated Payroll** with attendance-based calculations
- ✅ **Sales Commission Tracking** for sales department
- ✅ **Multi-project Management** with milestone tracking
- ✅ **Comprehensive Audit Logging**
- ✅ **Advanced Reporting** (APR, DSR, Performance, Sales, Accounts)

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Client Layer                           │
│                 (Next.js 16 Frontend)                        │
│         - React 19 Components                                │
│         - Client-side Activity Tracking                      │
│         - Real-time UI Updates                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│                  (Next.js API Routes)                        │
│         - RESTful API Endpoints                              │
│         - Business Logic                                     │
│         - Authentication & Authorization                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Data Access Layer                          │
│                   (Prisma ORM)                               │
│         - Type-safe database queries                         │
│         - Schema migrations                                  │
│         - Relationship management                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                            │
│                   (PostgreSQL)                               │
│         - Relational data storage                            │
│         - ACID compliance                                    │
│         - Full-text search                                   │
└─────────────────────────────────────────────────────────────┘
```

### Project Structure

```
hrms1/
├── prisma/
│   ├── schema.prisma           # Database schema definition
│   └── migrations/             # Database migration files
├── src/
│   ├── app/
│   │   ├── (auth)/            # Authentication pages
│   │   ├── (admin)/           # Admin-only pages
│   │   ├── (manager)/         # Manager pages
│   │   ├── (employee)/        # Employee pages
│   │   └── api/               # API routes
│   │       ├── auth/          # Authentication endpoints
│   │       ├── attendance/    # Attendance management
│   │       ├── payroll/       # Payroll processing
│   │       ├── leaves/        # Leave management
│   │       ├── projects/      # Project management
│   │       ├── tasks/         # Task management
│   │       ├── sales/         # Sales & CRM
│   │       ├── leads/         # Lead management
│   │       ├── invoices/      # Invoice management
│   │       ├── accounts/      # Accounting
│   │       ├── messages/      # Messaging system
│   │       ├── integrations/  # External integrations
│   │       └── admin/         # Admin operations
│   ├── components/            # Reusable UI components
│   │   ├── attendance/        # Attendance components
│   │   ├── payroll/           # Payroll components
│   │   ├── ui/                # Base UI components
│   │   └── ...
│   └── lib/
│       ├── auth.ts            # Authentication utilities
│       ├── db.ts              # Database connection
│       ├── ip.ts              # IP detection
│       └── utils.ts           # Utility functions
├── scripts/
│   └── seed.ts                # Database seeding script
└── public/                    # Static assets
```

---

## Technology Stack

### Frontend

- **Next.js 16.0.3**: React framework with App Router
- **React 19.1.0**: UI library
- **TypeScript 5**: Type-safe JavaScript
- **Tailwind CSS 4**: Utility-first CSS framework
- **Radix UI**: Headless UI components
- **Lucide React**: Icon library
- **Recharts**: Charting library
- **date-fns**: Date manipulation
- **XLSX**: Excel export functionality

### Backend

- **Next.js API Routes**: Server-side API
- **Prisma 6.17.1**: ORM and database toolkit
- **PostgreSQL**: Primary database (production)
- **SQLite**: Development database (file-based)
- **bcryptjs**: Password hashing
- **jose**: JWT token handling
- **Zod**: Schema validation

### DevOps & Tools

- **ESLint**: Code linting
- **tsx**: TypeScript execution
- **Vercel**: Deployment platform (recommended)

---

## Core Algorithms

### 1. Attendance Tracking Algorithm

#### 1.1 Punch In/Out System

**File**: `/src/app/api/attendance/route.ts`

**Algorithm**:
```
FUNCTION punchIn(employeeId, timestamp, ipAddress):
    today = getCurrentDate()

    // Check if attendance record exists
    attendance = findAttendance(employeeId, today)

    IF attendance EXISTS AND attendance.punchIn != NULL:
        RETURN error("Already punched in")

    IF attendance NOT EXISTS:
        attendance = createAttendance(employeeId, today)

    attendance.punchIn = timestamp
    attendance.punchInIp = ipAddress
    attendance.status = PRESENT

    RETURN success
```

**Punch Out Algorithm**:
```
FUNCTION punchOut(employeeId, timestamp, ipAddress):
    attendance = findTodayAttendance(employeeId)

    IF attendance.punchIn == NULL:
        RETURN error("Not punched in")

    IF attendance.punchOut != NULL:
        RETURN error("Already punched out")

    // Calculate total hours
    punchInTime = attendance.punchIn.getTime()
    punchOutTime = timestamp.getTime()

    breakDuration = calculateBreakDuration(attendance)
    totalMilliseconds = punchOutTime - punchInTime
    totalHours = (totalMilliseconds / (1000 * 60 * 60))

    // Calculate idle time
    idleTime = calculateIdleTime(
        attendance.id,
        punchInTime,
        punchOutTime
    )

    attendance.punchOut = timestamp
    attendance.punchOutIp = ipAddress
    attendance.totalHours = totalHours - breakDuration
    attendance.idleTime = idleTime

    RETURN success
```

#### 1.2 Activity Tracking & Heartbeat System

**File**: `/src/components/attendance/ActivityTracker.tsx`

**Purpose**: Monitor real user activity to distinguish active work from idle time

**Activity Detection**:
```
EVENTS_MONITORED = [
    'mousemove',    // Mouse movement
    'mousedown',    // Mouse clicks
    'keydown',      // Keyboard input
    'scroll',       // Page scrolling
    'touchstart',   // Touch events
    'click'         // Click events
]

HEARTBEAT_INTERVAL = 30 seconds
IDLE_THRESHOLD = 5 minutes
```

**Algorithm**:
```
FUNCTION trackActivity():
    lastActivityTime = now()
    hasRecentActivity = false

    // Set up event listeners
    FOR EACH event IN EVENTS_MONITORED:
        addEventListener(event, onActivity)

    // Send heartbeat every 30 seconds
    EVERY 30 SECONDS:
        IF hasRecentActivity AND NOT suspicious:
            sendHeartbeat(timestamp, active=true)
            hasRecentActivity = false
        END IF

    // Check for idle state every minute
    EVERY 60 SECONDS:
        timeSinceActivity = now() - lastActivityTime

        IF timeSinceActivity > IDLE_THRESHOLD:
            hasRecentActivity = false
            resetPatternDetection()
        END IF
```

**Activity Heartbeat API**:

**File**: `/src/app/api/attendance/activity/route.ts`

```
FUNCTION logActivity(attendanceId, timestamp, active, suspicious):
    activityLog = CREATE ActivityLog:
        attendanceId = attendanceId
        timestamp = timestamp
        active = active              // true if genuine activity
        suspicious = suspicious      // true if bot pattern detected
        patternType = patternType    // Type of suspicious pattern
        patternDetails = details     // Pattern description

    SAVE activityLog
    RETURN success
```

#### 1.3 Idle Time Calculation Algorithm

**File**: `/src/app/api/attendance/route.ts` (lines 13-37)

**Purpose**: Calculate total idle time based on inactive heartbeats

**Algorithm**:
```
FUNCTION calculateIdleTime(attendanceId, punchInTime, punchOutTime):
    // Strategy: Count inactive heartbeats only
    // Server heartbeats (browser closed) are NOT counted as idle
    // Only client-reported inactive heartbeats count

    inactiveHeartbeats = QUERY ActivityLog WHERE:
        attendanceId = attendanceId
        active = false           // Only inactive heartbeats

    HEARTBEAT_INTERVAL_MS = 3 * 60 * 1000  // 3 minutes

    totalIdleMs = inactiveHeartbeats.length * HEARTBEAT_INTERVAL_MS

    idleHours = totalIdleMs / (1000 * 60 * 60)

    RETURN idleHours
```

**Important Notes**:
- Each inactive heartbeat represents 3 minutes of inactivity
- Active heartbeats are NOT counted in idle time
- Browser closed/minimized creates inactive heartbeats via auto-heartbeat service

### 2. Suspicious Activity Detection Algorithm

**File**: `/src/components/attendance/ActivityTracker.tsx` (lines 51-162)

**Purpose**: Detect automated tools (mouse jigglers, auto-typers, macros)

#### 2.1 Keystroke Pattern Detection

**Algorithm**:
```
FUNCTION detectSuspiciousKeystrokePattern(keystrokeHistory):
    IF keystrokeHistory.length < 10:
        RETURN null

    recent = last 10 keystrokes

    // PATTERN 1: Same key pressed repeatedly
    uniqueKeys = SET of unique keys in recent

    IF uniqueKeys.size == 1:
        RETURN {
            type: 'REPETITIVE_KEY',
            details: "Same key pressed consecutively"
        }
    END IF

    // PATTERN 2: Keys pressed at exact intervals
    intervals = []
    FOR i FROM 1 TO recent.length:
        interval = recent[i].timestamp - recent[i-1].timestamp
        intervals.push(interval)

    avgInterval = average(intervals)
    tolerance = 100  // 100ms tolerance

    similarIntervals = 0
    FOR EACH interval IN intervals:
        IF abs(interval - avgInterval) < tolerance:
            similarIntervals++

    // If 8 out of 9 intervals are almost identical
    IF similarIntervals >= 8:
        RETURN {
            type: 'REGULAR_INTERVAL_KEYSTROKES',
            details: "Auto-typer detected"
        }
    END IF

    // PATTERN 3: Alternating between exactly 2 keys
    IF uniqueKeys.size == 2:
        isAlternating = checkIfPerfectlyAlternating(recent)

        IF isAlternating:
            RETURN {
                type: 'ALTERNATING_KEYS',
                details: "Macro detected"
            }
        END IF

    RETURN null
```

#### 2.2 Mouse Pattern Detection

**Algorithm**:
```
FUNCTION detectSuspiciousMousePattern(mouseHistory):
    IF mouseHistory.length < 10:
        RETURN null

    recent = last 10 mouse positions

    // PATTERN 1: Mouse moving in straight lines
    movements = calculateMovements(recent)
    directions = calculateDirections(movements)

    avgDirection = average(directions)
    tolerance = 0.1  // ~5 degree tolerance

    similarDirections = 0
    FOR EACH direction IN directions:
        IF abs(direction - avgDirection) < tolerance:
            similarDirections++

    IF similarDirections >= 8:
        RETURN {
            type: 'LINEAR_MOUSE_MOVEMENT',
            details: "Mouse jiggler detected"
        }
    END IF

    // PATTERN 2: Mouse not moving (stuck at same position)
    uniquePositions = SET of unique (x, y) positions

    IF uniquePositions.size == 1:
        RETURN {
            type: 'STATIC_MOUSE',
            details: "Fake mouse movement app detected"
        }
    END IF

    RETURN null
```

#### 2.3 Suspicious Activity Handling

**Algorithm**:
```
FUNCTION handleActivity(event):
    pattern = detectPattern(event)

    IF pattern DETECTED:
        suspiciousActivityCount++
        lastPatternDetected = pattern

        // If more than 3 suspicious patterns detected
        IF suspiciousActivityCount > 3:
            // Don't count as activity
            RETURN
        END IF
    ELSE:
        // Reset suspicious count on genuine activity
        suspiciousActivityCount = max(0, suspiciousActivityCount - 1)
    END IF

    lastActivity = now()
    hasRecentActivity = true
```

**Heartbeat with Suspicious Flag**:
```
FUNCTION sendHeartbeat():
    isSuspicious = suspiciousActivityCount > 3

    POST /api/attendance/activity:
        timestamp = now()
        active = NOT isSuspicious
        suspicious = isSuspicious
        patternType = lastPattern.type
        patternDetails = lastPattern.details
```

### 3. Auto-Heartbeat Background Service

**File**: `/src/app/api/attendance/auto-heartbeat/route.ts`

**Purpose**: Fill in heartbeats for employees who are punched in but browser is inactive

**⚠️ CRITICAL FIX**: Changed to mark as INACTIVE (not active)

**Algorithm**:
```
FUNCTION autoHeartbeat():
    // Run every 3 minutes via cron job

    today = getCurrentDate()

    // Find all employees currently punched in
    activeAttendances = QUERY Attendance WHERE:
        date = today
        punchIn != null
        punchOut = null

    FOR EACH attendance IN activeAttendances:
        lastActivity = getLastActivityLog(attendance.id)
        lastHeartbeatTime = lastActivity?.timestamp OR attendance.punchIn

        minutesSinceLastHeartbeat = (now() - lastHeartbeatTime) / 60000

        // If more than 3.5 minutes since last heartbeat
        IF minutesSinceLastHeartbeat >= 3.5:
            CREATE ActivityLog:
                attendanceId = attendance.id
                timestamp = now()
                active = FALSE  // ⚠️ CRITICAL: Mark as inactive!
                                // No client activity = likely idle/AFK

            LOG "Created inactive heartbeat for " + employee.name
        END IF
```

**Why Mark as Inactive?**
- If client hasn't sent heartbeat in 3.5+ minutes, it means:
  - Browser is closed/minimized, OR
  - User is idle/AFK (no mouse/keyboard activity)
- Both scenarios should count as IDLE time
- Marking as `active: false` ensures proper idle time calculation

### 4. Payroll Calculation Algorithm

**File**: `/src/app/api/payroll/route.ts` (lines 71-395)

**Purpose**: Calculate salary based on attendance, sales targets, and deductions

#### 4.1 Working Days Calculation

**Algorithm**:
```
FUNCTION calculateWorkingDays(employee, month, year):
    monthStartDate = firstDayOfMonth(month, year)
    monthEndDate = lastDayOfMonth(month, year)

    today = getCurrentDate()
    calculationDate = min(today, monthEndDate)

    // Get employee join and leave dates
    joinDate = employee.dateOfJoining
    leaveDate = employee.leaveDate  // If employee left

    // Determine effective attendance window
    effectiveStart = max(joinDate, monthStartDate)
    effectiveEnd = min(calculationDate, leaveDate OR calculationDate)

    IF effectiveEnd < effectiveStart:
        RETURN 0  // Employee not active in this period

    // Count present days
    fullPresentDays = 0
    halfDays = 0

    currentDate = effectiveStart
    WHILE currentDate <= effectiveEnd:
        dayOfWeek = currentDate.getDayOfWeek()
        isWeekend = (dayOfWeek == SUNDAY OR dayOfWeek == SATURDAY)

        attendance = findAttendance(employee.id, currentDate)

        IF attendance EXISTS:
            IF attendance.status IN [PRESENT, LEAVE, WEEKEND, HOLIDAY]:
                fullPresentDays++
            ELSE IF attendance.status == HALF_DAY:
                halfDays++
            // ABSENT counts as 0
        ELSE:
            // No attendance record
            IF isWeekend:
                fullPresentDays++  // Weekends are paid
            // Weekdays without record count as 0 (absent)
        END IF

        currentDate++

    presentDays = fullPresentDays + (0.5 * halfDays)

    RETURN presentDays
```

#### 4.2 Salary Calculation

**For FIXED Salary Type**:
```
FUNCTION calculateFixedSalary(employee, presentDays):
    workingDays = 30  // Standard working days
    basicSalary = employee.salary

    // Calculate based on attendance
    basicPayable = (basicSalary / workingDays) * presentDays
    variablePayable = 0

    grossSalary = basicPayable

    RETURN {
        basicPayable,
        variablePayable,
        grossSalary
    }
```

**For VARIABLE Salary Type (Sales)**:
```
FUNCTION calculateVariableSalary(employee, presentDays, month, year):
    workingDays = 30
    basicSalary = employee.salary        // Base salary
    variablePay = employee.variablePay   // Target variable amount

    // Calculate basic payable
    basicPayable = (basicSalary / workingDays) * presentDays

    // Get sales target and achievement
    salesTarget = employee.salesTarget
    targetAchieved = getTotalSales(employee.id, month, year)

    // Calculate variable payable based on achievement percentage
    IF salesTarget > 0:
        achievementPercentage = (targetAchieved / salesTarget) * 100

        IF achievementPercentage >= 100:
            variablePayable = variablePay  // Full variable
        ELSE IF achievementPercentage >= 50:
            // Proportional variable (50%-99%)
            variablePayable = (variablePay * achievementPercentage) / 100
        ELSE:
            variablePayable = 0  // Less than 50%
        END IF
    ELSE:
        variablePayable = 0
    END IF

    grossSalary = basicPayable + variablePayable

    RETURN {
        basicPayable,
        variablePayable,
        grossSalary,
        salesTarget,
        targetAchieved
    }
```

#### 4.3 Deductions Calculation

**Algorithm**:
```
FUNCTION calculateDeductions(grossSalary):
    professionalTax = 200  // Fixed P.tax
    tds = 0                // Tax deducted at source
    penalties = 0          // Manually added penalties
    advancePayment = 0     // Advance taken by employee
    otherDeductions = 0    // Other deductions

    totalDeductions = professionalTax + tds + penalties +
                     advancePayment + otherDeductions

    RETURN totalDeductions
```

#### 4.4 Net Salary Calculation

**Algorithm**:
```
FUNCTION calculateNetSalary(grossSalary, deductions):
    netSalary = grossSalary - deductions
    RETURN netSalary
```

#### 4.5 Complete Payroll Algorithm

**Algorithm**:
```
FUNCTION generatePayroll(employeeId, month, year):
    employee = getEmployee(employeeId)

    // Calculate present days
    presentDays = calculateWorkingDays(employee, month, year)
    workingDays = 30
    absentDays = workingDays - presentDays

    // Calculate salary based on type
    IF employee.salaryType == FIXED:
        salary = calculateFixedSalary(employee, presentDays)
    ELSE:
        salary = calculateVariableSalary(employee, presentDays, month, year)
    END IF

    // Calculate deductions
    deductions = calculateDeductions(salary.grossSalary)

    // Calculate net salary
    netSalary = salary.grossSalary - deductions

    // Create payroll record
    payroll = CREATE Payroll:
        employeeId = employeeId
        month = month
        year = year
        workingDays = workingDays
        daysPresent = presentDays
        daysAbsent = absentDays
        basicSalary = employee.salary
        variablePay = employee.variablePay OR 0
        salesTarget = salary.salesTarget OR null
        targetAchieved = salary.targetAchieved OR 0
        basicPayable = salary.basicPayable
        variablePayable = salary.variablePayable
        grossSalary = salary.grossSalary
        professionalTax = 200
        tds = 0
        penalties = 0
        advancePayment = 0
        otherDeductions = 0
        totalDeductions = deductions
        netSalary = netSalary
        status = PENDING

    SAVE payroll
    RETURN payroll
```

### 5. Sales Commission Algorithm

**File**: `/src/app/api/sales/route.ts`

**Purpose**: Calculate commission for sales agents

**Commission Rules**:
```
FUNCTION calculateCommission(sale, employee):
    grossAmount = sale.grossAmount
    achievementPercentage = (sale.targetAchieved / sale.salesTarget) * 100

    // Commission tiers based on achievement
    IF achievementPercentage >= 100:
        commissionRate = 0.10  // 10% for 100%+ achievement
    ELSE IF achievementPercentage >= 75:
        commissionRate = 0.07  // 7% for 75%-99%
    ELSE IF achievementPercentage >= 50:
        commissionRate = 0.05  // 5% for 50%-74%
    ELSE:
        commissionRate = 0     // No commission below 50%
    END IF

    commission = grossAmount * commissionRate

    RETURN commission
```

### 6. Leave Balance Calculation

**File**: `/src/app/api/leaves/route.ts`

**Algorithm**:
```
FUNCTION calculateLeaveBalance(employeeId, year):
    // Annual leave entitlement
    CASUAL_LEAVES = 12
    SICK_LEAVES = 12
    EARNED_LEAVES = 12

    // Get approved leaves for the year
    approvedLeaves = QUERY Leave WHERE:
        employeeId = employeeId
        status = APPROVED
        YEAR(startDate) = year

    // Count leaves by type
    casualUsed = SUM days WHERE leaveType = CASUAL
    sickUsed = SUM days WHERE leaveType = SICK
    earnedUsed = SUM days WHERE leaveType = EARNED

    RETURN {
        casual: {
            total: CASUAL_LEAVES,
            used: casualUsed,
            remaining: CASUAL_LEAVES - casualUsed
        },
        sick: {
            total: SICK_LEAVES,
            used: sickUsed,
            remaining: SICK_LEAVES - sickUsed
        },
        earned: {
            total: EARNED_LEAVES,
            used: earnedUsed,
            remaining: EARNED_LEAVES - earnedUsed
        }
    }
```

### 7. Project Milestone Tracking

**Purpose**: Track milestone-based project payments

**Algorithm**:
```
FUNCTION trackMilestone(projectId, milestoneId, status):
    project = getProject(projectId)
    milestones = project.milestones  // JSON array

    milestone = findMilestone(milestones, milestoneId)

    IF NOT milestone:
        RETURN error("Milestone not found")

    // Update milestone status
    milestone.status = status
    milestone.completedDate = now()

    // Calculate payment
    IF status == COMPLETED:
        IF milestone.successCriteriaMet:
            payment = milestone.paymentAmount
            createInvoice(project, milestone, payment)
        END IF
    END IF

    // Update project
    project.milestones = milestones
    SAVE project

    RETURN milestone
```

---

## Database Schema

### Entity Relationship Diagram (Simplified)

```
User ─────────< Employee
                    │
                    ├───< Attendance ───< ActivityLog
                    ├───< Leave
                    ├───< Payroll
                    ├───< Message
                    ├───< Task
                    ├───< ProjectMember >──── Project ───< Task
                    ├───< BankingDetails
                    └───< EmployeeDocument

Lead ─────< Sale ─────< Project

Account ────< AccountCategory

CompanyProfile ───< CompanyBankAccount

IntegrationConnection ───< IntegrationUserMapping
                      ├───< WorkItem ───< DeveloperCommit
                      ├───< DeveloperCommit
                      ├───< PullRequest
                      └───< ConfluencePage
```

### Core Models

#### User
- Authentication and authorization
- Links to Employee record
- Granular permissions (JSON)
- Roles: ADMIN, MANAGER, EMPLOYEE

#### Employee
- Complete employee information
- KYC documents (Aadhar, PAN)
- Bank details
- Reporting structure (self-referencing)
- Salary type: FIXED or VARIABLE
- Sales target (for sales dept)
- Active/inactive status

#### Attendance
- Daily attendance records
- Punch in/out timestamps
- IP address tracking
- Break duration
- Total hours worked
- Idle time
- Status: PRESENT, ABSENT, HALF_DAY, LEAVE, HOLIDAY, WEEKEND
- Links to ActivityLog for detailed tracking

#### ActivityLog
- Heartbeat records every 30 seconds (client) or 3 minutes (server)
- Active/inactive flag
- Suspicious activity detection
- Pattern type and details
- Used for idle time calculation

#### Payroll
- Monthly salary records
- Working days and present days
- Basic and variable salary components
- Sales target tracking
- All deductions (P.tax, TDS, penalties, advance)
- Gross and net salary
- Status: PENDING, APPROVED, PAID

#### Leave
- Leave requests
- Type: SICK, CASUAL, EARNED, UNPAID
- Date range and days count
- Status: PENDING, APPROVED, REJECTED, CANCELLED, HOLD
- Admin comments

#### Project
- Project details with SoW document
- Type: MILESTONE or RETAINER
- Budget and upfront payment
- Milestones (JSON array)
- Success criteria
- Status: ACTIVE, COMPLETED, ON_HOLD, CANCELLED
- Links to Lead/Sale if converted

#### Task
- Project tasks with assignments
- Milestone linkage
- Status: PENDING, IN_PROGRESS, HOLD, COMPLETED
- Priority: LOW, MEDIUM, HIGH, URGENT
- Updates/comments

#### Sale
- Sales records
- Lead conversion tracking
- Gross amount, discount, tax
- Commission calculation
- Month/year for reporting
- Status: PENDING, CONFIRMED, DELIVERED, PAID, CANCELLED
- Links to Project if created

#### Lead
- CRM lead management
- Contact information
- Status: NEW, COLD_CALL_BACK, WARM, PROSPECT, SALE_MADE, HOLD, DORMANT, CONVERTED, LOST
- Callback date/time
- Assignment to sales agents

#### Integration Models
- IntegrationConnection: Azure DevOps, Asana, Confluence connections
- IntegrationUserMapping: Map HRMS employees to external users
- WorkItem: Synced tasks from external platforms
- DeveloperCommit: Code commits from Azure DevOps
- ConfluencePage: Documentation from Confluence

---

## API Documentation

### Authentication Endpoints

#### POST `/api/auth/login`
**Description**: Authenticate user and create session

**Request**:
```json
{
  "username": "string",
  "password": "string"
}
```

**Response**:
```json
{
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "role": "ADMIN | MANAGER | EMPLOYEE",
    "employeeId": "string"
  }
}
```

**Sets Cookie**: `session` (JWT token, httpOnly, secure)

#### POST `/api/auth/logout`
**Description**: Destroy session

**Response**:
```json
{
  "message": "Logged out successfully"
}
```

### Attendance Endpoints

#### GET `/api/attendance`
**Description**: Get attendance records

**Query Parameters**:
- `employeeId` (optional): Filter by employee
- `date` (optional): Specific date
- `startDate` (optional): Date range start
- `endDate` (optional): Date range end

**Response**:
```json
[
  {
    "id": "string",
    "employeeId": "string",
    "employee": { "name": "string", ... },
    "date": "2025-12-06T00:00:00.000Z",
    "punchIn": "2025-12-06T09:00:00.000Z",
    "punchOut": "2025-12-06T18:00:00.000Z",
    "totalHours": 8.5,
    "breakDuration": 0.5,
    "idleTime": 1.2,
    "status": "PRESENT"
  }
]
```

#### POST `/api/attendance`
**Description**: Punch in for the day

**Request**:
```json
{
  "action": "punchIn"
}
```

**Response**:
```json
{
  "message": "Punched in successfully",
  "attendance": { ... }
}
```

#### PATCH `/api/attendance`
**Description**: Punch out

**Request**:
```json
{
  "action": "punchOut"
}
```

**Response**:
```json
{
  "message": "Punched out successfully",
  "attendance": {
    "totalHours": 8.5,
    "idleTime": 1.2
  }
}
```

#### POST `/api/attendance/activity`
**Description**: Log activity heartbeat (called by client every 30s)

**Request**:
```json
{
  "timestamp": "2025-12-06T10:30:00.000Z",
  "active": true,
  "suspicious": false,
  "patternType": null,
  "patternDetails": null
}
```

**Response**:
```json
{
  "success": true,
  "message": "Activity logged successfully"
}
```

#### POST `/api/attendance/auto-heartbeat`
**Description**: Background service to fill missing heartbeats (cron job)

**Headers**:
- `Authorization: Bearer {CRON_SECRET}`

**Response**:
```json
{
  "success": true,
  "processed": 10,
  "heartbeatsCreated": 5,
  "results": [ ... ]
}
```

### Payroll Endpoints

#### GET `/api/payroll`
**Description**: Get payroll records

**Query Parameters**:
- `employeeId` (optional)
- `month` (required): 1-12
- `year` (required): YYYY

**Response**:
```json
[
  {
    "id": "string",
    "employeeId": "string",
    "month": 12,
    "year": 2025,
    "workingDays": 30,
    "daysPresent": 25,
    "daysAbsent": 5,
    "basicSalary": 50000,
    "variablePay": 10000,
    "basicPayable": 41666.67,
    "variablePayable": 8000,
    "grossSalary": 49666.67,
    "professionalTax": 200,
    "tds": 0,
    "totalDeductions": 200,
    "netSalary": 49466.67,
    "status": "APPROVED"
  }
]
```

#### POST `/api/payroll`
**Description**: Generate payroll for employees (Admin only)

**Request**:
```json
{
  "month": 12,
  "year": 2025,
  "employeeIds": ["emp1", "emp2"]  // Optional, all if not provided
}
```

**Response**:
```json
{
  "message": "Payroll generated successfully",
  "count": 10
}
```

#### PATCH `/api/payroll`
**Description**: Update payroll status or values

**Request**:
```json
{
  "id": "payroll-id",
  "status": "APPROVED",
  "tds": 1000,
  "penalties": 500
}
```

### Leave Endpoints

#### GET `/api/leaves`
**Description**: Get leave records

**Query Parameters**:
- `employeeId` (optional)
- `status` (optional): PENDING | APPROVED | REJECTED

**Response**:
```json
[
  {
    "id": "string",
    "employeeId": "string",
    "employee": { "name": "string" },
    "leaveType": "SICK",
    "startDate": "2025-12-10T00:00:00.000Z",
    "endDate": "2025-12-12T00:00:00.000Z",
    "days": 3,
    "reason": "Flu",
    "status": "PENDING",
    "adminComment": null
  }
]
```

#### POST `/api/leaves`
**Description**: Apply for leave

**Request**:
```json
{
  "leaveType": "SICK",
  "startDate": "2025-12-10",
  "endDate": "2025-12-12",
  "reason": "Medical emergency"
}
```

#### PATCH `/api/leaves`
**Description**: Update leave status (Admin/Manager)

**Request**:
```json
{
  "id": "leave-id",
  "status": "APPROVED",
  "adminComment": "Approved, get well soon"
}
```

### Project Endpoints

#### GET `/api/projects`
**Description**: Get projects

**Response**:
```json
[
  {
    "id": "string",
    "projectId": "PRJ-001",
    "name": "Client Website",
    "description": "...",
    "projectType": "MILESTONE",
    "totalBudget": 50000,
    "status": "ACTIVE",
    "members": [ ... ],
    "tasks": [ ... ]
  }
]
```

#### POST `/api/projects`
**Description**: Create project

**Request**:
```json
{
  "name": "Project Name",
  "description": "...",
  "projectType": "MILESTONE",
  "totalBudget": 50000,
  "startDate": "2025-12-01",
  "memberIds": ["emp1", "emp2"],
  "milestones": [ ... ]
}
```

### Sales & CRM Endpoints

#### GET `/api/leads`
**Description**: Get CRM leads

**Response**:
```json
[
  {
    "id": "string",
    "leadNumber": "LEAD-001",
    "companyName": "ABC Corp",
    "contactName": "John Doe",
    "email": "john@abc.com",
    "status": "WARM",
    "estimatedValue": 10000
  }
]
```

#### POST `/api/sales`
**Description**: Create sale record

**Request**:
```json
{
  "leadId": "lead-id",
  "product": "Web Development",
  "quantity": 1,
  "unitPrice": 10000,
  "upfrontAmount": 3000,
  "discount": 500,
  "taxPercentage": 18
}
```

### Integration Endpoints

#### GET `/api/integrations/connections`
**Description**: Get integration connections

#### POST `/api/integrations/connections`
**Description**: Create integration connection

#### POST `/api/integrations/sync`
**Description**: Sync data from external platform

### Admin Endpoints

#### GET `/api/admin/suspicious-activity`
**Description**: Get suspicious activity logs

**Query Parameters**:
- `startDate` (optional)
- `endDate` (optional)
- `employeeId` (optional)

**Response**:
```json
{
  "totalSuspicious": 15,
  "summary": [
    {
      "employee": { "name": "..." },
      "date": "2025-12-06",
      "count": 5,
      "patterns": [
        {
          "type": "REPETITIVE_KEY",
          "details": "Same key 'A' pressed 10 times",
          "timestamp": "..."
        }
      ]
    }
  ]
}
```

---

## Authentication & Authorization

### JWT-based Session Management

**File**: `/src/lib/auth.ts`

**Token Generation**:
```typescript
import { SignJWT } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

async function createSession(user) {
  const token = await new SignJWT({
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    employeeId: user.employeeId
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);

  // Set httpOnly cookie
  cookies().set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 // 24 hours
  });
}
```

**Session Verification**:
```typescript
import { jwtVerify } from 'jose';

async function getSession() {
  const token = cookies().get('session')?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}
```

### Role-Based Access Control

**Roles**:
- `ADMIN`: Full system access
- `MANAGER`: Team management, limited admin functions
- `EMPLOYEE`: Personal data and assigned tasks only

**Permission Checks**:
```typescript
// In API routes
const session = await getSession();

if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

if (session.role !== 'ADMIN') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

**Granular Permissions**:
- Stored in `User.permissions` (JSON field)
- Section-level access control
- Can restrict specific features per user

---

## Setup & Deployment

### Local Development Setup

1. **Clone Repository**:
```bash
git clone <repository-url>
cd hrms1
```

2. **Install Dependencies**:
```bash
npm install
```

3. **Setup Environment Variables**:
```bash
cp .env.example .env
```

Edit `.env`:
```env
JWT_SECRET="your-super-secret-jwt-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
DATABASE_URL="file:./dev.db"
CRON_SECRET="your-cron-secret"
```

4. **Setup Database**:
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database (optional)
npm run seed
```

5. **Run Development Server**:
```bash
npm run dev
```

Visit: `http://localhost:3000`

### Production Deployment (Vercel)

1. **Database Setup**:
   - Create PostgreSQL database (Vercel Postgres recommended)
   - Get connection string

2. **Environment Variables** (Vercel Dashboard):
```env
JWT_SECRET=<strong-random-secret>
NEXT_PUBLIC_APP_URL=https://your-domain.com
DATABASE_URL=postgresql://user:password@host:5432/database
POSTGRES_URL=<from-vercel-postgres>
POSTGRES_PRISMA_URL=<from-vercel-postgres>
POSTGRES_URL_NON_POOLING=<from-vercel-postgres>
CRON_SECRET=<random-secret-for-cron>
```

3. **Deploy**:
```bash
vercel deploy --prod
```

4. **Run Migrations**:
```bash
npx prisma migrate deploy
```

5. **Setup Cron Job**:
   - Use Vercel Cron or external service (e.g., cron-job.org)
   - Schedule: Every 3 minutes
   - URL: `https://your-domain.com/api/attendance/auto-heartbeat`
   - Headers: `Authorization: Bearer <CRON_SECRET>`

### Database Migrations

**Create Migration**:
```bash
npx prisma migrate dev --name migration_description
```

**Apply Migration (Production)**:
```bash
npx prisma migrate deploy
```

**Reset Database** (⚠️ Development Only):
```bash
npx prisma migrate reset
```

---

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `JWT_SECRET` | Secret key for JWT signing | ✅ Yes | - |
| `NEXT_PUBLIC_APP_URL` | Public application URL | ✅ Yes | - |
| `DATABASE_URL` | Database connection string | ✅ Yes | file:./dev.db |
| `POSTGRES_URL` | Vercel Postgres URL | No | - |
| `POSTGRES_PRISMA_URL` | Prisma connection URL | No | - |
| `POSTGRES_URL_NON_POOLING` | Non-pooling connection | No | - |
| `CRON_SECRET` | Secret for cron endpoints | ✅ Yes | - |
| `NODE_ENV` | Environment mode | No | development |

---

## Cron Jobs & Background Services

### Auto-Heartbeat Service

**Endpoint**: `POST /api/attendance/auto-heartbeat`

**Schedule**: Every 3 minutes

**Purpose**:
- Fill heartbeats for punched-in employees
- Mark as inactive when no client activity
- Track idle time accurately

**Authentication**:
```
Authorization: Bearer {CRON_SECRET}
```

**Setup with Vercel Cron**:

Create `vercel.json`:
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

**Setup with External Service** (cron-job.org):
1. Create account at cron-job.org
2. Add new cron job:
   - URL: `https://your-domain.com/api/attendance/auto-heartbeat`
   - Method: POST
   - Headers: `Authorization: Bearer your-cron-secret`
   - Schedule: */3 * * * * (every 3 minutes)

### Recommended Additional Cron Jobs

**Daily Attendance Reminder**:
- Check unpunched employees at 10:00 AM
- Send notifications

**Monthly Payroll Generation**:
- Auto-generate payroll on 1st of every month
- Schedule: `0 0 1 * *`

**Integration Sync**:
- Sync Azure DevOps/Asana data
- Schedule: `0 */6 * * *` (every 6 hours)

---

## Performance Considerations

### Database Indexing

All critical queries are indexed:
- Employee lookup by `employeeId`, `email`, `isActive`
- Attendance by `employeeId`, `date`, `status`
- ActivityLog by `attendanceId`, `timestamp`, `suspicious`
- Leave by `employeeId`, `status`, `startDate`
- Payroll by `employeeId`, `month`, `year`

### Query Optimization

- Use Prisma's `select` to fetch only required fields
- Batch operations where possible
- Connection pooling for production (Postgres)

### Caching Strategy

- Session data cached in JWT (no DB lookup)
- Static data (holidays, company profile) cached client-side

---

## Security Best Practices

### Implemented Security Measures

1. **Password Security**:
   - bcrypt hashing with salt rounds
   - No plaintext storage

2. **Session Management**:
   - HttpOnly cookies (prevent XSS)
   - Secure flag in production (HTTPS only)
   - 24-hour expiration

3. **SQL Injection Prevention**:
   - Prisma ORM (parameterized queries)
   - No raw SQL

4. **XSS Prevention**:
   - React's built-in escaping
   - No dangerouslySetInnerHTML (except trusted content)

5. **CSRF Protection**:
   - SameSite cookie attribute
   - API route validation

6. **IP Tracking**:
   - Record IP on punch in/out
   - Audit trail for suspicious access

7. **Audit Logging**:
   - All critical operations logged
   - Track who, what, when, from where

### Recommendations

- [ ] Implement rate limiting for login
- [ ] Add 2FA for admin accounts
- [ ] Regular security audits
- [ ] Keep dependencies updated
- [ ] Use environment-specific secrets

---

## Troubleshooting

### Common Issues

**Issue**: Idle time not calculating correctly
**Solution**: Ensure auto-heartbeat cron is running every 3 minutes

**Issue**: Database connection errors in production
**Solution**: Use `POSTGRES_PRISMA_URL` instead of `DATABASE_URL` for Vercel Postgres

**Issue**: Session expires too quickly
**Solution**: Increase `maxAge` in cookie settings (currently 24h)

**Issue**: Payroll calculation incorrect
**Solution**: Verify attendance records are properly marked (PRESENT, WEEKEND, HOLIDAY)

---

## Version History

### v1.0.0 (December 2025)
- Initial release
- Core HRMS features
- Attendance tracking with idle detection
- Payroll processing
- Sales CRM
- Project management
- Integrations (Azure DevOps, Asana, Confluence)

---

## Support & Maintenance

For technical support or questions, contact:
- **Email**: tech@infinititechpartners.com
- **Developer**: Sudipto (saddygrouppie@gmail.com)

---

**End of Technical Documentation**
