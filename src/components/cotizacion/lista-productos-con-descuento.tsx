"use client";

import { useState, useEffect } from 'react';
import { Trash2, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Producto } from './producto-simplificado';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow, 
  TableFooter
} from "@/components/ui/table";
import { formatCurrency } from '@/lib/utils';

// Extended product interface with discount
export interface ProductoConDescuento extends Producto {
  descuento?: number; // Discount percentage for this specific product
  cotizacion_producto_id?: number | null;
  // Add MXN properties for API compatibility
  precioMXN?: number;
  subtotalMXN?: number;
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
  // Explicitly log currency and exchange rate
  useEffect(() => {
    console.log('Current currency in ListaProductos:', moneda);
  }, [moneda]);

  // Format percentage
  const formatPercent = (value: number): string => {
    return new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value) + '%';
  };

  // Calculate price after discount for a product
  const getPriceAfterDiscount = (producto: ProductoConDescuento): number => {
    const discount = producto.descuento || 0;
    const originalPrice = producto.precio || 0; // Added default value
    const discountedPrice = originalPrice * (1 - discount / 100);
    return discountedPrice;
  };

  // Calculate subtotal after discount for a product
  const getSubtotalAfterDiscount = (producto: ProductoConDescuento): number => {
    const priceAfterDiscount = getPriceAfterDiscount(producto);
    const quantity = producto.cantidad || 0; // Added default value
    return priceAfterDiscount * quantity;
  };

  // Calculate total after individual discounts
  const totalAfterDiscounts = productos.reduce(
    (sum, producto) => sum + getSubtotalAfterDiscount(producto), 
    0
  );

  // Handle discount change
  const handleDiscountChange = (id: string, value: string) => {
    if (value === '' || !isNaN(parseFloat(value))) {
      const numValue = value === '' ? 0 : parseFloat(value);
      const validDiscount = Math.min(Math.max(numValue, 0), 100);
      onUpdateProductDiscount(id, validDiscount);
    }
  };

  // Render the discount input for a product
  const renderDiscountInput = (producto: ProductoConDescuento) => {
    const displayValue = producto.descuento === 0 ? '' : producto.descuento?.toString();
    return (
      <div className="relative w-20 mx-auto">
        <Input
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={(e) => handleDiscountChange(producto.id, e.target.value)}
          className="w-full h-8 pr-5 text-right text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          placeholder="0"
        />
        <Percent className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
      </div>
    );
  };

  if (productos.length === 0) {
    return (
      <div className="text-center py-10 border border-dashed rounded-lg">
        <p className="text-muted-foreground">No hay productos agregados.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead className="text-center w-[80px]">Cant.</TableHead>
            <TableHead className="text-right w-[120px]">Precio Unit.</TableHead>
            {editMode && (
              <TableHead className="text-center w-[100px]">Descuento</TableHead>
            )}
            <TableHead className="text-right w-[120px]">Subtotal</TableHead>
            {editMode && (
              <TableHead className="text-center w-[80px]">Acción</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {productos.map((producto) => (
            <TableRow key={producto.id}>
              <TableCell className="font-medium">{producto.nombre}</TableCell>
              <TableCell className="text-center">{producto.cantidad}</TableCell>
              <TableCell className="text-right">
                {formatCurrency(producto.precio || 0, moneda)}
              </TableCell>
              {editMode && (
                <TableCell className="text-center">
                  {renderDiscountInput(producto)}
                </TableCell>
              )}
              <TableCell className="text-right font-medium">
                {formatCurrency(getSubtotalAfterDiscount(producto), moneda)}
                {producto.descuento && producto.descuento > 0 && editMode ? (
                  <div className="text-xs text-green-600">
                    (-{formatPercent(producto.descuento)})
                  </div>
                ) : null}
              </TableCell>
              {editMode && (
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveProduct(producto.id)}
                    className="text-destructive hover:text-destructive h-8 w-8 p-1"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Eliminar</span>
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={editMode ? 4 : 3} className="text-right font-semibold">Total</TableCell>
            <TableCell className="text-right font-bold text-lg">
              {formatCurrency(totalAfterDiscounts, moneda)}
            </TableCell>
            {editMode && <TableCell />}
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

export default ListaProductosConDescuento; 