export function formatCurrency(
  amount: number,
  currencyCode: 'MXN' | 'USD' = 'MXN',
  locale: string = 'es-MX'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);
}

export function parseAmount(value: string): number {
  // Remove currency symbols and commas
  return parseFloat(value.replace(/[^\d.-]/g, ''));
}

export function calculateSubtotal(items: any[]): number {
  return items.reduce((total, item) => {
    const price = typeof item.precio_final === 'number' 
      ? item.precio_final 
      : parseFloat(item.precio_final || '0');
    
    const quantity = typeof item.cantidad === 'number' 
      ? item.cantidad 
      : parseFloat(item.cantidad || '0');
    
    const discount = typeof item.descuento === 'number' 
      ? item.descuento 
      : parseFloat(item.descuento || '0');
    
    return total + (quantity * (price - (price * discount)));
  }, 0);
}

export function calculateTotalWithIVA(
  subtotal: number,
  discount: number,
  shippingCost: number = 0,
  hasIVA: boolean = true
): number {
  const subtotalAfterDiscount = subtotal * (1 - discount);
  const iva = hasIVA ? subtotalAfterDiscount * 0.16 : 0;
  return subtotalAfterDiscount + iva + shippingCost;
}

export function convertToDollars(amountMXN: number, exchangeRate: number): number {
  return amountMXN / exchangeRate;
}