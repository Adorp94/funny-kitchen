"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from "react";
import { Producto as ProductoBase } from "@/components/cotizacion/producto-simplificado";
import { ProductoConDescuento as ProductoDisplay } from "@/components/cotizacion/lista-productos-con-descuento";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { useHydration } from "@/hooks/use-hydration";

// --- NEW: Internal product state type storing base MXN values ---
interface ProductoEnContext extends ProductoBase {
  id: string; // Ensure id is always present and string
  cantidad: number;
  precioMXN: number; // Base price in MXN
  subtotalBrutoMXN: number; // Gross subtotal in MXN (precio * cantidad, NO discounts)
  subtotalConDescuentoIndividualMXN: number; // Subtotal AFTER individual discount applied
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
    displaySubtotal: number;       // Subtotal after individual discounts, in selected currency
    displayBaseSubtotal: number;   // Base subtotal before any discounts, in selected currency
    displayShippingCost: number;   // Shipping cost in selected currency
    displayIvaAmount: number;      // IVA in selected currency
    displayTotal: number;          // Total in selected currency
    baseSubtotalMXN: number;       // Subtotal before global discount, in MXN
    grossSubtotalMXN: number;      // Gross subtotal before any discounts, in MXN
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
  moneda: 'MXN' | 'USD' | 'EUR';
  setMoneda: (moneda: 'MXN' | 'USD' | 'EUR') => void;
  exchangeRate: number | null;
  tipoCambio?: number | null; // Alias for exchangeRate

  // Add conversion functions for convenience
  convertMXNtoUSD: (amount: number) => number;
  convertUSDtoMXN: (amount: number) => number;
  convertMXNtoEUR: (amount: number) => number;
  convertEURtoMXN: (amount: number) => number;
}

const ProductosContext = createContext<ProductosContextType | undefined>(undefined);

export function ProductosProvider({ children }: { children: ReactNode }) {
  const isHydrated = useHydration();
  
  // --- STATE: Use internal product type ---
  const [internalProductos, setInternalProductos] = useState<ProductoEnContext[]>([]);
  // --- END STATE ---

  const [moneda, setMoneda] = useState<'MXN' | 'USD' | 'EUR'>('MXN');
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [hasIva, setHasIva] = useState<boolean>(false);
  // Shipping cost state - value is assumed to be in the 'moneda' currency
  const [shippingCostInput, setShippingCostInput] = useState<number>(0);

  // --- Modified Setters with Logging ---
  const setHasIvaWithLog = useCallback((newValue: boolean) => {
    console.log(`[Context] Setting hasIva from ${hasIva} to ${newValue}`);
    setHasIva(newValue);
  }, [hasIva]); // Dependency on hasIva to log the 'from' value correctly

  const setShippingCostInputWithLog = useCallback((newCost: number) => {
    const parsedCost = Number(newCost);
    const finalCost = isNaN(parsedCost) ? 0 : parsedCost;
    console.log(`[Context] Setting shippingCostInput from ${shippingCostInput} to ${finalCost} (received: ${newCost})`);
    setShippingCostInput(finalCost);
  }, [shippingCostInput]); // Dependency on shippingCostInput to log the 'from' value correctly
  // --- End Modified Setters ---

  const {
    exchangeRates,
    loading: exchangeRateLoading,
    error: exchangeRateError,
    convertMXNtoUSD,
    convertUSDtoMXN,
    convertMXNtoEUR,
    convertEURtoMXN,
    getExchangeRate
  } = useExchangeRate();


  // Get the exchange rate for the current selected currency
  const exchangeRate = getExchangeRate(moneda === 'MXN' ? 'USD' : moneda);

  // --- Load/Save internalProductos from sessionStorage ---
  useEffect(() => {
    if (!isHydrated) return;
    
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
    if (savedMoneda) setMoneda(savedMoneda as 'MXN' | 'USD' | 'EUR');
    if (savedGlobalDiscount) setGlobalDiscount(parseFloat(savedGlobalDiscount) || 0);
    if (savedHasIva) setHasIva(savedHasIva === 'true');
    if (savedShippingCost) setShippingCostInput(parseFloat(savedShippingCost) || 0);

  }, [isHydrated]);

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
    // Get the individual discount from the passed product data
    const descuento = producto.descuento || 0;
    // Calculate the subtotal *after* applying the individual discount
    const subtotalMXN = (precioMXN * cantidad) * (1 - descuento / 100);

    const nuevoProductoInterno: ProductoEnContext = {
      ...producto, // Spread base details
      id: producto.id || `temp_${Date.now()}`, // Ensure ID exists
      cantidad: cantidad,
      precioMXN: precioMXN, // Store the base price
      subtotalBrutoMXN: precioMXN * cantidad, // Store the gross subtotal
      subtotalConDescuentoIndividualMXN: subtotalMXN, // Store the subtotal *with* individual discount applied
      descuento: descuento, // Store the individual discount percentage
    };

    console.log("Context addProducto: Adding internal product (with individual discount applied to subtotalMXN):", nuevoProductoInterno);
    // Handle duplicates by updating existing products or adding new ones
    setInternalProductos(prev => {
        const existingIndex = prev.findIndex(p => p.id === nuevoProductoInterno.id);
        if (existingIndex > -1) {
            console.log(`[Context addProducto] Product with id ${nuevoProductoInterno.id} already exists. Updating existing product.`);
            const newState = [...prev];
            newState[existingIndex] = nuevoProductoInterno;
            return newState;
        }
        console.log(`[Context addProducto] Adding new product with id ${nuevoProductoInterno.id}`);
        return [...prev, nuevoProductoInterno];
    });
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
        return { ...p, descuento, subtotalConDescuentoIndividualMXN: newSubtotalMXN };
      }
      return p;
    }));
  }, []);


  // --- Clear products ---
  const clearProductos = useCallback(() => {
    console.log("[Context] clearProductos called");
    setInternalProductos([]);
    // Reset all financial fields to defaults
    setGlobalDiscount(0);
    setHasIva(false);
    setShippingCostInput(0);
    setMoneda('MXN'); // Reset currency to default
    
    // Clear all session storage items related to cotización
    sessionStorage.removeItem('cotizacion_internalProductos');
    sessionStorage.removeItem('cotizacion_moneda');
    sessionStorage.removeItem('cotizacion_globalDiscount');
    sessionStorage.removeItem('cotizacion_hasIva');
    sessionStorage.removeItem('cotizacion_shippingCostInput');
  }, []);

  // --- Set products (stable function) ---
  const setProductos = useCallback((prods: any[]) => {
    // This is complex now - ideally don't allow direct setting from outside
    // If needed, would require converting display products back to internal format
    console.warn("Directly setting products is discouraged. Use add/remove/update.");
    // setInternalProductos(convertToInternalFormat(prods)); // Needs implementation
  }, []);

  // --- Financial Calculations ---
  const calculatedFinancials = useMemo(() => {
    if (!isHydrated || exchangeRateLoading) {
      // Return default values during hydration and while loading rates to prevent server/client mismatch
      return {
        displayProductos: [],
        financials: {
          displaySubtotal: 0,
          displayBaseSubtotal: 0,
          displayShippingCost: 0,
          displayIvaAmount: 0,
          displayTotal: 0,
          baseSubtotalMXN: 0,
          grossSubtotalMXN: 0,
          subtotalAfterDiscountMXN: 0,
          shippingCostMXN: 0,
          ivaAmountMXN: 0,
          totalMXN: 0,
        }
      };
    }
    
    console.log("[Context] Recalculating financials...");
    console.log(` - Moneda: ${moneda}, Rate: ${exchangeRate}`);
    console.log(` - Shipping Input: ${shippingCostInput} (${moneda})`);
    console.log(` - Global Discount: ${globalDiscount}%`);
    console.log(` - Has IVA: ${hasIva}`);

    // --- *** Start Product Mapping for Display *** ---
    const displayProductos: ProductoDisplay[] = internalProductos.map((p, index) => {
        console.log(`[Context] Mapping product index ${index} for display:`, p); // Log internal product
        let displayPrice = 0;
        let displaySubtotal = 0;

        if (moneda === 'MXN') {
            displayPrice = p.precioMXN;
            displaySubtotal = p.subtotalConDescuentoIndividualMXN; // Use the discounted subtotal
            console.log(`[Context]   - Using MXN: displayPrice=${displayPrice}, displaySubtotal=${displaySubtotal}`);
        } else if (moneda === 'USD') {
            if (exchangeRate && exchangeRate > 0) { // Ensure exchangeRate is valid
                try {
                    displayPrice = convertMXNtoUSD(p.precioMXN);
                    displaySubtotal = convertMXNtoUSD(p.subtotalConDescuentoIndividualMXN); // Use the discounted subtotal
                    console.log(`[Context]   - Converted to USD (Rate: ${exchangeRate}): displayPrice=${displayPrice}, displaySubtotal=${displaySubtotal}`);
                } catch (conversionError) {
                    console.error(`[Context]   - Error converting product ${index} to USD:`, conversionError);
                    displayPrice = 0; // Fallback on error
                    displaySubtotal = 0;
                }
            } else {
                 console.warn(`[Context]   - Cannot calculate USD display price/subtotal for product ${index}. Exchange rate invalid or null: ${exchangeRate}`);
                 displayPrice = 0; // Fallback if rate is missing/invalid
                 displaySubtotal = 0;
            }
        } else if (moneda === 'EUR') {
            if (exchangeRate && exchangeRate > 0) { // Ensure exchangeRate is valid
                try {
                    displayPrice = convertMXNtoEUR(p.precioMXN);
                    displaySubtotal = convertMXNtoEUR(p.subtotalConDescuentoIndividualMXN); // Use the discounted subtotal
                    console.log(`[Context]   - Converted to EUR (Rate: ${exchangeRate}): displayPrice=${displayPrice}, displaySubtotal=${displaySubtotal}`);
                } catch (conversionError) {
                    console.error(`[Context]   - Error converting product ${index} to EUR:`, conversionError);
                    displayPrice = 0; // Fallback on error
                    displaySubtotal = 0;
                }
            } else {
                 console.warn(`[Context]   - Cannot calculate EUR display price/subtotal for product ${index}. Exchange rate invalid or null: ${exchangeRate}`);
                 displayPrice = 0; // Fallback if rate is missing/invalid
                 displaySubtotal = 0;
            }
        } 
        // Log if neither MXN nor USD (should not happen with current types)
        else {
             console.warn(`[Context]   - Unexpected moneda value: ${moneda}. Setting display price/subtotal to 0.`);
        }

        // Construct the display product object
        const displayProduct: ProductoDisplay = {
            ...p, // Spread internal details like id, nombre, cantidad, sku etc.
            precio: displayPrice,      // Set the calculated display price
            subtotal: displaySubtotal,  // Set the calculated display subtotal
            // Add MXN properties for API compatibility
            precioMXN: p.precioMXN,
            subtotalMXN: p.subtotalConDescuentoIndividualMXN,
        };
        console.log(`[Context]   - Resulting displayProduct ${index}:`, displayProduct);
        return displayProduct;
    });
    // --- *** End Product Mapping for Display *** ---

    // === CORRECT DISCOUNT LOGIC SEQUENCE ===
    // 1. Calculate gross subtotal (precio × cantidad without any discounts)
    let subtotalBrutoMXN = 0;
    internalProductos.forEach(p => {
      subtotalBrutoMXN += p.subtotalBrutoMXN;
    });

    // 2. Calculate subtotal after individual discounts (already calculated per product)
    let subtotalConDescuentosIndividualesMXN = 0;
    internalProductos.forEach(p => {
      subtotalConDescuentosIndividualesMXN += p.subtotalConDescuentoIndividualMXN;
    });

    // 3. Apply global discount to the subtotal after individual discounts
    const descuentoGlobalAmount = subtotalConDescuentosIndividualesMXN * (globalDiscount / 100);
    const subtotalAfterGlobalDiscountMXN = subtotalConDescuentosIndividualesMXN - descuentoGlobalAmount;

    // 4. Calculate shipping cost in MXN
    let shippingCostMXN = 0;
    if (shippingCostInput > 0) {
        if (moneda === 'MXN') {
            shippingCostMXN = shippingCostInput;
        } else if (moneda === 'USD' && exchangeRate) {
            shippingCostMXN = convertUSDtoMXN(shippingCostInput);
        } else if (moneda === 'EUR' && exchangeRate) {
            shippingCostMXN = convertEURtoMXN(shippingCostInput);
        } else {
            // Fallback or handle error if rate unavailable for USD/EUR shipping
            shippingCostMXN = 0; // Or maybe keep shippingCostInput if MXN? Decide policy.
             console.warn(`Cannot calculate MXN shipping cost from ${moneda} without exchange rate.`);
        }
    }
    console.log(` - Calculated Shipping MXN: ${shippingCostMXN}`);

    // 5. Apply IVA to subtotal after global discount (WITHOUT shipping)
    const ivaAmountMXN = hasIva ? subtotalAfterGlobalDiscountMXN * 0.16 : 0;

    // 6. Add shipping cost AFTER IVA calculation
    const subtotalWithIvaMXN = subtotalAfterGlobalDiscountMXN + ivaAmountMXN;
    
    // 7. Calculate final total (subtotal + IVA + shipping)
    const totalMXN = subtotalWithIvaMXN + shippingCostMXN;
    // === END CORRECT DISCOUNT LOGIC SEQUENCE ===

    // 8. Calculate display values based on moneda
    let displaySubtotal = 0;
    let displayBaseSubtotal = 0;
    let displayShippingCost = 0;
    let displayIvaAmount = 0;
    let displayTotal = 0;

    if (moneda === 'MXN') {
      displaySubtotal = subtotalConDescuentosIndividualesMXN; // Show subtotal after individual discounts
      displayBaseSubtotal = subtotalBrutoMXN; // Show base subtotal before any discounts
      displayShippingCost = shippingCostMXN; // Already MXN
      displayIvaAmount = ivaAmountMXN;
      displayTotal = totalMXN;
    } else if (moneda === 'USD' && exchangeRate) {
      displaySubtotal = convertMXNtoUSD(subtotalConDescuentosIndividualesMXN); // Show subtotal after individual discounts
      displayBaseSubtotal = convertMXNtoUSD(subtotalBrutoMXN); // Show base subtotal before any discounts
      // Shipping cost was input in USD, so use it directly
      displayShippingCost = shippingCostInput;
      displayIvaAmount = convertMXNtoUSD(ivaAmountMXN);
      displayTotal = convertMXNtoUSD(totalMXN);
    } else if (moneda === 'EUR' && exchangeRate) {
      displaySubtotal = convertMXNtoEUR(subtotalConDescuentosIndividualesMXN); // Show subtotal after individual discounts
      displayBaseSubtotal = convertMXNtoEUR(subtotalBrutoMXN); // Show base subtotal before any discounts
      // Shipping cost was input in EUR, so use it directly
      displayShippingCost = shippingCostInput;
      displayIvaAmount = convertMXNtoEUR(ivaAmountMXN);
      displayTotal = convertMXNtoEUR(totalMXN);
    } else {
      // Fallback: Display MXN values if USD/EUR selected but no rate
      displaySubtotal = subtotalConDescuentosIndividualesMXN; // Show subtotal after individual discounts
      displayBaseSubtotal = subtotalBrutoMXN; // Show base subtotal before any discounts
      displayShippingCost = shippingCostMXN; // Display the calculated MXN cost
      displayIvaAmount = ivaAmountMXN;
      displayTotal = totalMXN;
       console.warn(`Displaying MXN values as ${moneda} due to missing exchange rate.`);
    }
    
    console.log(`=== DISCOUNT CALCULATION DEBUG ===`);
    console.log(` - Subtotal Bruto MXN: ${subtotalBrutoMXN}`);
    console.log(` - Subtotal con Descuentos Individuales MXN: ${subtotalConDescuentosIndividualesMXN}`);
    console.log(` - Descuento Global Amount: ${descuentoGlobalAmount}`);
    console.log(` - Subtotal después Descuento Global MXN: ${subtotalAfterGlobalDiscountMXN}`);
    console.log(` - Shipping MXN: ${shippingCostMXN}`);
    console.log(` - Subtotal + IVA MXN: ${subtotalWithIvaMXN}`);
    console.log(` - IVA MXN: ${ivaAmountMXN}`);
    console.log(` - Total MXN: ${totalMXN}`);
    console.log(` - Display Subtotal (${moneda}): ${displaySubtotal}`);
    console.log(` - Display Shipping (${moneda}): ${displayShippingCost}`);
    console.log(` - Display IVA (${moneda}): ${displayIvaAmount}`);
    console.log(` - Display Total (${moneda}): ${displayTotal}`);
    console.log(`=== END DEBUG ===`);

    return {
      displayProductos,
      financials: {
        displaySubtotal,
        displayBaseSubtotal,
        displayShippingCost,
        displayIvaAmount,
        displayTotal,
        baseSubtotalMXN: subtotalConDescuentosIndividualesMXN, // Use subtotal after individual discounts as base
        grossSubtotalMXN: subtotalBrutoMXN, // Gross subtotal before any discounts
        subtotalAfterDiscountMXN: subtotalAfterGlobalDiscountMXN, // Subtotal after global discount
        shippingCostMXN,
        ivaAmountMXN,
        totalMXN,
      },
    };

  }, [isHydrated, exchangeRateLoading, internalProductos, globalDiscount, hasIva, shippingCostInput, moneda, exchangeRate]);


  // --- Context Value ---
  const contextValue = useMemo((): ProductosContextType => ({
    productos: calculatedFinancials.displayProductos,
    setProductos,
    addProducto,
    removeProducto,
    updateProductoDiscount,
    clearProductos,
    financials: calculatedFinancials.financials,
    globalDiscount,
    setGlobalDiscount,
    hasIva,
    setHasIva: setHasIvaWithLog,
    shippingCost: shippingCostInput,
    setShippingCost: setShippingCostInputWithLog,
    moneda,
    setMoneda,
    exchangeRate,
    tipoCambio: exchangeRate,
    convertMXNtoUSD,
    convertUSDtoMXN,
    convertMXNtoEUR,
    convertEURtoMXN,
  }), [
    calculatedFinancials.displayProductos,
    setProductos,
    addProducto,
    removeProducto,
    updateProductoDiscount,
    clearProductos,
    calculatedFinancials.financials,
    globalDiscount,
    setGlobalDiscount,
    hasIva,
    setHasIvaWithLog,
    shippingCostInput,
    setShippingCostInputWithLog,
    moneda,
    setMoneda,
    exchangeRate,
    convertMXNtoUSD,
    convertUSDtoMXN,
    convertMXNtoEUR,
    convertEURtoMXN,
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