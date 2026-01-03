// Intelligent Automation System
import { openai, AI_MODELS } from '../config';
import type {
  AutoApprovalRule,
  AnomalyDetection,
  ComplianceCheck,
  ApprovalCondition,
  AnomalyType
} from '../types';
import { prisma } from '@/lib/db';

export class IntelligentAutomation {

  // Evaluate if a leave request should be auto-approved
  async evaluateLeaveRequest(leaveId: string): Promise<{
    action: 'approve' | 'reject' | 'manual_review';
    reason: string;
    confidence: number;
  }> {
    const leave = await prisma.leave.findUnique({
      where: { id: leaveId },
      include: {
        employee: {
          include: {
            leaves: {
              where: {
                status: 'APPROVED',
                startDate: { gte: new Date(new Date().getFullYear(), 0, 1) },
              },
            },
            attendance: {
              where: {
                date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
              },
            },
          },
        },
      },
    });

    if (!leave) {
      return { action: 'manual_review', reason: 'Leave request not found', confidence: 0 };
    }

    // Get automation rules
    const rules = await prisma.aIAutomationRule.findMany({
      where: { type: 'LEAVE_APPROVAL', isActive: true },
      orderBy: { priority: 'desc' },
    });

    // Calculate leave balance
    const usedLeaves = leave.employee.leaves.reduce((sum, l) => {
      if (l.leaveType === leave.leaveType) return sum + l.days;
      return sum;
    }, 0);

    const leaveQuota: Record<string, number> = {
      SICK: 12,
      CASUAL: 12,
      EARNED: 15,
      UNPAID: 30,
    };

    const remainingBalance = leaveQuota[leave.leaveType] - usedLeaves;

    // Auto-reject if insufficient balance
    if (remainingBalance < leave.days && leave.leaveType !== 'UNPAID') {
      return {
        action: 'reject',
        reason: `Insufficient ${leave.leaveType} leave balance. Remaining: ${remainingBalance} days, Requested: ${leave.days} days`,
        confidence: 1.0,
      };
    }

    // Check for existing approved leaves in the same period (conflicts)
    const overlappingLeaves = await prisma.leave.count({
      where: {
        employeeId: leave.employeeId,
        status: 'APPROVED',
        id: { not: leave.id },
        OR: [
          {
            startDate: { lte: leave.endDate },
            endDate: { gte: leave.startDate },
          },
        ],
      },
    });

    if (overlappingLeaves > 0) {
      return {
        action: 'reject',
        reason: 'Overlapping leave request already approved for this period',
        confidence: 0.95,
      };
    }

    // Auto-approve short leaves with good attendance
    const attendanceRate = leave.employee.attendance.length > 0
      ? leave.employee.attendance.filter(a => a.status === 'PRESENT').length / leave.employee.attendance.length
      : 0;

    if (leave.days <= 2 && attendanceRate >= 0.85 && remainingBalance >= leave.days) {
      return {
        action: 'approve',
        reason: `Auto-approved: Short leave (${leave.days} days), good attendance (${(attendanceRate * 100).toFixed(0)}%), sufficient balance`,
        confidence: 0.9,
      };
    }

    // Default to manual review for longer leaves
    return {
      action: 'manual_review',
      reason: 'Leave request requires manager approval',
      confidence: 0.7,
    };
  }

  // Detect anomalies in attendance patterns
  async detectAttendanceAnomalies(employeeId: string): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    const attendance = await prisma.attendance.findMany({
      where: {
        employeeId,
        date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { date: 'desc' },
    });

    if (attendance.length < 5) return anomalies;

    // Check for unusual patterns
    // 1. Late punch-ins
    const latePunchIns = attendance.filter(a => {
      if (!a.punchIn) return false;
      const hour = new Date(a.punchIn).getHours();
      return hour >= 10; // After 10 AM
    });

    if (latePunchIns.length > attendance.length * 0.3) {
      anomalies.push({
        type: 'attendance_pattern',
        severity: 'medium',
        description: `Frequent late arrivals detected: ${latePunchIns.length} out of ${attendance.length} days`,
        entityType: 'Employee',
        entityId: employeeId,
        detectedAt: new Date(),
        data: { latePunchIns: latePunchIns.length, totalDays: attendance.length },
        suggestedAction: 'Review attendance pattern with employee',
      });
    }

    // 2. Short working hours
    const shortDays = attendance.filter(a => a.totalHours && a.totalHours < 6);
    if (shortDays.length > attendance.length * 0.2) {
      anomalies.push({
        type: 'attendance_pattern',
        severity: 'low',
        description: `Frequent short work days: ${shortDays.length} days with less than 6 hours`,
        entityType: 'Employee',
        entityId: employeeId,
        detectedAt: new Date(),
        data: { shortDays: shortDays.length },
        suggestedAction: 'Check if there are valid reasons or workload issues',
      });
    }

    // 3. Sudden absence streak
    const recentAbsences = attendance.slice(0, 5).filter(a => a.status === 'ABSENT');
    if (recentAbsences.length >= 3) {
      anomalies.push({
        type: 'attendance_pattern',
        severity: 'high',
        description: 'Multiple consecutive absences detected',
        entityType: 'Employee',
        entityId: employeeId,
        detectedAt: new Date(),
        data: { recentAbsences: recentAbsences.length },
        suggestedAction: 'Reach out to employee immediately',
      });
    }

    // Store anomalies
    for (const anomaly of anomalies) {
      await prisma.aIAnomaly.create({
        data: {
          type: anomaly.type,
          severity: anomaly.severity,
          entityType: anomaly.entityType,
          entityId: anomaly.entityId,
          description: anomaly.description,
          data: anomaly.data,
          status: 'OPEN',
        },
      });
    }

    return anomalies;
  }

  // Detect expense anomalies
  async detectExpenseAnomalies(accountId: string): Promise<AnomalyDetection | null> {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { category: true },
    });

    if (!account) return null;

    // Get historical expenses for this category
    const historicalExpenses = await prisma.account.findMany({
      where: {
        categoryId: account.categoryId,
        type: 'EXPENSE',
        date: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        id: { not: accountId },
      },
    });

    if (historicalExpenses.length < 5) return null;

    // Calculate average and standard deviation
    const amounts = historicalExpenses.map(e => e.amount);
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.reduce((sum, a) => sum + Math.pow(a - avg, 2), 0) / amounts.length);

    // Check if current expense is an outlier (> 2 std devs)
    if (account.amount > avg + 2 * stdDev) {
      const anomaly: AnomalyDetection = {
        type: 'expense_unusual',
        severity: account.amount > avg + 3 * stdDev ? 'high' : 'medium',
        description: `Expense of ${account.amount} is significantly higher than average (${avg.toFixed(2)})`,
        entityType: 'Account',
        entityId: accountId,
        detectedAt: new Date(),
        data: {
          amount: account.amount,
          average: avg,
          stdDev,
          category: account.category.name,
        },
        suggestedAction: 'Review expense for potential issues or fraud',
      };

      await prisma.aIAnomaly.create({
        data: {
          type: anomaly.type,
          severity: anomaly.severity,
          entityType: anomaly.entityType,
          entityId: anomaly.entityId,
          description: anomaly.description,
          data: anomaly.data,
          status: 'OPEN',
        },
      });

      return anomaly;
    }

    return null;
  }

  // Check compliance with policies
  async checkCompliance(type: 'leave' | 'attendance' | 'payroll'): Promise<ComplianceCheck[]> {
    const checks: ComplianceCheck[] = [];

    switch (type) {
      case 'leave':
        // Check if any employee has exceeded leave quota
        const employees = await prisma.employee.findMany({
          where: { isActive: true },
          include: {
            leaves: {
              where: {
                status: 'APPROVED',
                startDate: { gte: new Date(new Date().getFullYear(), 0, 1) },
              },
            },
          },
        });

        const overQuotaEmployees = employees.filter(e => {
          const sickLeaves = e.leaves.filter(l => l.leaveType === 'SICK').reduce((s, l) => s + l.days, 0);
          const casualLeaves = e.leaves.filter(l => l.leaveType === 'CASUAL').reduce((s, l) => s + l.days, 0);
          return sickLeaves > 12 || casualLeaves > 12;
        });

        if (overQuotaEmployees.length > 0) {
          checks.push({
            policyId: 'leave-quota',
            policyName: 'Annual Leave Quota',
            status: 'non_compliant',
            issues: overQuotaEmployees.map(e => ({
              description: `${e.name} has exceeded leave quota`,
              severity: 'medium' as const,
              affectedEntities: [e.id],
              remediation: 'Review and adjust leave records or apply LOP',
            })),
            lastChecked: new Date(),
          });
        } else {
          checks.push({
            policyId: 'leave-quota',
            policyName: 'Annual Leave Quota',
            status: 'compliant',
            issues: [],
            lastChecked: new Date(),
          });
        }
        break;

      case 'attendance':
        // Check for employees with low attendance
        const attendanceCheck = await prisma.employee.findMany({
          where: { isActive: true },
          include: {
            attendance: {
              where: {
                date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
              },
            },
          },
        });

        const lowAttendanceEmployees = attendanceCheck.filter(e => {
          const presentDays = e.attendance.filter(a => a.status === 'PRESENT').length;
          const rate = e.attendance.length > 0 ? presentDays / e.attendance.length : 0;
          return rate < 0.75 && e.attendance.length > 10;
        });

        checks.push({
          policyId: 'min-attendance',
          policyName: 'Minimum Attendance Policy',
          status: lowAttendanceEmployees.length > 0 ? 'warning' : 'compliant',
          issues: lowAttendanceEmployees.map(e => ({
            description: `${e.name} has attendance below 75%`,
            severity: 'low' as const,
            affectedEntities: [e.id],
            remediation: 'Discuss attendance issues with employee',
          })),
          lastChecked: new Date(),
        });
        break;

      case 'payroll':
        // Check for unpaid payrolls
        const unpaidPayrolls = await prisma.payroll.findMany({
          where: {
            status: 'PENDING',
            year: new Date().getFullYear(),
            month: { lt: new Date().getMonth() + 1 },
          },
          include: { employee: { select: { name: true } } },
        });

        checks.push({
          policyId: 'payroll-processing',
          policyName: 'Monthly Payroll Processing',
          status: unpaidPayrolls.length > 0 ? 'non_compliant' : 'compliant',
          issues: unpaidPayrolls.map(p => ({
            description: `Payroll for ${p.employee.name} (${p.month}/${p.year}) is pending`,
            severity: 'high' as const,
            affectedEntities: [p.id],
            remediation: 'Process pending payroll immediately',
          })),
          lastChecked: new Date(),
        });
        break;
    }

    return checks;
  }

  // Smart notification prioritization
  async prioritizeNotifications(
    notifications: { type: string; message: string; entityId: string }[]
  ): Promise<{ type: string; message: string; entityId: string; priority: number; reason: string }[]> {
    const response = await openai.chat.completions.create({
      model: AI_MODELS.GPT35,
      messages: [
        {
          role: 'system',
          content: `Prioritize these HR notifications from 1 (highest) to 5 (lowest).
Consider urgency, impact, and time-sensitivity.
Return JSON array with: type, message, entityId, priority, reason`,
        },
        {
          role: 'user',
          content: JSON.stringify(notifications),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"notifications": []}');
    return (result.notifications || result).sort((a: { priority: number }, b: { priority: number }) => a.priority - b.priority);
  }

  // Create or update automation rule
  async createRule(rule: Omit<AutoApprovalRule, 'id'>): Promise<AutoApprovalRule> {
    const created = await prisma.aIAutomationRule.create({
      data: {
        name: `${rule.type}_rule`,
        type: rule.type === 'leave' ? 'LEAVE_APPROVAL' :
              rule.type === 'expense' ? 'EXPENSE_APPROVAL' : 'ATTENDANCE_ALERT',
        conditions: rule.conditions as unknown as Record<string, unknown>,
        actions: { action: rule.action },
        priority: rule.priority,
        isActive: rule.isActive,
      },
    });

    return {
      id: created.id,
      type: rule.type,
      conditions: rule.conditions,
      action: rule.action,
      priority: rule.priority,
      isActive: rule.isActive,
    };
  }

  // Get all active rules
  async getActiveRules(): Promise<AutoApprovalRule[]> {
    const rules = await prisma.aIAutomationRule.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' },
    });

    return rules.map(r => ({
      id: r.id,
      type: r.type.toLowerCase().replace('_approval', '').replace('_alert', '') as 'leave' | 'expense',
      conditions: (r.conditions as unknown as ApprovalCondition[]) || [],
      action: ((r.actions as Record<string, string>)?.action || 'approve') as 'approve' | 'reject' | 'escalate',
      priority: r.priority,
      isActive: r.isActive,
    }));
  }

  // Get open anomalies
  async getOpenAnomalies(): Promise<AnomalyDetection[]> {
    const anomalies = await prisma.aIAnomaly.findMany({
      where: { status: 'OPEN' },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    });

    return anomalies.map(a => ({
      type: a.type as AnomalyType,
      severity: a.severity as 'low' | 'medium' | 'high' | 'critical',
      description: a.description,
      entityType: a.entityType,
      entityId: a.entityId,
      detectedAt: a.createdAt,
      data: a.data as Record<string, unknown>,
      suggestedAction: a.resolution || undefined,
    }));
  }
}

export const intelligentAutomation = new IntelligentAutomation();
