'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, CheckCircle, Archive, Trash2, Pause } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ProjectActionsMenuProps {
  projectId: string;
  currentStatus: string;
}

export default function ProjectActionsMenu({ projectId, currentStatus }: ProjectActionsMenuProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const updateProjectStatus = async (status: string) => {
    if (!confirm(`Are you sure you want to mark this project as ${status}?`)) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        alert(`Project marked as ${status}`);
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update project');
      }
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Failed to update project');
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async () => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Project deleted successfully');
        router.push('/admin/projects');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete project');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={loading}>
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {currentStatus !== 'COMPLETED' && (
          <DropdownMenuItem onClick={() => updateProjectStatus('COMPLETED')}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark as Completed
          </DropdownMenuItem>
        )}
        {currentStatus !== 'ON_HOLD' && currentStatus !== 'COMPLETED' && (
          <DropdownMenuItem onClick={() => updateProjectStatus('ON_HOLD')}>
            <Pause className="w-4 h-4 mr-2" />
            Put on Hold
          </DropdownMenuItem>
        )}
        {currentStatus !== 'ARCHIVED' && (
          <DropdownMenuItem onClick={() => updateProjectStatus('ARCHIVED')}>
            <Archive className="w-4 h-4 mr-2" />
            Archive
          </DropdownMenuItem>
        )}
        {currentStatus === 'ARCHIVED' && (
          <DropdownMenuItem onClick={() => updateProjectStatus('ACTIVE')}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Restore to Active
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={deleteProject} className="text-red-600">
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Project
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
