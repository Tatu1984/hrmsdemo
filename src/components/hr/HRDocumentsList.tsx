'use client';

import { Button } from '@/components/ui/button';
import { Eye, Edit, Trash2, Download } from 'lucide-react';
import Link from 'next/link';

interface HRDocument {
  id: string;
  type: string;
  title: string;
  description: string | null;
  content: string | null;
  filePath: string | null;
  year: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface HRDocumentsListProps {
  documents: HRDocument[];
  type: string;
}

export function HRDocumentsList({ documents, type }: HRDocumentsListProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No documents found. Click "New Document" to add one.</p>
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(`/api/hr-documents/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        window.location.reload();
      } else {
        alert('Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document');
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Title</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Description</th>
            {type === 'HOLIDAY_LIST' && (
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Year</th>
            )}
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Last Updated</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {documents.map((doc) => (
            <tr key={doc.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium">{doc.title}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{doc.description || '-'}</td>
              {type === 'HOLIDAY_LIST' && (
                <td className="px-4 py-3 text-sm">{doc.year || '-'}</td>
              )}
              <td className="px-4 py-3 text-sm text-gray-600">
                {new Date(doc.updatedAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-sm">
                <div className="flex gap-2">
                  <Link href={`/admin/hr-documents/${doc.id}`}>
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href={`/admin/hr-documents/${doc.id}/edit`}>
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </Link>
                  {doc.filePath && (
                    <a href={doc.filePath} download target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </a>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(doc.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
