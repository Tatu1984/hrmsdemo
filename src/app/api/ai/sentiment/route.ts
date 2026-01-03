import { NextRequest, NextResponse } from 'next/server';
import { sentimentAnalyzer } from '@/lib/ai/sentiment';
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
      case 'analyze': {
        const { text } = body;
        if (!text) {
          return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }
        const result = await sentimentAnalyzer.analyzeSentiment(text);
        return NextResponse.json(result);
      }

      case 'analyze-batch': {
        const { texts } = body;
        if (!texts || !Array.isArray(texts)) {
          return NextResponse.json({ error: 'Texts array is required' }, { status: 400 });
        }
        const results = await sentimentAnalyzer.analyzeBatch(texts);
        return NextResponse.json({ results });
      }

      case 'team-report': {
        const { department, startDate, endDate } = body;
        const report = await sentimentAnalyzer.analyzeTeamSentiment(
          department,
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined
        );
        return NextResponse.json(report);
      }

      case 'detect-critical': {
        const { text } = body;
        if (!text) {
          return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }
        const result = await sentimentAnalyzer.detectCriticalSentiment(text);
        return NextResponse.json(result);
      }

      case 'employee-trend': {
        const { employeeId, days } = body;
        if (!employeeId) {
          return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
        }
        const trend = await sentimentAnalyzer.getEmployeeSentimentTrend(employeeId, days || 30);
        return NextResponse.json(trend);
      }

      case 'analyze-survey': {
        const { surveyId, responses } = body;
        if (!surveyId || !responses) {
          return NextResponse.json({ error: 'Survey ID and responses are required' }, { status: 400 });
        }
        const analysis = await sentimentAnalyzer.analyzeSurveyResponses(surveyId, responses);
        return NextResponse.json(analysis);
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Sentiment API error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze sentiment' },
      { status: 500 }
    );
  }
}
