import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPermissionsManager } from '@/components/settings/UserPermissionsManager';
import { MessagingPermissionsManager } from '@/components/settings/MessagingPermissionsManager';
import { Shield, MessageSquare } from 'lucide-react';

export default async function SettingsPage() {
  const users = await prisma.user.findMany({
    include: {
      employee: {
        select: {
          name: true,
          department: true,
          designation: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const messagingPermissions = await prisma.messagingPermission.findMany();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-gray-600 mt-2">
          Manage user permissions and messaging controls
        </p>
      </div>

      {/* User Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            User Permissions & Access Control
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UserPermissionsManager users={users} />
        </CardContent>
      </Card>

      {/* Messaging Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Messaging Permissions
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Control who can message whom in the organization
          </p>
        </CardHeader>
        <CardContent>
          <MessagingPermissionsManager users={users} existingPermissions={messagingPermissions} />
        </CardContent>
      </Card>
    </div>
  );
}