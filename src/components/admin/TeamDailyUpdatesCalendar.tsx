'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths } from 'date-fns';

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  designation: string;
}

interface DailyUpdate {
  id: string;
  employeeId: string;
  date: Date;
  workCompleted: string;
  obstaclesOvercome: string | null;
  tasksLeft: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface UpdateWithEmployee extends DailyUpdate {
  employee?: Employee;
}

export default function TeamDailyUpdatesCalendar({ employees }: { employees: Employee[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [monthUpdates, setMonthUpdates] = useState<Map<string, UpdateWithEmployee[]>>(new Map());
  const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const firstDayOfWeek = monthStart.getDay();
  const leadingEmptyCells = Array(firstDayOfWeek).fill(null);

  // Create employee map for quick lookup
  const employeeMap = new Map(employees.map(emp => [emp.id, emp]));

  // Fetch updates for the current month
  useEffect(() => {
    const fetchMonthUpdates = async () => {
      setLoading(true);
      const month = format(currentMonth, 'yyyy-MM');
      try {
        const response = await fetch(`/api/daily-work-updates?month=${month}`);
        if (response.ok) {
          const data = await response.json();
          const updatesMap = new Map<string, UpdateWithEmployee[]>();

          data.updates.forEach((update: DailyUpdate) => {
            const dateKey = format(new Date(update.date), 'yyyy-MM-dd');
            if (!updatesMap.has(dateKey)) {
              updatesMap.set(dateKey, []);
            }
            // Add employee info to update
            const updateWithEmployee = {
              ...update,
              employee: employeeMap.get(update.employeeId),
            };
            updatesMap.get(dateKey)!.push(updateWithEmployee);
          });

          setMonthUpdates(updatesMap);
        }
      } catch (error) {
        console.error('Error fetching month updates:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMonthUpdates();
  }, [currentMonth]);

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
    const updatesForDay = monthUpdates.get(dateKey);
    if (updatesForDay && updatesForDay.length > 0) {
      setSelectedDate(date);
      setIsDateDialogOpen(true);
    }
  };

  const handleEmployeeClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsEmployeeDialogOpen(true);
  };

  const getUpdatesForDate = (date: Date): UpdateWithEmployee[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return monthUpdates.get(dateKey) || [];
  };

  const getUpdateForEmployee = (employeeId: string): UpdateWithEmployee | undefined => {
    if (!selectedDate) return undefined;
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const updates = monthUpdates.get(dateKey) || [];
    return updates.find(u => u.employeeId === employeeId);
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
              const updatesForDay = getUpdatesForDate(date);
              const hasUpdates = updatesForDay.length > 0;
              const isCurrentDay = isToday(date);

              return (
                <div
                  key={date.toISOString()}
                  className={`bg-white min-h-[100px] p-2 ${
                    hasUpdates ? 'cursor-pointer hover:bg-gray-50' : ''
                  } transition-colors ${isCurrentDay ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => hasUpdates && handleDateClick(date)}
                >
                  <div className={`text-sm font-medium mb-1 ${isCurrentDay ? 'text-blue-600 font-bold' : 'text-gray-700'}`}>
                    {format(date, 'd')}
                  </div>
                  {hasUpdates && (
                    <div className="space-y-1">
                      <Badge variant="secondary" className="text-xs w-full flex items-center justify-center gap-1">
                        <Users className="w-3 h-3" />
                        {updatesForDay.length} {updatesForDay.length === 1 ? 'update' : 'updates'}
                      </Badge>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Dialog for showing employees who updated on selected date */}
      <Dialog open={isDateDialogOpen} onOpenChange={setIsDateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </DialogTitle>
            <DialogDescription>
              Employees who logged updates on this day
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {selectedDate && getUpdatesForDate(selectedDate).map((update) => (
              <Card
                key={update.id}
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => update.employee && handleEmployeeClick(update.employee)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{update.employee?.name || 'Unknown Employee'}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {update.employee?.designation}
                        </Badge>
                        <span className="text-xs text-gray-500">{update.employee?.employeeId}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      View Details →
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                    {update.workCompleted}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog for showing individual employee update */}
      <Dialog open={isEmployeeDialogOpen} onOpenChange={setIsEmployeeDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEmployee?.name}</DialogTitle>
            <DialogDescription>
              {selectedDate && format(selectedDate, 'MMMM d, yyyy')} - Daily Work Update
            </DialogDescription>
          </DialogHeader>

          {selectedEmployee && (() => {
            const update = getUpdateForEmployee(selectedEmployee.id);
            if (!update) return <p className="text-gray-500">No update found</p>;

            return (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{selectedEmployee.designation}</Badge>
                  <span className="text-sm text-gray-500">{selectedEmployee.employeeId}</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 mb-2">Work Completed:</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                      {update.workCompleted}
                    </p>
                  </div>

                  {update.obstaclesOvercome && (
                    <div>
                      <h4 className="font-semibold text-sm text-gray-700 mb-2">Obstacles Overcome:</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                        {update.obstaclesOvercome}
                      </p>
                    </div>
                  )}

                  {update.tasksLeft && (
                    <div>
                      <h4 className="font-semibold text-sm text-gray-700 mb-2">Tasks Left:</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                        {update.tasksLeft}
                      </p>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 pt-2 border-t">
                    Last updated: {format(new Date(update.updatedAt), 'MMM d, yyyy h:mm a')}
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
