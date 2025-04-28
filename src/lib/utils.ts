import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string, currency: "MXN" | "USD" = 'MXN'): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return 'Fecha no disponible';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is invalid
    if (isNaN(dateObj.getTime())) {
      return 'Fecha inválida';
    }
    
    return dateObj.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Error en formato de fecha';
  }
}

export function generateCotizacionId(id: number): string {
  return `COT-${new Date().getFullYear()}-${String(id).padStart(4, '0')}`;
}

/**
 * Generate a gradient background style for financial cards
 * @param type The type of financial card (ingreso, egreso, balance, neutral)
 * @param isHovered Whether the card is being hovered over
 * @returns A CSS class string with the appropriate gradient
 */
export function getFinancialCardGradient(type: 'ingreso' | 'egreso' | 'balance-positive' | 'balance-negative' | 'neutral', isHovered: boolean = false): string {
  const baseClasses = "transition-all duration-200 bg-linear-to-br border";
  
  const gradients = {
    'ingreso': `${baseClasses} from-white to-emerald-50 border-emerald-100 ${isHovered ? 'to-emerald-100 shadow-md' : 'shadow-xs'}`,
    'egreso': `${baseClasses} from-white to-rose-50 border-rose-100 ${isHovered ? 'to-rose-100 shadow-md' : 'shadow-xs'}`,
    'balance-positive': `${baseClasses} from-white to-blue-50 border-blue-100 ${isHovered ? 'to-blue-100 shadow-md' : 'shadow-xs'}`,
    'balance-negative': `${baseClasses} from-white to-amber-50 border-amber-100 ${isHovered ? 'to-amber-100 shadow-md' : 'shadow-xs'}`,
    'neutral': `${baseClasses} from-white to-indigo-50 border-indigo-100 ${isHovered ? 'to-indigo-100 shadow-md' : 'shadow-xs'}`,
  };
  
  return gradients[type];
}