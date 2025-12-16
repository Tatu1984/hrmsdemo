import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    console.log('Invoice upload started...');
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      console.log('Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Session validated, parsing form data...');
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const invoiceNumber = formData.get('invoiceNumber') as string;
    const clientName = formData.get('clientName') as string;
    const amount = formData.get('amount') as string;
    const currency = formData.get('currency') as string || 'USD';
    const dueDate = formData.get('dueDate') as string | null;

    console.log('Form data:', { invoiceNumber, clientName, amount, currency, dueDate, fileType: file?.type, fileSize: file?.size });

    if (!file || !invoiceNumber || !clientName || !amount) {
      return NextResponse.json(
        { error: 'File, invoice number, client name, and amount are required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg'];

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExt || '')) {
      console.log('Invalid file type:', file.type, 'Extension:', fileExt);
      return NextResponse.json(
        { error: `Invalid file type. Only PDF, PNG, and JPG files are allowed. Received: ${file.type}` },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'invoices');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.${fileExt}`;
    const filePath = join(uploadsDir, fileName);

    // Write file to disk
    console.log('Writing file to:', filePath);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);
    console.log('File written successfully');

    // Store file path relative to public directory
    const relativeFilePath = `/uploads/invoices/${fileName}`;
    console.log('Relative file path:', relativeFilePath);

    // Create invoice record in database
    console.log('Creating invoice record in database...');
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        clientName,
        clientEmail: '',
        clientAddress: '',
        amount: parseFloat(amount),
        currency: currency,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: 'DRAFT',
        items: [],
        fileUrl: relativeFilePath,
      },
    });
    console.log('Invoice created successfully:', invoice.id);

    return NextResponse.json({
      success: true,
      message: 'Invoice uploaded successfully',
      invoice,
      fileUrl: relativeFilePath,
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading invoice:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to upload invoice', details: errorMessage },
      { status: 500 }
    );
  }
}
