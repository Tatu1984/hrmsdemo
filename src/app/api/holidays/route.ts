import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/holidays - Get all holidays
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    const where: any = {};

    if (year) {
      const yearNum = parseInt(year);
      const monthNum = month ? parseInt(month) : null;

      if (monthNum !== null) {
        // Filter by specific month - use date range for timezone safety
        const startDate = new Date(yearNum, monthNum, 1);
        const endDate = new Date(yearNum, monthNum + 1, 0, 23, 59, 59, 999);
        where.date = {
          gte: startDate,
          lte: endDate,
        };
      } else {
        // Filter by year - use date range for timezone safety
        // This catches holidays regardless of how they were stored
        const startOfYear = new Date(yearNum, 0, 1);
        const endOfYear = new Date(yearNum, 11, 31, 23, 59, 59, 999);
        where.OR = [
          { year: yearNum },
          {
            date: {
              gte: startOfYear,
              lte: endOfYear,
            },
          },
        ];
      }
    }

    const holidays = await prisma.holiday.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { date: 'asc' },
    });

    return NextResponse.json(holidays);
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return NextResponse.json({ error: 'Failed to fetch holidays' }, { status: 500 });
  }
}

// POST /api/holidays - Create a new holiday (Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const body = await request.json();
    const { name, date, isOptional, description } = body;

    if (!name || !date) {
      return NextResponse.json({ error: 'Name and date are required' }, { status: 400 });
    }

    const holidayDate = new Date(date);
    const year = holidayDate.getFullYear();

    const holiday = await prisma.holiday.create({
      data: {
        name,
        date: holidayDate,
        year,
        isOptional: isOptional || false,
        description,
      },
    });

    return NextResponse.json(holiday, { status: 201 });
  } catch (error) {
    console.error('Error creating holiday:', error);
    return NextResponse.json({ error: 'Failed to create holiday' }, { status: 500 });
  }
}

// PUT /api/holidays - Update a holiday (Admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Holiday ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { name, date, isOptional, description } = body;

    const holidayDate = new Date(date);
    const year = holidayDate.getFullYear();

    const holiday = await prisma.holiday.update({
      where: { id },
      data: {
        name,
        date: holidayDate,
        year,
        isOptional: isOptional || false,
        description,
      },
    });

    return NextResponse.json(holiday);
  } catch (error) {
    console.error('Error updating holiday:', error);
    return NextResponse.json({ error: 'Failed to update holiday' }, { status: 500 });
  }
}

// DELETE /api/holidays - Delete a holiday (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Holiday ID is required' }, { status: 400 });
    }

    await prisma.holiday.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Holiday deleted successfully' });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    return NextResponse.json({ error: 'Failed to delete holiday' }, { status: 500 });
  }
}
