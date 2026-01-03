'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ChevronRight
} from 'lucide-react';

interface Insight {
  id: string;
  type: string;
  title: string;
  description: string;
  importance: number;
  category: string;
  actionable: boolean;
  suggestedActions?: string[];
}

export function AIInsightsCard() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-insights' }),
      });

      if (!response.ok) throw new Error('Failed to fetch insights');

      const data = await response.json();
      setInsights(data.insights || []);
    } catch (err) {
      console.error('Error fetching insights:', err);
      setError('Failed to load insights');
      // Set mock insights for demo
      setInsights([
        {
          id: '1',
          type: 'trend',
          title: 'Hiring Trend',
          description: '5 new employees joined in the last 30 days',
          importance: 0.7,
          category: 'headcount',
          actionable: false,
        },
        {
          id: '2',
          type: 'anomaly',
          title: 'Attendance Alert',
          description: '3 employees have attendance below 70%',
          importance: 0.9,
          category: 'attendance',
          actionable: true,
          suggestedActions: ['Review attendance records', 'Schedule check-ins'],
        },
        {
          id: '3',
          type: 'threshold',
          title: 'Pending Approvals',
          description: '8 leave requests awaiting approval',
          importance: 0.8,
          category: 'leaves',
          actionable: true,
          suggestedActions: ['Review pending requests'],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'trend':
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case 'anomaly':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'threshold':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'pattern':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Lightbulb className="h-4 w-4 text-primary" />;
    }
  };

  const getImportanceBadge = (importance: number) => {
    if (importance >= 0.8) return <Badge variant="destructive">High Priority</Badge>;
    if (importance >= 0.5) return <Badge variant="secondary">Medium</Badge>;
    return <Badge variant="outline">Low</Badge>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">AI Insights</CardTitle>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchInsights} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">No insights available</p>
        ) : (
          <div className="space-y-4">
            {insights.slice(0, 5).map((insight) => (
              <div
                key={insight.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="mt-0.5">{getInsightIcon(insight.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium truncate">{insight.title}</h4>
                    {getImportanceBadge(insight.importance)}
                  </div>
                  <p className="text-xs text-muted-foreground">{insight.description}</p>
                  {insight.actionable && insight.suggestedActions && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {insight.suggestedActions.map((action, idx) => (
                        <Button key={idx} variant="outline" size="sm" className="text-xs h-6">
                          {action}
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
