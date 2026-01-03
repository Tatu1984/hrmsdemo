'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EditAttendanceDialog } from '@/components/admin/EditAttendanceDialog';
import { ChevronLeft, ChevronRight, Calendar, RefreshCw, Play, Pause } from 'lucide-react';
import { formatHoursMinutes } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: Date;
  punchIn: Date | null;
  punchOut: Date | null;
  status: string;
  totalHours?: number | null;
  breakDuration?: number | null;
  employee: {
    id: string;
    employeeId: string;
    name: string;
    designation: string;
  };
}

export default function AttendanceEditPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) {
      fetchMonthAttendance();
      fetchHolidays();
    }
  }, [selectedEmployeeId, currentMonth]);

  // Auto-refresh effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (autoRefresh && selectedEmployeeId) {
      intervalId = setInterval(() => {
        fetchMonthAttendance();
      }, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh, selectedEmployeeId, currentMonth]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  // Helper to format date as YYYY-MM-DD in local timezone (not UTC)
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchMonthAttendance = async () => {
    if (!selectedEmployeeId) return;

    setLoading(true);
    setError(null);

    try {
      const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      // Use local date format to avoid timezone issues
      // toISOString() converts to UTC which causes issues for timezones ahead of UTC
      const startDate = formatLocalDate(firstDay);
      const endDate = formatLocalDate(lastDay);

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const response = await fetch(
        `/api/attendance?employeeId=${selectedEmployeeId}&startDate=${startDate}&endDate=${endDate}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setAttendanceRecords(data);
        setLastRefresh(new Date());
      } else {
        // Handle non-OK response
        const errorText = await response.text().catch(() => response.statusText);
        console.error('Attendance API error:', response.status, errorText);
        setError(`Failed to load: ${response.status} ${response.statusText}`);
        setAttendanceRecords([]);
        setLastRefresh(new Date());
      }
    } catch (err: any) {
      console.error('Error fetching attendance:', err);
      if (err.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else {
        setError('Failed to load attendance data. Please try again.');
      }
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = () => {
    fetchMonthAttendance();
    fetchHolidays();
  };

  const fetchHolidays = async () => {
    try {
      const year = currentMonth.getFullYear();
      const response = await fetch(`/api/holidays?year=${year}`);
      if (response.ok) {
        const data = await response.json();
        setHolidays(data);
      }
    } catch (error) {
      console.error('Error fetching holidays:', error);
    }
  };

  const handleEmployeeChange = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    const emp = employees.find((e) => e.id === employeeId);
    setSelectedEmployee(emp);
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(clickedDate);

    // Check if attendance record exists for this date
    const existingRecord = attendanceRecords.find((record) => {
      const recordDate = new Date(record.date);
      return (
        recordDate.getDate() === clickedDate.getDate() &&
        recordDate.getMonth() === clickedDate.getMonth() &&
        recordDate.getFullYear() === clickedDate.getFullYear()
      );
    });

    if (existingRecord) {
      setEditingRecord(existingRecord);
    } else {
      // Create a new attendance record template for this date
      // Check if it's a weekend (Saturday or Sunday)
      const dayOfWeek = clickedDate.getDay();
      const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6

      const newRecord: AttendanceRecord = {
        id: '',
        employeeId: selectedEmployeeId,
        date: clickedDate,
        punchIn: null,
        punchOut: null,
        status: isWeekendDay ? 'WEEKEND' : 'ABSENT',
        totalHours: 0,
        breakDuration: 0,
        employee: selectedEmployee,
      };
      setEditingRecord(newRecord);
    }
  };

  const handleUpdateComplete = () => {
    fetchMonthAttendance();
  };

  const getAttendanceForDate = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return attendanceRecords.find((record) => {
      const recordDate = new Date(record.date);
      return (
        recordDate.getDate() === date.getDate() &&
        recordDate.getMonth() === date.getMonth() &&
        recordDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PRESENT: 'bg-green-500 text-white',
      HALF_DAY: 'bg-yellow-500 text-white',
      ABSENT: 'bg-red-500 text-white',
      LEAVE: 'bg-blue-500 text-white',
      HOLIDAY: 'bg-purple-500 text-white',
      WEEKEND: 'bg-gray-300 text-gray-700',
    };
    return colors[status] || 'bg-gray-200 text-gray-700';
  };

  const isWeekend = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
  };

  const isHoliday = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return holidays.some((holiday) => {
      const holidayDate = new Date(holiday.date);
      return (
        holidayDate.getDate() === date.getDate() &&
        holidayDate.getMonth() === date.getMonth() &&
        holidayDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const getHolidayName = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const holiday = holidays.find((h) => {
      const holidayDate = new Date(h.date);
      return (
        holidayDate.getDate() === date.getDate() &&
        holidayDate.getMonth() === date.getMonth() &&
        holidayDate.getFullYear() === date.getFullYear()
      );
    });
    return holiday?.name || '';
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Week day headers
    const headers = weekDays.map((day) => (
      <div key={day} className="text-center font-semibold text-gray-600 py-2">
        {day}
      </div>
    ));

    // Empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    // Calendar days
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      dayDate.setHours(0, 0, 0, 0);
      const isFutureDate = dayDate > today;

      const attendance = getAttendanceForDate(day);
      const weekend = isWeekend(day);
      const holiday = isHoliday(day);
      const holidayName = getHolidayName(day);

      days.push(
        <div
          key={day}
          onClick={() => handleDayClick(day)}
          className={`
            p-2 min-h-[80px] border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors
            ${weekend && !attendance && !holiday ? 'bg-gray-100' : ''}
            ${holiday && !attendance ? 'bg-purple-50' : ''}
            ${isFutureDate ? 'opacity-50' : ''}
          `}
        >
          <div className="text-sm font-medium text-gray-700 mb-1">{day}</div>
          {attendance ? (
            <div className={`text-xs px-2 py-1 rounded ${getStatusColor(attendance.status)}`}>
              {attendance.status}
            </div>
          ) : holiday ? (
            <div className="text-xs px-2 py-1 rounded bg-purple-500 text-white">
              Holiday
            </div>
          ) : weekend ? (
            <div className="text-xs px-2 py-1 rounded bg-gray-300 text-gray-700">
              Weekend
            </div>
          ) : isFutureDate ? (
            <div className="text-xs text-gray-400">-</div>
          ) : (
            <div className="text-xs px-2 py-1 rounded bg-red-500 text-white">
              ABSENT
            </div>
          )}
          {holiday && (
            <div className="text-xs text-purple-700 mt-1 truncate" title={holidayName}>
              {holidayName}
            </div>
          )}
          {attendance && attendance.totalHours !== null && attendance.totalHours > 0 && (
            <div className="text-xs text-gray-600 mt-1">
              {formatHoursMinutes(attendance.totalHours)}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-7 gap-0">
        {headers}
        {days}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Attendance Records</h1>
        <p className="text-gray-600">Select an employee and edit their attendance history</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Employee Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="employee">Select Employee</Label>
            <Select value={selectedEmployeeId} onValueChange={handleEmployeeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employeeId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedEmployeeId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {selectedEmployee?.name} - Attendance Calendar
              </CardTitle>
              <div className="flex items-center gap-4 flex-wrap">
                {/* Refresh Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManualRefresh}
                    disabled={loading}
                    title="Refresh now"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="auto-refresh"
                      checked={autoRefresh}
                      onCheckedChange={setAutoRefresh}
                    />
                    <Label htmlFor="auto-refresh" className="text-xs cursor-pointer">
                      Auto (30s)
                    </Label>
                  </div>
                  {lastRefresh && (
                    <span className="text-xs text-gray-500">
                      Last: {lastRefresh.toLocaleTimeString()}
                    </span>
                  )}
                </div>
                {/* Month Navigation */}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={previousMonth}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[150px] text-center">
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <Button variant="outline" size="sm" onClick={nextMonth}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center text-gray-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                Loading attendance data...
              </div>
            ) : error ? (
              <div className="py-12 text-center">
                <div className="text-red-500 mb-4">{error}</div>
                <Button variant="outline" onClick={handleManualRefresh}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex gap-4 text-xs flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-500"></div>
                    <span>Present</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-yellow-500"></div>
                    <span>Half Day</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-500"></div>
                    <span>Absent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-blue-500"></div>
                    <span>Leave</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-purple-500"></div>
                    <span>Holiday</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gray-300"></div>
                    <span>Weekend</span>
                  </div>
                </div>
                {renderCalendar()}
                <p className="text-xs text-gray-500 mt-4">
                  Click on any day to edit attendance. Weekends are automatically marked.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedEmployeeId && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>Please select an employee to view their attendance calendar</p>
          </CardContent>
        </Card>
      )}

      <EditAttendanceDialog
        attendance={editingRecord}
        open={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        onUpdate={handleUpdateComplete}
      />
    </div>
  );
}
