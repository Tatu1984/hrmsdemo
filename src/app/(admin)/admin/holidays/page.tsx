'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Plus, Trash2, CalendarDays, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Holiday {
  id: string;
  name: string;
  date: Date;
  year: number;
  isOptional: boolean;
  description: string | null;
}

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [newHoliday, setNewHoliday] = useState({
    name: '',
    date: '',
    isOptional: false,
    description: '',
  });

  useEffect(() => {
    fetchHolidays();
  }, [selectedYear]);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/holidays?year=${selectedYear}`);
      if (response.ok) {
        const data = await response.json();
        setHolidays(data);
      }
    } catch (error) {
      console.error('Error fetching holidays:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddHoliday = async () => {
    if (!newHoliday.name || !newHoliday.date) {
      alert('Please fill in name and date');
      return;
    }

    try {
      const url = editingHoliday ? `/api/holidays?id=${editingHoliday.id}` : '/api/holidays';
      const method = editingHoliday ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHoliday),
      });

      if (response.ok) {
        alert(editingHoliday ? 'Holiday updated successfully' : 'Holiday added successfully');
        setShowAddDialog(false);
        setEditingHoliday(null);
        setNewHoliday({ name: '', date: '', isOptional: false, description: '' });
        fetchHolidays();
      } else {
        const data = await response.json();
        alert(data.error || `Failed to ${editingHoliday ? 'update' : 'add'} holiday`);
      }
    } catch (error) {
      console.error(`Error ${editingHoliday ? 'updating' : 'adding'} holiday:`, error);
      alert(`Failed to ${editingHoliday ? 'update' : 'add'} holiday`);
    }
  };

  const handleEditHoliday = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setNewHoliday({
      name: holiday.name,
      date: new Date(holiday.date).toISOString().split('T')[0],
      isOptional: holiday.isOptional,
      description: holiday.description || '',
    });
    setShowAddDialog(true);
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;

    try {
      const response = await fetch(`/api/holidays?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Holiday deleted successfully');
        fetchHolidays();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete holiday');
      }
    } catch (error) {
      console.error('Error deleting holiday:', error);
      alert('Failed to delete holiday');
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 1; i <= currentYear + 2; i++) {
      years.push(i);
    }
    return years;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="w-7 h-7" />
            Holiday Management
          </h1>
          <p className="text-gray-600">Manage company holidays and observances</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Holiday
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Holidays Calendar
            </CardTitle>
            <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getYears().map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-gray-500">Loading holidays...</div>
          ) : holidays.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <CalendarDays className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No holidays found for {selectedYear}</p>
              <p className="text-sm mt-2">Click &quot;Add Holiday&quot; to create one</p>
            </div>
          ) : (
            <div className="space-y-2">
              {holidays.map((holiday) => (
                <div
                  key={holiday.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{holiday.name}</h3>
                      {holiday.isOptional && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                          Optional
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{formatDate(holiday.date)}</p>
                    {holiday.description && (
                      <p className="text-sm text-gray-500 mt-1">{holiday.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditHoliday(holiday)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteHoliday(holiday.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={(open) => {
        setShowAddDialog(open);
        if (!open) {
          setEditingHoliday(null);
          setNewHoliday({ name: '', date: '', isOptional: false, description: '' });
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Holiday Name</Label>
              <Input
                id="name"
                placeholder="e.g., Republic Day"
                value={newHoliday.name}
                onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={newHoliday.date}
                onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Holiday Type</Label>
              <Select
                value={newHoliday.isOptional ? 'optional' : 'mandatory'}
                onValueChange={(val) => setNewHoliday({ ...newHoliday, isOptional: val === 'optional' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mandatory">Mandatory Holiday</SelectItem>
                  <SelectItem value="optional">Optional Holiday</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="Additional information"
                value={newHoliday.description}
                onChange={(e) => setNewHoliday({ ...newHoliday, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddDialog(false);
              setEditingHoliday(null);
              setNewHoliday({ name: '', date: '', isOptional: false, description: '' });
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddHoliday}>{editingHoliday ? 'Update Holiday' : 'Add Holiday'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
