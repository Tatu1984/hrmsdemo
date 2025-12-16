'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronDown, ChevronRight, ExternalLink, User, Calendar, Folder, Filter } from 'lucide-react';
import { format } from 'date-fns';

interface WorkItem {
  id: string;
  externalId: string;
  externalUrl: string;
  platform: 'AZURE_DEVOPS' | 'ASANA' | 'CONFLUENCE';
  title: string;
  description?: string;
  workItemType: string;
  status: string;
  priority?: string;
  assignedToName?: string;
  createdDate: string;
  modifiedDate?: string;
  dueDate?: string;
  projectName?: string;
  areaPath?: string;
  iterationPath?: string;
  storyPoints?: number;
  sectionName?: string;
  spaceKey?: string;
  spaceName?: string;
  version?: number;
  connection: {
    name: string;
    platform: string;
  };
}

interface ProjectGroup {
  projectName: string;
  platform: 'AZURE_DEVOPS' | 'ASANA' | 'CONFLUENCE';
  connectionName: string;
  workItems: WorkItem[];
  stats: {
    total: number;
    active: number;
    completed: number;
  };
}

export default function ProjectWorkItemsView() {
  const [projects, setProjects] = useState<ProjectGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string>('ALL');

  useEffect(() => {
    fetchWorkItems();
  }, []);

  const fetchWorkItems = async () => {
    try {
      const response = await fetch('/api/integrations/work-items');
      if (response.ok) {
        const data: WorkItem[] = await response.json();
        groupByProject(data);
      }
    } catch (error) {
      console.error('Error fetching work items:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupByProject = (workItems: WorkItem[]) => {
    const grouped = new Map<string, ProjectGroup>();

    workItems.forEach(item => {
      const key = `${item.platform}-${item.projectName || item.spaceName || 'Unassigned'}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          projectName: item.projectName || item.spaceName || 'Unassigned',
          platform: item.platform,
          connectionName: item.connection.name,
          workItems: [],
          stats: { total: 0, active: 0, completed: 0 }
        });
      }

      const group = grouped.get(key)!;
      group.workItems.push(item);
      group.stats.total++;

      const completedStatuses = ['Closed', 'Completed', 'Done', 'completed', 'current'];
      const activeStatuses = ['Active', 'In Progress', 'in progress'];

      if (completedStatuses.includes(item.status)) {
        group.stats.completed++;
      } else if (activeStatuses.includes(item.status)) {
        group.stats.active++;
      }
    });

    setProjects(Array.from(grouped.values()));
  };

  const toggleProject = (projectKey: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectKey)) {
      newExpanded.delete(projectKey);
    } else {
      newExpanded.add(projectKey);
    }
    setExpandedProjects(newExpanded);
  };

  const getWorkItemTypeColor = (type: string, platform: string) => {
    if (platform === 'AZURE_DEVOPS') {
      const colors: Record<string, string> = {
        'Bug': 'bg-red-100 text-red-700 border-red-300',
        'Task': 'bg-yellow-100 text-yellow-700 border-yellow-300',
        'User Story': 'bg-blue-100 text-blue-700 border-blue-300',
        'Epic': 'bg-purple-100 text-purple-700 border-purple-300',
      };
      return colors[type] || 'bg-gray-100 text-gray-700 border-gray-300';
    } else if (platform === 'CONFLUENCE') {
      return type === 'page' ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-indigo-100 text-indigo-700 border-indigo-300';
    }
    return 'bg-green-100 text-green-700 border-green-300';
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (['closed', 'completed', 'done', 'current'].includes(statusLower)) {
      return 'bg-green-100 text-green-700';
    } else if (['active', 'in progress'].includes(statusLower)) {
      return 'bg-blue-100 text-blue-700';
    } else if (['new', 'to do', 'draft'].includes(statusLower)) {
      return 'bg-gray-100 text-gray-700';
    }
    return 'bg-orange-100 text-orange-700';
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'AZURE_DEVOPS':
        return <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">AZ</div>;
      case 'CONFLUENCE':
        return <div className="w-6 h-6 bg-blue-700 rounded flex items-center justify-center text-white text-xs font-bold">CF</div>;
      case 'ASANA':
        return <div className="w-6 h-6 bg-pink-500 rounded flex items-center justify-center text-white text-xs font-bold">AS</div>;
      default:
        return <Folder className="w-6 h-6 text-gray-500" />;
    }
  };

  const filteredProjects = platformFilter === 'ALL'
    ? projects
    : projects.filter(p => p.platform === platformFilter);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading work items...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm"
            >
              <option value="ALL">All Platforms</option>
              <option value="AZURE_DEVOPS">Azure DevOps</option>
              <option value="ASANA">Asana</option>
              <option value="CONFLUENCE">Confluence</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Project Groups */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            No work items found. Sync your integrations to see work items here.
          </CardContent>
        </Card>
      ) : (
        filteredProjects.map((project) => {
          const projectKey = `${project.platform}-${project.projectName}`;
          const isExpanded = expandedProjects.has(projectKey);

          return (
            <Card key={projectKey} className="overflow-hidden">
              {/* Project Header */}
              <div
                className="p-4 bg-gray-50 border-b cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleProject(projectKey)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    {getPlatformIcon(project.platform)}
                    <div>
                      <h3 className="font-semibold text-lg">{project.projectName}</h3>
                      <p className="text-sm text-gray-500">{project.connectionName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm">
                      <span className="text-gray-500">Total:</span>
                      <span className="ml-1 font-semibold">{project.stats.total}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Active:</span>
                      <span className="ml-1 font-semibold text-blue-600">{project.stats.active}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Completed:</span>
                      <span className="ml-1 font-semibold text-green-600">{project.stats.completed}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Work Items List */}
              {isExpanded && (
                <div className="divide-y">
                  {project.workItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedItem(item)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={`${getWorkItemTypeColor(item.workItemType, item.platform)} text-xs border`}>
                              {item.workItemType}
                            </Badge>
                            <Badge className={`${getStatusColor(item.status)} text-xs`}>
                              {item.status}
                            </Badge>
                            {item.storyPoints && (
                              <Badge variant="outline" className="text-xs">
                                {item.storyPoints} pts
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-medium mb-1 truncate">{item.title}</h4>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            {item.assignedToName && (
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                <span>{item.assignedToName}</span>
                              </div>
                            )}
                            {item.modifiedDate && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>Updated {format(new Date(item.modifiedDate), 'MMM d, yyyy')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <a
                          href={item.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })
      )}

      {/* Work Item Detail Dialog */}
      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                {getPlatformIcon(selectedItem.platform)}
                <div>
                  <DialogTitle className="text-lg">{selectedItem.title}</DialogTitle>
                  <p className="text-sm text-gray-500">{selectedItem.connection.name}</p>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {selectedItem.description && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Description</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedItem.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Type:</span>
                  <p className="font-medium mt-1">{selectedItem.workItemType}</p>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <p className="font-medium mt-1">{selectedItem.status}</p>
                </div>
                {selectedItem.projectName && (
                  <div>
                    <span className="text-gray-500">Project:</span>
                    <p className="font-medium mt-1">{selectedItem.projectName}</p>
                  </div>
                )}
                {selectedItem.assignedToName && (
                  <div>
                    <span className="text-gray-500">Assigned To:</span>
                    <p className="font-medium mt-1">{selectedItem.assignedToName}</p>
                  </div>
                )}
                {selectedItem.priority && (
                  <div>
                    <span className="text-gray-500">Priority:</span>
                    <p className="font-medium mt-1">{selectedItem.priority}</p>
                  </div>
                )}
                {selectedItem.storyPoints && (
                  <div>
                    <span className="text-gray-500">Story Points:</span>
                    <p className="font-medium mt-1">{selectedItem.storyPoints}</p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <a
                  href={selectedItem.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  View in {selectedItem.platform === 'AZURE_DEVOPS' ? 'Azure DevOps' : selectedItem.platform === 'CONFLUENCE' ? 'Confluence' : 'Asana'}
                </a>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
