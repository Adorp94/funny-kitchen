"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, FileText, DollarSign, User, Calendar, Clock, Truck, Info, Percent } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CotizacionStatusModal } from "@/components/cotizacion/cotizacion-status-modal";
import { getCotizacionDetails } from "@/app/actions/cotizacion-actions";
import { supabase } from "@/lib/supabase/client";

interface PaymentFormData {
  monto: number;
  metodo_pago: string;
  porcentaje: number;
}

const DetailItem = ({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ElementType }) => (
  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between py-2">
    <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
      {Icon && <Icon className="h-4 w-4" />}
      {label}
    </dt>
    <dd className="mt-1 text-sm text-foreground sm:mt-0 text-right font-semibold break-words">
      {value}
    </dd>
  </div>
);

export default function CotizacionDetailPage() {
  const params = useParams();
  const router = useRouter();
  
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
      toast("No se pudo cargar la cotización", {
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleStatusChange = async (
    cotizacionId: number,
    newStatus: string,
    fecha: Date,
    paymentData?: PaymentFormData
  ) => {
    if (!cotizacion) {
      toast.error("Error: Datos de cotización no disponibles.");
      return false;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;
    const fechaISO = fecha.toISOString().split('T')[0];

    try {
      let rpcResult;

      if (newStatus === 'producción') {
        if (!paymentData || paymentData.monto <= 0 || !paymentData.metodo_pago) {
           toast.error("Datos de anticipo inválidos para mover a producción.");
           return false;
        }

        const rpcParamsApprove = {
          p_cotizacion_id: cotizacionId,
          p_usuario_id: userId, 
          p_monto_anticipo: paymentData.monto,
          p_metodo_pago: paymentData.metodo_pago,
          p_moneda: cotizacion.moneda,
          p_tipo_cambio: cotizacion.moneda === 'USD' ? cotizacion.tipo_cambio : null, 
          p_fecha_cambio: fechaISO
        };
        console.log("Calling aprobar_cotizacion_a_produccion with params:", rpcParamsApprove);

        const { data, error } = await supabase.rpc('aprobar_cotizacion_a_produccion', rpcParamsApprove);

        if (error) throw error;
        rpcResult = data;

      } else if (newStatus === 'rechazada') {
        const rpcParamsReject = {
          p_cotizacion_id: cotizacionId,
          p_usuario_id: userId, 
          p_fecha_cambio: fechaISO
        };
        console.log("Calling rechazar_cotizacion with params:", rpcParamsReject);

        const { data, error } = await supabase.rpc('rechazar_cotizacion', rpcParamsReject);

        if (error) throw error;
        rpcResult = data;

      } else {
         toast.error(`Estado "${newStatus}" no manejado.`);
         return false;
      }

      if (rpcResult === true) {
        await fetchCotizacion();
        return true;
      } else {
         toast.error("La operación falló en la base de datos (RPC devolvió false).");
         return false;
      }

    } catch (error: any) {
      console.error("Error calling RPC function (raw error object):", error);
      const messageFromServer = error?.message || JSON.stringify(error);
      const errorMessage = messageFromServer.includes(':')
         ? messageFromServer.split(':').pop().trim()
         : messageFromServer;
      toast.error(`Error: ${errorMessage}`);
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
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!cotizacion) {
    return (
      <div className="container mx-auto py-8">
        <Card className="text-center p-8">
           <CardHeader>
             <CardTitle className="text-2xl font-semibold text-destructive mb-2">Cotización no encontrada</CardTitle>
             <CardDescription>La cotización que buscas no existe o ha sido eliminada.</CardDescription>
           </CardHeader>
           <CardContent>
              <Link href="/dashboard/cotizaciones">
                <Button variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver a cotizaciones
                </Button>
              </Link>
           </CardContent>
         </Card>
      </div>
    );
  }
  
  const subtotal = (cotizacion.subtotal || cotizacion.precio_total || 0) -
                 (cotizacion.monto_iva || cotizacion.iva || 0) -
                 (cotizacion.costo_envio || cotizacion.envio || 0);
  const descuento = cotizacion.descuento_global || cotizacion.descuento_total || 0;
  const envio = cotizacion.costo_envio || cotizacion.envio || 0;
  const iva = cotizacion.monto_iva || cotizacion.iva || 0;
  const total = cotizacion.total || cotizacion.precio_total || 0;

  return (
    <div className="py-6 px-4 sm:py-8 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/cotizaciones">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Volver</span>
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">{cotizacion.folio || `Cotización #${cotizacion.cotizacion_id}`}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                 <Calendar className="h-3.5 w-3.5" />
                 {formatDate(cotizacion.fecha_creacion || cotizacion.fecha_cotizacion)}
              </div>
              {getStatusBadge(cotizacion.estado)}
            </div>
          </div>
        </div>
        
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto"
        >
          <FileText className="mr-2 h-4 w-4" />
          Cambiar Estado
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" /> Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-gray-100">
              {cotizacion.cliente ? (
                <>
                  <DetailItem label="Nombre" value={cotizacion.cliente.nombre} />
                  <DetailItem label="Teléfono" value={cotizacion.cliente.celular || '-'} />
                  {cotizacion.cliente.correo && (
                    <DetailItem label="Correo" value={cotizacion.cliente.correo} />
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-2">No se encontró información del cliente.</p>
              )}
            </dl>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" /> Detalles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-gray-100">
              <DetailItem label="Moneda" value={cotizacion.moneda || 'MXN'} icon={DollarSign} />
              <DetailItem label="Tiempo Estimado" value={cotizacion.tiempo_estimado || 'No especificado'} icon={Clock} />
              <DetailItem label="Estado de Pago" value={ 
                  cotizacion.estatus_pago === 'anticipo' ? <Badge variant="default">Con anticipo</Badge> : 
                  cotizacion.estatus_pago === 'pagado' ? <Badge variant="success">Pagado</Badge> : 
                  <Badge variant="warning">Pendiente</Badge>
                } 
              />
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Productos / Servicios</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Cantidad</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">P. Unitario</TableHead>
                <TableHead className="text-right">Importe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cotizacion.productos && cotizacion.productos.length > 0 ? (
                cotizacion.productos.map((item: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{item.cantidad}</TableCell>
                    <TableCell className="font-medium">{item.descripcion}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.precio_unitario, cotizacion.moneda)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.precio_total ?? 0, cotizacion.moneda)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                    No hay productos en esta cotización.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            
            {(cotizacion.productos && cotizacion.productos.length > 0) && (
               <TableFooter>
                 <TableRow>
                   <TableCell colSpan={2}></TableCell>
                   <TableCell className="text-right text-muted-foreground">Subtotal</TableCell>
                   <TableCell className="text-right font-semibold">{formatCurrency(subtotal, cotizacion.moneda)}</TableCell>
                 </TableRow>
                 {descuento > 0 && (
                   <TableRow>
                     <TableCell colSpan={2}></TableCell>
                     <TableCell className="text-right text-muted-foreground">Descuento</TableCell>
                     <TableCell className="text-right font-semibold text-red-600">- {formatCurrency(descuento, cotizacion.moneda)}</TableCell>
                   </TableRow>
                 )}
                 {envio > 0 && (
                   <TableRow>
                     <TableCell colSpan={2}></TableCell>
                     <TableCell className="text-right text-muted-foreground">Envío</TableCell>
                     <TableCell className="text-right font-semibold">{formatCurrency(envio, cotizacion.moneda)}</TableCell>
                   </TableRow>
                 )}
                 {iva > 0 && (
                   <TableRow>
                     <TableCell colSpan={2}></TableCell>
                     <TableCell className="text-right text-muted-foreground">IVA</TableCell>
                     <TableCell className="text-right font-semibold">{formatCurrency(iva, cotizacion.moneda)}</TableCell>
                   </TableRow>
                 )}
                 <TableRow className="bg-muted/50 hover:bg-muted/50">
                   <TableCell colSpan={2}></TableCell>
                   <TableCell className="text-right font-bold text-lg">Total</TableCell>
                   <TableCell className="text-right font-bold text-lg">{formatCurrency(total, cotizacion.moneda)}</TableCell>
                 </TableRow>
               </TableFooter>
             )}
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {(cotizacion.observaciones || cotizacion.comentarios) && (
            <Card>
               <CardHeader>
                 <CardTitle>Observaciones</CardTitle>
               </CardHeader>
               <CardContent>
                 <p className="text-sm text-muted-foreground whitespace-pre-wrap">{cotizacion.observaciones || cotizacion.comentarios}</p>
               </CardContent>
             </Card>
          )}
         
         {cotizacion.terminos_condiciones && (
           <Card>
             <CardHeader>
               <CardTitle>Términos y Condiciones</CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-sm text-muted-foreground whitespace-pre-wrap">{cotizacion.terminos_condiciones}</p>
             </CardContent>
           </Card>
         )}
      </div>

      {cotizacion && (
        <CotizacionStatusModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          cotizacion={cotizacion}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
} 