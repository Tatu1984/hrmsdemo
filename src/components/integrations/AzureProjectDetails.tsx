'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  PlayCircle,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Code,
  FolderGit,
} from 'lucide-react';
import { format } from 'date-fns';

interface Repository {
  id: string;
  name: string;
  url: string;
  commits: Array<{
    commitId: string;
    author: { name: string; email: string; date: string };
    comment: string;
    changeCounts: { Add: number; Edit: number; Delete: number };
  }>;
  pullRequests: Array<{
    pullRequestId: number;
    title: string;
    status: string;
    createdBy: { displayName: string };
    creationDate: string;
  }>;
}

interface Pipeline {
  id: number;
  name: string;
  folder: string;
}

interface Build {
  id: number;
  buildNumber: string;
  status: string;
  result?: string;
  queueTime: string;
  startTime?: string;
  finishTime?: string;
  sourceBranch: string;
  sourceVersion: string;
  requestedFor: { displayName: string };
  definition: { id: number; name: string };
  _links: { web: { href: string } };
}

interface WorkItem {
  id: string;
  title: string;
  workItemType: string;
  status: string;
  assignedToName?: string;
  commits: Array<{
    commitHash: string;
    commitMessage: string;
    commitDate: string;
  }>;
}

interface ProjectData {
  projectName: string;
  repositories: Repository[];
  pipelines: Pipeline[];
  builds: Build[];
  workItems: WorkItem[];
}

interface AzureProjectDetailsProps {
  connectionId: string;
  projectName: string;
}

export default function AzureProjectDetails({
  connectionId,
  projectName,
}: AzureProjectDetailsProps) {
  const [data, setData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjectData();
  }, [connectionId, projectName]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/integrations/azure-devops/project?connectionId=${connectionId}&projectName=${encodeURIComponent(projectName)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch project data');
      }

      const projectData = await response.json();
      setData(projectData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  const getBuildStatusIcon = (build: Build) => {
    if (build.status === 'inProgress') {
      return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
    }
    if (build.result === 'succeeded') {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (build.result === 'failed') {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    if (build.result === 'canceled') {
      return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  const getBuildStatusBadge = (build: Build) => {
    const statusClass = {
      succeeded: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      canceled: 'bg-gray-100 text-gray-700',
      inProgress: 'bg-blue-100 text-blue-700',
    }[build.result || build.status] || 'bg-gray-100 text-gray-700';

    return (
      <Badge className={statusClass}>
        {build.result || build.status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading project details...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
          <p className="text-red-600 font-semibold mb-2">Error loading project</p>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <Button onClick={fetchProjectData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{data.projectName}</h2>
          <p className="text-gray-500 text-sm mt-1">Azure DevOps Project Details</p>
        </div>
        <Button onClick={fetchProjectData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Repositories</p>
                <p className="text-2xl font-bold">{data.repositories.length}</p>
              </div>
              <FolderGit className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pipelines</p>
                <p className="text-2xl font-bold">{data.pipelines.length}</p>
              </div>
              <PlayCircle className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Recent Builds</p>
                <p className="text-2xl font-bold">{data.builds.length}</p>
              </div>
              <GitBranch className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Work Items</p>
                <p className="text-2xl font-bold">{data.workItems.length}</p>
              </div>
              <Code className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="repos" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="repos">Repositories</TabsTrigger>
          <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
          <TabsTrigger value="builds">Recent Builds</TabsTrigger>
          <TabsTrigger value="workitems">Work Items</TabsTrigger>
        </TabsList>

        {/* Repositories Tab */}
        <TabsContent value="repos" className="space-y-4 mt-4">
          {data.repositories.map((repo) => (
            <Card key={repo.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FolderGit className="w-5 h-5" />
                    {repo.name}
                  </CardTitle>
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="commits" className="w-full">
                  <TabsList>
                    <TabsTrigger value="commits">
                      Commits ({repo.commits.length})
                    </TabsTrigger>
                    <TabsTrigger value="prs">
                      Pull Requests ({repo.pullRequests.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="commits" className="space-y-2 mt-4">
                    {repo.commits.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No recent commits
                      </p>
                    ) : (
                      repo.commits.map((commit) => (
                        <div
                          key={commit.commitId}
                          className="p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {commit.comment}
                              </p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <GitCommit className="w-3 h-3" />
                                  {commit.commitId.substring(0, 7)}
                                </span>
                                <span>{commit.author.name}</span>
                                <span>
                                  {format(new Date(commit.author.date), 'MMM d, h:mm a')}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2 text-xs">
                              <span className="text-green-600">
                                +{commit.changeCounts.Add + commit.changeCounts.Edit}
                              </span>
                              <span className="text-red-600">
                                -{commit.changeCounts.Delete}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="prs" className="space-y-2 mt-4">
                    {repo.pullRequests.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No active pull requests
                      </p>
                    ) : (
                      repo.pullRequests.map((pr) => (
                        <div
                          key={pr.pullRequestId}
                          className="p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-start gap-2">
                            <GitPullRequest className="w-4 h-4 mt-1 text-green-600" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">#{pr.pullRequestId} {pr.title}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                by {pr.createdBy.displayName} •{' '}
                                {format(new Date(pr.creationDate), 'MMM d, yyyy')}
                              </p>
                            </div>
                            <Badge variant="outline">{pr.status}</Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Pipelines Tab */}
        <TabsContent value="pipelines" className="space-y-2 mt-4">
          {data.pipelines.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">No pipelines configured</p>
              </CardContent>
            </Card>
          ) : (
            data.pipelines.map((pipeline) => (
              <Card key={pipeline.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <PlayCircle className="w-5 h-5 text-purple-600" />
                    <div className="flex-1">
                      <p className="font-medium">{pipeline.name}</p>
                      {pipeline.folder && (
                        <p className="text-xs text-gray-500">{pipeline.folder}</p>
                      )}
                    </div>
                    <Badge variant="outline">ID: {pipeline.id}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Recent Builds Tab */}
        <TabsContent value="builds" className="space-y-2 mt-4">
          {data.builds.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">No recent builds</p>
              </CardContent>
            </Card>
          ) : (
            data.builds.map((build) => (
              <Card key={build.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getBuildStatusIcon(build)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{build.definition.name}</p>
                          <span className="text-sm text-gray-500">#{build.buildNumber}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-gray-600 mb-2">
                          <span className="flex items-center gap-1">
                            <GitBranch className="w-3 h-3" />
                            {build.sourceBranch.replace('refs/heads/', '')}
                          </span>
                          <span>{build.requestedFor.displayName}</span>
                          <span>
                            {format(new Date(build.queueTime), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        {getBuildStatusBadge(build)}
                      </div>
                    </div>
                    <a
                      href={build._links.web.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Work Items Tab */}
        <TabsContent value="workitems" className="space-y-2 mt-4">
          {data.workItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">No work items found</p>
              </CardContent>
            </Card>
          ) : (
            data.workItems.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium mb-2">{item.title}</p>
                      <div className="flex gap-2">
                        <Badge variant="outline">{item.workItemType}</Badge>
                        <Badge>{item.status}</Badge>
                      </div>
                      {item.commits.length > 0 && (
                        <div className="mt-2 text-xs text-gray-600 flex items-center gap-1">
                          <GitCommit className="w-3 h-3" />
                          <span>{item.commits.length} commit(s)</span>
                        </div>
                      )}
                    </div>
                    {item.assignedToName && (
                      <Badge variant="secondary">{item.assignedToName}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
