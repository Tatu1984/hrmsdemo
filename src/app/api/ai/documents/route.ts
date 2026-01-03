import { NextRequest, NextResponse } from 'next/server';
import { documentProcessor } from '@/lib/ai/document-processing';
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
      case 'process': {
        const { content, fileName, fileType, fileSize } = body;
        if (!content || !fileName || !fileType) {
          return NextResponse.json(
            { error: 'Content, fileName, and fileType are required' },
            { status: 400 }
          );
        }
        const result = await documentProcessor.processDocument(content, fileName, fileType, fileSize || 0);
        return NextResponse.json(result);
      }

      case 'classify': {
        const { content } = body;
        if (!content) {
          return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }
        const category = await documentProcessor.classifyDocument(content);
        return NextResponse.json({ category });
      }

      case 'auto-tag': {
        const { content } = body;
        if (!content) {
          return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }
        const tags = await documentProcessor.autoTagDocument(content);
        return NextResponse.json({ tags });
      }

      case 'analyze-contract': {
        const { content } = body;
        if (!content) {
          return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }
        const analysis = await documentProcessor.analyzeContract(content);
        return NextResponse.json(analysis);
      }

      case 'validate': {
        const { content, documentType } = body;
        if (!content || !documentType) {
          return NextResponse.json(
            { error: 'Content and documentType are required' },
            { status: 400 }
          );
        }
        const validation = await documentProcessor.validateDocument(content, documentType);
        return NextResponse.json(validation);
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Documents API error:', error);
    return NextResponse.json(
      { error: 'Failed to process document' },
      { status: 500 }
    );
  }
}
