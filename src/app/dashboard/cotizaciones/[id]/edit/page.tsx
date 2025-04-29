"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, User, Package, Receipt, Save, DollarSign, FileText, Loader2, Download } from "lucide-react";
import { ClienteForm } from "@/components/cotizacion/cliente-form";
import ProductoFormTabs from "@/components/cotizacion/producto-form-tabs";
import { ListaProductos } from "@/components/cotizacion/lista-productos";
import { ListaProductosConDescuento, ProductoConDescuento } from "@/components/cotizacion/lista-productos-con-descuento";
import { ResumenCotizacion } from "@/components/cotizacion/resumen-cotizacion";
import { useProductos, ProductosProvider } from "@/contexts/productos-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cliente } from "@/lib/supabase";
import { Producto as ProductoBase } from '@/components/cotizacion/producto-simplificado';

interface ExtendedProductoBase extends ProductoBase {
  cantidad: number;
  sku?: string;
  descripcion?: string;
  colores?: string[];
  acabado?: string;
  descuento: number;
}

interface Producto extends ExtendedProductoBase {
  subtotal: number;
  producto_id?: number | null;
}

interface ProductoFormData {
  tipo: 'nuevo' | 'existente';
  producto?: any;
  cantidad?: number;
  [key: string]: any;
}

// Define the window extension for TypeScript
declare global {
  interface Window {
    validProductIds?: Set<number>;
  }
}

// Wrapper component to provide context
export default function EditCotizacionPage() {
  return (
    <ProductosProvider>
      <EditCotizacionClient />
    </ProductosProvider>
  );
}

function EditCotizacionClient() {
  const router = useRouter();
  const params = useParams();
  const cotizacionId = params.id as string;
  
  const [activeStep, setActiveStep] = useState<number>(1);
  const [initialLoading, setInitialLoading] = useState(true);
  const [clienteData, setClienteData] = useState<Cliente | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [clienteFormMode, setClienteFormMode] = useState<'search' | 'create'>('search');
  const [isSaving, setIsSaving] = useState(false);
  const [cotizacionOriginal, setCotizacionOriginal] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Get productos from context
  const {
    productos,
    addProducto,
    removeProducto,
    updateProductoDiscount,
    clearProductos,
    financials,
    moneda,
    setMoneda,
    globalDiscount,
    setGlobalDiscount,
    hasIva,
    setHasIva,
    shippingCost,
    setShippingCost,
    exchangeRate,
    setProductos,
    convertMXNtoUSD,
    convertUSDtoMXN
  } = useProductos();

  // Fix: Helper to generate a unique id for new products
  function generateUniqueId() {
    return `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Fetch valid product IDs ONCE on mount
  useEffect(() => {
    async function fetchValidProductIds() {
      try {
        const response = await fetch('/api/productos?onlyIds=true');
        if (!response.ok) throw new Error('Failed to fetch valid product IDs');
        const data = await response.json();
        
        // Log the actual data received
        console.log("Response from /api/productos?onlyIds=true:", JSON.stringify(data));
        
        // Ensure we access data.data
        if (data && Array.isArray(data.data)) {
          window.validProductIds = new Set(
            data.data.map((p: {producto_id: number}) => p.producto_id)
          );
          console.log(`Loaded ${window.validProductIds.size} valid product IDs for validation`);
        } else {
          console.error("Invalid structure received for valid product IDs:", data);
          window.validProductIds = new Set(); // Initialize as empty set on error
        }
        
      } catch (error) {
        console.error('Error fetching valid product IDs:', error);
        setError('Error al cargar IDs de productos válidos. La validación puede fallar.');
        window.validProductIds = new Set(); // Ensure it's initialized on error
      }
    }
    
    fetchValidProductIds();
  }, []); // Empty dependency array ensures this runs only once

  // Fetch the cotizacion data on mount or when ID changes
  useEffect(() => {
    async function fetchCotizacion() {
      // Only fetch basic data here, product processing moved to separate effect
      console.log("Fetching base cotizacion data for ID:", cotizacionId);
      setInitialLoading(true);
      try {
        const response = await fetch(`/api/cotizaciones?id=${cotizacionId}`);
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        const data = await response.json();
        console.log("Received cotizacion data:", data);

        if (!data.cotizacion) {
          toast.error("No se encontró la cotización");
          router.push("/dashboard/cotizaciones");
          return;
        }

        if (data.cotizacion.estado !== 'pendiente') {
          toast.error("Solo se pueden editar cotizaciones en estado 'pendiente'");
          router.push("/dashboard/cotizaciones");
          return;
        }

        // Store the fetched data
        setCotizacionOriginal(data.cotizacion);

        // Set basic state immediately (Client, Moneda, Discount, IVA)
        const fetchedMoneda = data.cotizacion.moneda || 'MXN';
        if (data.cotizacion.cliente) {
          console.log("Setting client data (initial fetch):", data.cotizacion.cliente);
          setClienteData(data.cotizacion.cliente); // Keep for form initialData?
          setCliente(data.cotizacion.cliente);
          setClienteFormMode('search');
        }
        console.log("Setting basic settings (initial fetch - Moneda, Discount, IVA):", fetchedMoneda);
        setMoneda(fetchedMoneda); // Set moneda early
        setGlobalDiscount(data.cotizacion.descuento_global || 0);
        setHasIva(!!data.cotizacion.iva);
        // Product and Shipping Cost processing moved to the next effect

      } catch (error) {
        console.error("Error fetching cotizacion:", error);
        toast.error("Error al cargar la cotización");
        router.push("/dashboard/cotizaciones");
      } finally {
        // Don't set initialLoading false here yet, wait for product processing
        // setInitialLoading(false); 
      }
    }

    if (cotizacionId) {
      fetchCotizacion();
    } else {
      console.warn("cotizacionId is missing, cannot fetch data.");
      setInitialLoading(false); // Ensure loading stops if ID is missing
    }

    // Dependencies for fetching basic data
  }, [cotizacionId, router, setMoneda, setGlobalDiscount, setHasIva]); // Removed product/shipping setters

  // Effect to process products and shipping cost AFTER cotizacion data AND exchange rate are ready
  useEffect(() => {
    // Guard clauses: wait for data and rate
    if (!cotizacionOriginal || exchangeRate === null) {
      console.log("Waiting for cotizacion data and/or exchange rate...", { hasCotizacion: !!cotizacionOriginal, hasExchangeRate: exchangeRate !== null });
      // Keep loading true until this effect runs successfully
      if (!cotizacionOriginal && !initialLoading) setInitialLoading(true); // Reset loading if original data vanished
      return; 
    }

    console.log("Processing products and shipping cost...", { cotizacionOriginal, exchangeRate });

    const fetchedMoneda = cotizacionOriginal.moneda || 'MXN';
    // Use fetched rate if available, otherwise use the hook's rate
    const tipoCambioToUse = cotizacionOriginal.tipo_cambio || exchangeRate;

    // Validate the exchange rate if dealing with USD
    if (fetchedMoneda === 'USD' && (!tipoCambioToUse || tipoCambioToUse <= 0)) {
        console.error("Invalid or missing exchange rate for USD cotizacion processing. Rate:", tipoCambioToUse);
        toast.error("Error: Tipo de cambio inválido para procesar cotización en USD.");
        setError("Tipo de cambio inválido.");
        setInitialLoading(false); // Stop loading even on error
        return;
    }

    // 1. Process Shipping Cost
    const fetchedShippingCost = (cotizacionOriginal.incluye_envio && cotizacionOriginal.costo_envio) ? cotizacionOriginal.costo_envio : 0;
    console.log(`Setting shipping cost in context: ${fetchedShippingCost} ${fetchedMoneda} using rate ${tipoCambioToUse}`);
    // Pass the display value and let the context handle potential conversion
    setShippingCost(fetchedShippingCost);

    // 2. Process Products
    if (cotizacionOriginal.productos && Array.isArray(cotizacionOriginal.productos)) {
      console.log("Processing products from cotizacionOriginal:", cotizacionOriginal.productos);

      const productosParaContexto = cotizacionOriginal.productos.map((apiProducto: any) => {
        const precioUnitarioFetched = apiProducto.precio_unitario || apiProducto.precio || 0;
        const cantidad = apiProducto.cantidad || 0;
        const descuento = apiProducto.descuento_producto ?? apiProducto.descuento ?? 0;
        const subtotalFetched = precioUnitarioFetched * cantidad * (1 - descuento / 100);

        let precioUnitarioMXN: number;
        let subtotalMXN: number;

        if (fetchedMoneda === 'USD') {
          // Now we should have a valid tipoCambioToUse here
          precioUnitarioMXN = precioUnitarioFetched * tipoCambioToUse;
          subtotalMXN = precioUnitarioMXN * cantidad * (1 - descuento / 100);
        } else { // MXN
          precioUnitarioMXN = apiProducto.precio_unitario_mxn ?? precioUnitarioFetched;
          subtotalMXN = apiProducto.subtotal_mxn ?? (precioUnitarioMXN * cantidad * (1 - descuento / 100));
        }

        return {
          id: apiProducto.cotizacion_producto_id ? apiProducto.cotizacion_producto_id.toString() : generateUniqueId(),
          nombre: apiProducto.nombre || "Unknown Product",
          cantidad: cantidad,
          precio: precioUnitarioFetched,
          descuento: descuento,
          subtotal: subtotalFetched,
          sku: apiProducto.sku || "",
          descripcion: apiProducto.descripcion || "",
          colores: Array.isArray(apiProducto.colores) ? apiProducto.colores : 
                  typeof apiProducto.colores === 'string' ? apiProducto.colores.split(',') : [],
          acabado: apiProducto.acabado || "",
          producto_id: apiProducto.producto_id || null,
          cotizacion_producto_id: apiProducto.cotizacion_producto_id || null,
          precioMXN: precioUnitarioMXN,
          subtotalMXN: subtotalMXN,
        };
      });

      console.log("Setting products in context (final processing):", productosParaContexto);
      setProductos(productosParaContexto);
    } else {
      console.log("No products found in cotizacionOriginal, clearing context.");
      setProductos([]);
    }

    // Only set loading to false after successful processing
    console.log("Finished processing products and shipping, setting initialLoading to false.");
    setInitialLoading(false);

  // Dependencies: Run when cotizacion data arrives OR exchange rate updates
  }, [cotizacionOriginal, exchangeRate, setProductos, setShippingCost]);

  // Navigate to next step
  const nextStep = () => {
    if (activeStep === 1 && !cliente) {
      toast.error("Por favor, ingresa la información del cliente");
      return;
    }
    
    if (activeStep === 2 && productos.length === 0) {
      toast.error("Por favor, agrega al menos un producto");
      return;
    }
    
    setActiveStep(prev => Math.min(prev + 1, 3));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Navigate to previous step
  const prevStep = () => {
    setActiveStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Update cotizacion in database
  const handleUpdateCotizacion = async () => {
    console.log("Initiating update cotizacion process...");
    // Validation
    if (!cliente || !cliente.id) {
      toast.error("Por favor, selecciona o crea un cliente.");
      return;
    }
    if (productos.length === 0) {
      toast.error("Añade al menos un producto a la cotización.");
      return;
    }
    if (!cotizacionId) {
      toast.error("ID de cotización no encontrado.");
      return;
    }

    setIsSaving(true);
    try {
      // Prepare data for API
      const productosApiFormat = mapContextProductosToApi();
      console.log("Mapped products for API:", productosApiFormat);

      const cotizacionData = {
        cliente_id: cliente.id,
        moneda: moneda,
        tipo_cambio: (moneda === 'USD' ? exchangeRate : null),
        descuento_global: globalDiscount,
        iva: hasIva,
        // Send financials in the selected moneda using the financials object
        subtotal: financials.displaySubtotal, // Already in selected moneda
        costo_envio: financials.displayShippingCost, // Already in selected moneda
        incluye_envio: financials.shippingCostMXN > 0,
        total: financials.displayTotal, // Already in selected moneda
        // Also send MXN values for consistency in the DB
        subtotal_mxn: financials.baseSubtotalMXN, // Before global discount
        costo_envio_mxn: financials.shippingCostMXN,
        total_mxn: financials.totalMXN,
        // Estado might need specific logic if it can be changed here
        estado: cotizacionOriginal?.estado || 'pendiente', // Keep original state unless changed
        // Include products
        productos: productosApiFormat,
        // Metadata/optional fields
        // Add any other fields that might have been edited
      };

      console.log("Cotizacion ID for update:", cotizacionId);
      console.log("Data being sent to API:", cotizacionData);

      const response = await fetch(`/api/cotizaciones/${cotizacionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cotizacionData),
      });

      setIsSaving(false);

      if (response.ok) {
        const result = await response.json();
        console.log("API Update Response:", result);
        toast.success("Cotización actualizada exitosamente");
        router.push(`/dashboard/cotizaciones/${cotizacionId}`); // Redirect to view page
      } else {
        const errorData = await response.json();
        console.error("API Update Error:", errorData);
        toast.error(`Error al actualizar: ${errorData.message || response.statusText}`);
      }
    } catch (error) {
      setIsSaving(false);
      console.error("Error updating cotizacion:", error);
      toast.error("Ocurrió un error inesperado al guardar la cotización.");
    }
  };

  // Check if data has changed
  const hasDataChanged = () => {
    // Implement logic to compare current state with cotizacionOriginal
    // Compare client, moneda, globalDiscount, hasIva, shippingCost, productos array
    return true; // Placeholder - Implement actual comparison
  };

  // Map context products back to API format for saving
  const mapContextProductosToApi = () => {
    console.log(`[EditCotizacionClient] mapContextProductosToApi - Mapping ${productos.length} products for API. Moneda: ${moneda}, Rate: ${exchangeRate}`);
    return productos.map(p => {
      console.log("[EditCotizacionClient] mapContextProductosToApi - Processing product from context:", JSON.stringify(p));
      // Use the conversion functions from context
      const precioUnitarioDisplay = (moneda === 'USD' && exchangeRate) ? convertMXNtoUSD(p.precioMXN) : p.precioMXN;
      const subtotalDisplay = (moneda === 'USD' && exchangeRate) ? convertMXNtoUSD(p.subtotalMXN) : p.subtotalMXN;
      console.log(`[EditCotizacionClient] mapContextProductosToApi - Calculated Display Prices: Unit=${precioUnitarioDisplay}, Subtotal=${subtotalDisplay}. MXN Unit Price: ${p.precioMXN}`);

      return {
        cotizacion_producto_id: p.cotizacion_producto_id || undefined,
        producto_id: p.producto_id || undefined,
        cantidad: p.cantidad,
        precio_unitario: precioUnitarioDisplay, // Send price in selected moneda
        descuento_producto: p.descuento || 0,
        subtotal: subtotalDisplay, // Send subtotal in selected moneda
        // Include MXN versions for the API to potentially store
        precio_unitario_mxn: p.precioMXN,
        subtotal_mxn: p.subtotalMXN,
        // Optional fields if they were modified/relevant
        nombre: p.nombre, // Send name in case it was edited (if applicable)
        sku: p.sku,
        descripcion: p.descripcion,
        colores: p.colores,
        acabado: p.acabado,
      };
    });
  };

  // Format currency with proper conversion
  const formatCurrency = (amount: number): string => {
    // Simplified: Assume amount is already in the correct display currency from context
    if (isNaN(amount) || amount === null || amount === undefined) {
        return "---"; 
    }
    
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: moneda,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount); // Format the amount directly
  };

  // Handle currency change
  const handleCurrencyChange = (newCurrency: 'MXN' | 'USD') => {
    setMoneda(newCurrency);
  };

  // Handle adding a product to the cart
  const handleAddProduct = (producto: Producto) => {
    console.log("[EditCotizacionClient] handleAddProduct - Received:", JSON.stringify(producto));
    // Check if this product is already in context (by cotizacion_producto_id or producto_id)
    const existing = productos.find(
      p => (p.cotizacion_producto_id && p.cotizacion_producto_id === producto.cotizacion_producto_id) ||
           (p.producto_id && p.producto_id === producto.producto_id)
    );
    if (existing) {
      // Update the existing product (preserve cotizacion_producto_id and id)
      addProducto({
        ...producto,
        id: existing.id,
        cotizacion_producto_id: existing.cotizacion_producto_id,
        subtotal: producto.precio * producto.cantidad,
        sku: producto.sku || '',
        descripcion: producto.descripcion || '',
        colores: Array.isArray(producto.colores) ? producto.colores : [],
        acabado: producto.acabado || ''
      });
      toast.success('Producto actualizado en el carrito');
      return;
    }
    // For truly new products
    addProducto({
      ...producto,
      id: generateUniqueId(),
      cotizacion_producto_id: null,
      subtotal: producto.precio * producto.cantidad,
      sku: producto.sku || '',
      descripcion: producto.descripcion || '',
      colores: Array.isArray(producto.colores) ? producto.colores : [],
      acabado: producto.acabado || ''
    });
    toast.success('Producto agregado al carrito');
  };

  // Remove a product from the list
  const handleRemoveProduct = (id: string) => {
    removeProducto(id);
  };

  // Get CSS classes for step indicator
  const getStepClasses = (step: number) => {
    if (step < activeStep) {
      return "text-white bg-teal-500 ring-teal-500"; // completed
    } else if (step === activeStep) {
      return "text-teal-600 bg-white ring-teal-500"; // current
    } else {
      return "text-gray-400 bg-white ring-gray-200"; // upcoming
    }
  };

  // Define handlers for ClienteForm, wrapped in useCallback
  const handleClientSelect = useCallback((selected: Cliente | null, needsCreation?: boolean) => {
    console.log("Edit Page: Cliente selected/created in form:", selected, "Needs creation:", needsCreation);
    // Update the main cliente state used for saving the cotizacion
    setCliente(selected);
    // We might not need clienteData state if we directly use setCliente here?
    // Let's keep setClienteData for now in case other effects depend on it.
    setClienteData(selected);
    // If a new client is created, switch mode? Or let form handle it?
    // For edit, we probably just update the client state.
  }, []);

  const handleModeChange = useCallback((newMode: 'search' | 'create') => {
    setClienteFormMode(newMode);
    // If switching to create mode, potentially clear the client state?
    if (newMode === 'create') {
      // setCliente(null); // Optional: Clear if creating always means a new client instance
    }
  }, []);

  // Memoize initialData for ClienteForm
  // Use the 'cliente' state which is set when the cotizacion loads
  const clienteInitialData = useMemo(() => {
    return cliente || {};
  }, [cliente]);

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-emerald-500" />
          <p className="text-gray-500">Cargando cotización...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col items-center mb-12">
          <h1 className="text-2xl font-medium text-gray-900 mb-2">Editar Cotización</h1>
          <p className="text-gray-500 mb-8">Folio: {cotizacionOriginal?.folio}</p>
          
          {/* Step indicators */}
          <div className="flex w-full max-w-md justify-between relative">
            {/* Progress bar */}
            <div className="absolute top-4 left-0 w-full h-0.5 bg-gray-200">
              <div 
                className="absolute h-0.5 bg-teal-500 transition-all duration-500" 
                style={{ width: `${(activeStep - 1) * 50}%` }}
              ></div>
            </div>
            
            {/* Step 1 */}
            <div className="flex flex-col items-center relative z-10">
              <button 
                onClick={() => setActiveStep(1)}
                className={`
                  h-9 w-9 rounded-full ring-2 flex items-center justify-center
                  transition-all duration-200 font-medium text-sm
                  ${getStepClasses(1)}
                `}
              >
                1
              </button>
              <span className="mt-2 text-sm font-medium text-gray-700">Cliente</span>
            </div>
            
            {/* Step 2 */}
            <div className="flex flex-col items-center relative z-10">
              <button 
                onClick={() => cliente && setActiveStep(2)}
                className={`
                  h-9 w-9 rounded-full ring-2 flex items-center justify-center
                  transition-all duration-200 font-medium text-sm
                  ${getStepClasses(2)}
                `}
              >
                2
              </button>
              <span className="mt-2 text-sm font-medium text-gray-700">Productos</span>
            </div>
            
            {/* Step 3 */}
            <div className="flex flex-col items-center relative z-10">
              <button 
                onClick={() => cliente && productos.length > 0 && setActiveStep(3)}
                className={`
                  h-9 w-9 rounded-full ring-2 flex items-center justify-center
                  transition-all duration-200 font-medium text-sm
                  ${getStepClasses(3)}
                `}
              >
                3
              </button>
              <span className="mt-2 text-sm font-medium text-gray-700">Finalizar</span>
            </div>
          </div>
        </div>
        
        {/* Step content */}
        <div className="space-y-6">
          {/* Step 1: Cliente */}
          {activeStep === 1 && (
            <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100">
                <div className="flex items-center">
                  <User className="h-5 w-5 text-teal-600 mr-2" />
                  <h2 className="text-lg font-medium text-gray-900">Información del Cliente</h2>
                </div>
              </div>
              <div className="p-6">
                <ClienteForm 
                  onClientSelect={handleClientSelect}
                  initialData={clienteInitialData}
                  mode={clienteFormMode}
                  onModeChange={handleModeChange}
                />
              </div>
              <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t border-gray-100">
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/dashboard/cotizaciones')}
                  className="text-gray-600 border-gray-300 px-4 h-10 text-sm font-medium"
                  size="md"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={nextStep} 
                  disabled={!cliente} 
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 h-10 text-sm font-medium"
                  size="md"
                >
                  <span className="whitespace-nowrap">Continuar</span> <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          
          {/* Step 2: Productos */}
          {activeStep === 2 && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center">
                      <Package className="h-5 w-5 text-emerald-600 mr-2" />
                      <h2 className="text-lg font-medium text-gray-900">Agregar Productos</h2>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">Moneda:</span>
                      <Select
                        value={moneda}
                        onValueChange={(value: 'MXN' | 'USD') => handleCurrencyChange(value)}
                      >
                        <SelectTrigger className="w-[110px] h-9">
                          <SelectValue placeholder="Moneda" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MXN">MXN (Peso)</SelectItem>
                          <SelectItem value="USD">USD (Dólar)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <ProductoFormTabs onProductoChange={(producto: any) => {
                    if (producto) {
                      // Always set producto_id for new products
                      let productoIdValue = producto.producto_id;
                      // If producto_id is not set, try to use id if it's numeric
                      if (!productoIdValue && producto.id && /^\d+$/.test(producto.id)) {
                        productoIdValue = Number(producto.id);
                      }
                      const productoToAdd = {
                        id: "new",
                        nombre: producto.nombre || '',
                        cantidad: Number(producto.cantidad) || 1,
                        precio: producto.precio || 0,
                        descuento: producto.descuento || 0,
                        subtotal: (producto.precio || 0) * (Number(producto.cantidad) || 1),
                        sku: producto.sku || '',
                        descripcion: producto.descripcion || '',
                        colores: Array.isArray(producto.colores) 
                          ? producto.colores 
                          : typeof producto.colores === 'string' 
                            ? producto.colores.split(',') 
                            : [],
                        acabado: producto.acabado || '',
                        producto_id: productoIdValue || null
                      };
                      console.log("[EditCotizacionClient] onProductoChange - Producto to Add:", JSON.stringify(productoToAdd));
                      handleAddProduct(productoToAdd);
                    }
                  }} />
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100">
                  <div className="flex items-center">
                    <Receipt className="h-5 w-5 text-teal-600 mr-2" />
                    <h2 className="text-lg font-medium text-gray-900">Productos Seleccionados</h2>
                  </div>
                </div>
                <div className="p-6">
                  <ListaProductosConDescuento 
                    productos={productos} 
                    onRemoveProduct={handleRemoveProduct}
                    onUpdateProductDiscount={updateProductoDiscount}
                    moneda={moneda}
                  />
                </div>
              </div>
              
              <div className="flex justify-between px-0">
                <Button 
                  variant="outline" 
                  onClick={prevStep}
                  className="text-gray-600 border-gray-300 px-4 h-10 text-sm font-medium flex items-center"
                  size="md"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  <span className="whitespace-nowrap">Anterior</span>
                </Button>
                <Button 
                  onClick={nextStep} 
                  disabled={productos.length === 0}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 h-10 text-sm font-medium flex items-center"
                  size="md"
                >
                  <span className="whitespace-nowrap">Continuar</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          
          {/* Step 3: Resumen y finalización */}
          {activeStep === 3 && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-teal-600 mr-2" />
                    <h2 className="text-lg font-medium text-gray-900">Resumen de Cotización</h2>
                  </div>
                </div>
                <div className="p-6">
                  <ResumenCotizacion 
                    cliente={cliente} 
                    productos={productos}
                    moneda={moneda}
                    subtotal={financials.displaySubtotal}
                    globalDiscount={globalDiscount}
                    setGlobalDiscount={(value) => {
                      console.log("Setting global discount to:", value);
                      setGlobalDiscount(value);
                    }}
                    hasIva={hasIva}
                    setHasIva={setHasIva}
                    shippingCost={financials.displayShippingCost}
                    setShippingCost={(value) => {
                      console.log("Setting shipping cost to:", value);
                      setShippingCost(value);
                    }}
                    total={financials.displayTotal}
                  />
                </div>
              </div>
              
              <div className="flex justify-between px-0">
                <Button 
                  variant="outline" 
                  onClick={prevStep}
                  className="text-gray-600 border-gray-300 px-4 h-10 text-sm font-medium flex items-center"
                  size="md"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  <span className="whitespace-nowrap">Anterior</span>
                </Button>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        setIsSaving(true);
                        console.log("Starting PDF download for cotizacion ID:", cotizacionId);
                        const response = await fetch(`/api/cotizaciones?id=${cotizacionId}`);
                        
                        if (!response.ok) {
                          throw new Error(`Error fetching data: ${response.status} ${response.statusText}`);
                        }
                        
                        const data = await response.json();
                        
                        if (!data.cotizacion) {
                          throw new Error('No cotizacion data found in API response');
                        }

                        console.log(`Successfully fetched cotizacion with ${data.cotizacion.productos?.length || 0} products`);

                        // Dynamically import the PDF Wrapper component
                        const { default: PDFWrapper } = await import('@/components/cotizacion/pdf-wrapper');
                        
                        // Create a temporary container for the PDF renderer
                        const tempContainer = document.createElement('div');
                        tempContainer.style.position = 'absolute';
                        tempContainer.style.left = '-9999px';
                        document.body.appendChild(tempContainer);
                        
                        // Create a root for rendering the PDF wrapper
                        const { createRoot } = await import('react-dom/client');
                        const root = createRoot(tempContainer);
                        
                        console.log("Rendering PDF component with autoDownload=true");
                        // Render the PDF wrapper with autoDownload set to true
                        root.render(
                          <PDFWrapper
                            cliente={data.cotizacion.cliente}
                            folio={data.cotizacion.folio}
                            cotizacion={data.cotizacion}
                            autoDownload={true}
                          />
                        );
                        
                        // Clean up after a timeout to allow PDF generation to complete
                        setTimeout(() => {
                          if (tempContainer.parentNode) {
                            root.unmount();
                            document.body.removeChild(tempContainer);
                          }
                          setIsSaving(false);
                        }, 3000);
                      } catch (error) {
                        console.error('Error downloading PDF:', error);
                        toast.error(error instanceof Error 
                          ? `No se pudo descargar el PDF: ${error.message}` 
                          : "No se pudo descargar el PDF. Intente nuevamente.");
                        setIsSaving(false);
                      }
                    }}
                    disabled={isSaving}
                    className="border-emerald-500 text-emerald-500 hover:bg-emerald-50 px-4 h-10 text-sm font-medium flex items-center"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span className="whitespace-nowrap">Generando...</span>
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        <span className="whitespace-nowrap">Descargar PDF</span>
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={() => {
                      if (!isSaving) {
                        setIsSaving(true);
                        handleUpdateCotizacion().catch(() => setIsSaving(false));
                      }
                    }} 
                    disabled={isSaving}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 h-10 text-sm font-medium flex items-center"
                    size="md"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span className="whitespace-nowrap">Actualizando...</span>
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        <span className="whitespace-nowrap">Actualizar Cotización</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
