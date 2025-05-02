import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export currency utils
export { formatCurrency, parseAmount, calculateSubtotal, calculateTotalWithIVA, convertToDollars } from './utils/currency';

// Re-export date utils
export { formatDate } from './utils/date';

// Helper function to convert array of objects to CSV string
export function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) {
    return "";
  }

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','), // Header row
    ...data.map(row => {
      return headers.map(header => {
        const value = row[header];
        // Handle null/undefined and values containing commas or quotes
        let escapedValue = value === null || value === undefined ? '' : String(value);
        if (escapedValue.includes(',') || escapedValue.includes('\"') || escapedValue.includes('\n')) {
          escapedValue = `"${escapedValue.replace(/"/g, '""')}"`; // Escape quotes by doubling them
        }
        return escapedValue;
      }).join(',');
    })
  ];

  return csvRows.join('\n');
}

// Re-export misc utils if any
// export * from './utils/misc';
