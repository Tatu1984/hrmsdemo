import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/employees/[id]/documents - Get all documents for an employee
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const params = await context.params;
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: employeeId } = params;

    // Authorization
    if (
      session.role !== 'ADMIN' &&
      session.role !== 'MANAGER' &&
      session.employeeId !== employeeId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const documents = await prisma.employeeDocument.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

// POST /api/employees/[id]/documents - Upload a new document
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const params = await context.params;
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: employeeId } = params;

    // Authorization
    if (session.role !== 'ADMIN' && session.employeeId !== employeeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('documentType') as string;
    const documentName = formData.get('documentName') as string;
    const documentNumber = formData.get('documentNumber') as string | null;
    const issuedDate = formData.get('issuedDate') as string | null;
    const expiryDate = formData.get('expiryDate') as string | null;
    const issuingAuthority = formData.get('issuingAuthority') as string | null;
    const notes = formData.get('notes') as string | null;

    if (!file || !documentType || !documentName) {
      return NextResponse.json(
        { error: 'File, document type, and document name are required' },
        { status: 400 }
      );
    }

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'documents', employeeId);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    // Create database record
    const document = await prisma.employeeDocument.create({
      data: {
        employeeId,
        documentType,
        documentName,
        fileName: file.name,
        fileUrl: `/uploads/documents/${employeeId}/${fileName}`,
        fileSize: file.size,
        mimeType: file.type,
        documentNumber,
        issuedDate: issuedDate ? new Date(issuedDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        issuingAuthority,
        notes,
        uploadedBy: session.employeeId || session.id,
      },
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}
