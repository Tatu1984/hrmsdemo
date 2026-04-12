import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  TableOfContents,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  PageBreak,
  ImageRun,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
} from 'docx';
import * as fs from 'fs';
import * as path from 'path';
import { createCanvas } from 'canvas';

// Helper functions
const createHeading = (text: string, level: typeof HeadingLevel[keyof typeof HeadingLevel]) => {
  return new Paragraph({
    text,
    heading: level,
    spacing: { before: 400, after: 200 },
  });
};

const createParagraph = (text: string, options?: { bold?: boolean; indent?: number }) => {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: options?.bold,
        size: 24,
      }),
    ],
    spacing: { after: 120 },
    indent: options?.indent ? { left: options.indent } : undefined,
  });
};

const createBulletPoint = (text: string, level = 0) => {
  return new Paragraph({
    children: [new TextRun({ text, size: 24 })],
    bullet: { level },
    spacing: { after: 80 },
  });
};

const createTableRow = (cells: string[], isHeader = false) => {
  return new TableRow({
    children: cells.map(
      (cell) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: cell,
                  bold: isHeader,
                  size: 22,
                }),
              ],
              alignment: AlignmentType.LEFT,
            }),
          ],
          shading: isHeader ? { fill: '2563EB', color: 'FFFFFF' } : undefined,
        })
    ),
  });
};

const createTable = (headers: string[], rows: string[][]) => {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      createTableRow(headers, true),
      ...rows.map((row) => createTableRow(row)),
    ],
  });
};

// Generate Data Flow Diagram
function generateDataFlowDiagram(): Buffer {
  const canvas = createCanvas(1200, 900);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 1200, 900);

  // Title
  ctx.fillStyle = '#1e3a5f';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('HRMS Data Flow Diagram', 600, 40);

  // Define colors
  const colors = {
    user: '#3b82f6',
    process: '#10b981',
    database: '#f59e0b',
    external: '#8b5cf6',
    arrow: '#64748b',
  };

  // Draw User/Client box
  ctx.fillStyle = colors.user;
  ctx.fillRect(50, 100, 150, 80);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px Arial';
  ctx.fillText('User', 125, 135);
  ctx.font = '12px Arial';
  ctx.fillText('(Browser)', 125, 155);

  // Draw API Gateway
  ctx.fillStyle = colors.process;
  ctx.fillRect(300, 100, 180, 80);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px Arial';
  ctx.fillText('Next.js API', 390, 135);
  ctx.font = '12px Arial';
  ctx.fillText('Routes & Middleware', 390, 155);

  // Draw Auth Module
  ctx.fillStyle = colors.process;
  ctx.fillRect(550, 50, 150, 60);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Arial';
  ctx.fillText('Authentication', 625, 75);
  ctx.font = '12px Arial';
  ctx.fillText('JWT/Session', 625, 95);

  // Draw Database
  ctx.fillStyle = colors.database;
  ctx.beginPath();
  ctx.ellipse(900, 140, 100, 50, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px Arial';
  ctx.fillText('PostgreSQL', 900, 135);
  ctx.font = '12px Arial';
  ctx.fillText('Database', 900, 155);

  // Module boxes - Row 1
  const modules1 = [
    { name: 'Employee\nManagement', x: 100 },
    { name: 'Attendance\nTracking', x: 280 },
    { name: 'Leave\nManagement', x: 460 },
    { name: 'Payroll\nProcessing', x: 640 },
    { name: 'Project\nManagement', x: 820 },
  ];

  modules1.forEach((mod) => {
    ctx.fillStyle = '#e0f2fe';
    ctx.strokeStyle = colors.process;
    ctx.lineWidth = 2;
    ctx.fillRect(mod.x, 250, 140, 70);
    ctx.strokeRect(mod.x, 250, 140, 70);
    ctx.fillStyle = '#0369a1';
    ctx.font = 'bold 12px Arial';
    const lines = mod.name.split('\n');
    lines.forEach((line, i) => {
      ctx.fillText(line, mod.x + 70, 280 + i * 15);
    });
  });

  // Module boxes - Row 2
  const modules2 = [
    { name: 'Sales & CRM', x: 100 },
    { name: 'Invoicing', x: 280 },
    { name: 'Messaging', x: 460 },
    { name: 'Reports', x: 640 },
    { name: 'AI Features', x: 820 },
  ];

  modules2.forEach((mod) => {
    ctx.fillStyle = '#fef3c7';
    ctx.strokeStyle = colors.database;
    ctx.lineWidth = 2;
    ctx.fillRect(mod.x, 370, 140, 70);
    ctx.strokeRect(mod.x, 370, 140, 70);
    ctx.fillStyle = '#92400e';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(mod.name, mod.x + 70, 410);
  });

  // External Integrations
  ctx.fillStyle = colors.external;
  ctx.fillRect(100, 500, 180, 70);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Arial';
  ctx.fillText('Azure DevOps', 190, 530);
  ctx.font = '12px Arial';
  ctx.fillText('Work Items & Commits', 190, 550);

  ctx.fillStyle = colors.external;
  ctx.fillRect(320, 500, 150, 70);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Arial';
  ctx.fillText('Asana', 395, 530);
  ctx.font = '12px Arial';
  ctx.fillText('Task Sync', 395, 550);

  ctx.fillStyle = colors.external;
  ctx.fillRect(510, 500, 150, 70);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Arial';
  ctx.fillText('Confluence', 585, 530);
  ctx.font = '12px Arial';
  ctx.fillText('Docs Sync', 585, 550);

  ctx.fillStyle = colors.external;
  ctx.fillRect(700, 500, 150, 70);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Arial';
  ctx.fillText('OpenAI', 775, 530);
  ctx.font = '12px Arial';
  ctx.fillText('AI/ML Features', 775, 550);

  // Draw arrows
  ctx.strokeStyle = colors.arrow;
  ctx.lineWidth = 2;

  // User to API
  ctx.beginPath();
  ctx.moveTo(200, 140);
  ctx.lineTo(300, 140);
  ctx.stroke();
  drawArrowHead(ctx, 300, 140, 'right');

  // API to Auth
  ctx.beginPath();
  ctx.moveTo(480, 120);
  ctx.lineTo(550, 90);
  ctx.stroke();
  drawArrowHead(ctx, 550, 90, 'right');

  // API to Database
  ctx.beginPath();
  ctx.moveTo(480, 140);
  ctx.lineTo(800, 140);
  ctx.stroke();
  drawArrowHead(ctx, 800, 140, 'right');

  // API to Modules
  ctx.beginPath();
  ctx.moveTo(390, 180);
  ctx.lineTo(390, 230);
  ctx.lineTo(170, 230);
  ctx.lineTo(170, 250);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(390, 230);
  ctx.lineTo(890, 230);
  ctx.lineTo(890, 250);
  ctx.stroke();

  // Modules to Database (vertical lines)
  for (let x = 170; x <= 890; x += 180) {
    ctx.beginPath();
    ctx.setLineDash([5, 3]);
    ctx.moveTo(x, 320);
    ctx.lineTo(x, 350);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Legend
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(900, 500, 280, 150);
  ctx.strokeStyle = '#cbd5e1';
  ctx.strokeRect(900, 500, 280, 150);

  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Legend:', 920, 525);

  const legendItems = [
    { color: colors.user, label: 'User Interface' },
    { color: colors.process, label: 'Processing Layer' },
    { color: colors.database, label: 'Data Storage' },
    { color: colors.external, label: 'External Services' },
  ];

  legendItems.forEach((item, i) => {
    ctx.fillStyle = item.color;
    ctx.fillRect(920, 540 + i * 25, 20, 15);
    ctx.fillStyle = '#1e293b';
    ctx.font = '12px Arial';
    ctx.fillText(item.label, 950, 552 + i * 25);
  });

  return canvas.toBuffer('image/png');
}

function drawArrowHead(ctx: any, x: number, y: number, direction: string) {
  ctx.beginPath();
  if (direction === 'right') {
    ctx.moveTo(x, y);
    ctx.lineTo(x - 10, y - 5);
    ctx.lineTo(x - 10, y + 5);
  } else if (direction === 'down') {
    ctx.moveTo(x, y);
    ctx.lineTo(x - 5, y - 10);
    ctx.lineTo(x + 5, y - 10);
  }
  ctx.closePath();
  ctx.fill();
}

// Generate Architecture Diagram
function generateArchitectureDiagram(): Buffer {
  const canvas = createCanvas(1200, 1000);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 1200, 1000);

  // Title
  ctx.fillStyle = '#1e3a5f';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('HRMS Software Architecture', 600, 40);

  // Layer colors
  const layers = {
    presentation: '#dbeafe',
    application: '#dcfce7',
    domain: '#fef3c7',
    infrastructure: '#fce7f3',
    external: '#e0e7ff',
  };

  // Presentation Layer
  ctx.fillStyle = layers.presentation;
  ctx.fillRect(50, 70, 1100, 150);
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.strokeRect(50, 70, 1100, 150);
  ctx.fillStyle = '#1e40af';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('PRESENTATION LAYER', 70, 100);

  // Presentation components
  const presentationComps = [
    { name: 'Admin Portal', x: 100 },
    { name: 'Manager Portal', x: 320 },
    { name: 'Employee Portal', x: 540 },
    { name: 'AI Assistant', x: 760 },
    { name: 'Reports UI', x: 980 },
  ];

  presentationComps.forEach((comp) => {
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(comp.x, 120, 160, 50);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(comp.name, comp.x + 80, 150);
  });

  ctx.fillStyle = '#64748b';
  ctx.font = '12px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Next.js 15 • React 19 • Tailwind CSS • Radix UI', 70, 200);

  // Application Layer
  ctx.fillStyle = layers.application;
  ctx.fillRect(50, 240, 1100, 180);
  ctx.strokeStyle = '#10b981';
  ctx.strokeRect(50, 240, 1100, 180);
  ctx.fillStyle = '#065f46';
  ctx.font = 'bold 18px Arial';
  ctx.fillText('APPLICATION LAYER (API Routes)', 70, 270);

  const apiModules = [
    ['Auth API', 'Employee API', 'Attendance API', 'Leave API'],
    ['Payroll API', 'Project API', 'Sales API', 'Invoice API'],
    ['Messages API', 'Reports API', 'AI API', 'Integration API'],
  ];

  apiModules.forEach((row, rowIdx) => {
    row.forEach((mod, colIdx) => {
      const x = 100 + colIdx * 270;
      const y = 290 + rowIdx * 40;
      ctx.fillStyle = '#10b981';
      ctx.fillRect(x, y, 220, 30);
      ctx.fillStyle = '#fff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(mod, x + 110, y + 20);
    });
  });

  // Domain Layer
  ctx.fillStyle = layers.domain;
  ctx.fillRect(50, 440, 1100, 180);
  ctx.strokeStyle = '#f59e0b';
  ctx.strokeRect(50, 440, 1100, 180);
  ctx.fillStyle = '#92400e';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('DOMAIN LAYER (Business Logic)', 70, 470);

  const domainServices = [
    { name: 'Employee\nService', x: 100, w: 140 },
    { name: 'Attendance\nService', x: 260, w: 140 },
    { name: 'Payroll\nCalculation', x: 420, w: 140 },
    { name: 'Leave\nManagement', x: 580, w: 140 },
    { name: 'Project\nTracking', x: 740, w: 140 },
    { name: 'Sales\nPipeline', x: 900, w: 140 },
  ];

  domainServices.forEach((svc) => {
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(svc.x, 490, svc.w, 60);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    const lines = svc.name.split('\n');
    lines.forEach((line, i) => {
      ctx.fillText(line, svc.x + svc.w / 2, 515 + i * 15);
    });
  });

  // Utilities row
  const utils = ['Auth Utils', 'Validation (Zod)', 'Export Utils', 'IP Utils'];
  utils.forEach((util, i) => {
    const x = 100 + i * 270;
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(x, 570, 220, 30);
    ctx.fillStyle = '#78350f';
    ctx.font = '12px Arial';
    ctx.fillText(util, x + 110, 590);
  });

  // Infrastructure Layer
  ctx.fillStyle = layers.infrastructure;
  ctx.fillRect(50, 640, 1100, 140);
  ctx.strokeStyle = '#ec4899';
  ctx.strokeRect(50, 640, 1100, 140);
  ctx.fillStyle = '#9d174d';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('INFRASTRUCTURE LAYER', 70, 670);

  const infraComps = [
    { name: 'Prisma ORM', x: 100, w: 180 },
    { name: 'PostgreSQL', x: 310, w: 180 },
    { name: 'File Storage', x: 520, w: 180 },
    { name: 'JWT/Sessions', x: 730, w: 180 },
    { name: 'Middleware', x: 940, w: 180 },
  ];

  infraComps.forEach((comp) => {
    ctx.fillStyle = '#ec4899';
    ctx.fillRect(comp.x, 695, comp.w, 50);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(comp.name, comp.x + comp.w / 2, 725);
  });

  // External Services Layer
  ctx.fillStyle = layers.external;
  ctx.fillRect(50, 800, 1100, 120);
  ctx.strokeStyle = '#6366f1';
  ctx.strokeRect(50, 800, 1100, 120);
  ctx.fillStyle = '#3730a3';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('EXTERNAL SERVICES & INTEGRATIONS', 70, 830);

  const externalServices = [
    { name: 'Azure DevOps\nAPI', x: 100 },
    { name: 'Asana\nAPI', x: 320 },
    { name: 'Confluence\nAPI', x: 540 },
    { name: 'OpenAI\nGPT API', x: 760 },
    { name: 'Vercel\nHosting', x: 980 },
  ];

  externalServices.forEach((svc) => {
    ctx.fillStyle = '#6366f1';
    ctx.fillRect(svc.x, 855, 160, 50);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    const lines = svc.name.split('\n');
    lines.forEach((line, i) => {
      ctx.fillText(line, svc.x + 80, 875 + i * 14);
    });
  });

  // Connection arrows (simplified)
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  // Vertical connections
  [180, 400, 620, 840, 1060].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, 170);
    ctx.lineTo(x, 240);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, 420);
    ctx.lineTo(x, 440);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, 620);
    ctx.lineTo(x, 640);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, 780);
    ctx.lineTo(x, 800);
    ctx.stroke();
  });

  ctx.setLineDash([]);

  // Legend
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(50, 940, 1100, 50);
  ctx.strokeStyle = '#e2e8f0';
  ctx.strokeRect(50, 940, 1100, 50);

  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Tech Stack:', 70, 970);

  ctx.font = '11px Arial';
  ctx.fillText(
    'Next.js 15 | React 19 | TypeScript 5 | Tailwind CSS 4 | Prisma 6 | PostgreSQL | JWT | Radix UI | OpenAI | Zod',
    160,
    970
  );

  return canvas.toBuffer('image/png');
}

// Main document generation
async function generateSOW() {
  console.log('Generating Data Flow Diagram...');
  const dataFlowImage = generateDataFlowDiagram();
  fs.writeFileSync(path.join(__dirname, '../docs/data-flow-diagram.png'), dataFlowImage);

  console.log('Generating Architecture Diagram...');
  const archImage = generateArchitectureDiagram();
  fs.writeFileSync(path.join(__dirname, '../docs/software-architecture.png'), archImage);

  console.log('Generating SoW Document...');

  const doc = new Document({
    creator: 'HRMS Team',
    title: 'HRMS - Statement of Work',
    description: 'Complete Statement of Work for Human Resource Management System',
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 24 },
        },
        heading1: {
          run: { font: 'Calibri', size: 32, bold: true, color: '1e3a5f' },
        },
        heading2: {
          run: { font: 'Calibri', size: 28, bold: true, color: '2563eb' },
        },
        heading3: {
          run: { font: 'Calibri', size: 24, bold: true, color: '374151' },
        },
      },
    },
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'HRMS - Statement of Work', bold: true, size: 20 }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Page ' }),
                  new TextRun({ children: [PageNumber.CURRENT] }),
                  new TextRun({ text: ' of ' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES] }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children: [
          // Cover Page
          new Paragraph({ children: [new TextRun({ text: '' })] }),
          new Paragraph({ children: [new TextRun({ text: '' })] }),
          new Paragraph({ children: [new TextRun({ text: '' })] }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'STATEMENT OF WORK',
                bold: true,
                size: 72,
                color: '1e3a5f',
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ children: [new TextRun({ text: '' })] }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Human Resource Management System',
                bold: true,
                size: 48,
                color: '2563eb',
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [new TextRun({ text: '(HRMS)', size: 36, color: '64748b' })],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ children: [new TextRun({ text: '' })] }),
          new Paragraph({ children: [new TextRun({ text: '' })] }),
          new Paragraph({ children: [new TextRun({ text: '' })] }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Version 1.0',
                size: 28,
                color: '64748b',
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
                size: 24,
                color: '64748b',
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ children: [new PageBreak()] }),

          // Table of Contents
          createHeading('Table of Contents', HeadingLevel.HEADING_1),
          new Paragraph({ children: [new TextRun({ text: '' })] }),
          createParagraph('1. Executive Summary'),
          createParagraph('2. Feature List'),
          createParagraph('3. Technology Stack'),
          createParagraph('4. Data Flow Diagram'),
          createParagraph('5. Software Architecture'),
          createParagraph('6. Plan of Action (Phase-wise Development)'),
          createParagraph('7. Required Team Setup'),
          createParagraph('8. Timeline'),
          createParagraph('9. API Documentation'),
          createParagraph('10. Database Schema'),
          createParagraph('11. Appendix'),
          new Paragraph({ children: [new PageBreak()] }),

          // 1. Executive Summary
          createHeading('1. Executive Summary', HeadingLevel.HEADING_1),
          createParagraph(
            'This Statement of Work (SoW) outlines the comprehensive development plan for a Human Resource Management System (HRMS). The system is designed to streamline HR operations, automate routine tasks, and provide actionable insights through advanced analytics and AI-powered features.'
          ),
          new Paragraph({ children: [new TextRun({ text: '' })] }),
          createParagraph('Key Objectives:', { bold: true }),
          createBulletPoint('Centralize all HR operations in a single platform'),
          createBulletPoint('Automate attendance tracking with advanced monitoring'),
          createBulletPoint('Streamline payroll processing with multiple salary structures'),
          createBulletPoint('Enable efficient leave and project management'),
          createBulletPoint('Integrate with popular development tools (Azure DevOps, Asana, Confluence)'),
          createBulletPoint('Provide AI-powered insights and automation'),
          new Paragraph({ children: [new PageBreak()] }),

          // 2. Feature List
          createHeading('2. Feature List', HeadingLevel.HEADING_1),

          createHeading('2.1 Employee Management', HeadingLevel.HEADING_2),
          createBulletPoint('Complete employee profiles with personal and professional details'),
          createBulletPoint('KYC document management (Aadhar, PAN, Passport, etc.)'),
          createBulletPoint('Bank account details with verification workflow'),
          createBulletPoint('Emergency contact information'),
          createBulletPoint('Document storage (offer letters, appointment letters, certificates)'),
          createBulletPoint('Reporting hierarchy and organizational structure'),
          createBulletPoint('Department and designation management'),
          createBulletPoint('Employee activation/deactivation controls'),

          createHeading('2.2 Attendance & Monitoring', HeadingLevel.HEADING_2),
          createBulletPoint('Punch-in/punch-out system with timestamp and IP tracking'),
          createBulletPoint('Break management (start/end breaks)'),
          createBulletPoint('Idle time detection and calculation'),
          createBulletPoint('Suspicious activity detection:'),
          createBulletPoint('Mouse jiggler pattern detection', 1),
          createBulletPoint('Auto-typer detection', 1),
          createBulletPoint('Keystroke pattern analysis', 1),
          createBulletPoint('Macro detection', 1),
          createBulletPoint('Dual heartbeat system for accurate tracking'),
          createBulletPoint('Activity logs with browser and device information'),
          createBulletPoint('Attendance calendar view'),
          createBulletPoint('Manual attendance entry for admin/managers'),

          createHeading('2.3 Leave Management', HeadingLevel.HEADING_2),
          createBulletPoint('Multiple leave types: Sick, Casual, Earned, Unpaid'),
          createBulletPoint('Leave application workflow with approval process'),
          createBulletPoint('Leave status tracking: Pending, Approved, Rejected, Cancelled, Hold'),
          createBulletPoint('Admin comment system for leave decisions'),
          createBulletPoint('Leave balance tracking per employee per year'),
          createBulletPoint('Overlap detection for leave applications'),
          createBulletPoint('Leave-to-attendance synchronization'),

          createHeading('2.4 Payroll & Compensation', HeadingLevel.HEADING_2),
          createBulletPoint('Automated monthly payroll generation'),
          createBulletPoint('Support for fixed and variable salary structures'),
          createBulletPoint('Component-based salary calculation'),
          createBulletPoint('Sales target tracking for variable pay employees'),
          createBulletPoint('Professional tax and TDS calculation'),
          createBulletPoint('Penalty and advance payment deductions'),
          createBulletPoint('Configurable other deductions'),
          createBulletPoint('Payroll approval workflow'),
          createBulletPoint('Payslip generation and download'),

          createHeading('2.5 Project & Task Management', HeadingLevel.HEADING_2),
          createBulletPoint('Project creation with detailed information'),
          createBulletPoint('Project types: Milestone-based and Retainer'),
          createBulletPoint('Project status tracking: Active, Completed, On Hold, Cancelled'),
          createBulletPoint('Milestone-based project structure'),
          createBulletPoint('Budget and upfront payment tracking'),
          createBulletPoint('Project member assignment with role tracking'),
          createBulletPoint('Task management with priorities: Low, Medium, High, Urgent'),
          createBulletPoint('Task status workflow: Pending, In Progress, Hold, Completed'),
          createBulletPoint('Task updates and progress tracking'),

          createHeading('2.6 Sales & CRM', HeadingLevel.HEADING_2),
          createBulletPoint('Lead management with multiple statuses'),
          createBulletPoint('Lead progression: New → Cold Call → Warm → Prospect → Converted'),
          createBulletPoint('Lead to sale conversion tracking'),
          createBulletPoint('Sales record management'),
          createBulletPoint('Commission calculation'),
          createBulletPoint('Monthly sales target tracking'),
          createBulletPoint('Multi-currency support (USD, INR, etc.)'),
          createBulletPoint('Sale-to-project synchronization'),

          createHeading('2.7 Invoicing & Accounting', HeadingLevel.HEADING_2),
          createBulletPoint('Invoice generation and management'),
          createBulletPoint('Invoice statuses: Draft, Sent, Paid, Overdue, Cancelled'),
          createBulletPoint('Multiple currency support'),
          createBulletPoint('Invoice item line tracking'),
          createBulletPoint('Payment tracking'),
          createBulletPoint('Account/Ledger management'),
          createBulletPoint('Income and expense categorization'),

          createHeading('2.8 Messaging & Communication', HeadingLevel.HEADING_2),
          createBulletPoint('Internal messaging system'),
          createBulletPoint('Message tracking and read status'),
          createBulletPoint('Granular messaging permissions'),
          createBulletPoint('Conversation threads'),

          createHeading('2.9 AI & Automation Features', HeadingLevel.HEADING_2),
          createBulletPoint('AI-powered HR chatbot'),
          createBulletPoint('Natural language queries for leave, attendance, payroll'),
          createBulletPoint('Sentiment analysis'),
          createBulletPoint('Resume parsing and analysis'),
          createBulletPoint('Skill gap analysis'),
          createBulletPoint('Learning recommendations'),
          createBulletPoint('Predictive analytics (attrition, performance)'),
          createBulletPoint('Automation rules and triggers'),

          createHeading('2.10 Integrations', HeadingLevel.HEADING_2),
          createBulletPoint('Azure DevOps: Work items, commits, pull requests'),
          createBulletPoint('Asana: Task and project synchronization'),
          createBulletPoint('Confluence: Documentation sync'),
          createBulletPoint('User mapping between platforms'),
          new Paragraph({ children: [new PageBreak()] }),

          // 3. Technology Stack
          createHeading('3. Technology Stack', HeadingLevel.HEADING_1),

          createHeading('3.1 Frontend', HeadingLevel.HEADING_2),
          createTable(
            ['Technology', 'Version', 'Purpose'],
            [
              ['Next.js', '15.5.6', 'React framework with App Router, SSR, API routes'],
              ['React', '19.1.0', 'UI component library'],
              ['TypeScript', '5.x', 'Type-safe JavaScript'],
              ['Tailwind CSS', '4.x', 'Utility-first CSS framework'],
              ['Radix UI', 'Latest', 'Accessible component primitives'],
              ['Recharts', '3.3.0', 'Data visualization and charts'],
              ['Lucide React', '0.546.0', 'Icon library (546+ icons)'],
            ]
          ),

          new Paragraph({ children: [new TextRun({ text: '' })] }),
          createHeading('3.2 Backend', HeadingLevel.HEADING_2),
          createTable(
            ['Technology', 'Version', 'Purpose'],
            [
              ['Next.js API Routes', '15.x', 'Serverless API endpoints'],
              ['Prisma', '6.17.1', 'Type-safe ORM'],
              ['PostgreSQL', 'Latest', 'Primary database'],
              ['JWT (jose)', '6.1.0', 'Authentication tokens'],
              ['bcryptjs', '3.0.2', 'Password hashing'],
              ['Zod', '4.1.12', 'Schema validation'],
            ]
          ),

          new Paragraph({ children: [new TextRun({ text: '' })] }),
          createHeading('3.3 External Services', HeadingLevel.HEADING_2),
          createTable(
            ['Service', 'Purpose'],
            [
              ['OpenAI GPT', 'AI chatbot and analytics'],
              ['Azure DevOps API', 'Work item synchronization'],
              ['Asana API', 'Task management integration'],
              ['Confluence API', 'Documentation sync'],
              ['Vercel', 'Deployment platform'],
            ]
          ),
          new Paragraph({ children: [new PageBreak()] }),

          // 4. Data Flow Diagram
          createHeading('4. Data Flow Diagram', HeadingLevel.HEADING_1),
          createParagraph(
            'The following diagram illustrates the data flow within the HRMS application, showing how information moves between different components and external services.'
          ),
          new Paragraph({ children: [new TextRun({ text: '' })] }),
          new Paragraph({
            children: [
              new ImageRun({
                data: dataFlowImage,
                transformation: { width: 600, height: 450 },
                type: 'png',
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ children: [new TextRun({ text: '' })] }),
          createParagraph('Key Data Flows:', { bold: true }),
          createBulletPoint('User interactions flow through the Next.js API layer'),
          createBulletPoint('All requests are authenticated via JWT middleware'),
          createBulletPoint('Business logic modules process data before database operations'),
          createBulletPoint('External integrations sync data bidirectionally'),
          createBulletPoint('AI features process data through OpenAI APIs'),
          new Paragraph({ children: [new PageBreak()] }),

          // 5. Software Architecture
          createHeading('5. Software Architecture', HeadingLevel.HEADING_1),
          createParagraph(
            'The HRMS follows a layered architecture pattern with clear separation of concerns. This ensures maintainability, scalability, and testability.'
          ),
          new Paragraph({ children: [new TextRun({ text: '' })] }),
          new Paragraph({
            children: [
              new ImageRun({
                data: archImage,
                transformation: { width: 600, height: 500 },
                type: 'png',
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ children: [new TextRun({ text: '' })] }),
          createHeading('5.1 Architecture Layers', HeadingLevel.HEADING_2),
          createParagraph('Presentation Layer:', { bold: true }),
          createBulletPoint('Three role-based portals: Admin, Manager, Employee'),
          createBulletPoint('Responsive UI built with Tailwind CSS and Radix UI'),
          createBulletPoint('Server-side rendering for optimal performance'),

          createParagraph('Application Layer:', { bold: true }),
          createBulletPoint('RESTful API routes handling all business operations'),
          createBulletPoint('Middleware for authentication and authorization'),
          createBulletPoint('Request validation using Zod schemas'),

          createParagraph('Domain Layer:', { bold: true }),
          createBulletPoint('Business logic encapsulated in service modules'),
          createBulletPoint('Complex calculations (payroll, attendance)'),
          createBulletPoint('Integration orchestration'),

          createParagraph('Infrastructure Layer:', { bold: true }),
          createBulletPoint('Prisma ORM for database operations'),
          createBulletPoint('PostgreSQL for data persistence'),
          createBulletPoint('File storage for documents'),
          new Paragraph({ children: [new PageBreak()] }),

          // 6. Plan of Action
          createHeading('6. Plan of Action (Phase-wise Development)', HeadingLevel.HEADING_1),

          createHeading('Phase 1: Foundation & Core Modules', HeadingLevel.HEADING_2),
          createParagraph('Objective: Establish the foundational infrastructure and core HR modules.'),
          createBulletPoint('Project setup with Next.js 15 and TypeScript'),
          createBulletPoint('Database schema design and Prisma setup'),
          createBulletPoint('Authentication system (JWT-based)'),
          createBulletPoint('Role-based access control implementation'),
          createBulletPoint('Employee management module'),
          createBulletPoint('Basic UI components library'),
          createParagraph('Deliverables: Working authentication, employee CRUD, role-based dashboards'),

          createHeading('Phase 2: Attendance & Leave Management', HeadingLevel.HEADING_2),
          createParagraph('Objective: Implement comprehensive attendance tracking and leave management.'),
          createBulletPoint('Punch-in/punch-out functionality'),
          createBulletPoint('Activity tracking with heartbeat system'),
          createBulletPoint('Suspicious activity detection algorithms'),
          createBulletPoint('Leave application workflow'),
          createBulletPoint('Leave approval process'),
          createBulletPoint('Attendance calendar views'),
          createParagraph('Deliverables: Complete attendance system with monitoring, leave management'),

          createHeading('Phase 3: Payroll System', HeadingLevel.HEADING_2),
          createParagraph('Objective: Build a flexible payroll processing system.'),
          createBulletPoint('Salary structure configuration'),
          createBulletPoint('Fixed and variable pay calculation'),
          createBulletPoint('Tax calculations (PT, TDS)'),
          createBulletPoint('Deduction management'),
          createBulletPoint('Payroll generation automation'),
          createBulletPoint('Payslip generation'),
          createParagraph('Deliverables: Automated payroll processing with multiple salary types'),

          createHeading('Phase 4: Project & Sales Management', HeadingLevel.HEADING_2),
          createParagraph('Objective: Enable project tracking and sales pipeline management.'),
          createBulletPoint('Project creation and management'),
          createBulletPoint('Task management system'),
          createBulletPoint('Lead management (CRM)'),
          createBulletPoint('Sales tracking and conversion'),
          createBulletPoint('Commission calculations'),
          createParagraph('Deliverables: Complete project management, CRM with sales tracking'),

          createHeading('Phase 5: Financial Modules', HeadingLevel.HEADING_2),
          createParagraph('Objective: Implement invoicing and accounting features.'),
          createBulletPoint('Invoice generation'),
          createBulletPoint('Payment tracking'),
          createBulletPoint('Account/Ledger management'),
          createBulletPoint('Income/expense categorization'),
          createBulletPoint('Financial reports'),
          createParagraph('Deliverables: Invoicing system, basic accounting'),

          createHeading('Phase 6: Integrations', HeadingLevel.HEADING_2),
          createParagraph('Objective: Connect with external development tools.'),
          createBulletPoint('Azure DevOps integration'),
          createBulletPoint('Asana integration'),
          createBulletPoint('Confluence integration'),
          createBulletPoint('User mapping system'),
          createBulletPoint('Sync mechanisms'),
          createParagraph('Deliverables: Working integrations with major platforms'),

          createHeading('Phase 7: AI Features & Analytics', HeadingLevel.HEADING_2),
          createParagraph('Objective: Add AI-powered insights and automation.'),
          createBulletPoint('AI chatbot implementation'),
          createBulletPoint('Predictive analytics'),
          createBulletPoint('Sentiment analysis'),
          createBulletPoint('Resume parsing'),
          createBulletPoint('Skill gap analysis'),
          createBulletPoint('Automation rules'),
          createParagraph('Deliverables: AI assistant, predictive insights, automation'),

          createHeading('Phase 8: Testing & Optimization', HeadingLevel.HEADING_2),
          createParagraph('Objective: Ensure quality and performance.'),
          createBulletPoint('Unit and integration testing'),
          createBulletPoint('Performance optimization'),
          createBulletPoint('Security audit'),
          createBulletPoint('User acceptance testing'),
          createBulletPoint('Bug fixes and refinements'),
          createParagraph('Deliverables: Production-ready, tested application'),
          new Paragraph({ children: [new PageBreak()] }),

          // 7. Required Team Setup
          createHeading('7. Required Team Setup', HeadingLevel.HEADING_1),

          createHeading('7.1 Core Development Team', HeadingLevel.HEADING_2),
          createTable(
            ['Role', 'Count', 'Responsibilities'],
            [
              ['Project Manager', '1', 'Overall project coordination, client communication, timeline management'],
              ['Tech Lead', '1', 'Architecture decisions, code reviews, technical guidance'],
              ['Senior Full-Stack Developer', '2', 'Core module development, API design, complex features'],
              ['Full-Stack Developer', '2', 'Feature development, UI implementation, testing'],
              ['Frontend Developer', '1', 'UI/UX implementation, responsive design, component library'],
              ['QA Engineer', '1', 'Test planning, automation, quality assurance'],
            ]
          ),

          new Paragraph({ children: [new TextRun({ text: '' })] }),
          createHeading('7.2 Specialized Roles', HeadingLevel.HEADING_2),
          createTable(
            ['Role', 'Count', 'Responsibilities'],
            [
              ['DevOps Engineer', '1', 'CI/CD setup, deployment, infrastructure management'],
              ['UI/UX Designer', '1', 'User interface design, user experience optimization'],
              ['Database Administrator', '0.5', 'Database optimization, backup strategies, performance tuning'],
            ]
          ),

          new Paragraph({ children: [new TextRun({ text: '' })] }),
          createHeading('7.3 Team Structure', HeadingLevel.HEADING_2),
          createParagraph('Total Team Size: 9-10 members'),
          createBulletPoint('Project Manager reports to client stakeholders'),
          createBulletPoint('Tech Lead oversees all technical decisions'),
          createBulletPoint('Developers work in feature teams with rotating responsibilities'),
          createBulletPoint('QA Engineer works closely with development team'),
          createBulletPoint('Daily standups and weekly sprint reviews'),
          new Paragraph({ children: [new PageBreak()] }),

          // 8. Timeline
          createHeading('8. Timeline', HeadingLevel.HEADING_1),
          createParagraph(
            'The following timeline provides an estimated schedule for each development phase. Actual durations may vary based on scope changes and resource availability.'
          ),

          new Paragraph({ children: [new TextRun({ text: '' })] }),
          createTable(
            ['Phase', 'Duration', 'Key Milestones'],
            [
              ['Phase 1: Foundation & Core', '4 weeks', 'Auth system, Employee module, Basic UI'],
              ['Phase 2: Attendance & Leave', '3 weeks', 'Attendance tracking, Leave management'],
              ['Phase 3: Payroll', '3 weeks', 'Salary calculation, Payslip generation'],
              ['Phase 4: Project & Sales', '4 weeks', 'Project management, CRM, Sales tracking'],
              ['Phase 5: Financial', '2 weeks', 'Invoicing, Accounting basics'],
              ['Phase 6: Integrations', '3 weeks', 'Azure DevOps, Asana, Confluence'],
              ['Phase 7: AI Features', '3 weeks', 'Chatbot, Analytics, Automation'],
              ['Phase 8: Testing & Launch', '2 weeks', 'UAT, Bug fixes, Deployment'],
            ]
          ),

          new Paragraph({ children: [new TextRun({ text: '' })] }),
          createParagraph('Total Estimated Duration: 24 weeks (6 months)', { bold: true }),

          new Paragraph({ children: [new TextRun({ text: '' })] }),
          createHeading('8.1 Milestone Schedule', HeadingLevel.HEADING_2),
          createBulletPoint('Week 4: MVP with authentication and employee management'),
          createBulletPoint('Week 7: Attendance and leave modules complete'),
          createBulletPoint('Week 10: Payroll system operational'),
          createBulletPoint('Week 14: Project and sales management live'),
          createBulletPoint('Week 16: Financial modules ready'),
          createBulletPoint('Week 19: External integrations functional'),
          createBulletPoint('Week 22: AI features deployed'),
          createBulletPoint('Week 24: Production release'),
          new Paragraph({ children: [new PageBreak()] }),

          // 9. API Documentation
          createHeading('9. API Documentation', HeadingLevel.HEADING_1),
          createParagraph(
            'The HRMS exposes a comprehensive RESTful API. All endpoints require authentication unless specified otherwise.'
          ),

          createHeading('9.1 Authentication APIs', HeadingLevel.HEADING_2),
          createTable(
            ['Method', 'Endpoint', 'Description'],
            [
              ['POST', '/api/auth/login', 'Authenticate user and receive JWT token'],
              ['POST', '/api/auth/logout', 'Clear session and invalidate token'],
              ['GET', '/api/auth/me', 'Get current user session information'],
            ]
          ),

          new Paragraph({ children: [new TextRun({ text: '' })] }),
          createHeading('9.2 Employee APIs', HeadingLevel.HEADING_2),
          createTable(
            ['Method', 'Endpoint', 'Description'],
            [
              ['GET', '/api/employees', 'List all employees with filters'],
              ['POST', '/api/employees', 'Create new employee and user account'],
              ['GET', '/api/employees/[id]', 'Get employee details'],
              ['PUT', '/api/employees/[id]', 'Update employee information'],
              ['DELETE', '/api/employees/[id]', 'Delete employee'],
              ['POST', '/api/employees/[id]/documents', 'Upload employee documents'],
              ['PUT', '/api/employees/[id]/banking', 'Update banking details'],
            ]
          ),

          new Paragraph({ children: [new TextRun({ text: '' })] }),
          createHeading('9.3 Attendance APIs', HeadingLevel.HEADING_2),
          createTable(
            ['Method', 'Endpoint', 'Description'],
            [
              ['GET', '/api/attendance', 'Get attendance records'],
              ['POST', '/api/attendance', 'Punch in/out or create manual entry'],
              ['PUT', '/api/attendance', 'Edit attendance record'],
              ['POST', '/api/attendance/heartbeat', 'Send activity heartbeat'],
              ['POST', '/api/attendance/activity', 'Log detailed activity'],
            ]
          ),

          new Paragraph({ children: [new TextRun({ text: '' })] }),
          createHeading('9.4 Leave APIs', HeadingLevel.HEADING_2),
          createTable(
            ['Method', 'Endpoint', 'Description'],
            [
              ['GET', '/api/leaves', 'Get leave requests'],
              ['POST', '/api/leaves', 'Apply for leave'],
              ['PUT', '/api/leaves', 'Approve/reject leave'],
            ]
          ),

          new Paragraph({ children: [new TextRun({ text: '' })] }),
          createHeading('9.5 Payroll APIs', HeadingLevel.HEADING_2),
          createTable(
            ['Method', 'Endpoint', 'Description'],
            [
              ['GET', '/api/payroll', 'Get payroll records'],
              ['POST', '/api/payroll', 'Generate monthly payroll'],
              ['PUT', '/api/payroll', 'Update payroll status'],
              ['GET', '/api/payroll/[id]', 'Get payroll details'],
            ]
          ),

          new Paragraph({ children: [new TextRun({ text: '' })] }),
          createHeading('9.6 Project & Task APIs', HeadingLevel.HEADING_2),
          createTable(
            ['Method', 'Endpoint', 'Description'],
            [
              ['GET', '/api/projects', 'Get projects list'],
              ['POST', '/api/projects', 'Create new project'],
              ['PUT', '/api/projects', 'Update project'],
              ['GET', '/api/tasks', 'Get tasks'],
              ['POST', '/api/tasks', 'Create task'],
              ['PUT', '/api/tasks', 'Update task status'],
            ]
          ),

          new Paragraph({ children: [new TextRun({ text: '' })] }),
          createHeading('9.7 Sales & CRM APIs', HeadingLevel.HEADING_2),
          createTable(
            ['Method', 'Endpoint', 'Description'],
            [
              ['GET', '/api/leads', 'Get leads'],
              ['POST', '/api/leads', 'Create lead'],
              ['PUT', '/api/leads', 'Update lead'],
              ['GET', '/api/sales', 'Get sales records'],
              ['POST', '/api/sales', 'Create sale'],
              ['PUT', '/api/sales', 'Update sale'],
            ]
          ),

          new Paragraph({ children: [new TextRun({ text: '' })] }),
          createHeading('9.8 AI APIs', HeadingLevel.HEADING_2),
          createTable(
            ['Method', 'Endpoint', 'Description'],
            [
              ['POST', '/api/ai/chat', 'Send message to AI assistant'],
              ['GET', '/api/ai/chat', 'Get chat history'],
              ['POST', '/api/ai/predictions', 'Get predictive analytics'],
              ['POST', '/api/ai/sentiment', 'Analyze sentiment'],
              ['POST', '/api/ai/recruitment', 'Parse and analyze resume'],
            ]
          ),
          new Paragraph({ children: [new PageBreak()] }),

          // 10. Database Schema
          createHeading('10. Database Schema', HeadingLevel.HEADING_1),
          createParagraph(
            'The HRMS uses PostgreSQL with Prisma ORM. Below are the key database entities and their relationships.'
          ),

          createHeading('10.1 Core Entities', HeadingLevel.HEADING_2),

          createParagraph('User', { bold: true }),
          createTable(
            ['Field', 'Type', 'Description'],
            [
              ['id', 'String (UUID)', 'Primary key'],
              ['email', 'String', 'Unique email address'],
              ['username', 'String', 'Unique username'],
              ['password', 'String', 'Hashed password'],
              ['role', 'Enum', 'ADMIN, MANAGER, EMPLOYEE'],
              ['employeeId', 'String', 'Foreign key to Employee'],
              ['permissions', 'JSON', 'Granular permissions'],
            ]
          ),

          new Paragraph({ children: [new TextRun({ text: '' })] }),
          createParagraph('Employee', { bold: true }),
          createTable(
            ['Field', 'Type', 'Description'],
            [
              ['id', 'String (UUID)', 'Primary key'],
              ['employeeId', 'String', 'Employee code (EMP001)'],
              ['name', 'String', 'Full name'],
              ['email, phone', 'String', 'Contact information'],
              ['designation', 'String', 'Job title'],
              ['department', 'String', 'Department name'],
              ['salary', 'Float', 'Monthly salary'],
              ['salaryType', 'Enum', 'FIXED, VARIABLE'],
              ['dateOfJoining', 'DateTime', 'Join date'],
              ['reportingHeadId', 'String', 'Manager reference'],
            ]
          ),

          new Paragraph({ children: [new TextRun({ text: '' })] }),
          createParagraph('Attendance', { bold: true }),
          createTable(
            ['Field', 'Type', 'Description'],
            [
              ['id', 'String (UUID)', 'Primary key'],
              ['employeeId', 'String', 'Foreign key to Employee'],
              ['date', 'DateTime', 'Attendance date'],
              ['punchIn, punchOut', 'DateTime', 'Timestamps'],
              ['totalHours', 'Float', 'Hours worked'],
              ['idleTime', 'Float', 'Idle hours detected'],
              ['status', 'Enum', 'PRESENT, ABSENT, HALF_DAY, LEAVE, HOLIDAY'],
            ]
          ),

          new Paragraph({ children: [new TextRun({ text: '' })] }),
          createHeading('10.2 Financial Entities', HeadingLevel.HEADING_2),

          createParagraph('Payroll', { bold: true }),
          createTable(
            ['Field', 'Type', 'Description'],
            [
              ['id', 'String (UUID)', 'Primary key'],
              ['employeeId', 'String', 'Foreign key to Employee'],
              ['month, year', 'Int', 'Payroll period'],
              ['basicSalary', 'Float', 'Base salary amount'],
              ['variablePay', 'Float', 'Variable component'],
              ['grossSalary', 'Float', 'Total before deductions'],
              ['totalDeductions', 'Float', 'All deductions'],
              ['netSalary', 'Float', 'Take-home amount'],
              ['status', 'Enum', 'PENDING, APPROVED, PAID'],
            ]
          ),

          new Paragraph({ children: [new TextRun({ text: '' })] }),
          createParagraph('Invoice', { bold: true }),
          createTable(
            ['Field', 'Type', 'Description'],
            [
              ['id', 'String (UUID)', 'Primary key'],
              ['invoiceNumber', 'String', 'Unique invoice number'],
              ['clientName', 'String', 'Client name'],
              ['amount', 'Float', 'Invoice amount'],
              ['currency', 'String', 'Currency code'],
              ['status', 'Enum', 'DRAFT, SENT, PAID, OVERDUE'],
              ['items', 'JSON', 'Line items'],
            ]
          ),

          new Paragraph({ children: [new TextRun({ text: '' })] }),
          createHeading('10.3 Project Entities', HeadingLevel.HEADING_2),

          createParagraph('Project', { bold: true }),
          createTable(
            ['Field', 'Type', 'Description'],
            [
              ['id', 'String (UUID)', 'Primary key'],
              ['projectId', 'String', 'Project code (PRJ00001)'],
              ['name', 'String', 'Project name'],
              ['projectType', 'Enum', 'MILESTONE, RETAINER'],
              ['totalBudget', 'Float', 'Project budget'],
              ['status', 'Enum', 'ACTIVE, COMPLETED, ON_HOLD, CANCELLED'],
              ['milestones', 'JSON', 'Milestone definitions'],
            ]
          ),

          new Paragraph({ children: [new TextRun({ text: '' })] }),
          createParagraph('Task', { bold: true }),
          createTable(
            ['Field', 'Type', 'Description'],
            [
              ['id', 'String (UUID)', 'Primary key'],
              ['projectId', 'String', 'Foreign key to Project'],
              ['title', 'String', 'Task title'],
              ['assignedTo', 'String', 'Foreign key to Employee'],
              ['status', 'Enum', 'PENDING, IN_PROGRESS, HOLD, COMPLETED'],
              ['priority', 'Enum', 'LOW, MEDIUM, HIGH, URGENT'],
              ['dueDate', 'DateTime', 'Due date'],
            ]
          ),

          new Paragraph({ children: [new TextRun({ text: '' })] }),
          createHeading('10.4 CRM Entities', HeadingLevel.HEADING_2),

          createParagraph('Lead', { bold: true }),
          createTable(
            ['Field', 'Type', 'Description'],
            [
              ['id', 'String (UUID)', 'Primary key'],
              ['leadNumber', 'String', 'Lead code (LD00001)'],
              ['companyName', 'String', 'Company name'],
              ['contactName', 'String', 'Contact person'],
              ['status', 'Enum', 'NEW, WARM, PROSPECT, CONVERTED, LOST'],
              ['estimatedValue', 'Float', 'Estimated deal value'],
            ]
          ),

          new Paragraph({ children: [new TextRun({ text: '' })] }),
          createParagraph('Sale', { bold: true }),
          createTable(
            ['Field', 'Type', 'Description'],
            [
              ['id', 'String (UUID)', 'Primary key'],
              ['saleNumber', 'String', 'Sale code (SL00001)'],
              ['leadId', 'String', 'Foreign key to Lead'],
              ['netAmount', 'Float', 'Sale amount'],
              ['status', 'Enum', 'PENDING, CONFIRMED, DELIVERED, PAID'],
              ['commission', 'String', 'Commission details'],
            ]
          ),

          new Paragraph({ children: [new TextRun({ text: '' })] }),
          createHeading('10.5 Entity Relationships', HeadingLevel.HEADING_2),
          createBulletPoint('User ↔ Employee: One-to-One'),
          createBulletPoint('Employee ↔ Attendance: One-to-Many'),
          createBulletPoint('Employee ↔ Leave: One-to-Many'),
          createBulletPoint('Employee ↔ Payroll: One-to-Many'),
          createBulletPoint('Employee ↔ Task: One-to-Many (assigned tasks)'),
          createBulletPoint('Project ↔ Task: One-to-Many'),
          createBulletPoint('Project ↔ ProjectMember: One-to-Many'),
          createBulletPoint('Lead ↔ Sale: One-to-One'),
          createBulletPoint('Employee ↔ Employee: Self-referential (reporting hierarchy)'),
          createBulletPoint('Department ↔ Designation: One-to-Many'),
          new Paragraph({ children: [new PageBreak()] }),

          // 11. Appendix
          createHeading('11. Appendix', HeadingLevel.HEADING_1),

          createHeading('11.1 Security Considerations', HeadingLevel.HEADING_2),
          createBulletPoint('All passwords hashed with bcryptjs (salt rounds: 10)'),
          createBulletPoint('JWT tokens stored in httpOnly, secure cookies'),
          createBulletPoint('CSRF protection via SameSite cookie attribute'),
          createBulletPoint('SQL injection prevention through Prisma ORM'),
          createBulletPoint('Role-based access control on all endpoints'),
          createBulletPoint('Audit logging for all sensitive operations'),
          createBulletPoint('IP address tracking for security monitoring'),

          createHeading('11.2 Deployment Requirements', HeadingLevel.HEADING_2),
          createBulletPoint('Node.js 18+ runtime'),
          createBulletPoint('PostgreSQL 14+ database'),
          createBulletPoint('Minimum 2GB RAM for application server'),
          createBulletPoint('SSL certificate for HTTPS'),
          createBulletPoint('Environment variables for configuration'),

          createHeading('11.3 Environment Variables', HeadingLevel.HEADING_2),
          createTable(
            ['Variable', 'Purpose'],
            [
              ['DATABASE_URL', 'PostgreSQL connection string'],
              ['JWT_SECRET', 'JWT signing secret'],
              ['OPENAI_API_KEY', 'OpenAI API authentication'],
              ['AZURE_DEVOPS_PAT', 'Azure DevOps Personal Access Token'],
              ['ASANA_ACCESS_TOKEN', 'Asana API token'],
              ['CONFLUENCE_API_TOKEN', 'Confluence API token'],
            ]
          ),

          createHeading('11.4 Support & Maintenance', HeadingLevel.HEADING_2),
          createParagraph('Post-deployment support includes:'),
          createBulletPoint('Bug fixes for 90 days after launch'),
          createBulletPoint('Security patches as needed'),
          createBulletPoint('Performance monitoring setup'),
          createBulletPoint('Documentation and training materials'),
          createBulletPoint('Knowledge transfer sessions'),

          new Paragraph({ children: [new TextRun({ text: '' })] }),
          new Paragraph({ children: [new TextRun({ text: '' })] }),
          new Paragraph({
            children: [
              new TextRun({
                text: '--- End of Document ---',
                italics: true,
                color: '64748b',
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(__dirname, '../docs/HRMS_Statement_of_Work.docx');
  fs.writeFileSync(outputPath, buffer);

  console.log('✅ SoW document generated successfully!');
  console.log(`📄 Document: ${outputPath}`);
  console.log(`🖼️  Data Flow Diagram: ${path.join(__dirname, '../docs/data-flow-diagram.png')}`);
  console.log(`🖼️  Architecture Diagram: ${path.join(__dirname, '../docs/software-architecture.png')}`);
}

// Ensure docs directory exists
const docsDir = path.join(__dirname, '../docs');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

generateSOW().catch(console.error);
