import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Filter, Download, DollarSign, ShoppingCart, CheckCircle, TrendingUp
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { SaleDialog } from '@/components/forms/sale-dialog';

export default async function SalesPage() {
  const session = await getSession();

  const sales = await prisma.sale.findMany({
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

  // Calculate stats
  const totalSales = sales.length;
  const confirmedSales = sales.filter(s => s.status === 'CONFIRMED' || s.status === 'DELIVERED' || s.status === 'PAID').length;
  const totalRevenue = sales.filter(s => s.status !== 'CANCELLED').reduce((sum, s) => sum + s.netAmount, 0);
  const totalGross = sales.filter(s => s.status !== 'CANCELLED').reduce((sum, s) => sum + s.grossAmount, 0);
  const avgSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0;
  const paidSales = sales.filter(s => s.status === 'PAID').length;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      CONFIRMED: 'bg-blue-100 text-blue-700',
      DELIVERED: 'bg-indigo-100 text-indigo-700',
      PAID: 'bg-green-100 text-green-700',
      CANCELLED: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const stats = [
    {
      label: 'Total Sales',
      value: totalSales.toString(),
      icon: ShoppingCart,
      color: 'bg-blue-500'
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      color: 'bg-green-500'
    },
    {
      label: 'Paid Sales',
      value: paidSales.toString(),
      icon: CheckCircle,
      color: 'bg-purple-500'
    },
    {
      label: 'Avg Sale Value',
      value: formatCurrency(avgSaleValue),
      icon: TrendingUp,
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales Management</h1>
          <p className="text-gray-500 mt-1">Track and manage your sales transactions</p>
        </div>
        <SaleDialog />
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

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Gross Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {formatCurrency(totalGross)}
            </div>
            <p className="text-sm text-gray-500 mt-1">Total revenue before discounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Net Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-sm text-gray-500 mt-1">Total revenue after discounts & tax</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Sales</CardTitle>
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Sale #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Gross</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Discount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Tax</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Net Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Lead</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Synced</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{sale.saleNumber}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{sale.companyName}</td>
                    <td className="px-4 py-3 text-sm">{sale.contactName}</td>
                    <td className="px-4 py-3 text-sm">{sale.product}</td>
                    <td className="px-4 py-3 text-sm text-center">{sale.quantity}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{formatCurrency(sale.grossAmount)}</td>
                    <td className="px-4 py-3 text-sm text-red-600">
                      {sale.discount > 0 ? `-${formatCurrency(sale.discount)}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {sale.taxAmount > 0 ? (
                        <span>
                          {formatCurrency(sale.taxAmount)}
                          <span className="text-xs ml-1">({sale.taxPercentage}%)</span>
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-green-600">
                      {formatCurrency(sale.netAmount)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge className={getStatusColor(sale.status)}>
                        {sale.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {sale.lead ? (
                        <Link href={`/admin/leads?id=${sale.lead.id}`}>
                          <Badge className="bg-blue-100 text-blue-700 cursor-pointer hover:bg-blue-200">
                            {sale.lead.leadNumber}
                          </Badge>
                        </Link>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">Direct</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {sale.accountSynced ? (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">No</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        {sale.status !== 'PAID' && (
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {session?.role === 'ADMIN' && sale.status !== 'PAID' && (
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
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
        </CardContent>
      </Card>
    </div>
  );
}
