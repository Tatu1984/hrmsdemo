'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Activity,
  Clock,
  Users,
  Circle,
  RefreshCw,
  UserCheck,
  UserX,
  Timer,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface EmployeeStatus {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  designation: string;
  department: string;
  profilePicture: string | null;
  status: 'ACTIVE' | 'IDLE' | 'AWAY' | 'OFFLINE';
  statusColor: 'green' | 'yellow' | 'orange' | 'gray';
  punchIn: string | null;
  punchOut: string | null;
  totalHours: number;
  idleTime: number;
  lastActivity: string | null;
  lastActivityMinutesAgo: number | null;
}

interface StatusSummary {
  active: number;
  idle: number;
  away: number;
  offline: number;
  total: number;
}

export default function EmployeeStatusPage() {
  const [employees, setEmployees] = useState<EmployeeStatus[]>([]);
  const [summary, setSummary] = useState<StatusSummary>({
    active: 0,
    idle: 0,
    away: 0,
    offline: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/employee-status');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees);
        setSummary(data.summary);
        setLastUpdated(new Date(data.timestamp));
      } else {
        console.error('Failed to fetch employee status');
      }
    } catch (error) {
      console.error('Error fetching employee status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Auto-refresh every 30 seconds if enabled
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchStatus();
      }, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const handleManualRefresh = () => {
    setLoading(true);
    fetchStatus();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Circle className="w-3 h-3 fill-green-500 text-green-500" />;
      case 'IDLE':
        return <Circle className="w-3 h-3 fill-yellow-500 text-yellow-500" />;
      case 'AWAY':
        return <Circle className="w-3 h-3 fill-orange-500 text-orange-500" />;
      case 'OFFLINE':
        return <Circle className="w-3 h-3 fill-gray-400 text-gray-400" />;
      default:
        return <Circle className="w-3 h-3 fill-gray-400 text-gray-400" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'default';
      case 'IDLE':
        return 'secondary';
      case 'AWAY':
        return 'outline';
      case 'OFFLINE':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const filteredEmployees =
    filter === 'ALL'
      ? employees
      : employees.filter((emp) => emp.status === filter);

  const formatLastActivity = (minutesAgo: number | null) => {
    if (minutesAgo === null) return 'Never';
    if (minutesAgo < 1) return 'Just now';
    if (minutesAgo < 60) return `${minutesAgo}m ago`;
    const hoursAgo = Math.floor(minutesAgo / 60);
    return `${hoursAgo}h ago`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wifi className="w-8 h-8 text-blue-600" />
            Employee Status
          </h1>
          <p className="text-gray-500 mt-1">
            Real-time employee activity and availability status
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">
            {lastUpdated && (
              <span>Last updated: {format(lastUpdated, 'HH:mm:ss')}</span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={loading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="w-4 h-4 mr-2" />
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            filter === 'ALL' ? 'ring-2 ring-blue-500' : ''
          }`}
          onClick={() => setFilter('ALL')}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Employees</p>
                <p className="text-2xl font-bold">{summary.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            filter === 'ACTIVE' ? 'ring-2 ring-green-500' : ''
          }`}
          onClick={() => setFilter('ACTIVE')}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {summary.active}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            filter === 'IDLE' ? 'ring-2 ring-yellow-500' : ''
          }`}
          onClick={() => setFilter('IDLE')}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Timer className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Idle</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {summary.idle}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            filter === 'AWAY' ? 'ring-2 ring-orange-500' : ''
          }`}
          onClick={() => setFilter('AWAY')}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-orange-100 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Away</p>
                <p className="text-2xl font-bold text-orange-600">
                  {summary.away}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            filter === 'OFFLINE' ? 'ring-2 ring-gray-500' : ''
          }`}
          onClick={() => setFilter('OFFLINE')}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-gray-100 p-3 rounded-lg">
                <WifiOff className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Offline</p>
                <p className="text-2xl font-bold text-gray-600">
                  {summary.offline}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filter === 'ALL' ? 'All Employees' : `${filter} Employees`} (
            {filteredEmployees.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && employees.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
              <span className="ml-3 text-gray-500">Loading employee status...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEmployees.map((employee) => (
                <Card
                  key={employee.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={employee.profilePicture || undefined} />
                          <AvatarFallback className="bg-blue-500 text-white">
                            {employee.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1">
                          {getStatusIcon(employee.status)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate">
                          {employee.name}
                        </h4>
                        <p className="text-xs text-gray-500 truncate">
                          {employee.designation}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant={getStatusBadgeVariant(employee.status)}
                            className="text-xs"
                          >
                            {employee.status}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {employee.employeeId}
                          </span>
                        </div>
                      </div>
                    </div>

                    {employee.status !== 'OFFLINE' && (
                      <div className="mt-3 pt-3 border-t space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Punch In:</span>
                          <span className="font-medium">
                            {employee.punchIn
                              ? format(new Date(employee.punchIn), 'HH:mm')
                              : '-'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Working Hours:</span>
                          <span className="font-medium">
                            {employee.totalHours.toFixed(1)}h
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Last Activity:</span>
                          <span className="font-medium">
                            {formatLastActivity(employee.lastActivityMinutesAgo)}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!loading && filteredEmployees.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <UserX className="w-16 h-16 mx-auto mb-3 opacity-50" />
              <p>No employees found with status: {filter}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <Circle className="w-3 h-3 fill-green-500 text-green-500" />
              <span className="text-gray-600">
                <strong>Active:</strong> Activity in last 5 minutes
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="w-3 h-3 fill-yellow-500 text-yellow-500" />
              <span className="text-gray-600">
                <strong>Idle:</strong> No activity for 5-15 minutes
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="w-3 h-3 fill-orange-500 text-orange-500" />
              <span className="text-gray-600">
                <strong>Away:</strong> No activity for 15+ minutes
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="w-3 h-3 fill-gray-400 text-gray-400" />
              <span className="text-gray-600">
                <strong>Offline:</strong> Not punched in or punched out
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
