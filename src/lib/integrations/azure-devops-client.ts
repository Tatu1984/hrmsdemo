/**
 * Azure DevOps API Client
 * Handles authentication and API calls to Azure DevOps REST API
 * Documentation: https://docs.microsoft.com/en-us/rest/api/azure/devops/
 */

export interface AzureDevOpsConfig {
  organizationUrl: string; // e.g., https://dev.azure.com/orgname
  accessToken: string; // Personal Access Token (PAT)
}

export interface AzureDevOpsProject {
  id: string;
  name: string;
  description?: string;
  url: string;
  state: string;
  revision: number;
  visibility: string;
  lastUpdateTime: string;
}

export interface AzureDevOpsWorkItem {
  id: number;
  rev: number;
  fields: {
    'System.Id': number;
    'System.Title': string;
    'System.WorkItemType': string; // Bug, Task, User Story, Epic
    'System.State': string; // New, Active, Resolved, Closed
    'System.AssignedTo'?: {
      displayName: string;
      uniqueName: string; // email
      id: string;
    };
    'System.CreatedDate': string;
    'System.ChangedDate': string;
    'System.CommentCount'?: number;
    'System.Description'?: string;
    'System.AreaPath'?: string;
    'System.IterationPath'?: string;
    'Microsoft.VSTS.Scheduling.StoryPoints'?: number;
    'Microsoft.VSTS.Common.Priority'?: number;
    'System.Tags'?: string;
  };
  _links: {
    self: { href: string };
    workItemUpdates: { href: string };
    workItemRevisions: { href: string };
    workItemComments: { href: string };
    html: { href: string };
  };
  url: string;
}

export interface AzureDevOpsCommit {
  commitId: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  committer: {
    name: string;
    email: string;
    date: string;
  };
  comment: string;
  changeCounts: {
    Add: number;
    Edit: number;
    Delete: number;
  };
  url: string;
  remoteUrl: string;
}

export interface AzureDevOpsUser {
  id: string;
  displayName: string;
  uniqueName: string; // email
  url: string;
  imageUrl: string;
  descriptor: string;
}

export interface AzureDevOpsPipeline {
  id: number;
  name: string;
  folder: string;
  revision: number;
  url: string;
}

export interface AzureDevOpsBuild {
  id: number;
  buildNumber: string;
  status: string; // completed, inProgress, cancelling, postponed, notStarted, none
  result?: string; // succeeded, partiallySucceeded, failed, canceled
  queueTime: string;
  startTime?: string;
  finishTime?: string;
  sourceBranch: string;
  sourceVersion: string; // commit hash
  requestedFor: {
    displayName: string;
    uniqueName: string;
    id: string;
  };
  definition: {
    id: number;
    name: string;
  };
  project: {
    id: string;
    name: string;
  };
  _links: {
    web: { href: string };
    sourceVersionDisplayUri: { href: string };
  };
}

export interface AzureDevOpsRelease {
  id: number;
  name: string;
  status: string; // active, abandoned
  createdOn: string;
  modifiedOn: string;
  modifiedBy: {
    displayName: string;
    uniqueName: string;
  };
  releaseDefinition: {
    id: number;
    name: string;
  };
  environments: Array<{
    id: number;
    name: string;
    status: string; // notStarted, inProgress, succeeded, canceled, rejected, queued
    deploySteps: Array<{
      status: string;
      deploymentStartedOn?: string;
      deploymentCompletedOn?: string;
    }>;
  }>;
  _links: {
    web: { href: string };
  };
}

export class AzureDevOpsClient {
  private config: AzureDevOpsConfig;
  private baseApiUrl: string;

  constructor(config: AzureDevOpsConfig) {
    this.config = config;
    // Remove trailing slash
    const orgUrl = config.organizationUrl.replace(/\/$/, '');
    this.baseApiUrl = orgUrl;
  }

  private getHeaders(): HeadersInit {
    const authString = Buffer.from(`:${this.config.accessToken}`).toString('base64');
    return {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseApiUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Azure DevOps API Error (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * Test connection to Azure DevOps
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getProjects();
      return true;
    } catch (error) {
      console.error('Azure DevOps connection test failed:', error);
      return false;
    }
  }

  /**
   * Get all projects in the organization
   */
  async getProjects(): Promise<AzureDevOpsProject[]> {
    const response = await this.request<{ value: AzureDevOpsProject[] }>(
      '/_apis/projects?api-version=7.0'
    );
    return response.value;
  }

  /**
   * Get work items from a project
   */
  async getWorkItems(
    projectName: string,
    options: {
      type?: string[]; // ['Bug', 'Task', 'User Story']
      assignedTo?: string; // user email
      state?: string[]; // ['Active', 'New', 'Resolved']
      startDate?: string; // YYYY-MM-DD
      top?: number;
    } = {}
  ): Promise<AzureDevOpsWorkItem[]> {
    // Build WIQL query
    let wiql = `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '${projectName}'`;

    if (options.type && options.type.length > 0) {
      const types = options.type.map(t => `'${t}'`).join(', ');
      wiql += ` AND [System.WorkItemType] IN (${types})`;
    }

    if (options.assignedTo) {
      wiql += ` AND [System.AssignedTo] = '${options.assignedTo}'`;
    }

    if (options.state && options.state.length > 0) {
      const states = options.state.map(s => `'${s}'`).join(', ');
      wiql += ` AND [System.State] IN (${states})`;
    }

    if (options.startDate) {
      wiql += ` AND [System.CreatedDate] >= '${options.startDate}'`;
    }

    wiql += ' ORDER BY [System.ChangedDate] DESC';

    // Execute WIQL query
    const queryResult = await this.request<{ workItems: Array<{ id: number; url: string }> }>(
      `/${encodeURIComponent(projectName)}/_apis/wit/wiql?api-version=7.0`,
      {
        method: 'POST',
        body: JSON.stringify({ query: wiql }),
      }
    );

    if (!queryResult.workItems || queryResult.workItems.length === 0) {
      return [];
    }

    // Get work item details (batch request)
    const ids = queryResult.workItems.slice(0, options.top || 200).map(wi => wi.id);
    const workItems = await this.request<{ value: AzureDevOpsWorkItem[] }>(
      `/_apis/wit/workitems?ids=${ids.join(',')}&$expand=all&api-version=7.0`
    );

    return workItems.value;
  }

  /**
   * Get commits from a repository
   */
  async getCommits(
    projectName: string,
    repositoryId: string,
    options: {
      author?: string; // email
      fromDate?: string; // ISO 8601
      toDate?: string;
      top?: number;
    } = {}
  ): Promise<AzureDevOpsCommit[]> {
    let endpoint = `/${encodeURIComponent(projectName)}/_apis/git/repositories/${repositoryId}/commits?api-version=7.0`;

    const params = new URLSearchParams();
    if (options.author) params.append('searchCriteria.author', options.author);
    if (options.fromDate) params.append('searchCriteria.fromDate', options.fromDate);
    if (options.toDate) params.append('searchCriteria.toDate', options.toDate);
    if (options.top) params.append('searchCriteria.$top', options.top.toString());

    const queryString = params.toString();
    if (queryString) {
      endpoint += `&${queryString}`;
    }

    const response = await this.request<{ value: AzureDevOpsCommit[] }>(endpoint);
    return response.value;
  }

  /**
   * Get all repositories in a project
   */
  async getRepositories(projectName: string): Promise<Array<{ id: string; name: string; url: string }>> {
    const response = await this.request<{
      value: Array<{ id: string; name: string; url: string; remoteUrl: string }>;
    }>(`/${encodeURIComponent(projectName)}/_apis/git/repositories?api-version=7.0`);

    return response.value;
  }

  /**
   * Get users in the organization
   */
  async getUsers(): Promise<AzureDevOpsUser[]> {
    // Note: This endpoint requires different base URL
    const orgName = this.config.organizationUrl.split('/').pop();
    const vsspsUrl = `https://vssps.dev.azure.com/${orgName}/_apis/graph/users?api-version=7.0`;

    const response = await fetch(vsspsUrl, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.statusText}`);
    }

    const data = await response.json();
    return data.value;
  }

  /**
   * Get commits associated with a work item
   */
  async getWorkItemCommits(projectName: string, workItemId: number): Promise<AzureDevOpsCommit[]> {
    try {
      const response = await this.request<{ value: AzureDevOpsCommit[] }>(
        `/${encodeURIComponent(projectName)}/_apis/wit/workitems/${workItemId}/workitemlinks?api-version=7.0`
      );

      // Note: This returns links, you'd need to parse commit references
      // For now, returning empty array - actual implementation would parse links
      return [];
    } catch (error) {
      console.error('Error fetching work item commits:', error);
      return [];
    }
  }

  /**
   * Search for work items linked to a commit message
   * Azure DevOps automatically links work items mentioned as #123 in commit messages
   */
  extractWorkItemIds(commitMessage: string): number[] {
    const regex = /#(\d+)/g;
    const matches = [];
    let match;

    while ((match = regex.exec(commitMessage)) !== null) {
      matches.push(parseInt(match[1], 10));
    }

    return matches;
  }

  /**
   * Get all pipelines in a project
   */
  async getPipelines(projectName: string): Promise<AzureDevOpsPipeline[]> {
    try {
      const response = await this.request<{ value: AzureDevOpsPipeline[] }>(
        `/${encodeURIComponent(projectName)}/_apis/pipelines?api-version=7.0`
      );
      return response.value;
    } catch (error) {
      console.error('Error fetching pipelines:', error);
      return [];
    }
  }

  /**
   * Get recent builds (pipeline runs) for a project
   */
  async getBuilds(
    projectName: string,
    options: {
      definitionId?: number; // specific pipeline
      branchName?: string;
      status?: string; // completed, inProgress, etc.
      result?: string; // succeeded, failed, etc.
      top?: number;
    } = {}
  ): Promise<AzureDevOpsBuild[]> {
    try {
      let endpoint = `/${encodeURIComponent(projectName)}/_apis/build/builds?api-version=7.0`;

      const params = new URLSearchParams();
      if (options.definitionId) params.append('definitions', options.definitionId.toString());
      if (options.branchName) params.append('branchName', options.branchName);
      if (options.status) params.append('statusFilter', options.status);
      if (options.result) params.append('resultFilter', options.result);
      params.append('$top', (options.top || 50).toString());

      const queryString = params.toString();
      if (queryString) {
        endpoint += `&${queryString}`;
      }

      const response = await this.request<{ value: AzureDevOpsBuild[] }>(endpoint);
      return response.value;
    } catch (error) {
      console.error('Error fetching builds:', error);
      return [];
    }
  }

  /**
   * Get releases (CD pipelines) for a project
   */
  async getReleases(
    projectName: string,
    options: {
      definitionId?: number;
      top?: number;
    } = {}
  ): Promise<AzureDevOpsRelease[]> {
    try {
      // Releases use a different base URL (vsrm)
      const orgName = this.config.organizationUrl.split('/').pop();
      let endpoint = `https://vsrm.dev.azure.com/${orgName}/${encodeURIComponent(projectName)}/_apis/release/releases?api-version=7.0`;

      const params = new URLSearchParams();
      if (options.definitionId) params.append('definitionId', options.definitionId.toString());
      params.append('$top', (options.top || 50).toString());
      params.append('$expand', 'environments');

      const queryString = params.toString();
      if (queryString) {
        endpoint += `&${queryString}`;
      }

      const response = await fetch(endpoint, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch releases: ${response.statusText}`);
      }

      const data = await response.json();
      return data.value || [];
    } catch (error) {
      console.error('Error fetching releases:', error);
      return [];
    }
  }

  /**
   * Get pull requests for a repository
   */
  async getPullRequests(
    projectName: string,
    repositoryId: string,
    options: {
      status?: 'active' | 'completed' | 'abandoned' | 'all';
      creatorId?: string;
      top?: number;
    } = {}
  ): Promise<any[]> {
    try {
      let endpoint = `/${encodeURIComponent(projectName)}/_apis/git/repositories/${repositoryId}/pullrequests?api-version=7.0`;

      const params = new URLSearchParams();
      if (options.status) params.append('searchCriteria.status', options.status);
      if (options.creatorId) params.append('searchCriteria.creatorId', options.creatorId);
      params.append('$top', (options.top || 50).toString());

      const queryString = params.toString();
      if (queryString) {
        endpoint += `&${queryString}`;
      }

      const response = await this.request<{ value: any[] }>(endpoint);
      return response.value;
    } catch (error) {
      console.error('Error fetching pull requests:', error);
      return [];
    }
  }
}

/**
 * Create Azure DevOps client from connection
 */
export function createAzureDevOpsClient(
  organizationUrl: string,
  accessToken: string
): AzureDevOpsClient {
  return new AzureDevOpsClient({
    organizationUrl,
    accessToken,
  });
}
