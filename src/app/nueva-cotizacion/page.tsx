"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, User, Package, Receipt, Save, DollarSign, FileText, Loader2, Check } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { generateQuotationPDF } from "@/app/actions/pdf-actions";
import { generateUniqueId } from "@/lib/utils/misc";
import { formatCurrency } from '@/lib/utils';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

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
  
  // --- Local state now primarily forTiempo Estimado ---
  // Other financial states (discount, iva, shipping, moneda) are managed by context
  const [tiempoEstimado, setTiempoEstimado] = useState<number>(6);
  const [tiempoEstimadoMax, setTiempoEstimadoMax] = useState<number | string>(8); // Allow string for empty input
  const [incluyeEnvio, setIncluyeEnvio] = useState<boolean>(false);
  // -----------------------------------------------------

  // Add state for ClienteForm mode
  const [clienteFormMode, setClienteFormMode] = useState<'search' | 'create'>('search');

  // Get productos from context
  const {
    productos, // This is now displayProductos
    addProducto,
    removeProducto,
    updateProductoDiscount: handleUpdateProductDiscount,
    clearProductos, 
    financials, // Contains all calculated values (display and MXN)
    exchangeRate,
    globalDiscount, // Get directly from context
    setGlobalDiscount, // Use context setter directly
    hasIva, // Get directly from context
    setHasIva, // Use context setter directly
    shippingCost, // Get input value directly from context
    setShippingCost, // Use context setter directly
    moneda, // Get directly from context
    setMoneda, // Use context setter directly
    convertMXNtoUSD,
    convertUSDtoMXN
  } = useProductos();

  // Add formData state
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
  
  // Effect to set shipping cost to 0 if 'incluyeEnvio' is unchecked
  useEffect(() => {
    if (!incluyeEnvio) {
      setShippingCost(0);
    }
  }, [incluyeEnvio, setShippingCost]);

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
  
  // Navigate to next step (remains the same)
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
  
  // Navigate to previous step (remains the same)
  const prevStep = () => {
    setActiveStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle generating the quotation (Updated to use context financials correctly)
  const handleGenerateCotizacion = async () => {
    if (!cliente || !financials) { // Check financials exist
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
      console.log("Context Financials:", financials);
      console.log(`Client State Tiempo Estimado: ${tiempoEstimado}-${tiempoEstimadoMax}`);

      // Prepare data for API call (Use MXN values from financials)
      const quotationData = {
        cliente: cliente,
        create_client_if_needed: !cliente.cliente_id || cliente.cliente_id === 0,
        // Map DISPLAY products from context, but extract MXN values for API
        productos: productos.map(p => ({
          nombre: p.nombre,
          cantidad: p.cantidad,
          // --- Get MXN values which MUST exist on the display product object now --- 
          precio_unitario_mxn: p.precioMXN, // Assuming display product retains MXN price
          subtotal_mxn: p.subtotalMXN,     // Assuming display product retains MXN subtotal
          // --------------------------------------------------------------------------
          descuento: p.descuento,
          producto_id: p.producto_id || undefined,
          sku: p.sku,
          descripcion: p.descripcion,
          colores: p.colores,
          acabado: p.acabado,
        })),
        moneda: moneda,
        subtotal_mxn: financials.baseSubtotalMXN, // Use BASE subtotal before global discount
        costo_envio_mxn: financials.shippingCostMXN,
        total_mxn: financials.totalMXN,
        descuento_global: globalDiscount,
        iva: hasIva,
        monto_iva: financials.ivaAmountMXN,
        incluye_envio: financials.shippingCostMXN > 0,
        tipo_cambio: exchangeRate,
        tiempo_estimado: tiempoEstimado,
        tiempo_estimado_max: tiempoEstimadoMax
      };
      console.log("Data being sent to API:", quotationData);
      
      // Call API (remains similar)
      const response = await fetch('/api/cotizaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quotationData),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Error al guardar la cotización');
      
      // Update client state if created (remains similar)
      if (result.cliente_creado) {
        console.log("Client was created during quotation:", result.cliente_creado);
        setClienteData(result.cliente_creado);
        setCliente(result.cliente_creado);
        sessionStorage.setItem('cotizacion_cliente', JSON.stringify(result.cliente_creado));
      }
      
      // Now handle PDF Generation using the result (contains cotizacion_id)
      const cotizacionId = result.cotizacion_id;
      if (!cotizacionId) {
        throw new Error("API did not return a cotizacion_id after saving.");
      }
      console.log(`Cotización ${cotizacionId} guardada, generando PDF...`);

      // --- Prepare data specifically for PDF generation (using DISPLAY values) ---
      const pdfData = {
        cliente: cliente,
        productos: productos.map(p => ({ // Use display products directly
          ...p,
          colores: Array.isArray(p.colores) ? p.colores.join(', ') : p.colores,
          // Ensure precio and subtotal are numbers for PDF
          precio: Number(p.precio || 0),
          subtotal: Number(p.subtotal || 0),
        })),
        folio: result.folio || `TEMP-${generateUniqueId()}`, // Use folio from API result
        moneda: moneda,
        subtotal: financials.displaySubtotal, // Use display subtotal
        costo_envio: financials.displayShippingCost, // Use display shipping cost
        total: financials.displayTotal,
        descuento_global: globalDiscount,
        iva: hasIva,
        monto_iva: financials.displayIvaAmount, // Use display IVA amount
        incluye_envio: incluyeEnvio, // Use state variable
        tipo_cambio: exchangeRate,
        tiempo_estimado: tiempoEstimado,
        tiempo_estimado_max: tiempoEstimadoMax === '' ? null : Number(tiempoEstimadoMax), // Handle empty string
        fecha_creacion: new Date().toLocaleDateString('es-MX'), // Use current date
        cotizacion_id: cotizacionId
      };
      console.log("Data being sent for PDF generation:", pdfData);
      
      // Generate PDF (remains similar)
      try {
        await PDFService.generateReactPDF(
          cliente,
          result.folio,
          pdfData,
          { download: true, filename: `${result.folio}-${cliente.nombre.replace(/\s+/g, '-')}.pdf` }
        );
        toast.success(`Cotización ${result.folio} generada exitosamente`);
      } catch (pdfError) {
        console.error("Error generating PDF:", pdfError);
        toast.error("La cotización fue guardada pero hubo un error al generar el PDF");
      }
      
      // Clear context and local state (only tiempo estimado now)
      clearProductos(); // This now also resets context discount/iva/shipping
      setTiempoEstimado(6);
      setTiempoEstimadoMax(8);
      // No need to reset local discount/iva/shipping anymore
      
      router.push('/dashboard/cotizaciones');
      
    } catch (error) {
      console.error('Error generating quotation:', error);
      setIsLoading(false);
      toast.error(error instanceof Error ? error.message : "Error al generar la cotización");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle currency change (Simplified: just calls context setter)
  const handleCurrencyChange = (newCurrency: 'MXN' | 'USD') => {
    console.log(`Client: Setting currency to ${newCurrency}`);
    setMoneda(newCurrency);
  };

  // Handle adding a product to the cart (Remains mostly the same, sends MXN price to context)
  const handleAddProduct = (producto: Producto) => {
    console.log(`[NuevaCotizacionClient] handleAddProduct called with producto: ${JSON.stringify(producto)}`);

    // Price from form is already in the selected display currency (moneda)
    // --- FIX: Read price from 'precio_unitario' field --- 
    const precioEnMonedaActual = producto.precio_unitario || 0;
    // ----------------------------------------------------
    console.log(`[NuevaCotizacionClient]   - Extracted precioEnMonedaActual: ${precioEnMonedaActual} (${moneda})`);

    // --- FIX: Convert price back to MXN before sending to context ---
    let precioEnMXN: number;
    if (moneda === 'USD' && exchangeRate) {
      precioEnMXN = convertUSDtoMXN(precioEnMonedaActual);
      console.log(`[NuevaCotizacionClient]   - Converted precio to MXN: ${precioEnMXN}`);
    } else {
      // If moneda is MXN, the price is already in MXN
      precioEnMXN = precioEnMonedaActual;
      console.log(`[NuevaCotizacionClient]   - Precio is already MXN: ${precioEnMXN}`);
    }
    // ------------------------------------------------------------------
    
    // Create the object conforming to ProductoBase for addProducto context function
    const productoBase: ProductoBase = {
      // Map relevant fields from the form 'producto' to ProductoBase
      id: producto.id || producto.producto_id?.toString() || generateUniqueId(),
      nombre: producto.nombre,
      precio: precioEnMXN, // Pass the calculated MXN price
      cantidad: Number(producto.cantidad) || 1,
      // Add other optional fields if they exist on the form 'producto' object
      sku: producto.sku,
      descripcion: producto.descripcion,
      colores: Array.isArray(producto.colores) ? producto.colores : 
              typeof producto.colores === 'string' ? producto.colores.split(',') : [],
      acabado: producto.acabado,
      descuento: producto.descuento || 0,
      producto_id: producto.producto_id,
      // Ensure required fields like 'subtotal' aren't strictly needed if context calculates them
    };
    console.log(`[NuevaCotizacionClient]   - Prepared productoBase for context (with MXN price): ${JSON.stringify(productoBase)}`);

    addProducto(productoBase); // Pass the object with MXN price
    
    toast.success('Producto agregado al carrito');
    setFormData({ tipo: 'nuevo' }); // Reset form
  };

  // Client select/mode handlers remain the same
  const handleClientSelect = useCallback((selected: Cliente | null, needsCreation?: boolean) => {
     console.log("Cliente selected/created:", selected);
     setClienteData(selected);
  }, []); 
  const handleModeChange = useCallback((newMode: 'search' | 'create') => {
    setClienteFormMode(newMode);
  }, []);
  const clienteInitialData = useMemo(() => clienteData || {}, [clienteData]);

  // Step Indicator Component
  const StepIndicator = ({ currentStep }: { currentStep: number }) => {
    const steps = ['Cliente', 'Productos', 'Finalizar'];
    return (
      <nav aria-label="Progress">
        <ol role="list" className="flex items-center space-x-8 sm:space-x-16">
          {steps.map((name, stepIdx) => {
            const stepNumber = stepIdx + 1;
            const isCompleted = stepNumber < currentStep;
            const isCurrent = stepNumber === currentStep;
            const canNavigate = stepNumber < currentStep ||
                                (stepNumber === 2 && cliente) ||
                                (stepNumber === 3 && cliente && productos.length > 0);

            return (
              <li key={name} className={`relative flex-1 ${stepIdx === steps.length - 1 ? 'flex-grow-0' : ''}`}>
                {stepIdx < steps.length - 1 ? (
                  <div className="absolute left-4 top-4 -ml-px h-0.5 w-full bg-muted" aria-hidden="true" />
                ) : null}
                {isCompleted && stepIdx < steps.length - 1 ? (
                  <div
                    className="absolute left-4 top-4 -ml-px h-0.5 w-full bg-primary"
                    aria-hidden="true"
                  />
                ) : null}
                <button
                  onClick={() => {
                    if (canNavigate) {
                      setActiveStep(stepNumber);
                    }
                  }}
                  disabled={!canNavigate}
                  className={`relative w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium z-10 ${
                    isCompleted
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : isCurrent
                      ? 'border-2 border-primary bg-background text-primary'
                      : 'border-2 border-muted bg-background text-muted-foreground hover:border-muted-foreground'
                  } ${!canNavigate && !isCurrent ? 'cursor-not-allowed opacity-50' : ''}`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : stepNumber}
                </button>
                <span className="absolute top-full mt-2 text-xs text-center w-full font-medium text-muted-foreground whitespace-nowrap">{name}</span>
              </li>
            );
          })}
        </ol>
      </nav>
    );
  };

  // Handler for Tiempo Estimado Min
  const handleTiempoEstimadoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTiempoEstimado(value === '' ? 0 : parseInt(value, 10) || 0);
  };

  // Handler for Tiempo Estimado Max
  const handleTiempoEstimadoMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTiempoEstimadoMax(value); // Store as string to allow empty input
  };

  // Handler for Global Discount change
  const handleGlobalDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty input, parse to 0 if empty or NaN
    setGlobalDiscount(value === '' ? 0 : parseFloat(value) || 0);
  };

  // Handler for Shipping Cost change
  const handleShippingCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty input, parse to 0 if empty or NaN
    setShippingCost(value === '' ? 0 : parseFloat(value) || 0);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header - Wrapped for centering */}
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Nueva Cotización
          </h1>
        </div>
      </div>

      {/* Step Indicator - Increase padding below */}
      <div className="flex justify-center pb-12"> 
         <StepIndicator currentStep={activeStep} />
      </div>

      {/* Step Content */}
      <div className="max-w-3xl mx-auto">
        {activeStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ClienteForm 
                onClientSelect={handleClientSelect} 
                initialData={clienteInitialData}
                mode={clienteFormMode}
                onModeChange={handleModeChange}
              />
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4">
                <Button variant="outline" onClick={() => router.push('/dashboard/cotizaciones')} disabled={isLoading}>
                  Cancelar
                </Button>
                <Button onClick={nextStep} disabled={!cliente || isLoading}> 
                  Continuar <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </CardFooter>
          </Card>
        )}
        
        {activeStep === 2 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Package className="h-5 w-5 text-primary" />
                      Agregar Productos
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ProductoFormTabs onProductoChange={handleAddProduct} /> 
                </CardContent>
              </Card>
              
              {cliente && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base font-medium">Cliente</CardTitle>
                    <Button variant="link" className="h-auto p-0 text-sm" onClick={() => setActiveStep(1)}>Cambiar</Button>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p className="font-semibold text-foreground">{cliente.nombre}</p>
                    <p className="text-muted-foreground">{cliente.celular}</p>
                    {cliente.correo && <p className="text-muted-foreground">{cliente.correo}</p>}
                  </CardContent>
                </Card>
              )}
              
              {productos.length > 0 && (
                <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <FileText className="h-5 w-5 text-primary" />
                        Productos Seleccionados
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ListaProductos 
                        productos={productos}
                        onRemoveProduct={removeProducto}
                        moneda={moneda}
                      />
                    </CardContent>
                </Card>
              )}
              
              <div className="flex justify-between items-center pt-2">
                <Button variant="outline" onClick={prevStep} disabled={isLoading}> 
                  <ArrowLeft className="mr-2 h-4 w-4" /> Regresar
                </Button>
                <Button onClick={nextStep} disabled={productos.length === 0 || isLoading}> 
                  Continuar <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
          </div>
        )}
        
        {activeStep === 3 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-primary" />
                    Resumen y Opciones Finales
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
                      onRemoveProduct={removeProducto}
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
                        subtotal={financials?.displaySubtotal ?? 0}
                        ivaAmount={financials?.displayIvaAmount ?? 0}
                        globalDiscount={globalDiscount}
                        setGlobalDiscount={setGlobalDiscount}
                        hasIva={hasIva}
                        setHasIva={setHasIva}
                        shippingCost={shippingCost}
                        setShippingCost={setShippingCost}
                        total={financials?.displayTotal ?? 0}
                        tiempoEstimado={tiempoEstimado}
                        setTiempoEstimado={setTiempoEstimado}
                        tiempoEstimadoMax={tiempoEstimadoMax}
                        setTiempoEstimadoMax={setTiempoEstimadoMax}
                      />
                  </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-between items-center pt-2">
              <Button variant="outline" onClick={prevStep} disabled={isLoading}> 
                <ArrowLeft className="mr-2 h-4 w-4" /> Regresar
              </Button>
              <Button 
                onClick={handleGenerateCotizacion}
                disabled={isLoading || productos.length === 0 || !cliente}
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando...</>
                ) : (
                  <><FileText className="mr-2 h-4 w-4" /> Generar Cotización y PDF</>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Main export with Provider
export default function NuevaCotizacionPage() {
  return (
    <ProductosProvider>
      <NuevaCotizacionClient />
    </ProductosProvider>
  );
}
