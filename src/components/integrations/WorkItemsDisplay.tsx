'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExternalLink, GitCommit, Calendar, User, AlertCircle, Filter, FolderGit } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

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
  tags?: any;
  spaceKey?: string;
  spaceName?: string;
  version?: number;
  connectionId: string;
  connection: {
    name: string;
    platform: string;
  };
  commits: Array<{
    id: string;
    commitHash: string;
    commitMessage: string;
    commitDate: string;
    filesChanged: number;
    linesAdded: number;
    linesDeleted: number;
  }>;
}

interface WorkItemsDisplayProps {
  employeeId?: string;
  showFilters?: boolean;
  showProjectDetails?: boolean;
}

export default function WorkItemsDisplay({ employeeId, showFilters = true, showProjectDetails = true }: WorkItemsDisplayProps) {
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    fetchWorkItems();
  }, [employeeId]);

  const fetchWorkItems = async () => {
    try {
      let url = '/api/integrations/work-items';
      const params = new URLSearchParams();

      if (employeeId) {
        params.append('employeeId', employeeId);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setWorkItems(data);
      }
    } catch (error) {
      console.error('Error fetching work items:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredWorkItems = workItems.filter(item => {
    if (platformFilter !== 'ALL' && item.platform !== platformFilter) return false;
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    return true;
  });

  // Get unique statuses for filter
  const uniqueStatuses = Array.from(new Set(workItems.map(item => item.status)));

  // Group work items by project/space
  const groupedWorkItems = filteredWorkItems.reduce((acc, item) => {
    const groupKey = item.projectName || item.spaceName || 'Ungrouped';
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(item);
    return acc;
  }, {} as Record<string, WorkItem[]>);

  // Azure DevOps styling
  const getAzureDevOpsStyles = (workItem: WorkItem) => {
    const type = workItem.workItemType.toLowerCase();

    // Type colors (Azure DevOps style)
    const typeStyles: Record<string, string> = {
      'bug': 'bg-red-100 text-red-700 border-red-300',
      'task': 'bg-yellow-100 text-yellow-700 border-yellow-300',
      'user story': 'bg-blue-100 text-blue-700 border-blue-300',
      'epic': 'bg-purple-100 text-purple-700 border-purple-300',
      'feature': 'bg-indigo-100 text-indigo-700 border-indigo-300',
    };

    // Status colors
    const statusStyles: Record<string, string> = {
      'new': 'bg-gray-100 text-gray-700',
      'active': 'bg-blue-100 text-blue-700',
      'resolved': 'bg-green-100 text-green-700',
      'closed': 'bg-gray-200 text-gray-600',
    };

    return {
      type: typeStyles[type] || 'bg-gray-100 text-gray-700 border-gray-300',
      status: statusStyles[workItem.status.toLowerCase()] || 'bg-gray-100 text-gray-700',
    };
  };

  // Asana styling
  const getAsanaStyles = (workItem: WorkItem) => {
    // Status/section based colors (Asana style)
    const statusStyles: Record<string, string> = {
      'to do': 'bg-gray-100 text-gray-700',
      'in progress': 'bg-orange-100 text-orange-700',
      'completed': 'bg-green-100 text-green-700',
      'blocked': 'bg-red-100 text-red-700',
    };

    const sectionColors = ['bg-pink-100 text-pink-700', 'bg-purple-100 text-purple-700', 'bg-blue-100 text-blue-700'];
    const sectionColor = workItem.sectionName ?
      sectionColors[workItem.sectionName.length % 3] :
      'bg-gray-100 text-gray-700';

    return {
      status: statusStyles[workItem.status.toLowerCase()] || 'bg-gray-100 text-gray-700',
      section: sectionColor,
    };
  };

  // Confluence styling
  const getConfluenceStyles = (workItem: WorkItem) => {
    const typeStyles: Record<string, string> = {
      'page': 'bg-blue-100 text-blue-700 border-blue-300',
      'blog': 'bg-indigo-100 text-indigo-700 border-indigo-300',
    };

    const statusStyles: Record<string, string> = {
      'current': 'bg-green-100 text-green-700',
      'draft': 'bg-yellow-100 text-yellow-700',
      'archived': 'bg-gray-100 text-gray-600',
    };

    return {
      type: typeStyles[workItem.workItemType.toLowerCase()] || 'bg-gray-100 text-gray-700 border-gray-300',
      status: statusStyles[workItem.status.toLowerCase()] || 'bg-gray-100 text-gray-700',
    };
  };

  const renderWorkItemCard = (workItem: WorkItem) => {
    const isAzure = workItem.platform === 'AZURE_DEVOPS';
    const isConfluence = workItem.platform === 'CONFLUENCE';
    const styles = isAzure ? getAzureDevOpsStyles(workItem) :
                   isConfluence ? getConfluenceStyles(workItem) :
                   getAsanaStyles(workItem);

    return (
      <Card
        key={workItem.id}
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setSelectedItem(workItem)}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {isAzure ? (
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
                  AZ
                </div>
              ) : isConfluence ? (
                <div className="w-8 h-8 bg-blue-700 rounded flex items-center justify-center text-white text-xs font-bold">
                  CF
                </div>
              ) : (
                <div className="w-8 h-8 bg-pink-500 rounded flex items-center justify-center text-white text-xs font-bold">
                  AS
                </div>
              )}
              <div className="text-xs text-gray-500">{workItem.connection.name}</div>
            </div>
            <a
              href={workItem.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-gray-400 hover:text-gray-600"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-sm mb-2 line-clamp-2">
            {workItem.title}
          </h3>

          {/* Type and Status Badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            {isAzure ? (
              <>
                <Badge className={`${styles.type} text-xs border`}>
                  {workItem.workItemType}
                </Badge>
                <Badge className={`${styles.status} text-xs`}>
                  {workItem.status}
                </Badge>
                {workItem.storyPoints && (
                  <Badge variant="outline" className="text-xs">
                    {workItem.storyPoints} pts
                  </Badge>
                )}
              </>
            ) : isConfluence ? (
              <>
                <Badge className={`${styles.type} text-xs border`}>
                  {workItem.workItemType}
                </Badge>
                <Badge className={`${styles.status} text-xs`}>
                  {workItem.status}
                </Badge>
                {workItem.version && (
                  <Badge variant="outline" className="text-xs">
                    v{workItem.version}
                  </Badge>
                )}
              </>
            ) : (
              <>
                <Badge className={`${styles.status} text-xs`}>
                  {workItem.status}
                </Badge>
                {workItem.sectionName && (
                  <Badge className={`${styles.section} text-xs`}>
                    {workItem.sectionName}
                  </Badge>
                )}
              </>
            )}
          </div>

          {/* Meta Info */}
          <div className="space-y-1 text-xs text-gray-600">
            {workItem.projectName && (
              <div className="flex items-center gap-1">
                <span className="font-medium">Project:</span>
                <span>{workItem.projectName}</span>
              </div>
            )}
            {workItem.spaceName && (
              <div className="flex items-center gap-1">
                <span className="font-medium">Space:</span>
                <span>{workItem.spaceName}</span>
              </div>
            )}
            {workItem.assignedToName && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{workItem.assignedToName}</span>
              </div>
            )}
            {workItem.dueDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Due: {format(new Date(workItem.dueDate), 'MMM d, yyyy')}</span>
              </div>
            )}
            {workItem.commits.length > 0 && (
              <div className="flex items-center gap-1 text-green-600">
                <GitCommit className="w-3 h-3" />
                <span>{workItem.commits.length} commit{workItem.commits.length > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading work items...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Filters:</span>
              </div>

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

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-sm"
              >
                <option value="ALL">All Statuses</option>
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>

              <div className="ml-auto text-sm text-gray-600">
                Showing {filteredWorkItems.length} of {workItems.length} items
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Work Items Grouped by Project */}
      {filteredWorkItems.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No work items found</p>
            <p className="text-sm text-gray-400 mt-2">
              Sync a connection to see work items here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedWorkItems).map(([projectName, items]) => {
            const isAzureDevOps = items[0]?.platform === 'AZURE_DEVOPS';
            const connectionId = items[0]?.connectionId;

            return (
              <div key={projectName}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    {isAzureDevOps && <FolderGit className="w-5 h-5 text-blue-600" />}
                    {projectName}
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {items.length} item{items.length > 1 ? 's' : ''}
                    </span>
                    {showProjectDetails && isAzureDevOps && connectionId && (
                      <Link
                        href={`/employee/projects/${encodeURIComponent(projectName)}?connectionId=${connectionId}`}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                      >
                        <FolderGit className="w-4 h-4" />
                        View Details
                      </Link>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map(renderWorkItemCard)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Work Item Details Dialog */}
      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                {selectedItem.platform === 'AZURE_DEVOPS' ? (
                  <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center text-white font-bold">
                    AZ
                  </div>
                ) : selectedItem.platform === 'CONFLUENCE' ? (
                  <div className="w-10 h-10 bg-blue-700 rounded flex items-center justify-center text-white font-bold">
                    CF
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-pink-500 rounded flex items-center justify-center text-white font-bold">
                    AS
                  </div>
                )}
                <div>
                  <DialogTitle className="text-lg">{selectedItem.title}</DialogTitle>
                  <p className="text-sm text-gray-500">{selectedItem.connection.name}</p>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {/* Description */}
              {selectedItem.description && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Description</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedItem.description}
                  </p>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Status:</span>
                  <p className="font-medium mt-1">{selectedItem.status}</p>
                </div>
                <div>
                  <span className="text-gray-500">Type:</span>
                  <p className="font-medium mt-1">{selectedItem.workItemType}</p>
                </div>
                {selectedItem.projectName && (
                  <div>
                    <span className="text-gray-500">Project:</span>
                    <p className="font-medium mt-1">{selectedItem.projectName}</p>
                  </div>
                )}
                {selectedItem.spaceName && (
                  <div>
                    <span className="text-gray-500">Space:</span>
                    <p className="font-medium mt-1">{selectedItem.spaceName} ({selectedItem.spaceKey})</p>
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
                {selectedItem.version && (
                  <div>
                    <span className="text-gray-500">Version:</span>
                    <p className="font-medium mt-1">{selectedItem.version}</p>
                  </div>
                )}
              </div>

              {/* Commits */}
              {selectedItem.commits.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-3">Related Commits ({selectedItem.commits.length})</h4>
                  <div className="space-y-2">
                    {selectedItem.commits.map(commit => (
                      <div key={commit.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-mono text-gray-700 mb-1">
                              {commit.commitMessage}
                            </p>
                            <p className="text-xs text-gray-500">
                              {commit.commitHash.substring(0, 7)} •{' '}
                              {format(new Date(commit.commitDate), 'MMM d, h:mm a')}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-4 mt-2 text-xs text-gray-600">
                          <span>{commit.filesChanged} files</span>
                          <span className="text-green-600">+{commit.linesAdded}</span>
                          <span className="text-red-600">-{commit.linesDeleted}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* External Link */}
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
