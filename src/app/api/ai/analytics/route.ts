import { NextRequest, NextResponse } from 'next/server';
import { advancedAnalytics } from '@/lib/ai/analytics';
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
      case 'query': {
        const { query } = body;
        if (!query) {
          return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }
        const result = await advancedAnalytics.processNLQuery(auth.userId, query);
        return NextResponse.json(result);
      }

      case 'generate-insights': {
        const insights = await advancedAnalytics.generateInsights();
        return NextResponse.json({ insights });
      }

      case 'what-if': {
        const { name, parameters } = body;
        if (!name || !parameters) {
          return NextResponse.json({ error: 'Name and parameters are required' }, { status: 400 });
        }
        const scenario = await advancedAnalytics.createWhatIfScenario(name, parameters);
        return NextResponse.json(scenario);
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to process analytics request' },
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

    const suggestions = await advancedAnalytics.getQuerySuggestions(auth.userId);
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Analytics GET API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics suggestions' },
      { status: 500 }
    );
  }
}
