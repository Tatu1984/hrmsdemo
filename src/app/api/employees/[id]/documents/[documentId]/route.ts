import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { unlink } from 'fs/promises';
import { join } from 'path';

type RouteContext = {
  params: Promise<{ id: string; documentId: string }>;
};


// DELETE /api/employees/[id]/documents/[documentId] - Delete a document
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  const params = await context.params;
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: employeeId, documentId } = params;

    // Authorization
    if (session.role !== 'ADMIN' && session.employeeId !== employeeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get document to get file path
    const document = await prisma.employeeDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete file from filesystem
    try {
      const filePath = join(process.cwd(), 'public', document.fileUrl);
      await unlink(filePath);
    } catch (error) {
      console.error('Error deleting file:', error);
      // Continue even if file deletion fails
    }

    // Delete database record
    await prisma.employeeDocument.delete({
      where: { id: documentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}

// PUT /api/employees/[id]/documents/[documentId] - Verify a document (Admin only)
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  const params = await context.params;
  try{
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId } = params;

    const document = await prisma.employeeDocument.update({
      where: { id: documentId },
      data: {
        isVerified: true,
        verifiedBy: session.employeeId || session.id,
        verifiedAt: new Date(),
      },
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error('Error verifying document:', error);
    return NextResponse.json(
      { error: 'Failed to verify document' },
      { status: 500 }
    );
  }
}
