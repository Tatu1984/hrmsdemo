import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let profile = await prisma.companyProfile.findFirst({
      include: {
        bankAccounts: {
          orderBy: [
            { isDefault: 'desc' },
            { createdAt: 'desc' },
          ],
        },
      },
    });

    if (!profile) {
      // Create default profile if none exists
      profile = await prisma.companyProfile.create({
        data: {
          companyName: 'Your Company Name',
          country: 'Country',
        },
        include: {
          bankAccounts: true,
        },
      });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error fetching company profile:', error);
    return NextResponse.json({ error: 'Failed to fetch company profile' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Get existing profile or create new one
    let profile = await prisma.companyProfile.findFirst();

    if (profile) {
      // Update existing profile
      profile = await prisma.companyProfile.update({
        where: { id: profile.id },
        data: {
          companyName: body.companyName,
          address1: body.address1,
          address2: body.address2,
          city: body.city,
          state: body.state,
          pincode: body.pincode,
          country: body.country,
          phone: body.phone,
          email: body.email,
          website: body.website,
          logo: body.logo,
          panNumber: body.panNumber,
          gstNumber: body.gstNumber,
          cinNumber: body.cinNumber,
        },
      });
    } else {
      // Create new profile
      profile = await prisma.companyProfile.create({
        data: {
          companyName: body.companyName,
          address1: body.address1,
          address2: body.address2,
          city: body.city,
          state: body.state,
          pincode: body.pincode,
          country: body.country,
          phone: body.phone,
          email: body.email,
          website: body.website,
          logo: body.logo,
          panNumber: body.panNumber,
          gstNumber: body.gstNumber,
          cinNumber: body.cinNumber,
        },
      });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error updating company profile:', error);
    return NextResponse.json({ error: 'Failed to update company profile' }, { status: 500 });
  }
}
