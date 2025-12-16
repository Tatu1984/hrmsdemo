'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, X, Upload, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MiniCurrencyConverter } from '@/components/currency/mini-currency-converter';

interface Milestone {
  name: string;
  successCriteria: string;
  payment: string;
  dueDate: string;
}

export function ProjectDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sowFile, setSowFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    projectType: 'MILESTONE',
    totalBudget: '',
    upfrontPayment: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    successCriteria: '',
  });

  const [milestones, setMilestones] = useState<Milestone[]>([
    { name: '', successCriteria: '', payment: '', dueDate: '' }
  ]);

  const addMilestone = () => {
    setMilestones([...milestones, { name: '', successCriteria: '', payment: '', dueDate: '' }]);
  };

  const removeMilestone = (index: number) => {
    if (milestones.length > 1) {
      setMilestones(milestones.filter((_, i) => i !== index));
    }
  };

  const updateMilestone = (index: number, field: keyof Milestone, value: string) => {
    const updated = [...milestones];
    updated[index][field] = value;
    setMilestones(updated);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSowFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare data
      const projectData: any = {
        ...formData,
        totalBudget: parseFloat(formData.totalBudget) || 0,
        upfrontPayment: parseFloat(formData.upfrontPayment) || 0,
      };

      // Add milestones if project type is MILESTONE
      if (formData.projectType === 'MILESTONE') {
        projectData.milestones = milestones.filter(m => m.name.trim() !== '');
      }

      // If SoW file is uploaded, we'll need to handle file upload separately
      // For now, we'll just send the data without file
      // TODO: Implement file upload to a storage service

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });

      if (response.ok) {
        setOpen(false);
        setFormData({
          name: '',
          description: '',
          projectType: 'MILESTONE',
          totalBudget: '',
          upfrontPayment: '',
          startDate: new Date().toISOString().split('T')[0],
          endDate: '',
          successCriteria: '',
        });
        setMilestones([{ name: '', successCriteria: '', payment: '', dueDate: '' }]);
        setSowFile(null);
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create project');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600">
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter project name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description / SoW *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              placeholder="Enter detailed Scope of Work (SoW)..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sowFile">Upload Signed SoW Document (Optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="sowFile"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx"
                className="flex-1"
              />
              {sowFile && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <FileText className="w-4 h-4" />
                  {sowFile.name}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500">Upload the signed SoW document from client (PDF, DOC, DOCX)</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectType">Project Type *</Label>
              <Select value={formData.projectType} onValueChange={(value) => setFormData({ ...formData, projectType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MILESTONE">Milestone-Based</SelectItem>
                  <SelectItem value="RETAINER">Retainer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalBudget">Total Budget (₹) *</Label>
              <Input
                id="totalBudget"
                type="number"
                value={formData.totalBudget}
                onChange={(e) => setFormData({ ...formData, totalBudget: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="upfrontPayment">Upfront Payment (₹) *</Label>
              <Input
                id="upfrontPayment"
                type="number"
                value={formData.upfrontPayment}
                onChange={(e) => setFormData({ ...formData, upfrontPayment: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Remaining Due</Label>
              <div className="px-3 py-2 bg-gray-50 rounded-md border text-sm font-semibold">
                ₹{((parseFloat(formData.totalBudget) || 0) - (parseFloat(formData.upfrontPayment) || 0)).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Currency Converter for Budget */}
          {formData.totalBudget && parseFloat(formData.totalBudget) > 0 && (
            <div className="border-t pt-4">
              <MiniCurrencyConverter defaultAmount={parseFloat(formData.totalBudget)} />
            </div>
          )}

          {formData.projectType === 'MILESTONE' && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Milestones</Label>
                <Button type="button" size="sm" onClick={addMilestone} variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Milestone
                </Button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {milestones.map((milestone, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">Phase {index + 1}</Label>
                      {milestones.length > 1 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeMilestone(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Milestone Name</Label>
                      <Input
                        value={milestone.name}
                        onChange={(e) => updateMilestone(index, 'name', e.target.value)}
                        placeholder={`e.g., Phase ${index + 1}: Initial Development`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Success Criteria</Label>
                      <Textarea
                        value={milestone.successCriteria}
                        onChange={(e) => updateMilestone(index, 'successCriteria', e.target.value)}
                        placeholder="Define what needs to be completed for this milestone..."
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Payment Amount (₹)</Label>
                        <Input
                          type="number"
                          value={milestone.payment}
                          onChange={(e) => updateMilestone(index, 'payment', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Due Date</Label>
                        <Input
                          type="date"
                          value={milestone.dueDate}
                          onChange={(e) => updateMilestone(index, 'dueDate', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Expected End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Project
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
