"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from "react";
import { Producto } from "@/components/cotizacion/producto-simplificado";
import { ProductoConDescuento } from "@/components/cotizacion/lista-productos-con-descuento";
import { useExchangeRate } from "@/hooks/useExchangeRate";

// --- Type definitions ---
// Add internal price/cost fields to ProductoConDescuento
interface ProductoEnContext extends ProductoConDescuento {
  precioMXN: number;
  subtotalMXN: number;
}

interface FinancialValues {
  // Values in the selected display currency (moneda)
  displaySubtotal: number;
  displaySubtotalAfterGlobalDiscount: number;
  displayIvaAmount: number;
  displayShippingCost: number;
  displayTotal: number;
  // Values always in MXN
  baseSubtotalMXN: number; // Before global discount
  subtotalAfterGlobalDiscountMXN: number;
  ivaAmountMXN: number;
  shippingCostMXN: number;
  totalMXN: number;
}

interface ProductosContextType {
  productos: ProductoEnContext[]; // Use extended type
  setProductos: (productos: ProductoEnContext[]) => void; // Use extended type
  addProducto: (producto: Producto, precioEnMonedaActual: number) => void; // Needs price in current currency
  removeProducto: (id: string) => void;
  updateProductoDiscount: (id: string, descuento: number) => void;
  clearProductos: () => void;

  // Financials (Expose both display and MXN)
  financials: FinancialValues;

  // Settings
  globalDiscount: number;
  setGlobalDiscount: (discount: number) => void;
  hasIva: boolean;
  setHasIva: (hasIva: boolean) => void;
  // setShippingCost now accepts cost in the current display currency
  shippingCost: number; // This will represent cost in the *selected* moneda
  setShippingCost: (cost: number) => void;
  moneda: 'MXN' | 'USD';
  setMoneda: (moneda: 'MXN' | 'USD') => void;
  exchangeRate: number | null;
  // Add conversion functions to the context type
  convertMXNtoUSD: (amountMXN: number) => number;
  convertUSDtoMXN: (amountUSD: number) => number;
}

const ProductosContext = createContext<ProductosContextType | undefined>(undefined);

export function ProductosProvider({ children }: { children: ReactNode }) {
  // Internal state stores MXN values
  const [productos, setProductos] = useState<ProductoEnContext[]>([]);
  const [internalShippingCostMXN, setInternalShippingCostMXN] = useState<number>(0);
  // Display state (mirrors what the user inputs/sees)
  const [displayShippingCost, setDisplayShippingCost] = useState<number>(0);

  const [moneda, setMoneda] = useState<'MXN' | 'USD'>('MXN');
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [hasIva, setHasIva] = useState<boolean>(false);

  const { exchangeRate } = useExchangeRate();

  // Define conversion functions based on the hook's rate, expose via context
  const convertMXNtoUSD = useCallback((amountMXN: number): number => {
    if (!exchangeRate) return amountMXN; // Or throw error / return NaN?
    // Use Number() and toFixed(2) for consistency
    return Number((amountMXN / exchangeRate).toFixed(2)); 
  }, [exchangeRate]);

  const convertUSDtoMXN = useCallback((amountUSD: number): number => {
    if (!exchangeRate) return amountUSD;
    return Number((amountUSD * exchangeRate).toFixed(2));
  }, [exchangeRate]);

  // --- Load/Save Logic (Simplified - Needs review based on Edit Page loading) ---
  // This loading logic might need adjustment now that internal state is MXN
  useEffect(() => {
    // ... (Keep sessionStorage loading for now, but be aware it might load display values)
    // Ideally, load MXN values if stored, or convert loaded display values based on saved moneda
  }, []);

  useEffect(() => {
    // ... (Keep sessionStorage saving for now) ...
  }, [productos, moneda, globalDiscount, hasIva, displayShippingCost]); // Save displayShippingCost

  // --- Effect to recalculate display prices/subtotals when currency changes ---
  useEffect(() => {
    // Only run if exchangeRate is available when switching TO USD
    if (moneda === 'USD' && !exchangeRate) {
      console.warn("Cannot recalculate USD display values without exchange rate.");
      return;
    }

    console.log(`Currency/Rate changed (${moneda}, ${exchangeRate}). Recalculating display values for products.`);

    setProductos(currentProductos =>
      currentProductos.map(p => {
        let newDisplayPrice: number;
        let newDisplaySubtotal: number;

        if (moneda === 'USD' && exchangeRate) {
          // --- DEBUG LOG --- 
          console.log(`Context Currency Change Effect: Converting product ${p.id} (${p.nombre})`);
          console.log(`  - precioMXN: ${p.precioMXN}`);
          console.log(`  - exchangeRate: ${exchangeRate}`);
          newDisplayPrice = p.precioMXN / exchangeRate;
          console.log(`  - Calculated newDisplayPrice (USD): ${newDisplayPrice}`);
          // --- END DEBUG LOG ---
        } else { // MXN
          newDisplayPrice = p.precioMXN;
        }
        // Recalculate display subtotal based on new display price and existing discount/quantity
        newDisplaySubtotal = newDisplayPrice * p.cantidad * (1 - (p.descuento || 0) / 100);

        // Return updated product, keeping internal MXN values
        return {
          ...p,
          precio: newDisplayPrice,
          subtotal: newDisplaySubtotal,
        };
      })
    );
  // Important: Run ONLY when moneda or exchangeRate changes. Avoid dependency on 'productos' itself.
  }, [moneda, exchangeRate]);

  // --- Core Logic --- 

  // Add a product - REQUIRES price in the CURRENTLY SELECTED MONEDA
  const addProducto = useCallback((producto: Producto, precioEnMonedaActual: number) => {
    console.log(`[ProductosContext] addProducto called. Moneda: ${moneda}, Rate: ${exchangeRate}`);
    console.log(`[ProductosContext]   - Received producto: ${JSON.stringify(producto)}`);
    console.log(`[ProductosContext]   - Received precioEnMonedaActual: ${precioEnMonedaActual}`);

    let precioMXN: number;
    if (moneda === 'USD' && exchangeRate) {
      precioMXN = precioEnMonedaActual * exchangeRate;
      console.log(`[ProductosContext]   - Calculated precioMXN (USD path): ${precioEnMonedaActual} * ${exchangeRate} = ${precioMXN}`);
    } else {
      precioMXN = precioEnMonedaActual; // Assume MXN if not USD or no rate
      console.log(`[ProductosContext]   - Calculated precioMXN (MXN path): ${precioMXN}`);
    }

    // Calculate initial subtotals (discount is 0)
    const subtotalMXN = precioMXN * producto.cantidad;
    const subtotalDisplay = precioEnMonedaActual * producto.cantidad; // Subtotal in the currency it was added
    console.log(`[ProductosContext]   - Calculated subtotalMXN: ${subtotalMXN}`);
    console.log(`[ProductosContext]   - Calculated subtotalDisplay: ${subtotalDisplay}`);

    const productoParaContexto: ProductoEnContext = {
      ...producto,
      descuento: 0,
      precio: precioEnMonedaActual, // Price in the currency it was added
      precioMXN: precioMXN,
      subtotal: subtotalDisplay, // Subtotal in the currency it was added
      subtotalMXN: subtotalMXN,
    };
    setProductos(prev => [...prev, productoParaContexto]);
  }, [moneda, exchangeRate]);

  // Update product discount - recalculates based on internal precioMXN
  const updateProductoDiscount = useCallback((id: string, descuento: number) => {
    setProductos(prev => prev.map(p => {
      if (p.id === id) {
        // Recalculate internal MXN subtotal
        const nuevoSubtotalMXN = p.precioMXN * p.cantidad * (1 - descuento / 100);

        // Recalculate display price & subtotal based on CURRENT moneda
        let currentDisplayPrice: number;
        if (moneda === 'USD' && exchangeRate) {
          currentDisplayPrice = p.precioMXN / exchangeRate;
        } else { // MXN
          currentDisplayPrice = p.precioMXN;
        }
        const nuevoSubtotalDisplay = currentDisplayPrice * p.cantidad * (1 - descuento / 100);

        return {
          ...p,
          descuento,
          precio: currentDisplayPrice, // Update display price reflecting current moneda (important!) 
          subtotal: nuevoSubtotalDisplay, // Update display subtotal for current moneda
          subtotalMXN: nuevoSubtotalMXN,
        };
      }
      return p;
    }));
  }, [moneda, exchangeRate]);

  // Set Shipping Cost - Accepts cost in CURRENT display currency, converts to internal MXN store
  const handleSetShippingCost = useCallback((costEnMonedaActual: number) => {
    setDisplayShippingCost(costEnMonedaActual); // Store the value user sees/enters
    let costMXN: number;
    if (moneda === 'USD' && exchangeRate) {
      costMXN = costEnMonedaActual * exchangeRate;
    } else {
      costMXN = costEnMonedaActual;
    }
    console.log(`Setting internalShippingCostMXN: ${costEnMonedaActual} ${moneda} -> ${costMXN} MXN`);
    setInternalShippingCostMXN(costMXN);
  }, [moneda, exchangeRate]);

  // Other handlers (memoized)
  const handleSetGlobalDiscount = useCallback((value: number) => setGlobalDiscount(value), []);
  const removeProducto = useCallback((id: string) => setProductos(prev => prev.filter(p => p.id !== id)), []);
  const clearProductos = useCallback(() => {
      setProductos([]);
      sessionStorage.removeItem('cotizacion_productos');
  }, []);
  const handleSetMoneda = useCallback((m: 'MXN' | 'USD') => setMoneda(m), []);
  const handleSetHasIva = useCallback((iva: boolean) => setHasIva(iva), []);
  const handleSetProductos = useCallback((prods: ProductoEnContext[]) => setProductos(prods), []);

  // --- Financial Calculations (Based on internal MXN) ---
  const financials = useMemo((): FinancialValues => {
    const baseSubtotalMXN = productos.reduce((sum, p) => {
      // Subtotal before global discount, after individual discount
      const priceAfterDiscountMXN = p.precioMXN * (1 - (p.descuento || 0) / 100);
      return sum + (priceAfterDiscountMXN * p.cantidad);
    }, 0);

    const subtotalAfterGlobalDiscountMXN = baseSubtotalMXN * (1 - globalDiscount / 100);
    const ivaAmountMXN = hasIva ? subtotalAfterGlobalDiscountMXN * 0.16 : 0;
    const shippingCostMXN = internalShippingCostMXN; // Use internal MXN value
    const totalMXN = subtotalAfterGlobalDiscountMXN + ivaAmountMXN + shippingCostMXN;

    // Calculate display values by converting FROM MXN if needed
    let displaySubtotal = baseSubtotalMXN;
    let displaySubtotalAfterGlobalDiscount = subtotalAfterGlobalDiscountMXN;
    let displayIvaAmount = ivaAmountMXN;
    let displayShippingCostValue = shippingCostMXN;
    let displayTotal = totalMXN;

    if (moneda === 'USD' && exchangeRate) {
      // --- DEBUG LOG --- 
      console.log("Context Financials Calculation: Converting totals to USD");
      console.log(`  - baseSubtotalMXN: ${baseSubtotalMXN}`);
      console.log(`  - shippingCostMXN: ${shippingCostMXN}`);
      console.log(`  - ivaAmountMXN: ${ivaAmountMXN}`);
      console.log(`  - totalMXN: ${totalMXN}`);
      console.log(`  - exchangeRate: ${exchangeRate}`);
      // --- END DEBUG LOG ---

      displaySubtotal = baseSubtotalMXN / exchangeRate;
      displaySubtotalAfterGlobalDiscount = subtotalAfterGlobalDiscountMXN / exchangeRate;
      displayIvaAmount = ivaAmountMXN / exchangeRate;
      displayShippingCostValue = shippingCostMXN / exchangeRate;
      displayTotal = totalMXN / exchangeRate;
    }

    return {
      displaySubtotal,
      displaySubtotalAfterGlobalDiscount,
      displayIvaAmount,
      displayShippingCost: displayShippingCostValue,
      displayTotal,
      baseSubtotalMXN,
      subtotalAfterGlobalDiscountMXN,
      ivaAmountMXN,
      shippingCostMXN,
      totalMXN,
    };
  }, [productos, globalDiscount, hasIva, internalShippingCostMXN, moneda, exchangeRate]);

  // --- Context Value (Memoized) ---
  const contextValue = useMemo(() => ({
    productos,
    setProductos: handleSetProductos, // Use memoized setter
    addProducto,
    removeProducto,
    updateProductoDiscount,
    clearProductos,
    financials, // Provide the whole financials object
    globalDiscount,
    setGlobalDiscount: handleSetGlobalDiscount,
    hasIva,
    setHasIva: handleSetHasIva, // Use memoized setter
    shippingCost: displayShippingCost, // Expose the display value user set
    setShippingCost: handleSetShippingCost, // Expose setter that handles conversion
    moneda,
    setMoneda: handleSetMoneda, // Use memoized setter
    exchangeRate,
    // Expose conversion functions
    convertMXNtoUSD,
    convertUSDtoMXN,
    // Deprecate older direct values if possible, use financials object
    // subtotal: financials.displaySubtotal, 
    // total: financials.displayTotal,
    // ivaAmount: financials.displayIvaAmount,
    // hasShipping: financials.shippingCostMXN > 0, // Base on MXN value
    // tipoCambio: exchangeRate,
    // subtotalMXN: financials.baseSubtotalMXN,
    // ivaAmountMXN: financials.ivaAmountMXN,
    // totalMXN: financials.totalMXN
  }), [
    productos, handleSetProductos, addProducto, removeProducto, updateProductoDiscount, clearProductos,
    financials, globalDiscount, handleSetGlobalDiscount, hasIva, handleSetHasIva,
    displayShippingCost, handleSetShippingCost, moneda, handleSetMoneda, exchangeRate,
    convertMXNtoUSD, convertUSDtoMXN
  ]);

  return (
    <ProductosContext.Provider value={contextValue}>
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