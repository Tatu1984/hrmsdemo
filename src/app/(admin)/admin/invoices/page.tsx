import { prisma } from '@/lib/db';
import { InvoicesClient } from '@/components/invoices/invoices-client';

export default async function InvoicesPage() {
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: 'desc' },
  });

  // Calculate summary statistics
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const dueInvoices = invoices.filter(inv => inv.status !== 'PAID' && inv.status !== 'CANCELLED');
  const totalDue = dueInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const paidInvoices = invoices.filter(inv => inv.status === 'PAID');
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);

  return (
    <InvoicesClient
      invoices={invoices}
      summary={{
        totalInvoices: invoices.length,
        totalAmount,
        dueCount: dueInvoices.length,
        totalDue,
        paidCount: paidInvoices.length,
        totalPaid,
      }}
    />
  );
}
