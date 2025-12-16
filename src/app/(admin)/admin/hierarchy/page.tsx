'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Briefcase,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronDown,
  Users,
  ArrowUpDown,
  UserPlus,
  X,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  designation: string;
  department: string;
  profilePicture?: string;
}

interface Department {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  headId: string | null;
  parentId: string | null;
  parent: Department | null;
  children: Department[];
  designations: Designation[];
  isActive: boolean;
}

interface Designation {
  id: string;
  name: string;
  level: number;
  departmentId: string | null;
  department: Department | null;
  parentId: string | null;
  parent: Designation | null;
  children: Designation[];
  description: string | null;
  isActive: boolean;
}

// Helper to get hierarchy level label
function getHierarchyLevelLabel(level: number): string {
  const labels: Record<number, string> = {
    0: 'C-Level',
    1: 'VP',
    2: 'Director',
    3: 'Manager',
    4: 'Lead',
    5: 'Senior',
    6: 'Junior',
    7: 'Support',
  };
  return labels[level] || `Level ${level}`;
}

// Helper to get hierarchy badge color
function getHierarchyBadgeColor(level: number): string {
  const colors: Record<number, string> = {
    0: 'bg-purple-100 text-purple-800',
    1: 'bg-indigo-100 text-indigo-800',
    2: 'bg-blue-100 text-blue-800',
    3: 'bg-cyan-100 text-cyan-800',
    4: 'bg-teal-100 text-teal-800',
    5: 'bg-green-100 text-green-800',
    6: 'bg-yellow-100 text-yellow-800',
    7: 'bg-gray-100 text-gray-800',
  };
  return colors[level] || 'bg-gray-100 text-gray-800';
}

export default function HierarchyManagementPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('designations');

  // Expanded rows to show employees
  const [expandedDesignations, setExpandedDesignations] = useState<Set<string>>(new Set());

  // Department form state
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({
    name: '',
    code: '',
    description: '',
    parentId: '',
  });

  // Designation form state
  const [desigDialogOpen, setDesigDialogOpen] = useState(false);
  const [editingDesig, setEditingDesig] = useState<Designation | null>(null);
  const [desigForm, setDesigForm] = useState({
    name: '',
    level: 0,
    departmentId: '',
    parentId: '',
    description: '',
  });

  // Assign employee dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningDesig, setAssigningDesig] = useState<Designation | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deptRes, desigRes, empRes] = await Promise.all([
        fetch('/api/departments?includeInactive=true'),
        fetch('/api/designations?includeInactive=true'),
        fetch('/api/employees'),
      ]);

      if (deptRes.ok) {
        const deptData = await deptRes.json();
        setDepartments(deptData);
      }

      if (desigRes.ok) {
        const desigData = await desigRes.json();
        setDesignations(desigData);
      }

      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployees(empData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get employees by designation name
  const getEmployeesByDesignation = (designationName: string): Employee[] => {
    return employees.filter((emp) => emp.designation === designationName);
  };

  // Get employees by department name
  const getEmployeesByDepartment = (departmentName: string): Employee[] => {
    return employees.filter((emp) => emp.department === departmentName);
  };

  // Toggle expanded designation row
  const toggleExpandDesignation = (id: string) => {
    const newExpanded = new Set(expandedDesignations);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedDesignations(newExpanded);
  };

  // Department handlers
  const handleDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingDept ? `/api/departments/${editingDept.id}` : '/api/departments';
      const method = editingDept ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: deptForm.name,
          code: deptForm.code || null,
          description: deptForm.description || null,
          parentId: deptForm.parentId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to save department');
        return;
      }

      setDeptDialogOpen(false);
      setEditingDept(null);
      setDeptForm({ name: '', code: '', description: '', parentId: '' });
      fetchData();
    } catch (error) {
      console.error('Error saving department:', error);
      alert('Failed to save department');
    }
  };

  const handleEditDept = (dept: Department) => {
    setEditingDept(dept);
    setDeptForm({
      name: dept.name,
      code: dept.code || '',
      description: dept.description || '',
      parentId: dept.parentId || '',
    });
    setDeptDialogOpen(true);
  };

  const handleDeleteDept = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;

    try {
      const res = await fetch(`/api/departments/${id}`, { method: 'DELETE' });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to delete department');
        return;
      }

      fetchData();
    } catch (error) {
      console.error('Error deleting department:', error);
      alert('Failed to delete department');
    }
  };

  const handleToggleDeptActive = async (dept: Department) => {
    try {
      const res = await fetch(`/api/departments/${dept.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !dept.isActive }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to update department');
        return;
      }

      fetchData();
    } catch (error) {
      console.error('Error updating department:', error);
    }
  };

  // Designation handlers
  const handleDesigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingDesig ? `/api/designations/${editingDesig.id}` : '/api/designations';
      const method = editingDesig ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: desigForm.name,
          level: desigForm.level,
          departmentId: desigForm.departmentId || null,
          parentId: desigForm.parentId || null,
          description: desigForm.description || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to save designation');
        return;
      }

      setDesigDialogOpen(false);
      setEditingDesig(null);
      setDesigForm({ name: '', level: 0, departmentId: '', parentId: '', description: '' });
      fetchData();
    } catch (error) {
      console.error('Error saving designation:', error);
      alert('Failed to save designation');
    }
  };

  const handleEditDesig = (desig: Designation) => {
    setEditingDesig(desig);
    setDesigForm({
      name: desig.name,
      level: desig.level,
      departmentId: desig.departmentId || '',
      parentId: desig.parentId || '',
      description: desig.description || '',
    });
    setDesigDialogOpen(true);
  };

  const handleDeleteDesig = async (id: string) => {
    if (!confirm('Are you sure you want to delete this designation?')) return;

    try {
      const res = await fetch(`/api/designations/${id}`, { method: 'DELETE' });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to delete designation');
        return;
      }

      fetchData();
    } catch (error) {
      console.error('Error deleting designation:', error);
      alert('Failed to delete designation');
    }
  };

  const handleToggleDesigActive = async (desig: Designation) => {
    try {
      const res = await fetch(`/api/designations/${desig.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !desig.isActive }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to update designation');
        return;
      }

      fetchData();
    } catch (error) {
      console.error('Error updating designation:', error);
    }
  };

  // Assign employee to designation
  const handleOpenAssignDialog = (desig: Designation) => {
    setAssigningDesig(desig);
    setSelectedEmployeeId('');
    setAssignDialogOpen(true);
  };

  const handleAssignEmployee = async () => {
    if (!assigningDesig || !selectedEmployeeId) return;

    try {
      const res = await fetch(`/api/employees/${selectedEmployeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designation: assigningDesig.name }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to assign employee');
        return;
      }

      setAssignDialogOpen(false);
      setAssigningDesig(null);
      setSelectedEmployeeId('');
      fetchData();
    } catch (error) {
      console.error('Error assigning employee:', error);
      alert('Failed to assign employee');
    }
  };

  // Remove employee from designation (set to empty or default)
  const handleRemoveFromDesignation = async (emp: Employee) => {
    if (!confirm(`Remove ${emp.name} from their current designation?`)) return;

    try {
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designation: '' }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to update employee');
        return;
      }

      fetchData();
    } catch (error) {
      console.error('Error updating employee:', error);
    }
  };

  const resetDeptForm = () => {
    setEditingDept(null);
    setDeptForm({ name: '', code: '', description: '', parentId: '' });
  };

  const resetDesigForm = () => {
    setEditingDesig(null);
    setDesigForm({ name: '', level: 0, departmentId: '', parentId: '', description: '' });
  };

  // Get employees not assigned to current designation (for assignment dropdown)
  const getUnassignedEmployees = (designationName: string): Employee[] => {
    return employees.filter((emp) => emp.designation !== designationName);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading hierarchy data...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hierarchy Management</h1>
          <p className="text-gray-500">Manage departments, designations, and assign employees</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="designations" className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Designations
          </TabsTrigger>
          <TabsTrigger value="departments" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Departments
          </TabsTrigger>
        </TabsList>

        {/* Designations Tab */}
        <TabsContent value="designations" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Designations ({designations.length})
              </CardTitle>
              <Dialog open={desigDialogOpen} onOpenChange={(open) => {
                setDesigDialogOpen(open);
                if (!open) resetDesigForm();
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Designation
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingDesig ? 'Edit Designation' : 'Add New Designation'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingDesig ? 'Update designation details below.' : 'Create a new designation for your organization.'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleDesigSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="desigName">Designation Name *</Label>
                      <Input
                        id="desigName"
                        value={desigForm.name}
                        onChange={(e) => setDesigForm({ ...desigForm, name: e.target.value })}
                        placeholder="e.g., Senior Software Engineer"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="desigLevel">
                          Hierarchy Level
                          <span className="text-xs text-gray-500 ml-1">(0 = top)</span>
                        </Label>
                        <Input
                          id="desigLevel"
                          type="number"
                          min="0"
                          value={desigForm.level}
                          onChange={(e) => setDesigForm({ ...desigForm, level: parseInt(e.target.value) || 0 })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="desigDept">Department</Label>
                        <Select
                          value={desigForm.departmentId || 'all'}
                          onValueChange={(val) => setDesigForm({ ...desigForm, departmentId: val === 'all' ? '' : val })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All departments" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Departments</SelectItem>
                            {departments
                              .filter((d) => d.isActive)
                              .map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="desigParent">Reports To (Parent Designation)</Label>
                      <Select
                        value={desigForm.parentId || 'none'}
                        onValueChange={(val) => setDesigForm({ ...desigForm, parentId: val === 'none' ? '' : val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select parent designation (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None (Top Level)</SelectItem>
                          {designations
                            .filter((d) => d.id !== editingDesig?.id && d.isActive)
                            .map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.name} (Level {d.level})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="desigDescription">Description</Label>
                      <Textarea
                        id="desigDescription"
                        value={desigForm.description}
                        onChange={(e) => setDesigForm({ ...desigForm, description: e.target.value })}
                        placeholder="Job responsibilities and requirements"
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setDesigDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingDesig ? 'Update' : 'Create'} Designation
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        Level
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {designations.map((desig) => {
                    const desigEmployees = getEmployeesByDesignation(desig.name);
                    const isExpanded = expandedDesignations.has(desig.id);

                    return (
                      <React.Fragment key={desig.id}>
                        <TableRow className="hover:bg-gray-50">
                          <TableCell>
                            {desigEmployees.length > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => toggleExpandDesignation(desig.id)}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-gray-400" />
                                {desig.name}
                              </div>
                              <Badge className={`text-xs w-fit ${getHierarchyBadgeColor(desig.level)}`}>
                                {getHierarchyLevelLabel(desig.level)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{desig.level}</Badge>
                          </TableCell>
                          <TableCell>
                            {desig.department ? (
                              <Badge variant="secondary">{desig.department.name}</Badge>
                            ) : (
                              <span className="text-gray-400">All</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="secondary"
                                className={desigEmployees.length > 0 ? 'bg-blue-100 text-blue-800' : ''}
                              >
                                <Users className="w-3 h-3 mr-1" />
                                {desigEmployees.length}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-blue-600"
                                onClick={() => handleOpenAssignDialog(desig)}
                                title="Assign employee"
                              >
                                <UserPlus className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={desig.isActive ? 'default' : 'secondary'}
                              className={desig.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                            >
                              {desig.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs"
                                onClick={() => handleToggleDesigActive(desig)}
                              >
                                {desig.isActive ? 'Deactivate' : 'Activate'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditDesig(desig)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteDesig(desig.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expanded row showing employees */}
                        {isExpanded && desigEmployees.length > 0 && (
                          <TableRow className="bg-gray-50">
                            <TableCell colSpan={7} className="p-0">
                              <div className="px-8 py-4">
                                <h4 className="text-sm font-semibold mb-3 text-gray-600">
                                  Employees with this designation:
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {desigEmployees.map((emp) => (
                                    <div
                                      key={emp.id}
                                      className="flex items-center justify-between p-3 bg-white rounded-lg border"
                                    >
                                      <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                          <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                                            {emp.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <p className="text-sm font-medium">{emp.name}</p>
                                          <p className="text-xs text-gray-500">{emp.employeeId}</p>
                                        </div>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-gray-400 hover:text-red-600"
                                        onClick={() => handleRemoveFromDesignation(emp)}
                                        title="Remove from designation"
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {designations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No designations found. Click "Add Designation" to create one.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Departments ({departments.length})
              </CardTitle>
              <Dialog open={deptDialogOpen} onOpenChange={(open) => {
                setDeptDialogOpen(open);
                if (!open) resetDeptForm();
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Department
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingDept ? 'Edit Department' : 'Add New Department'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingDept ? 'Update department details below.' : 'Create a new department for your organization.'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleDeptSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="deptName">Department Name *</Label>
                      <Input
                        id="deptName"
                        value={deptForm.name}
                        onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                        placeholder="e.g., Engineering"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="deptCode">Department Code</Label>
                      <Input
                        id="deptCode"
                        value={deptForm.code}
                        onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                        placeholder="e.g., ENG"
                        maxLength={10}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="deptParent">Parent Department</Label>
                      <Select
                        value={deptForm.parentId || 'none'}
                        onValueChange={(val) => setDeptForm({ ...deptForm, parentId: val === 'none' ? '' : val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select parent (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {departments
                            .filter((d) => d.id !== editingDept?.id)
                            .map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="deptDescription">Description</Label>
                      <Textarea
                        id="deptDescription"
                        value={deptForm.description}
                        onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                        placeholder="Brief description of the department"
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setDeptDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingDept ? 'Update' : 'Create'} Department
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Designations</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((dept) => {
                    const deptEmployees = getEmployeesByDepartment(dept.name);

                    return (
                      <TableRow key={dept.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            {dept.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          {dept.code ? (
                            <Badge variant="outline">{dept.code}</Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {dept.parent ? (
                            <div className="flex items-center gap-1 text-gray-600">
                              <ChevronRight className="w-4 h-4" />
                              {dept.parent.name}
                            </div>
                          ) : (
                            <span className="text-gray-400">Root</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={deptEmployees.length > 0 ? 'bg-blue-100 text-blue-800' : ''}
                          >
                            <Users className="w-3 h-3 mr-1" />
                            {deptEmployees.length}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {dept.designations?.length || 0} roles
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={dept.isActive ? 'default' : 'secondary'}
                            className={dept.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                          >
                            {dept.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleDeptActive(dept)}
                            >
                              {dept.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditDept(dept)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteDept(dept.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {departments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No departments found. Click "Add Department" to create one.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assign Employee Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Assign Employee to {assigningDesig?.name}
            </DialogTitle>
            <DialogDescription>
              Select an employee to assign to this designation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Employee</Label>
              <Select
                value={selectedEmployeeId}
                onValueChange={setSelectedEmployeeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an employee to assign" />
                </SelectTrigger>
                <SelectContent>
                  {getUnassignedEmployees(assigningDesig?.name || '').map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      <div className="flex items-center gap-2">
                        <span>{emp.name}</span>
                        <span className="text-xs text-gray-500">({emp.employeeId})</span>
                        {emp.designation && (
                          <Badge variant="outline" className="text-xs">
                            Currently: {emp.designation}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {assigningDesig && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  This will update the employee's designation to <strong>{assigningDesig.name}</strong>.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignEmployee} disabled={!selectedEmployeeId}>
                Assign Employee
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
