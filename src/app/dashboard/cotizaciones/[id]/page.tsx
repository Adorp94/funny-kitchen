"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, FileText, DollarSign } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { formatDate, formatCurrency } from "@/lib/utils";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Badge } from "@/components/ui/badge";
import { CotizacionStatusModal } from "@/components/cotizacion/cotizacion-status-modal";
import { getCotizacionDetails, updateCotizacionStatus } from "@/app/actions/cotizacion-actions";

interface PaymentFormData {
  monto: number;
  metodo_pago: string;
  porcentaje: number;
  notas: string;
}

export default function CotizacionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const [cotizacion, setCotizacion] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const cotizacionId = typeof params.id === "string" ? parseInt(params.id, 10) : 0;
  
  useEffect(() => {
    if (cotizacionId) {
      fetchCotizacion();
    }
  }, [cotizacionId]);
  
  const fetchCotizacion = async () => {
    try {
      setIsLoading(true);
      
      const result = await getCotizacionDetails(cotizacionId);
      
      if (result.success) {
        setCotizacion(result.data);
      } else {
        throw new Error(result.error || "No se pudo cargar la cotización");
      }
    } catch (error) {
      console.error("Error fetching cotizacion:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la cotización",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleStatusChange = async (
    cotizacionId: number, 
    newStatus: string, 
    paymentData?: PaymentFormData
  ) => {
    try {
      const result = await updateCotizacionStatus(cotizacionId, newStatus, paymentData);
      
      if (result.success) {
        // Refresh the data
        fetchCotizacion();
        return true;
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo actualizar el estado",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar el estado",
        variant: "destructive",
      });
      return false;
    }
  };
  
  const getStatusBadge = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'pendiente':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Pendiente</Badge>;
      case 'aprobada':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Aprobada</Badge>;
      case 'rechazada':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rechazada</Badge>;
      case 'cerrada':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Cerrada</Badge>;
      case 'vencida':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Vencida</Badge>;
      default:
        return <Badge variant="outline">{estado ? estado.charAt(0).toUpperCase() + estado.slice(1) : 'No definido'}</Badge>;
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!cotizacion) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Cotización no encontrada</h2>
          <p className="text-gray-600 mb-4">La cotización que buscas no existe o ha sido eliminada</p>
          <Link href="/dashboard/cotizaciones">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a cotizaciones
            </Button>
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="py-8 px-6 sm:px-10 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/cotizaciones">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Cotización {cotizacion.folio || `#${cotizacion.cotizacion_id}`}</h1>
          {getStatusBadge(cotizacion.estado)}
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <FileText className="mr-2 h-4 w-4" />
            Cambiar Estado
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Client information */}
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Información del Cliente</h2>
          
          {cotizacion.cliente ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Nombre</p>
                <p className="font-medium">{cotizacion.cliente.nombre}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Teléfono</p>
                <p className="font-medium">{cotizacion.cliente.celular}</p>
              </div>
              
              {cotizacion.cliente.correo && (
                <div>
                  <p className="text-sm text-gray-500">Correo</p>
                  <p className="font-medium">{cotizacion.cliente.correo}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">No se encontró información del cliente</p>
          )}
        </div>
        
        {/* Cotizacion details */}
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Detalles de la Cotización</h2>
          
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Fecha</p>
              <p className="font-medium">{formatDate(cotizacion.fecha_creacion || cotizacion.fecha_cotizacion)}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Moneda</p>
              <p className="font-medium">{cotizacion.moneda || 'MXN'}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Tiempo de Entrega</p>
              <p className="font-medium">{cotizacion.tiempo_estimado || 'No especificado'}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Estado de Pago</p>
              <p className="font-medium">{
                cotizacion.estatus_pago === 'anticipo' 
                  ? 'Con anticipo' 
                  : cotizacion.estatus_pago === 'pagado' 
                  ? 'Pagado' 
                  : 'Pendiente'
              }</p>
            </div>
          </div>
        </div>
        
        {/* Financial summary */}
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Resumen Financiero</h2>
          
          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">
                {formatCurrency(
                  (cotizacion.subtotal || cotizacion.precio_total || 0) - 
                  (cotizacion.monto_iva || cotizacion.iva || 0) - 
                  (cotizacion.costo_envio || cotizacion.envio || 0), 
                  cotizacion.moneda
                )}
              </span>
            </div>
            
            {(cotizacion.descuento_global || cotizacion.descuento_total) > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Descuento</span>
                <span className="font-medium text-red-600">
                  -{formatCurrency(cotizacion.descuento_global || cotizacion.descuento_total || 0, cotizacion.moneda)}
                </span>
              </div>
            )}
            
            {(cotizacion.monto_iva || cotizacion.iva) > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">IVA (16%)</span>
                <span className="font-medium">
                  {formatCurrency(cotizacion.monto_iva || cotizacion.iva || 0, cotizacion.moneda)}
                </span>
              </div>
            )}
            
            {(cotizacion.costo_envio || cotizacion.envio) > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Envío</span>
                <span className="font-medium">
                  {formatCurrency(cotizacion.costo_envio || cotizacion.envio || 0, cotizacion.moneda)}
                </span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex justify-between items-center font-bold">
              <span>Total</span>
              <span className="text-emerald-600">
                {formatCurrency(cotizacion.total || cotizacion.precio_total || 0, cotizacion.moneda)}
              </span>
            </div>
            
            {/* Show advance payment information if available */}
            {cotizacion.pagos && cotizacion.pagos.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-medium text-gray-700 mb-2 flex items-center">
                    <DollarSign className="h-4 w-4 mr-1" />
                    Anticipo Recibido
                  </h3>
                  <div className="bg-blue-50 p-3 rounded-md">
                    <div className="flex justify-between text-sm">
                      <span>Monto:</span>
                      <span className="font-medium">{formatCurrency(cotizacion.pagos[0].monto, cotizacion.pagos[0].moneda)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Fecha:</span>
                      <span className="font-medium">{formatDate(cotizacion.pagos[0].fecha_pago)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Método:</span>
                      <span className="font-medium">{cotizacion.pagos[0].metodo_pago}</span>
                    </div>
                    {cotizacion.pagos[0].porcentaje && (
                      <div className="flex justify-between text-sm">
                        <span>Porcentaje:</span>
                        <span className="font-medium">{cotizacion.pagos[0].porcentaje}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Products section */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Productos</h2>
        
        {cotizacion.productos && cotizacion.productos.length > 0 ? (
          <ResponsiveTable>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio Unitario
                  </th>
                  {cotizacion.productos.some((p: any) => p.descuento && p.descuento > 0) && (
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descuento
                    </th>
                  )}
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cotizacion.productos.map((producto: any) => (
                  <tr key={producto.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {producto.nombre}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {producto.cantidad}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {formatCurrency(producto.precio_unitario || producto.precio, cotizacion.moneda)}
                    </td>
                    {cotizacion.productos.some((p: any) => p.descuento && p.descuento > 0) && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {producto.descuento ? `${producto.descuento}%` : '-'}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                      {formatCurrency(producto.precio_total || producto.subtotal, cotizacion.moneda)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResponsiveTable>
        ) : (
          <div className="bg-gray-50 p-4 rounded-md text-gray-500">
            No hay productos asociados a esta cotización
          </div>
        )}
      </div>
      
      {/* Status change modal */}
      <CotizacionStatusModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        cotizacion={cotizacion}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
} 