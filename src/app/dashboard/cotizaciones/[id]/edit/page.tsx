"use client";

import { useState, useEffect, useCallback, useMemo, Dispatch } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, User, Package, Receipt, Save, DollarSign, FileText, Loader2, Download, Check } from "lucide-react";
import { ClienteForm } from "@/components/cotizacion/cliente-form";
import ProductoFormTabs from "@/components/cotizacion/producto-form-tabs";
import { ListaProductosConDescuento, ProductoConDescuento } from "@/components/cotizacion/lista-productos-con-descuento";
import { ResumenCotizacion } from "@/components/cotizacion/resumen-cotizacion";
import { useProductos, ProductosProvider } from "@/contexts/productos-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cliente } from "@/lib/supabase";
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { Producto as ProductoBase } from '@/components/cotizacion/producto-simplificado';
import { formatCurrency, convertToDollars } from '@/lib/utils';
import { generateUniqueId } from "@/lib/utils/misc";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { PDFService } from '@/services/pdf-service';
import { Label } from "@/components/ui/label";

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
  const cotizacionId = typeof params?.id === 'string' ? params.id : null;
  
  const [activeStep, setActiveStep] = useState<number>(1);
  const [initialLoading, setInitialLoading] = useState(true);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [cotizacionOriginal, setCotizacionOriginal] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [tiempoEstimado, setTiempoEstimado] = useState<number>(6);
  const [tiempoEstimadoMax, setTiempoEstimadoMax] = useState<number>(8);

  const {
    productos,
    addProducto,
    removeProducto,
    updateProductoDiscount,
    clearProductos,
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
    financials
  } = useProductos();

  const formatAndConvertCurrency = (amountMXN: number): string => {
    const displayAmount = moneda === 'USD' && exchangeRate ? convertToDollars(amountMXN, exchangeRate) : amountMXN;
    return formatCurrency(displayAmount, moneda);
  }

  // Log productos state from context on each render
  console.log('[Render] Productos from context:', productos);

  useEffect(() => {
    if (!cotizacionId) {
        toast.error("ID de cotización no válido.");
        router.push("/dashboard/cotizaciones");
        setInitialLoading(false);
        return;
    }

    async function fetchCotizacion() {
      setInitialLoading(true);
      setError(null);
      try {
        const fetchValidProductIds = async () => {
          try {
            const response = await fetch('/api/productos?onlyIds=true');
            if (!response.ok) {
                 const errorText = await response.text();
                 console.error(`Failed to fetch valid product IDs: ${response.status} ${errorText}`);
                 throw new Error('Failed to fetch valid product IDs');
            }
            const data = await response.json();

            const ids = Array.isArray(data?.productos)
              ? data.productos.map((p: { producto_id: number }) => p.producto_id)
              : Array.isArray(data?.data)
              ? data.data.map((p: { producto_id: number }) => p.producto_id)
              : null;

            if (ids === null) {
                console.error('API response for product IDs is missing "productos" or "data" array:', data);
                throw new Error('Invalid response structure for product IDs');
            }

            window.validProductIds = new Set(ids);

            console.log(`Loaded ${window.validProductIds.size} valid product IDs for validation`);
          } catch (error) {
            console.error('Error fetching valid product IDs:', error);
            toast.error('Advertencia: No se pudieron cargar los IDs de productos válidos.');
          }
        };

        await fetchValidProductIds();

        const response = await fetch(`/api/cotizaciones/${cotizacionId}`);

        if (!response.ok) {
          let errorMsg = `Error ${response.status}: ${response.statusText}`;
           try {
               const errorData = await response.json();
               errorMsg = errorData.error || errorMsg;
           } catch (e) { /* Ignore parsing error */ }
          throw new Error(errorMsg);
        }

        const data = await response.json();

        const cotizacionData = data.cotizacion || data;

        // ---> Log raw cotizacion data
        console.log('[Fetch] Raw cotizacionData:', cotizacionData);

        if (!cotizacionData || typeof cotizacionData !== 'object') {
          throw new Error("No se encontró la cotización o formato inválido");
        }

        if (cotizacionData.estado !== 'pendiente') {
          toast.error("Solo se pueden editar cotizaciones en estado 'pendiente'");
          router.push("/dashboard/cotizaciones");
          return;
        }

        setCotizacionOriginal(cotizacionData);

        if (cotizacionData.cliente) {
          setCliente(cotizacionData.cliente);
        } else {
           console.error("Error: No client data found for cotización being edited.", cotizacionData);
           setError("No se encontraron datos del cliente para esta cotización.");
           setInitialLoading(false);
        }

        if (cotizacionData.moneda) {
          setMoneda(cotizacionData.moneda);
        }

        // Process products FIRST
        if (cotizacionData.productos && Array.isArray(cotizacionData.productos)) {
          const initialProductos = cotizacionData.productos.map((producto: any) => ({
             id: producto.cotizacion_producto_id ? producto.cotizacion_producto_id.toString() : generateUniqueId(),
             cotizacion_producto_id: producto.cotizacion_producto_id || null,
             producto_id: producto.producto_id || null,
             nombre: producto.nombre || 'Producto sin nombre',
             precio: producto.precio_unitario || producto.precio || 0,
             cantidad: producto.cantidad || 1,
             descuento: producto.descuento_producto ?? producto.descuento ?? 0,
             subtotal: producto.subtotal ?? ( (producto.precio_unitario || producto.precio || 0) * (producto.cantidad || 1) * (1 - (producto.descuento_producto ?? producto.descuento ?? 0)/100) ),
             sku: producto.sku || "",
             descripcion: producto.descripcion || "",
             colores: Array.isArray(producto.colores) ? producto.colores :
                     typeof producto.colores === 'string' ? producto.colores.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
             acabado: producto.acabado || ""
          }));

          console.log('[Fetch] initialProductos after mapping:', initialProductos);

          clearProductos(); // Clear before adding
          initialProductos.forEach((p: Producto) => {
             console.log("[Fetch] Adding product to context:", p);
             addProducto(p);
           });
        } else {
           console.log('[Fetch] No products found or not an array in cotizacionData.');
           clearProductos();
        }

        // Set financial options AFTER products are processed
        console.log(`[Fetch] Setting globalDiscount based on cotizacionData.descuento_global: ${cotizacionData.descuento_global}`);
        if (cotizacionData.descuento_global !== null && cotizacionData.descuento_global !== undefined) {
            setGlobalDiscount(Number(cotizacionData.descuento_global) || 0);
        } else {
            setGlobalDiscount(0);
        }

        console.log(`[Fetch] Setting hasIva based on cotizacionData.iva: ${cotizacionData.iva}`);
        setHasIva(!!cotizacionData.iva);

        console.log(`[Fetch] Setting shippingCost based on cotizacionData.costo_envio: ${cotizacionData.costo_envio}`);
        setShippingCost(cotizacionData.costo_envio ? Number(cotizacionData.costo_envio) : 0);

        if (cotizacionData.tiempo_estimado) {
          setTiempoEstimado(cotizacionData.tiempo_estimado);
        }
        if (cotizacionData.tiempo_estimado_max) {
          setTiempoEstimadoMax(cotizacionData.tiempo_estimado_max);
        }

      } catch (error: any) {
        console.error("Error fetching cotizacion:", error);
        setError(error.message || "Error al cargar la cotización");
        setCliente(null);
        clearProductos();
      } finally {
        setInitialLoading(false);
      }
    }

    fetchCotizacion();
  }, [cotizacionId, router]);

  const nextStep = () => {
    if (activeStep === 1 && !cliente) {
      toast.error("Por favor, selecciona o crea un cliente");
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

  const handleUpdateCotizacion = async () => {
    if (!cotizacionId) {
        toast.error("ID de cotización inválido. No se puede guardar.");
        return;
      }

    if (!cliente) {
      toast.error("Por favor, selecciona o crea un cliente antes de guardar");
      setActiveStep(1);
      return;
    }
    if (productos.length === 0) {
       toast.error("Por favor, agrega al menos un producto antes de guardar");
       setActiveStep(2);
       return;
     }

    setIsSaving(true);
    const toastId = toast.loading("Actualizando cotización...");

    try {
      const productosPayload = productos.map((p) => {
        if (!p.cotizacion_producto_id && p.producto_id && window.validProductIds && !window.validProductIds.has(p.producto_id)) {
           console.warn(`Attempting to save product "${p.nombre}" with invalid producto_id: ${p.producto_id}`);
           return null;
        }

        return {
          ...(p.cotizacion_producto_id && { cotizacion_producto_id: p.cotizacion_producto_id }),
          ...(p.producto_id && { producto_id: p.producto_id }),
          nombre: p.nombre,
          cantidad: p.cantidad,
          precio_unitario: p.precio,
          descuento_producto: p.descuento || 0,
          subtotal: p.subtotal,
          sku: p.sku || null,
          descripcion: p.descripcion || null,
          colores: Array.isArray(p.colores) && p.colores.length > 0 ? p.colores : null,
          acabado: p.acabado || null,
        };
      }).filter(Boolean);

      console.log('Productos payload for update:', productosPayload);

      const cotizacionData = {
        cliente_id: cliente.cliente_id,
        moneda: moneda,
        subtotal: financials.subtotalAfterDiscountMXN,
        descuento_global: globalDiscount,
        iva: hasIva,
        monto_iva: financials.ivaAmountMXN,
        incluye_envio: shippingCost > 0,
        costo_envio: shippingCost,
        total: financials.totalMXN,
        tipo_cambio: exchangeRate,
        tiempo_estimado: tiempoEstimado,
        tiempo_estimado_max: tiempoEstimadoMax,
        estado: 'pendiente',
        productos: productosPayload,
      };

      const response = await fetch(`/api/cotizaciones/${cotizacionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cotizacionData),
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch (e) {
        if (!response.ok) {
           throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        responseData = { message: "Actualización exitosa (sin cuerpo de respuesta)." };
      }

      if (!response.ok) {
        throw new Error(responseData?.error || responseData?.message || `Error al actualizar: ${response.statusText}`);
      }

      toast.success(responseData.message || "Cotización actualizada correctamente", { id: toastId });
      router.push("/dashboard/cotizaciones");
      router.refresh();

    } catch (error: any) {
      console.error("Error actualizando cotización:", error);
      toast.error(`Error al actualizar: ${error.message}`, { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCurrencyChange = (newCurrency: 'MXN' | 'USD') => {
    setMoneda(newCurrency);
  };

  const handleAddProduct = (productoFromForm: any | null) => {
     if (!productoFromForm) return;

     const precio = productoFromForm?.precio_unitario || productoFromForm?.precio || 0;
     const cantidad = productoFromForm?.cantidad || 1;
     const descuento = productoFromForm?.descuento || 0;
     const subtotal = precio * cantidad * (1 - descuento / 100);

     const productoForContext = {
       ...productoFromForm,
       precio: precio,
       subtotal: subtotal,
       sku: productoFromForm?.sku || "",
       descripcion: productoFromForm?.descripcion || "",
       colores: Array.isArray(productoFromForm?.colores) ? productoFromForm.colores
                 : typeof productoFromForm?.colores === 'string' ? (productoFromForm.colores as string).split(',').map((s: string) => s.trim()).filter(Boolean)
                 : [],
       acabado: productoFromForm?.acabado || "",
     };

     const existing = productos.find(p =>
        (productoForContext.id && p.id === productoForContext.id) ||
        (productoForContext.producto_id && p.producto_id === productoForContext.producto_id && !p.cotizacion_producto_id)
     );

     if (existing) {
        console.log("[handleAddProduct] Updating existing product:", productoForContext);
        addProducto({
            ...existing,
            ...productoForContext,
        });
        toast.success('Producto actualizado en la cotización');
     } else {
        console.log("[handleAddProduct] Adding new product:", productoForContext);
        addProducto({
          ...productoForContext,
          id: generateUniqueId(),
          cotizacion_producto_id: null,
        });
        toast.success('Producto agregado a la cotización');
     }
  };

  const handleRemoveProduct = (id: string) => {
    removeProducto(id);
  };

  const handleDownloadPDF = async () => {
    if (!cotizacionId || !cliente) {
      toast.error("Faltan datos para generar el PDF (ID o Cliente).");
      return;
    }
    setIsDownloading(true);
    const toastId = toast.loading("Generando PDF...");

    try {
        const pdfData = {
            ...cotizacionOriginal,
            cliente: cliente,
            productos: productos.map(p => ({
                ...p,
                precio_unitario: p.precio,
                descuento_producto: p.descuento,
                precio_total: p.subtotal,
            })),
            moneda: moneda,
            subtotal: financials.subtotalAfterDiscountMXN,
            descuento_global: globalDiscount,
            iva: hasIva,
            monto_iva: financials.ivaAmountMXN,
            incluye_envio: shippingCost > 0,
            costo_envio: shippingCost,
            total: financials.totalMXN,
            tiempo_estimado: tiempoEstimado,
            tiempo_estimado_max: tiempoEstimadoMax,
            folio: cotizacionOriginal?.folio || `CT-${cotizacionId}`
        };

      await PDFService.generateReactPDF(
        pdfData.cliente,
        pdfData.folio,
        pdfData,
        { download: true }
      );
      toast.success("PDF descargado", { id: toastId });
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      toast.error(`Error al generar PDF: ${error.message}`, { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  const getStepClasses = (step: number) => {
    if (step < activeStep) return "text-white bg-teal-500 ring-teal-500";
    if (step === activeStep) return "text-teal-600 bg-white ring-teal-500";
    return "text-gray-400 bg-white ring-gray-200";
  };

  const StepIndicator = ({ currentStep }: { currentStep: number }) => (
    <div className="flex w-full max-w-md justify-between relative">
      <div className="absolute top-4 left-0 w-full h-0.5 bg-gray-200">
        <div
          className="absolute h-0.5 bg-teal-500 transition-all duration-500"
          style={{ width: `${(currentStep - 1) * 50}%` }}
        ></div>
      </div>
      <div className="flex flex-col items-center relative z-10">
        <button
          onClick={() => setActiveStep(1)}
          className={`h-9 w-9 rounded-full ring-2 flex items-center justify-center transition-all duration-200 font-medium text-sm ${getStepClasses(1)}`}
        >1</button>
        <span className="mt-2 text-sm font-medium text-gray-700">Cliente</span>
      </div>
      <div className="flex flex-col items-center relative z-10">
        <button
          onClick={() => cliente && setActiveStep(2)}
          disabled={!cliente}
          className={`h-9 w-9 rounded-full ring-2 flex items-center justify-center transition-all duration-200 font-medium text-sm ${getStepClasses(2)}`}
        >2</button>
        <span className="mt-2 text-sm font-medium text-gray-700">Productos</span>
      </div>
      <div className="flex flex-col items-center relative z-10">
        <button
          onClick={() => cliente && productos.length > 0 && setActiveStep(3)}
          disabled={!cliente || productos.length === 0}
          className={`h-9 w-9 rounded-full ring-2 flex items-center justify-center transition-all duration-200 font-medium text-sm ${getStepClasses(3)}`}
        >3</button>
        <span className="mt-2 text-sm font-medium text-gray-700">Finalizar</span>
      </div>
    </div>
  );

  if (initialLoading) {
    return (
      <div className="container mx-auto px-4 py-20 flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Cargando cotización...</span>
      </div>
    );
  }

  if (error && !initialLoading) {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Editar Cotización</h1>
          <p className="text-sm text-muted-foreground">Folio: {cotizacionOriginal?.folio || `CT-${cotizacionId}`}</p>
        </div>
      </div>

      <div className="flex justify-center pb-6">
         <StepIndicator currentStep={activeStep} />
      </div>

      <div className="max-w-4xl mx-auto">
        {activeStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cliente ? (
                <div className="space-y-3 p-1">
                  <div>
                      <Label className="text-xs text-muted-foreground">Nombre</Label>
                      <p className="font-medium text-foreground">{cliente.nombre}</p>
                  </div>
                  {cliente.razon_social && (
                     <div>
                       <Label className="text-xs text-muted-foreground">Razón Social</Label>
                       <p>{cliente.razon_social}</p>
                     </div>
                  )}
                  {cliente.rfc && (
                     <div>
                       <Label className="text-xs text-muted-foreground">RFC</Label>
                       <p>{cliente.rfc}</p>
                     </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                          <Label className="text-xs text-muted-foreground">Celular</Label>
                          <p>{cliente.celular || '-'}</p>
                      </div>
                      <div>
                          <Label className="text-xs text-muted-foreground">Correo</Label>
                          <p>{cliente.correo || '-'}</p>
                      </div>
                  </div>
                   {cliente.tipo_cliente && (
                     <div>
                       <Label className="text-xs text-muted-foreground">Tipo Cliente</Label>
                       <p>{cliente.tipo_cliente}</p>
                     </div>
                   )}
                </div>
              ) : (
                <p className="text-muted-foreground italic">Cargando datos del cliente...</p>
              )}
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
        
        {activeStep === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Package className="h-5 w-5 text-primary" />
                    Añadir/Editar Productos
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
                  <ProductoFormTabs onProductoChange={handleAddProduct as any} />
              </CardContent>
            </Card>

             {cliente && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base font-medium">Cliente Seleccionado</CardTitle>
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
                      Productos en Cotización
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
                 <ArrowLeft className="mr-2 h-4 w-4" /> Regresar a Cliente
              </Button>
              <Button onClick={nextStep} disabled={productos.length === 0 || isSaving || isDownloading}>
                 Ir a Resumen <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
        {activeStep === 3 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Receipt className="h-5 w-5 text-primary" />
                  Resumen y Opciones Finales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-base font-medium text-foreground mb-3">Productos Agregados</h3>
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
                    ivaAmount={financials.ivaAmountMXN}
                    shippingCost={shippingCost}
                    setShippingCost={setShippingCost}
                    total={financials.displayTotal}
                    tiempoEstimado={tiempoEstimado}
                    setTiempoEstimado={setTiempoEstimado}
                    tiempoEstimadoMax={tiempoEstimadoMax}
                    setTiempoEstimadoMax={setTiempoEstimadoMax}
                  />
                   {cliente && (
                     <div className="mt-4 pt-4 border-t">
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Cliente</h4>
                        <p className="text-sm font-semibold text-foreground">{cliente.nombre}</p>
                        <p className="text-xs text-muted-foreground">{cliente.celular}</p>
                         {cliente.correo && <p className="text-xs text-muted-foreground">{cliente.correo}</p>}
                     </div>
                   )}
                </div>
              </CardContent>
            </Card>
            
            <div className="flex flex-col sm:flex-row justify-between items-center pt-2 gap-3">
              <Button variant="outline" onClick={prevStep} disabled={isSaving || isDownloading} className="w-full sm:w-auto">
                 <ArrowLeft className="mr-2 h-4 w-4" /> Regresar a Productos
              </Button>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Button
                  variant="secondary"
                  onClick={handleDownloadPDF}
                  disabled={isSaving || isDownloading || !cliente}
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
