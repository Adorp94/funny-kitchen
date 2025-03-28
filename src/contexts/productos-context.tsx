"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Producto } from "@/components/cotizacion/producto-simplificado";
import { ProductoConDescuento } from "@/components/cotizacion/lista-productos-con-descuento";

interface ProductosContextType {
  productos: ProductoConDescuento[];
  addProducto: (producto: Producto) => void;
  removeProducto: (id: string) => void;
  updateProductoDiscount: (id: string, descuento: number) => void;
  clearProductos: () => void;
  subtotal: number;
  globalDiscount: number;
  setGlobalDiscount: (discount: number) => void;
  hasIva: boolean;
  setHasIva: (hasIva: boolean) => void;
  shippingCost: number;
  setShippingCost: (cost: number) => void;
  total: number;
  moneda: 'MXN' | 'USD';
  setMoneda: (moneda: 'MXN' | 'USD') => void;
}

const ProductosContext = createContext<ProductosContextType | undefined>(undefined);

export function ProductosProvider({ children }: { children: ReactNode }) {
  const [productos, setProductos] = useState<ProductoConDescuento[]>([]);
  const [moneda, setMoneda] = useState<'MXN' | 'USD'>('MXN');
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [hasIva, setHasIva] = useState<boolean>(false);
  const [shippingCost, setShippingCost] = useState<number>(0);

  // Load products and settings from sessionStorage on first mount
  useEffect(() => {
    const savedProductos = sessionStorage.getItem('cotizacion_productos');
    const savedMoneda = sessionStorage.getItem('cotizacion_moneda');
    const savedGlobalDiscount = sessionStorage.getItem('cotizacion_globalDiscount');
    const savedHasIva = sessionStorage.getItem('cotizacion_hasIva');
    const savedShippingCost = sessionStorage.getItem('cotizacion_shippingCost');
    
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
    
    if (savedGlobalDiscount) {
      setGlobalDiscount(parseFloat(savedGlobalDiscount));
    }
    
    if (savedHasIva) {
      setHasIva(savedHasIva === 'true');
    }
    
    if (savedShippingCost) {
      setShippingCost(parseFloat(savedShippingCost));
    }
  }, []);

  // Save products to sessionStorage when they change
  useEffect(() => {
    sessionStorage.setItem('cotizacion_productos', JSON.stringify(productos));
  }, [productos]);

  // Save settings to sessionStorage when they change
  useEffect(() => {
    sessionStorage.setItem('cotizacion_moneda', moneda);
    sessionStorage.setItem('cotizacion_globalDiscount', globalDiscount.toString());
    sessionStorage.setItem('cotizacion_hasIva', hasIva.toString());
    sessionStorage.setItem('cotizacion_shippingCost', shippingCost.toString());
  }, [moneda, globalDiscount, hasIva, shippingCost]);

  // Add a product
  const addProducto = (producto: Producto) => {
    // Convert to ProductoConDescuento
    const productoConDescuento: ProductoConDescuento = {
      ...producto,
      descuento: 0 // Initialize with zero discount
    };
    setProductos(prev => [...prev, productoConDescuento]);
  };

  // Remove a product by ID
  const removeProducto = (id: string) => {
    setProductos(prev => prev.filter(p => p.id !== id));
  };

  // Update a product's discount
  const updateProductoDiscount = (id: string, descuento: number) => {
    setProductos(prev => prev.map(p => {
      if (p.id === id) {
        // Calculate the new subtotal after discount
        const priceAfterDiscount = p.precio * (1 - descuento / 100);
        const newSubtotal = priceAfterDiscount * p.cantidad;
        
        return {
          ...p,
          descuento,
          subtotal: newSubtotal
        };
      }
      return p;
    }));
  };

  // Clear all products
  const clearProductos = () => {
    setProductos([]);
    sessionStorage.removeItem('cotizacion_productos');
  };

  // Calculate subtotal (sum of all products subtotals after their individual discounts)
  const subtotal = productos.reduce((sum, producto) => {
    const discount = producto.descuento || 0;
    const priceAfterDiscount = producto.precio * (1 - discount / 100);
    return sum + (priceAfterDiscount * producto.cantidad);
  }, 0);

  // Calculate final total
  const subtotalAfterGlobalDiscount = subtotal * (1 - globalDiscount / 100);
  const ivaAmount = hasIva ? subtotalAfterGlobalDiscount * 0.16 : 0;
  const total = subtotalAfterGlobalDiscount + ivaAmount + shippingCost;

  return (
    <ProductosContext.Provider
      value={{
        productos,
        addProducto,
        removeProducto,
        updateProductoDiscount,
        clearProductos,
        subtotal,
        globalDiscount,
        setGlobalDiscount,
        hasIva,
        setHasIva,
        shippingCost,
        setShippingCost,
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