"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from "react";
import { Producto as ProductoBase } from "@/components/cotizacion/producto-simplificado";
import { ProductoConDescuento as ProductoDisplay } from "@/components/cotizacion/lista-productos-con-descuento";
import { useExchangeRate } from "@/hooks/useExchangeRate";

// --- NEW: Internal product state type storing base MXN values ---
interface ProductoEnContext extends ProductoBase {
  id: string; // Ensure id is always present and string
  cantidad: number;
  precioMXN: number; // Base price in MXN
  subtotalMXN: number; // Base subtotal in MXN
  descuento: number;
  // Add other potential fields from base/display types if needed
  sku?: string;
  descripcion?: string;
  colores?: string[];
  acabado?: string;
  producto_id?: number | null;
}
// --- END NEW ---

// Interface for the values exposed by the context
interface ProductosContextType {
  productos: ProductoDisplay[]; // Display products with calculated prices
  setProductos: (productos: ProductoDisplay[]) => void; // Might need adjustment if direct setting is complex
  addProducto: (producto: ProductoBase) => void; // Input expects base product structure
  removeProducto: (id: string) => void;
  updateProductoDiscount: (id: string, descuento: number) => void;
  clearProductos: () => void;

  // Financial values in the selected display currency
  financials: {
    displaySubtotal: number;       // Subtotal in selected currency
    displayShippingCost: number;   // Shipping cost in selected currency
    displayIvaAmount: number;      // IVA in selected currency
    displayTotal: number;          // Total in selected currency
    baseSubtotalMXN: number;       // Subtotal before global discount, in MXN
    subtotalAfterDiscountMXN: number; // Subtotal after global discount, in MXN
    shippingCostMXN: number;       // Shipping cost in MXN
    ivaAmountMXN: number;          // IVA amount in MXN
    totalMXN: number;              // Final total in MXN
  };

  // Settings
  globalDiscount: number;
  setGlobalDiscount: (discount: number) => void;
  hasIva: boolean;
  setHasIva: (hasIva: boolean) => void;
  shippingCost: number; // This is now assumed to be entered in the SELECTED currency
  setShippingCost: (cost: number) => void;
  moneda: 'MXN' | 'USD';
  setMoneda: (moneda: 'MXN' | 'USD') => void;
  exchangeRate: number | null;
  tipoCambio?: number | null; // Alias for exchangeRate

  // Add conversion functions for convenience
  convertMXNtoUSD: (amount: number) => number;
  convertUSDtoMXN: (amount: number) => number;
}

const ProductosContext = createContext<ProductosContextType | undefined>(undefined);

export function ProductosProvider({ children }: { children: ReactNode }) {
  // --- STATE: Use internal product type ---
  const [internalProductos, setInternalProductos] = useState<ProductoEnContext[]>([]);
  // --- END STATE ---

  const [moneda, setMoneda] = useState<'MXN' | 'USD'>('MXN');
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [hasIva, setHasIva] = useState<boolean>(false);
  // Shipping cost state - value is assumed to be in the 'moneda' currency
  const [shippingCostInput, setShippingCostInput] = useState<number>(0);

  const {
    exchangeRate,
    loading: exchangeRateLoading,
    error: exchangeRateError,
    convertMXNtoUSD,
    convertUSDtoMXN
  } = useExchangeRate();

  // --- Load/Save internalProductos from sessionStorage ---
  useEffect(() => {
    const savedProductos = sessionStorage.getItem('cotizacion_internalProductos'); // Changed key
    const savedMoneda = sessionStorage.getItem('cotizacion_moneda');
    const savedGlobalDiscount = sessionStorage.getItem('cotizacion_globalDiscount');
    const savedHasIva = sessionStorage.getItem('cotizacion_hasIva');
    const savedShippingCost = sessionStorage.getItem('cotizacion_shippingCostInput'); // Changed key

    if (savedProductos) {
      try {
        const parsedProductos = JSON.parse(savedProductos);
        // TODO: Add validation/migration logic if format changes
        setInternalProductos(parsedProductos);
      } catch (e) { console.error('Error parsing saved internalProductos:', e); }
    }
    if (savedMoneda) setMoneda(savedMoneda as 'MXN' | 'USD');
    if (savedGlobalDiscount) setGlobalDiscount(parseFloat(savedGlobalDiscount) || 0);
    if (savedHasIva) setHasIva(savedHasIva === 'true');
    if (savedShippingCost) setShippingCostInput(parseFloat(savedShippingCost) || 0);

  }, []);

  useEffect(() => {
    sessionStorage.setItem('cotizacion_internalProductos', JSON.stringify(internalProductos)); // Changed key
  }, [internalProductos]);

  useEffect(() => {
    sessionStorage.setItem('cotizacion_moneda', moneda);
    sessionStorage.setItem('cotizacion_globalDiscount', globalDiscount.toString());
    sessionStorage.setItem('cotizacion_hasIva', hasIva.toString());
    sessionStorage.setItem('cotizacion_shippingCostInput', shippingCostInput.toString()); // Changed key
  }, [moneda, globalDiscount, hasIva, shippingCostInput]);
  // --- END Load/Save ---


  // --- Add a product ---
  const addProducto = useCallback((producto: ProductoBase) => {
    // Expects producto.precio to be the base MXN price
    const precioMXN = producto.precio || 0;
    const cantidad = producto.cantidad || 1;
    const subtotalMXN = precioMXN * cantidad;

    const nuevoProductoInterno: ProductoEnContext = {
      ...producto, // Spread base details
      id: producto.id || `temp_${Date.now()}`, // Ensure ID exists
      cantidad: cantidad,
      precioMXN: precioMXN,
      subtotalMXN: subtotalMXN,
      descuento: producto.descuento || 0,
    };

    console.log("Context addProducto: Adding internal product:", nuevoProductoInterno);
    setInternalProductos(prev => [...prev, nuevoProductoInterno]);
  }, []); // Dependencies? Only stable setters.


  // --- Remove a product ---
  const removeProducto = useCallback((id: string) => {
    setInternalProductos(prev => prev.filter(p => p.id !== id));
  }, []);


  // --- Update product discount ---
  const updateProductoDiscount = useCallback((id: string, descuento: number) => {
    setInternalProductos(prev => prev.map(p => {
      if (p.id === id) {
        // Recalculate MXN subtotal based on discount
        const priceAfterDiscountMXN = p.precioMXN * (1 - descuento / 100);
        const newSubtotalMXN = priceAfterDiscountMXN * p.cantidad;
        console.log(`Context updateDiscount: ID=${id}, Discount=${descuento}, NewSubtotalMXN=${newSubtotalMXN}`);
        return { ...p, descuento, subtotalMXN: newSubtotalMXN };
      }
      return p;
    }));
  }, []);


  // --- Clear products ---
  const clearProductos = useCallback(() => {
    setInternalProductos([]);
    // Consider resetting other fields like discount, shipping etc. if needed
    setGlobalDiscount(0);
    setHasIva(false);
    setShippingCostInput(0);
    sessionStorage.removeItem('cotizacion_internalProductos');
  }, []);

  // --- Financial Calculations ---
  const calculatedFinancials = useMemo(() => {
    console.log("Context: Recalculating financials...");
    console.log(` - Moneda: ${moneda}, Rate: ${exchangeRate}`);
    console.log(` - Shipping Input: ${shippingCostInput} (${moneda})`);
    console.log(` - Global Discount: ${globalDiscount}%`);
    console.log(` - Has IVA: ${hasIva}`);

    // 1. Calculate base totals in MXN from internal state
    let baseSubtotalMXN = 0;
    internalProductos.forEach(p => {
      // Subtotal reflects individual discounts
      baseSubtotalMXN += p.subtotalMXN;
    });

    const subtotalAfterDiscountMXN = baseSubtotalMXN * (1 - globalDiscount / 100);
    const ivaAmountMXN = hasIva ? subtotalAfterDiscountMXN * 0.16 : 0;

    // 2. Determine Shipping Cost in MXN
    let shippingCostMXN = 0;
    if (shippingCostInput > 0) {
        if (moneda === 'MXN') {
            shippingCostMXN = shippingCostInput;
        } else if (moneda === 'USD' && exchangeRate) {
            shippingCostMXN = convertUSDtoMXN(shippingCostInput);
        } else {
            // Fallback or handle error if rate unavailable for USD shipping
            shippingCostMXN = 0; // Or maybe keep shippingCostInput if MXN? Decide policy.
             console.warn("Cannot calculate MXN shipping cost from USD without exchange rate.");
        }
    }
     console.log(` - Calculated Shipping MXN: ${shippingCostMXN}`);

    const totalMXN = subtotalAfterDiscountMXN + ivaAmountMXN + shippingCostMXN;

    // 3. Calculate display values based on moneda
    let displaySubtotal = 0;
    let displayShippingCost = 0;
    let displayIvaAmount = 0;
    let displayTotal = 0;

    if (moneda === 'MXN') {
      displaySubtotal = subtotalAfterDiscountMXN;
      displayShippingCost = shippingCostMXN; // Already MXN
      displayIvaAmount = ivaAmountMXN;
      displayTotal = totalMXN;
    } else if (moneda === 'USD' && exchangeRate) {
      displaySubtotal = convertMXNtoUSD(subtotalAfterDiscountMXN);
      // Shipping cost was input in USD, so use it directly
      displayShippingCost = shippingCostInput;
      displayIvaAmount = convertMXNtoUSD(ivaAmountMXN);
      displayTotal = convertMXNtoUSD(totalMXN);
    } else {
      // Fallback: Display MXN values if USD selected but no rate
      displaySubtotal = subtotalAfterDiscountMXN;
      displayShippingCost = shippingCostMXN; // Display the calculated MXN cost
      displayIvaAmount = ivaAmountMXN;
      displayTotal = totalMXN;
       console.warn("Displaying MXN values as USD due to missing exchange rate.");
    }
    
    console.log(` - Base Subtotal MXN: ${baseSubtotalMXN}`);
    console.log(` - Subtotal After Discount MXN: ${subtotalAfterDiscountMXN}`);
    console.log(` - IVA MXN: ${ivaAmountMXN}`);
    console.log(` - Total MXN: ${totalMXN}`);
    console.log(` - Display Subtotal (${moneda}): ${displaySubtotal}`);
    console.log(` - Display Shipping (${moneda}): ${displayShippingCost}`);
    console.log(` - Display IVA (${moneda}): ${displayIvaAmount}`);
    console.log(` - Display Total (${moneda}): ${displayTotal}`);


    return {
      displaySubtotal,
      displayShippingCost,
      displayIvaAmount,
      displayTotal,
      baseSubtotalMXN, // Renamed for clarity
      subtotalAfterDiscountMXN, // Added for clarity
      shippingCostMXN,
      ivaAmountMXN,
      totalMXN,
    };

  }, [internalProductos, globalDiscount, hasIva, shippingCostInput, moneda, exchangeRate, convertMXNtoUSD, convertUSDtoMXN]);


  // --- Derive Display Products ---
  // This calculates the products array with prices/subtotals in the selected currency
  const displayProductos = useMemo((): ProductoDisplay[] => {
    return internalProductos.map(p => {
      let displayPrecio: number;
      let displaySubtotal: number;

      if (moneda === 'MXN') {
        displayPrecio = p.precioMXN;
        displaySubtotal = p.subtotalMXN; // Already includes individual discount
      } else if (moneda === 'USD' && exchangeRate) {
        displayPrecio = convertMXNtoUSD(p.precioMXN);
        // Recalculate subtotal in USD AFTER discount
        const priceAfterDiscountUSD = displayPrecio * (1 - p.descuento / 100);
        displaySubtotal = priceAfterDiscountUSD * p.cantidad;
      } else {
        // Fallback: show MXN price if no rate
        displayPrecio = p.precioMXN;
        displaySubtotal = p.subtotalMXN;
      }

      return {
        ...p, // Spread all properties from internal product
        precio: displayPrecio, // Overwrite with display price
        subtotal: displaySubtotal, // Overwrite with display subtotal
      };
    });
  }, [internalProductos, moneda, exchangeRate, convertMXNtoUSD]);


  // --- Context Value ---
  const contextValue = useMemo((): ProductosContextType => ({
    productos: displayProductos, // Provide the derived display products
    setProductos: (prods) => {
        // This is complex now - ideally don't allow direct setting from outside
        // If needed, would require converting display products back to internal format
        console.warn("Directly setting products is discouraged. Use add/remove/update.");
        // setInternalProductos(convertToInternalFormat(prods)); // Needs implementation
    },
    addProducto,
    removeProducto,
    updateProductoDiscount,
    clearProductos,
    financials: calculatedFinancials, // Provide the calculated financials object
    globalDiscount,
    setGlobalDiscount,
    hasIva,
    setHasIva,
    shippingCost: shippingCostInput, // Expose the input value
    setShippingCost: setShippingCostInput, // Allow setting the input value
    moneda,
    setMoneda,
    exchangeRate,
    tipoCambio: exchangeRate,
    convertMXNtoUSD,
    convertUSDtoMXN,
  }), [
    displayProductos,
    addProducto,
    removeProducto,
    updateProductoDiscount,
    clearProductos,
    calculatedFinancials,
    globalDiscount,
    setGlobalDiscount,
    hasIva,
    setHasIva,
    shippingCostInput,
    setShippingCostInput,
    moneda,
    setMoneda,
    exchangeRate,
    convertMXNtoUSD,
    convertUSDtoMXN,
  ]);


  return (
    <ProductosContext.Provider value={contextValue}>
      {children}
    </ProductosContext.Provider>
  );
}

// --- Hook to use the context ---
export function useProductos() {
  const context = useContext(ProductosContext);
  if (context === undefined) {
    throw new Error('useProductos must be used within a ProductosProvider');
  }
  return context;
} 