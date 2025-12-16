'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { PayslipView } from './PayslipView';
import { Eye, Trash2, Search } from 'lucide-react';

interface PayrollTableProps {
  payrolls: Array<{
    id: string;
    employeeId: string;
    month: number;
    year: number;
    daysPresent: number;
    daysAbsent: number;
    basicPayable: number;
    variablePayable: number;
    grossSalary: number;
    totalDeductions: number;
    netSalary: number;
    status: string;
    employee: {
      employeeId: string;
      name: string;
      department: string;
    };
  }>;
}

export function PayrollTable({ payrolls }: PayrollTableProps) {
  const [selectedPayroll, setSelectedPayroll] = useState<{ id: string; employeeId: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      APPROVED: 'bg-blue-100 text-blue-700',
      PAID: 'bg-green-100 text-green-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const handleRowClick = (payrollId: string, employeeId: string) => {
    setSelectedPayroll({ id: payrollId, employeeId });
  };

  // Filter payrolls based on search term
  const filteredPayrolls = useMemo(() => {
    if (!searchTerm) return payrolls;

    const term = searchTerm.toLowerCase();
    return payrolls.filter(payroll =>
      payroll.employee.name.toLowerCase().includes(term) ||
      payroll.employee.employeeId.toLowerCase().includes(term)
    );
  }, [payrolls, searchTerm]);

  // Handle checkbox selection
  const handleCheckboxChange = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedIds.size === filteredPayrolls.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPayrolls.map(p => p.id)));
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = confirm(`Are you sure you want to delete ${selectedIds.size} payroll record(s)? This action cannot be undone.`);
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const deletePromises = Array.from(selectedIds).map(id =>
        fetch(`/api/payroll?id=${id}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);

      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      alert('Failed to delete payroll records');
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (payrolls.length === 0) {
    return <p className="text-gray-600">No payroll records yet. Click "Calculate Payroll" to generate.</p>;
  }

  return (
    <>
      {/* Filter and bulk actions */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search by employee name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {selectedIds.size > 0 && (
          <Button
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={isDeleting}
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete {selectedIds.size} {selectedIds.size === 1 ? 'Record' : 'Records'}
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filteredPayrolls.length && filteredPayrolls.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Employee</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Period</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Days</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Basic</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Variable</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Gross</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Deductions</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Net Salary</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredPayrolls.map((payroll) => (
              <tr
                key={payroll.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-3 text-sm text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(payroll.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleCheckboxChange(payroll.id);
                    }}
                    className="rounded border-gray-300"
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                <td
                  className="px-4 py-3 text-sm cursor-pointer"
                  onClick={() => handleRowClick(payroll.id, payroll.employeeId)}
                >
                  <div>
                    <div className="font-medium">{payroll.employee.name}</div>
                    <div className="text-xs text-gray-500">{payroll.employee.employeeId}</div>
                  </div>
                </td>
                <td
                  className="px-4 py-3 text-sm cursor-pointer"
                  onClick={() => handleRowClick(payroll.id, payroll.employeeId)}
                >
                  {getMonthName(payroll.month)} {payroll.year}
                </td>
                <td
                  className="px-4 py-3 text-sm text-center cursor-pointer"
                  onClick={() => handleRowClick(payroll.id, payroll.employeeId)}
                >
                  <div className="text-xs">
                    <div className="text-green-600 font-semibold">{payroll.daysPresent}P</div>
                    <div className="text-red-600">{payroll.daysAbsent}A</div>
                  </div>
                </td>
                <td
                  className="px-4 py-3 text-sm text-right cursor-pointer"
                  onClick={() => handleRowClick(payroll.id, payroll.employeeId)}
                >
                  {formatCurrency(payroll.basicPayable)}
                </td>
                <td
                  className="px-4 py-3 text-sm text-right text-green-600 cursor-pointer"
                  onClick={() => handleRowClick(payroll.id, payroll.employeeId)}
                >
                  {formatCurrency(payroll.variablePayable)}
                </td>
                <td
                  className="px-4 py-3 text-sm text-right font-semibold cursor-pointer"
                  onClick={() => handleRowClick(payroll.id, payroll.employeeId)}
                >
                  {formatCurrency(payroll.grossSalary)}
                </td>
                <td
                  className="px-4 py-3 text-sm text-right text-red-600 cursor-pointer"
                  onClick={() => handleRowClick(payroll.id, payroll.employeeId)}
                >
                  {formatCurrency(payroll.totalDeductions)}
                </td>
                <td
                  className="px-4 py-3 text-sm text-right font-bold text-blue-600 cursor-pointer"
                  onClick={() => handleRowClick(payroll.id, payroll.employeeId)}
                >
                  {formatCurrency(payroll.netSalary)}
                </td>
                <td
                  className="px-4 py-3 text-sm cursor-pointer"
                  onClick={() => handleRowClick(payroll.id, payroll.employeeId)}
                >
                  <Badge className={getStatusColor(payroll.status)}>
                    {payroll.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-center">
                  <button
                    className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRowClick(payroll.id, payroll.employeeId);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedPayroll && (
        <PayslipView
          payrollId={selectedPayroll.id}
          employeeId={selectedPayroll.employeeId}
          open={!!selectedPayroll}
          onClose={() => setSelectedPayroll(null)}
        />
      )}
    </>
  );
}
