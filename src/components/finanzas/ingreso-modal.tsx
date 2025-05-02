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
import { toast } from "sonner";

// Updated form validation schema
const formSchema = z.object({
  tipo_ingreso: z.enum(['cotizacion', 'otro'], { required_error: "Selecciona el tipo de ingreso" }),
  cotizacion_id: z.number().optional(),
  descripcion: z.string().optional(),
  // Monto should be a number after transformation
  monto: z.preprocess(
      (val) => {
        const num = parseFloat(String(val));
        return isNaN(num) ? undefined : num;
      },
      z.number({
          required_error: "El monto es requerido",
          invalid_type_error: "El monto debe ser un número",
        }).positive({ message: "El monto debe ser positivo" })
    ),
  moneda: z.string().default('MXN'), // Keep default
  metodo_pago: z.string().min(1, "El método de pago es requerido"),
  fecha_pago: z.date({ required_error: "La fecha es requerida" }),
}).refine(data => {
  // If tipo_ingreso is 'cotizacion', cotizacion_id must be selected
  if (data.tipo_ingreso === 'cotizacion' && (data.cotizacion_id === undefined || data.cotizacion_id === null)) {
    return false;
  }
  return true;
}, {
  message: "Debes seleccionar una cotización para este tipo de ingreso",
  path: ["cotizacion_id"], // Attach error to cotizacion_id field
}).refine(data => {
  // If tipo_ingreso is 'otro', descripcion must be provided
  if (data.tipo_ingreso === 'otro' && (!data.descripcion || data.descripcion.trim().length === 0)) {
    return false;
  }
  return true;
}, {
  message: "La descripción es requerida para este tipo de ingreso",
  path: ["descripcion"], // Attach error to descripcion field
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
  const [isLoadingCotizaciones, setIsLoadingCotizaciones] = useState(false);

  const isDesktop = useMediaQuery("(min-width: 768px)");

  const form = useForm<IngresoFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipo_ingreso: 'cotizacion', // Default to cotizacion
      cotizacion_id: undefined,
      descripcion: "",
      monto: undefined, // Use undefined for number type
      moneda: "MXN",
      metodo_pago: "transferencia",
      fecha_pago: new Date(),
    },
  });

  // --- Watch form values ---
  const watchedTipoIngreso = form.watch("tipo_ingreso");
  const watchedCotizacionId = form.watch("cotizacion_id");

  // Derive selected cotizacion for passing to form (for display purposes)
   const currentSelectedCotizacion = React.useMemo(() => {
       if (watchedTipoIngreso === 'cotizacion' && watchedCotizacionId) {
           return cotizaciones.find(c => c.cotizacion_id === watchedCotizacionId);
       }
       return null;
   }, [watchedTipoIngreso, watchedCotizacionId, cotizaciones]);

  useEffect(() => {
    if (isOpen) {
      form.reset(); // Reset form with default values on open
      loadCotizaciones();
    }
  }, [isOpen, form]);

  const loadCotizaciones = async () => {
    setIsLoadingCotizaciones(true);
    try {
      const result = await getAvailableCotizaciones();
      // console.log("[IngresoResponsiveWrapper] Result from getAvailableCotizaciones:", result);
      setCotizaciones(result.success && result.cotizaciones ? result.cotizaciones : []);
    } catch (error) {
      console.error("Error loading cotizaciones:", error);
      setCotizaciones([]);
      toast.error("Error al cargar cotizaciones disponibles.");
    } finally {
      setIsLoadingCotizaciones(false);
    }
  };

  // --- Effect to update moneda based on selected cotizacion --- START
  useEffect(() => {
    if (watchedTipoIngreso === 'cotizacion') {
        if (currentSelectedCotizacion?.moneda) {
            form.setValue("moneda", currentSelectedCotizacion.moneda);
        } else {
            // Optionally reset to MXN if cotizacion is deselected or has no moneda
            // form.setValue("moneda", "MXN");
        }
    } else {
         // Reset moneda to default when type changes to 'otro' ?
         // form.setValue("moneda", "MXN");
    }
  }, [watchedTipoIngreso, currentSelectedCotizacion, form]);
 // --- Effect to update moneda based on selected cotizacion --- END

  const handleFormSubmit = async (values: IngresoFormValues) => {
    setIsSubmitting(true);
    console.log("[IngresoModal] Submitting values:", values);
    try {
      // Pass the validated & typed values directly to the onSubmit prop
      const success = await onSubmit(values);
      if (success) {
        toast.success("Ingreso registrado exitosamente.");
        form.reset(); // Reset after successful submission
        onClose();
      } else {
         // Error message should be handled by the onSubmit promise rejection/return value
         // toast.error("Hubo un problema al registrar el ingreso.");
      }
    } catch (error) {
      console.error("Error submitting payment:", error);
      toast.error("Error al registrar el ingreso. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Simplified formProps, remove helpers
  const formProps = {
    form,
    selectedCotizacion: currentSelectedCotizacion, // Pass derived state
    cotizaciones,
    isLoadingCotizaciones,
    // Removed getRemainingAmount, calculatePercentage
  };

  // Determine if submit button should be disabled based on validation
  const canSubmit = form.formState.isValid;

  // --- Render Dialog for Desktop ---
  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Registrar Ingreso</DialogTitle>
            <DialogDescription>
               {watchedTipoIngreso === 'cotizacion'
                 ? "Selecciona la cotización y registra los detalles del pago recibido."
                 : "Registra los detalles del ingreso recibido."}
            </DialogDescription>
          </DialogHeader>

          <div className="px-1 py-4">
            <IngresoForm {...formProps} id="ingreso-form-desktop" onSubmit={form.handleSubmit(handleFormSubmit)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" form="ingreso-form-desktop" disabled={isSubmitting || !canSubmit}>
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
             {watchedTipoIngreso === 'cotizacion'
                 ? "Selecciona la cotización y registra los detalles del pago recibido."
                 : "Registra los detalles del ingreso recibido."}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <IngresoForm {...formProps} id="ingreso-form-mobile" onSubmit={form.handleSubmit(handleFormSubmit)} />
        </div>
        <DrawerFooter className="pt-4">
          <Button type="submit" form="ingreso-form-mobile" disabled={isSubmitting || !canSubmit}>
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