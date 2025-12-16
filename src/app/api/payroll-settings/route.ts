import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      pfPercentage,
      esiPercentage,
      tdsPercentage,
      professionalTax,
      basicSalaryPercentage,
      variablePayPercentage,
      showPF,
      showESI,
      showTDS,
      showProfessionalTax,
    } = body;

    // Check if settings exist
    const existing = await prisma.salaryConfig.findFirst();

    const settingsData = {
      pfPercentage: parseFloat(pfPercentage) || 12,
      esiPercentage: parseFloat(esiPercentage) || 0.75,
      taxSlabs: {
        tdsPercentage: parseFloat(tdsPercentage) || 10,
        professionalTax: parseFloat(professionalTax) || 200,
      },
      bonusRules: {
        basicSalaryPercentage: parseFloat(basicSalaryPercentage) || 70,
        variablePayPercentage: parseFloat(variablePayPercentage) || 30,
        displayOptions: {
          showPF: showPF !== false,
          showESI: showESI !== false,
          showTDS: showTDS !== false,
          showProfessionalTax: showProfessionalTax !== false,
        },
      },
    };

    let settings;
    if (existing) {
      settings = await prisma.salaryConfig.update({
        where: { id: existing.id },
        data: settingsData,
      });
    } else {
      settings = await prisma.salaryConfig.create({
        data: settingsData,
      });
    }

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Error updating payroll settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const settings = await prisma.salaryConfig.findFirst();
    return NextResponse.json(settings || {});
  } catch (error) {
    console.error('Error fetching payroll settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}
