"use client";

import * as React from "react";
import { useState, useEffect } from 'react';
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from 'lucide-react'; // Only need Loader
import { toast } from "sonner";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
// Import the new form component (Finanzas style)
import { CotizacionStatusForm } from "./cotizacion-status-form";

// --- Types --- 
interface Cotizacion {
  cotizacion_id: number;
  folio: string;
  moneda: string;
  total: number;
}

interface PaymentFormData {
  monto: number;
  metodo_pago: string;
  porcentaje: number;
}

interface CotizacionStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  cotizacion: Cotizacion | null;
  onStatusChange: (cotizacionId: number, newStatus: string, fecha: Date, paymentData?: PaymentFormData) => Promise<boolean>;
}

// --- Zod Schema --- 
const formSchema = z.object({
  newStatus: z.enum(['producción', 'rechazada', 'enviar_inventario'], {
    required_error: "Debes seleccionar un nuevo estado.",
  }),
  fecha: z.date({
    required_error: "La fecha de cambio es requerida.",
  }),
  montoAnticipo: z.string().optional(),
  metodoPago: z.string().optional(),
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

// --- Component Implementation ---

export function CotizacionStatusModal({
  isOpen,
  onClose,
  cotizacion,
  onStatusChange
}: CotizacionStatusModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newStatus: undefined,
      fecha: new Date(),
      montoAnticipo: "",
      metodoPago: "transferencia",
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset();
      setIsSubmitting(false);
    }
  }, [isOpen, form]);

  const handleFormSubmit = async (values: FormValues) => {
    if (!cotizacion) return;
    setIsSubmitting(true);
    let paymentData: PaymentFormData | undefined = undefined;
    
    const fechaCambio = values.fecha;

    if (values.newStatus === 'producción' || values.newStatus === 'enviar_inventario') {
      const monto = parseFloat(values.montoAnticipo!);
      const porcentaje = cotizacion.total > 0 ? Math.round((monto / cotizacion.total) * 100) : 0;
      paymentData = {
        monto: monto,
        metodo_pago: values.metodoPago!,
        porcentaje: porcentaje,
      };
    }
    
    try {
      const success = await onStatusChange(cotizacion.cotizacion_id, values.newStatus, fechaCambio, paymentData);
      if (success) {
        toast.success(`Cotización #${cotizacion.folio} actualizada a "${values.newStatus}".`);
        onClose();
      }
    } catch (error) {
      console.error("Error submitting status change:", error);
      toast.error("Ocurrió un error inesperado al actualizar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!cotizacion) return null;

  const formId = isDesktop ? "status-change-form-desktop" : "status-change-form-mobile";
  const watchedStatus = form.watch("newStatus"); // Still needed for button disable

  // Dialog for Desktop
  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md border-border/50 shadow-lg">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-base font-medium text-foreground">
              Cambiar Estado
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {cotizacion.folio} • Selecciona el nuevo estado y registra el anticipo si aplica.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 max-h-[60vh] overflow-y-auto">
            <CotizacionStatusForm
              form={form} 
              id={formId}
              onSubmit={form.handleSubmit(handleFormSubmit)}
              isSubmitting={isSubmitting}
              cotizacion={cotizacion}
             />
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onClose} 
              disabled={isSubmitting}
              className="h-8 px-3 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form={formId}
              disabled={isSubmitting || !watchedStatus}
              className="h-8 px-3 text-xs"
            >
              {isSubmitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Actualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Drawer for Mobile
  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="border-border/50">
        <DrawerHeader className="text-left space-y-2">
          <DrawerTitle className="text-base font-medium text-foreground">
            Cambiar Estado
          </DrawerTitle>
          <DrawerDescription className="text-sm text-muted-foreground">
            {cotizacion.folio} • Selecciona el nuevo estado y registra el anticipo si aplica.
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-0 pt-2 overflow-y-auto max-h-[70vh]">
           <CotizacionStatusForm 
             form={form}
             id={formId}
             onSubmit={form.handleSubmit(handleFormSubmit)}
             isSubmitting={isSubmitting}
             cotizacion={cotizacion}
            />
        </div>

        <DrawerFooter className="pt-4 gap-2">
          <Button
            type="submit"
            form={formId}
            disabled={isSubmitting || !watchedStatus}
            className="h-9 text-sm"
          >
            {isSubmitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Actualizar
          </Button>
          <DrawerClose asChild>
            <Button variant="ghost" disabled={isSubmitting} className="h-9 text-sm">
              Cancelar
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
} 