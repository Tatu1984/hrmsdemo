'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SalaryConfig {
  id: string;
  pfPercentage: number;
  esiPercentage: number;
  taxSlabs: any;
  bonusRules: any;
  updatedAt: Date;
}

interface PayrollSettingsClientProps {
  settings: SalaryConfig | null;
}

export function PayrollSettingsClient({ settings }: PayrollSettingsClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Salary Component Percentages (for Sales)
    basicSalaryPercentage: 70, // For sales: 70% basic
    variablePayPercentage: 30, // For sales: 30% variable

    // Earnings Component Percentages (of Basic)
    hraPercentage: 40, // HRA as % of Basic
    conveyanceAllowance: 1600, // Fixed amount
    medicalAllowance: 1250, // Fixed amount
    specialAllowancePercentage: 10, // Special allowance as % of Basic

    // Deduction Percentages
    pfPercentage: settings?.pfPercentage || 12,
    esiPercentage: settings?.esiPercentage || 0.75,
    tdsPercentage: 10, // TDS percentage
    professionalTax: 200, // Fixed professional tax

    // Display Settings
    showPF: true,
    showESI: true,
    showTDS: true,
    showProfessionalTax: true,
    showHRA: true,
    showConveyance: true,
    showMedical: true,
    showSpecialAllowance: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/payroll-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('Payroll settings updated successfully');
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      alert('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Salary Components */}
      <Card>
        <CardHeader>
          <CardTitle>Salary Structure (Sales Department)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="basicSalaryPercentage">Basic Salary Percentage (%)</Label>
              <Input
                id="basicSalaryPercentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.basicSalaryPercentage}
                onChange={(e) => setFormData({ ...formData, basicSalaryPercentage: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-gray-500">
                For sales employees, this percentage of total salary is considered as basic salary
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="variablePayPercentage">Variable Pay Percentage (%)</Label>
              <Input
                id="variablePayPercentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.variablePayPercentage}
                onChange={(e) => setFormData({ ...formData, variablePayPercentage: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-gray-500">
                For sales employees, this percentage is variable pay based on target achievement
              </p>
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg text-sm">
            <p className="font-semibold text-blue-900 mb-1">Note:</p>
            <p className="text-blue-700">
              For non-sales employees, 100% of salary is considered as fixed basic salary with no variable component.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Earnings Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Earnings Components (Allowances)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="hraPercentage">HRA (% of Basic Salary)</Label>
              <Input
                id="hraPercentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.hraPercentage}
                onChange={(e) => setFormData({ ...formData, hraPercentage: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-gray-500">
                House Rent Allowance as percentage of basic salary (typically 40%)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialAllowancePercentage">Special Allowance (% of Basic)</Label>
              <Input
                id="specialAllowancePercentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.specialAllowancePercentage}
                onChange={(e) => setFormData({ ...formData, specialAllowancePercentage: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-gray-500">
                Special allowance as percentage of basic salary (typically 10%)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="conveyanceAllowance">Conveyance Allowance (Fixed Amount)</Label>
              <Input
                id="conveyanceAllowance"
                type="number"
                step="0.01"
                min="0"
                value={formData.conveyanceAllowance}
                onChange={(e) => setFormData({ ...formData, conveyanceAllowance: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-gray-500">
                Fixed monthly conveyance allowance (typically ₹1600)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="medicalAllowance">Medical Allowance (Fixed Amount)</Label>
              <Input
                id="medicalAllowance"
                type="number"
                step="0.01"
                min="0"
                value={formData.medicalAllowance}
                onChange={(e) => setFormData({ ...formData, medicalAllowance: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-gray-500">
                Fixed monthly medical allowance (typically ₹1250)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deduction Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Deduction Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="pfPercentage">PF Percentage (%)</Label>
              <Input
                id="pfPercentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.pfPercentage}
                onChange={(e) => setFormData({ ...formData, pfPercentage: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-gray-500">
                Provident Fund deduction percentage (typically 12%)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="esiPercentage">ESI Percentage (%)</Label>
              <Input
                id="esiPercentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.esiPercentage}
                onChange={(e) => setFormData({ ...formData, esiPercentage: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-gray-500">
                Employee State Insurance percentage (typically 0.75%)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="tdsPercentage">TDS Percentage (%)</Label>
              <Input
                id="tdsPercentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.tdsPercentage}
                onChange={(e) => setFormData({ ...formData, tdsPercentage: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-gray-500">
                Tax Deducted at Source percentage (typically 10%)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="professionalTax">Professional Tax (Fixed Amount)</Label>
              <Input
                id="professionalTax"
                type="number"
                step="0.01"
                min="0"
                value={formData.professionalTax}
                onChange={(e) => setFormData({ ...formData, professionalTax: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-gray-500">
                Fixed professional tax amount per month (typically ₹200)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Display Options */}
      <Card>
        <CardHeader>
          <CardTitle>Payslip Display Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-3">Earnings to Display</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showHRA"
                    checked={formData.showHRA}
                    onChange={(e) => setFormData({ ...formData, showHRA: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="showHRA" className="cursor-pointer">Show HRA</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showConveyance"
                    checked={formData.showConveyance}
                    onChange={(e) => setFormData({ ...formData, showConveyance: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="showConveyance" className="cursor-pointer">Show Conveyance Allowance</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showMedical"
                    checked={formData.showMedical}
                    onChange={(e) => setFormData({ ...formData, showMedical: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="showMedical" className="cursor-pointer">Show Medical Allowance</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showSpecialAllowance"
                    checked={formData.showSpecialAllowance}
                    onChange={(e) => setFormData({ ...formData, showSpecialAllowance: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="showSpecialAllowance" className="cursor-pointer">Show Special Allowance</Label>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Deductions to Display</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showPF"
                    checked={formData.showPF}
                    onChange={(e) => setFormData({ ...formData, showPF: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="showPF" className="cursor-pointer">Show PF</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showESI"
                    checked={formData.showESI}
                    onChange={(e) => setFormData({ ...formData, showESI: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="showESI" className="cursor-pointer">Show ESI</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showTDS"
                    checked={formData.showTDS}
                    onChange={(e) => setFormData({ ...formData, showTDS: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="showTDS" className="cursor-pointer">Show TDS</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showProfessionalTax"
                    checked={formData.showProfessionalTax}
                    onChange={(e) => setFormData({ ...formData, showProfessionalTax: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="showProfessionalTax" className="cursor-pointer">Show Professional Tax</Label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading} className="bg-blue-600">
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </form>
  );
}
