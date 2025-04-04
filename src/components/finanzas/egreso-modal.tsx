"use client";

import { useState } from "react";
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
import { cn } from "@/lib/utils";

const METODOS_PAGO = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "cheque", label: "Cheque" },
  { value: "deposito", label: "Depósito" },
];

const CATEGORIAS_GASTO = [
  { value: "materia_prima", label: "Materia Prima" },
  { value: "servicios", label: "Servicios" },
  { value: "nominas", label: "Nóminas" },
  { value: "renta", label: "Renta o Alquiler" },
  { value: "equipo", label: "Equipo o Maquinaria" },
  { value: "marketing", label: "Marketing y Publicidad" },
  { value: "impuestos", label: "Impuestos" },
  { value: "gastos_varios", label: "Gastos Varios" },
];

const formSchema = z.object({
  descripcion: z.string().min(3, "La descripción debe tener al menos 3 caracteres"),
  categoria: z.string().min(1, "La categoría es requerida"),
  monto: z.string().min(1, "El monto es requerido"),
  moneda: z.enum(["MXN", "USD"], {
    errorMap: () => ({ message: "Selecciona una moneda válida" }),
  }),
  metodo_pago: z.string().min(1, "El método de pago es requerido"),
  fecha: z.date({
    required_error: "La fecha es requerida",
  }),
  comprobante_url: z.string().optional(),
  notas: z.string().optional(),
});

export type EgresoFormValues = z.infer<typeof formSchema>;

interface EgresoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EgresoFormValues) => Promise<boolean>;
}

export function EgresoModal({ isOpen, onClose, onSubmit }: EgresoModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<EgresoFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      descripcion: "",
      categoria: "",
      monto: "",
      moneda: "MXN",
      metodo_pago: "transferencia",
      fecha: new Date(),
      comprobante_url: "",
      notas: "",
    },
  });

  const handleFormSubmit = async (data: EgresoFormValues) => {
    setIsSubmitting(true);
    try {
      const success = await onSubmit(data);
      if (success) {
        form.reset();
        onClose();
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-slate-800">
            Registrar Egreso
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 mt-4">
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label htmlFor="descripcion" className="text-sm font-medium text-slate-700">
                Descripción
              </Label>
              <Input
                id="descripcion"
                placeholder="Describe el gasto..."
                className="bg-white border-slate-200"
                {...form.register("descripcion")}
              />
              {form.formState.errors.descripcion && (
                <p className="text-sm text-red-500">{form.formState.errors.descripcion.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria" className="text-sm font-medium text-slate-700">
                Categoría
              </Label>
              <Select
                onValueChange={(value) => form.setValue("categoria", value)}
                value={form.watch("categoria")}
              >
                <SelectTrigger className="bg-white border-slate-200">
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_GASTO.map((categoria) => (
                    <SelectItem key={categoria.value} value={categoria.value}>
                      {categoria.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.categoria && (
                <p className="text-sm text-red-500">{form.formState.errors.categoria.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monto" className="text-sm font-medium text-slate-700">
                  Monto
                </Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
                    $
                  </span>
                  <Input
                    id="monto"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-8 bg-white border-slate-200"
                    {...form.register("monto")}
                  />
                </div>
                {form.formState.errors.monto && (
                  <p className="text-sm text-red-500">{form.formState.errors.monto.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="moneda" className="text-sm font-medium text-slate-700">
                  Moneda
                </Label>
                <Select
                  onValueChange={(value) => form.setValue("moneda", value as "MXN" | "USD")}
                  value={form.watch("moneda")}
                >
                  <SelectTrigger className="bg-white border-slate-200">
                    <SelectValue placeholder="Moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MXN">MXN</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.moneda && (
                  <p className="text-sm text-red-500">{form.formState.errors.moneda.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metodo_pago" className="text-sm font-medium text-slate-700">
                Método de pago
              </Label>
              <Select
                onValueChange={(value) => form.setValue("metodo_pago", value)}
                value={form.watch("metodo_pago")}
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
              <Label htmlFor="fecha" className="text-sm font-medium text-slate-700">
                Fecha
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-white border-slate-200",
                      !form.watch("fecha") && "text-slate-400"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
                    {form.watch("fecha") ? (
                      format(form.watch("fecha"), "PPP", { locale: es })
                    ) : (
                      <span>Seleccionar fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.watch("fecha")}
                    onSelect={(date) => form.setValue("fecha", date as Date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {form.formState.errors.fecha && (
                <p className="text-sm text-red-500">{form.formState.errors.fecha.message}</p>
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
                className="bg-white border-slate-200"
                {...form.register("comprobante_url")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notas" className="text-sm font-medium text-slate-700">
                Notas adicionales (opcional)
              </Label>
              <Textarea
                id="notas"
                placeholder="Agrega notas adicionales sobre este gasto..."
                className="bg-white border-slate-200 min-h-24 resize-none"
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
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : "Guardar Egreso"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 