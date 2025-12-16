'use client';

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Loader2, Save, Trash2, Check, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  designation: string;
}

interface DailyUpdate {
  id: string;
  date: Date;
  workCompleted: string;
  obstaclesOvercome: string | null;
  tasksLeft: string | null;
  taggedEmployees: string[];
  createdAt: Date;
  updatedAt: Date;
}

export default function DailyWorkUpdate() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [workCompleted, setWorkCompleted] = useState('');
  const [obstaclesOvercome, setObstaclesOvercome] = useState('');
  const [tasksLeft, setTasksLeft] = useState('');
  const [taggedEmployees, setTaggedEmployees] = useState<string[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchingUpdate, setFetchingUpdate] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentUpdate, setCurrentUpdate] = useState<DailyUpdate | null>(null);
  const [datesWithUpdates, setDatesWithUpdates] = useState<Set<string>>(new Set());

  // Fetch all employees for tagging
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch('/api/employees');
        if (response.ok) {
          const data = await response.json();
          setAllEmployees(data.employees || []);
        }
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };
    fetchEmployees();
  }, []);

  // Fetch updates for the current month to show indicators
  useEffect(() => {
    const fetchMonthUpdates = async () => {
      const month = format(selectedDate, 'yyyy-MM');
      try {
        const response = await fetch(`/api/daily-work-updates?month=${month}`);
        if (response.ok) {
          const data = await response.json();
          const dates = new Set(
            data.updates.map((u: DailyUpdate) => format(new Date(u.date), 'yyyy-MM-dd'))
          );
          setDatesWithUpdates(dates);
        }
      } catch (error) {
        console.error('Error fetching month updates:', error);
      }
    };
    fetchMonthUpdates();
  }, [selectedDate]);

  // Fetch update for selected date
  useEffect(() => {
    const fetchUpdateForDate = async () => {
      setFetchingUpdate(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      try {
        const response = await fetch(`/api/daily-work-updates?date=${dateStr}`);
        if (response.ok) {
          const data = await response.json();
          if (data.updates && data.updates.length > 0) {
            const update = data.updates[0];
            setCurrentUpdate(update);
            setWorkCompleted(update.workCompleted || '');
            setObstaclesOvercome(update.obstaclesOvercome || '');
            setTasksLeft(update.tasksLeft || '');
            setTaggedEmployees(update.taggedEmployees || []);
          } else {
            // No update for this date
            setCurrentUpdate(null);
            setWorkCompleted('');
            setObstaclesOvercome('');
            setTasksLeft('');
            setTaggedEmployees([]);
          }
        }
      } catch (error) {
        console.error('Error fetching update for date:', error);
      } finally {
        setFetchingUpdate(false);
      }
    };

    fetchUpdateForDate();
  }, [selectedDate]);

  const handleSave = async () => {
    if (!workCompleted.trim()) {
      setMessage({ type: 'error', text: 'Please enter what work you completed.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/daily-work-updates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: format(selectedDate, 'yyyy-MM-dd'),
          workCompleted,
          obstaclesOvercome,
          tasksLeft,
          taggedEmployees: taggedEmployees.length > 0 ? taggedEmployees : null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Daily work update saved successfully!' });
        setCurrentUpdate(data.update);
        // Update the dates with updates
        setDatesWithUpdates(prev => new Set([...prev, format(selectedDate, 'yyyy-MM-dd')]));
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save update' });
      }
    } catch (error) {
      console.error('Error saving update:', error);
      setMessage({ type: 'error', text: 'An error occurred while saving' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentUpdate) return;

    if (!confirm('Are you sure you want to delete this update?')) return;

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/daily-work-updates?id=${currentUpdate.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Update deleted successfully!' });
        setCurrentUpdate(null);
        setWorkCompleted('');
        setObstaclesOvercome('');
        setTasksLeft('');
        setTaggedEmployees([]);
        // Remove from dates with updates
        setDatesWithUpdates(prev => {
          const newSet = new Set(prev);
          newSet.delete(format(selectedDate, 'yyyy-MM-dd'));
          return newSet;
        });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete update' });
      }
    } catch (error) {
      console.error('Error deleting update:', error);
      setMessage({ type: 'error', text: 'An error occurred while deleting' });
    } finally {
      setLoading(false);
    }
  };

  const toggleTagEmployee = (employeeId: string) => {
    setTaggedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const getTaggedEmployeeNames = () => {
    return allEmployees
      .filter(emp => taggedEmployees.includes(emp.id))
      .map(emp => emp.name);
  };

  // Custom modifiers for calendar
  const modifiers = {
    hasUpdate: (date: Date) => {
      return datesWithUpdates.has(format(date, 'yyyy-MM-dd'));
    },
  };

  const modifiersClassNames = {
    hasUpdate: 'bg-green-100 dark:bg-green-900 font-bold',
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Daily Work Update</CardTitle>
          <CardDescription>
            Select a date from the calendar and log your daily work progress. Days with updates are highlighted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Calendar Section */}
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                modifiers={modifiers}
                modifiersClassNames={modifiersClassNames}
                className="rounded-md border"
              />
            </div>

            {/* Form Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Update for {format(selectedDate, 'MMMM dd, yyyy')}
                </h3>
                {currentUpdate && (
                  <Badge variant="outline" className="bg-green-50">
                    <Check className="w-3 h-3 mr-1" />
                    Saved
                  </Badge>
                )}
              </div>

              {message && (
                <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                  {message.type === 'error' ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <span className="ml-2">{message.text}</span>
                </Alert>
              )}

              {fetchingUpdate ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="workCompleted">
                      Work Completed <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="workCompleted"
                      placeholder="Describe the work you completed today..."
                      value={workCompleted}
                      onChange={(e) => setWorkCompleted(e.target.value)}
                      rows={4}
                      className="resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="obstaclesOvercome">Obstacles Overcome</Label>
                    <Textarea
                      id="obstaclesOvercome"
                      placeholder="Any challenges or obstacles you overcame..."
                      value={obstaclesOvercome}
                      onChange={(e) => setObstaclesOvercome(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tasksLeft">Tasks Left</Label>
                    <Textarea
                      id="tasksLeft"
                      placeholder="What tasks are remaining..."
                      value={tasksLeft}
                      onChange={(e) => setTasksLeft(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tag People for Assistance</Label>
                    <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                      {allEmployees.map((employee) => (
                        <div
                          key={employee.id}
                          className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer"
                          onClick={() => toggleTagEmployee(employee.id)}
                        >
                          <input
                            type="checkbox"
                            checked={taggedEmployees.includes(employee.id)}
                            onChange={() => toggleTagEmployee(employee.id)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{employee.name}</p>
                            <p className="text-xs text-gray-500">{employee.designation}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {taggedEmployees.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {getTaggedEmployeeNames().map((name) => (
                          <Badge key={name} variant="secondary">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={handleSave}
                      disabled={saving || !workCompleted.trim()}
                      className="flex-1"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Update
                        </>
                      )}
                    </Button>
                    {currentUpdate && (
                      <Button
                        onClick={handleDelete}
                        disabled={loading}
                        variant="destructive"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
