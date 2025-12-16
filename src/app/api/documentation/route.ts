import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/documentation - Get all Confluence documentation pages
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const spaceKey = searchParams.get('spaceKey');
    const connectionId = searchParams.get('connectionId');

    // Build where clause
    const where: any = {};

    if (connectionId) {
      where.connectionId = connectionId;
    }

    if (spaceKey) {
      where.spaceKey = spaceKey;
    }

    // Get all pages
    const pages = await prisma.confluencePage.findMany({
      where,
      orderBy: [
        { spaceKey: 'asc' },
        { position: 'asc' },
        { title: 'asc' },
      ],
      include: {
        connection: {
          select: {
            id: true,
            name: true,
            platform: true,
          },
        },
      },
    });

    // Build hierarchy
    const pageMap = new Map();
    const rootPages: any[] = [];

    // First pass: create map
    pages.forEach((page) => {
      pageMap.set(page.externalId, {
        ...page,
        children: [],
      });
    });

    // Second pass: build tree
    pages.forEach((page) => {
      const node = pageMap.get(page.externalId);
      if (page.parentId && pageMap.has(page.parentId)) {
        const parent = pageMap.get(page.parentId);
        parent.children.push(node);
      } else {
        rootPages.push(node);
      }
    });

    // Group by space
    const spaceGroups = new Map();
    rootPages.forEach((page) => {
      const key = page.spaceKey || 'unassigned';
      if (!spaceGroups.has(key)) {
        spaceGroups.set(key, {
          spaceKey: page.spaceKey,
          spaceName: page.spaceName,
          pages: [],
        });
      }
      spaceGroups.get(key).pages.push(page);
    });

    return NextResponse.json({
      spaces: Array.from(spaceGroups.values()),
      totalPages: pages.length,
    });
  } catch (error) {
    console.error('Error fetching documentation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documentation' },
      { status: 500 }
    );
  }
}
