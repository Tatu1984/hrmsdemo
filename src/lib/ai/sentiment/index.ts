// Sentiment Analysis Module
import { openai, AI_MODELS, SENTIMENT_THRESHOLDS } from '../config';
import type {
  SentimentResult,
  TeamSentimentReport,
  SentimentCategory,
  AspectSentiment,
  EmotionScore,
  EmotionType
} from '../types';
import { prisma } from '@/lib/db';

export class SentimentAnalyzer {

  // Analyze sentiment of a single text
  async analyzeSentiment(text: string): Promise<SentimentResult> {
    const response = await openai.chat.completions.create({
      model: AI_MODELS.GPT4,
      messages: [
        {
          role: 'system',
          content: `Analyze the sentiment of this text and return a detailed analysis.

Return JSON:
{
  "sentiment": "positive|negative|neutral|mixed",
  "score": -1 to 1 (negative to positive),
  "confidence": 0 to 1,
  "aspects": [
    {
      "aspect": "work environment|management|compensation|culture|workload|growth|other",
      "sentiment": "positive|negative|neutral|mixed",
      "score": -1 to 1,
      "mentions": ["relevant phrases"]
    }
  ],
  "emotions": [
    {
      "emotion": "joy|sadness|anger|fear|surprise|disgust|trust|anticipation",
      "score": 0 to 1
    }
  ]
}`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    return {
      text,
      sentiment: result.sentiment || 'neutral',
      score: result.score || 0,
      confidence: result.confidence || 0.8,
      aspects: result.aspects || [],
      emotions: result.emotions || [],
    };
  }

  // Batch analyze multiple texts
  async analyzeBatch(texts: string[]): Promise<SentimentResult[]> {
    const results: SentimentResult[] = [];

    // Process in batches of 5 to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(text => this.analyzeSentiment(text))
      );
      results.push(...batchResults);
    }

    return results;
  }

  // Analyze feedback/survey responses for a department
  async analyzeTeamSentiment(
    department?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<TeamSentimentReport> {
    // Fetch messages and feedback (using messages as proxy for feedback)
    const messages = await prisma.message.findMany({
      where: {
        createdAt: {
          gte: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          lte: endDate || new Date(),
        },
        ...(department && {
          sender: {
            department,
          },
        }),
      },
      include: {
        sender: { select: { department: true } },
      },
      take: 100,
    });

    if (messages.length === 0) {
      return {
        teamId: department || 'all',
        period: `${startDate?.toISOString().split('T')[0] || 'last 30 days'} to ${endDate?.toISOString().split('T')[0] || 'now'}`,
        overallSentiment: 0,
        trend: 'stable',
        topPositives: [],
        topConcerns: [],
        recommendations: ['Not enough data for analysis'],
        breakdown: [],
      };
    }

    // Analyze sentiments
    const sentiments = await this.analyzeBatch(messages.map(m => m.content));

    // Calculate overall sentiment
    const overallSentiment = sentiments.reduce((sum, s) => sum + s.score, 0) / sentiments.length;

    // Extract aspects
    const aspectScores: Record<string, { total: number; count: number; mentions: string[] }> = {};
    sentiments.forEach(s => {
      s.aspects?.forEach(a => {
        if (!aspectScores[a.aspect]) {
          aspectScores[a.aspect] = { total: 0, count: 0, mentions: [] };
        }
        aspectScores[a.aspect].total += a.score;
        aspectScores[a.aspect].count++;
        aspectScores[a.aspect].mentions.push(...a.mentions);
      });
    });

    // Identify top positives and concerns
    const sortedAspects = Object.entries(aspectScores)
      .map(([aspect, data]) => ({
        aspect,
        score: data.total / data.count,
        mentions: data.mentions.slice(0, 3),
      }))
      .sort((a, b) => b.score - a.score);

    const topPositives = sortedAspects
      .filter(a => a.score > SENTIMENT_THRESHOLDS.POSITIVE)
      .slice(0, 3)
      .map(a => `${a.aspect}: ${a.mentions[0] || 'positive feedback'}`);

    const topConcerns = sortedAspects
      .filter(a => a.score < SENTIMENT_THRESHOLDS.NEGATIVE)
      .slice(0, 3)
      .map(a => `${a.aspect}: ${a.mentions[0] || 'needs attention'}`);

    // Generate recommendations
    const recommendations = await this.generateRecommendations(
      overallSentiment,
      topConcerns,
      sortedAspects
    );

    // Determine trend (would need historical data in real implementation)
    const trend: 'improving' | 'stable' | 'declining' = 'stable';

    // Create breakdown
    const breakdown = sortedAspects.map(a => ({
      category: a.aspect,
      score: a.score,
      sampleSize: aspectScores[a.aspect].count,
    }));

    // Store analysis results
    for (const sentiment of sentiments) {
      await prisma.aISentimentAnalysis.create({
        data: {
          sourceType: 'MESSAGE',
          sourceId: messages[sentiments.indexOf(sentiment)]?.id || '',
          text: sentiment.text,
          sentiment: sentiment.sentiment,
          score: sentiment.score,
          confidence: sentiment.confidence,
          aspects: sentiment.aspects as unknown as Record<string, unknown>,
          emotions: sentiment.emotions as unknown as Record<string, unknown>,
        },
      });
    }

    return {
      teamId: department || 'all',
      period: `${startDate?.toISOString().split('T')[0] || 'last 30 days'} to ${endDate?.toISOString().split('T')[0] || 'now'}`,
      overallSentiment,
      trend,
      topPositives,
      topConcerns,
      recommendations,
      breakdown,
    };
  }

  // Generate AI recommendations based on sentiment analysis
  private async generateRecommendations(
    overallSentiment: number,
    concerns: string[],
    aspects: { aspect: string; score: number }[]
  ): Promise<string[]> {
    if (concerns.length === 0 && overallSentiment > 0.3) {
      return [
        'Team sentiment is positive - maintain current practices',
        'Consider recognition programs to sustain morale',
      ];
    }

    const response = await openai.chat.completions.create({
      model: AI_MODELS.GPT35,
      messages: [
        {
          role: 'system',
          content: 'Generate 3-5 actionable HR recommendations based on sentiment analysis results.',
        },
        {
          role: 'user',
          content: `Overall Sentiment Score: ${overallSentiment.toFixed(2)}
Top Concerns: ${concerns.join(', ') || 'None identified'}
Aspect Scores: ${aspects.map(a => `${a.aspect}: ${a.score.toFixed(2)}`).join(', ')}`,
        },
      ],
      temperature: 0.5,
    });

    const content = response.choices[0].message.content || '';
    return content.split('\n').filter(line => line.trim().length > 0).slice(0, 5);
  }

  // Detect critical sentiment that needs immediate attention
  async detectCriticalSentiment(text: string): Promise<{
    isCritical: boolean;
    reason?: string;
    suggestedAction?: string;
  }> {
    const sentiment = await this.analyzeSentiment(text);

    if (sentiment.score < SENTIMENT_THRESHOLDS.CRITICAL) {
      return {
        isCritical: true,
        reason: 'Highly negative sentiment detected',
        suggestedAction: 'Immediate manager or HR intervention recommended',
      };
    }

    // Check for concerning emotions
    const concerningEmotions = sentiment.emotions?.filter(
      e => ['anger', 'fear', 'sadness'].includes(e.emotion) && e.score > 0.7
    );

    if (concerningEmotions && concerningEmotions.length > 0) {
      return {
        isCritical: true,
        reason: `High ${concerningEmotions.map(e => e.emotion).join(', ')} detected`,
        suggestedAction: 'Consider reaching out to the employee',
      };
    }

    return { isCritical: false };
  }

  // Track sentiment over time for an employee
  async getEmployeeSentimentTrend(employeeId: string, days: number = 30): Promise<{
    trend: 'improving' | 'stable' | 'declining';
    dataPoints: { date: string; score: number }[];
    averageScore: number;
  }> {
    const analyses = await prisma.aISentimentAnalysis.findMany({
      where: {
        sourceId: employeeId,
        createdAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (analyses.length === 0) {
      return {
        trend: 'stable',
        dataPoints: [],
        averageScore: 0,
      };
    }

    const dataPoints = analyses.map(a => ({
      date: a.createdAt.toISOString().split('T')[0],
      score: a.score,
    }));

    const averageScore = analyses.reduce((sum, a) => sum + a.score, 0) / analyses.length;

    // Calculate trend
    const halfPoint = Math.floor(analyses.length / 2);
    const firstHalfAvg = analyses.slice(0, halfPoint).reduce((s, a) => s + a.score, 0) / halfPoint;
    const secondHalfAvg = analyses.slice(halfPoint).reduce((s, a) => s + a.score, 0) / (analyses.length - halfPoint);

    let trend: 'improving' | 'stable' | 'declining';
    if (secondHalfAvg > firstHalfAvg + 0.1) trend = 'improving';
    else if (secondHalfAvg < firstHalfAvg - 0.1) trend = 'declining';
    else trend = 'stable';

    return { trend, dataPoints, averageScore };
  }

  // Analyze survey responses
  async analyzeSurveyResponses(
    surveyId: string,
    responses: { question: string; answer: string }[]
  ): Promise<{
    overallScore: number;
    questionAnalysis: {
      question: string;
      sentiment: SentimentCategory;
      score: number;
      keyThemes: string[];
    }[];
    actionItems: string[];
  }> {
    const questionAnalysis = await Promise.all(
      responses.map(async (r) => {
        const sentiment = await this.analyzeSentiment(r.answer);
        return {
          question: r.question,
          sentiment: sentiment.sentiment,
          score: sentiment.score,
          keyThemes: sentiment.aspects?.map(a => a.aspect) || [],
        };
      })
    );

    const overallScore = questionAnalysis.reduce((sum, q) => sum + q.score, 0) / questionAnalysis.length;

    // Generate action items
    const lowScoreQuestions = questionAnalysis.filter(q => q.score < 0);
    const actionItems = lowScoreQuestions.length > 0
      ? await this.generateActionItems(lowScoreQuestions)
      : ['No immediate action items - positive responses overall'];

    return { overallScore, questionAnalysis, actionItems };
  }

  // Generate action items from low-score responses
  private async generateActionItems(
    lowScoreQuestions: { question: string; score: number; keyThemes: string[] }[]
  ): Promise<string[]> {
    const response = await openai.chat.completions.create({
      model: AI_MODELS.GPT35,
      messages: [
        {
          role: 'system',
          content: 'Generate specific, actionable HR recommendations based on negative survey responses.',
        },
        {
          role: 'user',
          content: `Negative responses detected:\n${lowScoreQuestions.map(q => `Q: ${q.question}\nScore: ${q.score}\nThemes: ${q.keyThemes.join(', ')}`).join('\n\n')}`,
        },
      ],
      temperature: 0.5,
    });

    return (response.choices[0].message.content || '')
      .split('\n')
      .filter(line => line.trim().length > 0)
      .slice(0, 5);
  }
}

export const sentimentAnalyzer = new SentimentAnalyzer();
