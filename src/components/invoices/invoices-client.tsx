'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { InvoiceDialog } from '@/components/forms/invoice-dialog';
import { InvoiceUploadDialog } from '@/components/forms/invoice-upload-dialog';
import { InvoiceViewDialog } from './invoice-view-dialog';
import { InvoiceEditDialog } from './invoice-edit-dialog';
import { FileText, DollarSign, AlertCircle, CheckCircle, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string | null;
  clientAddress: string | null;
  amount: number;
  currency: string;
  status: string;
  dueDate: Date | null;
  fileUrl: string | null;
  paidAmount: number | null;
  paidDate: Date | null;
  createdAt: Date;
}

interface InvoicesClientProps {
  invoices: Invoice[];
  summary: {
    totalInvoices: number;
    totalAmount: number;
    dueCount: number;
    totalDue: number;
    paidCount: number;
    totalPaid: number;
  };
}

export function InvoicesClient({ invoices, summary }: InvoicesClientProps) {
  const router = useRouter();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleInvoiceClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setViewDialogOpen(true);
  };

  const handleEdit = (e: React.MouseEvent, invoice: Invoice) => {
    e.stopPropagation();
    setSelectedInvoice(invoice);
    setEditDialogOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, invoiceId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return;
    }

    setDeleting(invoiceId);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete invoice');
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Failed to delete invoice');
    } finally {
      setDeleting(null);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-700',
      SENT: 'bg-blue-100 text-blue-700',
      PAID: 'bg-green-100 text-green-700',
      OVERDUE: 'bg-red-100 text-red-700',
      CANCELLED: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-gray-600">Generate and manage client invoices</p>
        </div>
        <div className="flex gap-2">
          <InvoiceUploadDialog />
          <InvoiceDialog />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold">{summary.totalInvoices}</p>
                <p className="text-xs text-gray-500">{formatCurrency(summary.totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Due Invoices</p>
                <p className="text-2xl font-bold text-orange-600">{summary.dueCount}</p>
                <p className="text-xs text-gray-500">{formatCurrency(summary.totalDue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Paid Invoices</p>
                <p className="text-2xl font-bold text-green-600">{summary.paidCount}</p>
                <p className="text-xs text-gray-500">{formatCurrency(summary.totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Outstanding</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(summary.totalDue)}
                </p>
                <p className="text-xs text-gray-500">{summary.dueCount} invoices</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-gray-600">No invoices created yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Invoice #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Paid</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Due Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Created</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleInvoiceClick(invoice)}
                    >
                      <td className="px-4 py-3 text-sm font-medium">{invoice.invoiceNumber}</td>
                      <td className="px-4 py-3 text-sm">{invoice.clientName}</td>
                      <td className="px-4 py-3 text-sm font-semibold">
                        {invoice.currency} {formatCurrency(invoice.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {invoice.paidAmount ? (
                          <span className="text-green-600 font-medium">
                            {formatCurrency(invoice.paidAmount)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">{invoice.dueDate ? formatDate(invoice.dueDate) : '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(invoice.createdAt)}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleEdit(e, invoice)}
                            className="h-8 w-8 p-0"
                            title="Edit invoice"
                          >
                            <Edit2 className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDelete(e, invoice.id)}
                            disabled={deleting === invoice.id}
                            className="h-8 w-8 p-0"
                            title="Delete invoice"
                          >
                            <Trash2 className={`w-4 h-4 ${deleting === invoice.id ? 'text-gray-400' : 'text-red-600'}`} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <InvoiceViewDialog
        invoice={selectedInvoice}
        open={viewDialogOpen}
        onClose={() => {
          setViewDialogOpen(false);
          setSelectedInvoice(null);
        }}
      />

      <InvoiceEditDialog
        invoice={selectedInvoice}
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedInvoice(null);
        }}
      />
    </div>
  );
}
