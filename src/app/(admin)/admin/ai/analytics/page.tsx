'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  Search,
  Loader2,
  Sparkles,
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  FolderKanban,
  AlertCircle,
  CheckCircle,
  Info,
  Clock,
  ArrowRight,
  RefreshCw,
  PieChart
} from 'lucide-react';

interface QueryResult {
  queryId: string;
  result: Record<string, unknown>;
  timestamp: string;
}

interface AvailableQuery {
  id: string;
  label: string;
  category: string;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Employees: Users,
  Attendance: Calendar,
  Leaves: Calendar,
  Payroll: DollarSign,
  Projects: FolderKanban,
  Sales: TrendingUp,
  Insights: Sparkles,
};

export default function AIAnalyticsPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availableQueries, setAvailableQueries] = useState<AvailableQuery[]>([]);
  const [categories, setCategories] = useState<Record<string, { id: string; label: string }[]>>({});
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const [quickStats, setQuickStats] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetchAvailableQueries();
    fetchQuickStats();
  }, []);

  const fetchAvailableQueries = async () => {
    try {
      const response = await fetch('/api/ai/dashboard-analytics');
      if (response.ok) {
        const data = await response.json();
        setAvailableQueries(data.queries || []);
        setCategories(data.categories || {});
      }
    } catch (err) {
      console.error('Failed to fetch queries:', err);
    }
  };

  const fetchQuickStats = async () => {
    try {
      const response = await fetch('/api/ai/stats');
      if (response.ok) {
        const data = await response.json();
        setQuickStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch quick stats:', err);
    }
  };

  const executeQuery = async (queryId?: string, naturalQuery?: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/ai/dashboard-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queryId,
          naturalQuery: naturalQuery || query,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Query failed');
      }

      const data = await response.json();
      setResult(data);

      const queryText = naturalQuery || query;
      if (queryText && !recentQueries.includes(queryText)) {
        setRecentQueries(prev => [queryText, ...prev.slice(0, 4)]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      executeQuery(undefined, query.trim());
    }
  };

  const renderResultContent = () => {
    if (!result?.result) return null;

    const data = result.result as Record<string, unknown>;

    if ('insights' in data) {
      const insights = data.insights as Array<{ type: string; message: string; action: string | null }>;
      return (
        <div className="space-y-3">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg flex items-start gap-3 ${
                insight.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                insight.type === 'alert' ? 'bg-red-50 border border-red-200' :
                insight.type === 'success' ? 'bg-green-50 border border-green-200' :
                'bg-blue-50 border border-blue-200'
              }`}
            >
              {insight.type === 'warning' ? <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" /> :
               insight.type === 'alert' ? <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" /> :
               insight.type === 'success' ? <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" /> :
               <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />}
              <div className="flex-1">
                <p className="font-medium">{insight.message}</p>
                {insight.action && (
                  <Button variant="link" size="sm" className="p-0 h-auto mt-1">
                    {insight.action} <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if ('data' in data && Array.isArray(data.data)) {
      const chartData = data.data as Array<Record<string, unknown>>;
      const chartType = data.chartType as string;

      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {chartType === 'pie' ? <PieChart className="h-5 w-5" /> : <BarChart3 className="h-5 w-5" />}
            <span className="text-sm text-muted-foreground">{chartData.length} items</span>
          </div>
          <div className="grid gap-2">
            {chartData.map((item, idx) => {
              const label = Object.values(item)[0] as string;
              const value = Object.values(item)[1] as number;
              const maxValue = Math.max(...chartData.map(d => Object.values(d)[1] as number));
              const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if ('leaves' in data) {
      const leaves = data.leaves as Array<Record<string, unknown>>;
      return (
        <div className="space-y-3">
          <Badge variant="outline">{data.count} pending</Badge>
          {leaves.length === 0 ? (
            <p className="text-muted-foreground text-sm">No pending leaves</p>
          ) : (
            leaves.map((leave, idx) => (
              <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{leave.employee as string}</p>
                    <p className="text-sm text-muted-foreground">{leave.department as string}</p>
                  </div>
                  <Badge>{leave.type as string}</Badge>
                </div>
                <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                  <span>{leave.days} days</span>
                  <span>From: {new Date(leave.startDate as string).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      );
    }

    if ('projects' in data) {
      const projects = data.projects as Array<Record<string, unknown>>;
      return (
        <div className="space-y-3">
          <Badge variant="outline">{data.count} active projects</Badge>
          {projects.length === 0 ? (
            <p className="text-muted-foreground text-sm">No active projects</p>
          ) : (
            projects.map((project, idx) => (
              <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                <div className="flex justify-between items-start">
                  <p className="font-medium">{project.name as string}</p>
                  <Badge variant="secondary">{project.memberCount} members</Badge>
                </div>
                <div className="flex gap-4 mt-2 text-sm">
                  <span className="text-muted-foreground">
                    Tasks: {project.completedTasks}/{project.totalTasks}
                  </span>
                  {project.budget && (
                    <span className="text-green-600">
                      {project.currency} {(project.budget as number).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      );
    }

    if ('tasks' in data) {
      const tasks = data.tasks as Array<Record<string, unknown>>;
      return (
        <div className="space-y-3">
          <Badge variant={tasks.length > 0 ? "destructive" : "outline"}>{data.count} overdue</Badge>
          {tasks.length === 0 ? (
            <p className="text-green-600 text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> No overdue tasks
            </p>
          ) : (
            tasks.map((task, idx) => (
              <div key={idx} className="p-3 bg-red-50 border border-red-100 rounded-lg">
                <div className="flex justify-between items-start">
                  <p className="font-medium">{task.title as string}</p>
                  <Badge variant="outline">{task.priority as string}</Badge>
                </div>
                <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                  <span>Assignee: {task.assignee as string}</span>
                  <span>Due: {new Date(task.dueDate as string).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(data)
          .filter(([key]) => key !== 'title' && key !== 'chartType')
          .map(([key, value]) => (
            <div key={key} className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </p>
              <p className="text-2xl font-bold mt-1">
                {typeof value === 'number' ? value.toLocaleString() :
                 typeof value === 'string' ? value : JSON.stringify(value)}
              </p>
            </div>
          ))}
      </div>
    );
  };

  return (
    <div className="container py-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="h-12 w-12 rounded-xl bg-purple-500 flex items-center justify-center">
          <BarChart3 className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Analytics</h1>
          <p className="text-muted-foreground">Ask questions about your HR data in plain English</p>
        </div>
        <Badge className="ml-auto" variant="secondary">
          <Sparkles className="h-3 w-3 mr-1" />
          Live Data
        </Badge>
      </div>

      {/* Quick Stats from API */}
      {quickStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {(quickStats.teamHealth as Record<string, number>)?.activeEmployees || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Active Employees</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {(quickStats.teamHealth as Record<string, number>)?.attendanceRate || 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Attendance Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {(quickStats.teamHealth as Record<string, number>)?.pendingLeaves || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Pending Leaves</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {(quickStats.overview as Record<string, number>)?.insightsGenerated || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">AI Insights</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search Box */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question... e.g., 'Show pending leaves' or 'How many employees?'"
                className="pl-10"
                disabled={loading}
              />
            </div>
            <Button type="submit" disabled={loading || !query.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ask'}
            </Button>
          </form>

          <div className="flex flex-wrap gap-2 mt-4">
            {recentQueries.length > 0 ? (
              <>
                <span className="text-xs text-muted-foreground flex items-center">
                  <Clock className="h-3 w-3 mr-1" /> Recent:
                </span>
                {recentQueries.map((q, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      setQuery(q);
                      executeQuery(undefined, q);
                    }}
                  >
                    {q.length > 25 ? q.substring(0, 25) + '...' : q}
                  </Button>
                ))}
              </>
            ) : (
              <>
                <span className="text-xs text-muted-foreground">Try:</span>
                {['Show pending leaves', 'Today\'s attendance', 'Active projects', 'Generate insights'].map((q, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      setQuery(q);
                      executeQuery(undefined, q);
                    }}
                  >
                    {q}
                  </Button>
                ))}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Results Panel */}
        <div className="lg:col-span-2">
          <Card className="min-h-[400px]">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Results</span>
                {result && (
                  <Button variant="ghost" size="sm" onClick={() => executeQuery(result.queryId)}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Refresh
                  </Button>
                )}
              </CardTitle>
              {result && (
                <CardDescription>
                  {availableQueries.find(q => q.id === result.queryId)?.label || result.queryId}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Querying your data...</p>
                </div>
              ) : error ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <p className="font-medium">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              ) : result ? (
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    {(result.result as Record<string, unknown>).title as string || 'Results'}
                  </h3>
                  {renderResultContent()}
                  <p className="text-xs text-muted-foreground mt-4">
                    Updated: {new Date(result.timestamp).toLocaleString()}
                  </p>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Ask a question or select a query to see results</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Quick Analytics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => executeQuery('quick-insights')}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Insights
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => executeQuery('attendance-today')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Today's Attendance
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => executeQuery('pending-leaves')}
              >
                <Clock className="h-4 w-4 mr-2" />
                Pending Leaves
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => executeQuery('overdue-tasks')}
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Overdue Tasks
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => executeQuery('active-projects')}
              >
                <FolderKanban className="h-4 w-4 mr-2" />
                Active Projects
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Browse by Category</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue={Object.keys(categories)[0] || 'Employees'} className="w-full">
                <TabsList className="w-full justify-start px-4 flex-wrap h-auto gap-1 bg-transparent">
                  {Object.keys(categories).slice(0, 4).map((cat) => {
                    const Icon = CATEGORY_ICONS[cat] || BarChart3;
                    return (
                      <TabsTrigger key={cat} value={cat} className="text-xs px-2 py-1 data-[state=active]:bg-muted">
                        <Icon className="h-3 w-3 mr-1" />
                        {cat}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
                {Object.entries(categories).map(([cat, queries]) => (
                  <TabsContent key={cat} value={cat} className="m-0 p-4 space-y-1">
                    {queries.map((q) => (
                      <Button
                        key={q.id}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs h-auto py-2 px-3"
                        onClick={() => executeQuery(q.id)}
                        disabled={loading}
                      >
                        {q.label}
                      </Button>
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
