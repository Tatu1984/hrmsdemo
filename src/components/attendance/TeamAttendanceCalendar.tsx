'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Users, Clock, Coffee, AlertCircle, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths } from 'date-fns';
import { formatHoursMinutes } from '@/lib/utils';

/**
 * Client-side helper functions for weekend cascade logic
 */
function isFriday(date: Date): boolean {
  return date.getDay() === 5;
}

function isMonday(date: Date): boolean {
  return date.getDay() === 1;
}

function isSaturday(date: Date): boolean {
  return date.getDay() === 6;
}

function isSunday(date: Date): boolean {
  return date.getDay() === 0;
}

function isWeekendDay(date: Date): boolean {
  return date.getDay() === 0 || date.getDay() === 6;
}

function getNextDay(date: Date): Date {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  nextDay.setHours(0, 0, 0, 0);
  return nextDay;
}

function getPreviousDay(date: Date): Date {
  const prevDay = new Date(date);
  prevDay.setDate(prevDay.getDate() - 1);
  prevDay.setHours(0, 0, 0, 0);
  return prevDay;
}

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  designation: string;
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  punchIn: string | null;
  punchOut: string | null;
  totalHours: number | null;
  breakDuration: number | null;
  breakStart: string | null;
  breakEnd: string | null;
  idleTime: number | null;
  status: string;
  employee?: Employee;
}

interface ActivityLog {
  id: string;
  timestamp: string;
  active: boolean;
  suspicious: boolean;
  patternType: string | null;
  patternDetails: string | null;
}

interface DailyWorkUpdate {
  id: string;
  workCompleted: string;
  obstaclesOvercome: string | null;
  tasksLeft: string | null;
}

export default function TeamAttendanceCalendar({ employees }: { employees: Employee[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedAttendanceRecord, setSelectedAttendanceRecord] = useState<AttendanceRecord | null>(null);
  const [monthAttendance, setMonthAttendance] = useState<Map<string, AttendanceRecord[]>>(new Map());
  const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [dailyUpdate, setDailyUpdate] = useState<DailyWorkUpdate | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const firstDayOfWeek = monthStart.getDay();
  const leadingEmptyCells = Array(firstDayOfWeek).fill(null);

  // Use useMemo to prevent employeeMap from being recreated on every render
  const employeeMap = useMemo(
    () => new Map(employees.map(emp => [emp.id, emp])),
    [employees]
  );

  // Fetch attendance for the current month
  useEffect(() => {
    let isMounted = true;

    const fetchMonthAttendance = async () => {
      if (!isMounted) return;

      setLoading(true);
      setError(null);
      const startDate = format(monthStart, 'yyyy-MM-dd');
      const endDate = format(monthEnd, 'yyyy-MM-dd');

      try {
        const response = await fetch(`/api/attendance?startDate=${startDate}&endDate=${endDate}`);

        if (!isMounted) return;

        if (response.ok) {
          const data = await response.json();

          if (!Array.isArray(data)) {
            console.error('Expected array but got:', typeof data);
            if (isMounted) {
              setError('Invalid data format received from server');
              setLoading(false);
            }
            return;
          }

          const attendanceMap = new Map<string, AttendanceRecord[]>();

          data.forEach((record: AttendanceRecord) => {
            const dateKey = format(new Date(record.date), 'yyyy-MM-dd');
            if (!attendanceMap.has(dateKey)) {
              attendanceMap.set(dateKey, []);
            }
            attendanceMap.get(dateKey)!.push({
              ...record,
              employee: employeeMap.get(record.employeeId),
            });
          });

          if (isMounted) {
            setMonthAttendance(attendanceMap);
            setLoading(false);
          }
        } else {
          const errorData = await response.json().catch(() => ({ error: response.statusText }));
          console.error('Failed to fetch attendance:', errorData);
          if (isMounted) {
            setError(errorData.error || 'Failed to load attendance data');
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Error fetching attendance:', error);
        if (isMounted) {
          setError(error instanceof Error ? error.message : 'Network error - please check your connection');
          setLoading(false);
        }
      }
    };

    fetchMonthAttendance();

    return () => {
      isMounted = false;
    };
  }, [currentMonth, monthStart, monthEnd, employeeMap]);

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
  };

  const handleDateClick = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const attendanceForDay = monthAttendance.get(dateKey);
    if (attendanceForDay && attendanceForDay.length > 0) {
      setSelectedDate(date);
      setIsDateDialogOpen(true);
    }
  };

  const handleEmployeeClick = async (employee: Employee, attendanceRecord: AttendanceRecord) => {
    setSelectedEmployee(employee);
    setSelectedAttendanceRecord(attendanceRecord);
    setDetailsLoading(true);
    setActivityLogs([]);
    setDailyUpdate(null);
    setIsEmployeeDialogOpen(true);

    try {
      // Fetch activity logs
      const activityResponse = await fetch(`/api/attendance/activity?attendanceId=${attendanceRecord.id}`);
      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setActivityLogs(activityData.activityLogs || []);
      } else {
        console.error('Failed to fetch activity logs');
      }

      // Fetch daily work update
      const dateStr = format(new Date(attendanceRecord.date), 'yyyy-MM-dd');
      const updateResponse = await fetch(`/api/daily-work-updates?employeeId=${employee.id}&date=${dateStr}`);
      if (updateResponse.ok) {
        const updateData = await updateResponse.json();
        setDailyUpdate(updateData.updates?.[0] || null);
      } else {
        console.error('Failed to fetch daily work update');
      }
    } catch (error) {
      console.error('Error fetching employee details:', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const getAttendanceForDate = (date: Date): AttendanceRecord[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return monthAttendance.get(dateKey) || [];
  };

  const getAttendanceStats = (attendance: AttendanceRecord[]) => {
    const present = attendance.filter(a => a.status === 'PRESENT').length;
    const halfDay = attendance.filter(a => a.status === 'HALF_DAY').length;
    const absent = attendance.filter(a => a.status === 'ABSENT').length;
    const totalIdle = attendance.reduce((sum, a) => sum + (a.idleTime || 0), 0);
    const avgIdleTime = attendance.length > 0 ? totalIdle / attendance.length : 0;

    return { present, halfDay, absent, avgIdleTime };
  };

  /**
   * Check if a weekend day should be marked as absent due to adjacent weekday absence
   * for a specific employee
   */
  const getWeekendCascadeInfoForEmployee = (
    date: Date,
    employeeId: string
  ): { isCascaded: boolean; reason: string | null } => {
    // Only check weekend days
    if (!isWeekendDay(date)) {
      return { isCascaded: false, reason: null };
    }

    // Check if Saturday - look for Friday absence
    if (isSaturday(date)) {
      const fridayDate = getPreviousDay(date);
      const fridayDateKey = format(fridayDate, 'yyyy-MM-dd');
      const fridayAttendance = monthAttendance.get(fridayDateKey);
      const employeeFridayRecord = fridayAttendance?.find(a => a.employeeId === employeeId);
      if (employeeFridayRecord?.status === 'ABSENT') {
        return { isCascaded: true, reason: 'Friday was absent' };
      }
    }

    // Check if Sunday - look for Monday absence
    if (isSunday(date)) {
      const mondayDate = getNextDay(date);
      const mondayDateKey = format(mondayDate, 'yyyy-MM-dd');
      const mondayAttendance = monthAttendance.get(mondayDateKey);
      const employeeMondayRecord = mondayAttendance?.find(a => a.employeeId === employeeId);
      if (employeeMondayRecord?.status === 'ABSENT') {
        return { isCascaded: true, reason: 'Monday was absent' };
      }
    }

    return { isCascaded: false, reason: null };
  };

  const getIdleColor = (idleTime: number | null) => {
    if (!idleTime) return 'text-green-600';
    if (idleTime < 0.5) return 'text-green-600'; // < 30 min
    if (idleTime < 1) return 'text-yellow-600'; // 30-60 min
    if (idleTime < 2) return 'text-orange-600'; // 1-2 hours
    return 'text-red-600'; // > 2 hours
  };

  return (
    <div className="space-y-4">
      {/* Header with navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleToday}>
                Today
              </Button>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={handlePreviousMonth}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <h2 className="text-xl font-semibold ml-4">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          {!loading && error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span className="font-semibold">Error loading attendance data:</span>
              </div>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {loading && (
            <div className="mb-4 flex items-center justify-center py-4 bg-blue-50 rounded-lg">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-sm text-gray-600">Loading attendance data...</span>
            </div>
          )}

          <div className="grid grid-cols-7 gap-px bg-gray-200">
            {/* Day headers */}
            {dayNames.map((day) => (
              <div key={day} className="bg-white p-2 text-center font-semibold text-sm text-gray-700">
                {day}
              </div>
            ))}

            {/* Leading empty cells */}
            {leadingEmptyCells.map((_, index) => (
              <div key={`empty-${index}`} className="bg-gray-50 min-h-[100px]"></div>
            ))}

            {/* Days of month */}
            {daysInMonth.map((date) => {
              const attendanceForDay = getAttendanceForDate(date);
              const hasAttendance = attendanceForDay.length > 0;
              const isCurrentDay = isToday(date);
              const stats = getAttendanceStats(attendanceForDay);

              return (
                <div
                  key={date.toISOString()}
                  className={`bg-white min-h-[100px] p-2 border border-transparent transition-all ${
                    hasAttendance
                      ? 'cursor-pointer hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm'
                      : 'cursor-default'
                  } ${isCurrentDay ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => {
                    if (hasAttendance) {
                      console.log('Date clicked:', format(date, 'yyyy-MM-dd'), 'Records:', attendanceForDay.length);
                      handleDateClick(date);
                    }
                  }}
                >
                  <div className={`text-sm font-medium mb-1 ${isCurrentDay ? 'text-blue-600 font-bold' : 'text-gray-700'}`}>
                    {format(date, 'd')}
                  </div>
                  {hasAttendance && (
                    <div className="space-y-1">
                      <Badge variant="secondary" className="text-xs w-full flex items-center justify-center gap-1">
                        <Users className="w-3 h-3" />
                        {attendanceForDay.length}
                      </Badge>
                      {stats.present > 0 && (
                        <div className="text-xs text-green-600">✓ {stats.present}</div>
                      )}
                      {stats.avgIdleTime > 0 && (
                        <div className={`text-xs ${getIdleColor(stats.avgIdleTime)}`}>
                          ⏱ {formatHoursMinutes(stats.avgIdleTime)}
                        </div>
                      )}
                    </div>
                  )}
                  {!hasAttendance && (
                    <div className="text-xs text-gray-400 text-center mt-4">
                      No data
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!loading && monthAttendance.size === 0 && (
            <div className="mt-4 text-center text-sm text-gray-500 bg-blue-50 p-3 rounded">
              ℹ️ No attendance records for this month. Days will be clickable once employees punch in/out.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Date Dialog - Shows all employees who worked that day */}
      <Dialog open={isDateDialogOpen} onOpenChange={setIsDateDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </DialogTitle>
            <DialogDescription>
              Team attendance for this day
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            <TooltipProvider>
              {selectedDate && getAttendanceForDate(selectedDate).map((record) => {
                const cascadeInfo = selectedDate ? getWeekendCascadeInfoForEmployee(selectedDate, record.employeeId) : { isCascaded: false, reason: null };
                const displayStatus = cascadeInfo.isCascaded && record.status === 'WEEKEND' ? 'ABSENT' : record.status;

                return (
                  <Card
                    key={record.id}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => record.employee && handleEmployeeClick(record.employee, record)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold">{record.employee?.name || 'Unknown Employee'}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {record.employee?.designation}
                            </Badge>
                            <span className="text-xs text-gray-500">{record.employee?.employeeId}</span>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <Badge variant={displayStatus === 'PRESENT' ? 'default' : displayStatus === 'ABSENT' ? 'destructive' : 'secondary'}>
                            {displayStatus}
                          </Badge>
                          {cascadeInfo.isCascaded && (
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className="w-4 h-4 text-orange-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Marked absent: {cascadeInfo.reason}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                  <div className="grid grid-cols-4 gap-4 mt-3 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Total Hours</p>
                      <p className="font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatHoursMinutes(record.totalHours)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Break</p>
                      <p className="font-semibold flex items-center gap-1">
                        <Coffee className="w-3 h-3" />
                        {formatHoursMinutes(record.breakDuration)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Idle Time</p>
                      <p className={`font-semibold flex items-center gap-1 ${getIdleColor(record.idleTime)}`}>
                        <AlertCircle className="w-3 h-3" />
                        {formatHoursMinutes(record.idleTime)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Active Work</p>
                      <p className="font-semibold text-green-600">
                        {formatHoursMinutes((record.totalHours || 0) - (record.idleTime || 0))}
                      </p>
                    </div>
                  </div>
                  {((record as any).punchInIp || (record as any).punchOutIp) && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-gray-500 text-xs font-semibold mb-2">IP Addresses</p>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {(record as any).punchInIp && (
                          <div className="flex flex-col">
                            <span className="text-gray-500 mb-1">Punch In:</span>
                            <span className="font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              {(record as any).punchInIp}
                            </span>
                          </div>
                        )}
                        {(record as any).punchOutIp && (
                          <div className="flex flex-col">
                            <span className="text-gray-500 mb-1">Punch Out:</span>
                            <span className="font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              {(record as any).punchOutIp}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
                );
              })}
            </TooltipProvider>
          </div>
        </DialogContent>
      </Dialog>

      {/* Employee Detail Dialog - Shows activity timeline and daily update */}
      <Dialog open={isEmployeeDialogOpen} onOpenChange={setIsEmployeeDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEmployee?.name}</DialogTitle>
            <DialogDescription>
              {selectedDate && format(selectedDate, 'MMMM d, yyyy')} - Detailed Activity Report
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Daily Work Update Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Daily Work Update</h3>
              {detailsLoading ? (
                <div className="space-y-3">
                  <div className="bg-gray-100 p-4 rounded-lg animate-pulse">
                    <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-3/4"></div>
                  </div>
                  <div className="bg-gray-100 p-4 rounded-lg animate-pulse">
                    <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                  </div>
                </div>
              ) : dailyUpdate ? (
                <div className="space-y-3">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-sm text-gray-700 mb-2">Work Completed:</h4>
                    <p className="text-sm text-gray-600">{dailyUpdate.workCompleted}</p>
                  </div>
                  {dailyUpdate.obstaclesOvercome && (
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-sm text-gray-700 mb-2">Obstacles Overcome:</h4>
                      <p className="text-sm text-gray-600">{dailyUpdate.obstaclesOvercome}</p>
                    </div>
                  )}
                  {dailyUpdate.tasksLeft && (
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-sm text-gray-700 mb-2">Tasks Left:</h4>
                      <p className="text-sm text-gray-600">{dailyUpdate.tasksLeft}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                  <p className="text-sm">No daily work update submitted</p>
                </div>
              )}
            </div>

            {/* Break Time Section */}
            {selectedAttendanceRecord && (selectedAttendanceRecord.breakStart || selectedAttendanceRecord.breakDuration) && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Coffee className="w-5 h-5" />
                  Break Time
                </h3>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {selectedAttendanceRecord.breakStart && (
                        <div>
                          <p className="text-xs text-gray-500">Break Start</p>
                          <p className="font-mono text-purple-600 font-semibold">
                            {format(new Date(selectedAttendanceRecord.breakStart), 'HH:mm:ss')}
                          </p>
                        </div>
                      )}
                      {selectedAttendanceRecord.breakEnd && (
                        <div>
                          <p className="text-xs text-gray-500">Break End</p>
                          <p className="font-mono text-purple-600 font-semibold">
                            {format(new Date(selectedAttendanceRecord.breakEnd), 'HH:mm:ss')}
                          </p>
                        </div>
                      )}
                      {selectedAttendanceRecord.breakStart && !selectedAttendanceRecord.breakEnd && (
                        <Badge variant="secondary" className="bg-purple-200 text-purple-800">
                          On Break
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Total Break Duration</p>
                      <p className="font-semibold text-purple-700 text-lg">
                        {formatHoursMinutes(selectedAttendanceRecord.breakDuration)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Activity Timeline Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3">
                Activity Timeline {!detailsLoading && `(${activityLogs.length} heartbeats)`}
                {!detailsLoading && activityLogs.some(log => log.suspicious) && (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    ⚠️ Suspicious Activity Detected
                  </Badge>
                )}
              </h3>
              {detailsLoading ? (
                <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between animate-pulse">
                      <div className="h-4 bg-gray-300 rounded w-24"></div>
                      <div className="h-6 bg-gray-300 rounded w-16"></div>
                    </div>
                  ))}
                </div>
              ) : activityLogs.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto bg-gray-50 p-4 rounded-lg">
                  {activityLogs.map((log, index) => {
                    const nextLog = activityLogs[index + 1];
                    const gap = nextLog
                      ? (new Date(nextLog.timestamp).getTime() - new Date(log.timestamp).getTime()) / (1000 * 60)
                      : 0;
                    const isLongGap = gap > 5;
                    const isSuspicious = log.suspicious;

                    return (
                      <div key={log.id}>
                        <div className={`flex items-center justify-between text-sm ${isSuspicious ? 'bg-red-50 p-2 rounded border border-red-200' : ''}`}>
                          <span className={`font-mono ${isSuspicious ? 'text-red-600 font-bold' : 'text-blue-600'}`}>
                            {format(new Date(log.timestamp), 'HH:mm:ss')}
                          </span>
                          <div className="flex items-center gap-2">
                            {isSuspicious ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="destructive" className="text-xs font-bold">
                                      ⚠️ Suspicious
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-semibold">{log.patternType?.replace(/_/g, ' ') || 'Unknown Pattern'}</p>
                                    {log.patternDetails && <p className="text-xs">{log.patternDetails}</p>}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Active
                              </Badge>
                            )}
                          </div>
                        </div>
                        {isSuspicious && log.patternType && (
                          <div className="flex items-center gap-2 my-1 text-xs text-red-700 bg-red-100 p-2 rounded font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{log.patternType.replace(/_/g, ' ')}: {log.patternDetails || 'Bot/automation pattern detected'}</span>
                          </div>
                        )}
                        {isLongGap && (
                          <div className="flex items-center gap-2 my-1 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                            <AlertCircle className="w-3 h-3" />
                            <span>{gap.toFixed(0)} minute gap (possible idle time)</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No activity logs found</p>
                  <p className="text-xs">Employee may have been idle the entire shift</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
