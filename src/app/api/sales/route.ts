import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/sales - Get all sales
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = {};

    if (status) {
      where.status = status;
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            leadNumber: true,
            companyName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(sales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}

// POST /api/sales - Create new sale (and optionally convert from lead)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      leadId,
      companyName,
      contactName,
      email,
      phone,
      product,
      quantity,
      unitPrice,
      upfrontAmount,
      discount,
      taxPercentage,
      closedBy,
      notes,
      createAccountEntry,
      createProject
    } = body;

    if (!companyName || !contactName || !email || !phone || !product || !unitPrice || !upfrontAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate sale number
    const lastSale = await prisma.sale.findFirst({
      orderBy: { saleNumber: 'desc' },
    });

    let saleNumber: string;
    if (lastSale && lastSale.saleNumber.startsWith('SL')) {
      const lastNum = parseInt(lastSale.saleNumber.replace('SL', ''));
      saleNumber = `SL${String(lastNum + 1).padStart(5, '0')}`;
    } else {
      saleNumber = 'SL00001';
    }

    // Calculate amounts
    const qty = parseInt(quantity) || 1;
    const price = parseFloat(unitPrice);
    const grossAmount = qty * price;
    const discountAmount = parseFloat(discount) || 0;
    const amountAfterDiscount = grossAmount - discountAmount;
    const taxPercent = parseFloat(taxPercentage) || 0;
    const taxAmount = (amountAfterDiscount * taxPercent) / 100;
    const netAmount = amountAfterDiscount + taxAmount;

    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();
    const upfront = parseFloat(upfrontAmount) || 0;

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create sale
      const sale = await tx.sale.create({
        data: {
          saleNumber,
          leadId: leadId || null,
          companyName,
          contactName,
          email,
          phone,
          product,
          quantity: qty,
          unitPrice: price,
          grossAmount,
          upfrontAmount: upfront,
          discount: discountAmount,
          taxPercentage: taxPercent,
          taxAmount,
          netAmount,
          currency: 'USD',
          status: 'PENDING',
          closedBy: closedBy || session.employeeId || null,
          closedAt: now,
          month: currentMonth,
          year: currentYear,
          notes: notes || null,
          accountSynced: false,
          projectSynced: false,
        },
      });

      // If converting from lead, update lead status
      if (leadId) {
        await tx.lead.update({
          where: { id: leadId },
          data: {
            status: 'CONVERTED',
            convertedAt: new Date(),
            saleId: sale.id,
          },
        });
      }

      // Create project if requested
      if (createProject) {
        // Generate Project ID
        const lastProject = await tx.project.findFirst({
          orderBy: { createdAt: 'desc' },
          select: { projectId: true },
        });

        let projectNumber = 1;
        if (lastProject && lastProject.projectId) {
          const match = lastProject.projectId.match(/PRJ(\d+)/);
          if (match) {
            projectNumber = parseInt(match[1]) + 1;
          }
        }

        const projectId = `PRJ${projectNumber.toString().padStart(5, '0')}`;

        // Format milestones if provided
        const milestonesData = body.milestones && body.milestones.length > 0 ? {
          milestones: body.milestones.map((m: any, idx: number) => ({
            id: `milestone-${idx + 1}`,
            name: m.name,
            successCriteria: m.successCriteria,
            payment: parseFloat(m.payment) || 0,
            status: 'pending'
          }))
        } : null;

        const project = await tx.project.create({
          data: {
            projectId,
            name: `${companyName} - ${product}`,
            description: notes || `Project from sale ${saleNumber}`,
            projectType: body.projectType || 'MILESTONE',
            totalBudget: parseFloat(body.totalBudget) || netAmount,
            upfrontPayment: upfront,
            startDate: now,
            status: 'ACTIVE',
            currency: 'INR',
            milestones: milestonesData,
            leadId: leadId || null,
            saleId: sale.id,
          },
        });

        // Mark sale as synced with project
        await tx.sale.update({
          where: { id: sale.id },
          data: {
            projectSynced: true,
            projectId: project.id,
          },
        });
      }

      // Create account entries if requested
      if (createAccountEntry) {
        // Find or create Sales Revenue category
        let category = await tx.accountCategory.findFirst({
          where: { name: 'Sales Revenue', type: 'INCOME' },
        });

        if (!category) {
          category = await tx.accountCategory.create({
            data: {
              name: 'Sales Revenue',
              type: 'INCOME',
              subCategories: [],
            },
          });
        }

        // Create gross income entry
        await tx.account.create({
          data: {
            type: 'INCOME',
            categoryId: category.id,
            amount: grossAmount,
            date: new Date(),
            description: `Sale ${saleNumber} - ${product} - Gross Amount`,
            reference: saleNumber,
          },
        });

        // Create net income entry (after discount and tax)
        await tx.account.create({
          data: {
            type: 'INCOME',
            categoryId: category.id,
            amount: netAmount,
            date: new Date(),
            description: `Sale ${saleNumber} - ${product} - Net Amount (after discount & tax)`,
            reference: saleNumber,
          },
        });

        // Mark sale as synced with accounts
        await tx.sale.update({
          where: { id: sale.id },
          data: { accountSynced: true },
        });
      }

      return sale;
    });

    return NextResponse.json({
      success: true,
      sale: result,
      message: leadId ? 'Lead converted to sale successfully' : 'Sale created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Create sale error:', error);
    return NextResponse.json({ error: 'Failed to create sale' }, { status: 500 });
  }
}

// PUT /api/sales - Update sale
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      status,
      product,
      quantity,
      unitPrice,
      discount,
      taxPercentage,
      notes,
      syncToAccounts
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Sale ID required' }, { status: 400 });
    }

    const existing = await prisma.sale.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    const updateData: any = {};

    // Recalculate if financial fields change
    if (quantity || unitPrice || discount !== undefined || taxPercentage !== undefined) {
      const qty = quantity ? parseInt(quantity) : existing.quantity;
      const price = unitPrice ? parseFloat(unitPrice) : existing.unitPrice;
      const discountAmount = discount !== undefined ? parseFloat(discount) : existing.discount;
      const taxPercent = taxPercentage !== undefined ? parseFloat(taxPercentage) : existing.taxPercentage;

      const grossAmount = qty * price;
      const amountAfterDiscount = grossAmount - discountAmount;
      const taxAmount = (amountAfterDiscount * taxPercent) / 100;
      const netAmount = amountAfterDiscount + taxAmount;

      updateData.quantity = qty;
      updateData.unitPrice = price;
      updateData.grossAmount = grossAmount;
      updateData.discount = discountAmount;
      updateData.taxPercentage = taxPercent;
      updateData.taxAmount = taxAmount;
      updateData.netAmount = netAmount;
    }

    if (status) updateData.status = status;
    if (product) updateData.product = product;
    if (notes !== undefined) updateData.notes = notes;

    // If syncing to accounts and not already synced
    if (syncToAccounts && !existing.accountSynced) {
      await prisma.$transaction(async (tx) => {
        // Find or create Sales Revenue category
        let category = await tx.accountCategory.findFirst({
          where: { name: 'Sales Revenue', type: 'INCOME' },
        });

        if (!category) {
          category = await tx.accountCategory.create({
            data: {
              name: 'Sales Revenue',
              type: 'INCOME',
              subCategories: [],
            },
          });
        }

        const updatedGross = updateData.grossAmount || existing.grossAmount;
        const updatedNet = updateData.netAmount || existing.netAmount;

        // Create account entries
        await tx.account.create({
          data: {
            type: 'INCOME',
            categoryId: category.id,
            amount: updatedGross,
            date: new Date(),
            description: `Sale ${existing.saleNumber} - ${updateData.product || existing.product} - Gross Amount`,
            reference: existing.saleNumber,
          },
        });

        await tx.account.create({
          data: {
            type: 'INCOME',
            categoryId: category.id,
            amount: updatedNet,
            date: new Date(),
            description: `Sale ${existing.saleNumber} - ${updateData.product || existing.product} - Net Amount`,
            reference: existing.saleNumber,
          },
        });

        updateData.accountSynced = true;
      });
    }

    const sale = await prisma.sale.update({
      where: { id },
      data: updateData,
      include: {
        lead: {
          select: {
            id: true,
            leadNumber: true,
            companyName: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, sale });
  } catch (error) {
    console.error('Update sale error:', error);
    return NextResponse.json({ error: 'Failed to update sale' }, { status: 500 });
  }
}

// DELETE /api/sales - Delete sale
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Sale ID required' }, { status: 400 });
    }

    // Check if sale is paid
    const sale = await prisma.sale.findUnique({
      where: { id },
    });

    if (sale?.status === 'PAID') {
      return NextResponse.json({ error: 'Cannot delete paid sale' }, { status: 400 });
    }

    // If sale was converted from lead, revert lead status
    if (sale?.leadId) {
      await prisma.lead.update({
        where: { id: sale.leadId },
        data: {
          status: 'NEGOTIATION',
          convertedAt: null,
          saleId: null,
        },
      });
    }

    await prisma.sale.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete sale error:', error);
    return NextResponse.json({ error: 'Failed to delete sale' }, { status: 500 });
  }
}
