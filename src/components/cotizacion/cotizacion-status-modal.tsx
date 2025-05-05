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
    return !!data.montoAnticipo && !isNaN(monto) && monto > 0 && !!data.metodoPago;
  }
  return true;
}, {
  message: "Monto y método de pago son requeridos, y el monto debe ser mayor a 0.",
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
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Cambiar Estado: {cotizacion.folio}</DialogTitle>
            <DialogDescription>
              Selecciona el nuevo estado y registra el anticipo si aplica.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 px-1 max-h-[60vh] overflow-y-auto">
            {/* Render the new form, passing submit handler */}
            <CotizacionStatusForm
              form={form} 
              id={formId}
              onSubmit={form.handleSubmit(handleFormSubmit)} // Use RHF handleSubmit
              isSubmitting={isSubmitting}
              cotizacion={cotizacion}
             />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
            <Button
              type="submit"
              form={formId} // Associate button with form ID
              disabled={isSubmitting || !watchedStatus}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Actualizar Estado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Drawer for Mobile
  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Cambiar Estado: {cotizacion.folio}</DrawerTitle>
          <DrawerDescription>
            Selecciona el nuevo estado y registra el anticipo si aplica.
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-0 pt-4 overflow-y-auto max-h-[70vh]">
           {/* Render the new form, passing submit handler */}
           <CotizacionStatusForm 
             form={form}
             id={formId}
             onSubmit={form.handleSubmit(handleFormSubmit)} // Use RHF handleSubmit
             isSubmitting={isSubmitting}
             cotizacion={cotizacion}
            />
        </div>

        <DrawerFooter className="pt-4">
          <Button
            type="submit"
            form={formId} // Associate button with form ID
            disabled={isSubmitting || !watchedStatus}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Actualizar Estado
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" disabled={isSubmitting}>Cancelar</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
} 