import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-gray-600">Generate and download various reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Attendance Report</CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Salary Report</CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Task Report</CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}