"use client";

import { useState, useEffect } from 'react';
import { AlertCircle, CreditCard, DollarSign, FileClock, FileText, Check, X, ArrowRight, TruckIcon, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import { formatCurrency } from '@/lib/utils';
// Removed incorrect imports from @/lib/utils
// Imports will be added from where they are defined, assuming nueva-cotizacion page or similar

// Import functions directly if defined globally or pass them as props
// Assuming formatDate and formatCurrency might be defined in a parent or utils file
// For now, we'll define basic placeholders here to remove the error, 
// but these should be replaced with the actual imports/definitions.
const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return 'Fecha inválida';
  }
};

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface Cliente {
  nombre: string;
  celular?: string;
  correo?: string;
}

interface Producto {
  id: string;
  nombre: string;
  cantidad: number;
  precio: number;
  precio_unitario?: number;
  precio_total?: number;
  descuento?: number;
  subtotal: number;
}

interface Cotizacion {
  cotizacion_id: number;
  folio: string;
  fecha_creacion: string;
  estado: string;
  cliente: Cliente;
  moneda: string;
  total: number;
  total_mxn?: number;
  productos?: Producto[];
  estatus_pago?: string;
  iva?: boolean;
  monto_iva?: number;
  incluye_envio?: boolean;
  costo_envio?: number;
  descuento_global?: number;
}

interface PaymentFormData {
  monto: number;
  metodo_pago: string;
  porcentaje: number;
  notas: string;
}

interface CotizacionStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  cotizacion: Cotizacion | null;
  onStatusChange: (cotizacionId: number, newStatus: string, paymentData?: PaymentFormData) => Promise<boolean>;
}

export function CotizacionStatusModal({
  isOpen,
  onClose,
  cotizacion,
  onStatusChange
}: CotizacionStatusModalProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('resumen');
  const [newStatus, setNewStatus] = useState<string>('');
  const [paymentData, setPaymentData] = useState<PaymentFormData>({
    monto: 0,
    metodo_pago: 'transferencia',
    porcentaje: 50,
    notas: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (cotizacion) {
      setNewStatus(cotizacion.estado || 'pendiente');
      setPaymentData({ monto: 0, metodo_pago: 'transferencia', porcentaje: 50, notas: '' });
      setActiveTab('resumen');
      setErrors({});
    } else {
      setLoading(false);
      setActiveTab('resumen');
      setNewStatus('');
      setPaymentData({ monto: 0, metodo_pago: 'transferencia', porcentaje: 50, notas: '' });
      setErrors({});
    }
  }, [cotizacion, isOpen]);

  const validatePaymentForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!paymentData.monto || paymentData.monto <= 0) {
      newErrors.monto = 'El monto debe ser mayor a 0';
    }
    if (!paymentData.metodo_pago) {
      newErrors.metodo_pago = 'Seleccione un método de pago';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStatusChange = async () => {
    if (!cotizacion || newStatus === cotizacion.estado) return;

    const requiresPayment = newStatus === 'producción';
    let finalPaymentData: PaymentFormData | undefined = undefined;

    if (requiresPayment) {
      if (!validatePaymentForm()) {
        toast.error("Por favor corrija los errores en el formulario de pago.");
        setActiveTab('acciones');
        return;
      }
      const percentage = cotizacion.total > 0 ? Math.round((paymentData.monto / cotizacion.total) * 100) : 0;
      finalPaymentData = { ...paymentData, porcentaje: percentage };
    }

    setLoading(true);
    try {
      const success = await onStatusChange(
        cotizacion.cotizacion_id, 
        newStatus,
        finalPaymentData
      );

      if (success) {
        toast.success(`Cotización actualizada a "${newStatus}"`);
        onClose();
      } else {
        toast.error("No se pudo actualizar el estado.");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error(error instanceof Error ? error.message : "Error al actualizar el estado");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (estado: string) => {
    const status = estado?.toLowerCase() || 'desconocido';
    switch (status) {
      case 'pendiente':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700">Pendiente</Badge>;
      case 'producción':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700">Producción</Badge>;
      case 'rechazada':
      case 'cancelada':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700">{estado}</Badge>;
      case 'enviada':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700">Enviada</Badge>;
      default:
        return <Badge variant="secondary">{estado ? estado.charAt(0).toUpperCase() + estado.slice(1) : 'Desconocido'}</Badge>;
    }
  };

  const safeCurrency = (value: any, currency: string): string => {
    const amount = Number(value);
    if (isNaN(amount)) return 'N/A';
    return formatCurrency(amount, currency as 'MXN' | 'USD');
  };

  const renderPaymentForm = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Registrar Anticipo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <Label htmlFor="monto" className={errors.monto ? "text-destructive" : ""}>Monto ({cotizacion?.moneda})</Label>
            {cotizacion && paymentData.monto > 0 && cotizacion.total > 0 && (
              <span className="text-xs text-muted-foreground">
                ~{Math.round((paymentData.monto / cotizacion.total) * 100)}%
              </span>
            )}
          </div>
          <div className="relative">
            <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="monto"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={paymentData.monto || ''}
              onChange={e => setPaymentData({ ...paymentData, monto: Number(e.target.value) || 0 })}
              className={`pl-8 text-right ${errors.monto ? 'border-destructive focus-visible:ring-destructive/50' : ''}`}
            />
          </div>
          {errors.monto && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.monto}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="metodo_pago" className={errors.metodo_pago ? "text-destructive" : ""}>Método de pago</Label>
          <Select 
            value={paymentData.metodo_pago} 
            onValueChange={value => setPaymentData({...paymentData, metodo_pago: value})}
          >
            <SelectTrigger className={errors.metodo_pago ? 'border-destructive focus:ring-destructive/50' : ''}>
              <SelectValue placeholder="Seleccionar método" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="efectivo">Efectivo</SelectItem>
              <SelectItem value="transferencia">Transferencia</SelectItem>
              <SelectItem value="tarjeta">Tarjeta</SelectItem>
              <SelectItem value="cheque">Cheque</SelectItem>
              <SelectItem value="deposito">Depósito</SelectItem>
            </SelectContent>
          </Select>
          {errors.metodo_pago && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.metodo_pago}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notas">Notas / Referencia</Label>
          <Textarea
            id="notas"
            placeholder="Detalles del pago, referencia, etc."
            value={paymentData.notas}
            onChange={e => setPaymentData({...paymentData, notas: e.target.value})}
            className="resize-none"
            rows={2}
          />
        </div>
      </CardContent>
    </Card>
  );

  if (!cotizacion) return null;

  const subtotal = cotizacion.productos?.reduce((acc, p) => acc + (p.subtotal || 0), 0) || 0;
  const descuentoTotal = subtotal * ((cotizacion.descuento_global || 0) / 100);
  const subtotalConDescuento = subtotal - descuentoTotal;
  const ivaAmount = cotizacion.iva ? subtotalConDescuento * 0.16 : 0;
  const shippingAmount = cotizacion.incluye_envio ? (cotizacion.costo_envio || 0) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold">Cotización {cotizacion.folio}</DialogTitle>
              <DialogDescription className="mt-1">
                {formatDate(cotizacion.fecha_creacion)} • {cotizacion.cliente.nombre}
              </DialogDescription>
              <div className="mt-2">
                {getStatusBadge(cotizacion.estado)}
              </div>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-7 w-7 text-muted-foreground">
                <X className="h-4 w-4" />
                <span className="sr-only">Cerrar</span>
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="p-6">
            <TabsList className="grid w-full grid-cols-2 h-9">
              <TabsTrigger value="resumen">Resumen</TabsTrigger>
              <TabsTrigger value="acciones">Acciones</TabsTrigger>
            </TabsList>
            
            <TabsContent value="resumen" className="mt-6 space-y-4">
              <Card>
                <CardContent className="p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{safeCurrency(subtotal, cotizacion.moneda)}</span>
                  </div>
                  {cotizacion.descuento_global && cotizacion.descuento_global > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span className="text-muted-foreground">Desc. Global ({cotizacion.descuento_global}%)</span>
                      <span>-{safeCurrency(descuentoTotal, cotizacion.moneda)}</span>
                    </div>
                  )}
                  {ivaAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IVA (16%)</span>
                      <span>{safeCurrency(ivaAmount, cotizacion.moneda)}</span>
                    </div>
                  )}
                  {shippingAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Envío</span>
                      <span>{safeCurrency(shippingAmount, cotizacion.moneda)}</span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{safeCurrency(cotizacion.total, cotizacion.moneda)}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">Estado de Pago</CardTitle>
                </CardHeader>
                <CardContent>
                   {cotizacion.estatus_pago === 'pagado' ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Pagado</Badge>
                    ) : cotizacion.estatus_pago === 'anticipo' ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Con anticipo</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pendiente</Badge>
                    )}
                </CardContent>
              </Card>

            </TabsContent>
            
            <TabsContent value="acciones" className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="newStatus">Cambiar estado a</Label>
                <Select 
                  value={newStatus} 
                  onValueChange={setNewStatus}
                >
                  <SelectTrigger id="newStatus">
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {cotizacion.estado !== 'pendiente' && <SelectItem value="pendiente">Pendiente</SelectItem>}
                    {cotizacion.estado !== 'producción' && <SelectItem value="producción">Producción</SelectItem>}
                    {cotizacion.estado !== 'cancelada' && <SelectItem value="cancelada">Cancelada</SelectItem>}
                    {cotizacion.estado !== 'enviada' && <SelectItem value="enviada">Enviada</SelectItem>} 
                  </SelectContent>
                </Select>
              </div>

              {newStatus === 'producción' && renderPaymentForm()}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="p-6 pt-4 border-t flex flex-col-reverse sm:flex-row sm:justify-between">
          <Button variant="ghost" onClick={onClose} disabled={loading} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button 
            onClick={handleStatusChange}
            disabled={loading || !newStatus || newStatus === cotizacion.estado} 
            className="w-full sm:w-auto"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CotizacionStatusModal; 