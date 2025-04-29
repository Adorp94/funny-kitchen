"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, User, Package, Receipt, Save, DollarSign, FileText, Loader2 } from "lucide-react";
import { ClienteForm } from "@/components/cotizacion/cliente-form";
import ProductoFormTabs from "@/components/cotizacion/producto-form-tabs";
import { ListaProductos } from "@/components/cotizacion/lista-productos";
import { ListaProductosConDescuento, ProductoConDescuento } from "@/components/cotizacion/lista-productos-con-descuento";
import { ResumenCotizacion } from "@/components/cotizacion/resumen-cotizacion";
import { useProductos, ProductosProvider } from "@/contexts/productos-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cliente } from "@/lib/supabase";
import { Producto as ProductoBase } from '@/components/cotizacion/producto-simplificado';
import { PDFService } from "@/services/pdf-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ExtendedProductoBase extends ProductoBase {
  cantidad: number;
  sku?: string;
  descripcion?: string;
  colores?: string[];
  acabado?: string;
  descuento: number;
}

// Define the Producto interface properly
interface Producto extends ExtendedProductoBase {
  subtotal: number;
  producto_id?: number | null;
}

// Define the form data interface to fix the 'formData' errors
interface ProductoFormData {
  tipo: 'nuevo' | 'existente';
  producto?: any;
  cantidad?: number;
  [key: string]: any; // Allow additional properties
}

// Define a more explicit type for the API's product format
interface ApiProducto {
  producto_id?: string | number;
  nombre: string;
  cantidad: number | string;
  precio: number;
  descuento?: number;
  sku?: string;
  descripcion?: string;
  colores?: string[] | string;
  acabado?: string;
}

// Extend ProductoBase with additional properties
interface ExtendedProducto extends ProductoBase {
  descuento: number;
  sku: string;
  descripcion: string;
  colores: string[];
  acabado: string;
}

// Create a client component that uses the context
function NuevaCotizacionClient() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<number>(1);
  
  // State for cliente
  const [clienteData, setClienteData] = useState<Cliente | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [hasIva, setHasIva] = useState(false);
  const [shippingCost, setShippingCost] = useState(0);
  const [moneda, setMoneda] = useState<'MXN' | 'USD'>('MXN');
  const [tiempoEstimado, setTiempoEstimado] = useState<number>(6);
  const [tiempoEstimadoMax, setTiempoEstimadoMax] = useState<number>(8);
  // Add state for ClienteForm mode
  const [clienteFormMode, setClienteFormMode] = useState<'search' | 'create'>('search');

  // Get productos from context
  const {
    productos,
    addProducto,
    removeProducto,
    updateProductoDiscount: handleUpdateProductDiscount,
    clearProductos, 
    financials,
    exchangeRate,
    setGlobalDiscount: setContextGlobalDiscount,
    setHasIva: setContextHasIva,
    setShippingCost: setContextShippingCost,
    setMoneda: setContextMoneda,
    convertMXNtoUSD,
    convertUSDtoMXN
  } = useProductos();

  // Add formData state
  const [formData, setFormData] = useState<ProductoFormData>({ tipo: 'nuevo' });

  // Synchronize local state with context state
  useEffect(() => {
    setContextGlobalDiscount(globalDiscount);
  }, [globalDiscount, setContextGlobalDiscount]);

  useEffect(() => {
    setContextHasIva(hasIva);
  }, [hasIva, setContextHasIva]);

  useEffect(() => {
    setContextShippingCost(shippingCost);
  }, [shippingCost, setContextShippingCost]);

  useEffect(() => {
    setContextMoneda(moneda);
  }, [moneda, setContextMoneda]);

  // Debug logging for financial values
  useEffect(() => {
    console.log('Financial values updated:');
    console.log(`Global Discount: ${globalDiscount}%`);
    console.log(`Has IVA: ${hasIva}`);
    console.log(`Shipping Cost: ${shippingCost} ${moneda}`);
    console.log(`Display Subtotal: ${financials.displaySubtotal}`);
    console.log(`Display Total: ${financials.displayTotal}`);
    console.log(`Exchange Rate: ${exchangeRate}`);
  }, [globalDiscount, hasIva, shippingCost, financials, moneda, exchangeRate]);

  // Use effect to update cliente state after render
  useEffect(() => {
    // If clienteData is null, reset the cliente state to ensure consistency
    if (clienteData === null) {
      setCliente(null);
      // Also clear from sessionStorage to avoid persistence of old client data
      sessionStorage.removeItem('cotizacion_cliente');
    } else if (clienteData) {
      setCliente(clienteData);
      // Store the updated client data in session storage
      sessionStorage.setItem('cotizacion_cliente', JSON.stringify(clienteData));
    }
  }, [clienteData]);
  
  // Add a useEffect to preserve client data when navigating between steps
  useEffect(() => {
    // Save client data to sessionStorage whenever it changes
    if (cliente) {
      sessionStorage.setItem('cotizacion_cliente', JSON.stringify(cliente));
    }
  }, [cliente]);

  // Add a useEffect to load any previously saved client data on component mount
  useEffect(() => {
    // Check if we're in development mode
    if (process.env.NODE_ENV === 'development') {
      // Clear all session storage in development mode
      console.log("Development mode detected: clearing all session storage");
      sessionStorage.removeItem('cotizacion_cliente');
      sessionStorage.removeItem('cotizacion_productoForm');
      sessionStorage.removeItem('navigationOccurred');
      
      // Reset client state
      setClienteData(null);
      setCliente(null);
      
      // Clear products context
      clearProductos();
      
      return; // Skip loading from session storage
    }
    
    // In production, try to load any saved client data from sessionStorage
    const savedCliente = sessionStorage.getItem('cotizacion_cliente');
    if (savedCliente && !cliente) {
      try {
        const parsedCliente = JSON.parse(savedCliente);
        setClienteData(parsedCliente);
        setCliente(parsedCliente);
      } catch (e) {
        console.error("Error parsing saved client data:", e);
      }
    }
  }, []);
  
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

  // Handle generating the quotation
  const handleGenerateCotizacion = async () => {
    if (!cliente) {
      toast.error("Por favor, ingresa la información del cliente");
      return;
    }
    
    if (productos.length === 0) {
      toast.error("Por favor, agrega al menos un producto");
      return;
    }
    
    setIsLoading(true);

    try {
      // Calculate IVA amount
      const montoIva = hasIva ? financials.displaySubtotal * 0.16 : 0;
      
      // Handle shipping cost based on currency
      // If in USD, the shippingCost is already in USD, but our context works in MXN
      // We need to pass shipping cost in the way the API expects it
      // The API will further handle the conversion as needed
      
      console.log("Preparing quotation data:");
      console.log(`Currency: ${moneda}`);
      console.log(`Shipping cost: ${shippingCost} ${moneda}`);
      console.log(`Exchange rate: ${exchangeRate}`);
      console.log(`Total: ${financials.displayTotal}`);
      console.log(`Tiempo estimado: ${tiempoEstimado} a ${tiempoEstimadoMax} semanas`);
      
      // Prepare data for API call, including all client data
      // This passes the client information to the API, which can create the client if needed
      const quotationData = {
        cliente: cliente,
        create_client_if_needed: !cliente.cliente_id || cliente.cliente_id === 0,
        productos: productos.map(p => ({
          ...p,
          // Use the database producto_id if available
          producto_id: p.producto_id || undefined,
          // Use context's conversion function
          precio_unitario: (moneda === 'USD' && exchangeRate) ? convertMXNtoUSD(p.precioMXN) : p.precioMXN,
          subtotal: (moneda === 'USD' && exchangeRate) ? convertMXNtoUSD(p.subtotalMXN) : p.subtotalMXN,
          // Also send MXN values
          precio_unitario_mxn: p.precioMXN,
          subtotal_mxn: p.subtotalMXN,
        })),
        moneda: moneda,
        // Send financials IN MXN only, plus moneda and rate
        subtotal_mxn: financials.baseSubtotalMXN,
        costo_envio_mxn: financials.shippingCostMXN,
        total_mxn: financials.totalMXN,
        // Remove display values to avoid API confusion
        // subtotal: financials.displaySubtotal, 
        // costo_envio: financials.displayShippingCost, 
        // total: financials.displayTotal,
        // Send MXN values for DB consistency
        // subtotal_mxn: financials.baseSubtotalMXN, // Duplicated
        // costo_envio_mxn: financials.shippingCostMXN, // Duplicated
        // total_mxn: financials.totalMXN, // Duplicated
        descuento_global: globalDiscount,
        iva: hasIva,
        monto_iva: financials.ivaAmountMXN, // Send IVA amount in MXN
        incluye_envio: financials.shippingCostMXN > 0, // Determine based on MXN cost
        // costo_envio: shippingCost, // Remove display value
        tipo_cambio: exchangeRate, // Send the rate used
        tiempo_estimado: tiempoEstimado,
        tiempo_estimado_max: tiempoEstimadoMax
      };
      
      // Call API to save quotation (and client if needed)
      const response = await fetch('/api/cotizaciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quotationData),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al guardar la cotización');
      }
      
      // If a new client was created, update our state
      if (result.cliente_creado) {
        console.log("Client was created during quotation:", result.cliente_creado);
        setClienteData(result.cliente_creado);
        setCliente(result.cliente_creado);
        sessionStorage.setItem('cotizacion_cliente', JSON.stringify(result.cliente_creado));
      }
      
      // Create cotizacion object for PDF generation
      const cotizacionForPDF = {
        id: result.cotizacion_id,
        folio: result.folio,
        moneda: moneda,
        // Use the financials directly, they are already in the correct display currency
        subtotal: financials.displaySubtotal,
        descuento_global: globalDiscount,
        iva: hasIva,
        monto_iva: financials.displayIvaAmount,
        incluye_envio: financials.shippingCostMXN > 0, // Base decision on MXN value
        costo_envio: financials.displayShippingCost, // Use display cost for PDF
        total: financials.displayTotal,
        tipo_cambio: exchangeRate,
        tiempo_estimado: tiempoEstimado,
        tiempo_estimado_max: tiempoEstimadoMax,
        // Map products for PDF - Ensure prices are in the display currency
        productos: productos.map(p => ({
          ...p,
          // The 'precio' and 'subtotal' in the context state (ProductoEnContext)
          // are already recalculated to the display currency by the context's effect
          precio_unitario: p.precio, // Use the display price from context state
          subtotal: p.subtotal,   // Use the display subtotal from context state
          // No need for conversion here
        }))
      };
      
      console.log("Generating PDF with tiempo_estimado:", tiempoEstimado, "to", tiempoEstimadoMax);
      console.log("PDF data:", cotizacionForPDF);
      
      // Generate PDF directly
      try {
        await PDFService.generateReactPDF(
          cliente,
          result.folio,
          cotizacionForPDF,
          { download: true, filename: `${result.folio}-${cliente.nombre.replace(/\s+/g, '-')}.pdf` }
        );
        
        toast.success(`Cotización ${result.folio} generada exitosamente`);
      } catch (pdfError) {
        console.error("Error generating PDF:", pdfError);
        toast.error("La cotización fue guardada pero hubo un error al generar el PDF");
      }
      
      // Clear context data after successful save
      clearProductos();
      setGlobalDiscount(0);
      setHasIva(false);
      setShippingCost(0);
      setTiempoEstimado(6);
      setTiempoEstimadoMax(8);
      
      // Navigate to the cotizaciones page
      router.push('/dashboard/cotizaciones');
      
    } catch (error) {
      console.error('Error generating quotation:', error);
      setIsLoading(false);
      toast.error(error instanceof Error ? error.message : "Error al generar la cotización");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Format currency with proper conversion
  const formatCurrency = (amount: number): string => {
    // The 'amount' passed here should already be in the correct display currency
    // because it comes from financials.displayTotal, etc.
    // The context handles the conversion based on the selected 'moneda'.
    // We just need to format it using the correct currency code.
    
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: moneda, // Use the context's moneda state
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount); // Format the amount directly
  };

  // Handle currency change
  const handleCurrencyChange = (newCurrency: 'MXN' | 'USD') => {
    console.log(`Changing currency from ${moneda} to ${newCurrency}`);
    setMoneda(newCurrency);
  };

  // Handle adding a product to the cart
  const handleAddProduct = (producto: Producto) => {
    console.log(`[NuevaCotizacionClient] handleAddProduct called with producto: ${JSON.stringify(producto)}`);

    // Extract price from the incoming producto object
    // This price IS ALREADY in the selected currency (moneda) because it comes from the form
    const precioEnMonedaActual = producto.precio || 0;
    console.log(`[NuevaCotizacionClient]   - Extracted precioEnMonedaActual: ${precioEnMonedaActual} (${moneda})`);

    // Create a base product object without context-specific fields
    const productoBase: Producto = {
      ...producto,
      // Ensure cantidad is a number
      cantidad: Number(producto.cantidad) || 1,
      // Use the extracted price
      precio: precioEnMonedaActual,
      // Initial subtotal calculation (will be refined in context)
      subtotal: precioEnMonedaActual * (Number(producto.cantidad) || 1),
      // Set default discount
      descuento: producto.descuento || 0,
      // Use producto_id if available
      producto_id: producto.producto_id || null,
      // Fill in other details if available
      sku: producto.sku || "",
      descripcion: producto.descripcion || "",
      colores: Array.isArray(producto.colores) ? producto.colores : 
              typeof producto.colores === 'string' ? producto.colores.split(',') : [],
      acabado: producto.acabado || ""
    };
    console.log(`[NuevaCotizacionClient]   - Prepared productoBase: ${JSON.stringify(productoBase)}`);

    // Call the context's addProducto, passing the base product and the price in the current currency
    addProducto(productoBase, precioEnMonedaActual);
    
    toast.success('Producto agregado al carrito');
    
    // Reset the form after adding
    setFormData({ tipo: 'nuevo' });
  };

  // Define handlers for ClienteForm, wrapped in useCallback
  const handleClientSelect = useCallback((selected: Cliente | null, needsCreation?: boolean) => {
    console.log("Cliente selected/created in form:", selected, "Needs creation:", needsCreation);
    // Update clienteData which triggers the useEffect to update the confirmed 'cliente'
    setClienteData(selected);
    // We don't need to manage needsCreation here, API call handles it
  }, []); // No dependencies needed as setClienteData is stable

  const handleModeChange = useCallback((newMode: 'search' | 'create') => {
    setClienteFormMode(newMode);
  }, []); // No dependencies needed as setClienteFormMode is stable

  // Memoize initialData for ClienteForm if derived from state
  const clienteInitialData = useMemo(() => {
    // Pass the current client data if available, otherwise empty object
    return clienteData || {};
  }, [clienteData]);

  return (
    <div className="flex flex-col flex-1 py-6 md:py-8 gap-y-4 md:gap-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between max-w-4xl mx-auto w-full px-4">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          Nueva Cotización
        </h1>
      </div>

      {/* Step Indicator using background tracks */} 
      <div className="max-w-4xl mx-auto w-full px-4 mb-4 md:mb-6">
        <nav aria-label="Progress">
           {/* OL is relative to contain the absolute track lines */}
          <ol role="list" className="relative flex justify-between items-start w-full">
            {/* Background Track */}
            <div className="absolute left-0 top-[15px] h-0.5 w-full bg-gray-200 dark:bg-gray-700" aria-hidden="true"></div>
            {/* Progress Track - Width based on activeStep */}
            <div 
              className="absolute left-0 top-[15px] h-0.5 bg-primary transition-all duration-300 ease-in-out"
              style={{ width: `${((activeStep - 1) / 2) * 100}%` }} // 0/2=0%, 1/2=50%, 2/2=100%
              aria-hidden="true"
            ></div>

            {[1, 2, 3].map((step, stepIdx) => (
              // LI is relative z-10 to sit above tracks
              <li key={step} className={`relative z-10 flex flex-col items-center`}>
                {/* REMOVED internal line logic */}
                 
                {/* Completed Step Button/Icon/Text */}
                {step < activeStep ? (
                  <>
                    <button
                      onClick={() => setActiveStep(step)}
                      // Use bg-primary directly, border might be visible below
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white"
                    >
                       <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <span className="mt-2 text-xs font-medium text-primary whitespace-nowrap">{['Cliente', 'Productos', 'Finalizar'][stepIdx]}</span>
                  </>
                ) : step === activeStep ? (
                  /* Current Step Button/Icon/Text */
                  <>
                     <button
                      onClick={() => setActiveStep(step)}
                      // Ensure background covers the track line below
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-background text-primary"
                      aria-current="step"
                    >
                      <span className="text-xs font-semibold">{step}</span> 
                    </button>
                    <span className="mt-2 text-xs font-medium text-primary whitespace-nowrap">{['Cliente', 'Productos', 'Finalizar'][stepIdx]}</span>
                  </>
                ) : (
                  /* Upcoming Step Button/Icon/Text */
                  <>
                     <button
                       onClick={() => { /* ... click handler ... */ }}
                       // Ensure background covers the track line below
                       className="group flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-background text-gray-400 hover:border-primary hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:text-gray-500 dark:hover:border-primary dark:hover:text-primary"
                      disabled={(step === 2 && !cliente) || (step === 3 && (!cliente || productos.length === 0))}
                    >
                      <span className="text-xs font-semibold">{step}</span>
                    </button>
                    <span className="mt-2 text-xs font-medium text-muted-foreground whitespace-nowrap">{['Cliente', 'Productos', 'Finalizar'][stepIdx]}</span>
                  </>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Container for Step Content */}
      <div className="max-w-4xl mx-auto w-full">
        <div>
          {activeStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 text-primary mr-2" />
                  Información del Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ClienteForm 
                  onClientSelect={handleClientSelect} 
                  initialData={clienteInitialData} // Use memoized data
                  mode={clienteFormMode}
                  onModeChange={handleModeChange}
                />
              </CardContent>
               <div className="flex justify-between items-center px-6 py-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => router.push('/dashboard/cotizaciones')}
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={nextStep} 
                    disabled={!cliente || isLoading} 
                  >
                    <span className="whitespace-nowrap">Continuar</span> <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
            </Card>
          )}
          
          {activeStep === 2 && (
             <div className="space-y-6">
                <Card>
                  <CardHeader>
                     <CardTitle className="flex items-center">
                        <Package className="h-5 w-5 text-primary mr-2" />
                        Agregar Productos
                      </CardTitle>
                  </CardHeader>
                  <CardContent>
                     <ProductoFormTabs onProductoChange={(producto: any) => {
                        if (producto) {
                          const productoToAdd = {
                            id: producto.producto_id ? String(producto.producto_id) : ('new-' + Date.now()), // Use timestamp for new IDs
                            nombre: producto.nombre || '',
                            cantidad: Number(producto.cantidad) || 1,
                            precio: producto.precio_unitario || 0,
                            descuento: producto.descuento || 0,
                            subtotal: (producto.precio_unitario || 0) * (Number(producto.cantidad) || 1),
                            sku: producto.sku || '',
                            descripcion: producto.descripcion || '',
                            colores: Array.isArray(producto.colores) 
                              ? producto.colores 
                              : typeof producto.colores === 'string' 
                                ? producto.colores.split(',') 
                                : [],
                            acabado: producto.acabado || '',
                            producto_id: producto.producto_id || null
                          };
                          
                          // Simplified logic - find by matching producto_id if exists, otherwise by name if new
                          const existingProductIndex = productos.findIndex(
                             p => (productoToAdd.producto_id && p.producto_id === productoToAdd.producto_id) || 
                                  (!productoToAdd.producto_id && p.nombre === productoToAdd.nombre)
                          );
                          
                          if (existingProductIndex >= 0) {
                            const updatedProductos = [...productos];
                            const existingProduct = updatedProductos[existingProductIndex];
                            
                            const newQuantity = existingProduct.cantidad + productoToAdd.cantidad;
                            const unitPrice = productoToAdd.precio; // Price from the form
                            const discount = productoToAdd.descuento; // Discount from the form
                            
                            updatedProductos[existingProductIndex] = {
                              ...existingProduct,
                              cantidad: newQuantity,
                              // Update price in case it changed in the form
                              precio: unitPrice, // Update display price
                              // Update discount in case it changed
                              descuento: discount, 
                              // Recalculate display subtotal for the updated product
                              subtotal: unitPrice * newQuantity * (1 - (discount || 0) / 100),
                              // We need precioMXN to be updated by the context's logic
                            };
                            
                            // Let's remove the existing one and add the updated one with correct args
                            removeProducto(existingProduct.id);
                            // Call addProducto correctly for the updated item
                            addProducto(
                              updatedProductos[existingProductIndex],
                              unitPrice // Pass the unit price in current currency
                            );
                            
                            toast.success(`Se actualizó el producto "${productoToAdd.nombre}" (${newQuantity} unidades)`);
                          } else {
                            // Calculate subtotal considering discount
                            const unitPrice = productoToAdd.precio; // Use the price from productoToAdd
                            const subtotalWithDiscount = unitPrice * productoToAdd.cantidad * (1 - (productoToAdd.descuento || 0) / 100);
                            
                            // Call addProducto correctly with TWO arguments
                            addProducto(
                              {
                                ...productoToAdd,
                                subtotal: subtotalWithDiscount,
                              },
                              unitPrice // Pass the unit price in current currency
                            );
                            toast.success(`Se agregó "${productoToAdd.nombre}" a la cotización`);
                          }
                        }
                      }} />
                  </CardContent>
                </Card>
                
                {cliente && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-base font-medium">
                        Cliente Seleccionado
                      </CardTitle>
                      <Button 
                        variant="link"
                        className="h-auto p-0 text-primary" 
                        onClick={() => setActiveStep(1)}
                      >
                        Cambiar
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 text-sm">
                        <p className="font-semibold text-foreground">{cliente.nombre}</p>
                        <p className="text-muted-foreground">{cliente.celular}</p>
                        {cliente.correo && <p className="text-muted-foreground">{cliente.correo}</p>}
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {productos.length > 0 && (
                  <Card>
                     <CardHeader>
                      <CardTitle className="flex items-center">
                        <Receipt className="h-5 w-5 text-primary mr-2" />
                        Productos Seleccionados
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ListaProductos 
                        productos={productos}
                        onRemoveProduct={(id) => removeProducto(id)}
                        moneda={moneda}
                      />
                    </CardContent>
                  </Card>
                )}
                
                <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-3 sm:gap-4">
                  <Button 
                    variant="outline" 
                    onClick={prevStep}
                    className="w-full sm:w-auto"
                    disabled={isLoading}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" /> 
                    <span>Regresar</span>
                  </Button>
                  <Button 
                    onClick={nextStep} 
                    disabled={productos.length === 0 || isLoading} 
                    className="w-full sm:w-auto"
                    variant="default"
                  >
                    <span>Continuar</span> 
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
            </div>
          )}
          
          {activeStep === 3 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                   <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <CardTitle className="flex items-center">
                      <FileText className="h-5 w-5 text-primary mr-2" />
                      Resumen de Cotización
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">Moneda:</span>
                        <Select value={moneda} onValueChange={(value: 'MXN' | 'USD') => setMoneda(value)}>
                          <SelectTrigger className="w-[100px] h-9">
                            <SelectValue placeholder="Moneda" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MXN">MXN</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                   <div>
                      <h3 className="text-base font-medium text-foreground mb-3">Productos</h3>
                      <ListaProductosConDescuento 
                        productos={productos}
                        onRemoveProduct={(id) => removeProducto(id)}
                        onUpdateProductDiscount={handleUpdateProductDiscount}
                        moneda={moneda}
                      />
                    </div>
                    
                    <div>
                       <h3 className="text-base font-medium text-foreground mb-3">Totales y Opciones</h3>
                       <ResumenCotizacion 
                         cliente={cliente}
                         productos={productos}
                         moneda={moneda}
                         subtotal={financials.displaySubtotal}
                         globalDiscount={globalDiscount}
                         setGlobalDiscount={setGlobalDiscount}
                         hasIva={hasIva}
                         setHasIva={setHasIva}
                         shippingCost={shippingCost}
                         setShippingCost={setShippingCost}
                         total={financials.displayTotal}
                         tiempoEstimado={tiempoEstimado}
                         setTiempoEstimado={setTiempoEstimado}
                         tiempoEstimadoMax={tiempoEstimadoMax}
                         setTiempoEstimadoMax={setTiempoEstimadoMax}
                       />
                    </div>
                </CardContent>
              </Card>
              
              <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-3 sm:gap-4">
                <Button 
                  variant="outline" 
                  onClick={prevStep}
                  className="w-full sm:w-auto"
                  disabled={isLoading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> 
                  <span>Regresar</span>
                </Button>
                <Button 
                  onClick={handleGenerateCotizacion}
                  disabled={isLoading || productos.length === 0 || !cliente} // Also disable if no client
                  className="w-full sm:w-auto"
                  variant="default"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span>Generando...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" /> 
                      <span>Generar Cotización y PDF</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Create the wrapper component that includes the Provider
export default function NuevaCotizacionPage() {
  return (
    <ProductosProvider>
      <NuevaCotizacionClient />
    </ProductosProvider>
  );
}
