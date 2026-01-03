'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Timer,
  Clock,
  Coffee,
  Pause,
  TrendingUp,
  Download,
  FileText,
  RefreshCw,
  Loader2,
  Search,
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { exportTimeAnalyticsToCSV, exportToPDF } from '@/lib/export-utils';

interface TimeAnalyticsSummary {
  totalWorkHours: number;
  totalBreakHours: number;
  totalIdleHours: number;
  averageWorkHours: number;
  employeeCount: number;
  daysAnalyzed: number;
}

interface ChartDataPoint {
  date: string;
  workHours: number;
  breakHours: number;
  idleHours: number;
}

interface EmployeeChartData {
  name: string;
  employeeId: string;
  workHours: number;
  breakHours: number;
  idleHours: number;
}

interface DistributionData {
  category: string;
  hours: number;
  percentage: number;
}

interface EmployeeDetail {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  totalWorkHours: number;
  totalBreakHours: number;
  totalIdleHours: number;
  daysPresent: number;
  avgDailyHours: number;
}

interface TimeAnalyticsResponse {
  summary: TimeAnalyticsSummary;
  chartData: {
    byDate: ChartDataPoint[];
    byEmployee: EmployeeChartData[];
    distribution: DistributionData[];
  };
  employeeDetails: EmployeeDetail[];
}

const COLORS = {
  work: '#f97316',    // orange-500
  break: '#f59e0b',   // amber-500
  idle: '#d97706',    // amber-600
};

const PIE_COLORS = ['#f97316', '#f59e0b', '#d97706'];

function formatHoursMinutes(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

export default function TimeAnalyticsPage() {
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [startDate, setStartDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [endDate, setEndDate] = useState<Date>(endOfWeek(new Date(), { weekStartsOn: 1 }));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TimeAnalyticsResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'workHours' | 'name' | 'department'>('workHours');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Get unique departments
  const departments = useMemo(() => {
    if (!data?.employeeDetails) return [];
    const depts = new Set(data.employeeDetails.map(e => e.department));
    return Array.from(depts).filter(d => d !== 'N/A').sort();
  }, [data?.employeeDetails]);

  // Filter and sort employee details
  const filteredEmployees = useMemo(() => {
    if (!data?.employeeDetails) return [];

    let filtered = data.employeeDetails;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        e =>
          e.employeeName.toLowerCase().includes(term) ||
          e.employeeId.toLowerCase().includes(term) ||
          e.department.toLowerCase().includes(term)
      );
    }

    // Department filter
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(e => e.department === departmentFilter);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'workHours':
          comparison = a.totalWorkHours - b.totalWorkHours;
          break;
        case 'name':
          comparison = a.employeeName.localeCompare(b.employeeName);
          break;
        case 'department':
          comparison = a.department.localeCompare(b.department);
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [data?.employeeDetails, searchTerm, departmentFilter, sortBy, sortOrder]);

  // Update date range when view changes
  useEffect(() => {
    const now = new Date();
    switch (view) {
      case 'day':
        setStartDate(now);
        setEndDate(now);
        break;
      case 'week':
        setStartDate(startOfWeek(now, { weekStartsOn: 1 }));
        setEndDate(endOfWeek(now, { weekStartsOn: 1 }));
        break;
      case 'month':
        setStartDate(startOfMonth(now));
        setEndDate(endOfMonth(now));
        break;
    }
  }, [view]);

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        view,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      });

      const response = await fetch(`/api/time-analytics?${params}`);
      if (!response.ok) throw new Error('Failed to fetch data');

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching time analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  // Navigation handlers
  const navigatePrev = () => {
    switch (view) {
      case 'day':
        setStartDate(prev => subDays(prev, 1));
        setEndDate(prev => subDays(prev, 1));
        break;
      case 'week':
        setStartDate(prev => subWeeks(prev, 1));
        setEndDate(prev => subWeeks(prev, 1));
        break;
      case 'month':
        setStartDate(prev => startOfMonth(subMonths(prev, 1)));
        setEndDate(prev => endOfMonth(subMonths(prev, 1)));
        break;
    }
  };

  const navigateNext = () => {
    switch (view) {
      case 'day':
        setStartDate(prev => addDays(prev, 1));
        setEndDate(prev => addDays(prev, 1));
        break;
      case 'week':
        setStartDate(prev => addWeeks(prev, 1));
        setEndDate(prev => addWeeks(prev, 1));
        break;
      case 'month':
        setStartDate(prev => startOfMonth(addMonths(prev, 1)));
        setEndDate(prev => endOfMonth(addMonths(prev, 1)));
        break;
    }
  };

  const goToToday = () => {
    const now = new Date();
    switch (view) {
      case 'day':
        setStartDate(now);
        setEndDate(now);
        break;
      case 'week':
        setStartDate(startOfWeek(now, { weekStartsOn: 1 }));
        setEndDate(endOfWeek(now, { weekStartsOn: 1 }));
        break;
      case 'month':
        setStartDate(startOfMonth(now));
        setEndDate(endOfMonth(now));
        break;
    }
  };

  // Export handlers
  const handleExportCSV = () => {
    if (!data?.employeeDetails) return;
    exportTimeAnalyticsToCSV(data.employeeDetails, {
      start: format(startDate, 'yyyy-MM-dd'),
      end: format(endDate, 'yyyy-MM-dd'),
    });
  };

  const handleExportPDF = () => {
    exportToPDF(`Time Analytics - ${format(startDate, 'MMM dd')} to ${format(endDate, 'MMM dd, yyyy')}`);
  };

  // Format date range display
  const dateRangeDisplay = () => {
    if (view === 'day') {
      return format(startDate, 'EEEE, MMM dd, yyyy');
    }
    return `${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd, yyyy')}`;
  };

  return (
    <div className="p-6 space-y-6 print:p-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 no-print">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-orange-500 flex items-center justify-center">
            <Timer className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Time Analytics</h1>
            <p className="text-gray-600">Track work hours, breaks, and productivity</p>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!data}>
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={!data}>
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Date Navigation */}
      <Card className="no-print">
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* View Selector */}
            <div className="flex gap-2">
              <Button
                variant={view === 'day' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('day')}
              >
                Day
              </Button>
              <Button
                variant={view === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('week')}
              >
                Week
              </Button>
              <Button
                variant={view === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('month')}
              >
                Month
              </Button>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={navigatePrev}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-sm font-medium min-w-[200px] text-center">
                {dateRangeDisplay()}
              </div>
              <Button variant="outline" size="sm" onClick={navigateNext}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
            </div>

            {/* Custom Date Range */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <input
                type="date"
                value={format(startDate, 'yyyy-MM-dd')}
                onChange={(e) => setStartDate(new Date(e.target.value))}
                className="px-2 py-1 border rounded text-sm"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={format(endDate, 'yyyy-MM-dd')}
                onChange={(e) => setEndDate(new Date(e.target.value))}
                className="px-2 py-1 border rounded text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatHoursMinutes(data.summary.totalWorkHours)}</p>
                    <p className="text-sm text-gray-600">Total Work Hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Coffee className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatHoursMinutes(data.summary.totalBreakHours)}</p>
                    <p className="text-sm text-gray-600">Total Break Hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <Pause className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatHoursMinutes(data.summary.totalIdleHours)}</p>
                    <p className="text-sm text-gray-600">Total Idle Hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatHoursMinutes(data.summary.averageWorkHours)}</p>
                    <p className="text-sm text-gray-600">Avg per Employee</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Info Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {data.summary.employeeCount} Employees
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {data.summary.daysAnalyzed} Days Analyzed
            </Badge>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Time Trends Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Time Trends</CardTitle>
              </CardHeader>
              <CardContent>
                {data.chartData.byDate.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.chartData.byDate}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value: number) => formatHoursMinutes(value)}
                        labelStyle={{ fontWeight: 'bold' }}
                      />
                      <Legend />
                      <Bar dataKey="workHours" name="Work" fill={COLORS.work} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="breakHours" name="Break" fill={COLORS.break} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="idleHours" name="Idle" fill={COLORS.idle} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-500">
                    No data available for the selected period
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Time Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Time Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {data.chartData.distribution.some(d => d.hours > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.chartData.distribution}
                        dataKey="hours"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ category, percentage }) => `${category}: ${percentage}%`}
                        labelLine={false}
                      >
                        {data.chartData.distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatHoursMinutes(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-500">
                    No data available for the selected period
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Employee Details Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle className="text-lg">Employee Details</CardTitle>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 no-print">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search employees..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-[200px]"
                    />
                  </div>

                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="workHours">Work Hours</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="department">Department</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortOrder === 'desc' ? '↓' : '↑'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Employee</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Department</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Work Hours</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Break Hours</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Idle Hours</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Days Present</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Avg Daily</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredEmployees.length > 0 ? (
                      filteredEmployees.map((emp) => (
                        <tr key={emp.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{emp.employeeName}</p>
                              <p className="text-sm text-gray-500">{emp.employeeId}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline">{emp.department}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-orange-600">
                            {formatHoursMinutes(emp.totalWorkHours)}
                          </td>
                          <td className="px-4 py-3 text-right text-amber-600">
                            {formatHoursMinutes(emp.totalBreakHours)}
                          </td>
                          <td className="px-4 py-3 text-right text-yellow-600">
                            {formatHoursMinutes(emp.totalIdleHours)}
                          </td>
                          <td className="px-4 py-3 text-right">{emp.daysPresent}</td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatHoursMinutes(emp.avgDailyHours)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                          No employees found matching your criteria
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Failed to load data. Please try again.
          </CardContent>
        </Card>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
