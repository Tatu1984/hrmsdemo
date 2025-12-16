import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users, FolderKanban, Calendar, DollarSign,
  TrendingUp, TrendingDown, Plus, UserPlus,
  CheckSquare, Receipt, Download, Filter, Eye, Edit
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

export default async function AdminDashboard() {
  const session = await getSession();

  const employees = await prisma.employee.findMany();
  const projects = await prisma.project.findMany();
  const leaves = await prisma.leave.findMany();
  const payroll = await prisma.payroll.findMany();

  const activeProjects = projects.filter(p => p.status === 'ACTIVE').length;
  const pendingLeaves = leaves.filter(l => l.status === 'PENDING').length;

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const monthlyPayroll = payroll
    .filter(p => p.month === currentMonth && p.year === currentYear)
    .reduce((sum, p) => sum + p.netSalary, 0);

  const stats = [
    { 
      label: 'Total Employees', 
      value: employees.length.toString(), 
      change: '+12%', 
      icon: Users, 
      color: 'bg-blue-500' 
    },
    { 
      label: 'Active Projects', 
      value: activeProjects.toString(), 
      change: '+5%', 
      icon: FolderKanban, 
      color: 'bg-green-500' 
    },
    { 
      label: 'Pending Leaves', 
      value: pendingLeaves.toString(), 
      change: '-3%', 
      icon: Calendar, 
      color: 'bg-orange-500' 
    },
    { 
      label: 'Monthly Payroll', 
      value: formatCurrency(monthlyPayroll), 
      change: '+8%', 
      icon: DollarSign, 
      color: 'bg-purple-500' 
    }
  ];

  const quickActions = [
    { label: 'Add Employee', icon: UserPlus, color: 'bg-blue-600', href: '/admin/employees' },
    { label: 'New Project', icon: Plus, color: 'bg-green-600', href: '/admin/projects' },
    { label: 'Approve Leaves', icon: CheckSquare, color: 'bg-orange-600', href: '/admin/leave-management' },
    { label: 'Generate Invoice', icon: Receipt, color: 'bg-purple-600', href: '/admin/invoices' }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <Card key={idx}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <Badge variant={stat.change.includes('+') ? 'default' : 'destructive'}>
                  {stat.change}
                </Badge>
              </div>
              <h3 className="text-2xl font-bold mb-1">{stat.value}</h3>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {quickActions.map((action, idx) => (
              <Button 
                key={idx} 
                className={`${action.color} h-24 flex-col gap-2`}
                asChild
              >
                <a href={action.href}>
                  <action.icon className="w-6 h-6" />
                  {action.label}
                </a>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Employee Overview</CardTitle>
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Employee ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Designation</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Salary</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{emp.employeeId}</td>
                    <td className="px-4 py-3 text-sm">{emp.name}</td>
                    <td className="px-4 py-3 text-sm">{emp.designation}</td>
                    <td className="px-4 py-3 text-sm">{emp.department}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{formatCurrency(emp.salary)}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
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