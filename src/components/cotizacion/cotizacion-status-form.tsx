"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { CreditCard, DollarSign, FileWarning } from 'lucide-react';
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

// Schema definition (can be imported if centralized)
const formSchema = z.object({
  newStatus: z.enum(['producción', 'rechazada'], {
    required_error: "Debes seleccionar un nuevo estado.",
  }),
  montoAnticipo: z.string().optional(),
  metodoPago: z.string().optional(),
  notas: z.string().optional(),
}).refine((data) => {
  if (data.newStatus === 'producción') {
    const monto = parseFloat(data.montoAnticipo || 'NaN');
    return !!data.montoAnticipo && !isNaN(monto) && monto > 0 && !!data.metodoPago;
  }
  return true;
}, {
  message: "Monto y método de pago son requeridos y el monto debe ser mayor a 0.",
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
  const formErrors = form.formState.errors;

  return (
    // Use standard form tag, pass id and onSubmit from props
    <form className={cn("space-y-6", className)} {...props}>

      {/* Status Selection (RadioGroup - Manual Handling) */}
      <div className="space-y-3">
        <Label className="font-semibold">Nuevo Estado *</Label>
        <RadioGroup
          onValueChange={(value) => form.setValue("newStatus", value as 'producción' | 'rechazada', { shouldValidate: true })} // Set value and trigger validation
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
          {/* Item 2: Rechazada */}
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

      {/* Conditional Payment Section */}
      {watchedStatus === 'producción' && (
        <Card className="bg-muted/50 border-primary/20 pt-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Registrar Anticipo (Requerido)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                   min="0.01"
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