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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
  isLoadingCotizaciones?: boolean;
}

export function IngresoForm({ 
  className, 
  form, 
  selectedCotizacion, 
  cotizaciones,
  getRemainingAmount,
  calculatePercentage,
  isLoadingCotizaciones,
  ...props
}: IngresoFormProps) {
  const [openCotizacionPopover, setOpenCotizacionPopover] = useState(false);

  // Watch the income type field from the form
  const tipoIngreso = form.watch("tipo_ingreso");

  // Derive selected cotizacion based on form value
  const watchedCotizacionId = form.watch("cotizacion_id");
  const currentSelectedCotizacion = cotizaciones?.find(c => c.cotizacion_id === watchedCotizacionId);

  // Function to calculate remaining amount based on the currently watched cotizacion
  const getRemainingForWatched = () => {
    if (currentSelectedCotizacion) {
        const total = Number(currentSelectedCotizacion.total || 0);
        const paid = Number(currentSelectedCotizacion.monto_pagado || 0);
        return Math.max(0, total - paid);
    }
    return 0;
  };

  // Function to calculate percentage based on watched cotizacion and amount
  const calculatePercentageForWatched = () => {
    const monto = Number(form.watch("monto") || 0);
    if (currentSelectedCotizacion && monto > 0) {
        const total = Number(currentSelectedCotizacion.total || 0);
        if (total > 0) {
          return ((monto / total) * 100).toFixed(1); // One decimal place
        }
    }
    return '0.0';
  };

  // Reset cotizacion_id when switching to 'otro'
  useEffect(() => {
    if (tipoIngreso === 'otro') {
      form.setValue('cotizacion_id', undefined);
      form.clearErrors('cotizacion_id'); // Clear potential errors
    }
     if (tipoIngreso === 'cotizacion') {
       form.setValue('descripcion', undefined);
       form.clearErrors('descripcion'); // Clear potential errors
     }
  }, [tipoIngreso, form]);

  return (
    <form className={cn("space-y-4", className)} {...props}>
      {/* --- Income Type Selection --- */}
      <div className="space-y-2">
        <Label className="text-sm">Tipo de Ingreso *</Label>
        <RadioGroup
          defaultValue={form.getValues("tipo_ingreso")}
          onValueChange={(value: 'cotizacion' | 'otro') => form.setValue("tipo_ingreso", value)}
          className="flex space-x-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="cotizacion" id="tipo_cotizacion" />
            <Label htmlFor="tipo_cotizacion" className="font-normal">Pago de Cotización</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="otro" id="tipo_otro" />
            <Label htmlFor="tipo_otro" className="font-normal">Otro Ingreso</Label>
          </div>
        </RadioGroup>
         {form.formState.errors.tipo_ingreso && (
           <p className="text-xs text-red-600 mt-1">
             {form.formState.errors.tipo_ingreso.message}
           </p>
         )}
      </div>

      {/* --- Conditional Fields based on Income Type --- */}
      {tipoIngreso === 'cotizacion' && (
        <div className="space-y-2">
          <Label className="text-sm">Cotización *</Label>

          {/* Display selected cotizacion */}
          {currentSelectedCotizacion ? (
               <Card className="p-3 text-sm border-dashed border-primary bg-primary/5">
                  <p className="font-medium">{currentSelectedCotizacion.folio}</p>
                  <p className="text-muted-foreground">{currentSelectedCotizacion.cliente_nombre}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                      Pendiente: {formatCurrency(getRemainingForWatched(), currentSelectedCotizacion.moneda)}
                  </p>
                  <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="p-0 h-auto text-xs mt-1"
                      onClick={() => form.setValue("cotizacion_id", undefined)} // Clear selection
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
                  className={cn(
                     "w-full justify-between text-muted-foreground",
                     form.formState.errors.cotizacion_id && "border-red-500"
                   )}
                  disabled={isLoadingCotizaciones}
                >
                  {isLoadingCotizaciones ? "Cargando..." : "Seleccionar cotización..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                <Command filter={(value, search) => {
                  // Custom filter function expects value to be `cot-${id}`
                  const idStr = value.split('-')[1];
                  if (!idStr) return 0;
                  const cotizacion = cotizaciones.find(c => c.cotizacion_id === parseInt(idStr));
                  if (!cotizacion) return 0;
                  const itemData = `${cotizacion.folio || ''} ${cotizacion.cliente_nombre || ''}`.toLowerCase();
                  return itemData.includes(search.toLowerCase()) ? 1 : 0;
                }}>
                  <CommandInput placeholder="Buscar cotización (Folio/Cliente)..." />
                  <CommandList id="cotizaciones-list">
                    <CommandEmpty>No se encontraron cotizaciones.</CommandEmpty>
                    <CommandGroup>
                      {cotizaciones?.map((cot) => (
                        <CommandItem
                          key={cot.cotizacion_id}
                          // Use a unique value combining name/id for filtering
                          value={`cot-${cot.cotizacion_id}`}
                          onSelect={(currentValue) => {
                            const selectedId = parseInt(currentValue.split('-')[1]);
                            form.setValue("cotizacion_id", selectedId);
                            // Trigger validation if needed: form.trigger("cotizacion_id");
                            setOpenCotizacionPopover(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              watchedCotizacionId === cot.cotizacion_id ? "opacity-100" : "opacity-0"
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
          {form.formState.errors.cotizacion_id && (
            <p className="text-xs text-red-600 mt-1" id="cotizacion-error">
              {form.formState.errors.cotizacion_id.message}
            </p>
          )}
        </div>
      )}

       {tipoIngreso === 'otro' && (
         <div className="space-y-2">
           <Label htmlFor="descripcion" className="text-sm">Descripción *</Label>
           <Textarea
             id="descripcion"
             placeholder="Describe el ingreso (e.g., Venta directa, Devolución proveedor X)"
             {...form.register("descripcion")}
             className={cn(
               form.formState.errors.descripcion && "border-red-500"
             )}
             rows={3}
           />
           {form.formState.errors.descripcion && (
             <p className="text-xs text-red-600">
               {form.formState.errors.descripcion.message}
             </p>
           )}
         </div>
       )}

      {/* Grid container for Monto and Metodo Pago */}
      <div className="grid grid-cols-2 gap-4">
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
                  "pl-7 text-right",
                  form.formState.errors.monto && "border-red-500"
                )}
            />
            <span className="absolute inset-y-0 left-2 flex items-center text-sm text-muted-foreground pointer-events-none">
              $
            </span>
          </div>
          {/* Display remaining amount and percentage only for cotizacion type */}
          {tipoIngreso === 'cotizacion' && currentSelectedCotizacion && (
              <p className="text-xs text-muted-foreground">
                Pendiente: {formatCurrency(getRemainingForWatched(), currentSelectedCotizacion.moneda)}
                {Number(form.watch("monto")) > 0 && ` (${calculatePercentageForWatched()}%)`}
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