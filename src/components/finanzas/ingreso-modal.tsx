"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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

// Form validation schema
const formSchema = z.object({
  cotizacion_id: z.number({ required_error: "La cotización es requerida" }),
  monto: z.string().min(1, "El monto es requerido"),
  moneda: z.string(),
  metodo_pago: z.string().min(1, "El método de pago es requerido"),
  fecha_pago: z.date({ required_error: "La fecha es requerida" }),
  comprobante_url: z.string().url({ message: "URL inválida" }).optional().or(z.literal('')),
  notas: z.string().optional(),
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
  const [isLoadingCotizaciones, setIsLoadingCotizaciones] = useState(true);
  const [selectedCotizacion, setSelectedCotizacion] = useState<any>(null);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [queryCombobox, setQueryCombobox] = useState<string>("");
  
  // Determine if desktop based on media query
  const isDesktop = useMediaQuery("(min-width: 768px)");

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

  // Effect to load cotizaciones when component mounts or isOpen changes
  useEffect(() => {
    if (isOpen) {
      loadCotizaciones();
      // Reset form and combobox state when opening
      setQueryCombobox("");
      setOpenCombobox(false);
      form.reset(); // Reset form to defaults
      setSelectedCotizacion(null); // Clear selected cotizacion visual state
    } 
  }, [isOpen]); // Dependency array includes isOpen

  // Function to load cotizaciones
  const loadCotizaciones = async () => {
    setIsLoadingCotizaciones(true);
    try {
      const result = await getAvailableCotizaciones();
      setCotizaciones(result.success && result.cotizaciones ? result.cotizaciones : []);
    } catch (error) {
      console.error("Error loading cotizaciones:", error);
      setCotizaciones([]);
    } finally {
      setIsLoadingCotizaciones(false);
    }
  };

  // Watch form value for cotizacion_id
  const watchedCotizacionId = form.watch("cotizacion_id");
  useEffect(() => {
    if (watchedCotizacionId) {
      const cot = cotizaciones.find(c => c.cotizacion_id === watchedCotizacionId);
      setSelectedCotizacion(cot);
      if (cot?.moneda) {
        form.setValue("moneda", cot.moneda);
      }
    } else {
      setSelectedCotizacion(null);
    }
  }, [watchedCotizacionId, cotizaciones, form]); // Added form dependency

  // Helper functions (remain the same, could be moved if needed)
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

  const filteredCotizaciones = queryCombobox
    ? cotizaciones.filter((c) =>
        c.folio.toLowerCase().includes(queryCombobox.toLowerCase()) ||
        c.cliente_nombre.toLowerCase().includes(queryCombobox.toLowerCase())
      )
    : cotizaciones;

  // Form submission handler
  const handleFormSubmit = async (values: IngresoFormValues) => {
    setIsSubmitting(true);
    try {
      const dataToSubmit = { ...values, moneda: selectedCotizacion?.moneda || "MXN" };
      const success = await onSubmit(dataToSubmit);
      if (success) {
        form.reset(); // Reset form on success
        onClose(); // Close the dialog/drawer
      }
    } catch (error) {
      console.error("Error submitting payment:", error);
      // Potentially show a toast notification for the error
    } finally {
      setIsSubmitting(false);
    }
  };

  // Props to pass down to the IngresoForm component
  const formProps = {
    form,
    selectedCotizacion,
    isLoadingCotizaciones,
    cotizaciones,
    openCombobox,
    setOpenCombobox,
    queryCombobox,
    setQueryCombobox,
    getRemainingAmount,
    calculatePercentage,
    filteredCotizaciones,
    watchedCotizacionId
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
          {/* Scrollable div for the form content */}
          <div className="overflow-y-auto max-h-[60vh] px-1 py-4">
             {/* Pass onSubmit via prop to the form component */}
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
        {/* Scroll Area within Drawer */}
        <div className="overflow-y-auto px-4">
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