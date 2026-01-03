'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Brain,
  Bot,
  BarChart3,
  Users,
  GraduationCap,
  FileText,
  TrendingUp,
  Sparkles,
  MessageCircle,
  Shield,
  Lightbulb,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Activity,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface AIStats {
  overview: {
    totalAIQueries: number;
    chatSessions: number;
    documentsProcessed: number;
    insightsGenerated: number;
    accuracyRate: number;
  };
  predictions: {
    activePredictions: number;
    openAnomalies: number;
    atRiskEmployees: number;
  };
  recruitment: {
    resumesParsed: number;
    candidatesMatched: number;
  };
  learning: {
    skillGapsIdentified: number;
    learningRecommendations: number;
    mentorMatches: number;
  };
  sentiment: {
    analysesCompleted: number;
    teamMorale: string;
  };
  teamHealth: {
    overallScore: number;
    attendanceRate: number;
    pendingLeaves: number;
    activeEmployees: number;
  };
}

const AI_FEATURES = [
  {
    title: 'AI Assistant',
    description: '24/7 intelligent HR chatbot for employee queries',
    icon: Bot,
    href: '/admin/ai/assistant',
    color: 'bg-blue-500',
    features: ['Leave queries', 'Policy information', 'Payroll help'],
    statKey: 'chatSessions' as const,
  },
  {
    title: 'AI Analytics',
    description: 'Natural language queries and automated insights',
    icon: BarChart3,
    href: '/admin/ai/analytics',
    color: 'bg-purple-500',
    features: ['Ask questions in plain English', 'Auto-generated insights', 'What-if scenarios'],
    statKey: 'insightsGenerated' as const,
  },
  {
    title: 'Smart Recruitment',
    description: 'AI-powered hiring and candidate matching',
    icon: Users,
    href: '/admin/ai/recruitment',
    color: 'bg-green-500',
    features: ['Resume parsing', 'Candidate matching', 'Bias detection'],
    statKey: 'resumesParsed' as const,
  },
  {
    title: 'Learning & Development',
    description: 'Personalized skill development and mentoring',
    icon: GraduationCap,
    href: '/admin/ai/learning',
    color: 'bg-amber-500',
    features: ['Skill gap analysis', 'Learning paths', 'Mentor matching'],
    statKey: 'skillGapsIdentified' as const,
  },
];

const AI_CAPABILITIES = [
  { icon: FileText, label: 'Document Processing', description: 'Auto-extract data from HR documents' },
  { icon: TrendingUp, label: 'Predictive Analytics', description: 'Attrition risk & performance forecasting' },
  { icon: MessageCircle, label: 'Sentiment Analysis', description: 'Analyze employee feedback & morale' },
  { icon: Shield, label: 'Smart Automation', description: 'Intelligent approvals & anomaly detection' },
];

export default function AIHubPage() {
  const [stats, setStats] = useState<AIStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/ai/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching AI stats:', err);
      setError('Unable to load AI statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const getStatValue = (key: string): number => {
    if (!stats) return 0;
    switch (key) {
      case 'chatSessions': return stats.overview.chatSessions;
      case 'insightsGenerated': return stats.overview.insightsGenerated;
      case 'resumesParsed': return stats.recruitment.resumesParsed;
      case 'skillGapsIdentified': return stats.learning.skillGapsIdentified;
      default: return 0;
    }
  };

  return (
    <div className="container py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
          <Brain className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">AI Hub</h1>
          <p className="text-muted-foreground">Intelligent features powered by AI</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Badge className="text-sm py-1 px-3" variant="secondary">
            <Sparkles className="h-4 w-4 mr-1" />
            8 AI Features
          </Badge>
        </div>
      </div>

      {/* Team Health Overview */}
      {stats && (
        <Card className="mb-6 border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                  stats.teamHealth.overallScore >= 70 ? 'bg-green-100 text-green-600' :
                  stats.teamHealth.overallScore >= 50 ? 'bg-yellow-100 text-yellow-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  {stats.teamHealth.overallScore >= 70 ? <CheckCircle className="h-6 w-6" /> :
                   stats.teamHealth.overallScore >= 50 ? <Activity className="h-6 w-6" /> :
                   <AlertTriangle className="h-6 w-6" />}
                </div>
                <div>
                  <h3 className="font-semibold">Team Health Score</h3>
                  <p className="text-sm text-muted-foreground">
                    Based on attendance, leaves, and employee activity
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold">{stats.teamHealth.overallScore}%</div>
                <Badge variant={stats.sentiment.teamMorale === 'Good' ? 'default' : 'secondary'}>
                  Morale: {stats.sentiment.teamMorale}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-semibold">{stats.teamHealth.activeEmployees}</div>
                <div className="text-xs text-muted-foreground">Active Employees</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold">{stats.teamHealth.attendanceRate}%</div>
                <div className="text-xs text-muted-foreground">Attendance Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold">{stats.teamHealth.pendingLeaves}</div>
                <div className="text-xs text-muted-foreground">Pending Leaves</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold">{stats.predictions.openAnomalies}</div>
                <div className="text-xs text-muted-foreground">Open Anomalies</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {AI_FEATURES.map((feature) => (
          <Link key={feature.href} href={feature.href}>
            <Card className="h-full hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer group">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 rounded-xl ${feature.color} flex items-center justify-center shadow-lg`}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="flex items-center justify-between">
                      {feature.title}
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </CardTitle>
                    <CardDescription className="mt-1">{feature.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {feature.features.map((f, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {f}
                      </Badge>
                    ))}
                  </div>
                  {stats && (
                    <div className="text-right">
                      <div className="text-lg font-semibold">{getStatValue(feature.statKey)}</div>
                      <div className="text-xs text-muted-foreground">sessions</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Additional Capabilities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            More AI Capabilities
          </CardTitle>
          <CardDescription>These features are integrated throughout the HRMS</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {AI_CAPABILITIES.map((cap, idx) => (
              <div key={idx} className="p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <cap.icon className="h-5 w-5 text-primary" />
                  <span className="font-medium text-sm">{cap.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{cap.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <Card>
          <CardContent className="pt-6 text-center">
            {loading ? (
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            ) : (
              <>
                <div className="text-3xl font-bold text-primary">
                  {stats?.overview.totalAIQueries || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">AI Queries Processed</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            {loading ? (
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            ) : (
              <>
                <div className="text-3xl font-bold text-green-600">
                  {stats?.overview.accuracyRate || 0}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">Accuracy Rate</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            {loading ? (
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            ) : (
              <>
                <div className="text-3xl font-bold text-blue-600">
                  {stats?.overview.documentsProcessed || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Documents Processed</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            {loading ? (
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            ) : (
              <>
                <div className="text-3xl font-bold text-purple-600">
                  {stats?.overview.insightsGenerated || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Insights Generated</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
          {error}. Some features may have limited functionality.
        </div>
      )}
    </div>
  );
}
