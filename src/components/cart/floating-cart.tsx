"use client";

import { useState } from "react";
import { ShoppingCart, X, Minus, Plus, ChevronUp, ChevronDown } from "lucide-react";
import { useCart } from "@/contexts/cart-context";
import { formatCurrency } from "@/lib/utils";

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
    return (
      <button 
        className="fixed bottom-4 right-4 rounded-full bg-teal-500 text-white p-3 shadow-lg hover:bg-teal-600 transition-all"
        onClick={() => setIsOpen(true)}
      >
        <ShoppingCart className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${isOpen ? 'w-96' : 'w-auto'}`}>
      {isOpen ? (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-teal-500 text-white p-3 flex justify-between items-center">
            <div className="flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2" />
              <h3 className="font-semibold">Carrito ({totalItems})</h3>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-teal-600 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Cart items */}
          <div className="max-h-96 overflow-y-auto p-3 divide-y divide-gray-100">
            {cartItems.length === 0 ? (
              <p className="text-gray-500 text-center py-4">El carrito está vacío</p>
            ) : (
              cartItems.map((item) => (
                <div key={item.id} className="py-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{item.nombre}</p>
                      <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                      {item.colores && (
                        <p className="text-sm text-gray-500">Colores: {item.colores}</p>
                      )}
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="mt-2 flex justify-between items-center">
                    <div className="flex items-center border rounded">
                      <button 
                        onClick={() => updateQuantity(item.id, Math.max(1, item.cantidad - 1))}
                        className="px-2 py-1 text-gray-500 hover:bg-gray-100"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="px-2 py-1 min-w-[40px] text-center">{item.cantidad}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.cantidad + 1)}
                        className="px-2 py-1 text-gray-500 hover:bg-gray-100"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500 mr-2">Descuento:</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.descuento}
                          onChange={(e) => updateDiscount(item.id, Number(e.target.value))}
                          className="w-12 text-sm border rounded px-1 py-0.5"
                        />
                        <span className="text-sm text-gray-500 ml-1">%</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">{formatCurrency(getDisplayPrice(item.subtotal), currency)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Footer */}
          <div className="border-t border-gray-200 p-3 bg-gray-50">
            <div className="flex justify-between items-center font-semibold">
              <span>Subtotal:</span>
              <span>{formatCurrency(getDisplayPrice(subtotal), currency)}</span>
            </div>
          </div>
        </div>
      ) : (
        <button 
          className="flex items-center space-x-2 rounded-full bg-teal-500 text-white p-3 pr-4 shadow-lg hover:bg-teal-600 transition-all"
          onClick={() => setIsOpen(true)}
        >
          <ShoppingCart className="h-5 w-5" />
          <span className="font-semibold">{totalItems}</span>
        </button>
      )}
    </div>
  );
} 