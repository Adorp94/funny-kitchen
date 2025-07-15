"use client";

import { z } from "zod";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { EgresoFormValues } from "./egreso-modal"; // Assuming type is exported from modal

interface Categoria {
  value: string;
  label: string;
}

interface MetodoPago {
  value: string;
  label: string;
}

interface EgresoFormProps extends React.ComponentProps<"form"> {
  form: UseFormReturn<EgresoFormValues>;
  categorias: Categoria[];
  metodosPago: MetodoPago[];
}

export function EgresoForm({
  className,
  form,
  categorias,
  metodosPago,
  ...props
}: EgresoFormProps) {

  return (
    <form className={cn("space-y-4", className)} {...props}>
      {/* Descripcion */}
      <div className="space-y-2">
        <Label htmlFor="descripcion">Descripción *</Label>
        <Input
          id="descripcion"
          placeholder="Describe el gasto..."
          {...form.register("descripcion")}
        />
        {form.formState.errors.descripcion && (
          <p className="text-xs text-red-600">{form.formState.errors.descripcion.message}</p>
        )}
      </div>

      {/* Categoria Select */}
      <div className="space-y-2">
        <Label htmlFor="categoria">Categoría *</Label>
        <Select 
          onValueChange={(value) => form.setValue("categoria", value)}
          defaultValue={form.getValues("categoria")}
        >
          <SelectTrigger id="categoria">
            <SelectValue placeholder="Seleccionar categoría" />
          </SelectTrigger>
          <SelectContent>
            {categorias.map((categoria) => (
              <SelectItem key={categoria.value} value={categoria.value}>
                {categoria.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.categoria && (
          <p className="text-xs text-red-600">{form.formState.errors.categoria.message}</p>
        )}
      </div>

      {/* Grid for Monto & Moneda */}
      <div className="grid grid-cols-2 gap-4">
        {/* Monto Input */}
        <div className="space-y-2">
          <Label htmlFor="monto">Monto *</Label>
          <div className="relative">
            <Input
              id="monto"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...form.register("monto")}
              className="pl-7 text-right"
            />
            <span className="absolute inset-y-0 left-2 flex items-center text-sm text-muted-foreground pointer-events-none">
              $
            </span>
          </div>
          {form.formState.errors.monto && (
            <p className="text-xs text-red-600">{form.formState.errors.monto.message}</p>
          )}
        </div>

        {/* Moneda Select */}
        <div className="space-y-2">
          <Label htmlFor="moneda">Moneda *</Label>
          <Select 
            onValueChange={(value) => form.setValue("moneda", value as "MXN" | "USD")}
            defaultValue={form.getValues("moneda")}
          >
            <SelectTrigger id="moneda">
              <SelectValue placeholder="Moneda" />
            </SelectTrigger>
            <SelectContent>
                              <SelectItem value="MXN">MXN</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.moneda && (
            <p className="text-xs text-red-600">{form.formState.errors.moneda.message}</p>
          )}
        </div>
      </div> { /* End grid */}

      {/* Metodo Pago Select */}
      <div className="space-y-2">
        <Label htmlFor="metodo_pago">Método de pago *</Label>
        <Select 
          onValueChange={(value) => form.setValue("metodo_pago", value)}
          defaultValue={form.getValues("metodo_pago")}
        >
          <SelectTrigger id="metodo_pago">
            <SelectValue placeholder="Seleccionar método" />
          </SelectTrigger>
          <SelectContent>
            {metodosPago.map((metodo) => (
              <SelectItem key={metodo.value} value={metodo.value}>
                {metodo.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.metodo_pago && (
          <p className="text-xs text-red-600">{form.formState.errors.metodo_pago.message}</p>
        )}
      </div>

      {/* Fecha Calendar */}
      <div className="space-y-2">
        <Label htmlFor="fecha">Fecha *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="fecha"
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal",
                !form.watch("fecha") && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
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
              onSelect={(date) => date && form.setValue("fecha", date)}
              initialFocus
              locale={es}
            />
          </PopoverContent>
        </Popover>
        {form.formState.errors.fecha && (
          <p className="text-xs text-red-600">{form.formState.errors.fecha.message}</p>
        )}
      </div>

      {/* Submit button is handled by the parent Dialog/Drawer footer */}
    </form>
  );
} 