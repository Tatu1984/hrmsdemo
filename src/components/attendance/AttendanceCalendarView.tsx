'use client';

import { useState } from 'react';
import { AttendanceCalendar } from './AttendanceCalendar';
import { AttendanceDateDetailModal } from './AttendanceDateDetailModal';

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

interface AttendanceCalendarViewProps {
  attendanceData: AttendanceRecord[];
  showEmployeeCount?: boolean;
}

export function AttendanceCalendarView({ attendanceData, showEmployeeCount = false }: AttendanceCalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDateClick = (date: Date) => {
    if (showEmployeeCount) { // Only show modal in admin view
      setSelectedDate(date);
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <AttendanceCalendar
        attendanceData={attendanceData}
        showEmployeeCount={showEmployeeCount}
        onDateClick={showEmployeeCount ? handleDateClick : undefined}
      />
      {showEmployeeCount && (
        <AttendanceDateDetailModal
          date={selectedDate}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
