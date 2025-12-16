import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Filter, Download, TrendingUp, ArrowRight
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { LeadDialog } from '@/components/forms/lead-dialog';
import { LeadsClient } from '@/components/pages/leads-client';

export default async function LeadsPage() {
  const session = await getSession();

  const leads = await prisma.lead.findMany({
    include: {
      sale: {
        select: {
          id: true,
          saleNumber: true,
          status: true,
          netAmount: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Calculate stats
  const totalLeads = leads.length;
  const convertedLeads = leads.filter(l => l.status === 'CONVERTED').length;
  const activeLeads = leads.filter(l => !['CONVERTED', 'LOST'].includes(l.status)).length;
  const totalValue = leads.reduce((sum, l) => sum + (l.value || 0), 0);
  const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0';

  const stats = [
    {
      label: 'Total Leads',
      value: totalLeads.toString(),
      icon: TrendingUp,
      color: 'bg-blue-500'
    },
    {
      label: 'Active Leads',
      value: activeLeads.toString(),
      icon: TrendingUp,
      color: 'bg-green-500'
    },
    {
      label: 'Converted',
      value: convertedLeads.toString(),
      icon: ArrowRight,
      color: 'bg-purple-500'
    },
    {
      label: 'Conversion Rate',
      value: `${conversionRate}%`,
      icon: TrendingUp,
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leads Management</h1>
          <p className="text-gray-500 mt-1">Track and manage your sales pipeline</p>
        </div>
        <LeadDialog />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <Card key={idx}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-1">{stat.value}</h3>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pipeline Value */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">
            {formatCurrency(totalValue)}
          </div>
          <p className="text-sm text-gray-500 mt-1">Total estimated value across all leads</p>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Leads</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <LeadsClient leads={leads} userRole={session?.role || 'EMPLOYEE'} />
        </CardContent>
      </Card>
    </div>
  );
}
