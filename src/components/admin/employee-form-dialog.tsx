'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, Upload, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Employee {
  id?: string;
  name: string;
  email: string;
  phone: string;
  altPhone?: string;
  altEmail?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  address: string;
  designation: string;
  salaryType: 'FIXED' | 'VARIABLE';
  salary: number;
  variablePay?: number;
  department: string;
  reportingHeadId?: string;
  dateOfJoining: string;
}

interface DesignationOption {
  id: string;
  name: string;
  level: number;
  departmentId: string | null;
}

interface DepartmentOption {
  id: string;
  name: string;
  code: string | null;
}

interface BankingDetails {
  bankName: string;
  branchName?: string;
  accountHolderName: string;
  accountNumber: string;
  accountType?: string;
  ifscCode: string;
  swiftCode?: string;
  upiId?: string;
  panNumber?: string;
  pfAccountNumber?: string;
  esiNumber?: string;
  uanNumber?: string;
}

interface DocumentUpload {
  file: File;
  documentType: string;
  documentName: string;
  documentNumber?: string;
}

interface EmployeeFormDialogProps {
  employee?: Employee;
  employees?: Employee[];
  mode?: 'create' | 'edit';
}

// Fallback options if no dynamic data is available
const fallbackDesignations = [
  'HR Exec', 'HR Manager', 'VP HR', 'Director HR',
  'CEO', 'CFO', 'COO', 'CTO',
  'Jr Developer', 'Sr Developer',
  'CDO', 'Sr Designer', 'Jr Designer',
  'House Keeping', 'CSO', 'VP Sales',
  'Operations Manager', 'Assistant Ops Manager', 'Team Leader',
  'CSR', 'Sr CSR', 'Supervisor'
];

const fallbackDepartments = [
  'Development', 'Design', 'Management', 'Sales',
  'Marketing', 'HR', 'Finance', 'Administration'
];

export default function EmployeeFormDialog({ employee, employees = [], mode = 'create' }: EmployeeFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [designations, setDesignations] = useState<DesignationOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Fetch designations and departments when dialog opens
  useEffect(() => {
    if (open) {
      fetchOptions();
    }
  }, [open]);

  const fetchOptions = async () => {
    setLoadingOptions(true);
    try {
      const [desigRes, deptRes] = await Promise.all([
        fetch('/api/designations'),
        fetch('/api/departments'),
      ]);

      if (desigRes.ok) {
        const data = await desigRes.json();
        setDesignations(data);
      }

      if (deptRes.ok) {
        const data = await deptRes.json();
        setDepartments(data);
      }
    } catch (error) {
      console.error('Error fetching options:', error);
    } finally {
      setLoadingOptions(false);
    }
  };

  // Initialize form data with proper date formatting for edit mode
  const getInitialFormData = (): Employee => {
    if (employee) {
      // Edit mode - format existing employee data
      return {
        ...employee,
        altPhone: employee.altPhone || '',
        altEmail: employee.altEmail || '',
        emergencyContactName: employee.emergencyContactName || '',
        emergencyContactPhone: employee.emergencyContactPhone || '',
        emergencyContactRelation: employee.emergencyContactRelation || '',
        reportingHeadId: employee.reportingHeadId || '',
        variablePay: employee.variablePay || 0,
        dateOfJoining: employee.dateOfJoining
          ? new Date(employee.dateOfJoining).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
      };
    }
    // Create mode - default values
    return {
      name: '',
      email: '',
      phone: '',
      altPhone: '',
      altEmail: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelation: '',
      address: '',
      designation: '',
      salaryType: 'FIXED',
      salary: 0,
      variablePay: 0,
      department: '',
      reportingHeadId: '',
      dateOfJoining: new Date().toISOString().split('T')[0],
    };
  };

  const [formData, setFormData] = useState<Employee>(getInitialFormData());

  const [bankingDetails, setBankingDetails] = useState<BankingDetails>({
    bankName: '',
    branchName: '',
    accountHolderName: '',
    accountNumber: '',
    accountType: '',
    ifscCode: '',
    swiftCode: '',
    upiId: '',
    panNumber: '',
    pfAccountNumber: '',
    esiNumber: '',
    uanNumber: '',
  });

  const [documents, setDocuments] = useState<DocumentUpload[]>([]);

  // Reset form data when employee changes (e.g., opening edit dialog for different employee)
  React.useEffect(() => {
    if (open) {
      setFormData(getInitialFormData());
    }
  }, [open, employee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = mode === 'edit' ? `/api/employees/${employee?.id}` : '/api/employees';
      const method = mode === 'edit' ? 'PUT' : 'POST';

      // Create employee first
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save employee');
      }

      const employeeData = await res.json();
      const employeeId = employeeData.id;

      // Save banking details if provided
      if (mode === 'create' && bankingDetails.bankName && bankingDetails.accountNumber && bankingDetails.ifscCode) {
        await fetch(`/api/employees/${employeeId}/banking`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bankingDetails),
        });
      }

      // Upload documents if any
      if (mode === 'create' && documents.length > 0) {
        for (const doc of documents) {
          const formData = new FormData();
          formData.append('file', doc.file);
          formData.append('documentType', doc.documentType);
          formData.append('documentName', doc.documentName);
          if (doc.documentNumber) {
            formData.append('documentNumber', doc.documentNumber);
          }

          await fetch(`/api/employees/${employeeId}/documents`, {
            method: 'POST',
            body: formData,
          });
        }
      }

      setOpen(false);
      router.refresh();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBankingChange = (field: string, value: any) => {
    setBankingDetails(prev => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      setDocuments(prev => [...prev, {
        file,
        documentType: 'OTHER',
        documentName: file.name.replace(/\.[^/.]+$/, ''),
        documentNumber: '',
      }]);
    });
    e.target.value = '';
  };

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const updateDocument = (index: number, field: string, value: string) => {
    setDocuments(prev => prev.map((doc, i) =>
      i === index ? { ...doc, [field]: value } : doc
    ));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === 'create' ? (
          <Button className="bg-blue-600">
            <Plus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
        ) : (
          <Button variant="outline" size="sm">Edit</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add New Employee' : 'Edit Employee'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="altPhone">Alternate Phone</Label>
              <Input
                id="altPhone"
                value={formData.altPhone}
                onChange={(e) => handleChange('altPhone', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="altEmail">Alternate Email</Label>
            <Input
              id="altEmail"
              type="email"
              value={formData.altEmail}
              onChange={(e) => handleChange('altEmail', e.target.value)}
              placeholder="Optional alternate email"
            />
          </div>

          <Separator className="my-4" />

          <h3 className="text-md font-semibold">Emergency Contact Details</h3>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emergencyContactName">Contact Name</Label>
              <Input
                id="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={(e) => handleChange('emergencyContactName', e.target.value)}
                placeholder="e.g., John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyContactPhone">Contact Phone</Label>
              <Input
                id="emergencyContactPhone"
                value={formData.emergencyContactPhone}
                onChange={(e) => handleChange('emergencyContactPhone', e.target.value)}
                placeholder="e.g., +1234567890"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyContactRelation">Relationship</Label>
              <Select
                value={formData.emergencyContactRelation || ''}
                onValueChange={(val) => handleChange('emergencyContactRelation', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select relation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Spouse">Spouse</SelectItem>
                  <SelectItem value="Parent">Parent</SelectItem>
                  <SelectItem value="Sibling">Sibling</SelectItem>
                  <SelectItem value="Child">Child</SelectItem>
                  <SelectItem value="Friend">Friend</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="designation">Designation *</Label>
              <Select value={formData.designation} onValueChange={(val) => handleChange('designation', val)} required>
                <SelectTrigger>
                  <SelectValue placeholder={loadingOptions ? "Loading..." : "Select designation"} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {designations.length > 0 ? (
                    designations.map((desig) => (
                      <SelectItem key={desig.id} value={desig.name}>
                        {desig.name}
                      </SelectItem>
                    ))
                  ) : (
                    fallbackDesignations.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department *</Label>
              <Select value={formData.department} onValueChange={(val) => handleChange('department', val)}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingOptions ? "Loading..." : "Select department"} />
                </SelectTrigger>
                <SelectContent>
                  {departments.length > 0 ? (
                    departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))
                  ) : (
                    fallbackDepartments.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salaryType">Salary Type *</Label>
              <Select value={formData.salaryType} onValueChange={(val) => handleChange('salaryType', val)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select salary type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED">Fixed Salary</SelectItem>
                  <SelectItem value="VARIABLE">Variable Salary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfJoining">Date of Joining *</Label>
              <Input
                id="dateOfJoining"
                type="date"
                value={formData.dateOfJoining}
                onChange={(e) => handleChange('dateOfJoining', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salary">
                {formData.salaryType === 'FIXED' ? 'Monthly Salary (CTC)' : 'Base Salary'} *
              </Label>
              <Input
                id="salary"
                type="number"
                value={formData.salary}
                onChange={(e) => handleChange('salary', parseFloat(e.target.value))}
                required
              />
            </div>
            {formData.salaryType === 'VARIABLE' && (
              <div className="space-y-2">
                <Label htmlFor="variablePay">Variable Pay / Commission</Label>
                <Input
                  id="variablePay"
                  type="number"
                  value={formData.variablePay || 0}
                  onChange={(e) => handleChange('variablePay', parseFloat(e.target.value))}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reportingHead">Reporting Head (Optional)</Label>
            <Select value={formData.reportingHeadId || undefined} onValueChange={(val) => handleChange('reportingHeadId', val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select reporting head (optional)" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id!}>
                    {emp.name} - {emp.designation}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode === 'create' && (
            <>
              <Separator className="my-6" />

              {/* Banking Details Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Banking & KYC Details (Optional)</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      id="bankName"
                      value={bankingDetails.bankName}
                      onChange={(e) => handleBankingChange('bankName', e.target.value)}
                      placeholder="e.g., HDFC Bank"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branchName">Branch Name</Label>
                    <Input
                      id="branchName"
                      value={bankingDetails.branchName}
                      onChange={(e) => handleBankingChange('branchName', e.target.value)}
                      placeholder="e.g., Koramangala"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="accountHolderName">Account Holder Name</Label>
                    <Input
                      id="accountHolderName"
                      value={bankingDetails.accountHolderName}
                      onChange={(e) => handleBankingChange('accountHolderName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input
                      id="accountNumber"
                      value={bankingDetails.accountNumber}
                      onChange={(e) => handleBankingChange('accountNumber', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ifscCode">IFSC Code</Label>
                    <Input
                      id="ifscCode"
                      value={bankingDetails.ifscCode}
                      onChange={(e) => handleBankingChange('ifscCode', e.target.value)}
                      placeholder="e.g., HDFC0001234"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountType">Account Type</Label>
                    <Select value={bankingDetails.accountType} onValueChange={(val) => handleBankingChange('accountType', val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SAVINGS">Savings</SelectItem>
                        <SelectItem value="CURRENT">Current</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="upiId">UPI ID</Label>
                    <Input
                      id="upiId"
                      value={bankingDetails.upiId}
                      onChange={(e) => handleBankingChange('upiId', e.target.value)}
                      placeholder="e.g., user@paytm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="panNumber">PAN Number</Label>
                    <Input
                      id="panNumber"
                      value={bankingDetails.panNumber}
                      onChange={(e) => handleBankingChange('panNumber', e.target.value.toUpperCase())}
                      placeholder="e.g., ABCDE1234F"
                      maxLength={10}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pfAccountNumber">PF Account Number</Label>
                    <Input
                      id="pfAccountNumber"
                      value={bankingDetails.pfAccountNumber}
                      onChange={(e) => handleBankingChange('pfAccountNumber', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="esiNumber">ESI Number</Label>
                    <Input
                      id="esiNumber"
                      value={bankingDetails.esiNumber}
                      onChange={(e) => handleBankingChange('esiNumber', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="uanNumber">UAN Number</Label>
                    <Input
                      id="uanNumber"
                      value={bankingDetails.uanNumber}
                      onChange={(e) => handleBankingChange('uanNumber', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Document Upload Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Documents (Optional)</h3>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    />
                    <span className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3">
                      <Upload className="w-4 h-4 mr-2" />
                      Add Documents
                    </span>
                  </label>
                </div>

                {documents.length > 0 && (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {documents.map((doc, index) => (
                      <div key={index} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{doc.file.name}</p>
                            <p className="text-xs text-gray-500">{(doc.file.size / 1024).toFixed(2)} KB</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDocument(index)}
                            className="h-8 w-8 p-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Document Type</Label>
                            <select
                              value={doc.documentType}
                              onChange={(e) => updateDocument(index, 'documentType', e.target.value)}
                              className="w-full px-2 py-1 text-sm border rounded"
                            >
                              <optgroup label="Identity">
                                <option value="AADHAR_CARD">Aadhar Card</option>
                                <option value="PAN_CARD">PAN Card</option>
                                <option value="PASSPORT">Passport</option>
                                <option value="DRIVING_LICENSE">Driving License</option>
                              </optgroup>
                              <optgroup label="Education">
                                <option value="TENTH_MARKSHEET">10th Marksheet</option>
                                <option value="TWELFTH_MARKSHEET">12th Marksheet</option>
                                <option value="GRADUATION_DEGREE">Graduation</option>
                                <option value="POST_GRADUATION_DEGREE">Post Graduation</option>
                              </optgroup>
                              <optgroup label="Professional">
                                <option value="OFFER_LETTER">Offer Letter</option>
                                <option value="EXPERIENCE_LETTER">Experience Letter</option>
                                <option value="RELIEVING_LETTER">Relieving Letter</option>
                              </optgroup>
                              <optgroup label="KYC">
                                <option value="CANCELLED_CHEQUE">Cancelled Cheque</option>
                                <option value="ADDRESS_PROOF">Address Proof</option>
                              </optgroup>
                              <option value="OTHER">Other</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Document Number (Optional)</Label>
                            <Input
                              type="text"
                              value={doc.documentNumber}
                              onChange={(e) => updateDocument(index, 'documentNumber', e.target.value)}
                              placeholder="e.g., ID number"
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : mode === 'create' ? 'Add Employee' : 'Update Employee'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}