'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Check, X } from 'lucide-react';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  permissions: any;
  employee: {
    name: string;
    department: string;
    designation: string;
  } | null;
}

interface UserPermissionsManagerProps {
  users: User[];
}

const AVAILABLE_SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', description: 'View dashboard and analytics' },
  { id: 'employees', label: 'Employees', description: 'Manage employee records' },
  { id: 'attendance', label: 'Attendance', description: 'View and manage attendance' },
  { id: 'leave', label: 'Leave Management', description: 'Approve/reject leave requests' },
  { id: 'projects', label: 'Projects', description: 'Manage projects and milestones' },
  { id: 'tasks', label: 'Tasks', description: 'Assign and track tasks' },
  { id: 'sales', label: 'Sales', description: 'Manage sales and leads' },
  { id: 'leads', label: 'Leads', description: 'Manage CRM leads' },
  { id: 'payroll', label: 'Payroll', description: 'Process and view payroll' },
  { id: 'payroll_settings', label: 'Payroll Settings', description: 'Configure payroll rules' },
  { id: 'accounts', label: 'Accounts', description: 'Manage financial accounts' },
  { id: 'invoices', label: 'Invoices', description: 'Generate and manage invoices' },
  { id: 'hr_documents', label: 'HR Department', description: 'Access HR policies and documents' },
  { id: 'messages', label: 'Messages', description: 'Send and receive messages' },
  { id: 'reports', label: 'Reports', description: 'Generate and view reports' },
  { id: 'company_profile', label: 'Company Profile', description: 'Edit company information' },
  { id: 'settings', label: 'Settings', description: 'Manage system settings' },
];

export function UserPermissionsManager({ users }: UserPermissionsManagerProps) {
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const handleEditUser = (user: User) => {
    setEditingUser(user.id);
    // Parse existing permissions
    const userPerms: Record<string, boolean> = {};
    if (user.permissions) {
      const permsObj = typeof user.permissions === 'string'
        ? JSON.parse(user.permissions)
        : user.permissions;
      AVAILABLE_SECTIONS.forEach(section => {
        userPerms[section.id] = permsObj[section.id] || false;
      });
    } else {
      AVAILABLE_SECTIONS.forEach(section => {
        userPerms[section.id] = false;
      });
    }
    setPermissions(userPerms);
  };

  const handleTogglePermission = (sectionId: string) => {
    setPermissions(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const handleSave = async (userId: string) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/users/${userId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions }),
      });

      if (response.ok) {
        alert('Permissions updated successfully');
        setEditingUser(null);
        window.location.reload();
      } else {
        alert('Failed to update permissions');
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      alert('Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-700';
      case 'MANAGER':
        return 'bg-orange-100 text-orange-700';
      case 'EMPLOYEE':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const countActivePermissions = (user: User) => {
    if (!user.permissions) return 0;
    const permsObj = typeof user.permissions === 'string'
      ? JSON.parse(user.permissions)
      : user.permissions;
    return Object.values(permsObj).filter(Boolean).length;
  };

  return (
    <div className="space-y-4">
      {users.map((user) => (
        <div key={user.id} className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-lg">
                  {user.employee?.name || user.username}
                </h3>
                <Badge className={getRoleBadgeColor(user.role)}>
                  {user.role}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {user.email} • {user.employee?.designation || 'No designation'} • {user.employee?.department || 'No department'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Access to {countActivePermissions(user)} sections
              </p>
            </div>
            {editingUser === user.id ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingUser(null)}
                  disabled={saving}
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSave(user.id)}
                  disabled={saving}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Check className="w-4 h-4 mr-1" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEditUser(user)}
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit Permissions
              </Button>
            )}
          </div>

          {editingUser === user.id && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium mb-3">Select allowed sections:</p>
              <div className="grid grid-cols-2 gap-3">
                {AVAILABLE_SECTIONS.map((section) => (
                  <label
                    key={section.id}
                    className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={permissions[section.id] || false}
                      onChange={() => handleTogglePermission(section.id)}
                      className="mt-1 w-4 h-4"
                    />
                    <div>
                      <div className="font-medium text-sm">{section.label}</div>
                      <div className="text-xs text-gray-500">{section.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {users.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No users found
        </div>
      )}
    </div>
  );
}
