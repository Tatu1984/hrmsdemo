import { NextRequest, NextResponse } from 'next/server';
import { predictiveAnalytics } from '@/lib/ai/predictive-analytics';
import { verifyAuth, isAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const employeeId = searchParams.get('employeeId');
    const department = searchParams.get('department');

    // Only admins can view predictions for other employees
    if (employeeId && employeeId !== auth.employeeId && !isAdmin(auth.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    switch (type) {
      case 'attrition':
        if (employeeId) {
          const prediction = await predictiveAnalytics.predictAttrition(employeeId);
          return NextResponse.json(prediction);
        } else if (isAdmin(auth.role)) {
          const predictions = await predictiveAnalytics.predictBulkAttrition();
          return NextResponse.json({ predictions });
        }
        break;

      case 'performance':
        if (employeeId) {
          const forecast = await predictiveAnalytics.predictPerformance(employeeId);
          return NextResponse.json(forecast);
        }
        break;

      case 'workload':
        if (department) {
          const prediction = await predictiveAnalytics.predictWorkload(department);
          return NextResponse.json(prediction);
        }
        break;

      case 'team-health':
        const healthScore = await predictiveAnalytics.getTeamHealthScore(department || undefined);
        return NextResponse.json(healthScore);

      default:
        return NextResponse.json(
          { error: 'Invalid prediction type' },
          { status: 400 }
        );
    }

    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  } catch (error) {
    console.error('Predictions API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate predictions' },
      { status: 500 }
    );
  }
}
