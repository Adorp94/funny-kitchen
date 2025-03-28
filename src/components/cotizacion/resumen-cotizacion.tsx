"use client";

import { useState } from 'react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DollarSign, Truck, Receipt, Percent } from 'lucide-react';

interface ResumenCotizacionProps {
  subtotal: number;
  onGlobalDiscountChange: (value: number) => void;
  onIvaChange: (hasIva: boolean) => void;
  onShippingChange: (value: number) => void;
  moneda: 'MXN' | 'USD';
}

export function ResumenCotizacion({
  subtotal,
  onGlobalDiscountChange,
  onIvaChange,
  onShippingChange,
  moneda
}: ResumenCotizacionProps) {
  // State for the form - using string values for inputs
  const [globalDiscountStr, setGlobalDiscountStr] = useState<string>('0');
  const [hasIva, setHasIva] = useState<boolean>(false);
  const [hasShipping, setHasShipping] = useState<boolean>(false);
  const [shippingCostStr, setShippingCostStr] = useState<string>('0');

  // Parse numeric values from strings
  const globalDiscount = parseFloat(globalDiscountStr) || 0;
  const shippingCost = parseFloat(shippingCostStr) || 0;

  // Format currency based on selected currency
  const formatCurrency = (amount: number): string => {
    return `${moneda === 'MXN' ? 'MX$' : 'US$'}${amount.toFixed(2)}`;
  };

  // Calculate discount amount
  const discountAmount = subtotal * (globalDiscount / 100);
  
  // Subtotal after global discount
  const subtotalAfterDiscount = subtotal - discountAmount;
  
  // Calculate IVA amount (16%)
  const ivaAmount = hasIva ? subtotalAfterDiscount * 0.16 : 0;
  
  // Calculate shipping cost (only if shipping is enabled)
  const shippingAmount = hasShipping ? shippingCost : 0;
  
  // Total amount
  const total = subtotalAfterDiscount + ivaAmount + shippingAmount;

  // Handle global discount change
  const handleGlobalDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow empty string or valid numbers
    if (value === '' || !isNaN(parseFloat(value))) {
      setGlobalDiscountStr(value);
      
      // Convert to number for the callback
      const numValue = value === '' ? 0 : parseFloat(value);
      const boundedValue = Math.min(Math.max(numValue, 0), 100);
      onGlobalDiscountChange(boundedValue);
    }
  };

  // Handle IVA toggle
  const handleIvaToggle = (checked: boolean) => {
    setHasIva(checked);
    onIvaChange(checked);
  };

  // Handle shipping toggle
  const handleShippingToggle = (checked: boolean) => {
    setHasShipping(checked);
    if (!checked) {
      setShippingCostStr('0');
      onShippingChange(0);
    }
  };

  // Handle shipping cost change
  const handleShippingCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow empty string or valid numbers
    if (value === '' || !isNaN(parseFloat(value))) {
      setShippingCostStr(value);
      
      // Convert to number for the callback
      const numValue = value === '' ? 0 : parseFloat(value);
      const boundedValue = Math.max(numValue, 0);
      onShippingChange(boundedValue);
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
      <h3 className="font-medium text-gray-700 mb-3">Resumen</h3>
      
      {/* Global Discount */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Percent className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">Descuento global:</span>
        </div>
        <div className="flex items-center space-x-1">
          <Input
            type="text"
            inputMode="numeric"
            value={globalDiscountStr}
            onChange={handleGlobalDiscountChange}
            className="w-16 text-right p-1 h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="0"
          />
          <span className="text-gray-500">%</span>
        </div>
      </div>
      
      {/* IVA Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Receipt className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">Incluir IVA (16%):</span>
        </div>
        <Switch 
          checked={hasIva} 
          onCheckedChange={handleIvaToggle}
        />
      </div>
      
      {/* Shipping Toggle & Cost */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Truck className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">Incluir envío:</span>
        </div>
        <Switch 
          checked={hasShipping} 
          onCheckedChange={handleShippingToggle}
        />
      </div>
      
      {hasShipping && (
        <div className="flex items-center justify-between pl-6">
          <span className="text-sm text-gray-600">Costo de envío:</span>
          <div className="flex items-center space-x-1">
            <span className="text-gray-500">{moneda === 'MXN' ? 'MX$' : 'US$'}</span>
            <Input
              type="text"
              inputMode="decimal"
              value={shippingCostStr}
              onChange={handleShippingCostChange}
              className="w-20 text-right p-1 h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="0"
            />
          </div>
        </div>
      )}
      
      {/* Summary Calculations */}
      <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal:</span>
          <span className="font-medium">{formatCurrency(subtotal)}</span>
        </div>
        
        {globalDiscount > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Descuento ({globalDiscount}%):</span>
            <span className="font-medium text-green-600">-{formatCurrency(discountAmount)}</span>
          </div>
        )}
        
        {hasIva && (
          <div className="flex justify-between">
            <span className="text-gray-600">IVA (16%):</span>
            <span className="font-medium">{formatCurrency(ivaAmount)}</span>
          </div>
        )}
        
        {hasShipping && shippingAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Envío:</span>
            <span className="font-medium">{formatCurrency(shippingAmount)}</span>
          </div>
        )}
        
        <div className="flex justify-between pt-2 border-t border-gray-200">
          <span className="font-bold">Total:</span>
          <span className="font-bold">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}

export default ResumenCotizacion; 