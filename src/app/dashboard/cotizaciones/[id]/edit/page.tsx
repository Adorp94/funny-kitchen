"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, User, Package, Receipt, Save, DollarSign, FileText, Loader2, Download, Check } from "lucide-react";
import { ClienteForm } from "@/components/cotizacion/cliente-form";
import ProductoFormTabs from "@/components/cotizacion/producto-form-tabs";
import { ListaProductos } from "@/components/cotizacion/lista-productos";
import { ListaProductosConDescuento, ProductoConDescuento } from "@/components/cotizacion/lista-productos-con-descuento";
import { ResumenCotizacion } from "@/components/cotizacion/resumen-cotizacion";
import { useProductos, ProductosProvider } from "@/contexts/productos-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cliente } from "@/lib/supabase";
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { Producto as ProductoBase } from '@/components/cotizacion/producto-simplificado';
import { formatCurrency, convertToDollars } from '@/lib/utils';
import { generateUniqueId } from "@/lib/utils/misc";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

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
  cotizacion_producto_id?: number | null;
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
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [cotizacionOriginal, setCotizacionOriginal] = useState<any>(null);
  const { convertMXNtoUSD, convertUSDtoMXN } = useExchangeRate();
  const [error, setError] = useState<string | null>(null);
  const [tiempoEstimado, setTiempoEstimado] = useState<number>(6);
  const [tiempoEstimadoMax, setTiempoEstimadoMax] = useState<number>(8);
  const [clienteFormMode, setClienteFormMode] = useState<'search' | 'create'>('search');

  // Get productos from context
  const {
    productos,
    addProducto,
    removeProducto,
    updateProductoDiscount,
    clearProductos, 
    total,
    moneda,
    setMoneda,
    subtotal,
    globalDiscount,
    setGlobalDiscount,
    hasIva,
    setHasIva,
    shippingCost,
    setShippingCost,
    exchangeRate,
    setProductos,
    financials
  } = useProductos();

  // Helper function to format currency after potential conversion
  const formatAndConvertCurrency = (amountMXN: number): string => {
    const displayAmount = moneda === 'USD' && exchangeRate ? convertToDollars(amountMXN, exchangeRate) : amountMXN;
    // Always use the central formatCurrency, ensuring the currency code matches the displayAmount's currency
    return formatCurrency(displayAmount, moneda);
  }

  // Fetch the cotizacion data on mount
  useEffect(() => {
    async function fetchCotizacion() {
      setInitialLoading(true);
      setError(null);
      try {
        // Fetch valid product IDs and store them in window for validation
        const fetchValidProductIds = async () => {
          try {
            const response = await fetch('/api/productos?onlyIds=true');
            if (!response.ok) throw new Error('Failed to fetch valid product IDs');
            const data = await response.json();
            
            // Create a Set with all valid product IDs for fast lookups
            window.validProductIds = new Set(
              data.productos.map((p: {producto_id: number}) => p.producto_id)
            );
            
            console.log(`Loaded ${window.validProductIds.size} valid product IDs for validation`);
          } catch (error) {
            console.error('Error fetching valid product IDs:', error);
            setError('Error al cargar IDs de productos válidos. La validación puede fallar.');
          }
        };

        await fetchValidProductIds();
        
        // Then fetch the cotizacion data
        const response = await fetch(`/api/cotizaciones?id=${cotizacionId}`);
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.cotizacion) {
          toast.error("No se encontró la cotización");
          router.push("/dashboard/cotizaciones");
          return;
        }
        
        // Check if cotizacion can be edited (only pendiente)
        if (data.cotizacion.estado !== 'pendiente') {
          toast.error("Solo se pueden editar cotizaciones en estado 'pendiente'");
          router.push("/dashboard/cotizaciones");
          return;
        }
        
        setCotizacionOriginal(data.cotizacion);
        
        // Set cliente data
        if (data.cotizacion.cliente) {
          setClienteData(data.cotizacion.cliente);
          setCliente(data.cotizacion.cliente);
        }
        
        // Set moneda
        if (data.cotizacion.moneda) {
          setMoneda(data.cotizacion.moneda);
        }
        
        // Set global discount
        if (data.cotizacion.descuento_global) {
          setGlobalDiscount(data.cotizacion.descuento_global);
        }
        
        // Set IVA
        setHasIva(!!data.cotizacion.iva);
        
        // Set shipping cost
        if (data.cotizacion.incluye_envio && data.cotizacion.costo_envio) {
          setShippingCost(data.cotizacion.costo_envio);
        }
        
        // Set tiempo estimado
        if (data.cotizacion.tiempo_estimado) {
          setTiempoEstimado(data.cotizacion.tiempo_estimado);
        }
        if (data.cotizacion.tiempo_estimado_max) {
          setTiempoEstimadoMax(data.cotizacion.tiempo_estimado_max);
        }
        
        // Log the raw API response for productos
        console.log('API productos:', data.cotizacion.productos);
        
        // Load productos
        if (data.cotizacion.productos && Array.isArray(data.cotizacion.productos)) {
          clearProductos();
          
          console.log("Products from API:", data.cotizacion.productos);
          
          data.cotizacion.productos.forEach((producto: any) => {
            // If the product has a cotizacion_producto_id, it's an existing product in the quote
            if (producto.cotizacion_producto_id) {
              addProducto({
                id: producto.cotizacion_producto_id.toString(),
                cotizacion_producto_id: producto.cotizacion_producto_id,
                producto_id: producto.producto_id,
                nombre: producto.nombre,
                precio: producto.precio_unitario || producto.precio || 0,
                cantidad: producto.cantidad,
                descuento: producto.descuento_producto ?? producto.descuento ?? 0,
                subtotal: producto.subtotal ?? producto.precio_total ?? 0,
                sku: producto.sku || "",
                descripcion: producto.descripcion || "",
                colores: Array.isArray(producto.colores) ? producto.colores : 
                        typeof producto.colores === 'string' ? producto.colores.split(',') : [],
                acabado: producto.acabado || ""
              });
            } else {
              // For new products (not yet in DB)
              addProducto({
                id: generateUniqueId(),
                cotizacion_producto_id: null,
                producto_id: producto.producto_id ?? producto.id ?? null,
                nombre: producto.nombre,
                precio: producto.precio_unitario || producto.precio || 0,
                cantidad: producto.cantidad,
                descuento: producto.descuento_producto ?? producto.descuento ?? 0,
                subtotal: producto.subtotal ?? producto.precio_total ?? 0,
                sku: producto.sku || "",
                descripcion: producto.descripcion || "",
                colores: Array.isArray(producto.colores) ? producto.colores : 
                        typeof producto.colores === 'string' ? producto.colores.split(',') : [],
                acabado: producto.acabado || ""
              });
            }
          });
        }
        
      } catch (error) {
        console.error("Error fetching cotizacion:", error);
        toast.error("Error al cargar la cotización");
        router.push("/dashboard/cotizaciones");
      } finally {
        setInitialLoading(false);
      }
    }
    
    if (cotizacionId) {
      fetchCotizacion();
    }
  }, [cotizacionId, router]);

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
    try {
      if (!cliente) {
        toast.error("Por favor, ingresa la información del cliente");
        return;
      }

      // DEBUG: Log productos before building payload
      console.log('Productos in context before payload:', productos);

      // Prepare productos array for backend
      const productosPayload = productos.map((p) => {
        if (p.cotizacion_producto_id) {
          return {
            id: p.cotizacion_producto_id.toString(),
            cotizacion_producto_id: p.cotizacion_producto_id,
            producto_id: p.producto_id,
            nombre: p.nombre,
            precio: p.precio,
            cantidad: p.cantidad,
            descuento: p.descuento || 0,
            subtotal: p.subtotal,
            sku: p.sku || "",
            descripcion: p.descripcion || "",
            colores: Array.isArray(p.colores) ? p.colores : [],
            acabado: p.acabado || "",
          };
        } else if (p.producto_id) {
          return {
            id: p.id,
            cotizacion_producto_id: null,
            producto_id: p.producto_id,
            nombre: p.nombre,
            precio: p.precio,
            cantidad: p.cantidad,
            descuento: p.descuento || 0,
            subtotal: p.subtotal,
            sku: p.sku || "",
            descripcion: p.descripcion || "",
            colores: Array.isArray(p.colores) ? p.colores : [],
            acabado: p.acabado || "",
          };
        } else {
          // Warn if a product is missing both IDs
          console.warn('Product missing cotizacion_producto_id and producto_id:', p);
          return null;
        }
      }).filter(Boolean);

      // DEBUG: Log productosPayload before sending
      console.log('productosPayload to send:', productosPayload);

      // Create request including productos
      const cotizacionData = {
        cotizacion_id: parseInt(cotizacionId),
        cliente_id: cliente.cliente_id,
        moneda: moneda,
        subtotal: subtotal,
        descuento_global: globalDiscount,
        iva: hasIva,
        monto_iva: hasIva ? subtotal * (1 - globalDiscount / 100) * 0.16 : 0,
        incluye_envio: shippingCost > 0,
        costo_envio: shippingCost,
        total: total,
        tipo_cambio: exchangeRate,
        productos: productosPayload,
      };

      toast.loading("Actualizando cotización...", { id: "update-cotizacion" });

      // Make the API call
      const response = await fetch(`/api/cotizaciones/${cotizacionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cotizacionData),
        credentials: 'include'
      });

      toast.dismiss("update-cotizacion");

      let responseData;
      try {
        responseData = await response.json();
      } catch (e) {
        throw new Error("Error al procesar la respuesta del servidor");
      }

      if (!response.ok) {
        throw new Error(responseData?.error || 'Error al actualizar la cotización');
      }

      toast.success("Cotización actualizada correctamente");
      router.push("/dashboard/cotizaciones");

    } catch (error) {
      console.error("Error actualizando cotización:", error);
      toast.dismiss("update-cotizacion");
      toast.error(error instanceof Error ? error.message : "Error al actualizar la cotización");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle currency change
  const handleCurrencyChange = (newCurrency: 'MXN' | 'USD') => {
    setMoneda(newCurrency);
  };

  // Handle adding a product to the cart
  const handleAddProduct = (producto: Producto) => {
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

  // Cliente Form Handlers
  const handleClientSelect = useCallback((selected: Cliente | null) => { setClienteData(selected); setCliente(selected); }, []);
  const handleModeChange = useCallback((newMode: 'search' | 'create') => { setClienteFormMode(newMode); }, []);
  const clienteInitialData = useMemo(() => clienteData || {}, [clienteData]);
  
  // Step Indicator Component
  const StepIndicator = ({ currentStep }: { currentStep: number }) => (
    <div className="flex w-full max-w-md justify-between relative">
      <div className="absolute top-4 left-0 w-full h-0.5 bg-gray-200">
        <div 
          className="absolute h-0.5 bg-teal-500 transition-all duration-500" 
          style={{ width: `${(currentStep - 1) * 50}%` }}
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
  );

  if (initialLoading) {
    return (
      <div className="container mx-auto px-4 py-20 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Cargando cotización...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-destructive/50 bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">Error al Cargar</CardTitle>
            <CardDescription className="text-destructive/90">No se pudieron cargar los datos de la cotización.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive/80">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push('/dashboard/cotizaciones')}>Volver a la Lista</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Editar Cotización</h1>
          <p className="text-sm text-muted-foreground">Folio: {cotizacionOriginal?.folio}</p>
        </div>
      </div>

      {/* Step Indicator */} 
      <div className="flex justify-center pb-6">
         <StepIndicator currentStep={activeStep} />
      </div>

      {/* Step Content */}
      <div className="max-w-3xl mx-auto">
        {/* Step 1: Cliente */} 
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
                initialData={cliente || {}}
                mode={cliente ? 'edit' : clienteFormMode}
                onModeChange={handleModeChange}
              />
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4">
                <Button variant="outline" onClick={() => router.push('/dashboard/cotizaciones')} disabled={isSaving || isDownloading}>
                  Cancelar
                </Button>
                <Button onClick={nextStep} disabled={!cliente || isSaving || isDownloading}>
                  Continuar <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </CardFooter>
          </Card>
        )}
        
        {/* Step 2: Productos */} 
        {activeStep === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Package className="h-5 w-5 text-primary" />
                    Editar Productos
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
                      Productos Agregados
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ListaProductosConDescuento 
                      productos={productos}
                      onRemoveProduct={handleRemoveProduct}
                      onUpdateProductDiscount={updateProductoDiscount}
                      moneda={moneda}
                      editMode={true}
                    />
                  </CardContent>
              </Card>
            )}
            
            <div className="flex justify-between items-center pt-2">
              <Button variant="outline" onClick={prevStep} disabled={isSaving || isDownloading}>
                 <ArrowLeft className="mr-2 h-4 w-4" /> Regresar
              </Button>
              <Button onClick={nextStep} disabled={productos.length === 0 || isSaving || isDownloading}>
                 Continuar <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Step 3: Finalizar */} 
        {activeStep === 3 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  Resumen y Opciones Finales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-base font-medium text-foreground mb-3">Productos</h3>
                  <ListaProductosConDescuento 
                    productos={productos}
                    onRemoveProduct={handleRemoveProduct}
                    onUpdateProductDiscount={updateProductoDiscount}
                    moneda={moneda}
                    editMode={true}
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
            
            <div className="flex flex-col sm:flex-row justify-between items-center pt-2 gap-3">
              <Button variant="outline" onClick={prevStep} disabled={isSaving || isDownloading} className="w-full sm:w-auto">
                 <ArrowLeft className="mr-2 h-4 w-4" /> Regresar
              </Button>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsDownloading(true);
                    handleDownloadPDF();
                  }}
                  disabled={isSaving || isDownloading}
                  className="w-full sm:w-auto"
                >
                  {isDownloading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Descargando...</>
                  ) : (
                    <><Download className="mr-2 h-4 w-4" /> Descargar PDF</>
                  )}
                </Button>
                <Button 
                  onClick={handleUpdateCotizacion}
                  disabled={isSaving || isDownloading || productos.length === 0 || !cliente}
                  className="w-full sm:w-auto"
                >
                  {isSaving ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Actualizando...</>
                  ) : (
                    <><Save className="mr-2 h-4 w-4" /> Actualizar Cotización</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
