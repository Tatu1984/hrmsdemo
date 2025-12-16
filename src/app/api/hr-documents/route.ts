import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET - Fetch all HR documents
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const where = type ? { type, isActive: true } : { isActive: true };

    const documents = await prisma.hRDocument.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching HR documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

// POST - Create new HR document
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, title, description, content, filePath, year } = body;

    const document = await prisma.hRDocument.create({
      data: {
        type,
        title,
        description,
        content,
        filePath,
        year,
        createdBy: session.userId,
        updatedBy: session.userId,
      },
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error('Error creating HR document:', error);
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
  }
}
