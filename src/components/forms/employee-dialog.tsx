'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function EmployeeDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    altPhone: '',
    address: '',
    designation: '',
    salary: '',
    department: '',
    employeeType: '',
    salesTarget: '',
    reportingHeadId: '',
    dateOfJoining: new Date().toISOString().split('T')[0],
    // KYC Documents
    aadharNumber: '',
    panNumber: '',
    aadharDocument: '',
    panDocument: '',
    // Bank Details
    bankName: '',
    bankAddress: '',
    accountNumber: '',
    ifscCode: '',
  });

  const [files, setFiles] = useState<{
    aadharDocument?: File;
    panDocument?: File;
  }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Upload files first if they exist
      const uploadedPaths: { aadharDocument?: string; panDocument?: string } = {};

      if (files.aadharDocument) {
        const formData = new FormData();
        formData.append('file', files.aadharDocument);
        formData.append('type', 'aadhar');

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (uploadRes.ok) {
          const { path } = await uploadRes.json();
          uploadedPaths.aadharDocument = path;
        }
      }

      if (files.panDocument) {
        const formData = new FormData();
        formData.append('file', files.panDocument);
        formData.append('type', 'pan');

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (uploadRes.ok) {
          const { path } = await uploadRes.json();
          uploadedPaths.panDocument = path;
        }
      }

      // Create employee with uploaded file paths
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ...uploadedPaths,
        }),
      });

      if (response.ok) {
        setOpen(false);
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create employee');
      }
    } catch (error) {
      console.error('Error creating employee:', error);
      alert('Failed to create employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600">
          <UserPlus className="w-4 h-4 mr-2" />
          Add Employee
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogDescription>Create a new employee record in the system</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="altPhone">Alternate Phone</Label>
              <Input id="altPhone" value={formData.altPhone} onChange={(e) => setFormData({ ...formData, altPhone: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="designation">Designation *</Label>
              <Input id="designation" value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department *</Label>
              <Input id="department" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} required />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salary">Salary (CTC) *</Label>
              <Input id="salary" type="number" step="0.01" value={formData.salary} onChange={(e) => setFormData({ ...formData, salary: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employeeType">Employee Type</Label>
              <select
                id="employeeType"
                value={formData.employeeType}
                onChange={(e) => setFormData({ ...formData, employeeType: e.target.value })}
                className="w-full h-10 px-3 border rounded-md"
              >
                <option value="">Select Type</option>
                <option value="Sales">Sales</option>
                <option value="Technical">Technical</option>
                <option value="Operations">Operations</option>
                <option value="Management">Management</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salesTarget">Sales Target (if applicable)</Label>
              <Input id="salesTarget" type="number" step="0.01" value={formData.salesTarget} onChange={(e) => setFormData({ ...formData, salesTarget: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reportingHeadId">Reporting Head ID</Label>
              <Input id="reportingHeadId" value={formData.reportingHeadId} onChange={(e) => setFormData({ ...formData, reportingHeadId: e.target.value })} placeholder="Leave empty if none" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfJoining">Date of Joining *</Label>
              <Input id="dateOfJoining" type="date" value={formData.dateOfJoining} onChange={(e) => setFormData({ ...formData, dateOfJoining: e.target.value })} required />
            </div>
          </div>

          {/* KYC Documents Section */}
          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold text-lg mb-4">KYC Documents</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="aadharNumber">Aadhar Number</Label>
                <Input
                  id="aadharNumber"
                  value={formData.aadharNumber}
                  onChange={(e) => setFormData({ ...formData, aadharNumber: e.target.value })}
                  placeholder="XXXX XXXX XXXX"
                  maxLength={12}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="panNumber">PAN Number</Label>
                <Input
                  id="panNumber"
                  value={formData.panNumber}
                  onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="aadharDocument">Aadhar Document (Upload)</Label>
                <Input
                  id="aadharDocument"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFiles({ ...files, aadharDocument: file });
                    }
                  }}
                  className="cursor-pointer"
                />
                <p className="text-xs text-gray-500">
                  Upload Aadhar card (PDF, JPG, PNG - Max 5MB)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="panDocument">PAN Document (Upload)</Label>
                <Input
                  id="panDocument"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFiles({ ...files, panDocument: file });
                    }
                  }}
                  className="cursor-pointer"
                />
                <p className="text-xs text-gray-500">
                  Upload PAN card (PDF, JPG, PNG - Max 5MB)
                </p>
              </div>
            </div>
          </div>

          {/* Bank Details Section */}
          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold text-lg mb-4">Bank Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="e.g., State Bank of India"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankAddress">Bank Branch Address</Label>
                <Input
                  id="bankAddress"
                  value={formData.bankAddress}
                  onChange={(e) => setFormData({ ...formData, bankAddress: e.target.value })}
                  placeholder="Branch location"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  placeholder="Bank account number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ifscCode">IFSC Code</Label>
                <Input
                  id="ifscCode"
                  value={formData.ifscCode}
                  onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                  placeholder="e.g., SBIN0001234"
                  maxLength={11}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Employee
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
