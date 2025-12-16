import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { IntegrationSyncService } from '@/lib/integrations/sync-service';

// POST /api/integrations/sync - Trigger manual sync for a connection
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { connectionId, syncWorkItems, syncCommits, startDate } = body;

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }

    // Verify connection exists and user has access
    const connection = await prisma.integrationConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Trigger sync
    const result = await IntegrationSyncService.syncConnection(connectionId, {
      syncWorkItems: syncWorkItems !== false,
      syncCommits: syncCommits !== false,
      startDate: startDate ? new Date(startDate) : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error triggering sync:', error);
    return NextResponse.json(
      { error: 'Failed to trigger sync' },
      { status: 500 }
    );
  }
}

// GET /api/integrations/sync/status - Get sync status for all connections
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connections = await prisma.integrationConnection.findMany({
      select: {
        id: true,
        name: true,
        platform: true,
        lastSyncAt: true,
        lastSyncStatus: true,
        lastSyncError: true,
        syncEnabled: true,
        syncFrequency: true,
      },
      where: {
        isActive: true,
      },
    });

    return NextResponse.json(connections);
  } catch (error) {
    console.error('Error fetching sync status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync status' },
      { status: 500 }
    );
  }
}
