"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClienteForm } from "@/components/cotizacion/cliente-form";
import ProductoForm, { NewProductData } from "@/components/cotizacion/producto-form";
import { ProductosTable } from "@/components/cotizacion/productos-table";
import { Resumen } from "@/components/cotizacion/resumen";
import { generateProductId } from "@/lib/utils";

interface Cliente {
  id?: number;
  nombre: string;
  celular: string;
  correo?: string;
  razon_social?: string;
  rfc?: string;
  tipo_cliente?: string;
  direccion_envio?: string;
  recibe?: string;
  atencion?: string;
}

interface Product {
  prodsxc_id: number;
  item: number;
  producto_id: number;
  nombre: string | null;
  producto: string | null;
  colores: string;
  cantidad: number;
  precio_final: number;
  descuento: number;
  capacidad?: number;
  unidad?: string;
  descripcion?: string;
  acabado?: string;
}

export default function NuevaCotizacionPage() {
  const router = useRouter();
  
  // State for cliente
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [existingClienteId, setExistingClienteId] = useState<number | null>(null);
  const [isNewClient, setIsNewClient] = useState(true);
  
  // State for productos
  const [products, setProducts] = useState<Product[]>([]);
  const [nextProductId, setNextProductId] = useState(1);
  const [nextItemId, setNextItemId] = useState(1);
  
  // State for cotización settings
  const [descuento, setDescuento] = useState(0);
  const [currency, setCurrency] = useState<"MXN" | "USD">("MXN");
  const [hasIva, setHasIva] = useState(true);
  const [hasShipping, setHasShipping] = useState(false);
  const [shippingAmount, setShippingAmount] = useState<number>(100);
  const [estimatedTime, setEstimatedTime] = useState(6);
  const [exchangeRate, setExchangeRate] = useState(20);
  
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
    return products.reduce((total, product) => {
      return total + (product.cantidad * (product.precio_final - (product.precio_final * product.descuento)));
    }, 0);
  };
  
  // Handle client selection or creation
  const handleClienteSubmit = (data: Cliente, isNew: boolean) => {
    setCliente(data);
    setIsNewClient(isNew);
    if (!isNew) {
      setExistingClienteId(data.id || null);
    }
  };
  
  // Handle adding a new product
  const handleAddNewProduct = async (data: NewProductData) => {
    const newProduct: Product = {
      prodsxc_id: nextProductId,
      item: nextItemId,
      producto_id: 0, // This will be filled when saved to database
      nombre: data.nombre,
      producto: null,
      colores: data.colores.join(', '),
      capacidad: data.capacidad,
      unidad: data.unidad,
      cantidad: data.cantidad,
      precio_final: data.precio,
      descuento: 0,
      descripcion: data.descripcion
    };
    
    setProducts([...products, newProduct]);
    setNextProductId(nextProductId + 1);
    setNextItemId(nextItemId + 1);
  };
  
  // Handle removing a product
  const handleRemoveProduct = (id: number) => {
    setProducts(products.filter(product => product.prodsxc_id !== id));
  };
  
  // Handle product discount change
  const handleProductDiscountChange = (id: number, discount: number) => {
    setProducts(products.map(product => 
      product.prodsxc_id === id 
        ? { ...product, descuento: discount } 
        : product
    ));
  };
  
  // Handle form submission
  const handleGenerateCotizacion = async () => {
    if (!cliente) {
      toast.error("Por favor, selecciona o crea un cliente");
      return;
    }
    
    if (products.length === 0) {
      toast.error("Por favor, agrega al menos un producto");
      return;
    }
    
    try {
      const subtotal = calcSubtotal();
      const iva = hasIva ? 1.16 : 1;
      const envio = hasShipping ? shippingAmount : 0;
      
      const cotizacionData = {
        cliente_id: existingClienteId,
        cliente: isNewClient ? {
          nombre: cliente.nombre,
          celular: cliente.celular,
          correo: cliente.correo,
          razon_social: cliente.razon_social,
          rfc: cliente.rfc,
          tipo_cliente: cliente.tipo_cliente,
          direccion_envio: cliente.direccion_envio,
          recibe: cliente.recibe,
          atencion: cliente.atencion
        } : null,
        vendedor_id: 1, // Default vendedor ID
        fecha_cotizacion: new Date().toISOString(),
        moneda: currency,
        tipo_cambio: exchangeRate,
        iva: iva,
        tipo_cuenta: hasIva ? "MORAL" : "FISICA",
        descuento_total: descuento,
        precio_total: subtotal * (1 - descuento) * iva + envio,
        tiempo_estimado: estimatedTime,
        envio: envio,
        productos: products.map(product => ({
          producto_id: product.producto_id,
          colores: product.colores,
          descuento: product.descuento,
          cantidad: product.cantidad,
          precio_final: product.precio_final,
          acabado: product.acabado,
          descripcion: product.descripcion
        }))
      };
      
      const response = await fetch("/api/cotizaciones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cotizacionData),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success("Cotización generada con éxito");
        router.push(`/cotizaciones/${result.cotizacion_id}`);
      } else {
        throw new Error(result.error || "Error al generar la cotización");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al generar la cotización");
    }
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Nueva Cotización</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ClienteForm onClienteChange={data => handleClienteSubmit(data, true)} />
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Productos</h2>
            
            <Tabs defaultValue="agregar" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="agregar" className="flex-1">Agregar Producto</TabsTrigger>
                <TabsTrigger value="lista" className="flex-1">Lista de Productos</TabsTrigger>
              </TabsList>
              
              <TabsContent value="agregar">
                <ProductoForm 
                  onSubmit={handleAddNewProduct} 
                  onCancel={() => {}} 
                />
              </TabsContent>
              
              <TabsContent value="lista">
                {products.length > 0 ? (
                  <ProductosTable 
                    products={products} 
                    onDelete={handleRemoveProduct} 
                    onDescuentoChange={handleProductDiscountChange} 
                    currency={currency}
                    exchangeRate={exchangeRate}
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No hay productos agregados
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <Resumen 
            subtotal={calcSubtotal()}
            onDescuentoChange={setDescuento}
            onCurrencyChange={setCurrency}
            onIvaChange={setHasIva}
            onShippingChange={(hasShipping, amount) => {
              setHasShipping(hasShipping);
              if (amount !== undefined) setShippingAmount(amount);
            }}
            onEstimatedTimeChange={setEstimatedTime}
            onGenerateCotizacion={handleGenerateCotizacion}
            exchangeRate={exchangeRate}
            isFormValid={!!cliente && products.length > 0}
          />
        </div>
      </div>
    </div>
  );
}