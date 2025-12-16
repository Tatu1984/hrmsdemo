// ============================================
// FILE: src/app/(admin)/admin/employees/page.tsx
// ============================================
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Download, Trash2, Eye, ChevronRight } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import EmployeeFormDialog from '@/components/admin/employee-form-dialog';
import DeleteEmployeeButton from '@/components/admin/delete-employee-button';
import ToggleEmployeeActiveButton from '@/components/admin/toggle-employee-active-button';
import { UserCredentialsDialog } from '@/components/forms/user-credentials-dialog';
import Link from 'next/link';

// Helper to get hierarchy level label
function getHierarchyLevelLabel(level: number): string {
  const labels: Record<number, string> = {
    0: 'C-Level',
    1: 'VP',
    2: 'Director',
    3: 'Manager',
    4: 'Lead',
    5: 'Senior',
    6: 'Junior',
    7: 'Support',
  };
  return labels[level] || `Level ${level}`;
}

// Helper to get hierarchy badge color
function getHierarchyBadgeColor(level: number): string {
  const colors: Record<number, string> = {
    0: 'bg-purple-100 text-purple-800',
    1: 'bg-indigo-100 text-indigo-800',
    2: 'bg-blue-100 text-blue-800',
    3: 'bg-cyan-100 text-cyan-800',
    4: 'bg-teal-100 text-teal-800',
    5: 'bg-green-100 text-green-800',
    6: 'bg-yellow-100 text-yellow-800',
    7: 'bg-gray-100 text-gray-800',
  };
  return colors[level] || 'bg-gray-100 text-gray-800';
}

export default async function EmployeesPage() {
  // Fetch employees
  const employees = await prisma.employee.findMany({
    include: {
      reportingHead: {
        select: {
          id: true,
          name: true,
          designation: true,
        },
      },
      user: {
        select: {
          id: true,
          username: true,
          role: true,
          permissions: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Fetch all designations to map hierarchy levels
  const designations = await prisma.designation.findMany({
    select: {
      name: true,
      level: true,
      department: {
        select: {
          name: true,
        },
      },
      parent: {
        select: {
          name: true,
        },
      },
    },
  });

  // Create a map of designation name to hierarchy info
  const designationMap = new Map(
    designations.map((d) => [
      d.name,
      {
        level: d.level,
        department: d.department?.name || null,
        reportsTo: d.parent?.name || null,
      },
    ])
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="text-gray-600">Manage all employee records</p>
        </div>
        <EmployeeFormDialog employees={employees} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Employee List ({employees.length} total)</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Search className="w-4 h-4 mr-2" />
                Search
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Designation & Hierarchy</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Reports To</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Salary</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Login Access</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">View</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{emp.employeeId}</td>
                    <td className="px-4 py-3 text-sm">{emp.name}</td>
                    <td className="px-4 py-3 text-sm">{emp.email}</td>
                    <td className="px-4 py-3 text-sm">{emp.phone}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{emp.designation}</span>
                        {designationMap.has(emp.designation) && (
                          <Badge className={`text-xs w-fit ${getHierarchyBadgeColor(designationMap.get(emp.designation)!.level)}`}>
                            {getHierarchyLevelLabel(designationMap.get(emp.designation)!.level)}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{emp.department}</td>
                    <td className="px-4 py-3 text-sm">
                      {emp.reportingHead ? (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1 text-gray-700">
                            <ChevronRight className="w-3 h-3" />
                            <span className="font-medium">{emp.reportingHead.name}</span>
                          </div>
                          <span className="text-xs text-gray-500">{emp.reportingHead.designation}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Top Level</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">{formatCurrency(emp.salary)}</td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant={emp.isActive ? 'default' : 'secondary'} className={emp.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                        {emp.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {emp.user ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-100 text-green-700">
                              {emp.user.role}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500">@{emp.user.username}</div>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">No Access</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link href={`/admin/employees/${emp.id}`}>
                        <Button size="sm" variant="outline" className="text-blue-600 hover:text-blue-700">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <EmployeeFormDialog employee={emp} employees={employees} mode="edit" />
                        <UserCredentialsDialog
                          employee={{
                            id: emp.id,
                            employeeId: emp.employeeId,
                            name: emp.name,
                            email: emp.email,
                          }}
                          existingUser={emp.user}
                        />
                        <ToggleEmployeeActiveButton
                          employeeId={emp.id}
                          employeeName={emp.name}
                          isActive={emp.isActive}
                        />
                        <DeleteEmployeeButton employeeId={emp.id} employeeName={emp.name} />
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