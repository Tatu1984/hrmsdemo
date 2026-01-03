// Advanced Analytics with Natural Language Queries
import { openai, AI_MODELS } from '../config';
import type {
  NLQuery,
  ParsedQuery,
  QueryResult,
  AutoInsight,
  WhatIfScenario,
  VisualizationSuggestion,
  InsightType
} from '../types';
import { prisma } from '@/lib/db';

// Schema description for query generation
const SCHEMA_DESCRIPTION = `
Database Schema:
- Employee: id, employeeId, name, email, phone, designation, salary, department, dateOfJoining, isActive
- Attendance: id, employeeId, date, punchIn, punchOut, totalHours, status (PRESENT, ABSENT, HALF_DAY, LEAVE, HOLIDAY)
- Leave: id, employeeId, leaveType (SICK, CASUAL, EARNED, UNPAID), startDate, endDate, days, status, reason
- Task: id, projectId, assignedTo (employeeId), title, status (PENDING, IN_PROGRESS, COMPLETED), priority, dueDate
- Project: id, name, status (ACTIVE, COMPLETED, ON_HOLD), startDate, endDate, totalBudget
- Payroll: id, employeeId, month, year, basicSalary, netSalary, status
- Sale: id, companyName, netAmount, status, closedBy, month, year
- Lead: id, companyName, status, assignedTo, createdAt
`;

export class AdvancedAnalyticsEngine {

  // Process natural language query
  async processNLQuery(
    userId: string,
    query: string
  ): Promise<NLQuery> {
    const startTime = Date.now();

    try {
      // Parse the query
      const parsedQuery = await this.parseQuery(query);

      // Generate and execute query
      const result = await this.executeQuery(parsedQuery, query);

      // Store query for learning
      await prisma.aINLQuery.create({
        data: {
          userId,
          originalQuery: query,
          parsedIntent: parsedQuery.intent,
          generatedSQL: result.sql,
          result: result.data as unknown as Record<string, unknown>,
          executionTime: Date.now() - startTime,
          success: true,
        },
      });

      return {
        original: query,
        parsed: parsedQuery,
        sql: result.sql,
        result: {
          data: result.data,
          columns: result.columns,
          rowCount: result.data.length,
          executionTime: Date.now() - startTime,
          visualization: result.visualization,
        },
      };
    } catch (error) {
      await prisma.aINLQuery.create({
        data: {
          userId,
          originalQuery: query,
          success: false,
          error: (error as Error).message,
          executionTime: Date.now() - startTime,
        },
      });
      throw error;
    }
  }

  // Parse natural language query
  private async parseQuery(query: string): Promise<ParsedQuery> {
    const response = await openai.chat.completions.create({
      model: AI_MODELS.GPT4,
      messages: [
        {
          role: 'system',
          content: `Parse this HR analytics query into structured format.
${SCHEMA_DESCRIPTION}

Return JSON:
{
  "intent": "count|list|compare|trend|aggregate|top_n|filter",
  "entities": [{"type": "employee|department|date|metric", "value": "", "role": "subject|object|attribute"}],
  "timeRange": {"start": "ISO date", "end": "ISO date", "granularity": "day|week|month|quarter|year"} or null,
  "aggregations": [{"function": "sum|avg|count|min|max", "field": "", "alias": ""}] or null,
  "filters": [{"field": "", "operator": "=|>|<|>=|<=|in|like", "value": ""}] or null
}`,
        },
        {
          role: 'user',
          content: query,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  // Execute parsed query
  private async executeQuery(
    parsed: ParsedQuery,
    originalQuery: string
  ): Promise<{
    data: Record<string, unknown>[];
    columns: string[];
    sql?: string;
    visualization?: VisualizationSuggestion;
  }> {
    // Generate appropriate Prisma query based on intent
    let data: Record<string, unknown>[] = [];
    let columns: string[] = [];

    // Determine main entity
    const mainEntity = parsed.entities.find(e => e.role === 'subject')?.type || 'employee';

    switch (parsed.intent) {
      case 'count':
        data = await this.executeCountQuery(parsed, mainEntity);
        columns = ['count'];
        break;
      case 'list':
        data = await this.executeListQuery(parsed, mainEntity);
        columns = Object.keys(data[0] || {});
        break;
      case 'aggregate':
        data = await this.executeAggregateQuery(parsed, mainEntity);
        columns = Object.keys(data[0] || {});
        break;
      case 'top_n':
        data = await this.executeTopNQuery(parsed, mainEntity);
        columns = Object.keys(data[0] || {});
        break;
      case 'trend':
        data = await this.executeTrendQuery(parsed, mainEntity);
        columns = Object.keys(data[0] || {});
        break;
      default:
        // Use AI to interpret and execute
        data = await this.executeAIQuery(originalQuery);
        columns = Object.keys(data[0] || {});
    }

    // Determine visualization
    const visualization = this.suggestVisualization(parsed, data);

    return { data, columns, visualization };
  }

  // Execute count query
  private async executeCountQuery(
    parsed: ParsedQuery,
    entity: string
  ): Promise<Record<string, unknown>[]> {
    const where = this.buildWhereClause(parsed);

    switch (entity) {
      case 'employee':
        const empCount = await prisma.employee.count({ where });
        return [{ count: empCount, label: 'Total Employees' }];
      case 'leave':
        const leaveCount = await prisma.leave.count({ where });
        return [{ count: leaveCount, label: 'Total Leaves' }];
      case 'task':
        const taskCount = await prisma.task.count({ where });
        return [{ count: taskCount, label: 'Total Tasks' }];
      default:
        return [{ count: 0 }];
    }
  }

  // Execute list query
  private async executeListQuery(
    parsed: ParsedQuery,
    entity: string
  ): Promise<Record<string, unknown>[]> {
    const where = this.buildWhereClause(parsed);

    switch (entity) {
      case 'employee':
        const employees = await prisma.employee.findMany({
          where,
          select: { name: true, email: true, department: true, designation: true },
          take: 50,
        });
        return employees;
      case 'leave':
        const leaves = await prisma.leave.findMany({
          where,
          include: { employee: { select: { name: true } } },
          take: 50,
        });
        return leaves.map(l => ({
          employee: l.employee.name,
          type: l.leaveType,
          days: l.days,
          status: l.status,
          startDate: l.startDate,
        }));
      default:
        return [];
    }
  }

  // Execute aggregate query
  private async executeAggregateQuery(
    parsed: ParsedQuery,
    entity: string
  ): Promise<Record<string, unknown>[]> {
    // Group by department for employees
    if (entity === 'employee') {
      const grouped = await prisma.employee.groupBy({
        by: ['department'],
        _count: true,
        _avg: { salary: true },
        where: { isActive: true },
      });
      return grouped.map(g => ({
        department: g.department,
        count: g._count,
        avgSalary: Math.round(g._avg.salary || 0),
      }));
    }

    // Group leaves by type
    if (entity === 'leave') {
      const grouped = await prisma.leave.groupBy({
        by: ['leaveType'],
        _count: true,
        _sum: { days: true },
      });
      return grouped.map(g => ({
        leaveType: g.leaveType,
        count: g._count,
        totalDays: g._sum.days,
      }));
    }

    return [];
  }

  // Execute top N query
  private async executeTopNQuery(
    parsed: ParsedQuery,
    entity: string
  ): Promise<Record<string, unknown>[]> {
    const limit = 10;

    if (entity === 'employee') {
      // Top employees by salary
      const top = await prisma.employee.findMany({
        where: { isActive: true },
        orderBy: { salary: 'desc' },
        take: limit,
        select: { name: true, designation: true, department: true, salary: true },
      });
      return top;
    }

    return [];
  }

  // Execute trend query
  private async executeTrendQuery(
    parsed: ParsedQuery,
    entity: string
  ): Promise<Record<string, unknown>[]> {
    // Get attendance trend for last 30 days
    if (entity === 'attendance') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const attendance = await prisma.attendance.groupBy({
        by: ['date'],
        _count: true,
        where: {
          date: { gte: thirtyDaysAgo },
          status: 'PRESENT',
        },
        orderBy: { date: 'asc' },
      });

      return attendance.map(a => ({
        date: a.date.toISOString().split('T')[0],
        presentCount: a._count,
      }));
    }

    // Get hiring trend
    if (entity === 'employee') {
      const employees = await prisma.employee.groupBy({
        by: ['dateOfJoining'],
        _count: true,
        orderBy: { dateOfJoining: 'asc' },
      });

      // Group by month
      const monthlyHires: Record<string, number> = {};
      employees.forEach(e => {
        const month = e.dateOfJoining.toISOString().substring(0, 7);
        monthlyHires[month] = (monthlyHires[month] || 0) + e._count;
      });

      return Object.entries(monthlyHires).map(([month, count]) => ({
        month,
        hires: count,
      }));
    }

    return [];
  }

  // Build where clause from parsed filters
  private buildWhereClause(parsed: ParsedQuery): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    // Add filters
    parsed.filters?.forEach(filter => {
      switch (filter.operator) {
        case '=':
          where[filter.field] = filter.value;
          break;
        case '>':
          where[filter.field] = { gt: filter.value };
          break;
        case '<':
          where[filter.field] = { lt: filter.value };
          break;
        case 'in':
          where[filter.field] = { in: filter.value };
          break;
        case 'like':
          where[filter.field] = { contains: filter.value, mode: 'insensitive' };
          break;
      }
    });

    // Add time range
    if (parsed.timeRange) {
      where.createdAt = {
        gte: new Date(parsed.timeRange.start),
        lte: new Date(parsed.timeRange.end),
      };
    }

    return where;
  }

  // Execute AI-powered query for complex questions
  private async executeAIQuery(query: string): Promise<Record<string, unknown>[]> {
    // For complex queries, use AI to generate insights
    const response = await openai.chat.completions.create({
      model: AI_MODELS.GPT4,
      messages: [
        {
          role: 'system',
          content: `You are an HR analytics expert. Answer the query based on typical HR data patterns.
Return JSON array with relevant data structure.
${SCHEMA_DESCRIPTION}`,
        },
        {
          role: 'user',
          content: query,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"data": []}');
    return result.data || result.results || [result];
  }

  // Suggest visualization type
  private suggestVisualization(
    parsed: ParsedQuery,
    data: Record<string, unknown>[]
  ): VisualizationSuggestion {
    if (parsed.intent === 'count') {
      return { type: 'metric', title: 'Count' };
    }

    if (parsed.intent === 'trend') {
      return {
        type: 'line',
        title: 'Trend Over Time',
        xAxis: 'date',
        yAxis: 'count',
      };
    }

    if (parsed.intent === 'aggregate' || parsed.intent === 'top_n') {
      return {
        type: 'bar',
        title: 'Comparison',
        xAxis: Object.keys(data[0] || {})[0],
        yAxis: Object.keys(data[0] || {})[1],
      };
    }

    if (parsed.aggregations?.some(a => a.function === 'sum')) {
      return { type: 'pie', title: 'Distribution' };
    }

    return { type: 'table', title: 'Data Table' };
  }

  // Generate automated insights
  async generateInsights(): Promise<AutoInsight[]> {
    const insights: AutoInsight[] = [];

    // 1. Headcount insight
    const totalEmployees = await prisma.employee.count({ where: { isActive: true } });
    const lastMonthJoins = await prisma.employee.count({
      where: {
        dateOfJoining: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });

    if (lastMonthJoins > 0) {
      insights.push({
        id: crypto.randomUUID(),
        type: 'trend',
        title: 'New Hires This Month',
        description: `${lastMonthJoins} new employees joined in the last 30 days`,
        data: { count: lastMonthJoins, total: totalEmployees },
        importance: 0.7,
        category: 'headcount',
        generatedAt: new Date(),
        actionable: false,
      });
    }

    // 2. Attendance insight
    const lowAttendance = await prisma.employee.findMany({
      where: { isActive: true },
      include: {
        attendance: {
          where: {
            date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        },
      },
    });

    const lowAttendanceEmployees = lowAttendance.filter(e => {
      const presentDays = e.attendance.filter(a => a.status === 'PRESENT').length;
      return e.attendance.length > 10 && presentDays / e.attendance.length < 0.7;
    });

    if (lowAttendanceEmployees.length > 0) {
      insights.push({
        id: crypto.randomUUID(),
        type: 'anomaly',
        title: 'Low Attendance Alert',
        description: `${lowAttendanceEmployees.length} employees have attendance below 70%`,
        data: { count: lowAttendanceEmployees.length },
        importance: 0.9,
        category: 'attendance',
        generatedAt: new Date(),
        actionable: true,
        suggestedActions: ['Review individual attendance records', 'Schedule check-ins'],
      });
    }

    // 3. Pending leave requests
    const pendingLeaves = await prisma.leave.count({ where: { status: 'PENDING' } });
    if (pendingLeaves > 5) {
      insights.push({
        id: crypto.randomUUID(),
        type: 'threshold',
        title: 'Pending Leave Requests',
        description: `${pendingLeaves} leave requests awaiting approval`,
        data: { count: pendingLeaves },
        importance: 0.8,
        category: 'leaves',
        generatedAt: new Date(),
        actionable: true,
        suggestedActions: ['Review and process pending requests'],
      });
    }

    // 4. Department distribution
    const deptDistribution = await prisma.employee.groupBy({
      by: ['department'],
      _count: true,
      where: { isActive: true },
    });

    insights.push({
      id: crypto.randomUUID(),
      type: 'pattern',
      title: 'Department Distribution',
      description: `Largest department: ${deptDistribution.sort((a, b) => b._count - a._count)[0]?.department || 'N/A'}`,
      data: { distribution: deptDistribution },
      importance: 0.5,
      category: 'organization',
      generatedAt: new Date(),
      actionable: false,
    });

    // Store insights
    for (const insight of insights) {
      await prisma.aIInsight.create({
        data: {
          type: insight.type as InsightType,
          category: insight.category,
          title: insight.title,
          description: insight.description,
          data: insight.data as Record<string, unknown>,
          importance: insight.importance,
          actionable: insight.actionable,
          actions: insight.suggestedActions,
        },
      });
    }

    return insights.sort((a, b) => b.importance - a.importance);
  }

  // Create what-if scenario
  async createWhatIfScenario(
    name: string,
    parameters: { name: string; currentValue: unknown; newValue: unknown }[]
  ): Promise<WhatIfScenario> {
    // Get baseline metrics
    const baseline = await this.getBaselineMetrics();

    // Calculate projected changes
    const results = await this.calculateScenarioImpact(parameters, baseline);

    return {
      id: crypto.randomUUID(),
      name,
      baselineData: baseline,
      parameters: parameters.map(p => ({
        ...p,
        type: typeof p.currentValue === 'number' ? 'numeric' as const :
              typeof p.currentValue === 'boolean' ? 'boolean' as const : 'categorical' as const,
      })),
      results,
    };
  }

  // Get baseline metrics
  private async getBaselineMetrics(): Promise<Record<string, unknown>> {
    const [
      totalEmployees,
      avgSalary,
      totalPayroll,
      avgAttendance,
    ] = await Promise.all([
      prisma.employee.count({ where: { isActive: true } }),
      prisma.employee.aggregate({
        where: { isActive: true },
        _avg: { salary: true },
      }),
      prisma.payroll.aggregate({
        where: { year: new Date().getFullYear() },
        _sum: { netSalary: true },
      }),
      prisma.attendance.count({
        where: {
          status: 'PRESENT',
          date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      totalEmployees,
      averageSalary: avgSalary._avg.salary || 0,
      totalPayrollCost: totalPayroll._sum.netSalary || 0,
      attendanceRate: avgAttendance,
    };
  }

  // Calculate scenario impact
  private async calculateScenarioImpact(
    parameters: { name: string; currentValue: unknown; newValue: unknown }[],
    baseline: Record<string, unknown>
  ): Promise<{
    metric: string;
    baseline: number;
    projected: number;
    change: number;
    changePercent: number;
    confidence: number;
  }[]> {
    const results = [];

    for (const param of parameters) {
      if (param.name === 'salary_increase') {
        const increasePercent = Number(param.newValue) / 100;
        const currentPayroll = baseline.totalPayrollCost as number;
        const projectedPayroll = currentPayroll * (1 + increasePercent);

        results.push({
          metric: 'Monthly Payroll Cost',
          baseline: currentPayroll,
          projected: projectedPayroll,
          change: projectedPayroll - currentPayroll,
          changePercent: increasePercent * 100,
          confidence: 0.95,
        });
      }

      if (param.name === 'headcount_change') {
        const change = Number(param.newValue) - Number(param.currentValue);
        const avgSalary = baseline.averageSalary as number;
        const additionalCost = change * avgSalary;

        results.push({
          metric: 'Additional Monthly Cost',
          baseline: 0,
          projected: additionalCost,
          change: additionalCost,
          changePercent: (additionalCost / (baseline.totalPayrollCost as number)) * 100,
          confidence: 0.85,
        });
      }
    }

    return results;
  }

  // Get query suggestions based on history
  async getQuerySuggestions(userId: string): Promise<string[]> {
    const recentQueries = await prisma.aINLQuery.findMany({
      where: { userId, success: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { originalQuery: true },
    });

    const suggestions = [
      'How many employees are there in each department?',
      'Show me employees who joined this month',
      'What is the average salary by department?',
      'List all pending leave requests',
      'Show attendance trend for last 30 days',
      'Who are the top 10 highest paid employees?',
      'How many sick leaves were taken this month?',
    ];

    // Add variations of recent queries
    recentQueries.forEach(q => {
      if (!suggestions.includes(q.originalQuery)) {
        suggestions.push(q.originalQuery);
      }
    });

    return suggestions.slice(0, 10);
  }
}

export const advancedAnalytics = new AdvancedAnalyticsEngine();
