import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';

export function formatDate(date: Date | string, formatString: string = 'dd/MM/yyyy'): string {
  const parsedDate = typeof date === 'string' ? new Date(date) : date;
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