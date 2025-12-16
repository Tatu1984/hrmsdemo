'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LeaveActionButtonsProps {
  leaveId: string;
  currentStatus: string;
}

export function LeaveActionButtons({ leaveId, currentStatus }: LeaveActionButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [comment, setComment] = useState('');

  const handleAction = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leaves', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: leaveId,
          status: selectedAction,
          adminComment: comment || undefined
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Failed to update leave');
        return;
      }

      setDialogOpen(false);
      setComment('');
      router.refresh();
    } catch (error) {
      alert('Failed to update leave');
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (action: string) => {
    setSelectedAction(action);
    setDialogOpen(true);
  };

  if (currentStatus !== 'PENDING') {
    return <span className="text-sm text-gray-500">-</span>;
  }

  return (
    <>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="text-green-600 hover:bg-green-50"
          onClick={() => openDialog('APPROVED')}
          disabled={loading}
        >
          <CheckCircle className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-red-600 hover:bg-red-50"
          onClick={() => openDialog('REJECTED')}
          disabled={loading}
        >
          <XCircle className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-yellow-600 hover:bg-yellow-50"
          onClick={() => openDialog('HOLD')}
          disabled={loading}
        >
          <Clock className="w-4 h-4" />
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedAction === 'APPROVED' && 'Approve Leave Request'}
              {selectedAction === 'REJECTED' && 'Reject Leave Request'}
              {selectedAction === 'HOLD' && 'Put Leave on Hold'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="comment">Comment (Optional)</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment for the employee..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAction} disabled={loading}>
                {loading ? 'Processing...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
