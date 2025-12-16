'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

interface EditAttendanceDialogProps {
  attendance: AttendanceRecord | null;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function EditAttendanceDialog({ attendance, open, onClose, onUpdate }: EditAttendanceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    status: '',
    date: '',
    punchIn: '',
    punchOut: '',
    totalHours: 0,
    breakDuration: 0,
  });

  useEffect(() => {
    if (attendance) {
      // Fix date timezone issue - use local date string to avoid off-by-one errors
      const attendanceDate = new Date(attendance.date);
      const year = attendanceDate.getFullYear();
      const month = String(attendanceDate.getMonth() + 1).padStart(2, '0');
      const day = String(attendanceDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const punchInTime = attendance.punchIn
        ? new Date(attendance.punchIn).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
        : '';
      const punchOutTime = attendance.punchOut
        ? new Date(attendance.punchOut).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
        : '';

      setFormData({
        status: attendance.status,
        date: dateStr,
        punchIn: punchInTime,
        punchOut: punchOutTime,
        totalHours: attendance.totalHours || 0,
        breakDuration: attendance.breakDuration || 0,
      });
    }
  }, [attendance]);

  const handleForcePunchOut = async () => {
    if (!attendance || !attendance.punchIn || attendance.punchOut) return;

    const confirmed = confirm('Force punch out this employee? This will set punch out time to 6:00 PM.');
    if (!confirmed) return;

    setLoading(true);
    try {
      const punchOutTime = new Date(attendance.date);
      punchOutTime.setHours(18, 0, 0, 0);

      const punchIn = new Date(attendance.punchIn);
      const totalHours = (punchOutTime.getTime() - punchIn.getTime()) / (1000 * 60 * 60);

      const response = await fetch('/api/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceId: attendance.id,
          punchOut: punchOutTime,
          totalHours: totalHours,
          status: 'PRESENT',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to force punch out');
      }

      onUpdate();
      onClose();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendance) return;

    setLoading(true);
    try {
      // Combine date with punch times
      const punchInDateTime = formData.punchIn
        ? new Date(`${formData.date}T${formData.punchIn}`)
        : null;
      const punchOutDateTime = formData.punchOut
        ? new Date(`${formData.date}T${formData.punchOut}`)
        : null;

      // Check if this is an update (existing record) or create (new record)
      const hasId = (attendance.id !== null &&
                     attendance.id !== undefined &&
                     attendance.id !== '' &&
                     attendance.id.length > 0);

      if (hasId) {
        // Update existing record using PUT
        const response = await fetch('/api/attendance', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attendanceId: attendance.id,
            status: formData.status,
            date: new Date(formData.date),
            punchIn: punchInDateTime,
            punchOut: punchOutDateTime,
            totalHours: parseFloat(formData.totalHours.toString()) || 0,
            breakDuration: parseFloat(formData.breakDuration.toString()) || 0,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || 'Failed to update attendance');
        }

        // Success
      } else {
        // Create new attendance record using POST
        const payload = {
          employeeId: attendance.employeeId,
          status: formData.status,
          date: new Date(formData.date),
          punchIn: punchInDateTime,
          punchOut: punchOutDateTime,
          totalHours: parseFloat(formData.totalHours.toString()) || 0,
          breakDuration: parseFloat(formData.breakDuration.toString()) || 0,
        };

        const response = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || 'Failed to create attendance');
        }

        // Success
      }

      onUpdate();
      onClose();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!attendance) return null;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{attendance.id ? 'Edit' : 'Create'} Attendance Record</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="font-medium">{attendance.employee.name}</div>
            <div className="text-sm text-gray-600">
              {attendance.employee.employeeId} • {attendance.employee.designation}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRESENT">Present</SelectItem>
                <SelectItem value="HALF_DAY">Half Day</SelectItem>
                <SelectItem value="ABSENT">Absent</SelectItem>
                <SelectItem value="LEAVE">Leave</SelectItem>
                <SelectItem value="HOLIDAY">Holiday</SelectItem>
                <SelectItem value="WEEKEND">Weekend</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="punchIn">Punch In</Label>
              <Input
                id="punchIn"
                type="time"
                value={formData.punchIn}
                onChange={(e) => setFormData({ ...formData, punchIn: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="punchOut">Punch Out</Label>
              <Input
                id="punchOut"
                type="time"
                value={formData.punchOut}
                onChange={(e) => setFormData({ ...formData, punchOut: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalHours">Total Hours</Label>
              <Input
                id="totalHours"
                type="number"
                step="0.1"
                value={formData.totalHours}
                onChange={(e) => setFormData({ ...formData, totalHours: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="breakDuration">Break (hours)</Label>
              <Input
                id="breakDuration"
                type="number"
                step="0.1"
                value={formData.breakDuration}
                onChange={(e) => setFormData({ ...formData, breakDuration: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <div>
              {attendance.punchIn && !attendance.punchOut && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleForcePunchOut}
                  disabled={loading}
                  size="sm"
                >
                  Force Punch Out
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
