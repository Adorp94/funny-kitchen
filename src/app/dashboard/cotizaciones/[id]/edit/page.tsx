"use client";

import { useState, useEffect, useCallback } from "react";
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
import { useExchangeRate } from '@/hooks/useExchangeRate';
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
  const [isLoading, setIsLoading] = useState(false);
  const [cotizacionOriginal, setCotizacionOriginal] = useState<any>(null);
  const { convertMXNtoUSD, convertUSDtoMXN } = useExchangeRate();
  const [error, setError] = useState<string | null>(null);

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
    setProductos
  } = useProductos();

  // Fetch the cotizacion data on mount
  useEffect(() => {
    async function fetchCotizacion() {
      setInitialLoading(true);
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

        fetchValidProductIds();
        
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
        
        // Load productos
        if (data.cotizacion.productos && Array.isArray(data.cotizacion.productos)) {
          clearProductos();
          
          console.log("Products from API:", data.cotizacion.productos);
          
          data.cotizacion.productos.forEach((producto: any) => {
            console.log(`Adding product ${producto.nombre} with id ${producto.id} and producto_id ${producto.producto_id}`);
            addProducto({
              id: producto.id.toString(),
              nombre: producto.nombre,
              precio: producto.precio_unitario || producto.precio || 0,
              cantidad: producto.cantidad,
              descuento: producto.descuento || 0,
              subtotal: producto.subtotal || producto.precio_total || 0,
              sku: producto.sku || "",
              descripcion: producto.descripcion || "",
              colores: Array.isArray(producto.colores) ? producto.colores : 
                      typeof producto.colores === 'string' ? producto.colores.split(',') : [],
              acabado: producto.acabado || "",
              producto_id: producto.producto_id
            });
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
      
      // Create a minimal request focusing on core data only
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
        tipo_cambio: exchangeRate
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

  // Format currency with proper conversion
  const formatCurrency = (amount: number): string => {
    let displayAmount = amount;
    
    // Convert to USD if needed
    if (moneda === 'USD' && exchangeRate) {
      displayAmount = amount / exchangeRate;
    }
    
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: moneda,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(displayAmount);
  };

  // Handle currency change
  const handleCurrencyChange = (newCurrency: 'MXN' | 'USD') => {
    setMoneda(newCurrency);
  };

  // Handle adding a product to the cart
  const handleAddProduct = (producto: Producto) => {
    const existingProduct = productos.find(p => p.id === producto.id);
    
    if (existingProduct) {
      // If product exists, update its quantity
      const updatedProduct = {
        ...existingProduct,
        cantidad: existingProduct.cantidad + producto.cantidad,
      };
      
      // Recalculate subtotal
      updatedProduct.subtotal = updatedProduct.precio * updatedProduct.cantidad;
      
      // Clear and update the products list
      clearProductos();
      productos.forEach(p => {
        if (p.id === producto.id) {
          addProducto(updatedProduct);
        } else {
          addProducto(p);
        }
      });
      
      toast.success(`Se actualizó la cantidad del producto a ${updatedProduct.cantidad}`);
    } else {
      // If product doesn't exist, add it as new
      addProducto({
        ...producto,
        subtotal: producto.precio * producto.cantidad
      });
      toast.success('Producto agregado al carrito');
    }
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100">
                <div className="flex items-center">
                  <User className="h-5 w-5 text-teal-600 mr-2" />
                  <h2 className="text-lg font-medium text-gray-900">Información del Cliente</h2>
                </div>
              </div>
              <div className="p-6">
                <ClienteForm 
                  onClienteChange={setClienteData} 
                  clienteId={cliente?.cliente_id} 
                  initialCliente={cliente}
                  defaultTab="existente"
                  readOnly={false}
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
                      // Format product data for addProducto
                      const productoToAdd = {
                        // Use 'new' for new products, real ID for existing ones
                        id: producto.producto_id ? String(producto.producto_id) : 'new',
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
                        // Add the original producto_id for database reference
                        producto_id: producto.producto_id || null
                      };
                      
                      // Add product to cart
                      handleAddProduct(productoToAdd);
                    }
                  }} />
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100">
                  <div className="flex items-center">
                    <Receipt className="h-5 w-5 text-teal-600 mr-2" />
                    <h2 className="text-lg font-medium text-gray-900">Productos Seleccionados</h2>
                  </div>
                </div>
                <div className="p-6">
                  <ListaProductosConDescuento 
                    productos={productos} 
                    onRemoveProduct={removeProducto}
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
                    subtotal={subtotal}
                    globalDiscount={globalDiscount}
                    setGlobalDiscount={(value) => {
                      console.log("Setting global discount to:", value);
                      setGlobalDiscount(value);
                    }}
                    hasIva={hasIva}
                    setHasIva={setHasIva}
                    shippingCost={shippingCost}
                    setShippingCost={setShippingCost}
                    total={total}
                    isEditing={true}
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
                        setIsLoading(true);
                        const response = await fetch(`/api/cotizaciones?id=${cotizacionId}`);
                        
                        if (!response.ok) {
                          throw new Error('Error al obtener datos para el PDF');
                        }
                        
                        const data = await response.json();
                        
                        if (!data.cotizacion) {
                          throw new Error('Error al obtener datos para el PDF');
                        }

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
                          setIsLoading(false);
                        }, 3000);
                      } catch (error) {
                        console.error('Error downloading PDF:', error);
                        toast({
                          title: "Error",
                          description: "No se pudo descargar el PDF. Intente nuevamente.",
                          variant: "destructive",
                        });
                        setIsLoading(false);
                      }
                    }}
                    disabled={isLoading}
                    className="border-emerald-500 text-emerald-500 hover:bg-emerald-50 px-4 h-10 text-sm font-medium flex items-center"
                  >
                    {isLoading ? (
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
                      if (!isLoading) {
                        setIsLoading(true);
                        handleUpdateCotizacion().catch(() => setIsLoading(false));
                      }
                    }} 
                    disabled={isLoading}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 h-10 text-sm font-medium flex items-center"
                    size="md"
                  >
                    {isLoading ? (
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