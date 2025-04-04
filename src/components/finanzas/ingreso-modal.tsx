"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatCurrency } from "@/lib/utils";
import { getAvailableCotizaciones } from "@/app/actions/finanzas-actions";

// Define the available payment methods
const METODOS_PAGO = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "cheque", label: "Cheque" },
  { value: "deposito", label: "Depósito" },
];

// Form validation schema
const formSchema = z.object({
  cotizacion_id: z.number({
    required_error: "La cotización es requerida",
  }),
  monto: z.string().min(1, "El monto es requerido"),
  moneda: z.string(),
  metodo_pago: z.string().min(1, "El método de pago es requerido"),
  fecha_pago: z.date({
    required_error: "La fecha es requerida",
  }),
  comprobante_url: z.string().optional(),
  notas: z.string().optional(),
});

export type IngresoFormValues = z.infer<typeof formSchema>;

interface IngresoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: IngresoFormValues) => Promise<boolean>;
}

export function IngresoModal({ isOpen, onClose, onSubmit }: IngresoModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCotizacion, setSelectedCotizacion] = useState<any>(null);
  
  const form = useForm<IngresoFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cotizacion_id: undefined,
      monto: "",
      moneda: "MXN",
      metodo_pago: "transferencia",
      fecha_pago: new Date(),
      comprobante_url: "",
      notas: "",
    },
  });

  // Load available cotizaciones when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCotizaciones();
    }
  }, [isOpen]);

  const loadCotizaciones = async () => {
    setIsLoading(true);
    try {
      const result = await getAvailableCotizaciones();
      if (result.success && result.cotizaciones) {
        setCotizaciones(result.cotizaciones);
      } else {
        setCotizaciones([]);
      }
    } catch (error) {
      console.error("Error loading cotizaciones:", error);
      setCotizaciones([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Update selected cotizacion when cotizacion_id changes
  useEffect(() => {
    const cotizacionId = form.watch("cotizacion_id");
    if (cotizacionId) {
      const cotizacion = cotizaciones.find(c => c.cotizacion_id === cotizacionId);
      setSelectedCotizacion(cotizacion);
      // Update moneda based on selected cotizacion
      if (cotizacion && cotizacion.moneda) {
        form.setValue("moneda", cotizacion.moneda);
      }
    } else {
      setSelectedCotizacion(null);
    }
  }, [form.watch("cotizacion_id"), cotizaciones]);

  // Calculate the remaining amount for the selected cotizacion
  const getRemainingAmount = () => {
    if (!selectedCotizacion) return 0;
    
    const total = Number(selectedCotizacion.total) || 0;
    const paid = Number(selectedCotizacion.monto_pagado) || 0;
    return total - paid;
  };

  // Calculate the percentage of the payment
  const calculatePercentage = () => {
    if (!selectedCotizacion) return 0;
    
    const total = Number(selectedCotizacion.total) || 0;
    const amount = Number(form.watch("monto")) || 0;
    
    if (total === 0) return 0;
    return ((amount / total) * 100).toFixed(2);
  };

  const handleSubmit = async (values: IngresoFormValues) => {
    setIsSubmitting(true);
    try {
      // Add moneda from the selected cotizacion
      const dataToSubmit = {
        ...values,
        moneda: selectedCotizacion?.moneda || "MXN"
      };
      
      const success = await onSubmit(dataToSubmit);
      if (success) {
        form.reset();
        onClose();
      }
    } catch (error) {
      console.error("Error submitting payment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-slate-800">
            Registrar Ingreso
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-4">
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label htmlFor="cotizacion_id" className="text-sm font-medium text-slate-700">
                Cotización
              </Label>
              
              {isLoading ? (
                <div className="flex items-center space-x-2 h-10 px-3 py-2 border rounded-md bg-slate-50">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  <span className="text-sm text-slate-400">Cargando cotizaciones...</span>
                </div>
              ) : (
                <Select 
                  onValueChange={(value) => form.setValue("cotizacion_id", Number(value))}
                  value={form.watch("cotizacion_id")?.toString()}
                >
                  <SelectTrigger className="bg-white border-slate-200 h-10">
                    <SelectValue placeholder="Seleccionar cotización" />
                  </SelectTrigger>
                  <SelectContent>
                    {cotizaciones.length === 0 ? (
                      <div className="p-2 text-sm text-slate-500">No hay cotizaciones disponibles</div>
                    ) : (
                      cotizaciones.map((cotizacion) => (
                        <SelectItem 
                          key={cotizacion.cotizacion_id} 
                          value={cotizacion.cotizacion_id.toString()}
                        >
                          {cotizacion.folio} - {cotizacion.cliente_nombre}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
              
              {form.formState.errors.cotizacion_id && (
                <p className="text-sm text-red-500">{form.formState.errors.cotizacion_id.message}</p>
              )}
              
              {selectedCotizacion && (
                <div className="mt-2 rounded-md bg-slate-50 p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total:</span>
                    <span className="font-medium">
                      {formatCurrency(selectedCotizacion.total, selectedCotizacion.moneda)}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-slate-600">Pagado:</span>
                    <span className="font-medium">
                      {formatCurrency(selectedCotizacion.monto_pagado || 0, selectedCotizacion.moneda)}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-slate-600">Restante:</span>
                    <span className="font-medium text-orange-600">
                      {formatCurrency(getRemainingAmount(), selectedCotizacion.moneda)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="monto" className="text-sm font-medium text-slate-700">
                Monto {selectedCotizacion?.moneda && `(${selectedCotizacion.moneda})`}
              </Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
                  {selectedCotizacion?.moneda === "USD" ? "$" : "$"}
                </span>
                <Input
                  id="monto"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-8 bg-white"
                  {...form.register("monto")}
                />
              </div>
              {form.formState.errors.monto && (
                <p className="text-sm text-red-500">{form.formState.errors.monto.message}</p>
              )}
              
              {selectedCotizacion && form.watch("monto") && Number(form.watch("monto")) > 0 && (
                <div className="mt-1 text-sm text-slate-600">
                  Este pago representa el <span className="font-medium">{calculatePercentage()}%</span> del total
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="metodo_pago" className="text-sm font-medium text-slate-700">
                Método de pago
              </Label>
              <Select
                onValueChange={(value) => form.setValue("metodo_pago", value)}
                defaultValue={form.watch("metodo_pago")}
              >
                <SelectTrigger className="bg-white border-slate-200">
                  <SelectValue placeholder="Seleccionar método de pago" />
                </SelectTrigger>
                <SelectContent>
                  {METODOS_PAGO.map((metodo) => (
                    <SelectItem key={metodo.value} value={metodo.value}>
                      {metodo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.metodo_pago && (
                <p className="text-sm text-red-500">{form.formState.errors.metodo_pago.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha_pago" className="text-sm font-medium text-slate-700">
                Fecha de pago
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-white border-slate-200",
                      !form.watch("fecha_pago") && "text-slate-400"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
                    {form.watch("fecha_pago") ? (
                      format(form.watch("fecha_pago"), "PPP", { locale: es })
                    ) : (
                      <span>Seleccionar fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.watch("fecha_pago")}
                    onSelect={(date) => form.setValue("fecha_pago", date as Date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {form.formState.errors.fecha_pago && (
                <p className="text-sm text-red-500">{form.formState.errors.fecha_pago.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="comprobante_url" className="text-sm font-medium text-slate-700">
                URL del comprobante (opcional)
              </Label>
              <Input
                id="comprobante_url"
                type="url"
                placeholder="https://..."
                className="bg-white"
                {...form.register("comprobante_url")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notas" className="text-sm font-medium text-slate-700">
                Notas adicionales (opcional)
              </Label>
              <Textarea
                id="notas"
                placeholder="Agregar notas o detalles sobre este pago..."
                className="bg-white min-h-24 resize-none"
                {...form.register("notas")}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-slate-700 border-slate-300 hover:bg-slate-50"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : "Guardar Ingreso"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 