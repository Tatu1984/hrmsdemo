# HRMS System - Complete Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [Authentication & Authorization](#authentication--authorization)
6. [Core Modules](#core-modules)
7. [API Endpoints](#api-endpoints)
8. [System Flows](#system-flows)
9. [Deployment Guide](#deployment-guide)
10. [Development Guide](#development-guide)

---

## System Overview

**Project Name:** HRMS (Human Resource Management System)
**Organization:** Infiniti Tech Partners
**Version:** 1.0.0
**Platform:** Web Application (Next.js 15.5.6)

### Purpose
A comprehensive HRMS solution for managing employees, attendance, payroll, projects, sales, and company operations.

### Key Features
- ✅ Employee Management (CRUD operations, KYC documents, bank details)
- ✅ Real-time Attendance Tracking with Activity Heartbeat Monitoring
- ✅ Employee Status Dashboard (Active/Idle/Away/Offline)
- ✅ Automated Payroll Processing
- ✅ Project & Task Management
- ✅ Sales CRM (Leads, Sales tracking)
- ✅ Leave Management
- ✅ HR Documents & Policies
- ✅ Accounts & Invoicing
- ✅ Internal Messaging System
- ✅ Reports & Analytics
- ✅ Integrations (Azure DevOps, Asana, Confluence)

---

## Technology Stack

### Frontend
- **Framework:** Next.js 15.5.6 (App Router)
- **Language:** TypeScript
- **UI Library:** React 18
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui (Radix UI primitives)
- **Icons:** Lucide React
- **Date Handling:** date-fns

### Backend
- **Runtime:** Node.js
- **Framework:** Next.js API Routes (App Router)
- **Authentication:** JWT (jose library)
- **Password Hashing:** bcryptjs

### Database
- **Database:** PostgreSQL (Neon Cloud)
- **ORM:** Prisma 6.18.0
- **Connection:** Serverless (Neon)

### Deployment
- **Platform:** Vercel
- **Environment:** Production

---

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Admin UI   │  │ Employee UI  │  │  Manager UI  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                  │                   │
└─────────┼─────────────────┼──────────────────┼───────────────────┘
          │                 │                  │
          └─────────────────┴──────────────────┘
                            │
┌───────────────────────────┼───────────────────────────────────────┐
│                   APPLICATION LAYER (Next.js)                     │
│  ┌────────────────────────┴────────────────────────┐             │
│  │         Server Components (SSR)                 │             │
│  │  • Authentication Check                         │             │
│  │  • Data Fetching                                │             │
│  │  • Role-based Access Control                    │             │
│  └────────────────────────┬────────────────────────┘             │
│                           │                                       │
│  ┌────────────────────────┴────────────────────────┐             │
│  │         Client Components                       │             │
│  │  • Interactive UI                               │             │
│  │  • Activity Heartbeat Tracker                   │             │
│  │  • Real-time Status Updates                     │             │
│  └────────────────────────┬────────────────────────┘             │
│                           │                                       │
│  ┌────────────────────────┴────────────────────────┐             │
│  │         API Routes (REST)                       │             │
│  │  • /api/attendance                              │             │
│  │  • /api/attendance/heartbeat                    │             │
│  │  • /api/employee-status                         │             │
│  │  • /api/employees                               │             │
│  │  • /api/payroll                                 │             │
│  │  • /api/projects                                │             │
│  │  • /api/sales                                   │             │
│  │  • /api/auth                                    │             │
│  └────────────────────────┬────────────────────────┘             │
└───────────────────────────┼───────────────────────────────────────┘
                            │
┌───────────────────────────┼───────────────────────────────────────┐
│                   DATA LAYER (Prisma ORM)                         │
│  ┌────────────────────────┴────────────────────────┐             │
│  │         Prisma Client                           │             │
│  │  • Type-safe Database Queries                   │             │
│  │  • Schema Migrations                            │             │
│  │  • Connection Pooling                           │             │
│  └────────────────────────┬────────────────────────┘             │
└───────────────────────────┼───────────────────────────────────────┘
                            │
┌───────────────────────────┼───────────────────────────────────────┐
│                   DATABASE LAYER (PostgreSQL)                     │
│  ┌────────────────────────┴────────────────────────┐             │
│  │         Neon PostgreSQL Database                │             │
│  │  • 30+ Tables                                   │             │
│  │  • Relational Data                              │             │
│  │  • Indexes & Constraints                        │             │
│  └─────────────────────────────────────────────────┘             │
└───────────────────────────────────────────────────────────────────┘
```

### Folder Structure

```
hrms1/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── src/
│   ├── app/
│   │   ├── (admin)/admin/     # Admin routes (protected)
│   │   ├── (employee)/employee/ # Employee routes (protected)
│   │   ├── (manager)/manager/ # Manager routes (protected)
│   │   ├── api/               # API routes
│   │   │   ├── attendance/
│   │   │   │   ├── route.ts   # Main attendance API
│   │   │   │   └── heartbeat/route.ts # Heartbeat tracking
│   │   │   ├── employee-status/route.ts
│   │   │   ├── employees/route.ts
│   │   │   ├── payroll/route.ts
│   │   │   ├── auth/
│   │   │   └── ...
│   │   ├── login/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── admin/             # Admin components
│   │   ├── employee/          # Employee components
│   │   │   ├── ActivityHeartbeat.tsx
│   │   │   └── AttendanceControls.tsx
│   │   ├── shared/            # Shared components
│   │   │   ├── sidebar.tsx
│   │   │   └── navbar.tsx
│   │   └── ui/                # shadcn UI components
│   ├── lib/
│   │   ├── auth.ts            # Authentication utilities
│   │   ├── db.ts              # Prisma client
│   │   └── utils.ts           # Helper functions
│   └── types/
│       └── index.ts           # TypeScript types
├── public/                    # Static assets
├── .env                       # Environment variables
├── next.config.ts             # Next.js configuration
├── tailwind.config.ts         # Tailwind CSS configuration
└── package.json               # Dependencies
```

---

## Database Schema

### Core Tables

#### User
- **Purpose:** Authentication and user accounts
- **Key Fields:** `id`, `email`, `username`, `password`, `role`, `employeeId`
- **Relations:** One-to-One with Employee

#### Employee
- **Purpose:** Employee master data
- **Key Fields:** `id`, `employeeId`, `name`, `email`, `salary`, `department`, `designation`
- **Relations:**
  - One-to-One with User
  - One-to-Many with Attendance, Leave, Payroll, Tasks

#### Attendance
- **Purpose:** Daily attendance tracking
- **Key Fields:** `id`, `employeeId`, `date`, `punchIn`, `punchOut`, `totalHours`, `breakDuration`, `idleTime`, `status`
- **Relations:**
  - Many-to-One with Employee
  - One-to-Many with ActivityLog

#### ActivityLog
- **Purpose:** Track employee activity heartbeats
- **Key Fields:** `id`, `attendanceId`, `timestamp`, `active`
- **Relations:** Many-to-One with Attendance

#### Payroll
- **Purpose:** Monthly salary processing
- **Key Fields:** `id`, `employeeId`, `month`, `year`, `basicSalary`, `netSalary`, `totalDeductions`, `status`

#### Project
- **Purpose:** Project management
- **Key Fields:** `id`, `projectId`, `name`, `status`, `budget`, `milestones`

#### Task
- **Purpose:** Task assignment and tracking
- **Key Fields:** `id`, `projectId`, `assignedTo`, `title`, `status`, `priority`

#### Lead & Sale
- **Purpose:** CRM and sales tracking
- **Key Fields:** Lead number, company details, status, conversion tracking

#### Leave
- **Purpose:** Leave management
- **Key Fields:** `id`, `employeeId`, `leaveType`, `startDate`, `endDate`, `status`

### Complete Schema Reference
See `prisma/schema.prisma` for full schema with 30+ tables.

---

## Authentication & Authorization

### Authentication Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        LOGIN FLOW                                │
└──────────────────────────────────────────────────────────────────┘

User enters credentials
         │
         ▼
POST /api/auth/login
         │
         ├─► Validate username/password with database
         │
         ├─► Check User.password (bcrypt hash)
         │
         ├─► Generate JWT token with payload:
         │    {
         │      userId, email, role, employeeId, name
         │    }
         │
         ├─► Set HTTP-only cookie: "session"
         │    • Expires: 7 days
         │    • Secure: true (production)
         │    • SameSite: lax
         │
         └─► Redirect based on role:
              • ADMIN → /admin/dashboard
              • EMPLOYEE → /employee/dashboard
              • MANAGER → /manager/dashboard

┌──────────────────────────────────────────────────────────────────┐
│                   AUTHORIZATION CHECK (Middleware)               │
└──────────────────────────────────────────────────────────────────┘

Request to protected route
         │
         ▼
getSession() in layout.tsx
         │
         ├─► Read "session" cookie
         │
         ├─► Verify JWT signature
         │
         ├─► Check role matches route requirements
         │
         ├─► SUCCESS → Render page with session data
         │
         └─► FAILURE → redirect('/login')
```

### Role-Based Access Control (RBAC)

| Role     | Access Level |
|----------|-------------|
| ADMIN    | Full system access (all modules) |
| MANAGER  | Team management, attendance editing, reports |
| EMPLOYEE | Personal dashboard, attendance, tasks, leaves |

### Protected Routes

```typescript
// Admin routes: (admin)/* - Requires role: ADMIN
// Manager routes: (manager)/* - Requires role: MANAGER
// Employee routes: (employee)/* - Requires role: EMPLOYEE
```

### Session Management

**JWT Payload Structure:**
```typescript
{
  userId: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  employeeId?: string;
  name: string;
  permissions?: any;
}
```

**Token Expiration:** 7 days
**Storage:** HTTP-only cookie
**Refresh:** Not implemented (user re-login required)

---

## Core Modules

### 1. Attendance Management

#### Features
- Punch In/Out tracking
- Break time management
- Automatic status calculation (PRESENT/HALF_DAY/ABSENT)
- Real-time activity heartbeat monitoring
- Idle time detection
- Calendar view for editing

#### Attendance Status Logic

```
Status Calculation:
┌─────────────────────────────────────────────────┐
│ Total Hours = (Punch Out - Punch In) - Breaks  │
│                                                 │
│ IF Total Hours >= 6.0 → PRESENT                │
│ IF Total Hours < 6.0  → HALF_DAY               │
│ IF No Punch In        → ABSENT                 │
│ IF Approved Leave     → LEAVE                  │
│ IF Holiday            → HOLIDAY                │
│ IF Weekend            → WEEKEND                │
└─────────────────────────────────────────────────┘
```

#### Activity Heartbeat System

```
┌──────────────────────────────────────────────────────────────────┐
│              ACTIVITY HEARTBEAT TRACKING FLOW                    │
└──────────────────────────────────────────────────────────────────┘

Employee Punches In
         │
         ▼
ActivityHeartbeat Component Mounts (Client)
         │
         ├─► Listen for user activity:
         │    • Mouse movement
         │    • Keyboard input
         │    • Clicks
         │    • Scrolling
         │
         ├─► Send heartbeat every 3 minutes
         │    │
         │    ├─► Check: Was there activity in last 5 min?
         │    │    • YES → active: true
         │    │    • NO  → active: false
         │    │
         │    └─► POST /api/attendance/heartbeat
         │         { active: true/false }
         │
         ▼
Server (Heartbeat API)
         │
         ├─► Find today's attendance record
         │
         ├─► Create ActivityLog entry:
         │    {
         │      attendanceId,
         │      timestamp: now,
         │      active: true/false
         │    }
         │
         ├─► Calculate idle time from gaps:
         │    • Get all activity logs for today
         │    • Find gaps > 5 minutes between logs
         │    • Sum gaps as idle time
         │
         └─► Update Attendance.idleTime

Employee Status Dashboard (Admin)
         │
         ├─► GET /api/employee-status
         │
         ├─► For each employee:
         │    • Get today's attendance
         │    • Get latest activity log
         │    • Calculate minutes since last activity
         │    │
         │    └─► Determine status:
         │         • 0-5 min ago   → ACTIVE  (🟢)
         │         • 5-15 min ago  → IDLE    (🟡)
         │         • 15+ min ago   → AWAY    (🟠)
         │         • Not punched in → OFFLINE (⚫)
         │
         └─► Display real-time status grid
              (Auto-refresh every 30 seconds)
```

#### Files
- `/api/attendance/route.ts` - Main attendance CRUD
- `/api/attendance/heartbeat/route.ts` - Heartbeat tracking
- `/api/employee-status/route.ts` - Real-time status
- `/components/employee/ActivityHeartbeat.tsx` - Client tracker
- `/components/employee/AttendanceControls.tsx` - Punch buttons
- `/app/(admin)/admin/employee-status/page.tsx` - Status dashboard
- `/app/(admin)/admin/attendance/edit/page.tsx` - Edit attendance

---

### 2. Payroll Management

#### Salary Types
- **FIXED:** Fixed monthly salary
- **VARIABLE:** Base salary + variable component (commission/incentive)

#### Payroll Calculation Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                   PAYROLL CALCULATION LOGIC                      │
└──────────────────────────────────────────────────────────────────┘

INPUT:
  • Employee salary configuration
  • Month attendance data
  • Working days in month (default: 30)
  • Sales target (for variable salary employees)

STEP 1: Calculate Days Present
  ├─► Count PRESENT days
  ├─► Count HALF_DAY days (× 0.5)
  └─► Total days present = PRESENT + (HALF_DAY × 0.5)

STEP 2: Calculate Basic Payable
  ├─► IF FIXED salary:
  │    basicPayable = (basicSalary / workingDays) × daysPresent
  │
  └─► IF VARIABLE salary:
       basicPayable = (basicSalary / workingDays) × daysPresent

STEP 3: Calculate Variable Payable (if applicable)
  └─► IF target achieved >= salesTarget:
       variablePayable = variablePay
      ELSE:
       variablePayable = (targetAchieved / salesTarget) × variablePay

STEP 4: Calculate Gross Salary
  └─► grossSalary = basicPayable + variablePayable

STEP 5: Calculate Deductions
  ├─► Professional Tax: ₹200 (default)
  ├─► TDS: Based on tax slabs
  ├─► Penalties: Manual entry
  ├─► Advance Payment: Manual entry
  ├─► Other Deductions: Manual entry
  └─► totalDeductions = sum of all above

STEP 6: Calculate Net Salary
  └─► netSalary = grossSalary - totalDeductions

OUTPUT: Payroll record saved with status: PENDING
```

#### Files
- `/api/payroll/route.ts` - Payroll CRUD and calculations
- `/app/(admin)/admin/payroll/page.tsx` - Payroll management UI

---

### 3. Employee Management

#### Features
- Employee CRUD operations
- Profile management with photo upload
- KYC documents (Aadhar, PAN)
- Bank account details
- Document management
- Reporting hierarchy

#### Files
- `/api/employees/route.ts` - Employee API
- `/app/(admin)/admin/employees/page.tsx` - Employee list
- `/app/(admin)/admin/employees/[id]/page.tsx` - Employee details

---

### 4. Project & Task Management

#### Project Types
- **MILESTONE:** Fixed milestones with payment schedules
- **RETAINER:** Monthly retainer contracts

#### Features
- Project creation with SoW upload
- Milestone tracking
- Task assignment
- Task status updates
- Team member assignment

#### Files
- `/api/projects/route.ts` - Project API
- `/api/tasks/route.ts` - Task API
- `/app/(admin)/admin/projects/page.tsx` - Project list
- `/app/(admin)/admin/tasks/page.tsx` - Task management

---

### 5. Sales CRM

#### Lead Statuses
- NEW
- COLD_CALL_BACK
- WARM
- PROSPECT
- SALE_MADE
- CONVERTED
- LOST
- HOLD
- DORMANT

#### Sales Flow

```
Lead Created → Nurturing → Converted to Sale → Project Created
```

#### Files
- `/api/leads/route.ts` - Lead management
- `/api/sales/route.ts` - Sales tracking

---

### 6. Leave Management

#### Leave Types
- SICK
- CASUAL
- EARNED
- UNPAID

#### Leave Statuses
- PENDING
- APPROVED
- REJECTED
- HOLD
- CANCELLED

#### Files
- `/api/leaves/route.ts` - Leave CRUD
- `/app/(employee)/employee/leaves/page.tsx` - Employee leave requests

---

### 7. Integrations

#### Supported Platforms
- Azure DevOps (Work items, repos, commits)
- Asana (Tasks)
- Confluence (Documentation)

#### Files
- `/api/integrations/route.ts` - Integration management
- Schema: `IntegrationConnection`, `WorkItem`, `DeveloperCommit`

---

## API Endpoints

### Authentication
```
POST   /api/auth/login       - User login
POST   /api/auth/logout      - User logout
```

### Attendance
```
GET    /api/attendance       - Get attendance records (with filters)
POST   /api/attendance       - Punch in/out, break start/end
PUT    /api/attendance       - Update attendance record
DELETE /api/attendance       - Delete attendance record
POST   /api/attendance/heartbeat - Record activity heartbeat
```

### Employee Status
```
GET    /api/employee-status  - Get real-time employee status
```

### Employees
```
GET    /api/employees        - List all employees
POST   /api/employees        - Create employee
PUT    /api/employees/:id    - Update employee
DELETE /api/employees/:id    - Delete employee
```

### Payroll
```
GET    /api/payroll          - Get payroll records
POST   /api/payroll          - Generate payroll
PUT    /api/payroll/:id      - Update payroll
DELETE /api/payroll/:id      - Delete payroll
```

### Projects & Tasks
```
GET    /api/projects         - List projects
POST   /api/projects         - Create project
GET    /api/tasks            - List tasks
POST   /api/tasks            - Create task
PUT    /api/tasks/:id        - Update task status
```

### Sales CRM
```
GET    /api/leads            - List leads
POST   /api/leads            - Create lead
PUT    /api/leads/:id        - Update lead
POST   /api/leads/:id/convert - Convert lead to sale

GET    /api/sales            - List sales
POST   /api/sales            - Create sale
```

### Leaves
```
GET    /api/leaves           - Get leave requests
POST   /api/leaves           - Apply for leave
PUT    /api/leaves/:id       - Approve/reject leave
```

---

## System Flows

### 1. Daily Attendance Flow

```mermaid
sequenceDiagram
    participant E as Employee
    participant C as Client (Browser)
    participant A as API
    participant D as Database

    Note over E,D: Morning - Punch In
    E->>C: Click "Punch In"
    C->>A: POST /api/attendance {action: "punch-in"}
    A->>D: Create Attendance record
    D-->>A: Record created
    A-->>C: Success
    C->>C: Start ActivityHeartbeat tracker

    Note over E,D: Every 3 minutes - Heartbeat
    C->>A: POST /api/attendance/heartbeat {active: true/false}
    A->>D: Create ActivityLog entry
    A->>D: Calculate & update idle time
    D-->>A: Updated
    A-->>C: Success

    Note over E,D: Break Time
    E->>C: Click "Start Break"
    C->>A: POST /api/attendance {action: "break-start"}
    A->>D: Update breakStart timestamp
    D-->>A: Updated
    A-->>C: Success

    E->>C: Click "End Break"
    C->>A: POST /api/attendance {action: "break-end"}
    A->>D: Update breakEnd timestamp
    D-->>A: Updated
    A-->>C: Success

    Note over E,D: Evening - Punch Out
    E->>C: Click "Punch Out"
    C->>A: POST /api/attendance {action: "punch-out"}
    A->>D: Query activity logs
    A->>A: Calculate: totalHours, idleTime, status
    A->>D: Update punchOut, totalHours, idleTime, status
    D-->>A: Updated
    A-->>C: Success (with calculated data)
    C->>C: Stop ActivityHeartbeat tracker
```

### 2. Payroll Generation Flow

```mermaid
flowchart TD
    A[Admin selects Month/Year] --> B[Click Generate Payroll]
    B --> C{Employee has payroll for this month?}
    C -->|Yes| D[Skip - Already exists]
    C -->|No| E[Fetch employee salary config]
    E --> F[Fetch attendance for the month]
    F --> G[Count Present/Half-day/Absent days]
    G --> H{Salary Type?}
    H -->|FIXED| I[Calculate: basicPayable = salary/30 * daysPresent]
    H -->|VARIABLE| J[Calculate: basicPayable + variablePayable]
    I --> K[Calculate Deductions]
    J --> K
    K --> L[netSalary = gross - deductions]
    L --> M[Create Payroll record with status: PENDING]
    M --> N[Admin reviews and approves]
    N --> O[Update status: APPROVED]
    O --> P[Mark as PAID after payment]
```

### 3. Real-time Employee Status Flow

```mermaid
flowchart TD
    A[Admin opens Employee Status page] --> B[GET /api/employee-status]
    B --> C[For each employee: Fetch today's attendance]
    C --> D[Get latest activity log]
    D --> E{Has attendance?}
    E -->|No| F[Status: OFFLINE]
    E -->|Yes| G{Punched out?}
    G -->|Yes| F
    G -->|No| H{Minutes since last activity?}
    H -->|0-5 min| I[Status: ACTIVE 🟢]
    H -->|5-15 min| J[Status: IDLE 🟡]
    H -->|15+ min| K[Status: AWAY 🟠]
    I --> L[Display status grid]
    J --> L
    K --> L
    F --> L
    L --> M[Auto-refresh every 30 seconds]
    M --> B
```

### 4. Leave Request Flow

```mermaid
sequenceDiagram
    participant E as Employee
    participant S as System
    participant M as Manager/Admin

    E->>S: Submit leave request
    S->>S: Create Leave record (status: PENDING)
    S-->>E: Request submitted
    S->>M: Notification sent

    M->>S: Review leave request
    M->>S: Approve/Reject/Hold with comment
    S->>S: Update Leave.status + adminComment
    S-->>M: Updated
    S->>E: Notification sent

    Note over E,S,M: If APPROVED
    S->>S: Mark attendance dates as LEAVE
    S-->>E: Leave approved
```

---

## Deployment Guide

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database (Neon recommended)
- Vercel account (for deployment)

### Environment Variables

Create `.env` file:

```env
# Database
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters-long"

# App
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
```

### Database Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Generate Prisma Client:**
```bash
npx prisma generate
```

3. **Run migrations:**
```bash
npx prisma migrate deploy
```

4. **Seed database (optional):**
```bash
npm run seed
```

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

### Production Deployment (Vercel)

1. **Push code to GitHub**

2. **Import project to Vercel:**
   - Connect GitHub repository
   - Add environment variables
   - Deploy

3. **Configure domain (optional)**

4. **Set up database connection pooling:**
   - Ensure Neon serverless driver is used
   - Connection pooling handled by Prisma

### Default Login Credentials

```
Username: admin
Password: 12345678
Role: ADMIN

Username: emp002
Password: 12345678
Role: EMPLOYEE
```

⚠️ **IMPORTANT:** Change default passwords immediately in production!

---

## Development Guide

### Adding a New Module

1. **Create Database Schema** (`prisma/schema.prisma`)
```prisma
model NewModule {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

2. **Run Migration**
```bash
npx prisma migrate dev --name add_new_module
```

3. **Create API Route** (`src/app/api/new-module/route.ts`)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await prisma.newModule.findMany();
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const newRecord = await prisma.newModule.create({
    data: body
  });
  return NextResponse.json(newRecord);
}
```

4. **Create UI Page** (`src/app/(admin)/admin/new-module/page.tsx`)
```typescript
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function NewModulePage() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    redirect('/login');
  }

  const data = await prisma.newModule.findMany();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">New Module</h1>
      {/* Your UI here */}
    </div>
  );
}
```

5. **Add to Sidebar** (`src/app/(admin)/admin/layout.tsx`)
```typescript
const sidebarItems = [
  // ... existing items
  { icon: 'Star', label: 'New Module', href: '/admin/new-module' },
];
```

### Best Practices

#### 1. Authentication
- Always check `getSession()` in protected routes
- Verify user role for admin-only operations
- Use JWT for stateless authentication

#### 2. Database Queries
- Use Prisma Client for type safety
- Add indexes for frequently queried fields
- Use transactions for atomic operations
- Implement pagination for large datasets

#### 3. Error Handling
```typescript
try {
  const data = await prisma.model.findMany();
  return NextResponse.json(data);
} catch (error: any) {
  console.error('Error:', error);
  return NextResponse.json(
    { error: 'Failed to fetch data', details: error.message },
    { status: 500 }
  );
}
```

#### 4. Date Handling
```typescript
// Always use date-fns for consistency
import { format, startOfDay, endOfDay } from 'date-fns';

// For date range queries
const today = new Date();
today.setHours(0, 0, 0, 0);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

const records = await prisma.attendance.findMany({
  where: {
    date: {
      gte: today,
      lt: tomorrow,
    },
  },
});
```

#### 5. Client Components
```typescript
'use client'; // Add this directive for interactive components

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function MyComponent() {
  const router = useRouter();
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const response = await fetch('/api/endpoint');
    const result = await response.json();
    setData(result);
  };

  return <div>{/* UI */}</div>;
}
```

### Testing

#### Manual Testing Checklist
- [ ] Login/Logout flow
- [ ] Attendance punch in/out
- [ ] Heartbeat tracking (check browser console)
- [ ] Employee status dashboard updates
- [ ] Payroll generation and calculations
- [ ] Leave request approval workflow
- [ ] Project/Task creation and updates
- [ ] Permission checks (try accessing admin routes as employee)

#### Database Verification Scripts
```bash
# Check attendance records
npx tsx scripts/check-attendance.ts

# Verify payroll calculations
npx tsx scripts/verify-payroll.ts

# Check employee data
npx tsx scripts/list-employees.ts
```

---

## Troubleshooting

### Common Issues

#### 1. Attendance Status Incorrect
**Symptom:** Status showing wrong values (e.g., 4000+ hours)

**Solution:**
```bash
# Run data cleanup script
npx tsx << 'EOF'
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixTotalHours() {
  const records = await prisma.attendance.findMany({
    where: {
      totalHours: { gt: 100 },
      punchIn: { not: null },
      punchOut: { not: null }
    }
  });

  for (const rec of records) {
    const elapsed = (new Date(rec.punchOut).getTime() - new Date(rec.punchIn).getTime()) / (1000 * 60 * 60);
    const correct = elapsed - (rec.breakDuration || 0);

    await prisma.attendance.update({
      where: { id: rec.id },
      data: { totalHours: Math.round(correct * 100) / 100 }
    });
  }
}

fixTotalHours();
EOF
```

#### 2. Heartbeat Not Tracking
**Check:**
- Browser console for errors
- Network tab for `/api/attendance/heartbeat` requests
- Employee must be punched in
- ActivityHeartbeat component is mounted

**Debug:**
```javascript
// Check console logs:
[ActivityHeartbeat] Component mounted
[Heartbeat] Sending... Active: true LastActivity: 0s ago
[Heartbeat] Success: {...}
```

#### 3. Punch Out Button Re-appearing
**Cause:** Query was finding old unpunched records instead of today's record

**Fix:** Already implemented - query now filters by today's date range

#### 4. Session Expired
**Solution:**
- JWT expires after 7 days
- User needs to login again
- Consider implementing refresh tokens for extended sessions

### Performance Optimization

#### 1. Database Indexes
Ensure indexes exist on frequently queried fields:
```prisma
@@index([employeeId])
@@index([date])
@@index([status])
```

#### 2. API Response Caching
```typescript
// Add cache headers for static data
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'public, max-age=60, stale-while-revalidate=120'
  }
});
```

#### 3. Pagination
```typescript
// For large datasets
const page = Number(searchParams.get('page')) || 1;
const limit = 50;

const records = await prisma.model.findMany({
  skip: (page - 1) * limit,
  take: limit,
});
```

---

## Future Enhancements (AzureINFPS - Scheduled for December)

Complete Azure DevOps clone system with:
- **Azure Boards:** Work item tracking, Kanban boards, Sprints
- **Azure Repos:** Git repositories, Pull requests, Code review
- **Azure Pipelines:** CI/CD automation
- **Azure Test Plans:** Test management
- **Azure Artifacts:** Package management
- **Wiki:** Documentation system

See separate documentation: `AZURE_INFPS_FEATURES.md`

---

## Support & Contact

**Developer:** Claude (Anthropic AI)
**Organization:** Infiniti Tech Partners
**Project Start:** November 2024
**Current Version:** 1.0.0

### Resources
- GitHub Repository: [Link]
- Production URL: [Link]
- Neon Database Dashboard: [Link]
- Vercel Dashboard: [Link]

---

## Changelog

### Version 1.0.0 (November 2024)
- ✅ Initial system setup
- ✅ Employee management module
- ✅ Attendance tracking with punch in/out
- ✅ Real-time activity heartbeat monitoring
- ✅ Employee status dashboard (Active/Idle/Away/Offline)
- ✅ Automated payroll processing
- ✅ Project & task management
- ✅ Sales CRM (Leads & Sales)
- ✅ Leave management
- ✅ HR documents & policies
- ✅ Accounts & invoicing
- ✅ Internal messaging system
- ✅ Reports & analytics
- ✅ Azure DevOps/Asana/Confluence integrations
- ✅ Fixed: Half-day logic (< 6 hours = HALF_DAY)
- ✅ Fixed: Punch-out re-popup issue
- ✅ Fixed: Corrupted total hours data
- ✅ Fixed: Activity heartbeat tracking

---

**End of Documentation**
