import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AccountEntryDialog } from '@/components/forms/account-entry-dialog';
import { FileText, AlertCircle, DollarSign, TrendingUp, Calendar } from 'lucide-react';

export default async function AccountsPage() {
  const accounts = await prisma.account.findMany({
    include: {
      category: true,
    },
    orderBy: { date: 'desc' },
  });

  const categories = await prisma.accountCategory.findMany();

  // Get invoice summaries
  const invoices = await prisma.invoice.findMany();
  const dueInvoices = invoices.filter(inv => inv.status !== 'PAID' && inv.status !== 'CANCELLED');
  const totalDue = dueInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const paidInvoices = invoices.filter(inv => inv.status === 'PAID');
  const totalReceived = paidInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);

  // Get pending milestone payments from projects
  const projects = await prisma.project.findMany({
    where: {
      status: { in: ['ACTIVE', 'ON_HOLD'] },
      projectType: 'MILESTONE',
    },
  });

  const pendingMilestones = projects.flatMap(project => {
    if (!project.milestones || !Array.isArray(project.milestones)) return [];
    const milestones = project.milestones as any[];
    return milestones
      .filter((m: any) => m.status !== 'PAID')
      .map((m: any) => ({
        projectName: project.name,
        milestoneName: m.name,
        amount: m.payment,
        dueDate: m.dueDate ? new Date(m.dueDate) : null,
        status: m.status || 'PENDING',
      }));
  });

  const totalPendingMilestones = pendingMilestones.reduce((sum, m) => sum + (m.amount || 0), 0);

  // Get retainer projects
  const retainerProjects = await prisma.project.findMany({
    where: {
      projectType: 'RETAINER',
      status: { in: ['ACTIVE', 'ON_HOLD'] },
    },
  });

  const totalRetainerValue = retainerProjects.reduce((sum, p) => sum + (p.totalBudget || 0), 0);

  const totalIncome = accounts.filter(a => a.type === 'INCOME').reduce((sum, a) => sum + a.amount, 0);
  const totalExpense = accounts.filter(a => a.type === 'EXPENSE').reduce((sum, a) => sum + a.amount, 0);
  const netBalance = totalIncome - totalExpense;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Accounts & Finances</h1>
          <p className="text-gray-600">Track income, expenses, invoices and pending payments</p>
        </div>
        <AccountEntryDialog categories={categories} />
      </div>

      {/* Primary Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500 mb-1">Total Income</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500 mb-1">Total Expenses</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500 mb-1">Net Balance</p>
            <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(netBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice & Receivables Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Due Invoices</p>
                <p className="text-2xl font-bold text-orange-600">{dueInvoices.length}</p>
                <p className="text-xs text-gray-500">{formatCurrency(totalDue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Received</p>
                <p className="text-2xl font-bold text-green-600">{paidInvoices.length}</p>
                <p className="text-xs text-gray-500">{formatCurrency(totalReceived)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Milestones</p>
                <p className="text-2xl font-bold text-purple-600">{pendingMilestones.length}</p>
                <p className="text-xs text-gray-500">{formatCurrency(totalPendingMilestones)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Retainers</p>
                <p className="text-2xl font-bold text-blue-600">{retainerProjects.length}</p>
                <p className="text-xs text-gray-500">{formatCurrency(totalRetainerValue)}/mo</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Milestone Payments */}
      {pendingMilestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Pending Milestone Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Milestone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Due Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pendingMilestones.map((milestone, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{milestone.projectName}</td>
                    <td className="px-4 py-3 text-sm">{milestone.milestoneName}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-purple-600">
                      {formatCurrency(milestone.amount || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {milestone.dueDate ? formatDate(milestone.dueDate) : 'Not set'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge className="bg-yellow-100 text-yellow-700">{milestone.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Active Retainers */}
      {retainerProjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Active Retainer Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Monthly Value</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Start Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Upfront Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {retainerProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{project.name}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-blue-600">
                      {formatCurrency(project.totalBudget || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm">{formatDate(project.startDate)}</td>
                    <td className="px-4 py-3 text-sm">
                      <Badge className={project.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                        {project.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600">
                      {formatCurrency(project.upfrontPayment || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-gray-600">No transactions recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Reference</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {accounts.map((account) => (
                    <tr key={account.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{formatDate(account.date)}</td>
                      <td className="px-4 py-3 text-sm">
                        <Badge className={account.type === 'INCOME' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {account.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">{account.category.name}</td>
                      <td className="px-4 py-3 text-sm">{account.description || '-'}</td>
                      <td className="px-4 py-3 text-sm">{account.reference || '-'}</td>
                      <td className={`px-4 py-3 text-sm text-right font-semibold ${account.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                        {account.type === 'INCOME' ? '+' : '-'}{formatCurrency(account.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
