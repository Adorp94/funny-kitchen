"use client";

import { useState, useEffect } from 'react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DollarSign, Truck, Receipt, Percent, User, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from '@/lib/utils';

interface Cliente {
  nombre: string;
  celular: string;
  correo?: string | null;
  atencion?: string | null;
  [key: string]: any;
}

interface ResumenCotizacionProps {
  cliente: Cliente | null;
  productos: any[]; // Keep simple for now
  subtotal: number;
  ivaAmount: number;
  globalDiscount: number;
  setGlobalDiscount: (value: number) => void;
  hasIva: boolean;
  setHasIva: (hasIva: boolean) => void;
  shippingCost: number;
  setShippingCost: (value: number) => void;
  total: number;
  moneda: 'MXN' | 'USD';
  tiempoEstimado?: number;
  setTiempoEstimado?: (weeks: number) => void;
  tiempoEstimadoMax?: number;
  setTiempoEstimadoMax?: (weeks: number) => void;
}

export function ResumenCotizacion({
  cliente,
  productos, // Not used directly in this simplified version
  subtotal,
  ivaAmount,
  globalDiscount,
  setGlobalDiscount,
  hasIva,
  setHasIva,
  shippingCost,
  setShippingCost,
  total,
  moneda,
  tiempoEstimado = 6,
  setTiempoEstimado,
  tiempoEstimadoMax = 8,
  setTiempoEstimadoMax
}: ResumenCotizacionProps) {
  const [globalDiscountStr, setGlobalDiscountStr] = useState<string>('0');
  const [hasShipping, setHasShipping] = useState<boolean>(false);
  const [shippingCostStr, setShippingCostStr] = useState<string>('0');

  useEffect(() => {
    setGlobalDiscountStr(globalDiscount.toString());
    setHasShipping(shippingCost > 0);
    setShippingCostStr(shippingCost.toString());
  }, [globalDiscount, shippingCost]);

  const handleGlobalDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0 && parseFloat(value) <= 100) ) {
      setGlobalDiscountStr(value);
      const numValue = value === '' ? 0 : parseFloat(value);
      setGlobalDiscount(numValue);
    }
  };

  const handleIvaToggle = (checked: boolean) => setHasIva(checked);
  const handleShippingToggle = (checked: boolean) => {
    setHasShipping(checked);
    if (!checked) {
      setShippingCostStr('0');
      setShippingCost(0);
    }
  };

  const handleShippingCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
      setShippingCostStr(value);
      const numValue = value === '' ? 0 : parseFloat(value);
      setShippingCost(numValue);
    }
  };

  const handleTiempoEstimadoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (setTiempoEstimado && (value === '' || /^[1-9]\d*$/.test(value))) { // Only allow positive integers
      const numValue = value === '' ? 1 : parseInt(value);
      const newMinValue = Math.max(numValue, 1);
      setTiempoEstimado(newMinValue);
      if (newMinValue > tiempoEstimadoMax && setTiempoEstimadoMax) {
        setTiempoEstimadoMax(newMinValue);
      }
    }
  };
  
  const handleTiempoEstimadoMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (setTiempoEstimadoMax && (value === '' || /^[1-9]\d*$/.test(value))) { // Only allow positive integers
      const numValue = value === '' ? tiempoEstimado : parseInt(value); // Default to min if empty
      const newMaxValue = Math.max(numValue, tiempoEstimado);
      setTiempoEstimadoMax(newMaxValue);
    }
  };

  return (
    <div className="space-y-6">
      {/* Client Info Card */}
      {cliente && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Información del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><span className="font-medium text-foreground">Nombre:</span> {cliente.nombre}</p>
            <p><span className="font-medium text-foreground">Teléfono:</span> {cliente.celular}</p>
            {cliente.correo && <p><span className="font-medium text-foreground">Correo:</span> {cliente.correo}</p>}
            {cliente.atencion && <p><span className="font-medium text-foreground">Atención:</span> {cliente.atencion}</p>}
          </CardContent>
        </Card>
      )}

      {/* Financial Summary & Options Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Resumen Financiero y Opciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Subtotal Display */}
          <div className="flex justify-between items-center py-1">
            <span className="text-sm text-muted-foreground">Subtotal Productos</span>
            <span className="text-sm font-medium">{formatCurrency(subtotal, moneda)}</span>
          </div>

          {/* Global Discount Input */}
          <div className="flex justify-between items-center py-1">
            <Label htmlFor="globalDiscount" className="text-sm flex items-center gap-1.5 text-muted-foreground">
              <Percent className="h-4 w-4" />
              Descuento Global
            </Label>
            <div className="relative w-24">
              <Input
                id="globalDiscount"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={globalDiscountStr}
                onChange={handleGlobalDiscountChange}
                className="h-8 pr-6 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
          </div>
          
           {/* Discount Amount Display */}
           {globalDiscount > 0 && (
            <div className="flex justify-between items-center py-1 text-sm text-destructive">
              <span className="pl-6">Monto Descuento</span>
              <span>-{formatCurrency(subtotal * (globalDiscount / 100), moneda)}</span>
            </div>
          )}

          <Separator />

          {/* IVA Toggle & Amount */}
          <div className="flex justify-between items-center py-1">
            <Label htmlFor="hasIva" className="text-sm flex items-center gap-1.5 text-muted-foreground">
              Incluir IVA (16%)
            </Label>
            <Switch id="hasIva" checked={hasIva} onCheckedChange={handleIvaToggle} />
          </div>
          {hasIva && (
            <div className="flex justify-between items-center py-1 text-sm">
              <span className="pl-6 text-muted-foreground">Monto IVA</span>
              <span>{formatCurrency(ivaAmount, moneda)}</span>
            </div>
          )}

          <Separator />

          {/* Shipping Toggle & Cost */}
          <div className="flex justify-between items-center py-1">
             <Label htmlFor="hasShipping" className="text-sm flex items-center gap-1.5 text-muted-foreground">
              <Truck className="h-4 w-4" />
              Incluir Envío
            </Label>
            <Switch id="hasShipping" checked={hasShipping} onCheckedChange={handleShippingToggle} />
          </div>
          {hasShipping && (
            <div className="flex justify-between items-center py-1">
              <Label htmlFor="shippingCost" className="pl-6 text-sm text-muted-foreground">
                Costo Envío ({moneda})
              </Label>
              <div className="relative w-28">
                <DollarSign className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                 <Input
                  id="shippingCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={shippingCostStr}
                  onChange={handleShippingCostChange}
                  className="h-8 pl-6 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="0.00"
                />
              </div>
            </div>
          )}

          <Separator />
          
          {/* Tiempo Entrega Inputs */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center py-1 gap-2 sm:gap-4">
            <Label className="text-sm flex items-center gap-1.5 text-muted-foreground shrink-0">
              <Clock className="h-4 w-4" />
              Tiempo Entrega (Semanas)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                step="1"
                value={tiempoEstimado}
                onChange={handleTiempoEstimadoChange}
                className="h-8 w-16 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="Min"
              />
              <span className="text-muted-foreground">a</span>
              <Input
                type="number"
                min={tiempoEstimado} // Min value is the current min estimate
                step="1"
                value={tiempoEstimadoMax}
                onChange={handleTiempoEstimadoMaxChange}
                className="h-8 w-16 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="Max"
              />
            </div>
          </div>

          <Separator />

          {/* Final Total */}
          <div className="flex justify-between items-center pt-2">
            <span className="text-base font-semibold">Total</span>
            <span className="text-xl font-bold text-primary">
              {formatCurrency(total, moneda)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ResumenCotizacion; 