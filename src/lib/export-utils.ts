/**
 * Export utilities for CSV and PDF generation
 */

/**
 * Export data to CSV file
 * @param data - Array of objects to export
 * @param filename - Name for the downloaded file (without extension)
 * @param columns - Optional column configuration for headers and formatting
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; header: string; format?: (value: any) => string }[]
): void {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  let headers: string[];
  let rows: string[];

  if (columns) {
    // Use custom column configuration
    headers = columns.map(col => col.header);
    rows = data.map(row =>
      columns
        .map(col => {
          const value = row[col.key];
          const formatted = col.format ? col.format(value) : value;
          // Escape quotes and wrap in quotes if contains comma or newline
          const str = String(formatted ?? '');
          if (str.includes(',') || str.includes('\n') || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    );
  } else {
    // Auto-generate from object keys
    headers = Object.keys(data[0]);
    rows = data.map(row =>
      headers
        .map(header => {
          const value = row[header];
          const str = String(value ?? '');
          if (str.includes(',') || str.includes('\n') || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    );
  }

  const csv = [headers.join(','), ...rows].join('\n');

  // Create and download file
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export the current page content as PDF using browser print
 * @param title - Title to show in print header
 */
export function exportToPDF(title?: string): void {
  // Store original title
  const originalTitle = document.title;

  // Set print title if provided
  if (title) {
    document.title = title;
  }

  // Trigger print dialog (user can save as PDF)
  window.print();

  // Restore original title
  if (title) {
    document.title = originalTitle;
  }
}

/**
 * Format hours to HH:MM string
 */
export function formatHoursForExport(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

/**
 * Export time analytics data to CSV
 */
export function exportTimeAnalyticsToCSV(
  employeeDetails: {
    employeeId: string;
    employeeName: string;
    department: string;
    designation: string;
    totalWorkHours: number;
    totalBreakHours: number;
    totalIdleHours: number;
    daysPresent: number;
    avgDailyHours: number;
  }[],
  dateRange: { start: string; end: string }
): void {
  const columns = [
    { key: 'employeeId' as const, header: 'Employee ID' },
    { key: 'employeeName' as const, header: 'Name' },
    { key: 'department' as const, header: 'Department' },
    { key: 'designation' as const, header: 'Designation' },
    {
      key: 'totalWorkHours' as const,
      header: 'Work Hours',
      format: (v: number) => formatHoursForExport(v),
    },
    {
      key: 'totalBreakHours' as const,
      header: 'Break Hours',
      format: (v: number) => formatHoursForExport(v),
    },
    {
      key: 'totalIdleHours' as const,
      header: 'Idle Hours',
      format: (v: number) => formatHoursForExport(v),
    },
    { key: 'daysPresent' as const, header: 'Days Present' },
    {
      key: 'avgDailyHours' as const,
      header: 'Avg Daily Hours',
      format: (v: number) => formatHoursForExport(v),
    },
  ];

  exportToCSV(employeeDetails, `time-analytics-${dateRange.start}-to-${dateRange.end}`, columns);
}
