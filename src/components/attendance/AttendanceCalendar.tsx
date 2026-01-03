'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatHoursMinutes } from '@/lib/utils';

interface AttendanceRecord {
  date: Date | string;
  status: string;
  totalHours?: number | null;
  breakDuration?: number | null;
  idleTime?: number | null;
  employeeCount?: number;
  presentCount?: number;
  absentCount?: number;
}

interface AttendanceCalendarProps {
  attendanceData: AttendanceRecord[];
  showEmployeeCount?: boolean; // For admin view
  onDateClick?: (date: Date) => void;
}

export function AttendanceCalendar({ attendanceData, showEmployeeCount = false, onDateClick }: AttendanceCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getAttendanceForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return attendanceData.find(att => {
      // Use local date methods to avoid timezone issues
      // toISOString() converts to UTC which can shift the date
      const attDate = new Date(att.date);
      const attDateStr = `${attDate.getFullYear()}-${String(attDate.getMonth() + 1).padStart(2, '0')}-${String(attDate.getDate()).padStart(2, '0')}`;
      return attDateStr === dateStr;
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'PRESENT': return 'bg-green-500 text-white';
      case 'HALF_DAY': return 'bg-yellow-500 text-white';
      case 'ABSENT': return 'bg-red-500 text-white';
      case 'LEAVE': return 'bg-blue-500 text-white';
      default: return 'bg-gray-100 text-gray-400';
    }
  };

  const isWeekend = (day: number) => {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
  };

  const renderCalendarDays = () => {
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const attendance = getAttendanceForDate(day);
      const isToday = new Date().getDate() === day &&
                      new Date().getMonth() === month &&
                      new Date().getFullYear() === year;
      const weekendDay = isWeekend(day);

      days.push(
        <div
          key={day}
          onClick={() => onDateClick && onDateClick(new Date(year, month, day))}
          className={`
            p-2 border rounded-lg cursor-pointer hover:shadow-md transition-all
            ${isToday ? 'ring-2 ring-blue-500' : ''}
            ${weekendDay && !attendance ? 'bg-purple-100 border-purple-300' : ''}
            ${weekendDay && attendance ? getStatusColor(attendance.status) + ' border-purple-400 ring-1 ring-purple-300' : ''}
            ${!weekendDay && attendance ? getStatusColor(attendance.status) : ''}
            ${!weekendDay && !attendance ? 'bg-gray-50 hover:bg-gray-100' : ''}
            ${onDateClick ? 'cursor-pointer' : 'cursor-default'}
          `}
        >
          <div className="text-right font-semibold text-sm mb-1 flex items-center justify-between">
            {weekendDay && <span className="text-purple-600 text-xs">🏖️</span>}
            <span className={weekendDay && !attendance ? 'text-purple-700' : ''}>{day}</span>
          </div>
          {attendance && !showEmployeeCount && (
            <div className="text-xs space-y-0.5">
              {attendance.totalHours !== undefined && attendance.totalHours !== null && (
                <div>Work: {formatHoursMinutes(attendance.totalHours)}</div>
              )}
              {attendance.breakDuration !== undefined && attendance.breakDuration !== null && attendance.breakDuration > 0 && (
                <div>Break: {formatHoursMinutes(attendance.breakDuration)}</div>
              )}
              {attendance.idleTime !== undefined && attendance.idleTime !== null && attendance.idleTime > 0 && (
                <div className="text-orange-200">Idle: {formatHoursMinutes(attendance.idleTime)}</div>
              )}
            </div>
          )}
          {attendance && showEmployeeCount && (
            <div className="text-xs space-y-0.5">
              {attendance.presentCount !== undefined && (
                <div>✓ {attendance.presentCount}</div>
              )}
              {attendance.absentCount !== undefined && attendance.absentCount > 0 && (
                <div>✗ {attendance.absentCount}</div>
              )}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">{monthNames[month]} {year}</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={previousMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-sm font-semibold text-gray-600 p-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {renderCalendarDays()}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
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
          <div className="w-4 h-4 rounded bg-purple-100 border border-purple-300"></div>
          <span>Weekend Holiday 🏖️</span>
        </div>
      </div>
    </div>
  );
}
