"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { CalendarIcon, CreditCard, DollarSign, FileWarning } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from "@/components/ui/label"; // Use standard Label
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from 'date-fns/locale'; // Import Spanish locale

// Schema definition (can be imported if centralized)
const formSchema = z.object({
  newStatus: z.enum(['producción', 'rechazada', 'enviar_inventario'], {
    required_error: "Debes seleccionar un nuevo estado.",
  }),
  fecha: z.date({ // Add fecha field
    required_error: "La fecha de cambio es requerida.",
  }),
  montoAnticipo: z.string().optional(),
  metodoPago: z.string().optional(),
  notas: z.string().optional(),
}).refine((data) => {
  if (data.newStatus === 'producción' || data.newStatus === 'enviar_inventario') {
    const monto = parseFloat(data.montoAnticipo || 'NaN');
    // For 'producción', allow 0 as a valid amount; for 'enviar_inventario', require > 0
    const minAmount = data.newStatus === 'producción' ? 0 : 0.01;
    return !!data.montoAnticipo && !isNaN(monto) && monto >= minAmount && !!data.metodoPago;
  }
  return true;
}, {
  message: "Monto y método de pago son requeridos. Para 'Marcar como Producción' se permite monto 0.",
  path: ["montoAnticipo"],
});

type FormValues = z.infer<typeof formSchema>;

// Cotizacion type (can be imported)
interface Cotizacion {
  moneda: string;
  total: number;
}

interface CotizacionStatusFormProps extends React.ComponentProps<"form"> { // Extend form props
  form: UseFormReturn<FormValues>;
  isSubmitting: boolean;
  cotizacion: Cotizacion | null;
  // onSubmit is handled by the <form> tag now
}

export function CotizacionStatusForm({
  className,
  form,
  isSubmitting,
  cotizacion,
  ...props // Pass standard form attributes like id, onSubmit
}: CotizacionStatusFormProps) {

  const watchedStatus = form.watch("newStatus");
  const watchedFecha = form.watch("fecha"); // Watch fecha for the button display
  const formErrors = form.formState.errors;

  return (
    // Use standard form tag, pass id and onSubmit from props
    <form className={cn("space-y-6", className)} {...props}>

      {/* Status Selection (RadioGroup - Manual Handling) */}
      <div className="space-y-3">
        <Label className="font-semibold">Nuevo Estado *</Label>
        <RadioGroup
          onValueChange={(value) => form.setValue("newStatus", value as 'producción' | 'rechazada' | 'enviar_inventario', { shouldValidate: true })} // Updated type
          value={form.watch("newStatus")} // Watch value directly
          className="flex flex-col space-y-2"
          disabled={isSubmitting}
        >
          {/* Item 1: Producción */}
          <div className="flex items-center space-x-3 space-y-0">
             <RadioGroupItem value="producción" id={`${props.id}-status-produccion`} />
             <Label htmlFor={`${props.id}-status-produccion`} className="font-normal cursor-pointer">
                Marcar como Producción (Requiere Anticipo)
             </Label>
          </div>
          {/* Item 2: Enviar Inventario - ADDED */}
          <div className="flex items-center space-x-3 space-y-0">
             <RadioGroupItem value="enviar_inventario" id={`${props.id}-status-inventario`} />
             <Label htmlFor={`${props.id}-status-inventario`} className="font-normal cursor-pointer">
                Enviar de Inventario (Requiere Anticipo)
             </Label>
          </div>
          {/* Item 3: Rechazada */}
          <div className="flex items-center space-x-3 space-y-0">
             <RadioGroupItem value="rechazada" id={`${props.id}-status-rechazada`} />
             <Label htmlFor={`${props.id}-status-rechazada`} className="font-normal cursor-pointer">
                Marcar como Rechazada
             </Label>
          </div>
        </RadioGroup>
        {formErrors.newStatus && (
          <p className="text-xs text-red-600">{formErrors.newStatus.message}</p>
        )}
      </div>

      {/* Fecha Selection - ADDED */}
      <div className="space-y-2">
        <Label htmlFor={`${props.id}-fecha`} className="font-semibold">Fecha de Cambio *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id={`${props.id}-fecha`}
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal",
                !watchedFecha && "text-muted-foreground"
              )}
              disabled={isSubmitting}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {watchedFecha ? format(watchedFecha, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={watchedFecha}
              onSelect={(date) => form.setValue("fecha", date as Date, { shouldValidate: true })}
              initialFocus
              locale={es} // Set Spanish locale for Calendar
              disabled={isSubmitting}
            />
          </PopoverContent>
        </Popover>
        {formErrors.fecha && (
          <p className="text-xs text-red-600">{formErrors.fecha.message}</p>
        )}
      </div>

      {/* Conditional Payment Section */}
      {(watchedStatus === 'producción' || watchedStatus === 'enviar_inventario') && (
        <Card className="bg-muted/50 border-primary/20 pt-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Registrar Anticipo (Requerido)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Total Summary Display */}
            {cotizacion && (
              <div className="bg-background rounded-lg border p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total de la cotización:</span>
                  <span className="font-semibold">
                    {new Intl.NumberFormat('es-MX', {
                      style: 'currency',
                      currency: cotizacion.moneda === 'USD' ? 'USD' : 'MXN',
                      minimumFractionDigits: 2
                    }).format(cotizacion.total)}
                  </span>
                </div>
                {form.watch("montoAnticipo") && parseFloat(form.watch("montoAnticipo") || '0') > 0 && (
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-muted-foreground">Anticipo a pagar:</span>
                    <span className="font-semibold text-primary">
                      {new Intl.NumberFormat('es-MX', {
                        style: 'currency',
                        currency: cotizacion.moneda === 'USD' ? 'USD' : 'MXN',
                        minimumFractionDigits: 2
                      }).format(parseFloat(form.watch("montoAnticipo") || '0'))}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Monto Anticipo Input - Manual Handling */}
            <div className="space-y-2">
               <div className="flex justify-between items-center">
                 <Label htmlFor={`${props.id}-montoAnticipo`}>Monto ({cotizacion?.moneda}) *</Label>
                 {cotizacion && form.watch("montoAnticipo") && cotizacion.total > 0 && (
                   <span className="text-xs text-muted-foreground">
                     ~{Math.round((parseFloat(form.watch("montoAnticipo") || '0') / cotizacion.total) * 100)}%
                   </span>
                 )}
               </div>
               <div className="relative">
                 <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                 <Input
                   id={`${props.id}-montoAnticipo`}
                   type="number"
                   step="0.01"
                   min={watchedStatus === 'producción' ? "0" : "0.01"}
                   placeholder="0.00"
                   className="pl-8 text-right"
                   disabled={isSubmitting}
                   {...form.register("montoAnticipo")} // Use register
                 />
               </div>
               {formErrors.montoAnticipo && (
                 <p className="text-xs text-red-600">{formErrors.montoAnticipo.message}</p>
               )}
            </div>

            {/* Metodo Pago Select - Manual Handling */}
            <div className="space-y-2">
               <Label htmlFor={`${props.id}-metodoPago`}>Método de Pago *</Label>
               <Select
                 onValueChange={(value) => form.setValue("metodoPago", value, { shouldValidate: true })}
                 value={form.watch("metodoPago")} // Watch value directly
                 disabled={isSubmitting}
               >
                 <SelectTrigger id={`${props.id}-metodoPago`}>
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
               {formErrors.metodoPago && (
                 <p className="text-xs text-red-600">{formErrors.metodoPago.message}</p>
               )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alert for Rechazada */}
      {watchedStatus === 'rechazada' && (
         <div className="flex items-start space-x-3 rounded-md border border-destructive/50 bg-destructive/10 p-3">
           <FileWarning className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
           <div className="flex-1 space-y-1">
             <p className="text-sm font-medium text-destructive">
               Confirmar Rechazo
             </p>
             <p className="text-xs text-destructive/80">
               La cotización se cerrará y no podrá ser modificada.
             </p>
           </div>
         </div>
      )}
    </form>
  );
} 