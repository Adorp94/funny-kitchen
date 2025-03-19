"use client";

import { useState } from 'react';
import { ShoppingCart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/cart-context';
import { formatCurrency } from '@/lib/utils';

export function FloatingCart() {
  const [isOpen, setIsOpen] = useState(false);
  const { items, removeItem, currency, exchangeRate } = useCart();
  
  const totalItems = items.length;
  
  if (totalItems === 0) {
    return null;
  }
  
  const getDisplayPrice = (price: number) => {
    return currency === "USD" ? price / exchangeRate : price;
  };
  
  const calculateSubtotal = (price: number, quantity: number, discount: number) => {
    return price * quantity * (1 - discount);
  };
  
  const totalAmount = items.reduce((sum, item) => 
    sum + calculateSubtotal(item.precio_final, item.cantidad, item.descuento), 0
  );

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden mb-2">
          <div className="flex items-center justify-between bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">Carrito ({totalItems})</h3>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="max-h-80 overflow-y-auto p-4">
            {items.length > 0 ? (
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.nombre}</p>
                      <div className="flex gap-2 text-xs text-gray-500 mt-1">
                        <span>{item.cantidad}x</span>
                        <span>{formatCurrency(getDisplayPrice(item.precio_final), currency)}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => removeItem(item.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-gray-500 py-4">No hay productos</p>
            )}
          </div>
          
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Total:</span>
              <span className="text-sm font-bold">
                {formatCurrency(getDisplayPrice(totalAmount), currency)}
              </span>
            </div>
            <Button 
              className="w-full"
              onClick={() => {
                // Navigate to cart or checkout
                window.location.href = '/nueva-cotizacion';
              }}
            >
              Ver Cotización
            </Button>
          </div>
        </div>
      )}
      
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full h-14 w-14 shadow-lg bg-primary hover:bg-primary-600 text-white relative"
      >
        <ShoppingCart className="h-6 w-6" />
        {totalItems > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {totalItems}
          </span>
        )}
      </Button>
    </div>
  );
} 