'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  salary: number;
  department: string;
}

interface PayrollDialogProps {
  employees: Employee[];
}

export function PayrollDialog({ employees }: PayrollDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    baseSalary: 0,
    allowances: 0,
    deductions: 0,
    overtimeHours: 0,
    overtimeRate: 0,
  });

  const selectedEmployee = employees.find(e => e.id === formData.employeeId);
  const baseSalary = selectedEmployee?.salary || 0;
  const overtimePay = formData.overtimeHours * formData.overtimeRate;
  const grossSalary = baseSalary + formData.allowances + overtimePay;
  const netSalary = grossSalary - formData.deductions;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: formData.employeeId,
          month: formData.month,
          year: formData.year,
          baseSalary,
          allowances: formData.allowances,
          deductions: formData.deductions,
          overtimeHours: formData.overtimeHours,
          overtimeRate: formData.overtimeRate,
          grossSalary,
          netSalary,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate payroll');
      }

      setOpen(false);
      setFormData({
        employeeId: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        baseSalary: 0,
        allowances: 0,
        deductions: 0,
        overtimeHours: 0,
        overtimeRate: 0,
      });
      router.refresh();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600">
          <Calculator className="w-4 h-4 mr-2" />
          Calculate Payroll
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Payroll</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employee">Employee *</Label>
            <Select
              value={formData.employeeId}
              onValueChange={(value) => {
                const emp = employees.find(e => e.id === value);
                setFormData({ ...formData, employeeId: value, baseSalary: emp?.salary || 0 });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.employeeId} - {emp.name} ({emp.department})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">Month *</Label>
              <Select
                value={formData.month.toString()}
                onValueChange={(value) => setFormData({ ...formData, month: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                  ].map((month, idx) => (
                    <SelectItem key={idx} value={(idx + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Year *</Label>
              <Input
                id="year"
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseSalary">Base Salary</Label>
              <Input
                id="baseSalary"
                type="number"
                value={baseSalary}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="allowances">Allowances</Label>
              <Input
                id="allowances"
                type="number"
                value={formData.allowances}
                onChange={(e) => setFormData({ ...formData, allowances: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="overtimeHours">Overtime Hours</Label>
              <Input
                id="overtimeHours"
                type="number"
                value={formData.overtimeHours}
                onChange={(e) => setFormData({ ...formData, overtimeHours: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="overtimeRate">Overtime Rate (per hour)</Label>
              <Input
                id="overtimeRate"
                type="number"
                value={formData.overtimeRate}
                onChange={(e) => setFormData({ ...formData, overtimeRate: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deductions">Deductions</Label>
            <Input
              id="deductions"
              type="number"
              value={formData.deductions}
              onChange={(e) => setFormData({ ...formData, deductions: parseFloat(e.target.value) || 0 })}
            />
          </div>

          {/* Calculation Summary */}
          {formData.employeeId && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <h4 className="font-semibold mb-2">Payroll Summary</h4>
              <div className="flex justify-between text-sm">
                <span>Base Salary:</span>
                <span className="font-semibold">₹{baseSalary.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Allowances:</span>
                <span className="font-semibold">₹{formData.allowances.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Overtime Pay:</span>
                <span className="font-semibold">₹{overtimePay.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t">
                <span>Gross Salary:</span>
                <span className="font-semibold">₹{grossSalary.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-red-600">
                <span>Deductions:</span>
                <span className="font-semibold">-₹{formData.deductions.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Net Salary:</span>
                <span className="text-green-600">₹{netSalary.toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.employeeId}>
              {loading ? 'Generating...' : 'Generate Payroll'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
