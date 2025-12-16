'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  User,
  Building2,
  CreditCard,
  FileText,
  Upload,
  Download,
  CheckCircle,
  XCircle,
  Trash2,
  Edit,
  Save,
  X,
} from 'lucide-react';

interface Employee {
  id: string;
  employeeId: string;
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
  department: string;
  salary: number;
  dateOfJoining: string;
}

interface BankingDetails {
  id?: string;
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
  isVerified: boolean;
}

interface EmployeeDocument {
  id: string;
  documentType: string;
  documentName: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  documentNumber?: string;
  issuedDate?: string;
  expiryDate?: string;
  isVerified: boolean;
  createdAt: string;
}

interface EmployeeProfileProps {
  employeeId: string;
  canEdit: boolean;
}

export default function EmployeeProfile({ employeeId, canEdit }: EmployeeProfileProps) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [bankingDetails, setBankingDetails] = useState<BankingDetails | null>(null);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingBanking, setEditingBanking] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    documentType: 'OTHER',
    documentName: '',
    documentNumber: '',
  });
  const [bankingForm, setBankingForm] = useState<BankingDetails>({
    bankName: '',
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    isVerified: false,
  });

  useEffect(() => {
    fetchEmployeeData();
  }, [employeeId]);

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [empRes, bankRes, docsRes] = await Promise.all([
        fetch(`/api/employees/${employeeId}`),
        fetch(`/api/employees/${employeeId}/banking`),
        fetch(`/api/employees/${employeeId}/documents`),
      ]);

      if (!empRes.ok) {
        if (empRes.status === 404) {
          setError('Employee not found. The employee may have been deleted or the ID is incorrect.');
        } else {
          const errorData = await empRes.json().catch(() => ({ error: 'Unknown error' }));
          setError(errorData.error || `Failed to load employee (Status: ${empRes.status})`);
        }
        setLoading(false);
        return;
      }

      const empData = await empRes.json();
      setEmployee(empData);

      if (bankRes.ok) {
        const bankData = await bankRes.json();
        if (bankData) {
          setBankingDetails(bankData);
          setBankingForm(bankData);
        }
      }

      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setDocuments(docsData);
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
      setError('Failed to load employee data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBanking = async () => {
    try {
      const response = await fetch(`/api/employees/${employeeId}/banking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bankingForm),
      });

      if (response.ok) {
        const data = await response.json();
        setBankingDetails(data);
        setEditingBanking(false);
      }
    } catch (error) {
      console.error('Error saving banking details:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadForm({
        ...uploadForm,
        documentName: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      });
      setUploadDialogOpen(true);
    }
  };

  const handleUploadDocument = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('documentType', uploadForm.documentType);
    formData.append('documentName', uploadForm.documentName);
    if (uploadForm.documentNumber) {
      formData.append('documentNumber', uploadForm.documentNumber);
    }

    try {
      const response = await fetch(`/api/employees/${employeeId}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setUploadDialogOpen(false);
        setSelectedFile(null);
        setUploadForm({ documentType: 'OTHER', documentName: '', documentNumber: '' });
        fetchEmployeeData();
      }
    } catch (error) {
      console.error('Error uploading document:', error);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(
        `/api/employees/${employeeId}/documents/${documentId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        fetchEmployeeData();
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading profile...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !employee) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-red-600">
            <p className="font-semibold text-lg mb-2">
              {error || 'Employee not found'}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Employee ID: {employeeId}
            </p>
            <Button onClick={fetchEmployeeData} variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{employee.name}</h2>
              <p className="text-gray-600">{employee.designation}</p>
              <div className="flex gap-4 mt-2 text-sm text-gray-600">
                <span>ID: {employee.employeeId}</span>
                <span>•</span>
                <span>{employee.department}</span>
                <span>•</span>
                <span>{employee.email}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal">
            <User className="w-4 h-4 mr-2" />
            Personal Info
          </TabsTrigger>
          <TabsTrigger value="banking">
            <CreditCard className="w-4 h-4 mr-2" />
            Banking Details
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="w-4 h-4 mr-2" />
            Documents
          </TabsTrigger>
        </TabsList>

        {/* Personal Info Tab */}
        <TabsContent value="personal" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Full Name</label>
                <p className="font-medium">{employee.name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Employee ID</label>
                <p className="font-medium">{employee.employeeId}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Email</label>
                <p className="font-medium">{employee.email}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Phone</label>
                <p className="font-medium">{employee.phone}</p>
              </div>
              {employee.altPhone && (
                <div>
                  <label className="text-sm text-gray-500">Alternate Phone</label>
                  <p className="font-medium">{employee.altPhone}</p>
                </div>
              )}
              {employee.altEmail && (
                <div className="col-span-2">
                  <label className="text-sm text-gray-500">Alternate Email</label>
                  <p className="font-medium">{employee.altEmail}</p>
                </div>
              )}
              <div>
                <label className="text-sm text-gray-500">Designation</label>
                <p className="font-medium">{employee.designation}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Department</label>
                <p className="font-medium">{employee.department}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Date of Joining</label>
                <p className="font-medium">
                  {new Date(employee.dateOfJoining).toLocaleDateString()}
                </p>
              </div>
              <div className="col-span-2">
                <label className="text-sm text-gray-500">Address</label>
                <p className="font-medium">{employee.address}</p>
              </div>

              {/* Emergency Contact Section */}
              {(employee.emergencyContactName || employee.emergencyContactPhone) && (
                <>
                  <div className="col-span-2 pt-4">
                    <hr className="border-gray-200" />
                    <h4 className="text-sm font-semibold text-gray-700 mt-4 mb-2">Emergency Contact</h4>
                  </div>
                  {employee.emergencyContactName && (
                    <div>
                      <label className="text-sm text-gray-500">Contact Name</label>
                      <p className="font-medium">{employee.emergencyContactName}</p>
                    </div>
                  )}
                  {employee.emergencyContactPhone && (
                    <div>
                      <label className="text-sm text-gray-500">Contact Phone</label>
                      <p className="font-medium">{employee.emergencyContactPhone}</p>
                    </div>
                  )}
                  {employee.emergencyContactRelation && (
                    <div>
                      <label className="text-sm text-gray-500">Relationship</label>
                      <p className="font-medium">{employee.emergencyContactRelation}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Banking Details Tab */}
        <TabsContent value="banking" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Banking Details</CardTitle>
                {canEdit && !editingBanking && (
                  <Button onClick={() => setEditingBanking(true)} size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                )}
                {editingBanking && (
                  <div className="flex gap-2">
                    <Button onClick={handleSaveBanking} size="sm">
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingBanking(false);
                        setBankingForm(bankingDetails || {
                          bankName: '',
                          accountHolderName: '',
                          accountNumber: '',
                          ifscCode: '',
                          isVerified: false,
                        });
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!bankingDetails && !editingBanking ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No banking details added yet</p>
                  {canEdit && (
                    <Button onClick={() => setEditingBanking(true)}>
                      Add Banking Details
                    </Button>
                  )}
                </div>
              ) : editingBanking ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">
                      Account Holder Name *
                    </label>
                    <input
                      type="text"
                      value={bankingForm.accountHolderName}
                      onChange={(e) =>
                        setBankingForm({ ...bankingForm, accountHolderName: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Bank Name *</label>
                    <input
                      type="text"
                      value={bankingForm.bankName}
                      onChange={(e) =>
                        setBankingForm({ ...bankingForm, bankName: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Branch Name</label>
                    <input
                      type="text"
                      value={bankingForm.branchName || ''}
                      onChange={(e) =>
                        setBankingForm({ ...bankingForm, branchName: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Account Number *</label>
                    <input
                      type="text"
                      value={bankingForm.accountNumber}
                      onChange={(e) =>
                        setBankingForm({ ...bankingForm, accountNumber: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Account Type</label>
                    <select
                      value={bankingForm.accountType || ''}
                      onChange={(e) =>
                        setBankingForm({ ...bankingForm, accountType: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Select</option>
                      <option value="Savings">Savings</option>
                      <option value="Current">Current</option>
                      <option value="Salary">Salary</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">IFSC Code *</label>
                    <input
                      type="text"
                      value={bankingForm.ifscCode}
                      onChange={(e) =>
                        setBankingForm({ ...bankingForm, ifscCode: e.target.value.toUpperCase() })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">SWIFT Code</label>
                    <input
                      type="text"
                      value={bankingForm.swiftCode || ''}
                      onChange={(e) =>
                        setBankingForm({ ...bankingForm, swiftCode: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">UPI ID</label>
                    <input
                      type="text"
                      value={bankingForm.upiId || ''}
                      onChange={(e) =>
                        setBankingForm({ ...bankingForm, upiId: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">PAN Number</label>
                    <input
                      type="text"
                      value={bankingForm.panNumber || ''}
                      onChange={(e) =>
                        setBankingForm({ ...bankingForm, panNumber: e.target.value.toUpperCase() })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">PF Account Number</label>
                    <input
                      type="text"
                      value={bankingForm.pfAccountNumber || ''}
                      onChange={(e) =>
                        setBankingForm({ ...bankingForm, pfAccountNumber: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">ESI Number</label>
                    <input
                      type="text"
                      value={bankingForm.esiNumber || ''}
                      onChange={(e) =>
                        setBankingForm({ ...bankingForm, esiNumber: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">UAN Number</label>
                    <input
                      type="text"
                      value={bankingForm.uanNumber || ''}
                      onChange={(e) =>
                        setBankingForm({ ...bankingForm, uanNumber: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Account Holder Name</label>
                    <p className="font-medium">{bankingDetails?.accountHolderName}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Bank Name</label>
                    <p className="font-medium">{bankingDetails?.bankName}</p>
                  </div>
                  {bankingDetails?.branchName && (
                    <div>
                      <label className="text-sm text-gray-500">Branch</label>
                      <p className="font-medium">{bankingDetails.branchName}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm text-gray-500">Account Number</label>
                    <p className="font-medium">
                      {bankingDetails?.accountNumber
                        ? '*'.repeat(Math.max(0, bankingDetails.accountNumber.length - 4)) + bankingDetails.accountNumber.slice(-4)
                        : 'N/A'}
                    </p>
                  </div>
                  {bankingDetails?.accountType && (
                    <div>
                      <label className="text-sm text-gray-500">Account Type</label>
                      <p className="font-medium">{bankingDetails.accountType}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm text-gray-500">IFSC Code</label>
                    <p className="font-medium">{bankingDetails?.ifscCode}</p>
                  </div>
                  {bankingDetails?.panNumber && (
                    <div>
                      <label className="text-sm text-gray-500">PAN Number</label>
                      <p className="font-medium">{bankingDetails.panNumber}</p>
                    </div>
                  )}
                  {bankingDetails?.upiId && (
                    <div>
                      <label className="text-sm text-gray-500">UPI ID</label>
                      <p className="font-medium">{bankingDetails.upiId}</p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <label className="text-sm text-gray-500">Verification Status</label>
                    <div className="mt-1">
                      {bankingDetails?.isVerified ? (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                          <XCircle className="w-3 h-3 mr-1" />
                          Pending Verification
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Documents</CardTitle>
                {canEdit && (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                    <span className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Document
                    </span>
                  </label>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No documents uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div className="flex-1">
                          <p className="font-medium">{doc.documentName}</p>
                          <div className="flex gap-3 text-xs text-gray-500 mt-1">
                            <span>{doc.documentType.replace(/_/g, ' ')}</span>
                            {doc.fileSize && (
                              <>
                                <span>•</span>
                                <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>
                              </>
                            )}
                            <span>•</span>
                            <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.isVerified ? (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                            Pending
                          </Badge>
                        )}
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        </a>
                        {canEdit && (
                          <Button
                            onClick={() => handleDeleteDocument(doc.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Document Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Document Type *</label>
              <select
                value={uploadForm.documentType}
                onChange={(e) => setUploadForm({ ...uploadForm, documentType: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <optgroup label="Identity Documents">
                  <option value="AADHAR_CARD">Aadhar Card</option>
                  <option value="PAN_CARD">PAN Card</option>
                  <option value="PASSPORT">Passport</option>
                  <option value="DRIVING_LICENSE">Driving License</option>
                  <option value="VOTER_ID">Voter ID</option>
                </optgroup>
                <optgroup label="Educational Documents">
                  <option value="TENTH_MARKSHEET">10th Marksheet</option>
                  <option value="TWELFTH_MARKSHEET">12th Marksheet</option>
                  <option value="GRADUATION_DEGREE">Graduation Degree</option>
                  <option value="POST_GRADUATION_DEGREE">Post Graduation Degree</option>
                  <option value="OTHER_CERTIFICATE">Other Certificate</option>
                </optgroup>
                <optgroup label="Professional Documents">
                  <option value="OFFER_LETTER">Offer Letter</option>
                  <option value="APPOINTMENT_LETTER">Appointment Letter</option>
                  <option value="EXPERIENCE_LETTER">Experience Letter</option>
                  <option value="RELIEVING_LETTER">Relieving Letter</option>
                  <option value="SALARY_SLIP">Salary Slip</option>
                  <option value="FORM_16">Form 16</option>
                </optgroup>
                <optgroup label="KYC Documents">
                  <option value="BANK_STATEMENT">Bank Statement</option>
                  <option value="CANCELLED_CHEQUE">Cancelled Cheque</option>
                  <option value="ADDRESS_PROOF">Address Proof</option>
                </optgroup>
                <optgroup label="Other">
                  <option value="PROFILE_PHOTO">Profile Photo</option>
                  <option value="RESUME">Resume</option>
                  <option value="OTHER">Other</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Document Name *</label>
              <input
                type="text"
                value={uploadForm.documentName}
                onChange={(e) => setUploadForm({ ...uploadForm, documentName: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Enter document name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Document Number (Optional)</label>
              <input
                type="text"
                value={uploadForm.documentNumber}
                onChange={(e) => setUploadForm({ ...uploadForm, documentNumber: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="E.g., Aadhar number, PAN number"
              />
            </div>

            {selectedFile && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Selected File:</strong> {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Size: {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setUploadDialogOpen(false);
                  setSelectedFile(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUploadDocument} disabled={!uploadForm.documentName}>
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
