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

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function truncateText(text: string, maxLength: number = 30): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  return `${text.slice(0, maxLength)}...`;
}

export function calculateSubtotal(items: any[]): number {
  return items.reduce((total, item) => {
    const cantidad = Number(item.cantidad) || 0;
    const precioFinal = Number(item.precio_final) || 0;
    const descuento = Number(item.descuento) || 0;
    
    return total + (cantidad * precioFinal * (1 - descuento));
  }, 0);
}

export function calculateTotalWithIVA(subtotal: number, descuentoTotal: number, iva: number, envio: number = 0): number {
  const subtotalConDescuento = subtotal * (1 - descuentoTotal);
  const importeIVA = subtotalConDescuento * (iva - 1); // Si iva es 1.16, esto dará 0.16 del subtotal
  
  return subtotalConDescuento + importeIVA + envio;
}

export function convertToDollars(amountMXN: number, exchangeRate: number): number {
  if (!exchangeRate) return amountMXN;
  return amountMXN / exchangeRate;
}

export function parseNumber(value: string | number): number {
  if (typeof value === 'number') return value;
  
  // Remove currency symbols, commas and other non-numeric characters
  const cleanedValue = value.replace(/[^\d.-]/g, '');
  return parseFloat(cleanedValue) || 0;
}

export function joinColors(colors: string[]): string {
  if (!colors || !Array.isArray(colors)) return '';
  return colors.join(', ');
}

export function splitColors(colorsString: string): string[] {
  if (!colorsString) return [];
  return colorsString.split(',').map(color => color.trim()).filter(Boolean);
}

export function generateCotizacionId(currentId: number): string {
  // If current ID is less than 1690, use 1690 as base according to business rule
  const baseId = currentId < 1690 ? 1690 : currentId;
  return `CT${baseId}`;
}

export function generateFileName(cotizacionId: number, clientName: string): string {
  // If cotizacion_id is less than 1690, use 1690 as base according to business rule
  const baseId = cotizacionId < 1690 ? 1690 : cotizacionId;
  const formattedName = clientName.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-zA-Z0-9]/g, "_"); // Replace non-alphanumeric with underscore
  
  return `COT-${baseId}-${formattedName}.pdf`;
}

export function generateProductId(): number {
  // Generate a unique ID for temporary product entries
  return Math.floor(Math.random() * 1000000);
}