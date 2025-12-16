'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NewHRDocumentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'POLICY',
    title: '',
    description: '',
    content: '',
    year: new Date().getFullYear(),
  });
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let filePath = null;

      // Upload file if selected
      if (file) {
        const fileFormData = new FormData();
        fileFormData.append('file', file);
        fileFormData.append('type', 'hr-document');

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: fileFormData,
        });

        if (uploadRes.ok) {
          const { path } = await uploadRes.json();
          filePath = path;
        }
      }

      const response = await fetch('/api/hr-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          filePath,
          year: formData.type === 'HOLIDAY_LIST' ? parseInt(formData.year.toString()) : null,
        }),
      });

      if (response.ok) {
        alert('Document created successfully');
        router.push('/admin/hr-documents');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create document');
      }
    } catch (error) {
      console.error('Error creating document:', error);
      alert('Failed to create document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/hr-documents">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">New Document</h1>
          <p className="text-gray-600 mt-2">
            Create a new policy, holiday list, or organizational document
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Document Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">Document Type *</Label>
              <select
                id="type"
                className="w-full h-10 px-3 border rounded-md"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                required
              >
                <option value="POLICY">HR Policy</option>
                <option value="HOLIDAY_LIST">Holiday List</option>
                <option value="COMPANY_HIERARCHY">Company Hierarchy</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Leave Policy 2025, Holiday Calendar"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the document"
                rows={3}
              />
            </div>

            {formData.type === 'HOLIDAY_LIST' && (
              <div className="space-y-2">
                <Label htmlFor="year">Year *</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  min={2020}
                  max={2100}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Document content (text/markdown)"
                rows={10}
              />
              <p className="text-xs text-gray-500">
                You can write the document content here or upload a file below
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Upload File (Optional)</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile) {
                    setFile(selectedFile);
                  }
                }}
                className="cursor-pointer"
              />
              <p className="text-xs text-gray-500">
                Supported formats: PDF, Word, Excel
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Link href="/admin/hr-documents">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700">
                {loading ? 'Saving...' : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Document
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
