"use client";

import { useState, useEffect } from 'react';
import { Trash2, Percent } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Producto } from './producto-simplificado';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { ResponsiveTable } from '../ui/responsive-table';

// Extended product interface with discount
export interface ProductoConDescuento extends Producto {
  descuento?: number; // Discount percentage for this specific product
}

interface ListaProductosConDescuentoProps {
  productos: ProductoConDescuento[];
  onRemoveProduct: (id: string) => void;
  onUpdateProductDiscount: (id: string, descuento: number) => void;
  moneda?: 'MXN' | 'USD';
  editMode?: boolean;
}

export function ListaProductosConDescuento({
  productos,
  onRemoveProduct,
  onUpdateProductDiscount,
  moneda = 'MXN',
  editMode = true
}: ListaProductosConDescuentoProps) {
  const { exchangeRate, loading, error, convertMXNtoUSD } = useExchangeRate();

  // Explicitly log currency and exchange rate
  useEffect(() => {
    console.log('Current currency in ListaProductos:', moneda);
    console.log('Exchange rate in ListaProductos:', exchangeRate);
  }, [moneda, exchangeRate]);

  // Convert amount based on selected currency
  const convertAmount = (amount: number): number => {
    if (moneda === 'USD' && exchangeRate) {
      return convertMXNtoUSD(amount);
    }
    return amount;
  };

  // Format currency based on selected currency
  const formatCurrency = (amount: number): string => {
    const convertedAmount = convertAmount(amount);
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: moneda,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(convertedAmount);
  };

  // Calculate price after discount for a product
  const getPriceAfterDiscount = (producto: ProductoConDescuento): number => {
    const discount = producto.descuento || 0;
    const originalPrice = producto.precio;
    const discountedPrice = originalPrice * (1 - discount / 100);
    return discountedPrice;
  };

  // Calculate subtotal after discount for a product
  const getSubtotalAfterDiscount = (producto: ProductoConDescuento): number => {
    const priceAfterDiscount = getPriceAfterDiscount(producto);
    return priceAfterDiscount * producto.cantidad;
  };

  // Calculate total after individual discounts
  const totalAfterDiscounts = productos.reduce(
    (sum, producto) => sum + getSubtotalAfterDiscount(producto), 
    0
  );

  // Handle discount change
  const handleDiscountChange = (id: string, value: string) => {
    // Allow empty string or valid number
    if (value === '' || !isNaN(parseFloat(value))) {
      // Convert to number for the callback but allow empty input
      const numValue = value === '' ? 0 : parseFloat(value);
      // Ensure discount is between 0 and 100
      const validDiscount = Math.min(Math.max(numValue, 0), 100);
      
      onUpdateProductDiscount(id, validDiscount);
    }
  };

  // Render the discount input for a product
  const renderDiscountInput = (producto: ProductoConDescuento) => {
    // Display empty string if discount is 0, otherwise show the value
    const displayValue = producto.descuento === 0 ? '' : producto.descuento?.toString();
    
    return (
      <div className="flex items-center justify-center">
        <Input
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={(e) => handleDiscountChange(producto.id, e.target.value)}
          className="w-16 text-right p-1 h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          placeholder="0"
        />
        <span className="ml-1 text-gray-500">%</span>
      </div>
    );
  };

  if (productos.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
        <p className="text-gray-500">No hay productos agregados.</p>
        <p className="text-sm text-gray-400 mt-1">Agrega productos utilizando el formulario.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ResponsiveTable>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Cant.</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Precio</th>
              {editMode && (
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Descuento</th>
              )}
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Subtotal</th>
              {editMode && (
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Acciones</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {productos.map((producto) => (
              <tr key={producto.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">
                  {producto.nombre}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 text-center whitespace-nowrap">
                  {producto.cantidad}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 text-right whitespace-nowrap">
                  {formatCurrency(producto.precio)}
                </td>
                {editMode && (
                  <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                    {renderDiscountInput(producto)}
                  </td>
                )}
                <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right whitespace-nowrap">
                  {formatCurrency(getSubtotalAfterDiscount(producto))}
                  {producto.descuento ? (
                    <div className="text-xs text-green-600">
                      Descuento: {producto.descuento}%
                    </div>
                  ) : null}
                </td>
                {editMode && (
                  <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm" 
                      onClick={() => onRemoveProduct(producto.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 h-auto"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Eliminar</span>
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td colSpan={editMode ? 4 : 3} className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                Total:
              </td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                {formatCurrency(totalAfterDiscounts)}
              </td>
              {editMode && <td></td>}
            </tr>
          </tfoot>
        </table>
      </ResponsiveTable>
    </div>
  );
}

export default ListaProductosConDescuento; 