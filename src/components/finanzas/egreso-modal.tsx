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
import { EgresoForm } from "./egreso-form";
import { toast } from "sonner";

const METODOS_PAGO = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "cheque", label: "Cheque" },
  { value: "deposito", label: "Depósito" },
];

const CATEGORIAS_GASTO = [
  { value: "caja_chica", label: "Caja chica" },
  { value: "devoluciones", label: "Devoluciones" },
  { value: "envios", label: "Envíos" },
  { value: "gastos_varios", label: "Gastos varios" },
  { value: "instalacion_mantenimiento", label: "Instalación y mantenimiento" },
  { value: "materia_prima", label: "Materia prima" },
  { value: "nominas", label: "Nóminas" },
  { value: "pago_proveedores", label: "Pago a proveedores" },
  { value: "renta", label: "Renta" },
  { value: "servicios", label: "Servicios" },
  { value: "otros", label: "Otros" },
];

const egresoFormSchema = z.object({
  descripcion: z.string().min(3, "La descripción es requerida (min 3 chars)"),
  categoria: z.string().min(1, "La categoría es requerida"),
  monto: z.string().min(1, "El monto es requerido"),
  moneda: z.enum(["MXN", "USD"], { required_error: "La moneda es requerida" }),
  metodo_pago: z.string().min(1, "El método de pago es requerido"),
  fecha: z.date({ required_error: "La fecha es requerida" }),
});

export type EgresoFormValues = z.infer<typeof egresoFormSchema>;

interface EgresoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EgresoFormValues) => Promise<boolean>;
}

export function EgresoModal({ isOpen, onClose, onSubmit }: EgresoModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const form = useForm<EgresoFormValues>({
    resolver: zodResolver(egresoFormSchema),
    defaultValues: {
      descripcion: "",
      categoria: "",
      monto: "",
      moneda: "MXN",
      metodo_pago: "transferencia",
      fecha: new Date(),
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  const handleFormSubmit = async (data: EgresoFormValues) => {
    setIsSubmitting(true);
    try {
      const success = await onSubmit(data);
      if (success) {
        toast.success("Egreso registrado exitosamente.");
        form.reset();
        onClose();
      }
    } catch (error) {
      console.error("Error submitting egreso:", error);
      toast.error("Error al registrar el egreso. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formProps = {
    form,
    categorias: CATEGORIAS_GASTO,
    metodosPago: METODOS_PAGO,
  };

  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Egreso</DialogTitle>
            <DialogDescription>
              Ingresa los detalles del gasto o egreso realizado.
            </DialogDescription>
          </DialogHeader>

          <div className="px-1 py-4">
            <EgresoForm {...formProps} id="egreso-form-desktop" onSubmit={form.handleSubmit(handleFormSubmit)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" form="egreso-form-desktop" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? "Registrando..." : "Registrar Egreso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Registrar Egreso</DrawerTitle>
          <DrawerDescription>
            Ingresa los detalles del gasto o egreso realizado.
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <EgresoForm {...formProps} id="egreso-form-mobile" onSubmit={form.handleSubmit(handleFormSubmit)} />
        </div>
        <DrawerFooter className="pt-4">
          <Button type="submit" form="egreso-form-mobile" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? "Registrando..." : "Registrar Egreso"}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" disabled={isSubmitting}>Cancelar</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
} 