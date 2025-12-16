/**
 * Asana API Client
 * Handles authentication and API calls to Asana REST API
 * Documentation: https://developers.asana.com/reference/rest-api-reference
 */

export interface AsanaConfig {
  accessToken: string; // Personal Access Token
}

export interface AsanaWorkspace {
  gid: string;
  name: string;
  resource_type: 'workspace';
}

export interface AsanaProject {
  gid: string;
  name: string;
  resource_type: 'project';
  color: string;
  archived: boolean;
  created_at: string;
  modified_at: string;
  owner?: AsanaUser;
  workspace: {
    gid: string;
    name: string;
  };
  permalink_url: string;
}

export interface AsanaTask {
  gid: string;
  name: string;
  resource_type: 'task';
  notes?: string; // Description
  html_notes?: string;
  assignee?: AsanaUser;
  assignee_status?: 'inbox' | 'upcoming' | 'today' | 'later';
  completed: boolean;
  completed_at?: string;
  created_at: string;
  modified_at: string;
  due_on?: string;
  due_at?: string;
  start_on?: string;
  projects: Array<{
    gid: string;
    name: string;
  }>;
  memberships: Array<{
    project: {
      gid: string;
      name: string;
    };
    section?: {
      gid: string;
      name: string;
    };
  }>;
  tags: Array<{
    gid: string;
    name: string;
    color?: string;
  }>;
  permalink_url: string;
  workspace: {
    gid: string;
    name: string;
  };
  custom_fields?: Array<{
    gid: string;
    name: string;
    type: string;
    text_value?: string;
    number_value?: number;
    enum_value?: {
      gid: string;
      name: string;
      color: string;
    };
  }>;
}

export interface AsanaUser {
  gid: string;
  name: string;
  email: string;
  resource_type: 'user';
  photo?: {
    image_128x128?: string;
    image_60x60?: string;
  };
}

export interface AsanaSection {
  gid: string;
  name: string;
  resource_type: 'section';
  created_at: string;
  project: {
    gid: string;
    name: string;
  };
}

export class AsanaClient {
  private config: AsanaConfig;
  private baseApiUrl = 'https://app.asana.com/api/1.0';

  constructor(config: AsanaConfig) {
    this.config = config;
  }

  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.config.accessToken}`,
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
      const error = await response.json().catch(() => ({ errors: [{ message: response.statusText }] }));
      const errorMessage = error.errors?.[0]?.message || response.statusText;
      throw new Error(`Asana API Error (${response.status}): ${errorMessage}`);
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Test connection to Asana
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getCurrentUser();
      return true;
    } catch (error) {
      console.error('Asana connection test failed:', error);
      return false;
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<AsanaUser> {
    return this.request<AsanaUser>('/users/me');
  }

  /**
   * Get all workspaces
   */
  async getWorkspaces(): Promise<AsanaWorkspace[]> {
    return this.request<AsanaWorkspace[]>('/workspaces');
  }

  /**
   * Get projects in a workspace
   */
  async getProjects(workspaceGid: string, options: { archived?: boolean } = {}): Promise<AsanaProject[]> {
    const params = new URLSearchParams({
      workspace: workspaceGid,
      opt_fields: 'name,color,archived,created_at,modified_at,owner,workspace,permalink_url',
    });

    if (options.archived !== undefined) {
      params.append('archived', options.archived.toString());
    }

    return this.request<AsanaProject[]>(`/projects?${params.toString()}`);
  }

  /**
   * Get tasks from a project
   */
  async getTasks(
    projectGid: string,
    options: {
      assignee?: string; // User GID or 'me'
      completed_since?: string; // ISO 8601
    } = {}
  ): Promise<AsanaTask[]> {
    const params = new URLSearchParams({
      project: projectGid,
      opt_fields: [
        'name',
        'notes',
        'assignee',
        'assignee.name',
        'assignee.email',
        'completed',
        'completed_at',
        'created_at',
        'modified_at',
        'due_on',
        'due_at',
        'start_on',
        'projects.name',
        'memberships.project.name',
        'memberships.section.name',
        'tags.name',
        'tags.color',
        'permalink_url',
        'workspace.name',
        'custom_fields',
      ].join(','),
    });

    if (options.assignee) {
      params.append('assignee', options.assignee);
    }

    if (options.completed_since) {
      params.append('completed_since', options.completed_since);
    }

    return this.request<AsanaTask[]>(`/tasks?${params.toString()}`);
  }

  /**
   * Get tasks assigned to a user in a workspace
   */
  async getUserTasks(
    workspaceGid: string,
    assigneeGid: string = 'me',
    options: {
      completed_since?: string;
    } = {}
  ): Promise<AsanaTask[]> {
    const params = new URLSearchParams({
      workspace: workspaceGid,
      assignee: assigneeGid,
      opt_fields: [
        'name',
        'notes',
        'assignee',
        'assignee.name',
        'assignee.email',
        'completed',
        'completed_at',
        'created_at',
        'modified_at',
        'due_on',
        'due_at',
        'start_on',
        'projects.name',
        'memberships.project.name',
        'memberships.section.name',
        'tags.name',
        'tags.color',
        'permalink_url',
        'workspace.name',
      ].join(','),
    });

    if (options.completed_since) {
      params.append('completed_since', options.completed_since);
    }

    return this.request<AsanaTask[]>(`/tasks?${params.toString()}`);
  }

  /**
   * Get users in a workspace
   */
  async getUsers(workspaceGid: string): Promise<AsanaUser[]> {
    const params = new URLSearchParams({
      workspace: workspaceGid,
      opt_fields: 'name,email,photo',
    });

    return this.request<AsanaUser[]>(`/users?${params.toString()}`);
  }

  /**
   * Get sections in a project
   */
  async getSections(projectGid: string): Promise<AsanaSection[]> {
    return this.request<AsanaSection[]>(`/projects/${projectGid}/sections`);
  }

  /**
   * Get a specific task by ID
   */
  async getTask(taskGid: string): Promise<AsanaTask> {
    const params = new URLSearchParams({
      opt_fields: [
        'name',
        'notes',
        'html_notes',
        'assignee',
        'assignee.name',
        'assignee.email',
        'completed',
        'completed_at',
        'created_at',
        'modified_at',
        'due_on',
        'due_at',
        'start_on',
        'projects.name',
        'memberships.project.name',
        'memberships.section.name',
        'tags.name',
        'tags.color',
        'permalink_url',
        'workspace.name',
        'custom_fields',
      ].join(','),
    });

    return this.request<AsanaTask>(`/tasks/${taskGid}?${params.toString()}`);
  }

  /**
   * Search tasks in a workspace
   */
  async searchTasks(
    workspaceGid: string,
    options: {
      text?: string;
      assignee?: string;
      projects?: string[];
      completed?: boolean;
      modified_since?: string; // ISO 8601
    } = {}
  ): Promise<AsanaTask[]> {
    const params = new URLSearchParams({
      workspace: workspaceGid,
      opt_fields: [
        'name',
        'notes',
        'assignee.name',
        'assignee.email',
        'completed',
        'completed_at',
        'created_at',
        'modified_at',
        'due_on',
        'projects.name',
        'tags.name',
        'permalink_url',
      ].join(','),
    });

    if (options.text) {
      params.append('text', options.text);
    }

    if (options.assignee) {
      params.append('assignee.any', options.assignee);
    }

    if (options.projects && options.projects.length > 0) {
      params.append('projects.any', options.projects.join(','));
    }

    if (options.completed !== undefined) {
      params.append('completed', options.completed.toString());
    }

    if (options.modified_since) {
      params.append('modified_since', options.modified_since);
    }

    return this.request<AsanaTask[]>(`/workspaces/${workspaceGid}/tasks/search?${params.toString()}`);
  }

  /**
   * Get task status/priority from custom fields
   */
  getTaskStatus(task: AsanaTask): string {
    // Try to find status from section name
    if (task.memberships && task.memberships.length > 0) {
      const section = task.memberships[0].section;
      if (section) {
        return section.name;
      }
    }

    // Or from completed status
    return task.completed ? 'Completed' : 'In Progress';
  }

  /**
   * Get task priority from custom fields
   */
  getTaskPriority(task: AsanaTask): string | null {
    if (!task.custom_fields) return null;

    const priorityField = task.custom_fields.find(
      field => field.name.toLowerCase().includes('priority')
    );

    if (priorityField) {
      return priorityField.enum_value?.name || priorityField.text_value || null;
    }

    return null;
  }
}

/**
 * Create Asana client from connection
 */
export function createAsanaClient(accessToken: string): AsanaClient {
  return new AsanaClient({ accessToken });
}
