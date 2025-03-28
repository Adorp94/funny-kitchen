"use client";

import { useState } from 'react';
import { Trash2, Percent } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Producto } from './producto-simplificado';

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
  // Format currency based on selected currency
  const formatCurrency = (amount: number): string => {
    return `${moneda === 'MXN' ? 'MX$' : 'US$'}${amount.toFixed(2)}`;
  };

  // Calculate price after discount for a product
  const getPriceAfterDiscount = (producto: ProductoConDescuento): number => {
    const discount = producto.descuento || 0;
    return producto.precio * (1 - discount / 100);
  };

  // Calculate subtotal after discount for a product
  const getSubtotalAfterDiscount = (producto: ProductoConDescuento): number => {
    return getPriceAfterDiscount(producto) * producto.cantidad;
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
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cant.</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Precio</th>
              {editMode && (
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Descuento</th>
              )}
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
              {editMode && (
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {productos.map((producto) => (
              <tr key={producto.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">
                  {producto.nombre}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 text-center">
                  {producto.cantidad}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 text-right">
                  {formatCurrency(producto.precio)}
                </td>
                {editMode && (
                  <td className="px-4 py-3 text-sm text-center">
                    {renderDiscountInput(producto)}
                  </td>
                )}
                <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                  {formatCurrency(getSubtotalAfterDiscount(producto))}
                  {producto.descuento ? (
                    <div className="text-xs text-green-600">
                      Descuento: {producto.descuento}%
                    </div>
                  ) : null}
                </td>
                {editMode && (
                  <td className="px-4 py-3 text-sm text-center">
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
      </div>
    </div>
  );
}

export default ListaProductosConDescuento; 