"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductoExistenteForm } from "@/components/cotizacion/producto-existente-form";
import { useCart } from "@/contexts/cart-context";
import { ClienteForm } from "@/components/cotizacion/cliente-form";
import { Resumen } from "@/components/cotizacion/resumen";
import { CartTable } from "@/components/cart/cart-table";
import { supabase } from "@/lib/supabase/client";

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
  const [activeTab, setActiveTab] = useState("existente");
  const { 
    cartItems, 
    clearCart, 
    currency, 
    setCurrency, 
    exchangeRate, 
    setExchangeRate 
  } = useCart();
  
  // State for cliente
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
  
  // Handle client selection or creation
  const handleClienteSubmit = (clienteData: Cliente | null, isNew: boolean = true) => {
    if (!clienteData) {
      setCliente(null);
      setExistingClienteId(null);
      return;
    }
    
    // Simply set the cliente as is, since it now matches our interface
    setCliente(clienteData);
    
    // Determine if this is a new client or existing one based on the cliente_id
    // If cliente_id is 0, it means it's a new client from the form
    const isNewClient = clienteData.cliente_id === 0;
    setIsNewClient(isNewClient);
    
    if (!isNewClient) {
      setExistingClienteId(clienteData.cliente_id);
    } else {
      setExistingClienteId(null);
    }
  };

  // Handle currency change
  const handleCurrencyChange = (newCurrency: "MXN" | "USD") => {
    setCurrency(newCurrency);
  };
  
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

      // Clear cart and redirect
      clearCart();
      setIsLoading(false);
      router.push('/');
    } catch (error) {
      console.error('Error generating quotation:', error);
      setIsLoading(false);
      setError('Failed to generate quotation.');
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Nueva Cotización</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white rounded-lg p-6 shadow-sm">
        {/* Left Column - Client & Product Form */}
        <div className="lg:col-span-5 space-y-6">
          <div>
            <h2 className="text-lg font-medium mb-4">Cliente</h2>
            <ClienteForm 
              onClienteChange={(data) => handleClienteSubmit(data)} 
            />
          </div>
        
          <div className="pt-6 border-t border-gray-100">
            <h2 className="text-lg font-medium mb-4">Agregar Productos</h2>
            <Tabs defaultValue="existente" onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="existente">Existente</TabsTrigger>
                <TabsTrigger value="nuevo">Nuevo</TabsTrigger>
              </TabsList>
              
              <TabsContent value="existente">
                <ProductoExistenteForm />
              </TabsContent>
              
              <TabsContent value="nuevo">
                <div className="text-center py-8 text-gray-500">
                  <p>Este formulario para agregar productos nuevos está en desarrollo.</p>
                  <Button className="mt-4 bg-teal-500 hover:bg-teal-600 text-white" onClick={() => setActiveTab("existente")}>
                    Usar Productos Existentes
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        
        {/* Right Column - Cart & Summary */}
        <div className="lg:col-span-7 space-y-6 pl-0 lg:pl-6 pt-6 lg:pt-0 mt-6 lg:mt-0 border-t lg:border-t-0 lg:border-l border-gray-100">
          <div>
            <h2 className="text-lg font-medium mb-4">Productos Agregados</h2>
            {cartItems.length > 0 ? (
              <CartTable />
            ) : (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                <p>No hay productos en la cotización</p>
              </div>
            )}
          </div>
          
          <div className="pt-6 border-t border-gray-100">
            <h2 className="text-lg font-medium mb-4">Resumen</h2>
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
  );
}
