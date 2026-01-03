// Predictive Analytics Engine
import { openai, AI_MODELS, ATTRITION_RISK } from '../config';
import type {
  AttritionPrediction,
  PerformanceForecast,
  WorkloadPrediction,
  RiskFactor,
  RiskLevel
} from '../types';
import { prisma } from '@/lib/db';

export class PredictiveAnalyticsEngine {

  // Calculate attrition risk for an employee
  async predictAttrition(employeeId: string): Promise<AttritionPrediction> {
    // Fetch employee data
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        attendance: {
          where: {
            date: {
              gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
            },
          },
        },
        leaves: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // Last 6 months
            },
          },
        },
        tasks: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            },
          },
        },
      },
    });

    if (!employee) {
      throw new Error('Employee not found');
    }

    // Calculate risk factors
    const factors: RiskFactor[] = [];
    let totalScore = 0;

    // 1. Tenure factor
    const tenureMonths = Math.floor(
      (Date.now() - new Date(employee.dateOfJoining).getTime()) / (30 * 24 * 60 * 60 * 1000)
    );
    const tenureRisk = tenureMonths < 12 ? 0.2 : tenureMonths < 24 ? 0.1 : 0;
    factors.push({
      name: 'Tenure',
      weight: 0.15,
      value: `${tenureMonths} months`,
      impact: tenureRisk > 0.15 ? 'negative' : 'positive',
      description: tenureRisk > 0.15 ? 'Short tenure increases flight risk' : 'Good tenure stability',
    });
    totalScore += tenureRisk * 0.15;

    // 2. Attendance patterns
    const attendanceRecords = employee.attendance;
    const absentDays = attendanceRecords.filter(a => a.status === 'ABSENT').length;
    const attendanceRate = attendanceRecords.length > 0
      ? (attendanceRecords.length - absentDays) / attendanceRecords.length
      : 1;
    const attendanceRisk = attendanceRate < 0.8 ? 0.3 : attendanceRate < 0.9 ? 0.15 : 0;
    factors.push({
      name: 'Attendance Pattern',
      weight: 0.2,
      value: `${(attendanceRate * 100).toFixed(1)}%`,
      impact: attendanceRisk > 0.1 ? 'negative' : 'positive',
      description: attendanceRisk > 0.1 ? 'Declining attendance pattern detected' : 'Consistent attendance',
    });
    totalScore += attendanceRisk * 0.2;

    // 3. Leave patterns (unusual sick leaves)
    const sickLeaves = employee.leaves.filter(l => l.leaveType === 'SICK').length;
    const leaveRisk = sickLeaves > 5 ? 0.25 : sickLeaves > 3 ? 0.1 : 0;
    factors.push({
      name: 'Leave Patterns',
      weight: 0.15,
      value: `${sickLeaves} sick leaves in 6 months`,
      impact: leaveRisk > 0.1 ? 'negative' : 'neutral',
      description: leaveRisk > 0.1 ? 'Higher than average sick leaves' : 'Normal leave pattern',
    });
    totalScore += leaveRisk * 0.15;

    // 4. Task completion rate
    const completedTasks = employee.tasks.filter(t => t.status === 'COMPLETED').length;
    const taskCompletionRate = employee.tasks.length > 0
      ? completedTasks / employee.tasks.length
      : 1;
    const taskRisk = taskCompletionRate < 0.6 ? 0.25 : taskCompletionRate < 0.8 ? 0.1 : 0;
    factors.push({
      name: 'Task Performance',
      weight: 0.25,
      value: `${(taskCompletionRate * 100).toFixed(1)}% completion`,
      impact: taskRisk > 0.1 ? 'negative' : 'positive',
      description: taskRisk > 0.1 ? 'Declining task performance' : 'Good task completion rate',
    });
    totalScore += taskRisk * 0.25;

    // 5. Salary competitiveness (simplified)
    const salaryFactor = 0.05; // Would need market data for real comparison
    factors.push({
      name: 'Compensation',
      weight: 0.25,
      value: 'Market aligned',
      impact: 'neutral',
      description: 'Salary appears competitive',
    });
    totalScore += salaryFactor * 0.25;

    // Determine risk level
    const riskScore = Math.min(totalScore, 1);
    let riskLevel: RiskLevel;
    if (riskScore >= ATTRITION_RISK.CRITICAL) riskLevel = 'critical';
    else if (riskScore >= ATTRITION_RISK.HIGH) riskLevel = 'high';
    else if (riskScore >= ATTRITION_RISK.MEDIUM) riskLevel = 'medium';
    else riskLevel = 'low';

    // Generate AI recommendations
    const recommendations = await this.generateRecommendations(factors, riskLevel);

    return {
      employeeId,
      riskScore,
      riskLevel,
      factors,
      recommendations,
      predictedAt: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Valid for 30 days
    };
  }

  // Generate AI-powered recommendations
  private async generateRecommendations(factors: RiskFactor[], riskLevel: RiskLevel): Promise<string[]> {
    const negativeFactors = factors.filter(f => f.impact === 'negative');

    if (negativeFactors.length === 0) {
      return ['Employee appears well-engaged. Continue current management approach.'];
    }

    const response = await openai.chat.completions.create({
      model: AI_MODELS.GPT35,
      messages: [
        {
          role: 'system',
          content: 'You are an HR analytics expert. Generate 3-5 actionable recommendations to reduce employee attrition risk based on the identified factors.',
        },
        {
          role: 'user',
          content: `Risk Level: ${riskLevel}\nNegative Factors:\n${negativeFactors.map(f => `- ${f.name}: ${f.description}`).join('\n')}`,
        },
      ],
      temperature: 0.5,
    });

    const content = response.choices[0].message.content || '';
    return content.split('\n').filter(line => line.trim().length > 0).slice(0, 5);
  }

  // Predict performance for next quarter
  async predictPerformance(employeeId: string): Promise<PerformanceForecast> {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        tasks: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        attendance: {
          where: {
            date: {
              gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            },
          },
        },
      },
    });

    if (!employee) {
      throw new Error('Employee not found');
    }

    // Calculate current performance score
    const completedTasks = employee.tasks.filter(t => t.status === 'COMPLETED').length;
    const totalTasks = employee.tasks.length || 1;
    const taskScore = (completedTasks / totalTasks) * 40;

    const attendanceRate = employee.attendance.length > 0
      ? employee.attendance.filter(a => a.status === 'PRESENT').length / employee.attendance.length
      : 0.9;
    const attendanceScore = attendanceRate * 30;

    // Punctuality score (average hours worked)
    const avgHours = employee.attendance.reduce((sum, a) => sum + (a.totalHours || 0), 0) / (employee.attendance.length || 1);
    const punctualityScore = Math.min(avgHours / 8, 1) * 30;

    const currentScore = taskScore + attendanceScore + punctualityScore;

    // Calculate trend based on recent vs older data
    const recentTasks = employee.tasks.slice(0, 10);
    const olderTasks = employee.tasks.slice(10, 20);

    const recentCompletion = recentTasks.filter(t => t.status === 'COMPLETED').length / (recentTasks.length || 1);
    const olderCompletion = olderTasks.filter(t => t.status === 'COMPLETED').length / (olderTasks.length || 1);

    let trend: 'improving' | 'stable' | 'declining';
    if (recentCompletion > olderCompletion + 0.1) trend = 'improving';
    else if (recentCompletion < olderCompletion - 0.1) trend = 'declining';
    else trend = 'stable';

    // Predict future score
    const trendMultiplier = trend === 'improving' ? 1.1 : trend === 'declining' ? 0.9 : 1;
    const predictedScore = Math.min(currentScore * trendMultiplier, 100);

    return {
      employeeId,
      currentScore,
      predictedScore,
      trend,
      factors: [
        { name: 'Task Completion', currentValue: taskScore, trend: recentCompletion - olderCompletion, impact: 0.4 },
        { name: 'Attendance', currentValue: attendanceScore, trend: 0, impact: 0.3 },
        { name: 'Punctuality', currentValue: punctualityScore, trend: 0, impact: 0.3 },
      ],
      recommendations: trend === 'declining'
        ? ['Schedule one-on-one meeting', 'Review workload distribution', 'Identify potential blockers']
        : ['Continue current trajectory', 'Consider for new responsibilities'],
    };
  }

  // Predict department workload
  async predictWorkload(department: string, periodDays: number = 30): Promise<WorkloadPrediction> {
    // Fetch historical data
    const employees = await prisma.employee.findMany({
      where: { department },
      include: {
        tasks: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            },
          },
        },
      },
    });

    // Calculate average task load
    const totalTasks = employees.reduce((sum, e) => sum + e.tasks.length, 0);
    const avgTasksPerEmployee = totalTasks / (employees.length || 1);

    // Predict based on historical trend (simplified)
    const predictedLoad = avgTasksPerEmployee * 1.1; // Assume 10% growth

    return {
      department,
      period: `Next ${periodDays} days`,
      predictedLoad,
      confidence: 0.75,
      recommendations: predictedLoad > 5
        ? ['Consider hiring additional resources', 'Review task priorities', 'Optimize workflows']
        : ['Current capacity appears sufficient'],
    };
  }

  // Bulk predict attrition for all employees
  async predictBulkAttrition(): Promise<AttritionPrediction[]> {
    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    const predictions: AttritionPrediction[] = [];

    for (const employee of employees) {
      try {
        const prediction = await this.predictAttrition(employee.id);
        predictions.push(prediction);
      } catch (error) {
        console.error(`Failed to predict for employee ${employee.id}:`, error);
      }
    }

    return predictions.sort((a, b) => b.riskScore - a.riskScore);
  }

  // Get team health score
  async getTeamHealthScore(department?: string): Promise<{
    overallScore: number;
    metrics: Record<string, number>;
    trends: Record<string, 'up' | 'down' | 'stable'>;
    recommendations: string[];
  }> {
    const whereClause = department ? { department } : {};

    const employees = await prisma.employee.findMany({
      where: { isActive: true, ...whereClause },
      include: {
        attendance: {
          where: {
            date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        },
        tasks: {
          where: {
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        },
        leaves: {
          where: {
            startDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        },
      },
    });

    // Calculate metrics
    const avgAttendance = employees.reduce((sum, e) => {
      const present = e.attendance.filter(a => a.status === 'PRESENT').length;
      return sum + (present / (e.attendance.length || 1));
    }, 0) / (employees.length || 1);

    const avgTaskCompletion = employees.reduce((sum, e) => {
      const completed = e.tasks.filter(t => t.status === 'COMPLETED').length;
      return sum + (completed / (e.tasks.length || 1));
    }, 0) / (employees.length || 1);

    const leaveRate = employees.reduce((sum, e) => sum + e.leaves.length, 0) / (employees.length || 1);

    const overallScore = (avgAttendance * 40 + avgTaskCompletion * 40 + (1 - Math.min(leaveRate / 5, 1)) * 20);

    return {
      overallScore,
      metrics: {
        attendance: avgAttendance * 100,
        taskCompletion: avgTaskCompletion * 100,
        leaveRate: leaveRate,
        headcount: employees.length,
      },
      trends: {
        attendance: 'stable',
        taskCompletion: 'stable',
        leaveRate: 'stable',
      },
      recommendations: overallScore < 70
        ? ['Review team workload', 'Schedule team building activities', 'Conduct engagement survey']
        : ['Team is performing well', 'Consider recognition programs'],
    };
  }
}

export const predictiveAnalytics = new PredictiveAnalyticsEngine();
