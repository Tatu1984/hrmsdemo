'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Check, X, Info } from 'lucide-react';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  employee: {
    name: string;
    department: string;
    designation: string;
  } | null;
}

interface MessagingPermission {
  id: string;
  userId: string;
  canMessagePeers: boolean;
  canMessageManager: boolean;
  canMessageDirector: boolean;
  allowedRecipients: string | null;
}

interface MessagingPermissionsManagerProps {
  users: User[];
  existingPermissions: MessagingPermission[];
}

export function MessagingPermissionsManager({ users, existingPermissions }: MessagingPermissionsManagerProps) {
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<{
    canMessagePeers: boolean;
    canMessageManager: boolean;
    canMessageDirector: boolean;
  }>({
    canMessagePeers: true,
    canMessageManager: true,
    canMessageDirector: false,
  });
  const [saving, setSaving] = useState(false);

  const getUserPermission = (userId: string) => {
    return existingPermissions.find(p => p.userId === userId);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user.id);
    const existing = getUserPermission(user.id);
    if (existing) {
      setPermissions({
        canMessagePeers: existing.canMessagePeers,
        canMessageManager: existing.canMessageManager,
        canMessageDirector: existing.canMessageDirector,
      });
    } else {
      // Default permissions
      setPermissions({
        canMessagePeers: true,
        canMessageManager: true,
        canMessageDirector: user.role === 'ADMIN', // Admins can message directors by default
      });
    }
  };

  const handleSave = async (userId: string) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/users/${userId}/messaging-permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(permissions),
      });

      if (response.ok) {
        alert('Messaging permissions updated successfully');
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

  const getPermissionSummary = (user: User) => {
    const perm = getUserPermission(user.id);
    if (!perm) return 'Default permissions';

    const allowed = [];
    if (perm.canMessagePeers) allowed.push('Peers');
    if (perm.canMessageManager) allowed.push('Manager');
    if (perm.canMessageDirector) allowed.push('Directors');

    return allowed.length > 0 ? `Can message: ${allowed.join(', ')}` : 'No messaging allowed';
  };

  return (
    <div className="space-y-4">
      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-medium mb-1">Messaging Hierarchy</p>
          <ul className="list-disc list-inside space-y-1 text-blue-800">
            <li><strong>Peers:</strong> Employees at the same level</li>
            <li><strong>Manager:</strong> Direct reporting manager</li>
            <li><strong>Directors/Founder:</strong> Top-level management (restricted by default)</li>
          </ul>
        </div>
      </div>

      {users.map((user) => {
        const perm = getUserPermission(user.id);

        return (
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
                  {getPermissionSummary(user)}
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
                  Edit
                </Button>
              )}
            </div>

            {editingUser === user.id && (
              <div className="mt-4 pt-4 border-t space-y-3">
                <p className="text-sm font-medium mb-3">Messaging permissions:</p>

                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={permissions.canMessagePeers}
                    onChange={(e) => setPermissions({ ...permissions, canMessagePeers: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-medium text-sm">Can message peers</div>
                    <div className="text-xs text-gray-500">Allow messaging employees at the same level</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={permissions.canMessageManager}
                    onChange={(e) => setPermissions({ ...permissions, canMessageManager: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-medium text-sm">Can message manager</div>
                    <div className="text-xs text-gray-500">Allow messaging their direct reporting manager</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={permissions.canMessageDirector}
                    onChange={(e) => setPermissions({ ...permissions, canMessageDirector: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-medium text-sm">Can message directors/founder</div>
                    <div className="text-xs text-gray-500">Allow messaging top-level management (typically restricted)</div>
                  </div>
                </label>
              </div>
            )}
          </div>
        );
      })}

      {users.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No users found
        </div>
      )}
    </div>
  );
}
