"use client";

import { useState, useEffect } from 'react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DollarSign, Truck, Receipt, Percent, User, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveTable } from '../ui/responsive-table';

interface Cliente {
  nombre: string;
  celular: string;
  correo?: string | null;
  atencion?: string | null;
  [key: string]: any;
}

interface ResumenCotizacionProps {
  cliente: Cliente | null;
  productos: any[];
  subtotal: number;
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
  productos,
  subtotal,
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
  // State for the form - using string values for inputs
  const [globalDiscountStr, setGlobalDiscountStr] = useState<string>('0');
  const [hasShipping, setHasShipping] = useState<boolean>(false);
  const [shippingCostStr, setShippingCostStr] = useState<string>('0');

  // Initialize form values from props
  useEffect(() => {
    setGlobalDiscountStr(globalDiscount.toString());
    setHasShipping(shippingCost > 0);
    setShippingCostStr(shippingCost.toString());
  }, [globalDiscount, shippingCost]);

  // Format currency based on selected currency
  const formatCurrency = (amount: number): string => {
    if (isNaN(amount) || amount === null || amount === undefined) {
        return "---"; // Or indicate error/loading state
    }
    
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: moneda,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };
  
  // Format number with commas for better readability
  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  
  // Format percentage value
  const formatPercent = (value: number): string => {
    return new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value) + '%';
  };

  // Handle global discount change
  const handleGlobalDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log(`ResumenCotizacion: handleGlobalDiscountChange called with value: ${value}`);
    
    // Allow empty string or valid numbers
    if (value === '' || !isNaN(parseFloat(value))) {
      setGlobalDiscountStr(value);
      
      // Convert to number for the callback
      const numValue = value === '' ? 0 : parseFloat(value);
      const boundedValue = Math.min(Math.max(numValue, 0), 100);
      
      console.log(`ResumenCotizacion: Calling setGlobalDiscount with: ${boundedValue}`);
      setGlobalDiscount(boundedValue);
    }
  };

  // Handle IVA toggle
  const handleIvaToggle = (checked: boolean) => {
    setHasIva(checked);
  };

  // Handle shipping toggle
  const handleShippingToggle = (checked: boolean) => {
    setHasShipping(checked);
    if (!checked) {
      setShippingCostStr('0');
      setShippingCost(0);
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
      
      // Store shipping cost in the selected currency
      // This ensures the value is interpreted correctly in the products context
      setShippingCost(boundedValue);
    }
  };

  // Handle tiempo estimado change
  const handleTiempoEstimadoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Parse directly from input value
    const numValue = value === '' ? 0 : parseInt(value);
    
    // Ignore non-numeric input
    if (isNaN(numValue)) return;

    // Ensure min >= 1
    const newMinValue = Math.max(numValue, 1);
    
    // Update parent component state if callback is provided
    if (setTiempoEstimado) {
      setTiempoEstimado(newMinValue);
    }
    
    // Ensure max value is not less than new min value
    // Use the current max prop directly for comparison
    if (newMinValue > tiempoEstimadoMax && setTiempoEstimadoMax) {
      // Update parent's max state if needed
      setTiempoEstimadoMax(newMinValue);
    }
  };
  
  // Handle tiempo estimado max change
  const handleTiempoEstimadoMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Parse directly from input value
    const numValue = value === '' ? 0 : parseInt(value);
    
    // Ignore non-numeric input
    if (isNaN(numValue)) return;

    // Ensure max >= current min prop
    const newMaxValue = Math.max(numValue, tiempoEstimado);
    
    // Update parent component state if callback is provided
    if (setTiempoEstimadoMax) {
      setTiempoEstimadoMax(newMaxValue);
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
    <div className="space-y-6">
      {/* Client Info */}
      {cliente && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center mb-3">
            <User className="h-5 w-5 text-emerald-600 mr-2" />
            <h3 className="font-medium text-gray-700">Información del Cliente</h3>
          </div>
          <ul className="space-y-2 text-sm">
            <li className="flex flex-col sm:flex-row sm:items-center">
              <span className="text-gray-500 w-20 mb-1 sm:mb-0">Nombre:</span>
              <span className="font-medium text-gray-900">{cliente?.nombre}</span>
            </li>
            <li className="flex flex-col sm:flex-row sm:items-center">
              <span className="text-gray-500 w-20 mb-1 sm:mb-0">Teléfono:</span>
              <span className="font-medium text-gray-900">{cliente?.celular}</span>
            </li>
            {cliente?.correo && (
              <li className="flex flex-col sm:flex-row sm:items-center">
                <span className="text-gray-500 w-20 mb-1 sm:mb-0">Correo:</span>
                <span className="font-medium text-gray-900">{cliente?.correo}</span>
              </li>
            )}
            {cliente?.atencion && (
              <li className="flex flex-col sm:flex-row sm:items-center">
                <span className="text-gray-500 w-20 mb-1 sm:mb-0">Atención:</span>
                <span className="font-medium text-gray-900">{cliente?.atencion}</span>
              </li>
            )}
          </ul>
        </div>
      )}
      
      {/* Products with individual discounts */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center">
            <Receipt className="h-5 w-5 text-emerald-600 mr-2" />
            <h3 className="font-medium text-gray-700">Productos</h3>
          </div>
          <div className="flex items-center">
            <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
            <span className="text-sm text-gray-500">Moneda: {moneda}</span>
          </div>
        </div>
        
        <ResponsiveTable>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Producto</th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Cant.</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Precio</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Descuento</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Subtotal</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {productos.map((producto) => (
                <tr key={producto.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900 max-w-[150px] sm:max-w-none">
                    <div className="truncate">{producto.nombre}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-center whitespace-nowrap">
                    {producto.cantidad}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-right whitespace-nowrap">
                    <span className="whitespace-nowrap">{formatCurrency(producto.precio)}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-right whitespace-nowrap">
                    {producto.descuento > 0 ? formatPercent(producto.descuento) : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right whitespace-nowrap">
                    <span className="whitespace-nowrap">{formatCurrency(producto.subtotal)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResponsiveTable>
      </div>
      
      {/* Summary calculations */}
      <div className="bg-gray-50 rounded-lg p-4 md:p-6 space-y-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-medium text-gray-700">Resumen</h3>
        </div>

        {/* Subtotal */}
        <div className="flex items-center justify-between py-2">
          <span className="text-sm font-medium text-gray-600">Subtotal:</span>
          <span className="font-medium">{formatCurrency(subtotal)}</span>
        </div>
        
        {/* Global Discount */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center space-x-2">
            <Percent className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-600">Descuento global:</span>
          </div>
          <div className="flex items-center space-x-1">
            <Input
              type="text"
              inputMode="numeric"
              value={globalDiscountStr}
              onChange={handleGlobalDiscountChange}
              className="w-16 text-right p-1 h-8 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
              placeholder="0"
            />
            <span className="text-gray-500">%</span>
          </div>
        </div>
        
        {/* Discount Amount */}
        {globalDiscount > 0 && (
          <div className="flex items-center justify-between pl-6 py-2">
            <span className="text-sm text-gray-600">Monto de descuento:</span>
            <span className="text-red-600 font-medium">-{formatCurrency(subtotal * (globalDiscount / 100))}</span>
          </div>
        )}
        
        {/* Subtotal after discount */}
        {globalDiscount > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 pt-3 pb-2">
            <span className="text-sm font-medium text-gray-600">Subtotal con descuento:</span>
            <span className="font-medium">{formatCurrency(subtotal * (1 - globalDiscount / 100))}</span>
          </div>
        )}
        
        {/* IVA Toggle */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center space-x-2">
            <Receipt className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-600">Incluir IVA (16%):</span>
          </div>
          <Switch 
            checked={hasIva} 
            onCheckedChange={handleIvaToggle}
            className="data-[state=checked]:bg-emerald-500"
          />
        </div>
        
        {/* IVA Amount */}
        {hasIva && (
          <div className="flex items-center justify-between pl-6 py-2">
            <span className="text-sm text-gray-600">Monto IVA (16%):</span>
            <span className="font-medium">{formatCurrency(subtotal * (1 - globalDiscount / 100) * 0.16)}</span>
          </div>
        )}
        
        {/* Shipping Toggle & Cost */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center space-x-2">
            <Truck className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-600">Incluir envío:</span>
          </div>
          <Switch 
            checked={hasShipping} 
            onCheckedChange={handleShippingToggle}
            className="data-[state=checked]:bg-emerald-500"
          />
        </div>
        
        {hasShipping && (
          <div className="flex items-center justify-between pl-6 py-2">
            <span className="text-sm text-gray-600">Costo de envío:</span>
            <div className="flex items-center space-x-1">
              <span className="text-gray-500">$</span>
              <Input
                type="text"
                inputMode="decimal"
                value={shippingCostStr}
                onChange={handleShippingCostChange}
                className="w-20 text-right p-1 h-8 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                placeholder="0"
              />
              <span className="text-gray-500">{moneda}</span>
            </div>
          </div>
        )}
        
        {/* Tiempo de Entrega */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-600">Tiempo de entrega:</span>
          </div>
          <div className="flex items-center space-x-1">
            <Input
              type="text"
              inputMode="numeric"
              value={tiempoEstimado}
              onChange={handleTiempoEstimadoChange}
              className="w-16 text-right p-1 h-8 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
              placeholder="6"
            />
            <span className="text-gray-500">a</span>
            <Input
              type="text"
              inputMode="numeric"
              value={tiempoEstimadoMax}
              onChange={handleTiempoEstimadoMaxChange}
              className="w-16 text-right p-1 h-8 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
              placeholder="8"
            />
            <span className="text-gray-500">semanas</span>
          </div>
        </div>
        
        {/* Total */}
        <div className="flex items-center justify-between border-t border-gray-200 pt-4 mt-4">
          <span className="font-medium text-gray-700">Total:</span>
          <span className="font-bold text-lg text-emerald-600">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}

export default ResumenCotizacion; 