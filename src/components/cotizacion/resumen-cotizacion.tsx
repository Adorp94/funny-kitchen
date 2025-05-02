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
  // Initialize based on the initial prop value
  const [hasShipping, setHasShipping] = useState<boolean>(shippingCost > 0);
  const [tiempoEstimadoMaxStr, setTiempoEstimadoMaxStr] = useState<string>(tiempoEstimadoMax?.toString() ?? '8');
  
  // --- Local state for the shipping cost input string ---
  const [localShippingCostStr, setLocalShippingCostStr] = useState<string>(
    shippingCost === 0 ? '' : shippingCost.toString()
  );

  // Effect to update local string state if the prop changes from outside
  // (e.g., loading data, or toggling the switch off)
  useEffect(() => {
    const propStr = shippingCost === 0 ? '' : shippingCost.toString();
    // Only update local state if the prop is different from what the local state represents numerically
    const localNum = localShippingCostStr === '' ? 0 : parseFloat(localShippingCostStr);
    if (shippingCost !== localNum) {
        console.log(`[Resumen Effect] Syncing localShippingCostStr from prop. Prop=${shippingCost}, CurrentLocalStr="${localShippingCostStr}"`);
        setLocalShippingCostStr(propStr);
    }
  }, [shippingCost]); // Run only when the context prop changes

  // --- End local state management ---

  useEffect(() => {
    setTiempoEstimadoMaxStr(tiempoEstimadoMax?.toString() ?? '8');
  }, [tiempoEstimadoMax]);

  const handleGlobalDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = value === '' ? 0 : parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      setGlobalDiscount(numValue);
    }
  };

  const handleIvaToggle = (checked: boolean) => setHasIva(checked);
  
  // Updated: Toggle now just controls visibility and sets cost to 0 when turned off
  const handleShippingToggle = (checked: boolean) => {
    console.log(`[Resumen Toggle] handleShippingToggle called with: ${checked}`);
    setHasShipping(checked);
    if (!checked) {
      console.log("[Resumen Toggle] Shipping turned off, setting context cost to 0.");
      setShippingCost(0); // Update context directly
      // Local state will be updated by the useEffect watching shippingCost
    } else {
      // If turning on, maybe default to a value or just let user input?
      // For now, do nothing, user needs to input a value > 0.
    }
  };

  // Updated: Input onChange only updates local string state
  const handleShippingCostInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
     // Basic filtering: Allow numbers, one decimal point, prevent minus sign
     if (/^[0-9]*\.?\d*$/.test(value) && !value.startsWith('-')) {
        setLocalShippingCostStr(value);
     }
  };

  // Updated: Input onBlur updates the context
  const handleShippingCostInputBlur = () => {
    let numValue = localShippingCostStr === '' ? 0 : parseFloat(localShippingCostStr);
    
    if (isNaN(numValue) || numValue < 0) {
      numValue = 0; // Default to 0 if invalid
    }

    // Format the local string state to match the parsed number (e.g., remove leading zeros)
    const formattedStr = numValue === 0 ? '' : numValue.toString();
    setLocalShippingCostStr(formattedStr);

    // Update context only if the numeric value is different
    if (numValue !== shippingCost) {
      console.log(`[Resumen Blur] Updating context shippingCost from ${shippingCost} to ${numValue}`);
      setShippingCost(numValue);
    }
  };

  const handleTiempoEstimadoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = value === '' ? 0 : parseInt(value, 10);
    if (setTiempoEstimado && !isNaN(numValue) && numValue >= 0) {
      setTiempoEstimado(numValue);
    }
  };
  
  const handleTiempoEstimadoMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTiempoEstimadoMaxStr(value);
    if (setTiempoEstimadoMax) {
      const numValue = value === '' ? 0 : parseInt(value, 10);
      if (!isNaN(numValue) && numValue >= 0) {
        setTiempoEstimadoMax(numValue);
      }
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
                value={globalDiscount === 0 ? '' : globalDiscount}
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
                  value={localShippingCostStr}
                  onChange={handleShippingCostInputChange}
                  onBlur={handleShippingCostInputBlur}
                  className="h-8 pl-6 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="0"
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
                value={tiempoEstimado === 0 ? '' : tiempoEstimado}
                onChange={handleTiempoEstimadoChange}
                className="h-8 w-16 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="Min"
              />
              <span className="text-muted-foreground">a</span>
              <Input
                type="number"
                min="0"
                step="1"
                value={tiempoEstimadoMaxStr}
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