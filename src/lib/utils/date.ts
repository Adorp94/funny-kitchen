import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';

export function formatDate(date: Date | string | null | undefined, formatString: string = 'dd MMM yyyy'): string {
  if (!date) return '-'; // Handle null/undefined input
  
  let parsedDate: Date;
  if (typeof date === 'string') {
    // Extract the date part (YYYY-MM-DD) from the string, regardless of time/timezone info
    const datePartMatch = date.match(/^(\d{4}-\d{2}-\d{2})/);
    if (datePartMatch) {
      // Parse the date part as local time by appending T00:00:00
      parsedDate = new Date(datePartMatch[1] + 'T00:00:00');
    } else {
      // Fallback for strings not starting with YYYY-MM-DD (might be less reliable)
      parsedDate = new Date(date);
    }
  } else {
    parsedDate = date;
  }

  // Check if the parsed date is valid
  if (isNaN(parsedDate.getTime())) {
    console.warn("Invalid date received in formatDate:", date);
    return 'Fecha inválida';
  }

  return format(parsedDate, formatString, { locale: es });
}

export function parseDate(dateString: string, formatString: string = 'dd/MM/yyyy'): Date {
  return parse(dateString, formatString, new Date());
}

export function getCurrentDate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function getISODate(date: Date | string): string {
  const parsedDate = typeof date === 'string' ? new Date(date) : date;
  return parsedDate.toISOString().split('T')[0];
}