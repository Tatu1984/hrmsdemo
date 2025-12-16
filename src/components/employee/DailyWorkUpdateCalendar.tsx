'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Save, Trash2, Check, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from 'date-fns';

interface DailyUpdate {
  id: string;
  date: Date;
  workCompleted: string;
  obstaclesOvercome: string | null;
  tasksLeft: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function DailyWorkUpdateCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [workCompleted, setWorkCompleted] = useState('');
  const [obstaclesOvercome, setObstaclesOvercome] = useState('');
  const [tasksLeft, setTasksLeft] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchingUpdate, setFetchingUpdate] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentUpdate, setCurrentUpdate] = useState<DailyUpdate | null>(null);
  const [monthUpdates, setMonthUpdates] = useState<Map<string, DailyUpdate>>(new Map());
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get day names
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calculate leading empty cells
  const firstDayOfWeek = monthStart.getDay();
  const leadingEmptyCells = Array(firstDayOfWeek).fill(null);

  // Fetch updates for the current month
  useEffect(() => {
    const fetchMonthUpdates = async () => {
      const month = format(currentMonth, 'yyyy-MM');
      try {
        const response = await fetch(`/api/daily-work-updates?month=${month}`);
        if (response.ok) {
          const data = await response.json();
          const updatesMap = new Map<string, DailyUpdate>();
          data.updates.forEach((update: DailyUpdate) => {
            const dateKey = format(new Date(update.date), 'yyyy-MM-dd');
            updatesMap.set(dateKey, update);
          });
          setMonthUpdates(updatesMap);
        }
      } catch (error) {
        console.error('Error fetching month updates:', error);
      }
    };
    fetchMonthUpdates();
  }, [currentMonth]);

  // Fetch update for selected date
  useEffect(() => {
    if (!selectedDate) return;

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
          } else {
            setCurrentUpdate(null);
            setWorkCompleted('');
            setObstaclesOvercome('');
            setTasksLeft('');
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
    setSelectedDate(date);
    setIsDialogOpen(true);
    setMessage(null);
  };

  const handleSave = async () => {
    if (!selectedDate || !workCompleted.trim()) {
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
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Daily work update saved successfully!' });
        setCurrentUpdate(data.update);
        // Update the map
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        setMonthUpdates(prev => new Map(prev).set(dateKey, data.update));

        // Close dialog after 1.5 seconds to show success message
        setTimeout(() => {
          setIsDialogOpen(false);
        }, 1500);
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
    if (!currentUpdate || !selectedDate) return;

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
        // Remove from map
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        setMonthUpdates(prev => {
          const newMap = new Map(prev);
          newMap.delete(dateKey);
          return newMap;
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

  const hasUpdate = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return monthUpdates.has(dateKey);
  };

  const getUpdate = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return monthUpdates.get(dateKey);
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
              const dateHasUpdate = hasUpdate(date);
              const update = getUpdate(date);
              const isCurrentDay = isToday(date);

              return (
                <div
                  key={date.toISOString()}
                  className={`bg-white min-h-[100px] p-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                    isCurrentDay ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => handleDateClick(date)}
                >
                  <div className={`text-sm font-medium mb-1 ${isCurrentDay ? 'text-blue-600 font-bold' : 'text-gray-700'}`}>
                    {format(date, 'd')}
                  </div>
                  {dateHasUpdate && update && (
                    <div className="space-y-1">
                      <Badge variant="secondary" className="text-xs w-full">
                        <Check className="w-3 h-3 mr-1" />
                        Updated
                      </Badge>
                      <div className="text-xs text-gray-600 line-clamp-2">
                        {update.workCompleted}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Update Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </DialogTitle>
            <DialogDescription>
              Log your daily work progress for this day
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
