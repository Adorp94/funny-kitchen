"use client";

import { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatCurrency } from "@/lib/utils";
import { IngresoFormValues } from "./ingreso-modal";
import { Card } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

// Define the available payment methods (can be passed as prop or kept here)
const METODOS_PAGO = [
    { value: "efectivo", label: "Efectivo" },
    { value: "transferencia", label: "Transferencia" },
    { value: "tarjeta", label: "Tarjeta" },
    { value: "cheque", label: "Cheque" },
    { value: "deposito", label: "Depósito" },
  ];

// Interface for the props the form component will need
interface IngresoFormProps extends React.ComponentProps<"form"> {
  form: UseFormReturn<IngresoFormValues>;
  selectedCotizacion: any;
  cotizaciones: any[];
  getRemainingAmount: () => number;
  calculatePercentage: () => string;
  onOpenSearch?: () => void;
}

export function IngresoForm({ 
  className, 
  form, 
  selectedCotizacion, 
  cotizaciones,
  getRemainingAmount,
  calculatePercentage,
  onOpenSearch,
  ...props
}: IngresoFormProps) {
  const [openCotizacionPopover, setOpenCotizacionPopover] = useState(false);

  return (
    <form className={cn("space-y-4", className)} {...props}>
      {/* --- Cotizacion Selection --- */}
      <div className="space-y-2">
        <Label className="text-sm">Cotización *</Label>
        
        {/* Display selected cotizacion */} 
        {selectedCotizacion ? (
             <Card className="p-3 text-sm border-dashed border-primary bg-primary/5">
                <p className="font-medium">{selectedCotizacion.folio}</p>
                <p className="text-muted-foreground">{selectedCotizacion.cliente_nombre}</p>
                <p className="text-xs text-muted-foreground mt-1">
                    Pendiente: {formatCurrency(getRemainingAmount(), selectedCotizacion.moneda)}
                </p>
                <Button 
                    type="button" 
                    variant="link"
                    size="sm"
                    className="p-0 h-auto text-xs mt-1"
                    onClick={() => form.setValue("cotizacion_id", undefined as any)} // Clear selection
                >
                    Cambiar
                </Button>
            </Card>
        ) : (
          <Popover open={openCotizacionPopover} onOpenChange={setOpenCotizacionPopover}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={openCotizacionPopover}
                aria-controls="cotizaciones-list"
                className="w-full justify-between text-muted-foreground"
              >
                Seleccionar cotización...
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
              <Command>
                <CommandInput placeholder="Buscar cotización (Folio/Cliente)..." />
                <CommandList id="cotizaciones-list">
                  <CommandEmpty>No se encontraron cotizaciones.</CommandEmpty>
                  <CommandGroup>
                    {cotizaciones?.map((cot) => (
                      <CommandItem
                        key={cot.cotizacion_id}
                        value={`${cot.folio} ${cot.cliente_nombre}`}
                        onSelect={() => {
                          form.setValue("cotizacion_id", cot.cotizacion_id);
                          setOpenCotizacionPopover(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            form.watch("cotizacion_id") === cot.cotizacion_id ? "opacity-100" : "opacity-0"
                          )}
                          aria-hidden="true"
                        />
                        <span key={`span-${cot.cotizacion_id}`}>
                            <p className="text-sm font-medium">{cot.folio}</p>
                            <p className="text-xs text-muted-foreground">{cot.cliente_nombre}</p>
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}

        {/* Error Message */}
        {form.formState.errors.cotizacion_id && !selectedCotizacion && (
          <p className="text-xs text-red-600 mt-1" id="cotizacion-error">
            {form.formState.errors.cotizacion_id.message}
          </p>
        )}
      </div>

      {/* Monto Input */}
      <div className="space-y-2">
        <Label htmlFor="monto" className="text-sm">Monto *</Label>
        <div className="relative">
          <Input
            id="monto"
            type="number"
            step="0.01"
            placeholder="0.00"
            {...form.register("monto")}
            className={cn(
                "pl-10",
                form.formState.errors.monto && "border-red-500"
              )}
          />
          <span className="absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
            {selectedCotizacion?.moneda || "MXN"}
          </span>
        </div>
        {selectedCotizacion && (
            <p className="text-xs text-muted-foreground">
              Pendiente: {formatCurrency(getRemainingAmount(), selectedCotizacion.moneda)}
              {Number(form.watch("monto")) > 0 && ` (${calculatePercentage()}%)`}
            </p>
        )}
        {form.formState.errors.monto && (
          <p className="text-xs text-red-600">{form.formState.errors.monto.message}</p>
        )}
      </div>

      {/* Metodo Pago Select */}
      <div className="space-y-2">
        <Label htmlFor="metodo_pago" className="text-sm">Método de pago *</Label>
        <Select 
            onValueChange={(value) => form.setValue("metodo_pago", value)}
            defaultValue={form.getValues("metodo_pago")}
        >
          <SelectTrigger id="metodo_pago" className="w-full">
            <SelectValue placeholder="Seleccionar método" />
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
          <p className="text-xs text-red-600">{form.formState.errors.metodo_pago.message}</p>
        )}
      </div>

      {/* Fecha Pago Calendar */}
      <div className="space-y-2">
        <Label htmlFor="fecha_pago" className="text-sm">Fecha de pago *</Label>
        <Popover>
            <PopoverTrigger asChild>
              <Button
                id="fecha_pago"
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !form.watch("fecha_pago") && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {form.watch("fecha_pago") ? (
                  format(form.watch("fecha_pago"), "PPP", { locale: es })
                ) : (
                  <span>Seleccionar fecha</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={form.watch("fecha_pago")}
                onSelect={(date) => date && form.setValue("fecha_pago", date)}
                initialFocus
                locale={es}
              />
            </PopoverContent>
        </Popover>
          {form.formState.errors.fecha_pago && (
          <p className="text-xs text-red-600">{form.formState.errors.fecha_pago.message}</p>
        )}
      </div>
      
      {/* Submit button is handled by the parent Dialog/Drawer footer */}
    </form>
  );
} 