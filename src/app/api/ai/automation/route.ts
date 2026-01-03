import { NextRequest, NextResponse } from 'next/server';
import { intelligentAutomation } from '@/lib/ai/automation';
import { verifyAuth, isAdmin } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !isAdmin(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'evaluate-leave': {
        const { leaveId } = body;
        if (!leaveId) {
          return NextResponse.json({ error: 'Leave ID is required' }, { status: 400 });
        }
        const result = await intelligentAutomation.evaluateLeaveRequest(leaveId);
        return NextResponse.json(result);
      }

      case 'detect-attendance-anomalies': {
        const { employeeId } = body;
        if (!employeeId) {
          return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
        }
        const anomalies = await intelligentAutomation.detectAttendanceAnomalies(employeeId);
        return NextResponse.json({ anomalies });
      }

      case 'detect-expense-anomalies': {
        const { accountId } = body;
        if (!accountId) {
          return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
        }
        const anomaly = await intelligentAutomation.detectExpenseAnomalies(accountId);
        return NextResponse.json({ anomaly });
      }

      case 'check-compliance': {
        const { type } = body;
        if (!type || !['leave', 'attendance', 'payroll'].includes(type)) {
          return NextResponse.json({ error: 'Valid compliance type is required' }, { status: 400 });
        }
        const checks = await intelligentAutomation.checkCompliance(type);
        return NextResponse.json({ checks });
      }

      case 'prioritize-notifications': {
        const { notifications } = body;
        if (!notifications || !Array.isArray(notifications)) {
          return NextResponse.json({ error: 'Notifications array is required' }, { status: 400 });
        }
        const prioritized = await intelligentAutomation.prioritizeNotifications(notifications);
        return NextResponse.json({ notifications: prioritized });
      }

      case 'create-rule': {
        const { rule } = body;
        if (!rule) {
          return NextResponse.json({ error: 'Rule configuration is required' }, { status: 400 });
        }
        const created = await intelligentAutomation.createRule(rule);
        return NextResponse.json(created);
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Automation API error:', error);
    return NextResponse.json(
      { error: 'Failed to process automation request' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !isAdmin(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    switch (type) {
      case 'rules':
        const rules = await intelligentAutomation.getActiveRules();
        return NextResponse.json({ rules });

      case 'anomalies':
        const anomalies = await intelligentAutomation.getOpenAnomalies();
        return NextResponse.json({ anomalies });

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Automation GET API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch automation data' },
      { status: 500 }
    );
  }
}
