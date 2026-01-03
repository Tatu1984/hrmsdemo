'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NLQueryBox } from '@/components/ai/NLQueryBox';
import { AIInsightsCard } from '@/components/ai/InsightsCard';
import { AIPredictionsCard } from '@/components/ai/PredictionsCard';
import {
  BarChart3,
  Brain,
  Lightbulb,
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  Activity
} from 'lucide-react';

export default function AIAnalyticsPage() {
  return (
    <div className="container py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <BarChart3 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Analytics</h1>
          <p className="text-muted-foreground">Intelligent insights powered by AI</p>
        </div>
      </div>

      <Tabs defaultValue="query" className="space-y-6">
        <TabsList>
          <TabsTrigger value="query" className="gap-2">
            <Brain className="h-4 w-4" />
            Natural Language Query
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            AI Insights
          </TabsTrigger>
          <TabsTrigger value="predictions" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Predictions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="query" className="space-y-6">
          <NLQueryBox />

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">45</p>
                    <p className="text-xs text-muted-foreground">Total Employees</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">92%</p>
                    <p className="text-xs text-muted-foreground">Attendance Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">8</p>
                    <p className="text-xs text-muted-foreground">Pending Leaves</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">₹45L</p>
                    <p className="text-xs text-muted-foreground">Monthly Payroll</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AIInsightsCard />
            <Card>
              <CardHeader>
                <CardTitle>Recent Trends</CardTitle>
                <CardDescription>AI-detected patterns in your HR data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Hiring Up 20%</p>
                    <p className="text-xs text-muted-foreground">Compared to last quarter</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Activity className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Attendance Stable</p>
                    <p className="text-xs text-muted-foreground">Consistent 90%+ rate</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Calendar className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium">Leave Pattern</p>
                    <p className="text-xs text-muted-foreground">Peak leaves around festivals</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AIPredictionsCard />
            <Card>
              <CardHeader>
                <CardTitle>What-If Analysis</CardTitle>
                <CardDescription>Simulate scenarios and see projected outcomes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg space-y-3">
                  <p className="text-sm font-medium">If salary increases by 10%:</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="text-muted-foreground text-xs">Attrition Risk</p>
                      <p className="font-medium text-green-600">-25% decrease</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="text-muted-foreground text-xs">Monthly Cost</p>
                      <p className="font-medium text-amber-600">+₹4.5L increase</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 border rounded-lg space-y-3">
                  <p className="text-sm font-medium">If headcount increases by 5:</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="text-muted-foreground text-xs">Productivity</p>
                      <p className="font-medium text-green-600">+15% projected</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="text-muted-foreground text-xs">Monthly Cost</p>
                      <p className="font-medium text-amber-600">+₹3.5L increase</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
