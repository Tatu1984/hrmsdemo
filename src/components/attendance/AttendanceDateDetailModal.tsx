'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  designation: string;
}

interface AttendanceDetail {
  employee: Employee;
  status: string;
  punchIn?: Date | null;
  punchOut?: Date | null;
  totalHours?: number | null;
  breakDuration?: number | null;
  idleTime?: number | null;
}

interface AttendanceDateDetailModalProps {
  date: Date | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AttendanceDateDetailModal({ date, isOpen, onClose }: AttendanceDateDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState<AttendanceDetail[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    if (date && isOpen) {
      fetchAttendanceData();
    }
  }, [date, isOpen]);

  const fetchAttendanceData = async () => {
    if (!date) return;

    setLoading(true);
    try {
      const dateStr = date.toISOString().split('T')[0];
      const response = await fetch(`/api/attendance?date=${dateStr}`);
      if (response.ok) {
        const data = await response.json();
        setAttendanceData(data);
      }

      // Fetch all employees
      const empResponse = await fetch('/api/employees');
      if (empResponse.ok) {
        const employees = await empResponse.json();
        setAllEmployees(employees);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!date) return null;

  const presentEmployees = attendanceData.filter(a => a.status === 'PRESENT');
  const halfDayEmployees = attendanceData.filter(a => a.status === 'HALF_DAY');
  const leaveEmployees = attendanceData.filter(a => a.status === 'LEAVE');
  const absentEmployeeIds = attendanceData.map(a => a.employee.id);
  const absentEmployees = allEmployees.filter(emp => !absentEmployeeIds.includes(emp.id));

  const formatTime = (date: Date | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Attendance for {date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-gray-500">Loading...</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-green-600">{presentEmployees.length}</div>
                <div className="text-sm text-gray-600">Present</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-yellow-600">{halfDayEmployees.length}</div>
                <div className="text-sm text-gray-600">Half Day</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-blue-600">{leaveEmployees.length}</div>
                <div className="text-sm text-gray-600">On Leave</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-red-600">{absentEmployees.length}</div>
                <div className="text-sm text-gray-600">Absent</div>
              </div>
            </div>

            <Tabs defaultValue="present" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="present">Present ({presentEmployees.length})</TabsTrigger>
                <TabsTrigger value="halfday">Half Day ({halfDayEmployees.length})</TabsTrigger>
                <TabsTrigger value="leave">Leave ({leaveEmployees.length})</TabsTrigger>
                <TabsTrigger value="absent">Absent ({absentEmployees.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="present" className="space-y-2 mt-4">
                {presentEmployees.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No employees present</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Employee</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Punch In</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Punch Out</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Work Hours</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Break</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Idle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {presentEmployees.map((att) => (
                          <tr key={att.employee.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-sm">
                              <div>
                                <div className="font-medium">{att.employee.name}</div>
                                <div className="text-xs text-gray-500">{att.employee.employeeId} • {att.employee.designation}</div>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-sm">{formatTime(att.punchIn)}</td>
                            <td className="px-3 py-2 text-sm">{formatTime(att.punchOut)}</td>
                            <td className="px-3 py-2 text-sm font-semibold text-green-600">
                              {att.totalHours ? `${att.totalHours}h` : '-'}
                            </td>
                            <td className="px-3 py-2 text-sm text-orange-600">
                              {att.breakDuration ? `${att.breakDuration}h` : '-'}
                            </td>
                            <td className="px-3 py-2 text-sm text-pink-600">
                              {att.idleTime ? `${att.idleTime}h` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="halfday" className="space-y-2 mt-4">
                {halfDayEmployees.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No half day records</div>
                ) : (
                  <div className="space-y-2">
                    {halfDayEmployees.map((att) => (
                      <div key={att.employee.id} className="border rounded-lg p-3 bg-yellow-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{att.employee.name}</div>
                            <div className="text-sm text-gray-600">{att.employee.employeeId} • {att.employee.designation}</div>
                          </div>
                          <div className="text-right text-sm">
                            <div>Work: {att.totalHours ? `${att.totalHours}h` : '-'}</div>
                            <div className="text-xs text-gray-500">{formatTime(att.punchIn)} - {formatTime(att.punchOut)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="leave" className="space-y-2 mt-4">
                {leaveEmployees.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No employees on leave</div>
                ) : (
                  <div className="space-y-2">
                    {leaveEmployees.map((att) => (
                      <div key={att.employee.id} className="border rounded-lg p-3 bg-blue-50">
                        <div className="font-medium">{att.employee.name}</div>
                        <div className="text-sm text-gray-600">{att.employee.employeeId} • {att.employee.designation}</div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="absent" className="space-y-2 mt-4">
                {absentEmployees.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No absent employees</div>
                ) : (
                  <div className="space-y-2">
                    {absentEmployees.map((emp) => (
                      <div key={emp.id} className="border rounded-lg p-3 bg-red-50">
                        <div className="font-medium">{emp.name}</div>
                        <div className="text-sm text-gray-600">{emp.employeeId} • {emp.designation}</div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
