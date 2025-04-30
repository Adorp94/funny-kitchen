"use client";

import { useState, useEffect } from "react";
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
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { IngresoFormValues } from "./ingreso-modal"; // Assuming types are exported from modal

// Define the available payment methods (can be passed as prop or kept here)
const METODOS_PAGO = [
    { value: "efectivo", label: "Efectivo" },
    { value: "transferencia", label: "Transferencia" },
    { value: "tarjeta", label: "Tarjeta" },
    { value: "cheque", label: "Cheque" },
    { value: "deposito", label: "Depósito" },
  ];

// Interface for the props the form component will need
interface IngresoFormProps extends React.ComponentProps<"form"> { // Allow passing standard form props like className
  form: UseFormReturn<IngresoFormValues>;
  selectedCotizacion: any; // Consider defining a proper type for cotizacion
  isLoadingCotizaciones: boolean;
  cotizaciones: any[];
  openCombobox: boolean;
  setOpenCombobox: (open: boolean) => void;
  queryCombobox: string;
  setQueryCombobox: (query: string) => void;
  getRemainingAmount: () => number;
  calculatePercentage: () => string;
  filteredCotizaciones: any[];
  watchedCotizacionId: number | undefined;
}

export function IngresoForm({ 
  className, 
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
  watchedCotizacionId,
  ...props // Pass rest of the props to the form element
}: IngresoFormProps) {

  return (
    // Apply className and use space-y-4 for structure
    <form className={cn("space-y-4", className)} {...props}>
      {/* Cotizacion Combobox */}
      <div className="space-y-2">
        <Label htmlFor="cotizacion_id" className="text-sm">Cotización *</Label>
        {isLoadingCotizaciones ? (
          <div className="flex items-center space-x-2 h-10 px-3 py-2 border rounded-md bg-muted">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Cargando cotizaciones...</span>
          </div>
        ) : (
          <Popover open={openCombobox} onOpenChange={(isOpen) => {
            setOpenCombobox(isOpen);
            if (isOpen) setQueryCombobox("");
          }}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                id="cotizacion_id"
                variant="outline"
                role="combobox"
                aria-expanded={openCombobox}
                aria-controls="cotizacion-list"
                aria-haspopup="listbox"
                className={cn(
                  "w-full justify-between text-left font-normal",
                  !selectedCotizacion && "text-muted-foreground"
                )}
              >
                {selectedCotizacion
                  ? `${selectedCotizacion.folio} - ${selectedCotizacion.cliente_nombre}`
                  : "Seleccionar cotización"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              side="bottom"
              sideOffset={4}
              className="w-[--radix-popover-trigger-width] p-0 z-50"
            >
              <Command className="overflow-hidden">
                <CommandInput
                  placeholder="Buscar folio o cliente..."
                  value={queryCombobox}
                  onValueChange={setQueryCombobox}
                  className="h-9"
                />
                <CommandList
                  id="cotizacion-list"
                  role="listbox"
                  className="max-h-52"
                >
                  <CommandEmpty className="py-6 text-center text-sm">No hay cotizaciones disponibles.</CommandEmpty>
                  {filteredCotizaciones.map((c) => (
                    <CommandItem
                      key={c.cotizacion_id}
                      value={c.cotizacion_id.toString()}
                      onSelect={(currentValue) => {
                        const selectedValue = Number(currentValue);
                        form.setValue("cotizacion_id", selectedValue);
                        setOpenCombobox(false);
                      }}
                      className="text-sm"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          watchedCotizacionId === c.cotizacion_id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {`${c.folio} - ${c.cliente_nombre} (${formatCurrency(c.total - (c.monto_pagado || 0), c.moneda)} pendiente)`}
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
        {form.formState.errors.cotizacion_id && (
          <p className="text-xs text-red-600">{form.formState.errors.cotizacion_id.message}</p>
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
      
      {/* Comprobante URL Input */}
      <div className="space-y-2">
        <Label htmlFor="comprobante_url" className="text-sm">URL Comprobante (opcional)</Label>
        <Input
          id="comprobante_url"
          type="url"
          placeholder="https://..."
          {...form.register("comprobante_url")}
        />
      </div>

      {/* Notas Textarea */}
      <div className="space-y-2">
        <Label htmlFor="notas" className="text-sm">Notas adicionales (opcional)</Label>
        <Textarea
          id="notas"
          placeholder="Añade cualquier detalle relevante..."
          rows={3}
          {...form.register("notas")}
        />
      </div>
      {/* Submit button is handled by the parent Dialog/Drawer footer */}
    </form>
  );
} 