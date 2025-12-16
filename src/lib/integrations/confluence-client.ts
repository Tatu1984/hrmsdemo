/**
 * Confluence API Client
 * Handles interactions with Confluence Cloud REST API
 */

export interface ConfluenceConfig {
  siteUrl: string; // e.g., https://your-domain.atlassian.net
  email: string; // User email for authentication
  apiToken: string; // API token
  spaceKey?: string; // Optional space key filter
}

export interface ConfluenceSpace {
  id: string;
  key: string;
  name: string;
  type: string;
  status: string;
}

export interface ConfluencePage {
  id: string;
  type: string;
  status: string;
  title: string;
  spaceId?: string;
  spaceKey?: string;
  spaceName?: string;
  parentId?: string;
  parentType?: string;
  position?: number;
  authorId?: string;
  ownerId?: string;
  lastOwnerId?: string;
  createdAt: string;
  version: {
    number: number;
    authorId?: string;
    message?: string;
    createdAt: string;
  };
  body?: {
    storage?: {
      value: string;
      representation: string;
    };
    view?: {
      value: string;
      representation: string;
    };
  };
  children?: ConfluencePage[];
}

export class ConfluenceClient {
  private config: ConfluenceConfig;
  private baseUrl: string;
  private authHeader: string;

  constructor(config: ConfluenceConfig) {
    this.config = config;
    // Remove trailing slash
    const siteUrl = config.siteUrl.replace(/\/$/, '');
    this.baseUrl = `${siteUrl}/wiki/api/v2`;

    // Create Basic Auth header (using btoa for browser/edge runtime compatibility)
    const credentials = btoa(`${config.email}:${config.apiToken}`);
    this.authHeader = `Basic ${credentials}`;
  }

  /**
   * Test the connection
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing Confluence connection to:', this.baseUrl);
      const response = await fetch(`${this.baseUrl}/spaces?limit=1`, {
        method: 'GET',
        headers: {
          'Authorization': this.authHeader,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Confluence API error:', response.status, errorText);
        return false;
      }

      console.log('Confluence connection successful');
      return true;
    } catch (error) {
      console.error('Confluence connection test failed:', error);
      return false;
    }
  }

  /**
   * Get all spaces or a specific space
   */
  async getSpaces(spaceKey?: string): Promise<ConfluenceSpace[]> {
    try {
      const url = spaceKey
        ? `${this.baseUrl}/spaces?keys=${spaceKey}`
        : `${this.baseUrl}/spaces?limit=100`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.authHeader,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch spaces: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error fetching Confluence spaces:', error);
      throw error;
    }
  }

  /**
   * Get pages from a space with full hierarchy
   */
  async getPages(spaceId: string): Promise<ConfluencePage[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/spaces/${spaceId}/pages?limit=250&body-format=storage`,
        {
          method: 'GET',
          headers: {
            'Authorization': this.authHeader,
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch pages: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error fetching Confluence pages:', error);
      throw error;
    }
  }

  /**
   * Get a specific page by ID with full content
   */
  async getPage(pageId: string): Promise<ConfluencePage | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/pages/${pageId}?body-format=storage`,
        {
          method: 'GET',
          headers: {
            'Authorization': this.authHeader,
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch page: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching Confluence page:', error);
      throw error;
    }
  }

  /**
   * Get child pages of a parent page
   */
  async getChildPages(pageId: string): Promise<ConfluencePage[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/pages/${pageId}/children?limit=250`,
        {
          method: 'GET',
          headers: {
            'Authorization': this.authHeader,
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch child pages: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error fetching child pages:', error);
      throw error;
    }
  }

  /**
   * Build complete page hierarchy for a space
   */
  async getPageHierarchy(spaceId: string): Promise<ConfluencePage[]> {
    try {
      const allPages = await this.getPages(spaceId);

      // Build a map of pages by ID
      const pageMap = new Map<string, ConfluencePage>();
      const rootPages: ConfluencePage[] = [];

      // First pass: create map and identify root pages
      for (const page of allPages) {
        pageMap.set(page.id, { ...page, children: [] });
        if (!page.parentId) {
          rootPages.push(pageMap.get(page.id)!);
        }
      }

      // Second pass: build hierarchy
      for (const page of allPages) {
        if (page.parentId && pageMap.has(page.parentId)) {
          const parent = pageMap.get(page.parentId)!;
          const child = pageMap.get(page.id)!;
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(child);
        }
      }

      return rootPages;
    } catch (error) {
      console.error('Error building page hierarchy:', error);
      throw error;
    }
  }
}

/**
 * Create a Confluence client instance
 */
export function createConfluenceClient(siteUrl: string, email: string, apiToken: string, spaceKey?: string): ConfluenceClient {
  return new ConfluenceClient({
    siteUrl,
    email,
    apiToken,
    spaceKey,
  });
}
