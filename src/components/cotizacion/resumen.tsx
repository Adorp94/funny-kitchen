"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils/currency";
import { Loader2 } from "lucide-react";

interface ResumenProps {
  subtotal: number;
  onDescuentoChange: (value: number) => void;
  onCurrencyChange: (currency: "MXN" | "USD") => void;
  onIvaChange: (hasIva: boolean) => void;
  onShippingChange: (hasShipping: boolean, amount?: number) => void;
  onEstimatedTimeChange: (weeks: number) => void;
  onGenerateCotizacion: () => Promise<void>;
  exchangeRate: number;
  isFormValid: boolean;
}

export function Resumen({ 
  subtotal,
  onDescuentoChange,
  onCurrencyChange,
  onIvaChange,
  onShippingChange,
  onEstimatedTimeChange,
  onGenerateCotizacion,
  exchangeRate,
  isFormValid
}: ResumenProps) {
  const [currency, setCurrency] = useState<"MXN" | "USD">("MXN");
  const [descuento, setDescuento] = useState(0);
  const [hasIva, setHasIva] = useState(true);
  const [hasShipping, setHasShipping] = useState(false);
  const [shippingAmount, setShippingAmount] = useState<number>(100);
  const [estimatedTime, setEstimatedTime] = useState(6);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate values for display
  const subtotalConverted = currency === "USD" ? subtotal / exchangeRate : subtotal;
  const descuentoAmount = (subtotalConverted * (descuento / 100));
  const subtotalWithDiscount = subtotalConverted - descuentoAmount;
  const ivaAmount = hasIva ? subtotalWithDiscount * 0.16 : 0;
  const shippingConverted = hasShipping ? (currency === "USD" ? shippingAmount / exchangeRate : shippingAmount) : 0;
  const total = subtotalWithDiscount + ivaAmount + shippingConverted;

  // Handle currency change
  const handleCurrencyChange = (value: string) => {
    const newCurrency = value as "MXN" | "USD";
    setCurrency(newCurrency);
    onCurrencyChange(newCurrency);
  };

  // Handle discount change
  const handleDescuentoChange = (value: string) => {
    const newValue = parseFloat(value) || 0;
    setDescuento(newValue);
    onDescuentoChange(newValue);
  };

  // Handle IVA change
  const handleIvaChange = (value: string) => {
    const newHasIva = value === "Sí";
    setHasIva(newHasIva);
    onIvaChange(newHasIva);
  };

  // Handle shipping change
  const handleShippingToggle = (checked: boolean) => {
    setHasShipping(checked);
    onShippingChange(checked, shippingAmount);
  };

  // Handle shipping amount change
  const handleShippingAmountChange = (value: string) => {
    const newAmount = parseFloat(value) || 0;
    setShippingAmount(newAmount);
    onShippingChange(hasShipping, newAmount);
  };

  // Handle estimated time change
  const handleEstimatedTimeChange = (value: string) => {
    const weeks = parseInt(value) || 0;
    setEstimatedTime(weeks);
    onEstimatedTimeChange(weeks);
  };

  // Handle generate cotizacion
  const handleGenerateCotizacion = async () => {
    setIsSubmitting(true);
    try {
      await onGenerateCotizacion();
    } catch (error) {
      console.error("Error generating quotation:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Descuento sobre la orden</h3>
        <div className="flex items-center space-x-2">
          <Input
            type="number"
            className="w-32 text-right"
            placeholder="Aplicar descuento"
            value={descuento}
            onChange={(e) => handleDescuentoChange(e.target.value)}
            min={0}
            max={100}
          />
          <span className="text-gray-500">%</span>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Envío</h3>
        <div className="flex items-center space-x-2">
          <Switch
            checked={hasShipping}
            onCheckedChange={handleShippingToggle}
            id="shipping-toggle"
          />
          <Label htmlFor="shipping-toggle">¿Se cobrará envío?</Label>
        </div>
      </div>

      {hasShipping && (
        <div className="flex justify-end items-center space-x-2">
          <div className="flex">
            <span className="inline-flex items-center px-3 text-sm border border-r-0 border-gray-300 bg-gray-50 text-gray-500 rounded-l-md">
              {currency === "MXN" ? "MXN" : "USD"}
            </span>
            <Input
              type="number"
              className="w-32 rounded-l-none"
              value={shippingAmount}
              onChange={(e) => handleShippingAmountChange(e.target.value)}
              min={0}
              step="0.01"
            />
          </div>
        </div>
      )}

      <div className="border-t border-gray-200 pt-4">
        <div className="flex justify-between py-2">
          <span className="text-gray-500">Subtotal</span>
          <span className="font-medium">{formatCurrency(subtotalConverted, currency)}</span>
        </div>
        <div className="flex justify-between py-2">
          <span className="text-gray-500">Descuento</span>
          <span className="font-medium">{`-${formatCurrency(descuentoAmount, currency)}`}</span>
        </div>
        {hasIva && (
          <div className="flex justify-between py-2">
            <span className="text-gray-500">IVA (16%)</span>
            <span className="font-medium">{formatCurrency(ivaAmount, currency)}</span>
          </div>
        )}
        {hasShipping && (
          <div className="flex justify-between py-2">
            <span className="text-gray-500">Envío</span>
            <span className="font-medium">{formatCurrency(shippingConverted, currency)}</span>
          </div>
        )}
        <div className="flex justify-between py-2 font-bold">
          <span>Total {hasIva ? '+ IVA' : 'sin IVA'}</span>
          <span>{formatCurrency(total, currency)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-200">
        <div>
          <Label htmlFor="iva">¿Tiene IVA? <span className="text-red-500">*</span></Label>
          <Select 
            value={hasIva ? "Sí" : "No"} 
            onValueChange={handleIvaChange}
          >
            <SelectTrigger id="iva">
              <SelectValue placeholder="Sí/No" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Sí">Sí</SelectItem>
              <SelectItem value="No">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tipo de cuenta</Label>
          <Input
            value={hasIva ? "Fiscal" : "No fiscal"}
            readOnly
            disabled
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <Label>Tipo de cambio + $1.5</Label>
          <div className="flex">
            <span className="inline-flex items-center px-3 text-sm border border-r-0 border-gray-300 bg-gray-50 text-gray-500 rounded-l-md">
              $
            </span>
            <Input 
              value={exchangeRate.toFixed(3)} 
              readOnly 
              disabled 
              className="rounded-l-none"
            />
          </div>
          <span className="text-sm text-gray-500 mt-1 block">
            Al día de {new Date().toLocaleDateString('es-MX')}
          </span>
        </div>
        <div>
          <div className="space-y-2">
            <Label>Moneda</Label>
            <div className="flex items-center space-x-4 mt-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="currency-mxn"
                  name="currency"
                  value="MXN"
                  checked={currency === "MXN"}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                />
                <Label htmlFor="currency-mxn" className="cursor-pointer">Pesos</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="currency-usd"
                  name="currency"
                  value="USD"
                  checked={currency === "USD"}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                />
                <Label htmlFor="currency-usd" className="cursor-pointer">Dólares</Label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <Label htmlFor="estimated-time">Tiempo estimado <span className="text-red-500">*</span></Label>
        <div className="flex items-center space-x-2">
          <Input 
            id="estimated-time" 
            type="number" 
            value={estimatedTime} 
            onChange={(e) => handleEstimatedTimeChange(e.target.value)}
            min={1}
            className="w-full" 
            required
          />
          <span className="text-gray-500 whitespace-nowrap">semanas</span>
        </div>
      </div>

      <div className="pt-4">
        <Button
          className="w-full"
          size="lg"
          onClick={handleGenerateCotizacion}
          disabled={!isFormValid || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generando...
            </>
          ) : (
            "Generar cotización"
          )}
        </Button>
      </div>
    </div>
  );
}