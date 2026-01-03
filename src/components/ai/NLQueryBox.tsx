'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Sparkles,
  Loader2,
  BarChart3,
  Table,
  PieChart,
  TrendingUp
} from 'lucide-react';

interface QueryResult {
  data: Record<string, unknown>[];
  columns: string[];
  rowCount: number;
  visualization?: {
    type: string;
    title: string;
  };
}

const SUGGESTED_QUERIES = [
  'How many employees are in each department?',
  'Show attendance trend for last 30 days',
  'List all pending leave requests',
  'What is the average salary by department?',
  'Who are the top 5 performers this month?',
];

export function NLQueryBox() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeQuery = async (queryText?: string) => {
    const q = queryText || query;
    if (!q.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/ai/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'query', query: q }),
      });

      if (!response.ok) throw new Error('Query failed');

      const data = await response.json();
      setResult(data.result);
    } catch (err) {
      console.error('Query error:', err);
      setError('Failed to execute query. Please try again.');
      // Mock result for demo
      setResult({
        data: [
          { department: 'Engineering', count: 15, avgSalary: 85000 },
          { department: 'Sales', count: 10, avgSalary: 65000 },
          { department: 'HR', count: 5, avgSalary: 55000 },
          { department: 'Marketing', count: 8, avgSalary: 60000 },
        ],
        columns: ['department', 'count', 'avgSalary'],
        rowCount: 4,
        visualization: { type: 'bar', title: 'Department Distribution' },
      });
    } finally {
      setLoading(false);
    }
  };

  const getVisualizationIcon = (type?: string) => {
    switch (type) {
      case 'bar':
        return <BarChart3 className="h-4 w-4" />;
      case 'pie':
        return <PieChart className="h-4 w-4" />;
      case 'line':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Table className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Ask AI Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Query Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && executeQuery()}
              placeholder="Ask a question about your HR data..."
              className="pl-10"
            />
          </div>
          <Button onClick={() => executeQuery()} disabled={loading || !query.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ask'}
          </Button>
        </div>

        {/* Suggested Queries */}
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUERIES.map((q, idx) => (
            <Badge
              key={idx}
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80 transition-colors"
              onClick={() => {
                setQuery(q);
                executeQuery(q);
              }}
            >
              {q}
            </Badge>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {getVisualizationIcon(result.visualization?.type)}
                <span>{result.visualization?.title || 'Results'}</span>
              </div>
              <Badge variant="outline">{result.rowCount} rows</Badge>
            </div>

            {/* Simple Table View */}
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      {result.columns.map((col) => (
                        <th key={col} className="px-4 py-2 text-left font-medium capitalize">
                          {col.replace(/([A-Z])/g, ' $1').trim()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="border-t hover:bg-muted/50">
                        {result.columns.map((col) => (
                          <td key={col} className="px-4 py-2">
                            {typeof row[col] === 'number'
                              ? (row[col] as number).toLocaleString()
                              : String(row[col] ?? '-')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {result.rowCount > 10 && (
                <div className="px-4 py-2 bg-muted/50 text-xs text-muted-foreground">
                  Showing 10 of {result.rowCount} results
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
