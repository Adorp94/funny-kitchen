"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react";
import { Producto } from "@/components/cotizacion/producto-simplificado";
import { ProductoConDescuento } from "@/components/cotizacion/lista-productos-con-descuento";
import { useExchangeRate } from "@/hooks/useExchangeRate";

interface ProductosContextType {
  // Basic product management
  productos: ProductoConDescuento[];
  setProductos: (productos: ProductoConDescuento[]) => void;
  addProducto: (producto: Producto) => void;
  removeProducto: (id: string) => void;
  updateProductoDiscount: (id: string, descuento: number) => void;
  clearProductos: () => void;
  
  // Financial values in the selected currency
  subtotal: number;
  globalDiscount: number;
  ivaAmount: number;
  total: number;
  
  // Same values in MXN for consistency (if currency is USD)
  subtotalMXN: number;
  ivaAmountMXN: number;
  totalMXN: number;
  
  // Settings
  setGlobalDiscount: (discount: number) => void;
  hasIva: boolean;
  setHasIva: (hasIva: boolean) => void;
  shippingCost: number;
  setShippingCost: (cost: number) => void;
  moneda: 'MXN' | 'USD';
  setMoneda: (moneda: 'MXN' | 'USD') => void;
  exchangeRate: number | null;
  hasShipping: boolean;
  tipoCambio?: number | null;
}

const ProductosContext = createContext<ProductosContextType | undefined>(undefined);

export function ProductosProvider({ children }: { children: ReactNode }) {
  const [productos, setProductos] = useState<ProductoConDescuento[]>([]);
  const [moneda, setMoneda] = useState<'MXN' | 'USD'>('MXN');
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [hasIva, setHasIva] = useState<boolean>(false);
  const [shippingCost, setShippingCost] = useState<number>(0);
  
  // Use the exchange rate hook
  const { 
    exchangeRate, 
    loading: exchangeRateLoading, 
    error: exchangeRateError, 
    convertMXNtoUSD,
    convertUSDtoMXN
  } = useExchangeRate();

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

  // Calculate all financial values using useMemo to avoid circular dependencies
  const financialValues = useMemo(() => {
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

    // Calculate MXN equivalents if in USD
    let subtotalMXN = subtotal;
    let ivaAmountMXN = ivaAmount;
    let totalMXN = total;

    // No conversion needed for MXN values as we're already working in MXN
    
    return {
      subtotal,
      subtotalAfterGlobalDiscount,
      ivaAmount,
      total,
      subtotalMXN,
      ivaAmountMXN,
      totalMXN
    };
  }, [productos, globalDiscount, hasIva, shippingCost, moneda, exchangeRate]);

  // Log currency and exchange rate changes
  useEffect(() => {
    console.log('Currency changed in context:', moneda);
    console.log('Exchange rate in context:', exchangeRate);
    
    // Log current values in both currencies
    if (moneda === 'USD' && exchangeRate) {
      console.log('Current context values (USD):');
      console.log(`- Subtotal MXN: ${financialValues.subtotal}, Display USD: ${financialValues.subtotal / exchangeRate}`);
      console.log(`- Total MXN: ${financialValues.total}, Display USD: ${financialValues.total / exchangeRate}`);
    } else {
      console.log('Current context values (MXN):');
      console.log(`- Subtotal: ${financialValues.subtotal}`);
      console.log(`- Total: ${financialValues.total}`);
    }
  }, [moneda, exchangeRate, financialValues]);

  return (
    <ProductosContext.Provider
      value={{
        productos,
        setProductos,
        addProducto,
        removeProducto,
        updateProductoDiscount,
        clearProductos,
        subtotal: financialValues.subtotal,
        globalDiscount,
        setGlobalDiscount,
        hasIva,
        setHasIva,
        shippingCost,
        setShippingCost,
        total: financialValues.total,
        moneda,
        setMoneda,
        exchangeRate,
        ivaAmount: financialValues.ivaAmount,
        hasShipping: shippingCost > 0,
        tipoCambio: exchangeRate,
        // Add the MXN equivalents
        subtotalMXN: financialValues.subtotalMXN,
        ivaAmountMXN: financialValues.ivaAmountMXN,
        totalMXN: financialValues.totalMXN
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