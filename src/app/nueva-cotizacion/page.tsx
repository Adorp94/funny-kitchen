"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductoExistenteForm } from "@/components/cotizacion/producto-existente-form";
import { useCart } from "@/contexts/cart-context";
import { ClienteForm } from "@/components/cotizacion/cliente-form";
import { Resumen } from "@/components/cotizacion/resumen";
import { CartTable } from "@/components/cart/cart-table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Check, ChevronRight, ShoppingCart, User, Receipt, Save } from "lucide-react";

// Match the interface with ClienteForm component
interface Cliente {
  cliente_id: number;
  nombre: string;
  celular: string;
  correo: string | null;
  razon_social: string | null;
  rfc: string | null;
  tipo_cliente: string | null;
  lead: string | null;
  direccion_envio: string | null;
  recibe: string | null;
  atencion: string | null;
}

export default function NuevaCotizacionPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<number>(1);
  const [activeTab, setActiveTab] = useState("existente");
  const { 
    cartItems, 
    clearCart, 
    currency, 
    setCurrency, 
    exchangeRate, 
    setExchangeRate,
    totalItems 
  } = useCart();
  
  // State for cliente
  const [clienteData, setClienteData] = useState<Cliente | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [existingClienteId, setExistingClienteId] = useState<number | null>(null);
  const [isNewClient, setIsNewClient] = useState(true);
  
  // State for cotización settings
  const [descuento, setDescuento] = useState(0);
  const [hasIva, setHasIva] = useState(true);
  const [hasShipping, setHasShipping] = useState(false);
  const [shippingAmount, setShippingAmount] = useState<number>(100);
  const [estimatedTime, setEstimatedTime] = useState(6);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch exchange rate on component mount
  useEffect(() => {
    fetchExchangeRate();
  }, []);
  
  const fetchExchangeRate = async () => {
    try {
      const response = await fetch("/api/banxico");
      const data = await response.json();
      
      if (data && data.exchangeRate) {
        setExchangeRate(data.exchangeRate);
      }
    } catch (error) {
      console.error("Error fetching exchange rate:", error);
      toast.error("No se pudo obtener el tipo de cambio");
    }
  };
  
  // Calculate subtotal
  const calcSubtotal = () => {
    return cartItems.reduce((total, item) => {
      return total + item.subtotal;
    }, 0);
  };
  
  // Use effect to update cliente state after render
  useEffect(() => {
    if (clienteData) {
      setCliente(clienteData);
      
      // Determine if this is a new client or existing one based on the cliente_id
      const isNewClient = clienteData.cliente_id === 0;
      setIsNewClient(isNewClient);
      
      if (!isNewClient) {
        setExistingClienteId(clienteData.cliente_id);
      } else {
        setExistingClienteId(null);
      }
    }
  }, [clienteData]);
  
  // Handle client selection or creation
  const handleClienteSubmit = (data: Cliente | null, isNew: boolean = true) => {
    if (!data) {
      setClienteData(null);
      return;
    }
    
    // Set the cliente data to the intermediate state variable
    setClienteData(data);
  };

  // Handle currency change
  const handleCurrencyChange = (newCurrency: "MXN" | "USD") => {
    setCurrency(newCurrency);
  };
  
  // Navigate to next step
  const nextStep = () => {
    if (activeStep === 1 && !cliente) {
      toast.error("Por favor, selecciona o crea un cliente");
      return;
    }
    
    if (activeStep === 2 && cartItems.length === 0) {
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
  
  // Add a useEffect to preserve client data when navigating between steps
  useEffect(() => {
    // Save client data to sessionStorage whenever it changes
    if (cliente) {
      sessionStorage.setItem('cotizacion_cliente', JSON.stringify(cliente));
    }
  }, [cliente]);

  // Add a useEffect to load any previously saved client data on component mount
  useEffect(() => {
    // Try to load any saved client data from sessionStorage
    const savedCliente = sessionStorage.getItem('cotizacion_cliente');
    if (savedCliente && !cliente) {
      try {
        const parsedCliente = JSON.parse(savedCliente);
        setClienteData(parsedCliente);
        setCliente(parsedCliente);
        
        // Determine if this is a new client or existing one
        const isNewClient = parsedCliente.cliente_id === 0;
        setIsNewClient(isNewClient);
        
        if (!isNewClient) {
          setExistingClienteId(parsedCliente.cliente_id);
        }
      } catch (e) {
        console.error("Error parsing saved client data:", e);
      }
    }
  }, []);
  
  // Handle form submission
  const handleGenerateCotizacion = async () => {
    if (!cliente) {
      toast.error("Por favor, selecciona o crea un cliente");
      return;
    }
    
    if (cartItems.length === 0) {
      toast.error("Por favor, agrega al menos un producto");
      return;
    }
    
    setIsLoading(true);

    try {
      // Create a temporary cotization ID
      const tempCotizacionId = Math.floor(Math.random() * 10000);
      
      // Prepare the quote data
      const cotizacionData = {
        cliente: {
          nombre: cliente.nombre,
          atencion: cliente.atencion,
          celular: cliente.celular
        },
        vendedor: {
          nombre: "Vendedor",
          celular: "",
          correo: "ventas@funnykitchen.mx"
        },
        moneda: currency,
        iva: hasIva ? 1.16 : 1,
        tipo_cuenta: hasIva ? "MORAL" : "FISICA",
        descuento_total: descuento / 100,
        tiempo_estimado: estimatedTime,
        envio: hasShipping ? shippingAmount : 0,
        productos: cartItems.map(item => ({
          descripcion: item.nombre,
          colores: item.colores,
          descuento: item.descuento / 100,
          cantidad: item.cantidad,
          precio_final: item.precio
        })),
        precio_total: calcSubtotal() * (1 - descuento / 100) * (hasIva ? 1.16 : 1) + (hasShipping ? shippingAmount : 0)
      };
      
      // Create a URL with the data as a parameter
      const params = new URLSearchParams();
      params.append('data', JSON.stringify(cotizacionData));
      
      // Open the direct-pdf endpoint in a new tab for download
      window.open(`/api/direct-pdf/${tempCotizacionId}?${params.toString()}`, '_blank');

      // Clear session storage and cart after successful submission
      sessionStorage.removeItem('cotizacion_cliente');
      sessionStorage.removeItem('cotizacion_clienteForm');
      clearCart();
      setIsLoading(false);
      router.push('/cotizaciones');
      toast.success("¡Cotización generada con éxito!");
    } catch (error) {
      console.error('Error generating quotation:', error);
      setIsLoading(false);
      setError('Failed to generate quotation.');
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
  
  return (
    <div className="py-12 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col items-center mb-12">
          <h1 className="text-2xl font-medium text-gray-900 mb-10">Nueva Cotización</h1>
          
          {/* Step indicators */}
          <div className="flex w-full max-w-3xl justify-between relative">
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
                {activeStep > 1 ? <Check className="h-5 w-5" /> : "1"}
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
                {activeStep > 2 ? <Check className="h-5 w-5" /> : "2"}
              </button>
              <span className="mt-2 text-sm font-medium text-gray-700">Productos</span>
            </div>
            
            {/* Step 3 */}
            <div className="flex flex-col items-center relative z-10">
              <button 
                onClick={() => cliente && cartItems.length > 0 && setActiveStep(3)}
                className={`
                  h-9 w-9 rounded-full ring-2 flex items-center justify-center
                  transition-all duration-200 font-medium text-sm
                  ${getStepClasses(3)}
                `}
              >
                {activeStep > 3 ? <Check className="h-5 w-5" /> : "3"}
              </button>
              <span className="mt-2 text-sm font-medium text-gray-700">Finalizar</span>
            </div>
          </div>
        </div>
        
        {/* Cart summary for mobile - Only show when cart has items */}
        {cartItems.length > 0 && activeStep !== 3 && (
          <div className="lg:hidden mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <ShoppingCart className="h-5 w-5 text-teal-600 mr-2" />
                  <span className="font-medium text-gray-900">{cartItems.length} productos</span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Subtotal</div>
                  <div className="font-medium text-gray-900">
                    {currency === "MXN" ? "MX$" : "US$"}{calcSubtotal().toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Product Form */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex items-center">
                      <ShoppingCart className="h-5 w-5 text-teal-600 mr-2" />
                      <h2 className="text-lg font-medium text-gray-900">Agregar Productos</h2>
                    </div>
                    <Button 
                      variant="ghost" 
                      onClick={prevStep}
                      className="text-gray-600 flex items-center"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
                    </Button>
                  </div>
                  <div className="p-6">
                    <Tabs defaultValue="existente" onValueChange={setActiveTab}>
                      <TabsList className="mb-5 w-full">
                        <TabsTrigger value="existente" className="flex-1">Existente</TabsTrigger>
                        <TabsTrigger value="nuevo" className="flex-1">Nuevo</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="existente">
                        <ProductoExistenteForm />
                      </TabsContent>
                      
                      <TabsContent value="nuevo">
                        <div className="text-center py-10 text-gray-500">
                          <p>Este formulario para agregar productos nuevos está en desarrollo.</p>
                          <Button className="mt-4 bg-teal-500 hover:bg-teal-600 text-white" onClick={() => setActiveTab("existente")}>
                            Usar Productos Existentes
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
                
                {/* Client Summary Card - only visible in Step 2 */}
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
              </div>
              
              {/* Cart Table */}
              <div className="lg:col-span-7">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex items-center">
                      <h2 className="text-lg font-medium text-gray-900">Productos Agregados</h2>
                      {cartItems.length > 0 && (
                        <Badge className="ml-2 bg-teal-100 text-teal-700 border-transparent">
                          {cartItems.length}
                        </Badge>
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      onClick={prevStep}
                      className="text-gray-600 flex items-center"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
                    </Button>
                  </div>
                  <div className="p-6">
                    {cartItems.length > 0 ? (
                      <CartTable />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <ShoppingCart className="h-12 w-12 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-1">Tu carrito está vacío</h3>
                        <p className="text-gray-500 max-w-md">
                          Agrega productos utilizando el formulario de la izquierda para comenzar a crear tu cotización.
                        </p>
                      </div>
                    )}
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
                      disabled={cartItems.length === 0}
                      className="bg-teal-500 hover:bg-teal-600 text-white px-5"
                    >
                      Continuar <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 3: Resumen */}
          {activeStep === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Order Summary */}
              <div className="lg:col-span-7 order-2 lg:order-1">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex items-center">
                      <Receipt className="h-5 w-5 text-teal-600 mr-2" />
                      <h2 className="text-lg font-medium text-gray-900">Resumen de la Cotización</h2>
                    </div>
                    <Button 
                      variant="ghost" 
                      onClick={prevStep}
                      className="text-gray-600 flex items-center"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
                    </Button>
                  </div>
                  <div className="p-6">
                    <div className="space-y-6">
                      {/* Client and Order Summary Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Client Info */}
                        <div className="bg-gray-50 rounded-lg p-4">
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
                        
                        {/* Order Summary */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h3 className="font-medium text-gray-700 mb-3">Detalles del Pedido</h3>
                          <ul className="space-y-2 text-sm">
                            <li className="flex">
                              <span className="text-gray-500 w-24">Productos:</span>
                              <span className="font-medium text-gray-900">{cartItems.length}</span>
                            </li>
                            <li className="flex">
                              <span className="text-gray-500 w-24">Moneda:</span>
                              <span className="font-medium text-gray-900">
                                {currency === "MXN" ? "Pesos (MXN)" : "Dólares (USD)"}
                              </span>
                            </li>
                            <li className="flex">
                              <span className="text-gray-500 w-24">IVA:</span>
                              <span className="font-medium text-gray-900">{hasIva ? "Incluido" : "No aplica"}</span>
                            </li>
                            <li className="flex">
                              <span className="text-gray-500 w-24">Tiempo:</span>
                              <span className="font-medium text-gray-900">{estimatedTime} semanas</span>
                            </li>
                          </ul>
                          <Button 
                            variant="ghost" 
                            className="text-teal-600 p-0 h-auto mt-3 text-xs" 
                            onClick={() => setActiveStep(2)}
                          >
                            Editar productos
                          </Button>
                        </div>
                      </div>
                      
                      {/* Products Table */}
                      <div className="overflow-hidden border border-gray-200 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                              <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Cant.</th>
                              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {cartItems.map((item, index) => (
                              <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-4 py-3">
                                  <div className="flex flex-col">
                                    <div className="font-medium text-gray-900">{item.nombre}</div>
                                    {item.colores && <div className="text-xs text-gray-500 mt-1">Colores: {item.colores}</div>}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-800 text-center">{item.cantidad}</td>
                                <td className="px-4 py-3 text-sm text-gray-500 text-right whitespace-nowrap">
                                  {currency === "MXN" ? "MX$" : "US$"}{item.precio.toFixed(2)}
                                  {item.descuento > 0 && <span className="text-red-500 ml-1">(-{item.descuento}%)</span>}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right whitespace-nowrap">
                                  {currency === "MXN" ? "MX$" : "US$"}{item.subtotal.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
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
                      disabled={isLoading || cartItems.length === 0 || !cliente}
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
                          Generar Cotización <Save className="ml-2 h-4 w-4" />
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Settings Panel */}
              <div className="lg:col-span-5 order-1 lg:order-2">
                <div className="lg:sticky lg:top-20">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                      <h2 className="text-lg font-medium text-gray-900">Ajustes de Cotización</h2>
                      <Button 
                        variant="ghost" 
                        onClick={prevStep}
                        className="text-gray-600 flex items-center"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
                      </Button>
                    </div>
                    <div className="p-6">
                      <Resumen 
                        subtotal={calcSubtotal()}
                        onDescuentoChange={setDescuento}
                        onCurrencyChange={handleCurrencyChange}
                        onIvaChange={setHasIva}
                        onShippingChange={(hasShipping, amount) => {
                          setHasShipping(hasShipping);
                          if (amount !== undefined) setShippingAmount(amount);
                        }}
                        onEstimatedTimeChange={setEstimatedTime}
                        onGenerateCotizacion={handleGenerateCotizacion}
                        exchangeRate={exchangeRate}
                        isFormValid={!!cliente && cartItems.length > 0}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
