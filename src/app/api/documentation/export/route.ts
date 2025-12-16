import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/documentation/export - Export documentation to Word format
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const spaceKey = searchParams.get('spaceKey');
    const connectionId = searchParams.get('connectionId');

    if (!spaceKey && !connectionId) {
      return NextResponse.json(
        { error: 'Either spaceKey or connectionId is required' },
        { status: 400 }
      );
    }

    // Build where clause
    const where: any = {};
    if (connectionId) where.connectionId = connectionId;
    if (spaceKey) where.spaceKey = spaceKey;

    // Get all pages in order
    const pages = await prisma.confluencePage.findMany({
      where,
      orderBy: [
        { spaceKey: 'asc' },
        { position: 'asc' },
        { title: 'asc' },
      ],
    });

    if (pages.length === 0) {
      return NextResponse.json(
        { error: 'No pages found' },
        { status: 404 }
      );
    }

    // Build hierarchy for proper ordering
    const pageMap = new Map();
    const rootPages: any[] = [];

    pages.forEach((page) => {
      pageMap.set(page.externalId, {
        ...page,
        children: [],
      });
    });

    pages.forEach((page) => {
      const node = pageMap.get(page.externalId);
      if (page.parentId && pageMap.has(page.parentId)) {
        pageMap.get(page.parentId).children.push(node);
      } else {
        rootPages.push(node);
      }
    });

    // Generate HTML document with proper structure
    const htmlParts: string[] = [];

    htmlParts.push(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${pages[0].spaceName || 'Documentation'}</title>
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.6;
      margin: 40px;
      color: #333;
    }
    h1 {
      color: #0052CC;
      border-bottom: 3px solid #0052CC;
      padding-bottom: 10px;
      page-break-before: always;
    }
    h1:first-of-type {
      page-break-before: auto;
    }
    h2 {
      color: #0065FF;
      margin-top: 30px;
      page-break-after: avoid;
    }
    h3 {
      color: #2684FF;
      margin-top: 20px;
    }
    h4, h5, h6 {
      color: #5E6C84;
    }
    p {
      margin: 10px 0;
    }
    pre {
      background: #F4F5F7;
      border: 1px solid #C1C7D0;
      border-radius: 3px;
      padding: 15px;
      overflow-x: auto;
      page-break-inside: avoid;
    }
    code {
      background: #F4F5F7;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 20px 0;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #C1C7D0;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background: #F4F5F7;
      font-weight: bold;
    }
    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 20px 0;
    }
    .page-section {
      margin-bottom: 40px;
    }
    .toc {
      background: #F4F5F7;
      padding: 20px;
      margin-bottom: 30px;
      border-radius: 5px;
    }
    .toc h2 {
      margin-top: 0;
    }
    .toc ul {
      list-style-type: none;
      padding-left: 0;
    }
    .toc li {
      margin: 8px 0;
    }
    .toc a {
      color: #0052CC;
      text-decoration: none;
    }
    .toc a:hover {
      text-decoration: underline;
    }
    .indent-1 { padding-left: 20px; }
    .indent-2 { padding-left: 40px; }
    .indent-3 { padding-left: 60px; }
  </style>
</head>
<body>
`);

    // Add cover page
    htmlParts.push(`
  <div style="text-align: center; margin-top: 100px; page-break-after: always;">
    <h1 style="font-size: 48px; border: none;">${pages[0].spaceName || 'Documentation'}</h1>
    <p style="font-size: 18px; color: #5E6C84; margin-top: 20px;">
      Generated on ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}
    </p>
    <p style="font-size: 14px; color: #5E6C84; margin-top: 40px;">
      Total Pages: ${pages.length}
    </p>
  </div>
`);

    // Generate table of contents
    htmlParts.push('<div class="toc"><h2>Table of Contents</h2><ul>');

    function addToTOC(pageNode: any, level: number = 0) {
      const indent = level > 0 ? `indent-${Math.min(level, 3)}` : '';
      htmlParts.push(`
        <li class="${indent}">
          <a href="#page-${pageNode.externalId}">${pageNode.title}</a>
        </li>
      `);

      if (pageNode.children && pageNode.children.length > 0) {
        pageNode.children.forEach((child: any) => addToTOC(child, level + 1));
      }
    }

    rootPages.forEach((page) => addToTOC(page));
    htmlParts.push('</ul></div>');

    // Add all pages with content
    function addPageContent(pageNode: any, level: number = 1) {
      const headingLevel = Math.min(level, 6);

      htmlParts.push(`
  <div class="page-section" id="page-${pageNode.externalId}">
    <h${headingLevel}>${pageNode.title}</h${headingLevel}>
    <div class="content">
      ${pageNode.content || '<p><em>No content available</em></p>'}
    </div>
  </div>
`);

      if (pageNode.children && pageNode.children.length > 0) {
        pageNode.children.forEach((child: any) => addPageContent(child, level + 1));
      }
    }

    rootPages.forEach((page) => addPageContent(page));

    htmlParts.push(`
</body>
</html>
`);

    const htmlContent = htmlParts.join('\n');

    // Return as downloadable file
    const fileName = `${pages[0].spaceName || 'Documentation'}_${new Date().toISOString().split('T')[0]}.html`;

    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting documentation:', error);
    return NextResponse.json(
      { error: 'Failed to export documentation' },
      { status: 500 }
    );
  }
}
