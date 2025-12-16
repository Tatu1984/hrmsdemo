'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { X, ExternalLink, CheckCircle, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MiniCurrencyConverter } from '@/components/currency/mini-currency-converter';
import { CurrencyCode, CURRENCIES } from '@/lib/currencies';

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
  paidAmount?: number | null;
  paidDate?: Date | null;
  createdAt: Date;
}

interface InvoiceViewDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onClose: () => void;
}

export function InvoiceViewDialog({ invoice, open, onClose }: InvoiceViewDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paidDate, setPaidDate] = useState('');
  const [paidCurrency, setPaidCurrency] = useState<CurrencyCode>(invoice?.currency as CurrencyCode || 'USD');

  if (!invoice) return null;

  const handleStatusUpdate = async () => {
    if (!status) {
      alert('Please select a status');
      return;
    }

    setLoading(true);
    try {
      const updateData: any = { status };

      if (status === 'PAID') {
        if (!paidAmount || !paidDate) {
          alert('Please provide paid amount and date for marking as PAID');
          setLoading(false);
          return;
        }
        updateData.paidAmount = parseFloat(paidAmount);
        updateData.paidDate = new Date(paidDate).toISOString();
        updateData.paidCurrency = paidCurrency;
      }

      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        alert('Invoice updated successfully');
        router.refresh();
        onClose();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update invoice');
      }
    } catch (error) {
      console.error('Error updating invoice:', error);
      alert('Failed to update invoice');
    } finally {
      setLoading(false);
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Invoice Details</DialogTitle>
            <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-gray-500">Invoice Number</Label>
              <p className="font-semibold text-lg">{invoice.invoiceNumber}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Amount</Label>
              <p className="font-semibold text-lg">{formatCurrency(invoice.amount)}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Client Name</Label>
              <p className="font-medium">{invoice.clientName}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Due Date</Label>
              <p className="font-medium">{invoice.dueDate ? formatDate(invoice.dueDate) : 'Not set'}</p>
            </div>
            {invoice.clientEmail && (
              <div>
                <Label className="text-sm text-gray-500">Client Email</Label>
                <p className="font-medium">{invoice.clientEmail}</p>
              </div>
            )}
            {invoice.clientAddress && (
              <div>
                <Label className="text-sm text-gray-500">Client Address</Label>
                <p className="font-medium">{invoice.clientAddress}</p>
              </div>
            )}
            <div>
              <Label className="text-sm text-gray-500">Created On</Label>
              <p className="font-medium">{formatDate(invoice.createdAt)}</p>
            </div>
          </div>

          {/* Payment Information (if paid) */}
          {invoice.status === 'PAID' && invoice.paidAmount && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Payment Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">Paid Amount</Label>
                  <p className="font-semibold text-green-600">{formatCurrency(invoice.paidAmount)}</p>
                </div>
                {invoice.paidDate && (
                  <div>
                    <Label className="text-sm text-gray-500">Payment Date</Label>
                    <p className="font-medium">{formatDate(invoice.paidDate)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Uploaded File */}
          {invoice.fileUrl && (
            <div className="border-t pt-4">
              <Label className="text-sm text-gray-500 mb-2 block">Uploaded Invoice File</Label>
              <div className="flex items-center gap-3">
                <a
                  href={invoice.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Invoice File
                </a>
                <a
                  href={invoice.fileUrl}
                  download
                  className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
              </div>
            </div>
          )}

          {/* Status Update Section */}
          {invoice.status !== 'PAID' && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Update Invoice Status</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="status">New Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SENT">Mark as Sent</SelectItem>
                      <SelectItem value="PAID">Mark as Paid</SelectItem>
                      <SelectItem value="OVERDUE">Mark as Overdue</SelectItem>
                      <SelectItem value="CANCELLED">Cancel Invoice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {status === 'PAID' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="paidAmount">Amount Received</Label>
                        <Input
                          id="paidAmount"
                          type="number"
                          step="0.01"
                          value={paidAmount}
                          onChange={(e) => setPaidAmount(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="paidCurrency">Currency</Label>
                        <Select value={paidCurrency} onValueChange={(value) => setPaidCurrency(value as CurrencyCode)}>
                          <SelectTrigger id="paidCurrency">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {CURRENCIES.map((currency) => (
                              <SelectItem key={currency.code} value={currency.code}>
                                <div className="flex items-center gap-2">
                                  <span>{currency.flag}</span>
                                  <span className="font-medium">{currency.code}</span>
                                  <span className="text-gray-500 text-sm">- {currency.symbol}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="paidDate">Payment Date</Label>
                      <Input
                        id="paidDate"
                        type="date"
                        value={paidDate}
                        onChange={(e) => setPaidDate(e.target.value)}
                      />
                    </div>
                    {paidAmount && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                        <MiniCurrencyConverter
                          defaultAmount={parseFloat(paidAmount)}
                          defaultFrom={paidCurrency}
                          defaultTo="INR"
                        />
                      </div>
                    )}
                  </>
                )}

                <Button onClick={handleStatusUpdate} disabled={loading} className="w-full">
                  {loading ? 'Updating...' : 'Update Status'}
                </Button>
              </div>
            </div>
          )}

          {/* Currency Converter */}
          <div className="border-t pt-4 mt-4">
            <MiniCurrencyConverter
              defaultAmount={invoice.amount}
              defaultFrom={invoice.currency as CurrencyCode}
              defaultTo="INR"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
