import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Calendar, Users } from 'lucide-react';
import Link from 'next/link';
import { HRDocumentsList } from '@/components/hr/HRDocumentsList';

export default async function HRDocumentsPage() {
  const documents = await prisma.hRDocument.findMany({
    where: { isActive: true },
    orderBy: { updatedAt: 'desc' },
  });

  const policies = documents.filter(d => d.type === 'POLICY');
  const holidayLists = documents.filter(d => d.type === 'HOLIDAY_LIST');
  const hierarchies = documents.filter(d => d.type === 'COMPANY_HIERARCHY');
  const others = documents.filter(d => d.type === 'OTHER');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">HR Department</h1>
          <p className="text-gray-600 mt-2">
            Manage company policies, holiday lists, and organizational documents
          </p>
        </div>
        <Link href="/admin/hr-documents/new">
          <Button className="bg-orange-600 hover:bg-orange-700">
            <Plus className="w-4 h-4 mr-2" />
            New Document
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">HR Policies</p>
                <p className="text-2xl font-bold mt-1">{policies.length}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Holiday Lists</p>
                <p className="text-2xl font-bold mt-1">{holidayLists.length}</p>
              </div>
              <div className="bg-amber-100 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Org Hierarchies</p>
                <p className="text-2xl font-bold mt-1">{hierarchies.length}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Other Documents</p>
                <p className="text-2xl font-bold mt-1">{others.length}</p>
              </div>
              <div className="bg-amber-100 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* HR Policies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            HR Policies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <HRDocumentsList documents={policies} type="POLICY" />
        </CardContent>
      </Card>

      {/* Holiday Lists */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Holiday Lists
          </CardTitle>
        </CardHeader>
        <CardContent>
          <HRDocumentsList documents={holidayLists} type="HOLIDAY_LIST" />
        </CardContent>
      </Card>

      {/* Company Hierarchy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Company Hierarchy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <HRDocumentsList documents={hierarchies} type="COMPANY_HIERARCHY" />
        </CardContent>
      </Card>

      {/* Other Documents */}
      {others.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Other Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HRDocumentsList documents={others} type="OTHER" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
