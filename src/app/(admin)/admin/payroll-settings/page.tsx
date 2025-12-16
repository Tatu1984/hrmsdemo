import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PayrollSettingsClient } from '@/components/pages/payroll-settings-client';

export default async function PayrollSettingsPage() {
  const settings = await prisma.salaryConfig.findFirst();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payroll Settings</h1>
        <p className="text-gray-600 mt-1">Configure salary components, deductions, and tax settings</p>
      </div>

      <PayrollSettingsClient settings={settings} />
    </div>
  );
}
