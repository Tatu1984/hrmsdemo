'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Monitor,
  Eye,
  EyeOff,
  LogIn,
  LogOut,
  Maximize2,
  Minimize2,
  MousePointer,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Globe,
  Smartphone,
  Tablet,
  Clock,
  User,
} from 'lucide-react';

interface BrowserActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  employeeId: string | null;
  eventType: string;
  sessionId: string | null;
  tabId: string | null;
  browserName: string | null;
  browserVersion: string | null;
  osName: string | null;
  osVersion: string | null;
  deviceType: string | null;
  screenResolution: string | null;
  timezone: string | null;
  language: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  pageUrl: string | null;
  pagePath: string | null;
  duration: number | null;
  metadata: any;
  createdAt: string;
}

interface UniqueUser {
  userId: string;
  userName: string;
  userRole: string;
}

const eventTypeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  TAB_OPENED: { label: 'Tab Opened', icon: <Monitor className="h-4 w-4" />, color: 'bg-green-100 text-green-800' },
  TAB_CLOSED: { label: 'Tab Closed', icon: <LogOut className="h-4 w-4" />, color: 'bg-red-100 text-red-800' },
  TAB_VISIBLE: { label: 'Tab Visible', icon: <Eye className="h-4 w-4" />, color: 'bg-blue-100 text-blue-800' },
  TAB_HIDDEN: { label: 'Tab Hidden', icon: <EyeOff className="h-4 w-4" />, color: 'bg-gray-100 text-gray-800' },
  TAB_FOCUSED: { label: 'Tab Focused', icon: <MousePointer className="h-4 w-4" />, color: 'bg-indigo-100 text-indigo-800' },
  TAB_BLURRED: { label: 'Tab Blurred', icon: <EyeOff className="h-4 w-4" />, color: 'bg-slate-100 text-slate-800' },
  SESSION_START: { label: 'Session Start', icon: <LogIn className="h-4 w-4" />, color: 'bg-emerald-100 text-emerald-800' },
  SESSION_END: { label: 'Session End', icon: <LogOut className="h-4 w-4" />, color: 'bg-orange-100 text-orange-800' },
  PAGE_LOAD: { label: 'Page Load', icon: <Globe className="h-4 w-4" />, color: 'bg-cyan-100 text-cyan-800' },
  PAGE_UNLOAD: { label: 'Page Unload', icon: <LogOut className="h-4 w-4" />, color: 'bg-amber-100 text-amber-800' },
  WINDOW_MINIMIZED: { label: 'Window Minimized', icon: <Minimize2 className="h-4 w-4" />, color: 'bg-purple-100 text-purple-800' },
  WINDOW_RESTORED: { label: 'Window Restored', icon: <Maximize2 className="h-4 w-4" />, color: 'bg-teal-100 text-teal-800' },
};

const deviceIcons: Record<string, React.ReactNode> = {
  Desktop: <Monitor className="h-4 w-4" />,
  Mobile: <Smartphone className="h-4 w-4" />,
  Tablet: <Tablet className="h-4 w-4" />,
};

export default function BrowserActivityPage() {
  const [logs, setLogs] = useState<BrowserActivityLog[]>([]);
  const [users, setUsers] = useState<UniqueUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);

  // Filters
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      params.append('offset', ((page - 1) * limit).toString());

      if (selectedUser) params.append('userId', selectedUser);
      if (selectedEventType) params.append('eventType', selectedEventType);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/browser-activity?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setLogs(data.logs);
        setTotal(data.total);
        if (data.users) {
          setUsers(data.users);
        }
      }
    } catch (error) {
      console.error('Error fetching browser activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, selectedUser, selectedEventType, startDate, endDate]);

  const filteredLogs = logs.filter((log) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        log.userName.toLowerCase().includes(query) ||
        log.pagePath?.toLowerCase().includes(query) ||
        log.ipAddress?.toLowerCase().includes(query) ||
        log.browserName?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(total / limit);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const clearFilters = () => {
    setSelectedUser('');
    setSelectedEventType('');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setPage(1);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Browser Activity Log</h1>
        <p className="text-gray-600 mt-1">
          Track when users open, close, minimize, or switch tabs in the HRMS application
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* User Filter */}
          <select
            value={selectedUser}
            onChange={(e) => {
              setSelectedUser(e.target.value);
              setPage(1);
            }}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Users</option>
            {users.map((user) => (
              <option key={user.userId} value={user.userId}>
                {user.userName} ({user.userRole})
              </option>
            ))}
          </select>

          {/* Event Type Filter */}
          <select
            value={selectedEventType}
            onChange={(e) => {
              setSelectedEventType(e.target.value);
              setPage(1);
            }}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Events</option>
            {Object.entries(eventTypeConfig).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>

          {/* Date Range */}
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Start Date"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="End Date"
          />
        </div>

        <div className="flex justify-between items-center mt-4">
          <button
            onClick={clearFilters}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Clear Filters
          </button>
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Monitor className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{total}</p>
              <p className="text-sm text-gray-500">Total Events</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <User className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              <p className="text-sm text-gray-500">Unique Users</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <LogIn className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {logs.filter((l) => l.eventType === 'SESSION_START').length}
              </p>
              <p className="text-sm text-gray-500">Sessions (page)</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <EyeOff className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {logs.filter((l) => l.eventType === 'TAB_HIDDEN').length}
              </p>
              <p className="text-sm text-gray-500">Tab Hides (page)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Log Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Page
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Device / Browser
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                    <p className="mt-2 text-gray-500">Loading...</p>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Monitor className="h-8 w-8 mx-auto text-gray-400" />
                    <p className="mt-2 text-gray-500">No activity logs found</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const eventConfig = eventTypeConfig[log.eventType] || {
                    label: log.eventType,
                    icon: <Monitor className="h-4 w-4" />,
                    color: 'bg-gray-100 text-gray-800',
                  };

                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {format(new Date(log.createdAt), 'MMM dd, yyyy')}
                            </p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(log.createdAt), 'HH:mm:ss')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{log.userName}</p>
                          <p className="text-xs text-gray-500">{log.userRole}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${eventConfig.color}`}
                        >
                          {eventConfig.icon}
                          {eventConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p
                          className="text-sm text-gray-900 truncate max-w-[200px]"
                          title={log.pagePath || ''}
                        >
                          {log.pagePath || '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {deviceIcons[log.deviceType || 'Desktop'] || (
                            <Monitor className="h-4 w-4 text-gray-400" />
                          )}
                          <div>
                            <p className="text-sm text-gray-900">
                              {log.browserName || 'Unknown'} {log.browserVersion || ''}
                            </p>
                            <p className="text-xs text-gray-500">
                              {log.osName || 'Unknown'} {log.osVersion || ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-600 font-mono">{log.ipAddress || '-'}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-600">{formatDuration(log.duration)}</p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="p-2 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="p-2 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
