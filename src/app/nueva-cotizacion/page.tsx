"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, User, Package, Receipt, Save, DollarSign, FileText } from "lucide-react";
import { ClienteForm } from "@/components/cotizacion/cliente-form";
import ProductoFormTabs from "@/components/cotizacion/producto-form-tabs";
import { ListaProductos } from "@/components/cotizacion/lista-productos";
import { ListaProductosConDescuento, ProductoConDescuento } from "@/components/cotizacion/lista-productos-con-descuento";
import { ResumenCotizacion } from "@/components/cotizacion/resumen-cotizacion";
import { useProductos } from "@/contexts/productos-context";
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

// Define the Producto interface properly
interface Producto extends ExtendedProductoBase {
  subtotal: number;
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

export default function NuevaCotizacionPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<number>(1);
  
  // State for cliente
  const [clienteData, setClienteData] = useState<Cliente | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { convertMXNtoUSD, convertUSDtoMXN } = useExchangeRate();

  // Get productos from context
  const {
    productos,
    addProducto,
    removeProducto,
    updateProductoDiscount: handleUpdateProductDiscount,
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
    exchangeRate
  } = useProductos();

  // Add formData state
  const [formData, setFormData] = useState<ProductoFormData>({ tipo: 'nuevo' });

  // Use effect to update cliente state after render
  useEffect(() => {
    if (clienteData) {
      setCliente(clienteData);
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

  // Update handleSubmit to use MouseEvent instead of FormEvent
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
      // In this simplified version, navigate to the PDF view
      setTimeout(() => {
        setIsLoading(false);
        router.push('/ver-cotizacion');
      }, 1000);
    } catch (error) {
      console.error('Error generating quotation:', error);
      setIsLoading(false);
      toast.error("Error al generar la cotización");
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
  
  // Format currency with proper conversion
  const formatCurrency = (amount: number): string => {
    let displayAmount = amount;
    
    // Convert to USD if needed
    if (moneda === 'USD' && exchangeRate) {
      displayAmount = amount / exchangeRate;
      console.log(`Converting ${amount} MXN → ${displayAmount.toFixed(2)} USD (rate: ${exchangeRate})`);
    }
    
    return `$${displayAmount.toFixed(2)} ${moneda}`;
  };

  // Handle currency change
  const handleCurrencyChange = (newCurrency: 'MXN' | 'USD') => {
    console.log(`Changing currency from ${moneda} to ${newCurrency}`);
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

  return (
    <div className="py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col items-center mb-12">
          <h1 className="text-2xl font-medium text-gray-900 mb-10">Nueva Cotización</h1>
          
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
                <ClienteForm onClienteChange={setClienteData} />
              </div>
              <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t border-gray-100">
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/')}
                  className="text-gray-600 border-gray-300"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={nextStep} 
                  disabled={!cliente} 
                  className="bg-teal-500 hover:bg-teal-600 text-white px-5"
                >
                  Continuar <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          
          {/* Step 2: Productos */}
          {activeStep === 2 && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Package className="h-5 w-5 text-teal-600 mr-2" />
                      <h2 className="text-lg font-medium text-gray-900">Agregar Productos</h2>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">Moneda:</span>
                      <Select value={moneda} onValueChange={(value: 'MXN' | 'USD') => setMoneda(value)}>
                        <SelectTrigger className="w-[100px]">
                          <SelectValue placeholder="Moneda" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200">
                          <SelectItem value="MXN">MXN</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
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
                        id: String(producto.producto_id || Date.now()), // Use product ID or timestamp
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
                      };
                      
                      // Check if this product already exists in the cart by ID
                      const existingProductIndex = productos.findIndex(
                        p => p.id === productoToAdd.id
                      );
                      
                      if (existingProductIndex >= 0) {
                        // If it exists, update the quantity and subtotal
                        const updatedProductos = [...productos];
                        const existingProduct = updatedProductos[existingProductIndex];
                        
                        // When the same product is added again, accumulate the quantity
                        const newQuantity = existingProduct.cantidad + productoToAdd.cantidad;
                        
                        updatedProductos[existingProductIndex] = {
                          ...existingProduct,
                          cantidad: newQuantity,
                          subtotal: productoToAdd.precio * newQuantity,
                        };
                        
                        // Replace the entire array in context
                        clearProductos();
                        updatedProductos.forEach(p => addProducto(p));
                        
                        // Show a single notification about the update
                        toast.success(`Se actualizó el producto "${productoToAdd.nombre}" (${newQuantity} unidades)`);
                      } else {
                        // If it's a new product, add it
                        addProducto(productoToAdd);
                        toast.success(`Se agregó "${productoToAdd.nombre}" a la cotización`);
                      }
                    }
                  }} />
                </div>
              </div>
              
              {/* Client summary for this step */}
              {cliente && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 flex justify-between items-center">
                    <h3 className="text-sm font-medium text-gray-700">Cliente Seleccionado</h3>
                    <Button 
                      variant="ghost" 
                      className="text-teal-600 h-8 px-2 py-0" 
                      onClick={() => setActiveStep(1)}
                    >
                      Cambiar
                    </Button>
                  </div>
                  <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900">{cliente.nombre}</p>
                      <p className="text-sm text-gray-500">{cliente.celular}</p>
                      {cliente.correo && <p className="text-sm text-gray-500">{cliente.correo}</p>}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Products list */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100">
                  <h2 className="text-lg font-medium text-gray-900">Productos Agregados</h2>
                </div>
                <div className="p-6">
                  <ListaProductos 
                    productos={productos} 
                    onRemoveProduct={removeProducto}
                    moneda={moneda} 
                  />
                </div>
                <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t border-gray-100">
                  <Button 
                    variant="outline" 
                    onClick={prevStep}
                    className="text-gray-600 border-gray-300"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Regresar
                  </Button>
                  <Button 
                    onClick={nextStep} 
                    disabled={productos.length === 0}
                    className="bg-teal-500 hover:bg-teal-600 text-white px-5"
                  >
                    Continuar <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 3: Resumen y Finalizar */}
          {activeStep === 3 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100">
                <div className="flex items-center">
                  <Receipt className="h-5 w-5 text-teal-600 mr-2" />
                  <h2 className="text-lg font-medium text-gray-900">Resumen de la Cotización</h2>
                </div>
              </div>
              <div className="p-6">
                {/* Client Info */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-gray-700 mb-3">Información del Cliente</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex">
                      <span className="text-gray-500 w-20">Nombre:</span>
                      <span className="font-medium text-gray-900">{cliente?.nombre}</span>
                    </li>
                    <li className="flex">
                      <span className="text-gray-500 w-20">Teléfono:</span>
                      <span className="font-medium text-gray-900">{cliente?.celular}</span>
                    </li>
                    {cliente?.correo && (
                      <li className="flex">
                        <span className="text-gray-500 w-20">Correo:</span>
                        <span className="font-medium text-gray-900">{cliente?.correo}</span>
                      </li>
                    )}
                    {cliente?.atencion && (
                      <li className="flex">
                        <span className="text-gray-500 w-20">Atención:</span>
                        <span className="font-medium text-gray-900">{cliente?.atencion}</span>
                      </li>
                    )}
                  </ul>
                  <Button 
                    variant="ghost" 
                    className="text-teal-600 p-0 h-auto mt-3 text-xs" 
                    onClick={() => setActiveStep(1)}
                  >
                    Editar cliente
                  </Button>
                </div>
                
                {/* Products with individual discounts */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium text-gray-700">Productos</h3>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-500">Moneda: {moneda}</span>
                    </div>
                  </div>
                  <ListaProductosConDescuento 
                    productos={productos} 
                    onRemoveProduct={removeProducto}
                    onUpdateProductDiscount={handleUpdateProductDiscount}
                    moneda={moneda}
                    editMode={true}
                  />
                  <Button 
                    variant="ghost" 
                    className="text-teal-600 p-0 h-auto mt-3 text-xs" 
                    onClick={() => setActiveStep(2)}
                  >
                    Editar productos
                  </Button>
                </div>
                
                {/* Summary with global discount, IVA and shipping */}
                <ResumenCotizacion 
                  subtotal={subtotal}
                  onGlobalDiscountChange={setGlobalDiscount}
                  onIvaChange={setHasIva}
                  onShippingChange={setShippingCost}
                  moneda={moneda}
                  onCurrencyChange={handleCurrencyChange}
                />
              </div>
              <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t border-gray-100">
                <Button 
                  variant="outline" 
                  onClick={prevStep}
                  className="text-gray-600 border-gray-300"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Regresar
                </Button>
                <Button 
                  onClick={handleGenerateCotizacion}
                  disabled={isLoading || !cliente || productos.length === 0}
                  className="bg-teal-500 hover:bg-teal-600 text-white px-5"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generando...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      Ver Cotización en PDF <FileText className="ml-2 h-4 w-4" />
                    </span>
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
