# HRMS Algorithms - Quick Reference Guide

**Document Version:** 1.0
**Last Updated:** December 6, 2025

This document provides a quick reference for all calculation algorithms used in the HRMS system.

---

## Table of Contents

1. [Attendance Algorithms](#attendance-algorithms)
2. [Activity Tracking Algorithms](#activity-tracking-algorithms)
3. [Payroll Calculations](#payroll-calculations)
4. [Sales Commission](#sales-commission)
5. [Leave Balance](#leave-balance)
6. [Constants & Configuration](#constants--configuration)

---

## Attendance Algorithms

### 1. Total Hours Calculation

**Formula:**
```
totalHours = (punchOutTime - punchInTime) - breakDuration - idleTime
```

**Where:**
- `punchOutTime` = Timestamp when employee punched out
- `punchInTime` = Timestamp when employee punched in
- `breakDuration` = Sum of all break periods in hours
- `idleTime` = Calculated idle time in hours

**Example:**
```
Punch In:  09:00 AM
Punch Out: 06:00 PM
Break:     30 minutes = 0.5 hours
Idle:      1.2 hours

Total Hours = (18:00 - 09:00) - 0.5 - 1.2
            = 9 - 0.5 - 1.2
            = 7.3 hours
```

---

### 2. Idle Time Calculation

**Formula:**
```
idleTime (hours) = (inactiveHeartbeats × HEARTBEAT_INTERVAL_MS) / (1000 × 60 × 60)
```

**Where:**
- `inactiveHeartbeats` = Count of activity logs where `active = false`
- `HEARTBEAT_INTERVAL_MS` = 3 minutes = 180,000 milliseconds

**Simplified:**
```
idleTime (hours) = inactiveHeartbeats × 0.05
```

**Example:**
```
Inactive Heartbeats: 24

Idle Time = 24 × 3 minutes
          = 72 minutes
          = 1.2 hours
```

**Important Notes:**
- Active heartbeats (`active = true`) are NOT counted in idle time
- Each inactive heartbeat represents 3 minutes of inactivity
- Auto-heartbeats (server-generated) are marked as inactive
- Client heartbeats with user activity are marked as active

---

### 3. Break Duration Calculation

**Formula:**
```
breakDuration (hours) = (breakEnd - breakStart) / (1000 × 60 × 60)
```

**Example:**
```
Break Start: 01:00 PM
Break End:   01:30 PM

Break Duration = (13:30 - 13:00) / 3600000
               = 1800000 / 3600000
               = 0.5 hours
```

---

### 4. Heartbeat Detection Rules

#### Client Heartbeat (Active)
- Sent every 30 seconds when user activity detected
- Marks: `active = true`
- Activity events: mousemove, keydown, click, scroll, touchstart

#### Auto Heartbeat (Inactive)
- Sent every 3 minutes by server when no client heartbeat
- Marks: `active = false`
- Represents: Browser closed, minimized, or user idle

**Heartbeat Decision Tree:**
```
Employee Punched In?
│
├─ YES ──> Client Active (mouse/keyboard)?
│          │
│          ├─ YES ──> Client sends heartbeat
│          │          (active = true, every 30s)
│          │
│          └─ NO ──> No client heartbeat sent
│                    │
│                    └─ Server detects gap (3.5+ min)
│                       └─> Server sends auto-heartbeat
│                           (active = false, every 3 min)
│
└─ NO ──> No heartbeats
```

---

## Activity Tracking Algorithms

### 1. Suspicious Keystroke Pattern Detection

#### Pattern 1: Repetitive Key Press

**Rule:**
```
IF last 10 keystrokes all have the same key:
    SUSPICIOUS = true
    TYPE = "REPETITIVE_KEY"
```

**Example:**
```
Keystrokes: [A, A, A, A, A, A, A, A, A, A]
Result: SUSPICIOUS (Same key "A" pressed 10 times)
```

---

#### Pattern 2: Regular Interval Keystrokes

**Formula:**
```
intervals = [t2-t1, t3-t2, t4-t3, ..., t10-t9]
avgInterval = mean(intervals)
tolerance = 100 ms

similarIntervals = count where |interval - avgInterval| < tolerance

IF similarIntervals ≥ 8 out of 9:
    SUSPICIOUS = true
    TYPE = "REGULAR_INTERVAL_KEYSTROKES"
```

**Example:**
```
Intervals: [5000ms, 5020ms, 4980ms, 5010ms, 5000ms, 4990ms, 5005ms, 5000ms, 5010ms]
Average:   5001.67ms
Similar:   9 out of 9 (all within 100ms tolerance)

Result: SUSPICIOUS (Auto-typer detected)
```

---

#### Pattern 3: Alternating Keys

**Rule:**
```
IF only 2 unique keys in last 10 keystrokes
   AND keys alternate perfectly:
    SUSPICIOUS = true
    TYPE = "ALTERNATING_KEYS"
```

**Example:**
```
Keys: [A, B, A, B, A, B, A, B, A, B]
Unique: {A, B}
Pattern: Perfect alternation

Result: SUSPICIOUS (Macro detected)
```

---

### 2. Suspicious Mouse Pattern Detection

#### Pattern 1: Linear Movement

**Formula:**
```
movements = [(x2-x1, y2-y1), (x3-x2, y3-y2), ...]
directions = [atan2(dy, dx) for each movement]
avgDirection = mean(directions)

tolerance = 0.1 radians (~5.7 degrees)
similarDirections = count where |direction - avgDirection| < tolerance

IF similarDirections ≥ 8 out of 9:
    SUSPICIOUS = true
    TYPE = "LINEAR_MOUSE_MOVEMENT"
```

**Example:**
```
Movements all in 90° direction (straight right)
9 out of 9 movements within 5° tolerance

Result: SUSPICIOUS (Mouse jiggler detected)
```

---

#### Pattern 2: Static Mouse

**Rule:**
```
uniquePositions = count of unique (x, y) positions in last 10 moves

IF uniquePositions == 1:
    SUSPICIOUS = true
    TYPE = "STATIC_MOUSE"
```

**Example:**
```
Positions: [(100, 200), (100, 200), (100, 200), ...]
Unique: 1

Result: SUSPICIOUS (Fake mouse app detected)
```

---

### 3. Suspicious Activity Handling

**Counter Algorithm:**
```
suspiciousActivityCount = 0

ON each activity:
    pattern = detectPattern(activity)

    IF pattern DETECTED:
        suspiciousActivityCount++

        IF suspiciousActivityCount > 3:
            markAsInactive()  // Don't count this activity
            RETURN
        END IF
    ELSE:
        // Genuine activity resets the counter
        suspiciousActivityCount = max(0, suspiciousActivityCount - 1)
    END IF

    markAsActive()  // Count this activity
```

**Threshold:**
- First 3 suspicious patterns: Warning, still counted as active
- More than 3: Activity ignored, marked as inactive

---

## Payroll Calculations

### 1. Present Days Calculation

**Algorithm:**
```
effectiveStart = max(employeeJoinDate, monthStartDate)
effectiveEnd = min(today OR monthEndDate, employeeLeaveDate OR infinity)

fullPresentDays = 0
halfDays = 0

FOR each day FROM effectiveStart TO effectiveEnd:
    attendance = findAttendance(employeeId, day)
    isWeekend = (day is Saturday OR Sunday)

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
        // Weekdays without record = 0 (absent)
    END IF

presentDays = fullPresentDays + (0.5 × halfDays)
```

**Example:**
```
Month: December 2025 (31 days)
Join Date: December 10, 2025
Today: December 20, 2025

Effective Period: Dec 10 - Dec 20 (11 days)

Attendance:
- Dec 10 (Tue): PRESENT → 1
- Dec 11 (Wed): PRESENT → 1
- Dec 12 (Thu): HALF_DAY → 0.5
- Dec 13 (Fri): PRESENT → 1
- Dec 14 (Sat): Weekend → 1
- Dec 15 (Sun): Weekend → 1
- Dec 16 (Mon): ABSENT → 0
- Dec 17 (Tue): PRESENT → 1
- Dec 18 (Wed): PRESENT → 1
- Dec 19 (Thu): PRESENT → 1
- Dec 20 (Fri): PRESENT → 1

Present Days = 8 + 2 (weekends) + 0.5 = 10.5 days
Absent Days = 30 - 10.5 = 19.5 days
```

---

### 2. Salary Calculation (FIXED Type)

**Formula:**
```
basicPayable = (basicSalary / workingDays) × presentDays
variablePayable = 0
grossSalary = basicPayable
```

**Where:**
- `basicSalary` = Employee's monthly salary
- `workingDays` = 30 (standard)
- `presentDays` = Calculated present days

**Example:**
```
Basic Salary: ₹50,000
Working Days: 30
Present Days: 25

Basic Payable = (50,000 / 30) × 25
              = 1,666.67 × 25
              = ₹41,666.67

Gross Salary = ₹41,666.67
```

---

### 3. Salary Calculation (VARIABLE Type - Sales)

**Formula:**
```
basicPayable = (basicSalary / workingDays) × presentDays

achievementPercentage = (targetAchieved / salesTarget) × 100

IF achievementPercentage >= 100:
    variablePayable = variablePay
ELSE IF achievementPercentage >= 50:
    variablePayable = (variablePay × achievementPercentage) / 100
ELSE:
    variablePayable = 0

grossSalary = basicPayable + variablePayable
```

**Example 1: 100% Target Achievement**
```
Basic Salary: ₹40,000
Variable Pay: ₹15,000
Working Days: 30
Present Days: 28
Sales Target: $10,000
Target Achieved: $12,000

Basic Payable = (40,000 / 30) × 28 = ₹37,333.33
Achievement % = (12,000 / 10,000) × 100 = 120%

Variable Payable = ₹15,000 (100% of variable)

Gross Salary = 37,333.33 + 15,000 = ₹52,333.33
```

**Example 2: 75% Target Achievement**
```
Sales Target: $10,000
Target Achieved: $7,500

Achievement % = (7,500 / 10,000) × 100 = 75%

Variable Payable = (15,000 × 75) / 100 = ₹11,250

Gross Salary = 37,333.33 + 11,250 = ₹48,583.33
```

**Example 3: 40% Target Achievement**
```
Target Achieved: $4,000
Achievement % = 40%

Variable Payable = ₹0 (below 50% threshold)

Gross Salary = 37,333.33 + 0 = ₹37,333.33
```

---

### 4. Deductions Calculation

**Formula:**
```
professionalTax = 200 (fixed)
tds = (manually entered)
penalties = (manually entered)
advancePayment = (manually entered)
otherDeductions = (manually entered)

totalDeductions = professionalTax + tds + penalties +
                 advancePayment + otherDeductions
```

**Example:**
```
Professional Tax: ₹200
TDS: ₹1,500
Penalties: ₹500
Advance: ₹2,000
Other: ₹0

Total Deductions = 200 + 1,500 + 500 + 2,000 + 0
                 = ₹4,200
```

---

### 5. Net Salary Calculation

**Formula:**
```
netSalary = grossSalary - totalDeductions
```

**Complete Example:**
```
Gross Salary: ₹52,333.33
Total Deductions: ₹4,200

Net Salary = 52,333.33 - 4,200
           = ₹48,133.33
```

---

## Sales Commission

### Commission Tiers

**Formula:**
```
achievementPercentage = (totalSales / salesTarget) × 100

IF achievementPercentage >= 100:
    commissionRate = 10%
ELSE IF achievementPercentage >= 75:
    commissionRate = 7%
ELSE IF achievementPercentage >= 50:
    commissionRate = 5%
ELSE:
    commissionRate = 0%

commission = saleAmount × commissionRate
```

**Commission Table:**

| Achievement % | Commission Rate | Example on $10,000 |
|--------------|----------------|-------------------|
| ≥ 100% | 10% | $1,000 |
| 75% - 99% | 7% | $700 |
| 50% - 74% | 5% | $500 |
| < 50% | 0% | $0 |

**Example:**
```
Sale Amount: $15,000
Monthly Target: $20,000
Total Sales This Month: $25,000

Achievement % = (25,000 / 20,000) × 100 = 125%

Commission Rate = 10% (≥100% achievement)

Commission = 15,000 × 0.10 = $1,500
```

---

## Leave Balance

### Annual Leave Entitlement

**Standard Allocation:**
```
CASUAL_LEAVES = 12 days/year
SICK_LEAVES = 12 days/year
EARNED_LEAVES = 12 days/year
TOTAL = 36 days/year
```

### Balance Calculation

**Formula:**
```
FOR each leave type:
    approvedLeaves = SUM(days) WHERE status = APPROVED AND year = currentYear
    remaining = totalAllocation - approvedLeaves
```

**Example:**
```
Year: 2025

Casual Leaves:
  Total: 12
  Used: 5
  Remaining: 12 - 5 = 7 days

Sick Leaves:
  Total: 12
  Used: 3
  Remaining: 12 - 3 = 9 days

Earned Leaves:
  Total: 12
  Used: 0
  Remaining: 12 - 0 = 12 days

Total Remaining: 7 + 9 + 12 = 28 days
```

---

## Constants & Configuration

### Time Constants

```
HEARTBEAT_INTERVAL_CLIENT = 30 seconds
HEARTBEAT_INTERVAL_SERVER = 3 minutes
IDLE_THRESHOLD = 5 minutes
HEARTBEAT_GAP_THRESHOLD = 3.5 minutes

WORKING_DAYS_PER_MONTH = 30
HOURS_IN_DAY = 24
MINUTES_IN_HOUR = 60
SECONDS_IN_MINUTE = 60
```

### Attendance Constants

```
WEEKEND_DAYS = [Saturday, Sunday]
WORKING_DAYS = [Monday, Tuesday, Wednesday, Thursday, Friday]
```

### Payroll Constants

```
PROFESSIONAL_TAX = ₹200 (fixed per month)
DEFAULT_WORKING_DAYS = 30
```

### Leave Constants

```
CASUAL_LEAVE_QUOTA = 12 days/year
SICK_LEAVE_QUOTA = 12 days/year
EARNED_LEAVE_QUOTA = 12 days/year
```

### Suspicious Activity Constants

```
KEYSTROKE_HISTORY_SIZE = 20 (keep last 20)
MOUSE_HISTORY_SIZE = 20 (keep last 20)
PATTERN_CHECK_SIZE = 10 (analyze last 10)
KEYSTROKE_TOLERANCE = 100 ms
MOUSE_DIRECTION_TOLERANCE = 0.1 radians (~5.7°)
SUSPICIOUS_THRESHOLD = 3 (after 3 patterns, mark suspicious)
```

---

## Formula Summary Table

| Calculation | Formula |
|-------------|---------|
| **Total Hours** | `(punchOut - punchIn) - break - idle` |
| **Idle Time** | `inactiveHeartbeats × 0.05 hours` |
| **Present Days** | `fullDays + (0.5 × halfDays)` |
| **Basic Payable (Fixed)** | `(salary / 30) × presentDays` |
| **Variable Payable** | `(variablePay × achievement%) / 100` |
| **Gross Salary** | `basicPayable + variablePayable` |
| **Net Salary** | `grossSalary - totalDeductions` |
| **Commission** | `saleAmount × commissionRate` |
| **Leave Balance** | `totalQuota - usedLeaves` |

---

## Decision Tables

### Attendance Status Decision

| Condition | Status |
|-----------|--------|
| Punched in, worked ≥ 4 hours | PRESENT |
| Punched in, worked < 4 hours | HALF_DAY |
| No punch in/out | ABSENT |
| Leave approved | LEAVE |
| Saturday/Sunday | WEEKEND |
| Company holiday | HOLIDAY |

### Variable Pay Decision (Sales)

| Achievement % | Variable Pay |
|--------------|--------------|
| ≥ 100% | 100% of variable amount |
| 50% - 99% | Proportional (e.g., 75% achievement = 75% of variable) |
| < 50% | 0% |

### Activity Classification

| Condition | Classification |
|-----------|---------------|
| Client heartbeat + genuine activity | ACTIVE |
| Client heartbeat + suspicious patterns (>3) | INACTIVE (suspicious) |
| Auto-heartbeat (server) | INACTIVE (idle/AFK) |
| No heartbeat (punched out) | N/A |

---

## Edge Cases & Special Scenarios

### 1. Mid-Month Joining

**Scenario**: Employee joins on Dec 15, payroll for December

**Calculation**:
```
Month: December (31 days)
Join Date: Dec 15
Effective Period: Dec 15 - Dec 31 (17 days)

Present Days = Count only from Dec 15 onwards
Salary = (baseSalary / 30) × presentDays
```

### 2. Mid-Month Exit

**Scenario**: Employee leaves on Dec 20, payroll for December

**Calculation**:
```
Leave Date: Dec 20
Effective Period: Dec 1 - Dec 20 (20 days)

Present Days = Count only till Dec 20
Salary = (baseSalary / 30) × presentDays
```

### 3. Half-Day Attendance

**Scenario**: Employee marked half-day

**Calculation**:
```
Half-day = 0.5 present days
Full month with 5 half-days:

Present Days = 25 + (5 × 0.5) = 27.5 days
```

### 4. Sales Agent with No Sales

**Scenario**: Sales agent with 0% achievement

**Calculation**:
```
Achievement: 0%
Variable Pay: ₹0 (below 50% threshold)
Gross Salary = basicPayable only
```

### 5. Over-Achievement Bonus

**Scenario**: Sales agent achieves 150% of target

**Calculation**:
```
Achievement: 150%
Variable Pay: 100% of variable amount (capped)
Commission: 10% of sale amount (tier 1)
```

---

**End of Algorithms Reference**

For implementation details, refer to:
- `TECHNICAL_DOCUMENTATION.md` - Complete system documentation
- `/src/app/api/` - API implementation
- `/src/components/attendance/ActivityTracker.tsx` - Activity tracking logic
- `/src/app/api/payroll/route.ts` - Payroll calculation logic
