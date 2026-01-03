'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Brain,
  Users,
  AlertCircle,
  TrendingUp,
  Activity
} from 'lucide-react';

interface AttritionRisk {
  employeeId: string;
  employeeName?: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: { name: string; impact: string }[];
}

interface TeamHealth {
  overallScore: number;
  metrics: {
    attendance: number;
    taskCompletion: number;
    headcount: number;
  };
  recommendations: string[];
}

export function AIPredictionsCard() {
  const [teamHealth, setTeamHealth] = useState<TeamHealth | null>(null);
  const [highRiskEmployees, setHighRiskEmployees] = useState<AttritionRisk[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        // Fetch team health
        const healthResponse = await fetch('/api/ai/predictions?type=team-health');
        if (healthResponse.ok) {
          const healthData = await healthResponse.json();
          setTeamHealth(healthData);
        }

        // Fetch attrition predictions
        const attritionResponse = await fetch('/api/ai/predictions?type=attrition');
        if (attritionResponse.ok) {
          const attritionData = await attritionResponse.json();
          setHighRiskEmployees(
            (attritionData.predictions || [])
              .filter((p: AttritionRisk) => p.riskLevel === 'high' || p.riskLevel === 'critical')
              .slice(0, 3)
          );
        }
      } catch (error) {
        console.error('Error fetching predictions:', error);
        // Set mock data for demo
        setTeamHealth({
          overallScore: 78,
          metrics: {
            attendance: 92,
            taskCompletion: 85,
            headcount: 45,
          },
          recommendations: ['Team is performing well', 'Consider recognition programs'],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, []);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      default:
        return 'bg-green-500';
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Predictions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI Predictions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Team Health Score */}
        {teamHealth && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Team Health Score</span>
              </div>
              <span className={`text-2xl font-bold ${getHealthColor(teamHealth.overallScore)}`}>
                {teamHealth.overallScore}%
              </span>
            </div>
            <Progress value={teamHealth.overallScore} className="h-2" />
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-muted/50 rounded">
                <p className="text-xs text-muted-foreground">Attendance</p>
                <p className="text-sm font-medium">{teamHealth.metrics.attendance}%</p>
              </div>
              <div className="p-2 bg-muted/50 rounded">
                <p className="text-xs text-muted-foreground">Task Rate</p>
                <p className="text-sm font-medium">{teamHealth.metrics.taskCompletion}%</p>
              </div>
              <div className="p-2 bg-muted/50 rounded">
                <p className="text-xs text-muted-foreground">Headcount</p>
                <p className="text-sm font-medium">{teamHealth.metrics.headcount}</p>
              </div>
            </div>
          </div>
        )}

        {/* Attrition Risk */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Attrition Risk Alerts</span>
          </div>
          {highRiskEmployees.length > 0 ? (
            <div className="space-y-2">
              {highRiskEmployees.map((employee, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded"
                >
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${getRiskColor(employee.riskLevel)}`} />
                    <span className="text-sm">{employee.employeeName || `Employee ${idx + 1}`}</span>
                  </div>
                  <Badge variant={employee.riskLevel === 'critical' ? 'destructive' : 'secondary'}>
                    {Math.round(employee.riskScore * 100)}% risk
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded text-green-700 dark:text-green-400">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">No high-risk employees detected</span>
            </div>
          )}
        </div>

        {/* Recommendations */}
        {teamHealth && teamHealth.recommendations.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">AI Recommendations</p>
            <ul className="space-y-1">
              {teamHealth.recommendations.map((rec, idx) => (
                <li key={idx} className="text-xs flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
