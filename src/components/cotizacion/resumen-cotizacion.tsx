"use client";

import { useState, useEffect } from 'react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DollarSign, Truck, Receipt, Percent, User, Clock, Loader2, AlertTriangle, PackagePlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Cliente {
  nombre: string;
  celular: string;
  correo?: string | null;
  atencion?: string | null;
  [key: string]: any;
}

// Define ETAResult interface (can be moved to a types file if shared)
interface ETAResult {
  dias_espera_moldes: number;
  dias_vaciado: number;
  dias_post_vaciado: number;
  dias_envio: number;
  dias_totales: number;
  semanas_min: number;
  semanas_max: number;
  fecha_inicio_vaciado: string | null;
  fecha_fin_vaciado: string | null;
  fecha_entrega_estimada: string | null;
}

interface ResumenCotizacionProps {
  cliente: Cliente | null;
  productos: any[];
  subtotal: number;
  ivaAmount: number;
  globalDiscount: number;
  setGlobalDiscount: (value: number) => void;
  hasIva: boolean;
  setHasIva: (hasIva: boolean) => void;
  shippingCost: number;
  setShippingCost: (value: number) => void;
  total: number;
  moneda: 'MXN' | 'USD' | 'EUR';
  tiempoEstimado?: string;
  setTiempoEstimado?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  tiempoEstimadoMax?: string;
  setTiempoEstimadoMax?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  etaResult?: ETAResult | null;
  etaLoading?: boolean;
  etaError?: string | null;
}

// Define a simple interface for Producto within ResumenCotizacion
interface ProductoResumen {
  id: string | number;
  nombre: string;
  cantidad: number;
  precioMXN?: number;      // Unit price in MXN, assuming this is what context provides as 'precio' or 'precioMXN'
  descuento?: number;     // Discount percentage
  subtotalMXN?: number;   // Line item subtotal in MXN, assuming this is 'subtotal' or 'subtotalMXN' from context
}

export function ResumenCotizacion({
  cliente,
  productos,
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
  tiempoEstimado = "6",
  setTiempoEstimado,
  tiempoEstimadoMax = "8",
  setTiempoEstimadoMax,
  etaResult,
  etaLoading,
  etaError
}: ResumenCotizacionProps) {
  const [hasShipping, setHasShipping] = useState<boolean>(shippingCost > 0);

  const handleGlobalDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
     // Allow numbers, one decimal point, prevent minus sign, max 100
     if (/^(?:100(?:\.0*)?|\d{1,2}(?:\.\d*)?)$/.test(value) && !value.startsWith('-')) {
        setGlobalDiscount(parseFloat(value));
     } else if (value === '') {
        setGlobalDiscount(0);
     }
  };

  const handleGlobalDiscountBlur = () => {
     let numValue = globalDiscount;

     if (isNaN(numValue) || numValue < 0) {
       numValue = 0;
     } else if (numValue > 100) {
       numValue = 100;
     }

     // Update context only if the numeric value is different
     if (numValue !== globalDiscount) {
       console.log(`[Resumen Blur] Updating context globalDiscount from ${globalDiscount} to ${numValue}`);
       setGlobalDiscount(numValue);
     }
  };

  const handleIvaToggle = (checked: boolean) => setHasIva(checked);
  
  const handleShippingToggle = (checked: boolean) => {
    console.log(`[Resumen Toggle] handleShippingToggle called with: ${checked}`);
    setHasShipping(checked);
    if (!checked) {
      console.log("[Resumen Toggle] Shipping turned off, setting context cost to 0.");
      setShippingCost(0);
    } else {
      // If turning on, maybe default to a value or just let user input?
      // For now, do nothing, user needs to input a value > 0.
    }
  };

  const handleShippingCostInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
     // Basic filtering: Allow numbers, one decimal point, prevent minus sign
     if (/^[0-9]*\.?\d*$/.test(value) && !value.startsWith('-')) {
        setShippingCost(parseFloat(value));
     }
  };

  const handleShippingCostInputBlur = () => {
    let numValue = shippingCost;
    
    if (isNaN(numValue) || numValue < 0) {
      numValue = 0; // Default to 0 if invalid
    }

    // Update context only if the numeric value is different
    if (numValue !== shippingCost) {
      console.log(`[Resumen Blur] Updating context shippingCost from ${shippingCost} to ${numValue}`);
      setShippingCost(numValue);
    }
  };

  // Helper function to calculate manual delivery date
  const getManualDeliveryDate = (maxWeeksStr: string | undefined): string | null => {
    if (maxWeeksStr) {
      const maxWeeks = parseInt(maxWeeksStr, 10);
      // Ensure maxWeeks is a non-negative number for a meaningful date
      if (!isNaN(maxWeeks) && maxWeeks >= 0) { 
        const currentDate = new Date();
        // Create a new date object to avoid modifying the original 'currentDate'
        const deliveryDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + maxWeeks * 7);
        return deliveryDate.toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
    }
    return null;
  };

  const manualDate = getManualDeliveryDate(tiempoEstimadoMax);

  return (
    <div className="space-y-6">
      {/* Card 1: Client Info */}
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

      {/* Card 2: Products Summary - NEW CARD */}
      {productos && productos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PackagePlus className="h-5 w-5 text-primary" />
              Productos en la Cotización
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {/* Header Row for Product Table */}
            <div className="flex items-center py-2 text-xs font-semibold text-muted-foreground border-b mb-2">
              <span className="flex-1 min-w-0 pr-2">Producto</span>
              <span className="w-12 text-center mx-1">Cant.</span>
              <span className="w-20 text-right mx-1">P. Unit.</span>
              <span className="w-14 text-center mx-1">Desc.</span>
              <span className="w-24 text-right ml-1">Subtotal</span>
            </div>
            <ul className="list-none pl-0 space-y-1">
              {(productos as ProductoResumen[]).map((producto) => (
                <li key={producto.id} className="flex items-center py-1.5 border-b last:border-b-0 text-xs">
                  <span className="flex-1 min-w-0 truncate pr-2" title={producto.nombre}>{producto.nombre}</span>
                  <span className="w-12 text-center mx-1">{producto.cantidad}</span>
                  {typeof producto.precioMXN === 'number' ? (
                    <span className="w-20 text-right mx-1">{formatCurrency(producto.precioMXN, moneda)}</span>
                  ) : (
                    <span className="w-20 text-right mx-1">-</span>
                  )}
                  <span className="w-14 text-center mx-1">
                    {typeof producto.descuento === 'number' && producto.descuento > 0 ? `${producto.descuento}%` : '-'}
                  </span>
                  {typeof producto.subtotalMXN === 'number' ? (
                    <span className="w-24 text-right ml-1 font-medium">{formatCurrency(producto.subtotalMXN, moneda)}</span>
                  ) : (
                    <span className="w-24 text-right ml-1 font-medium">-</span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      {/* End Card 2: Products Summary */}

      {/* Card 3: Financial Summary & Options Card */}
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
                value={globalDiscount.toString()}
                onChange={handleGlobalDiscountChange}
                onBlur={handleGlobalDiscountBlur}
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

          {/* Subtotal After Discount Display */}
          {globalDiscount > 0 && (
            <div className="flex justify-between items-center py-1">
              <span className="text-sm font-medium text-muted-foreground">Subtotal Después de Descuento</span>
              <span className="text-sm font-medium">{formatCurrency(subtotal * (1 - globalDiscount / 100), moneda)}</span>
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
                  value={shippingCost.toString()}
                  onChange={handleShippingCostInputChange}
                  onBlur={handleShippingCostInputBlur}
                  className="h-8 pl-6 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="0"
                />
              </div>
            </div>
          )}

          <Separator />
          
          {/* Tiempo Entrega */}
          <div className="py-3">
            <div className="flex items-center justify-between mb-2">
                <Label className="text-sm flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Tiempo Entrega (Semanas)
                </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                value={tiempoEstimado}
                onChange={setTiempoEstimado}
                placeholder="Min"
                className="h-8 w-20 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                min={0}
              />
              <span className="text-muted-foreground">a</span>
              <Input
                type="number"
                value={tiempoEstimadoMax}
                onChange={setTiempoEstimadoMax}
                placeholder="Máx"
                className="h-8 w-20 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                min={0}
              />
            </div>
            {/* Display ETA Date Legend Below Inputs - Updated Logic */}
            {manualDate ? (
                <p className="text-xs text-muted-foreground mt-2">
                    Fecha estimada de entrega: {manualDate}
                </p>
            ) : etaLoading ? (
                <div className="flex items-center text-muted-foreground text-sm mt-2">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Calculando fecha automática...
                </div>
            ) : etaError ? (
                 <div className="text-red-600 flex items-center text-sm mt-2">
                     <AlertTriangle className="mr-2 h-4 w-4 flex-shrink-0" /> <span>Error cálculo automático: {etaError.includes("ID válido") ? "No hay productos para estimar." : etaError.includes("tiempo de producción") ? "No hay productos para estimar." : etaError}</span>
                 </div>
            ) : etaResult && etaResult.fecha_entrega_estimada ? (
                <p className="text-xs text-muted-foreground mt-2">
                    Fecha estimada de entrega (automática): {new Date(etaResult.fecha_entrega_estimada).toLocaleDateString('es-MX', { year:'numeric', month:'long', day:'numeric' })}
                </p>
            ) : etaResult ? (
                 <p className="text-xs text-muted-foreground mt-2">
                    Fecha estimada de entrega (automática): N/D
                </p>
            ) : (
                 <p className="text-xs text-muted-foreground mt-2">
                    Fecha estimada de entrega: Ingrese semanas o agregue productos para cálculo automático.
                </p>
            )}
          </div>

          <Separator />

          {/* Final Total */}
          <div className="flex justify-between items-center pt-2">
            <span className="text-base font-semibold">Total</span>
            <span className="text-xl font-bold text-primary">
              {formatCurrency(total, moneda)}
            </span>
          </div>
          
          {/* Currency Explanation */}
          <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md border border-blue-200 dark:border-blue-800 mt-4">
            <p className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 mt-0.5">ℹ️</span>
              <span>
                <strong>Nota:</strong> Los precios se ingresan en MXN (pesos mexicanos). 
                Al seleccionar USD, los valores se convierten automáticamente usando el tipo de cambio actual 
                (Banxico + $1.50 MXN de margen).
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ResumenCotizacion; 