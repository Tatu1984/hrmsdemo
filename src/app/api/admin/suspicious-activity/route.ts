import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    // Only admins can view suspicious activity
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const employeeId = searchParams.get('employeeId');

    // Build query for suspicious activity logs
    const where: any = {
      suspicious: true, // Only get suspicious activity
    };

    // Date range filter
    if (startDate && endDate) {
      where.timestamp = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      where.timestamp = {
        gte: thirtyDaysAgo,
      };
    }

    // Employee filter
    if (employeeId) {
      where.attendance = {
        employeeId,
      };
    }

    // Fetch suspicious activity logs
    const suspiciousLogs = await prisma.activityLog.findMany({
      where,
      include: {
        attendance: {
          include: {
            employee: {
              select: {
                id: true,
                employeeId: true,
                name: true,
                designation: true,
                department: true,
              },
            },
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 500, // Limit to 500 most recent
    });

    // Group by employee and date for summary
    const summaryMap = new Map<string, {
      employee: any;
      date: string;
      count: number;
      timestamps: Date[];
      patterns: Array<{
        type: string;
        details: string;
        timestamp: Date;
        confidence: string | null;
        confidenceScore: number | null;
        durationMs: number | null;
      }>;
      // Aggregated fingerprint info (take from first log of the day)
      fingerprint: {
        ipAddress: string | null;
        browserName: string | null;
        browserVersion: string | null;
        osName: string | null;
        osVersion: string | null;
        deviceType: string | null;
        screenResolution: string | null;
        timezone: string | null;
      } | null;
      // Track unique IPs for the day
      uniqueIps: Set<string>;
      // Total duration of suspicious patterns
      totalDurationMs: number;
      // Highest confidence level seen
      highestConfidence: string | null;
      highestConfidenceScore: number;
    }>();

    suspiciousLogs.forEach(log => {
      const key = `${log.attendance.employeeId}_${new Date(log.attendance.date).toISOString().split('T')[0]}`;

      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          employee: log.attendance.employee,
          date: new Date(log.attendance.date).toISOString().split('T')[0],
          count: 0,
          timestamps: [],
          patterns: [],
          fingerprint: log.browserName ? {
            ipAddress: log.ipAddress,
            browserName: log.browserName,
            browserVersion: log.browserVersion,
            osName: log.osName,
            osVersion: log.osVersion,
            deviceType: log.deviceType,
            screenResolution: log.screenResolution,
            timezone: log.timezone,
          } : null,
          uniqueIps: new Set(),
          totalDurationMs: 0,
          highestConfidence: null,
          highestConfidenceScore: 0,
        });
      }

      const summary = summaryMap.get(key)!;
      summary.count++;
      summary.timestamps.push(new Date(log.timestamp));

      // Track unique IPs
      if (log.ipAddress) {
        summary.uniqueIps.add(log.ipAddress);
      }

      // Track total duration
      if (log.durationMs) {
        summary.totalDurationMs += log.durationMs;
      }

      // Track highest confidence
      if (log.confidenceScore && log.confidenceScore > summary.highestConfidenceScore) {
        summary.highestConfidenceScore = log.confidenceScore;
        summary.highestConfidence = log.confidence;
      }

      if (log.patternType && log.patternDetails) {
        summary.patterns.push({
          type: log.patternType,
          details: log.patternDetails,
          timestamp: new Date(log.timestamp),
          confidence: log.confidence,
          confidenceScore: log.confidenceScore,
          durationMs: log.durationMs,
        });
      }
    });

    // Convert to array and sort by count (most suspicious first)
    // Also convert Sets to arrays for JSON serialization
    const summary = Array.from(summaryMap.values())
      .map(item => ({
        ...item,
        uniqueIps: Array.from(item.uniqueIps),
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      totalSuspicious: suspiciousLogs.length,
      summary,
      logs: suspiciousLogs,
    });
  } catch (error) {
    console.error('Error fetching suspicious activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suspicious activity' },
      { status: 500 }
    );
  }
}
