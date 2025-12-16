'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Filter, Download, Eye, Edit, Trash2, ArrowRight, Loader2
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Lead {
  id: string;
  leadNumber: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  source: string | null;
  status: string;
  value: number | null;
  sale: {
    id: string;
    saleNumber: string;
    status: string;
    netAmount: number;
  } | null;
}

interface LeadsClientProps {
  leads: Lead[];
  userRole: string;
}

export function LeadsClient({ leads, userRole }: LeadsClientProps) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      NEW: 'bg-blue-100 text-blue-700',
      COLD_CALL_BACK: 'bg-sky-100 text-sky-700',
      WARM: 'bg-amber-100 text-amber-700',
      PROSPECT: 'bg-yellow-100 text-yellow-700',
      SALE_MADE: 'bg-emerald-100 text-emerald-700',
      HOLD: 'bg-orange-100 text-orange-700',
      DORMANT: 'bg-slate-100 text-slate-700',
      CONVERTED: 'bg-green-100 text-green-700',
      LOST: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    setUpdatingStatus(leadId);

    try {
      const response = await fetch(`/api/leads`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId, status: newStatus }),
      });

      if (response.ok) {
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update lead status');
      }
    } catch (error) {
      console.error('Error updating lead status:', error);
      alert('Failed to update lead status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setLoading(true);

    try {
      const response = await fetch(`/api/leads?id=${deleteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDeleteId(null);
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete lead');
      }
    } catch (error) {
      console.error('Error deleting lead:', error);
      alert('Failed to delete lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Lead #</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Company</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Contact</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Source</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Value</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Sale</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{lead.leadNumber}</td>
                <td className="px-4 py-3 text-sm font-semibold">{lead.companyName}</td>
                <td className="px-4 py-3 text-sm">{lead.contactName}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{lead.email}</td>
                <td className="px-4 py-3 text-sm">{lead.phone}</td>
                <td className="px-4 py-3 text-sm">
                  {lead.source ? (
                    <Badge variant="outline">{lead.source}</Badge>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm font-semibold">
                  {lead.value ? formatCurrency(lead.value) : '-'}
                </td>
                <td className="px-4 py-3 text-sm">
                  {lead.status === 'CONVERTED' ? (
                    <Badge className={getStatusColor(lead.status)}>
                      {lead.status}
                    </Badge>
                  ) : (
                    <Select
                      value={lead.status}
                      onValueChange={(value) => handleStatusChange(lead.id, value)}
                      disabled={updatingStatus === lead.id}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue>
                          <Badge className={getStatusColor(lead.status)}>
                            {lead.status}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEW">New</SelectItem>
                        <SelectItem value="COLD_CALL_BACK">Cold Call Back</SelectItem>
                        <SelectItem value="WARM">Warm</SelectItem>
                        <SelectItem value="PROSPECT">Prospect</SelectItem>
                        <SelectItem value="SALE_MADE">Sale Made</SelectItem>
                        <SelectItem value="HOLD">Hold</SelectItem>
                        <SelectItem value="DORMANT">Dormant</SelectItem>
                        <SelectItem value="LOST">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  {lead.sale ? (
                    <Link href={`/admin/sales?id=${lead.sale.id}`}>
                      <Badge className="bg-green-100 text-green-700 cursor-pointer hover:bg-green-200">
                        {lead.sale.saleNumber}
                      </Badge>
                    </Link>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex gap-2">
                    {lead.status !== 'CONVERTED' && (
                      <>
                        <Button variant="ghost" size="sm" title="Convert to Sale">
                          <ArrowRight className="w-4 h-4 text-blue-600" />
                        </Button>
                      </>
                    )}
                    {userRole === 'ADMIN' && lead.status !== 'CONVERTED' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(lead.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this lead. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
