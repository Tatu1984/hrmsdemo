'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, FileText, Download, Loader2, FolderOpen, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Page {
  id: string;
  externalId: string;
  title: string;
  content: string;
  spaceKey: string;
  spaceName: string;
  parentId: string | null;
  children: Page[];
  version: number;
  updatedDate: string;
}

interface Space {
  spaceKey: string;
  spaceName: string;
  pages: Page[];
}

interface DocumentationData {
  spaces: Space[];
  totalPages: number;
}

export default function DocumentationViewer() {
  const [documentation, setDocumentation] = useState<DocumentationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchDocumentation();
  }, []);

  const fetchDocumentation = async () => {
    try {
      const response = await fetch('/api/documentation');
      if (response.ok) {
        const data = await response.json();
        setDocumentation(data);

        // Auto-expand first space and select first page
        if (data.spaces.length > 0) {
          const firstSpace = data.spaces[0];
          setExpandedSpaces(new Set([firstSpace.spaceKey]));
          if (firstSpace.pages.length > 0) {
            setSelectedPage(firstSpace.pages[0]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching documentation:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePage = (externalId: string) => {
    setExpandedPages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(externalId)) {
        newSet.delete(externalId);
      } else {
        newSet.add(externalId);
      }
      return newSet;
    });
  };

  const toggleSpace = (spaceKey: string) => {
    setExpandedSpaces((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(spaceKey)) {
        newSet.delete(spaceKey);
      } else {
        newSet.add(spaceKey);
      }
      return newSet;
    });
  };

  const handleExport = async (spaceKey?: string) => {
    setExporting(true);
    try {
      const url = spaceKey
        ? `/api/documentation/export?spaceKey=${spaceKey}`
        : `/api/documentation/export?connectionId=${documentation?.spaces[0]?.pages[0]?.id}`;

      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `documentation-${spaceKey || 'all'}-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting documentation:', error);
    } finally {
      setExporting(false);
    }
  };

  const renderPageTree = (page: Page, level: number = 0) => {
    const isExpanded = expandedPages.has(page.externalId);
    const isSelected = selectedPage?.externalId === page.externalId;
    const hasChildren = page.children && page.children.length > 0;

    return (
      <div key={page.externalId}>
        <div
          className={`flex items-center gap-2 py-2 px-3 cursor-pointer rounded hover:bg-gray-100 transition-colors ${
            isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
          }`}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
          onClick={() => setSelectedPage(page)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePage(page.externalId);
              }}
              className="p-0.5 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}
          <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="text-sm truncate flex-1">{page.title}</span>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {page.children.map((child) => renderPageTree(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!documentation || documentation.spaces.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Documentation Available</h3>
          <p className="text-gray-500">
            Connect Confluence in the Integrations section to import documentation.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-200px)]">
      {/* Sidebar - Table of Contents */}
      <div className="w-80 flex flex-col bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-900">Documentation</h2>
          <p className="text-sm text-gray-500 mt-1">{documentation.totalPages} pages</p>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {documentation.spaces.map((space) => {
            const isSpaceExpanded = expandedSpaces.has(space.spaceKey);

            return (
              <div key={space.spaceKey} className="mb-2">
                <div
                  className="flex items-center gap-2 py-2 px-3 cursor-pointer rounded hover:bg-gray-100 font-medium"
                  onClick={() => toggleSpace(space.spaceKey)}
                >
                  <button className="p-0.5">
                    {isSpaceExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                  {isSpaceExpanded ? (
                    <FolderOpen className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Folder className="w-5 h-5 text-blue-600" />
                  )}
                  <span className="text-sm flex-1">{space.spaceName}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport(space.spaceKey);
                    }}
                    disabled={exporting}
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                </div>

                {isSpaceExpanded && (
                  <div className="mt-1">
                    {space.pages.map((page) => renderPageTree(page))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t">
          <Button
            onClick={() => handleExport()}
            disabled={exporting}
            className="w-full"
            variant="outline"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export All
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border overflow-hidden">
        {selectedPage ? (
          <div className="h-full flex flex-col">
            <div className="p-6 border-b bg-gray-50">
              <h1 className="text-2xl font-bold text-gray-900">{selectedPage.title}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span>Version {selectedPage.version}</span>
                <span>•</span>
                <span>
                  Updated {new Date(selectedPage.updatedDate).toLocaleDateString()}
                </span>
                <span>•</span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                  {selectedPage.spaceName}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div
                className="prose prose-blue max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedPage.content }}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Select a page from the sidebar to view</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
