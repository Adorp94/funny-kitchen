"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Drawer, 
  DrawerClose, 
  DrawerContent, 
  DrawerDescription, 
  DrawerFooter, 
  DrawerHeader, 
  DrawerTitle 
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import { getAvailableCotizaciones } from "@/app/actions/finanzas-actions";
import { IngresoForm } from "./ingreso-form";
import { cn, formatCurrency } from "@/lib/utils";

// Form validation schema
const formSchema = z.object({
  cotizacion_id: z.number({ required_error: "La cotización es requerida" }),
  monto: z.string().min(1, "El monto es requerido"),
  moneda: z.string(),
  metodo_pago: z.string().min(1, "El método de pago es requerido"),
  fecha_pago: z.date({ required_error: "La fecha es requerida" }),
});

export type IngresoFormValues = z.infer<typeof formSchema>;

// Props for the wrapper component
interface IngresoResponsiveWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: IngresoFormValues) => Promise<boolean>;
}

export function IngresoResponsiveWrapper({ isOpen, onClose, onSubmit }: IngresoResponsiveWrapperProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [selectedCotizacion, setSelectedCotizacion] = useState<any>(null);
  
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const form = useForm<IngresoFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cotizacion_id: undefined,
      monto: "",
      moneda: "MXN",
      metodo_pago: "transferencia",
      fecha_pago: new Date(),
    },
  });

  useEffect(() => {
    if (isOpen) {
      loadCotizaciones();
      form.reset();
      setSelectedCotizacion(null);
    }
  }, [isOpen, form]);

  const loadCotizaciones = async () => {
    try {
      const result = await getAvailableCotizaciones();
      console.log("[IngresoResponsiveWrapper] Result from getAvailableCotizaciones:", result);
      setCotizaciones(result.success && result.cotizaciones ? result.cotizaciones : []);
    } catch (error) {
      console.error("Error loading cotizaciones:", error);
      setCotizaciones([]);
    }
  };

  const watchedCotizacionId = form.watch("cotizacion_id");
  useEffect(() => {
    console.log("[IngresoResponsiveWrapper] Cotizaciones State:", cotizaciones);
    if (watchedCotizacionId) {
      const cot = cotizaciones.find(c => c.cotizacion_id === watchedCotizacionId);
      setSelectedCotizacion(cot);
      if (cot?.moneda) {
        form.setValue("moneda", cot.moneda);
      }
    } else {
      setSelectedCotizacion(null);
    }
  }, [watchedCotizacionId, cotizaciones, form]);

  const getRemainingAmount = () => {
    if (!selectedCotizacion) return 0;
    const total = Number(selectedCotizacion.total) || 0;
    const paid = Number(selectedCotizacion.monto_pagado) || 0;
    return total - paid;
  };

  const calculatePercentage = () => {
    if (!selectedCotizacion) return "0.00";
    const total = Number(selectedCotizacion.total) || 0;
    const amount = Number(form.watch("monto")) || 0;
    if (total === 0) return "0.00";
    return ((amount / total) * 100).toFixed(2);
  };

  const handleFormSubmit = async (values: IngresoFormValues) => {
    setIsSubmitting(true);
    try {
      const moneda = selectedCotizacion ? selectedCotizacion.moneda : form.getValues("moneda") || "MXN";
      const dataToSubmit = { ...values, moneda };
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

  const formProps = {
    form,
    selectedCotizacion,
    cotizaciones,
    getRemainingAmount,
    calculatePercentage,
  };

  // --- Render Dialog for Desktop ---
  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Registrar Ingreso</DialogTitle>
            <DialogDescription>
              Selecciona la cotización y registra los detalles del pago recibido.
            </DialogDescription>
          </DialogHeader>

          <div className="px-1 py-4">
            <IngresoForm {...formProps} id="ingreso-form-desktop" onSubmit={form.handleSubmit(handleFormSubmit)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" form="ingreso-form-desktop" disabled={isSubmitting || !selectedCotizacion}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? "Registrando..." : "Registrar Ingreso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // --- Render Drawer for Mobile ---
  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Registrar Ingreso</DrawerTitle>
          <DrawerDescription>
            Selecciona la cotización y registra los detalles del pago recibido.
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 py-4">
          <IngresoForm {...formProps} id="ingreso-form-mobile" onSubmit={form.handleSubmit(handleFormSubmit)} />
        </div>
        <DrawerFooter className="pt-4">
          <Button type="submit" form="ingreso-form-mobile" disabled={isSubmitting || !selectedCotizacion}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? "Registrando..." : "Registrar Ingreso"}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" disabled={isSubmitting}>Cancelar</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
} 