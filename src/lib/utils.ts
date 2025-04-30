import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export currency utils
export { formatCurrency, parseAmount, calculateSubtotal, calculateTotalWithIVA, convertToDollars } from './utils/currency';

// Re-export date utils
export { formatDate } from './utils/date';
