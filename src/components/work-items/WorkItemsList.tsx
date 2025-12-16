'use client';

import WorkItemsDisplay from '@/components/integrations/WorkItemsDisplay';

interface WorkItemsListProps {
  employeeId: string;
}

export function WorkItemsList({ employeeId }: WorkItemsListProps) {
  return <WorkItemsDisplay employeeId={employeeId} showFilters={true} />;
}
