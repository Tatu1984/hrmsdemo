'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Power, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ToggleEmployeeActiveButtonProps {
  employeeId: string;
  employeeName: string;
  isActive: boolean;
}

export default function ToggleEmployeeActiveButton({
  employeeId,
  employeeName,
  isActive,
}: ToggleEmployeeActiveButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    const action = isActive ? 'deactivate' : 'activate';
    const confirmMessage = isActive
      ? `Are you sure you want to deactivate ${employeeName}? They will not be able to login or appear in active employee lists.`
      : `Are you sure you want to activate ${employeeName}? They will be able to login and appear in active employee lists.`;

    if (!confirm(confirmMessage)) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/employees/${employeeId}/toggle-active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (response.ok) {
        alert(`Employee ${action}d successfully`);
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || `Failed to ${action} employee`);
      }
    } catch (error) {
      console.error(`Error ${action}ing employee:`, error);
      alert(`Failed to ${action} employee`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className={isActive ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Power className="w-4 h-4" />
      )}
    </Button>
  );
}
