'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Users, X, Check } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  email: string;
  designation: string;
}

interface UserMapping {
  id?: string;
  externalId: string;
  externalUsername: string;
  externalEmail: string;
  employeeId?: string;
}

interface UserMappingDialogProps {
  open: boolean;
  onClose: () => void;
  connectionId: string;
  platform: string;
}

export default function UserMappingDialog({ open, onClose, connectionId, platform }: UserMappingDialogProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [mappings, setMappings] = useState<UserMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchEmployees();
      fetchMappings();
    }
  }, [open, connectionId]);

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

  const fetchMappings = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching mappings for connectionId:', connectionId);
      const response = await fetch(`/api/integrations/user-mappings?connectionId=${connectionId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched user mappings:', data);
        setMappings(data);
        if (data.length === 0) {
          setError('No users found. Please sync work items first.');
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch mappings:', response.status, errorText);
        setError(`Failed to fetch users: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('Error fetching mappings:', error);
      setError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (externalEmail: string, employeeId: string) => {
    setMappings(prev =>
      prev.map(mapping =>
        mapping.externalEmail === externalEmail
          ? { ...mapping, employeeId: employeeId || undefined }
          : mapping
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/integrations/user-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId,
          mappings: mappings.filter(m => m.employeeId),
        }),
      });

      if (response.ok) {
        onClose();
      } else {
        alert('Failed to save user mappings');
      }
    } catch (error) {
      console.error('Error saving mappings:', error);
      alert('Error saving user mappings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Map {platform} Users to HRMS Employees
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Map external users from {platform} to employees in your HRMS system. This will help track work items assigned to specific employees.
          </p>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center p-8">
              Loading users...
            </div>
          ) : (
            <>
              {mappings.length === 0 && !error ? (
                <Card>
                  <CardContent className="p-8 text-center text-gray-500">
                    <p>No users found in this integration.</p>
                    <p className="text-sm mt-2">Sync work items first to populate the user list.</p>
                  </CardContent>
                </Card>
              ) : mappings.length > 0 ? (
                <div className="space-y-3">
                  {mappings.map((mapping) => (
                    <Card key={mapping.externalEmail}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-medium">{mapping.externalUsername}</h4>
                            <p className="text-sm text-gray-500">{mapping.externalEmail}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {mapping.employeeId && (
                              <Check className="w-5 h-5 text-green-600" />
                            )}
                            <select
                              value={mapping.employeeId || ''}
                              onChange={(e) => handleMappingChange(mapping.externalEmail, e.target.value)}
                              className="px-3 py-2 border rounded-lg text-sm min-w-[250px]"
                            >
                              <option value="">-- Select Employee --</option>
                              {employees.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                  {emp.name} - {emp.designation}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : null}

              {!loading && (
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={onClose} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving || mappings.length === 0}>
                  {saving ? 'Saving...' : 'Save Mappings'}
                </Button>
              </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
