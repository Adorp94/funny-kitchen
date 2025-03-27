"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Producto } from "@/components/cotizacion/producto-simplificado";

interface ProductosContextType {
  productos: Producto[];
  addProducto: (producto: Producto) => void;
  removeProducto: (id: string) => void;
  clearProductos: () => void;
  total: number;
  moneda: 'MXN' | 'USD';
  setMoneda: (moneda: 'MXN' | 'USD') => void;
}

const ProductosContext = createContext<ProductosContextType | undefined>(undefined);

export function ProductosProvider({ children }: { children: ReactNode }) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [moneda, setMoneda] = useState<'MXN' | 'USD'>('MXN');

  // Load products from sessionStorage on first mount
  useEffect(() => {
    const savedProductos = sessionStorage.getItem('cotizacion_productos');
    const savedMoneda = sessionStorage.getItem('cotizacion_moneda');
    
    if (savedProductos) {
      try {
        const parsedProductos = JSON.parse(savedProductos);
        setProductos(parsedProductos);
      } catch (e) {
        console.error('Error parsing saved productos:', e);
      }
    }
    
    if (savedMoneda) {
      setMoneda(savedMoneda as 'MXN' | 'USD');
    }
  }, []);

  // Save products to sessionStorage when they change
  useEffect(() => {
    sessionStorage.setItem('cotizacion_productos', JSON.stringify(productos));
  }, [productos]);

  // Save currency to sessionStorage when it changes
  useEffect(() => {
    sessionStorage.setItem('cotizacion_moneda', moneda);
  }, [moneda]);

  // Add a product
  const addProducto = (producto: Producto) => {
    setProductos(prev => [...prev, producto]);
  };

  // Remove a product by ID
  const removeProducto = (id: string) => {
    setProductos(prev => prev.filter(p => p.id !== id));
  };

  // Clear all products
  const clearProductos = () => {
    setProductos([]);
    sessionStorage.removeItem('cotizacion_productos');
  };

  // Calculate total
  const total = productos.reduce((sum, producto) => sum + producto.subtotal, 0);

  return (
    <ProductosContext.Provider
      value={{
        productos,
        addProducto,
        removeProducto,
        clearProductos,
        total,
        moneda,
        setMoneda
      }}
    >
      {children}
    </ProductosContext.Provider>
  );
}

export function useProductos() {
  const context = useContext(ProductosContext);
  if (context === undefined) {
    throw new Error('useProductos must be used within a ProductosProvider');
  }
  return context;
} 