'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { History, User, Calendar, FileText, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string | null;
  changes: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export default function ChangeLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    entityType: '',
    userId: '',
    limit: 50,
    offset: 0,
  });

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.entityType) params.append('entityType', filters.entityType);
      if (filters.userId) params.append('userId', filters.userId);
      params.append('limit', filters.limit.toString());
      params.append('offset', filters.offset.toString());

      const response = await fetch(`/api/audit-log?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionBadgeClass = (action: string) => {
    const classes: Record<string, string> = {
      CREATE: 'bg-green-100 text-green-700',
      UPDATE: 'bg-blue-100 text-blue-700',
      DELETE: 'bg-red-100 text-red-700',
    };
    return classes[action] || 'bg-gray-100 text-gray-700';
  };

  const getRoleBadgeClass = (role: string) => {
    const classes: Record<string, string> = {
      ADMIN: 'bg-purple-100 text-purple-700',
      MANAGER: 'bg-orange-100 text-orange-700',
      EMPLOYEE: 'bg-gray-100 text-gray-700',
    };
    return classes[role] || 'bg-gray-100 text-gray-700';
  };

  const renderChanges = (changes: any) => {
    if (!changes || Object.keys(changes).length === 0) {
      return <span className="text-gray-500">No changes recorded</span>;
    }

    return (
      <div className="space-y-1 text-sm">
        {Object.entries(changes).map(([key, value]: [string, any]) => (
          <div key={key} className="flex gap-2">
            <span className="font-medium text-gray-700">{key}:</span>
            <span className="text-red-600 line-through">
              {typeof value.from === 'object' ? JSON.stringify(value.from) : String(value.from)}
            </span>
            <span>→</span>
            <span className="text-green-600">
              {typeof value.to === 'object' ? JSON.stringify(value.to) : String(value.to)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const loadMore = () => {
    setFilters((prev) => ({ ...prev, offset: prev.offset + prev.limit }));
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="w-7 h-7" />
          Change Log
        </h1>
        <p className="text-gray-600">View all system changes and modifications</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entityType">Entity Type</Label>
              <Select
                value={filters.entityType}
                onValueChange={(val) => setFilters({ ...filters, entityType: val, offset: 0 })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="Attendance">Attendance</SelectItem>
                  <SelectItem value="Employee">Employee</SelectItem>
                  <SelectItem value="Payroll">Payroll</SelectItem>
                  <SelectItem value="Leave">Leave</SelectItem>
                  <SelectItem value="Task">Task</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="limit">Records per page</Label>
              <Select
                value={filters.limit.toString()}
                onValueChange={(val) => setFilters({ ...filters, limit: parseInt(val), offset: 0 })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Activity Log ({total} total)</span>
            <span className="text-sm font-normal text-gray-600">
              Showing {filters.offset + 1} - {Math.min(filters.offset + filters.limit, total)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && logs.length === 0 ? (
            <div className="py-12 text-center text-gray-500">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <History className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No change logs found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getActionBadgeClass(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {log.entityType}
                        </span>
                        {log.entityName && (
                          <span className="text-sm font-medium text-gray-700">
                            {log.entityName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span className="font-medium">{log.userName}</span>
                          <span
                            className={`ml-1 px-1.5 py-0.5 rounded text-xs font-medium ${getRoleBadgeClass(
                              log.userRole
                            )}`}
                          >
                            {log.userRole}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(log.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {log.changes && Object.keys(log.changes).length > 0 && (
                    <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                      <div className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Changes:
                      </div>
                      {renderChanges(log.changes)}
                    </div>
                  )}

                  {log.ipAddress && (
                    <div className="mt-2 text-xs text-gray-500">
                      IP: {log.ipAddress}
                    </div>
                  )}
                </div>
              ))}

              {filters.offset + filters.limit < total && (
                <div className="text-center pt-4">
                  <Button onClick={loadMore} variant="outline" disabled={loading}>
                    {loading ? 'Loading...' : 'Load More'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
