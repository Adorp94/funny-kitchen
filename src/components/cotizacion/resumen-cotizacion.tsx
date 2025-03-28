"use client";

import { useState } from 'react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DollarSign, Truck, Receipt, Percent } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useExchangeRate } from '@/hooks/useExchangeRate';

interface ResumenCotizacionProps {
  subtotal: number;
  onGlobalDiscountChange: (value: number) => void;
  onIvaChange: (hasIva: boolean) => void;
  onShippingChange: (value: number) => void;
  moneda: 'MXN' | 'USD';
  onCurrencyChange: (currency: 'MXN' | 'USD') => void;
}

export function ResumenCotizacion({
  subtotal,
  onGlobalDiscountChange,
  onIvaChange,
  onShippingChange,
  moneda,
  onCurrencyChange
}: ResumenCotizacionProps) {
  const { 
    exchangeRate, 
    baseRate,
    loading, 
    error, 
    convertMXNtoUSD, 
    convertUSDtoMXN,
    formatExchangeRateInfo,
    lastUpdated
  } = useExchangeRate();

  // State for the form - using string values for inputs
  const [globalDiscountStr, setGlobalDiscountStr] = useState<string>('0');
  const [hasIva, setHasIva] = useState<boolean>(false);
  const [hasShipping, setHasShipping] = useState<boolean>(false);
  const [shippingCostStr, setShippingCostStr] = useState<string>('0');

  // Parse numeric values from strings
  const globalDiscount = parseFloat(globalDiscountStr) || 0;
  const shippingCost = parseFloat(shippingCostStr) || 0;

  // Convert amounts based on selected currency
  const convertAmount = (amount: number): number => {
    if (moneda === 'USD' && exchangeRate) {
      return convertMXNtoUSD(amount);
    }
    return amount;
  };

  // Format currency based on selected currency
  const formatCurrency = (amount: number): string => {
    const convertedAmount = convertAmount(amount);
    return `${moneda === 'MXN' ? '$' : '$'}${convertedAmount.toFixed(2)} ${moneda}`;
  };

  // Calculate discount amount
  const discountAmount = subtotal * (globalDiscount / 100);
  
  // Subtotal after global discount
  const subtotalAfterDiscount = subtotal - discountAmount;
  
  // Calculate IVA amount (16%)
  const ivaAmount = hasIva ? subtotalAfterDiscount * 0.16 : 0;
  
  // Calculate shipping cost (only if shipping is enabled)
  const shippingAmount = hasShipping ? (moneda === 'USD' ? convertUSDtoMXN(shippingCost) : shippingCost) : 0;
  
  // Total amount
  const total = subtotalAfterDiscount + ivaAmount + shippingAmount;

  // Handle currency change
  const handleCurrencyChange = (newCurrency: 'MXN' | 'USD') => {
    if (hasShipping && shippingCost > 0) {
      const newShippingCost = newCurrency === 'USD' 
        ? Number((shippingCost / (exchangeRate || 1)).toFixed(2))
        : Number((shippingCost * (exchangeRate || 1)).toFixed(2));
      setShippingCostStr(newShippingCost.toString());
      onShippingChange(newShippingCost);
    }
    onCurrencyChange(newCurrency);
  };

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
      
      // Convert to MXN if in USD mode
      const mxnValue = moneda === 'USD' ? convertUSDtoMXN(boundedValue) : boundedValue;
      onShippingChange(mxnValue);
    }
  };

  // Helper function to format Banxico date (dd/mm/yyyy)
  const formatBanxicoDate = (dateStr: string): string => {
    try {
      if (!dateStr) return '';
      const parts = dateStr.split('/');
      if (parts.length !== 3) return dateStr;
      
      // Construct date as yyyy-mm-dd for ISO format
      const isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      return new Date(isoDate).toLocaleDateString();
    } catch (e) {
      console.error('Error formatting date:', e);
      return dateStr;
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium text-gray-700">Resumen</h3>
        <div className="flex flex-col items-end space-y-2">
          <div className="flex items-center space-x-2">
            <Select value={moneda} onValueChange={handleCurrencyChange}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Moneda" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200">
                <SelectItem value="MXN">MXN</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {exchangeRate ? (
            <div className="text-xs space-y-1">
              <div className="text-gray-600 font-medium">
                {formatExchangeRateInfo()}
              </div>
              <div className="text-gray-400">
                {lastUpdated && 
                  `Última actualización: ${formatBanxicoDate(lastUpdated)}`
                }
              </div>
            </div>
          ) : loading ? (
            <div className="text-xs text-gray-500">
              Cargando tipo de cambio...
            </div>
          ) : error ? (
            <div className="text-xs text-red-500">
              Error: {error}
            </div>
          ) : null}
        </div>
      </div>
      
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
            <span className="text-gray-500">${''}</span>
            <Input
              type="text"
              inputMode="decimal"
              value={shippingCostStr}
              onChange={handleShippingCostChange}
              className="w-20 text-right p-1 h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="0"
            />
            <span className="text-gray-500">{moneda}</span>
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