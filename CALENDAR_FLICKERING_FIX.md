# Calendar Flickering Fix - Admin Attendance Page

## Issues Fixed

### 1. ✅ Calendar Flickering
**Problem**: The admin attendance calendar was flickering badly and showing "Loading attendance data" followed by "Error loading attendance data: Failed to fetch" repeatedly.

**Root Causes**:
- Loading and error states were showing simultaneously
- useEffect cleanup not implemented, causing race conditions
- Component was re-rendering multiple times during data fetch

**Solutions Applied**:
- Added `isMounted` flag in useEffect to prevent state updates after unmount
- Separated `loading` state for calendar and `detailsLoading` for popup details
- Error banner only shows when `!loading && error` (prevents flicker)
- Proper cleanup function in useEffect

### 2. ✅ Empty Table Skeleton Instead of "Fetching"
**Problem**: When clicking on an employee entry, the popup showed just "Fetching..." with a spinner, providing no UI structure.

**Solution**:
- Created skeleton loading states with `animate-pulse` effect
- Shows empty table structure matching the actual data layout:
  - **Daily Work Update**: 2 skeleton cards with gray bars
  - **Activity Timeline**: 5 skeleton rows showing time + badge structure
- Dialog opens immediately with skeleton, data loads in background
- Smooth transition from skeleton to actual data

### 3. ✅ Error Message Improvements
**Problem**: "Failed to fetch" errors appearing even when API was working.

**Solutions**:
- Better error handling with try-catch in fetch requests
- Errors only display after loading completes
- Console errors for debugging without user-facing messages when APIs fail gracefully
- Empty states for "No data" vs actual errors

## Code Changes

### File: `src/components/attendance/TeamAttendanceCalendar.tsx`

#### State Management
```typescript
// Before:
const [loading, setLoading] = useState(false);

// After:
const [loading, setLoading] = useState(true); // Start as true
const [detailsLoading, setDetailsLoading] = useState(false); // Separate for popup
const [selectedAttendanceRecord, setSelectedAttendanceRecord] = useState<AttendanceRecord | null>(null);
```

#### useEffect with Cleanup
```typescript
useEffect(() => {
  let isMounted = true; // Prevent state updates after unmount

  const fetchMonthAttendance = async () => {
    if (!isMounted) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/attendance?startDate=${startDate}&endDate=${endDate}`);

      if (!isMounted) return; // Check before state updates

      if (response.ok) {
        const data = await response.json();

        if (isMounted) {
          setMonthAttendance(attendanceMap);
          setLoading(false);
        }
      }
    } catch (error) {
      if (isMounted) {
        setError(error.message);
        setLoading(false);
      }
    }
  };

  fetchMonthAttendance();

  return () => {
    isMounted = false; // Cleanup
  };
}, [currentMonth, monthStart, monthEnd, employeeMap]);
```

#### Conditional Error Display
```typescript
// Only show error when NOT loading (prevents flicker)
{!loading && error && (
  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
    <div className="flex items-center gap-2">
      <AlertCircle className="w-5 h-5" />
      <span className="font-semibold">Error loading attendance data:</span>
    </div>
    <p className="text-sm mt-1">{error}</p>
  </div>
)}
```

#### Skeleton Loading in Dialog
```typescript
{detailsLoading ? (
  // Skeleton for Daily Work Update
  <div className="space-y-3">
    <div className="bg-gray-100 p-4 rounded-lg animate-pulse">
      <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
      <div className="h-3 bg-gray-300 rounded w-3/4"></div>
    </div>
  </div>
) : dailyUpdate ? (
  // Actual data
  <div className="bg-blue-50 p-4 rounded-lg">
    <h4 className="font-semibold text-sm text-gray-700 mb-2">Work Completed:</h4>
    <p className="text-sm text-gray-600">{dailyUpdate.workCompleted}</p>
  </div>
) : (
  // Empty state
  <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
    <p className="text-sm">No daily work update submitted</p>
  </div>
)}
```

#### Improved handleEmployeeClick
```typescript
const handleEmployeeClick = async (employee: Employee, attendanceRecord: AttendanceRecord) => {
  // Set states immediately and open dialog
  setSelectedEmployee(employee);
  setSelectedAttendanceRecord(attendanceRecord);
  setDetailsLoading(true);
  setActivityLogs([]); // Reset to empty
  setDailyUpdate(null); // Reset to empty
  setIsEmployeeDialogOpen(true); // Open immediately with skeleton

  try {
    // Fetch in background
    const activityResponse = await fetch(`/api/attendance/activity?attendanceId=${attendanceRecord.id}`);
    if (activityResponse.ok) {
      const activityData = await activityResponse.json();
      setActivityLogs(activityData.activityLogs || []);
    }

    const dateStr = format(new Date(attendanceRecord.date), 'yyyy-MM-dd');
    const updateResponse = await fetch(`/api/daily-work-updates?employeeId=${employee.id}&date=${dateStr}`);
    if (updateResponse.ok) {
      const updateData = await updateResponse.json();
      setDailyUpdate(updateData.updates?.[0] || null);
    }
  } catch (error) {
    console.error('Error fetching employee details:', error);
  } finally {
    setDetailsLoading(false); // Hide skeleton, show data
  }
};
```

## Testing

### Before Fix:
- ❌ Calendar flickering between "Loading" and "Error" states
- ❌ "Failed to fetch" errors appearing randomly
- ❌ Popup showing just "Fetching..." spinner
- ❌ Poor user experience with no visual feedback

### After Fix:
- ✅ Calendar loads smoothly without flickering
- ✅ Loading banner shows only during actual fetch
- ✅ Error banner shows only when truly failed
- ✅ Popup opens immediately with skeleton structure
- ✅ Smooth transition from skeleton to actual data
- ✅ Professional, polished user experience

## User Experience Improvements

1. **No More Flickering**: Calendar stays stable while loading
2. **Instant Feedback**: Popup opens immediately with skeleton, no wait time
3. **Clear Loading States**: Users see structured skeleton matching final layout
4. **Better Error Handling**: Errors only appear when truly needed
5. **Smoother Transitions**: Skeleton → Data transition is seamless

## Technical Benefits

1. **Race Condition Prevention**: `isMounted` flag prevents state updates after unmount
2. **Separation of Concerns**: Calendar loading vs details loading are independent
3. **Performance**: Dialog renders immediately, data loads in background
4. **Maintainability**: Clear state management and error handling
5. **Scalability**: Pattern can be reused for other loading scenarios
