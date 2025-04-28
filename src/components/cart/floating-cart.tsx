"use client";

import { useState } from "react";
import { ShoppingCart, X, Minus, Plus, ArrowRight } from "lucide-react";
import { useCart } from "@/contexts/cart-context";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function FloatingCart() {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    cartItems, 
    removeFromCart, 
    updateQuantity, 
    updateDiscount,
    totalItems,
    subtotal,
    currency,
    exchangeRate
  } = useCart();

  const getDisplayPrice = (price: number) => {
    return currency === "USD" ? price / exchangeRate : price;
  };

  if (totalItems === 0) {
    return null; // Don't show cart button when empty
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${isOpen ? 'w-[380px]' : 'w-auto'}`}>
      {isOpen ? (
        <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100">
          {/* Header */}
          <div className="py-4 px-5 flex justify-between items-center border-b border-gray-100">
            <div className="flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2 text-teal-600" />
              <h3 className="font-medium text-gray-800">Carrito ({totalItems})</h3>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Cart items */}
          <div className="max-h-[calc(100vh-300px)] overflow-y-auto px-5 py-3 divide-y divide-gray-100">
            {cartItems.length === 0 ? (
              <p className="text-gray-500 text-center py-8">El carrito está vacío</p>
            ) : (
              cartItems.map((item) => (
                <div key={item.id} className="py-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 pr-4">
                      <p className="font-medium text-gray-800">{item.nombre}</p>
                      <div className="flex flex-wrap items-center text-xs text-gray-500 mt-1">
                        <span className="mr-2">SKU: {item.sku}</span>
                        {item.colores && <span>Colores: {item.colores}</span>}
                      </div>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-gray-50 transition-colors"
                      aria-label="Remove item"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-center mt-3">
                    <div className="flex h-8 border border-gray-200 rounded-md overflow-hidden">
                      <button 
                        onClick={() => updateQuantity(item.id, Math.max(1, item.cantidad - 1))}
                        className="w-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                        disabled={item.cantidad <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <div className="w-10 flex items-center justify-center text-sm font-medium border-l border-r border-gray-200">
                        {item.cantidad}
                      </div>
                      <button 
                        onClick={() => updateQuantity(item.id, item.cantidad + 1)}
                        className="w-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="mr-3">
                        <div className="flex items-center">
                          <span className="text-xs text-gray-500 mr-1">Desc:</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.descuento}
                            onChange={(e) => updateDiscount(item.id, Number(e.target.value))}
                            className="w-10 h-6 text-xs border border-gray-200 rounded-sm px-1 text-center"
                            aria-label="Discount percentage"
                          />
                          <span className="text-xs text-gray-500 ml-1">%</span>
                        </div>
                      </div>
                      <div className="text-right w-20 font-medium">
                        {formatCurrency(getDisplayPrice(item.subtotal), currency)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Footer */}
          <div className="border-t border-gray-100 p-5">
            <div className="flex justify-between items-center font-medium text-gray-800 mb-4">
              <span>Subtotal</span>
              <span>{formatCurrency(getDisplayPrice(subtotal), currency)}</span>
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 h-10 border-gray-200 text-gray-600"
                onClick={() => setIsOpen(false)}
              >
                Seguir comprando
              </Button>
              <Link href="/nueva-cotizacion" className="flex-1">
                <Button 
                  size="sm" 
                  className="w-full h-10 bg-teal-500 hover:bg-teal-600 text-white"
                >
                  Cotizar <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <button 
          className="flex items-center space-x-2 rounded-full bg-white text-gray-800 p-3 pl-4 pr-4 shadow-lg hover:bg-gray-50 transition-all border border-gray-100 group"
          onClick={() => setIsOpen(true)}
        >
          <div className="relative">
            <ShoppingCart className="h-5 w-5 text-gray-600 group-hover:text-teal-600 transition-colors" />
            <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-teal-500 text-xs text-white flex items-center justify-center font-semibold">{totalItems}</span>
          </div>
          <span className="font-medium">{formatCurrency(getDisplayPrice(subtotal), currency)}</span>
        </button>
      )}
    </div>
  );
} 