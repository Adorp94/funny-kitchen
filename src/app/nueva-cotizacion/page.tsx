"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, User, Package, Receipt, Save, DollarSign, FileText, Loader2, Check, AlertTriangle, CalendarClock, Crown } from "lucide-react";
import { ClienteForm } from "@/components/cotizacion/cliente-form";
import ProductoFormTabs from "@/components/cotizacion/producto-form-tabs";
import { ListaProductosConDescuento, ProductoConDescuento } from "@/components/cotizacion/lista-productos-con-descuento";
import { ResumenCotizacion } from "@/components/cotizacion/resumen-cotizacion";
import { useProductos, ProductosProvider } from "@/contexts/productos-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cliente } from "@/lib/supabase";
import { Producto as ProductoBase } from '@/components/cotizacion/producto-simplificado';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { formatCurrency } from '@/lib/utils';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

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

// Define type for ETA Result based on API response
interface ETAResult {
    dias_espera_moldes: number;
    dias_vaciado: number;
    dias_post_vaciado: number;
    dias_envio: number;
    dias_totales: number;
    semanas_min: number;
    semanas_max: number;
    fecha_inicio_vaciado: string | null; // Dates might come as strings
    fecha_fin_vaciado: string | null;
    fecha_entrega_estimada: string | null; 
}

function NuevaCotizacionClient() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<number>(1);
  
  // State for cliente
  const [clienteData, setClienteData] = useState<Cliente | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // State for Tiempo Estimado inputs (user override)
  const [tiempoEstimadoInput, setTiempoEstimadoInput] = useState<string>("6"); 
  const [tiempoEstimadoMaxInput, setTiempoEstimadoMaxInput] = useState<string>("8");

  // *** NEW State for Production/ETA ***
  const [isPremium, setIsPremium] = useState<boolean>(false); // Premium client flag
  const [etaResult, setEtaResult] = useState<ETAResult | null>(null); // Stores calculated ETA
  const [etaLoading, setEtaLoading] = useState<boolean>(false); // Loading state for ETA calculation
  const [etaError, setEtaError] = useState<string | null>(null); // Error state for ETA calculation
  // *** END NEW State ***

  // Add state for ClienteForm mode
  const [clienteFormMode, setClienteFormMode] = useState<'search' | 'create'>('search');

  // Get products & financials from context
  const {
    productos, 
    addProducto,
    removeProducto,
    updateProductoDiscount: handleUpdateProductDiscount,
    clearProductos, 
    financials, 
    exchangeRate,
    globalDiscount,
    setGlobalDiscount,
    hasIva, 
    setHasIva, 
    shippingCost, 
    setShippingCost, 
    moneda, 
    setMoneda,
    convertMXNtoUSD,
    convertUSDtoMXN
  } = useProductos();

  // Add formData state (Seems unused currently? Review if needed)
  const [formData, setFormData] = useState<ProductoFormData>({ tipo: 'nuevo' });

  // Debug logging for financial values (Updated to use financials object)
  useEffect(() => {
    console.log('--- Client Financial Debug Log ---');
    console.log(`Context Exchange Rate: ${exchangeRate}`);
    console.log(`Selected Moneda: ${moneda}`);
    console.log(`Financials Object:`, financials); 
    console.log('------------------------------------');
  }, [financials, moneda, exchangeRate]);

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
    // Development mode check remains the same...
    if (process.env.NODE_ENV === 'development') {
      console.log("Development mode detected: clearing non-product session storage");
      sessionStorage.removeItem('cotizacion_cliente');
      // Don't clear product context here anymore - context handles its own persistence
      // clearProductos(); 
      setClienteData(null);
      setCliente(null);
      // return; // Allow loading client data even in dev?
    }
    
    // Load client data (remains the same)
    const savedCliente = sessionStorage.getItem('cotizacion_cliente');
    if (savedCliente && !cliente) {
      try {
        const parsedCliente = JSON.parse(savedCliente);
        setClienteData(parsedCliente);
        setCliente(parsedCliente);
      } catch (e) { console.error("Error parsing saved client data:", e); }
    }
    // No need to call clearProductos here anymore on initial load
  }, []); // Removed clearProductos dependency
  
  // *** NEW: useEffect to fetch ETA when relevant data changes ***
  useEffect(() => {
    const fetchETA = async () => {
      // Only fetch if in Step 3 (Resumen) and there are products
      if (activeStep !== 3 || productos.length === 0) {
        setEtaResult(null); // Clear ETA if not on Step 3 or no products
        setEtaError(null);
        return;
      }

      // Filter products that have a valid ID (not custom ones like 'new-...')
      const productsForETA = productos.filter(p => 
          p.producto_id && 
          !isNaN(Number(p.producto_id)) && 
          p.producto_id > 0 // Ensure it's a positive ID
      );
      
      if (productsForETA.length === 0) {
          setEtaResult(null); // No valid products for ETA calculation
          setEtaError("No hay productos con ID válido para calcular el tiempo de producción.");
          return;
      }

      setEtaLoading(true);
      setEtaError(null);
      setEtaResult(null);

      let latestOverallETA: ETAResult | null = null;
      let fetchErrors: string[] = [];

      try {
        // Fetch ETA for each valid product individually
        const etaPromises = productsForETA.map(p => {
            const url = `/api/production/eta?productId=${p.producto_id}&qty=${p.cantidad}&premium=${isPremium}`;
            console.log(`Fetching ETA from: ${url}`);
            return fetch(url).then(async res => {
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({ error: `Error HTTP ${res.status}` }));
                    console.error(`Error fetching ETA for ${p.nombre}:`, errData);
                    fetchErrors.push(`ETA ${p.nombre}: ${errData.error || res.statusText}`);
                    return null; // Return null on error for this product
                }
                return res.json() as Promise<ETAResult>; 
            });
        });

        const results = await Promise.all(etaPromises);
        console.log("Individual ETA results:", results);
        
        // Find the latest ETA among successful results
        results.forEach(result => {
           if (result && result.fecha_entrega_estimada) {
               try {
                  const resultDate = new Date(result.fecha_entrega_estimada);
                  if (!isNaN(resultDate.getTime())) { // Check if date is valid
                     if (!latestOverallETA || resultDate > new Date(latestOverallETA.fecha_entrega_estimada!)) {
                         latestOverallETA = result;
                     }
                  } else {
                     console.warn("Received invalid date format for fecha_entrega_estimada:", result.fecha_entrega_estimada);
                  }
               } catch (dateError) {
                   console.warn("Error parsing date for fecha_entrega_estimada:", result.fecha_entrega_estimada, dateError);
               }
           }
        });

        if (latestOverallETA) {
            setEtaResult(latestOverallETA);
            console.log("Calculated Overall ETA:", latestOverallETA);
            if (fetchErrors.length > 0) {
                 // Show partial success/error
                 setEtaError(`Calculado, pero con errores: ${fetchErrors.join('; ')}`);
            }
        } else if (fetchErrors.length > 0) {
            // Only errors occurred
            setEtaError(fetchErrors.join('; '));
        } else {
            // No results and no specific errors (might happen if all products finish instantly?)
            setEtaError("No se pudo determinar una fecha de entrega estimada."); 
        }

      } catch (error: any) {
        console.error("Generic Error fetching ETA:", error);
        setEtaError(error.message || "Error al calcular tiempo de entrega.");
      } finally {
        setEtaLoading(false);
      }
    };

    fetchETA();
    // Dependencies: Recalculate if products change, premium status changes, or user reaches step 3
  }, [productos, isPremium, activeStep]); 
  // --- End NEW useEffect ---

  // Navigate to next/prev steps (Keep existing logic)
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
  const prevStep = () => {
    setActiveStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle generating the quotation (Updated to include isPremium)
  const handleGenerateCotizacion = async () => {
    if (!cliente || !financials) { 
      toast.error("Error: Faltan datos del cliente o financieros.");
      return;
    }
    if (productos.length === 0) {
      toast.error("Por favor, agrega al menos un producto");
      return;
    }
    
    setIsLoading(true);

    try {
      console.log("Client: Preparing quotation data for API & PDF...");
      
      // Use user input override for tiempo_estimado if available
      const finalTiempoEstimado = parseInt(tiempoEstimadoInput) || 6;
      const finalTiempoEstimadoMax = parseInt(tiempoEstimadoMaxInput) || finalTiempoEstimado + 2;

      // Prepare data for API call (Use MXN values from financials)
      const quotationData = {
        cliente: cliente,
        create_client_if_needed: !cliente.cliente_id || cliente.cliente_id === 0,
        productos: productos.map(p => ({
          nombre: p.nombre,
          cantidad: p.cantidad,
          precio_unitario_mxn: p.precioMXN, // Assumes context provides this
          subtotal_mxn: p.subtotalMXN,     // Assumes context provides this
          descuento: p.descuento,
          producto_id: p.producto_id || null, // Send null for custom items (IDs like 'new-...')
          sku: p.sku,
          descripcion: p.descripcion,
          colores: p.colores,
          acabado: p.acabado,
        })),
        moneda: moneda,
        subtotal_mxn: financials.baseSubtotalMXN, 
        costo_envio_mxn: financials.shippingCostMXN,
        total_mxn: financials.totalMXN,
        descuento_global: globalDiscount,
        iva: hasIva,
        monto_iva: financials.ivaAmountMXN, // Send calculated MXN IVA
        incluye_envio: financials.shippingCostMXN > 0,
        tipo_cambio: exchangeRate,
        tiempo_estimado: finalTiempoEstimado, // Send user input for now
        tiempo_estimado_max: finalTiempoEstimadoMax, // Send user input for now
        isPremium: isPremium // *** Pass the premium flag ***
      };
      console.log("Data being sent to API:", quotationData);
      
      // Call API 
      const response = await fetch('/api/cotizaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quotationData),
      });
      const result = await response.json();
      if (!response.ok) {
          console.error("API Error response:", result);
          throw new Error(result.error || 'Error al guardar la cotización');
      }
      
      // --- Handle response, PDF generation etc. --- 
      const cotizacionId = result.cotizacion_id;
      if (!cotizacionId) {
        throw new Error("API did not return a cotizacion_id after saving.");
      }

      // Update client state if created
      if (result.cliente_creado) {
        console.log("Client was created during quotation save:", result.cliente_creado);
        setClienteData(result.cliente_creado);
        setCliente(result.cliente_creado);
        sessionStorage.setItem('cotizacion_cliente', JSON.stringify(result.cliente_creado));
      }

      toast.success(`Cotización ${result.folio} creada exitosamente!`);
      console.log(`Cotización ${cotizacionId} guardada, PDF generation can proceed if needed...`);
      // Maybe trigger PDF generation here if required immediately
      
      // Clear context and session storage on success
      clearProductos();
      sessionStorage.removeItem('cotizacion_cliente'); 
      setIsPremium(false); // Reset premium flag
      // Reset manual time inputs
      setTiempoEstimadoInput("6");
      setTiempoEstimadoMaxInput("8");
      
      // Redirect to dashboard or quote view
      router.push('/dashboard/cotizaciones'); 
      // --- End existing success logic ---

    } catch (error: any) {
      setIsLoading(false);
      console.error("Error generating quotation:", error);
      toast.error(error.message || 'Error al generar la cotización');
    } 
  };

  // Handle currency change (Keep existing)
  const handleCurrencyChange = (newCurrency: 'MXN' | 'USD') => {
    setMoneda(newCurrency);
  };

  // Handle adding product (Fixed currency conversion logic)
  const handleAddProduct = (producto: Producto) => {
     console.log(`[NuevaCotizacionClient] handleAddProduct called with producto: ${JSON.stringify(producto)}`);
     
     // FIXED: Always assume price inputs are in MXN (base currency)
     // This prevents confusion about what currency users should enter
     const precioEnMXN = producto.precio_unitario || 0;
     
     console.log(`[NuevaCotizacionClient] Using MXN price directly: ${precioEnMXN} (no conversion applied)`);
     
     const productoBase: ProductoBase = {
       id: producto.id || producto.producto_id?.toString() || `new_${Date.now()}`,
       nombre: producto.nombre,
       precio: precioEnMXN, // Always use the input price as MXN base
       cantidad: Number(producto.cantidad) || 1,
       sku: producto.sku,
       descripcion: producto.descripcion,
       colores: Array.isArray(producto.colores) ? producto.colores : [],
       acabado: producto.acabado,
       descuento: producto.descuento || 0,
       producto_id: producto.producto_id,
     };
     console.log(`[NuevaCotizacionClient] Prepared productoBase for context (with MXN price): ${JSON.stringify(productoBase)}`);
     addProducto(productoBase); 
     toast.success("Producto agregado");
  };

  // Client select/mode handlers (Keep existing)
  const handleClientSelect = useCallback((selected: Cliente | null, needsCreation?: boolean) => {
     console.log("Cliente selected/created:", selected);
     setClienteData(selected);
  }, []); 
  const handleModeChange = useCallback((newMode: 'search' | 'create') => {
    setClienteFormMode(newMode);
  }, []);
  const clienteInitialData = useMemo(() => clienteData || {}, [clienteData]);

  // Step indicator component (Keep existing)
  const StepIndicator = ({ currentStep }: { currentStep: number }) => {
    const steps = ['Cliente', 'Productos', 'Resumen'];
    return (
      <nav aria-label="Progress" className="w-full max-w-3xl">
         <ol role="list" className="flex items-center w-full space-x-8 sm:space-x-16">
           {steps.map((name, stepIdx) => {
             const stepNumber = stepIdx + 1;
             const isCompleted = stepNumber < currentStep;
             const isCurrent = stepNumber === currentStep;
             const canNavigate = stepNumber < currentStep ||
                                (stepNumber === 3 && currentStep === 2 && productos.length > 0 && cliente) ||
                                (stepNumber === 2 && currentStep === 1 && cliente);

             return (
               <li key={name} className={`relative flex-1 ${stepIdx === steps.length - 1 ? 'flex-grow-0' : ''}`}>
                 {stepIdx < steps.length - 1 ? (
                   <div className={`absolute left-4 top-4 -ml-px h-0.5 ${isCompleted ? 'bg-primary' : 'bg-muted'} w-[calc(100%+2rem)] sm:w-[calc(100%+4rem)]`} aria-hidden="true" />
                 ) : null}
                 <button
                   onClick={() => {
                     if (canNavigate) {
                       setActiveStep(stepNumber);
                       window.scrollTo({ top: 0, behavior: 'smooth' });
                     }
                   }}
                   disabled={!canNavigate && !isCurrent}
                   className={`relative w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium z-10 transition-colors duration-200 ease-in-out ${isCompleted
                         ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                         : isCurrent
                         ? 'border-2 border-primary bg-background text-primary scale-110'
                         : 'border-2 border-muted bg-background text-muted-foreground hover:border-muted-foreground'
                     } ${!canNavigate && !isCurrent ? 'cursor-not-allowed opacity-60' : (canNavigate ? 'cursor-pointer' : '' )}`}
                   aria-current={isCurrent ? 'step' : undefined}
                 >
                   {isCompleted ? <Check className="h-5 w-5" /> : <span className="font-bold">{stepNumber}</span>}
                 </button>
                 <span className={`absolute top-full left-4 -translate-x-1/2 mt-2 text-xs font-medium whitespace-nowrap ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>{name}</span>
               </li>
             );
           })}
         </ol>
      </nav>
    );
  };

  // Input change handlers (Keep existing)
  const handleTiempoEstimadoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTiempoEstimadoInput(e.target.value);
  };
  const handleTiempoEstimadoMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTiempoEstimadoMaxInput(e.target.value);
  };
  const handleGlobalDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      setGlobalDiscount(isNaN(value) || value < 0 ? 0 : value);
  };
  const handleShippingCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      setShippingCost(isNaN(value) || value < 0 ? 0 : value);
  };
  const handleIvaChange = (checked: boolean) => {
    setHasIva(checked);
  };

  // --- Render Logic --- 
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Nueva Cotización
          </h1>
      </div>
      {/* Step Indicator */}
      <div className="flex justify-center pb-12">
         <StepIndicator currentStep={activeStep} />
      </div>

      {/* Step Content */}
      <div className="max-w-3xl mx-auto">
        {activeStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><User className="mr-2" /> Información del Cliente</CardTitle>
            </CardHeader>
            <CardContent>
               {/* Pass mode and onModeChange to ClienteForm */}
              <ClienteForm 
                onClientSelect={handleClientSelect} // Use the specific handler
                initialData={clienteInitialData} // Pass memoized initial data
                mode={clienteFormMode}
                onModeChange={handleModeChange} // Use the specific handler
              />
              {/* *** NEW: Premium Checkbox *** */} 
              <div className="mt-6 flex items-center space-x-2 bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-md border border-yellow-200 dark:border-yellow-800">
                  <Checkbox 
                      id="premium-cliente"
                      checked={isPremium}
                      onCheckedChange={(checked) => setIsPremium(checked as boolean)}
                      className="border-yellow-400 data-[state=checked]:bg-yellow-500 data-[state=checked]:text-yellow-foreground"
                  />
                  <Label htmlFor="premium-cliente" className="flex items-center font-medium text-yellow-800 dark:text-yellow-200">
                      <Crown className="h-4 w-4 mr-1.5 text-yellow-600 dark:text-yellow-400" /> Cliente Premium (Prioridad en Producción)
                  </Label>
                   <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 p-0 text-yellow-500 dark:text-yellow-600">
                            <AlertTriangle className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-sm">
                          <p>Marcar esta opción indica que el pedido de este cliente puede adelantarse en la cola de producción si es necesario, afectando los tiempos estimados de otros pedidos.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
              </div>
              {/* *** END NEW *** */} 
            </CardContent>
            <CardFooter className="justify-end">
              <Button onClick={nextStep} disabled={!cliente}><ArrowRight className="mr-2 h-4 w-4" /> Siguiente: Productos</Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 2: Productos */} 
        {activeStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Package className="mr-2" /> Agregar Productos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <ProductoFormTabs 
                  onProductoChange={handleAddProduct} 
              />
              <h3 className="text-lg font-semibold pt-4 border-t">Productos en la Cotización</h3>
              <ListaProductosConDescuento
                productos={productos} 
                onRemoveProduct={removeProducto} 
                onUpdateProductDiscount={handleUpdateProductDiscount}
                moneda={moneda}
              />
              {/* REMOVED Financial Inputs: Global Discount, IVA, Shipping from here */}
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="outline" onClick={prevStep}><ArrowLeft className="mr-2 h-4 w-4" /> Anterior: Cliente</Button>
              <Button onClick={nextStep} disabled={productos.length === 0}><ArrowRight className="mr-2 h-4 w-4" /> Siguiente: Resumen</Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 3: Resumen */} 
        {activeStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Receipt className="mr-2" /> Resumen de Cotización</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <ResumenCotizacion 
                  productos={productos}
                  moneda={moneda}
                  subtotal={moneda === 'MXN' ? (financials?.baseSubtotalMXN ?? 0) : (financials?.baseSubtotalMXN ? convertMXNtoUSD(financials.baseSubtotalMXN) : 0)}
                  ivaAmount={financials?.displayIvaAmount ?? 0}
                  globalDiscount={globalDiscount} 
                  hasIva={hasIva}
                  shippingCost={shippingCost}
                  total={financials?.displayTotal ?? 0}
                  setGlobalDiscount={setGlobalDiscount} 
                  setHasIva={setHasIva} 
                  setShippingCost={setShippingCost}
                  tiempoEstimado={tiempoEstimadoInput}
                  setTiempoEstimado={handleTiempoEstimadoChange}
                  tiempoEstimadoMax={tiempoEstimadoMaxInput}
                  setTiempoEstimadoMax={handleTiempoEstimadoMaxChange}
                  etaResult={etaResult}
                  etaLoading={etaLoading}
                  etaError={etaError}
                  cliente={cliente}
              />
               {/* Currency Selector */} 
               <div className="flex justify-end items-center space-x-2 pt-4 border-t">
                   <Label>Moneda de Visualización:</Label>
                  <Select value={moneda} onValueChange={(value: 'MXN' | 'USD') => setMoneda(value)}>
                      <SelectTrigger className="w-[100px]">
                          <SelectValue placeholder="Moneda" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="MXN">MXN</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                  </Select>
               </div>
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="outline" onClick={prevStep}><ArrowLeft className="mr-2 h-4 w-4" /> Anterior: Productos</Button>
              <Button 
                  onClick={handleGenerateCotizacion}
                  disabled={isLoading || !cliente || productos.length === 0}
              >
                  {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                      <Save className="mr-2 h-4 w-4" /> // Reverted Icon
                  )}
                  {isLoading ? 'Guardando...' : 'Guardar Cotización'} {/* Reverted Text */} 
              </Button>
            </CardFooter>
          </Card>
        )}
      </div> 
    </div>
  );
}

// Wrap the client component with the provider
export default function NuevaCotizacionPage() {
  return (
    <ProductosProvider>
      <NuevaCotizacionClient />
    </ProductosProvider>
  );
}
