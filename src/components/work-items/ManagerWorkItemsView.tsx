'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WorkItemsDisplay from '@/components/integrations/WorkItemsDisplay';
import { Users, TrendingUp, CheckCircle2, Clock } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  designation: string;
}

interface WorkItemStats {
  totalWorkItems: number;
  completedItems: number;
  inProgressItems: number;
  pendingItems: number;
  byPlatform: {
    AZURE_DEVOPS: number;
    ASANA: number;
    CONFLUENCE: number;
  };
}

interface ManagerWorkItemsViewProps {
  managerId: string;
}

export function ManagerWorkItemsView({ managerId }: ManagerWorkItemsViewProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [stats, setStats] = useState<WorkItemStats>({
    totalWorkItems: 0,
    completedItems: 0,
    inProgressItems: 0,
    pendingItems: 0,
    byPlatform: {
      AZURE_DEVOPS: 0,
      ASANA: 0,
      CONFLUENCE: 0,
    },
  });
  const [selectedMember, setSelectedMember] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamMembers();
    fetchStats();
  }, [managerId]);

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch(`/api/employees?reportingHeadId=${managerId}`);
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/work-items');
      if (response.ok) {
        const workItems = await response.json();

        const totalWorkItems = workItems.length;
        const completedItems = workItems.filter((item: any) =>
          ['Closed', 'Completed', 'Done', 'completed', 'current'].includes(item.status)
        ).length;
        const inProgressItems = workItems.filter((item: any) =>
          ['Active', 'In Progress', 'in progress'].includes(item.status)
        ).length;
        const pendingItems = workItems.filter((item: any) =>
          ['New', 'To Do', 'to do', 'draft'].includes(item.status)
        ).length;

        const byPlatform = {
          AZURE_DEVOPS: workItems.filter((item: any) => item.platform === 'AZURE_DEVOPS').length,
          ASANA: workItems.filter((item: any) => item.platform === 'ASANA').length,
          CONFLUENCE: workItems.filter((item: any) => item.platform === 'CONFLUENCE').length,
        };

        setStats({
          totalWorkItems,
          completedItems,
          inProgressItems,
          pendingItems,
          byPlatform,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Work Items</p>
                <p className="text-2xl font-bold mt-1">{stats.totalWorkItems}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold mt-1 text-green-600">{stats.completedItems}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">In Progress</p>
                <p className="text-2xl font-bold mt-1 text-orange-600">{stats.inProgressItems}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold mt-1 text-gray-600">{stats.pendingItems}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Work Items by Platform</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="w-12 h-12 bg-blue-600 rounded flex items-center justify-center text-white font-bold mx-auto mb-2">
                AZ
              </div>
              <p className="text-sm text-gray-600">Azure DevOps</p>
              <p className="text-2xl font-bold mt-1">{stats.byPlatform.AZURE_DEVOPS}</p>
            </div>
            <div className="text-center p-4 bg-pink-50 rounded-lg">
              <div className="w-12 h-12 bg-pink-500 rounded flex items-center justify-center text-white font-bold mx-auto mb-2">
                AS
              </div>
              <p className="text-sm text-gray-600">Asana</p>
              <p className="text-2xl font-bold mt-1">{stats.byPlatform.ASANA}</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="w-12 h-12 bg-blue-700 rounded flex items-center justify-center text-white font-bold mx-auto mb-2">
                CF
              </div>
              <p className="text-sm text-gray-600">Confluence</p>
              <p className="text-2xl font-bold mt-1">{stats.byPlatform.CONFLUENCE}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Team View */}
      <Tabs defaultValue="all" onValueChange={(value) => setSelectedMember(value === 'all' ? undefined : value)}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Team</TabsTrigger>
          {teamMembers.map((member) => (
            <TabsTrigger key={member.id} value={member.id}>
              {member.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all">
          <WorkItemsDisplay showFilters={true} />
        </TabsContent>

        {teamMembers.map((member) => (
          <TabsContent key={member.id} value={member.id}>
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-orange-600">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold">{member.name}</h3>
                    <p className="text-sm text-gray-500">{member.designation}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <WorkItemsDisplay employeeId={member.id} showFilters={true} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
