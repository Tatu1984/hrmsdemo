'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { UserPlus, Loader2, Key } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
}

interface UserCredentialsDialogProps {
  employee?: Employee;
  existingUser?: {
    id: string;
    username: string;
    role: string;
    permissions?: any;
  } | null;
}

export function UserCredentialsDialog({ employee, existingUser }: UserCredentialsDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: existingUser?.username || '',
    password: '',
    confirmPassword: '',
    role: existingUser?.role || 'EMPLOYEE',
  });

  const [permissions, setPermissions] = useState({
    dashboard: true,
    employees: false,
    attendance: true,
    leaves: true,
    projects: false,
    tasks: true,
    payroll: false,
    accounts: false,
    invoices: false,
    reports: false,
    leads: false,
    sales: false,
    messages: true,
    settings: false,
  });

  // Load existing permissions when editing
  useEffect(() => {
    if (existingUser?.permissions) {
      setPermissions(existingUser.permissions);
    }
  }, [existingUser]);

  const togglePermission = (key: string) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const permissionSections = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'employees', label: 'Employees' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'leaves', label: 'Leave Management' },
    { key: 'projects', label: 'Projects' },
    { key: 'tasks', label: 'Tasks' },
    { key: 'payroll', label: 'Payroll' },
    { key: 'accounts', label: 'Accounts' },
    { key: 'invoices', label: 'Invoices' },
    { key: 'reports', label: 'Reports' },
    { key: 'leads', label: 'Leads' },
    { key: 'sales', label: 'Sales' },
    { key: 'messages', label: 'Messages' },
    { key: 'settings', label: 'Settings' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!existingUser && formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (!existingUser && formData.password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const url = existingUser ? `/api/users/${existingUser.id}` : '/api/users';
      const method = existingUser ? 'PUT' : 'POST';

      const body: any = {
        username: formData.username,
        role: formData.role,
        permissions: permissions,
      };

      if (employee) {
        body.employeeId = employee.id;
        body.email = employee.email;
      }

      if (formData.password) {
        body.password = formData.password;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save user credentials');
      }

      setOpen(false);
      setFormData({
        username: '',
        password: '',
        confirmPassword: '',
        role: 'EMPLOYEE',
      });
      router.refresh();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {existingUser ? (
          <Button variant="outline" size="sm">
            <Key className="w-4 h-4 mr-2" />
            Edit Access
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <UserPlus className="w-4 h-4 mr-2" />
            Create Login
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingUser ? 'Edit User Access' : 'Create Login Credentials'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {employee && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm">
                <div className="font-semibold">{employee.name}</div>
                <div className="text-gray-600">{employee.email}</div>
                <div className="text-xs text-gray-500">ID: {employee.employeeId}</div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="Enter username"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              {existingUser ? 'New Password (leave blank to keep current)' : 'Password *'}
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter password"
              required={!existingUser}
            />
            <p className="text-xs text-gray-500">Minimum 6 characters</p>
          </div>

          {!existingUser && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Confirm password"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EMPLOYEE">Employee</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 pt-2">
            <Label className="text-sm font-semibold">Section Permissions</Label>
            <div className="border rounded-lg p-4 bg-gray-50 max-h-64 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                {permissionSections.map((section) => (
                  <div key={section.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={section.key}
                      checked={permissions[section.key as keyof typeof permissions]}
                      onCheckedChange={() => togglePermission(section.key)}
                    />
                    <label
                      htmlFor={section.key}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {section.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Select which sections this user can access in the system
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {existingUser ? 'Update Access' : 'Create Login'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
