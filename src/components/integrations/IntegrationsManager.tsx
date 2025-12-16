'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, RefreshCw, Trash2, AlertCircle, CheckCircle2, XCircle, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import AddConnectionDialog from './AddConnectionDialog';
import UserMappingDialog from './UserMappingDialog';

interface Connection {
  id: string;
  platform: 'AZURE_DEVOPS' | 'ASANA' | 'CONFLUENCE';
  name: string;
  organizationUrl?: string;
  workspaceId?: string;
  syncEnabled: boolean;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  lastSyncError?: string;
  isActive: boolean;
  _count: {
    workItems: number;
    commits: number;
    confluencePages: number;
  };
}

export default function IntegrationsManager() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [mappingConnection, setMappingConnection] = useState<{ id: string; platform: string } | null>(null);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      const response = await fetch('/api/integrations/connections');
      if (response.ok) {
        const data = await response.json();
        setConnections(data);
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (connectionId: string) => {
    setSyncing(connectionId);
    try {
      const response = await fetch('/api/integrations/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Sync result:', result);
        // Refresh connections to show updated sync status
        await fetchConnections();
      } else {
        const error = await response.json();
        alert(`Sync failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Error syncing:', error);
      alert('Failed to sync connection');
    } finally {
      setSyncing(null);
    }
  };

  const handleDelete = async (connectionId: string) => {
    try {
      const response = await fetch(`/api/integrations/connections?id=${connectionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setConnections(connections.filter(c => c.id !== connectionId));
        setDeleteConfirm(null);
      } else {
        alert('Failed to delete connection');
      }
    } catch (error) {
      console.error('Error deleting connection:', error);
      alert('Failed to delete connection');
    }
  };

  const getPlatformIcon = (platform: string) => {
    if (platform === 'AZURE_DEVOPS') {
      return (
        <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-sm">
          AZ
        </div>
      );
    } else {
      return (
        <div className="w-10 h-10 bg-pink-500 rounded flex items-center justify-center text-white font-bold text-sm">
          AS
        </div>
      );
    }
  };

  const getSyncStatusBadge = (status?: string) => {
    if (!status) {
      return <Badge variant="secondary">Never synced</Badge>;
    }

    switch (status) {
      case 'SUCCESS':
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Success
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case 'PARTIAL':
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
            <AlertCircle className="w-3 h-3 mr-1" />
            Partial
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            <span>Loading integrations...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-600">
            {connections.length} connection{connections.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Connection
        </Button>
      </div>

      {/* Connections Grid */}
      {connections.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <RefreshCw className="w-16 h-16 mx-auto mb-4" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No integrations configured</h3>
            <p className="text-gray-500 mb-6">
              Connect Azure DevOps or Asana to start syncing work items
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Connection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {connections.map((connection) => (
            <Card key={connection.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getPlatformIcon(connection.platform)}
                    <div>
                      <CardTitle className="text-lg">{connection.name}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        {connection.platform === 'AZURE_DEVOPS' ? 'Azure DevOps' : 'Asana'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteConfirm(connection.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Connection Info */}
                <div className="text-sm space-y-1">
                  {connection.organizationUrl && (
                    <div className="text-gray-600 truncate">
                      {connection.organizationUrl}
                    </div>
                  )}
                  {connection.workspaceId && (
                    <div className="text-gray-600">
                      Workspace: {connection.workspaceId}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex gap-4 text-sm">
                  {connection.platform !== 'CONFLUENCE' && (
                    <>
                      <div>
                        <span className="text-gray-500">Work Items:</span>
                        <span className="ml-2 font-semibold">{connection._count.workItems}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Commits:</span>
                        <span className="ml-2 font-semibold">{connection._count.commits}</span>
                      </div>
                    </>
                  )}
                  {connection.platform === 'CONFLUENCE' && (
                    <div>
                      <span className="text-gray-500">Pages:</span>
                      <span className="ml-2 font-semibold">{connection._count.confluencePages}</span>
                    </div>
                  )}
                </div>

                {/* Sync Status */}
                <div className="pt-4 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Sync Status:</span>
                    {getSyncStatusBadge(connection.lastSyncStatus)}
                  </div>

                  {connection.lastSyncAt && (
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="w-3 h-3 mr-1" />
                      Last synced: {format(new Date(connection.lastSyncAt), 'MMM d, h:mm a')}
                    </div>
                  )}

                  {connection.lastSyncError && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      {connection.lastSyncError}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleSync(connection.id)}
                    disabled={syncing === connection.id}
                  >
                    {syncing === connection.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sync Now
                      </>
                    )}
                  </Button>
                  {connection.platform !== 'CONFLUENCE' && (
                    <Button
                      variant="outline"
                      onClick={() => setMappingConnection({ id: connection.id, platform: connection.platform })}
                      disabled={connection._count.workItems === 0}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Map Users
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Connection Dialog */}
      <AddConnectionDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSuccess={() => {
          setShowAddDialog(false);
          fetchConnections();
        }}
      />

      {/* User Mapping Dialog */}
      {mappingConnection && (
        <UserMappingDialog
          open={!!mappingConnection}
          onClose={() => setMappingConnection(null)}
          connectionId={mappingConnection.id}
          platform={mappingConnection.platform}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Connection?</DialogTitle>
            <DialogDescription>
              This will permanently delete the connection and all synced work items and commits.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
