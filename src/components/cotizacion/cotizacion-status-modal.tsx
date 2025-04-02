"use client";

import { useState, useEffect } from 'react';
import { AlertCircle, CreditCard, DollarSign, FileClock, FileText, Check, X, ArrowRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { formatDate } from '@/lib/utils';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
} from '@/components/ui/dialog';
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
  const { toast } = useToast();
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
      
      // Set default payment amount to 50% of total
      if (cotizacion.total) {
        const defaultAmount = Math.round(cotizacion.total * 0.5 * 100) / 100; // Round to 2 decimals
        setPaymentData(prev => ({
          ...prev,
          monto: defaultAmount,
          porcentaje: 50
        }));
      }
      console.log('Cotizacion loaded in modal:', cotizacion);
    }
  }, [cotizacion]);

  // Reset form when status changes
  useEffect(() => {
    if (newStatus === 'aprobada' || newStatus === 'cerrada') {
      // If changing to a status requiring payment, switch to actions tab
      setActiveTab('acciones');
    }
    
    // Clear any previous validation errors
    setErrors({});
  }, [newStatus]);

  const validatePaymentForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!paymentData.monto || paymentData.monto <= 0) {
      newErrors.monto = 'El monto debe ser mayor a 0';
    }

    if (!paymentData.metodo_pago) {
      newErrors.metodo_pago = 'Seleccione un método de pago';
    }

    // Set the errors and return validation result
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStatusChange = async () => {
    if (!cotizacion) return;

    console.log('Status change initiated', { 
      cotizacionId: cotizacion.cotizacion_id, 
      newStatus, 
      currentStatus: cotizacion.estado 
    });

    // Don't allow changing to same status
    if (newStatus === cotizacion.estado) {
      toast({
        title: "Sin cambios",
        description: "El estado seleccionado es el mismo que el actual",
        variant: "default"
      });
      return;
    }

    // For status changes to 'cerrada' or 'aprobada', we require payment data
    const requiresPayment = ['cerrada', 'aprobada'].includes(newStatus);
    
    if (requiresPayment) {
      console.log('Payment data required. Validating form...', paymentData);
      if (!validatePaymentForm()) {
        console.log('Payment form validation failed:', errors);
        toast({
          title: "Error",
          description: "Por favor corrija los errores en el formulario de pago",
          variant: "destructive"
        });
        return;
      }
      console.log('Payment form validation passed');
    }

    setLoading(true);
    try {
      // Calculate percentage based on monto if payment is required
      if (requiresPayment && cotizacion.total > 0) {
        const percentage = Math.round((paymentData.monto / cotizacion.total) * 100);
        const updatedPaymentData = {
          ...paymentData,
          porcentaje: percentage
        };
        
        console.log('Calling onStatusChange with data:', {
          cotizacionId: cotizacion.cotizacion_id,
          newStatus,
          paymentData: updatedPaymentData
        });
        
        // Call the onStatusChange function with the updated payment data
        const success = await onStatusChange(
          cotizacion.cotizacion_id, 
          newStatus,
          updatedPaymentData
        );

        console.log('Status change result:', success);
        
        if (success) {
          toast({
            title: "¡Éxito!",
            description: `Cotización ${newStatus === 'aprobada' ? 'aprobada con anticipo' : 
                         newStatus === 'cerrada' ? 'cerrada con pago' : 
                         'actualizada'} correctamente`,
            variant: "success"
          });
          
          // Close the modal after a delay to ensure state updates
          setTimeout(() => {
            onClose();
          }, 300);
        } else {
          toast({
            title: "Error",
            description: "No se pudo actualizar el estado. Por favor, inténtelo de nuevo.",
            variant: "destructive"
          });
        }
      } else {
        // For statuses that don't require payment
        console.log('Calling onStatusChange without payment data:', {
          cotizacionId: cotizacion.cotizacion_id,
          newStatus
        });
        
        // For status changes not requiring payment
        const success = await onStatusChange(
          cotizacion.cotizacion_id, 
          newStatus,
          undefined // Explicitly pass undefined instead of optional payment data
        );

        console.log('Status change result:', success);
        
        if (success) {
          toast({
            title: "¡Éxito!",
            description: `Cotización actualizada a "${newStatus}" correctamente`,
            variant: "success"
          });
          
          // Close the modal after a delay to ensure state updates
          setTimeout(() => {
            onClose();
          }, 300);
        } else {
          toast({
            title: "Error",
            description: "No se pudo actualizar el estado. Por favor, inténtelo de nuevo.",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Ha ocurrido un error al actualizar el estado",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'pendiente':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-medium">Pendiente</Badge>;
      case 'aprobada':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">Aprobada</Badge>;
      case 'rechazada':
        return <Badge className="bg-red-50 text-red-700 border-red-200 font-medium">Rechazada</Badge>;
      case 'cerrada':
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200 font-medium">Cerrada</Badge>;
      case 'vencida':
        return <Badge className="bg-gray-50 text-gray-700 border-gray-200 font-medium">Vencida</Badge>;
      default:
        return <Badge className="bg-gray-50">{estado ? estado.charAt(0).toUpperCase() + estado.slice(1) : 'No definido'}</Badge>;
    }
  };

  const renderPaymentForm = () => (
    <div className="rounded-xl bg-white p-6 border border-gray-200 shadow-sm space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
        <div className="bg-blue-50 p-2 rounded-md">
          <CreditCard className="h-5 w-5 text-blue-600" />
        </div>
        <h3 className="font-medium text-gray-900">
          {newStatus === 'aprobada' ? 'Registro de Anticipo' : 'Registro de Anticipo para Cierre'}
        </h3>
      </div>
      
      <div>
        <Label htmlFor="monto" className="text-sm text-gray-700 font-medium">Monto de anticipo</Label>
        <div className="relative mt-1.5">
          <Input
            id="monto"
            type="number"
            step="0.01"
            min="0"
            value={paymentData.monto}
            onChange={e => {
              const value = Number(e.target.value);
              setPaymentData({
                ...paymentData, 
                monto: value
              });
            }}
            className={`pl-7 h-11 ${errors.monto ? 'border-red-500 focus-visible:ring-red-500' : 'focus-visible:ring-blue-500'}`}
          />
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            <DollarSign className="h-4 w-4 text-gray-500" />
          </div>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
            {cotizacion?.moneda || 'MXN'}
          </div>
        </div>
        {errors.monto ? (
          <div className="text-red-500 text-xs mt-1.5 flex items-center">
            <AlertCircle className="h-3 w-3 mr-1" />
            {errors.monto}
          </div>
        ) : (
          <div className="text-xs text-gray-500 mt-1.5">
            {cotizacion && paymentData.monto ? (
              <>
                Aproximadamente el {Math.round((paymentData.monto / cotizacion.total) * 100)}% del total
              </>
            ) : null}
          </div>
        )}
      </div>
      
      <div>
        <Label htmlFor="metodo_pago" className="text-sm text-gray-700 font-medium">Método de pago</Label>
        <Select 
          value={paymentData.metodo_pago} 
          onValueChange={value => setPaymentData({...paymentData, metodo_pago: value})}
        >
          <SelectTrigger className={`mt-1.5 h-11 ${errors.metodo_pago ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`}>
            <SelectValue placeholder="Seleccionar método de pago" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="efectivo">Efectivo</SelectItem>
            <SelectItem value="transferencia">Transferencia Bancaria</SelectItem>
            <SelectItem value="tarjeta">Tarjeta de Crédito/Débito</SelectItem>
            <SelectItem value="cheque">Cheque</SelectItem>
            <SelectItem value="deposito">Depósito Bancario</SelectItem>
          </SelectContent>
        </Select>
        {errors.metodo_pago && (
          <div className="text-red-500 text-xs mt-1.5 flex items-center">
            <AlertCircle className="h-3 w-3 mr-1" />
            {errors.metodo_pago}
          </div>
        )}
      </div>
      
      <div>
        <Label htmlFor="notas" className="text-sm text-gray-700 font-medium">Notas o referencia de pago</Label>
        <Textarea
          id="notas"
          placeholder="Ingrese detalles del pago, número de referencia, o notas adicionales"
          value={paymentData.notas}
          onChange={e => setPaymentData({...paymentData, notas: e.target.value})}
          className="mt-1.5 resize-none"
          rows={3}
        />
      </div>
    </div>
  );

  if (!cotizacion) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogOverlay className="bg-black/40 backdrop-blur-[2px]" />
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-xl shadow-xl border-0 p-0">
        <DialogHeader className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gray-50 p-2 rounded-md">
                <FileText className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-gray-900">
                  Cotización {cotizacion.folio || `#${cotizacion.cotizacion_id}`}
                </DialogTitle>
                <p className="text-sm text-gray-500 mt-0.5">
                  {formatDate(cotizacion.fecha_creacion)} • {cotizacion.cliente.nombre}
                </p>
              </div>
            </div>
            {getStatusBadge(cotizacion.estado)}
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="p-6">
          <TabsList className="grid grid-cols-2 gap-2 bg-gray-50 p-1 rounded-lg mb-5">
            <TabsTrigger value="resumen" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Resumen
            </TabsTrigger>
            <TabsTrigger value="acciones" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Cambiar Estado
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="resumen" className="space-y-6 mt-0">
            <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-gray-100">
                <div className="p-5">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Cliente</h3>
                  <p className="font-medium text-gray-900">{cotizacion.cliente.nombre}</p>
                  {cotizacion.cliente.celular && (
                    <p className="text-sm text-gray-500 mt-1">{cotizacion.cliente.celular}</p>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Monto Total</h3>
                  <p className="font-semibold text-lg text-emerald-600">
                    {formatCurrency(cotizacion.total, cotizacion.moneda)}
                  </p>
                  {cotizacion.total_mxn && cotizacion.moneda !== 'MXN' && (
                    <p className="text-sm text-gray-500 mt-1">
                      Equivalente: {formatCurrency(cotizacion.total_mxn, 'MXN')}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <FileClock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Estado de Pago:</span>
                  {cotizacion.estatus_pago === 'pagado' ? (
                    <span className="text-sm text-emerald-600 font-medium">Pagado completamente</span>
                  ) : cotizacion.estatus_pago === 'anticipo' ? (
                    <span className="text-sm text-blue-600 font-medium">Con anticipo</span>
                  ) : (
                    <span className="text-sm text-amber-600 font-medium">Pendiente de pago</span>
                  )}
                </div>
              </div>
            </div>

            {/* Products table */}
            {cotizacion.productos && cotizacion.productos.length > 0 && (
              <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                <div className="p-4 bg-white border-b border-gray-100">
                  <h3 className="font-medium text-gray-900">Productos</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Cant.</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {cotizacion.productos.map((producto) => (
                        <tr key={producto.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{producto.nombre}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-center">{producto.cantidad}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">
                            {formatCurrency(producto.precio, cotizacion.moneda)}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                            {formatCurrency(producto.subtotal, cotizacion.moneda)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="acciones" className="space-y-6 mt-0">
            <div className="rounded-xl bg-white p-6 border border-gray-200 shadow-sm">
              <h3 className="font-medium text-gray-900 mb-3">Cambiar estado de cotización</h3>
              <Select 
                value={newStatus} 
                onValueChange={setNewStatus}
              >
                <SelectTrigger className="w-full h-11">
                  <SelectValue placeholder="Seleccionar nuevo estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="aprobada">Aprobada (con anticipo)</SelectItem>
                  <SelectItem value="rechazada">Rechazada</SelectItem>
                  <SelectItem value="cerrada">Cerrada (con anticipo)</SelectItem>
                  <SelectItem value="vencida">Vencida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Status guide */}
            <div className="rounded-xl bg-gray-50 p-5 border border-gray-200">
              <h3 className="font-medium text-gray-700 mb-3">Guía de estados</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Badge className="mt-0.5 bg-blue-50 text-blue-700 border-blue-200">Pendiente</Badge>
                  <p className="text-sm text-gray-600">Cotización creada, esperando respuesta del cliente.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className="mt-0.5 bg-emerald-50 text-emerald-700 border-emerald-200">Aprobada</Badge>
                  <p className="text-sm text-gray-600">Cliente aprobó la cotización y pagó un anticipo.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className="mt-0.5 bg-purple-50 text-purple-700 border-purple-200">Cerrada</Badge>
                  <p className="text-sm text-gray-600">Producto entregado, proceso completado con pago de anticipo.</p>
                </div>
              </div>
            </div>

            {/* Payment form for 'aprobada' and 'cerrada' statuses */}
            {(newStatus === 'cerrada' || newStatus === 'aprobada') && renderPaymentForm()}
          </TabsContent>
        </Tabs>

        <DialogFooter className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => onClose()} 
            disabled={loading}
            className="h-11"
          >
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button 
            onClick={handleStatusChange}
            disabled={loading || newStatus === cotizacion.estado} 
            className="bg-blue-600 hover:bg-blue-700 text-white h-11"
          >
            {loading ? (
              <div className="flex items-center">
                <span className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                <span>Procesando...</span>
              </div>
            ) : (
              <div className="flex items-center">
                {newStatus === cotizacion.estado ? (
                  <span>Mismo estado</span>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    <span>Guardar cambios</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CotizacionStatusModal; 