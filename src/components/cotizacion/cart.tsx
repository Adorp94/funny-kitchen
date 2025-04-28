"use client";

import { Trash2, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { CurrencySwitcher } from '@/components/cotizacion/currency-switcher';
import { ResponsiveTable } from '@/components/ui/responsive-table';

interface CartItem {
  id: number;
  producto_id: number;
  nombre: string | null;
  colores: string;
  cantidad: number;
  precio_final: number;
  descuento: number;
  descripcion?: string | null;
  acabado?: string | null;
}

interface CartProps {
  items: CartItem[];
  onRemoveItem: (id: number) => void;
  onUpdateQuantity: (id: number, quantity: number) => void;
  onUpdateDiscount: (id: number, discount: number) => void;
  currency: 'MXN' | 'USD';
  exchangeRate: number;
}

export function Cart({
  items,
  onRemoveItem,
  onUpdateQuantity,
  onUpdateDiscount,
  currency,
  exchangeRate
}: CartProps) {
  const getDisplayPrice = (price: number) => {
    return currency === "USD" ? price / exchangeRate : price;
  };

  const calculateSubtotal = (item: CartItem) => {
    return item.cantidad * item.precio_final * (1 - item.descuento);
  };
  
  const totalItems = items.length;
  const totalAmount = items.reduce((sum, item) => sum + calculateSubtotal(item), 0);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-500 bg-white rounded-lg border border-gray-200 shadow-xs p-4">
        <ShoppingCart className="h-12 w-12 text-gray-300 mb-2" />
        <p className="text-sm">No hay productos agregados</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center">
          <ShoppingCart className="h-4 w-4 mr-2" />
          Productos ({totalItems})
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            Total: {formatCurrency(getDisplayPrice(totalAmount), currency)}
          </span>
          <CurrencySwitcher />
        </div>
      </div>
      
      <div className="max-h-[400px] overflow-y-auto">
        <ResponsiveTable>
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10">
              <TableRow>
                <TableHead className="w-[40%] whitespace-nowrap">Producto</TableHead>
                <TableHead className="text-center whitespace-nowrap">Cant.</TableHead>
                <TableHead className="text-right whitespace-nowrap">Precio</TableHead>
                <TableHead className="text-right whitespace-nowrap">Desc.</TableHead>
                <TableHead className="text-right whitespace-nowrap">Subtotal</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="group">
                  <TableCell className="align-top">
                    <div className="font-medium text-sm">{item.nombre}</div>
                    {item.colores && (
                      <div className="text-xs text-gray-500">Colores: {item.colores}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap">
                    <div className="flex items-center justify-center">
                      <button
                        className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center"
                        onClick={() => onUpdateQuantity(item.id, Math.max(1, item.cantidad - 1))}
                      >
                        -
                      </button>
                      <span className="mx-2 text-sm min-w-[20px] text-center">{item.cantidad}</span>
                      <button
                        className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center"
                        onClick={() => onUpdateQuantity(item.id, item.cantidad + 1)}
                      >
                        +
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm whitespace-nowrap">
                    {formatCurrency(getDisplayPrice(item.precio_final), currency)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="w-12 text-right bg-transparent border-b border-gray-300 focus:border-primary focus:outline-hidden text-sm p-1"
                      value={item.descuento * 100}
                      onChange={(e) => onUpdateDiscount(item.id, Number(e.target.value) / 100)}
                    />
                    <span className="text-xs">%</span>
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold whitespace-nowrap">
                    {formatCurrency(getDisplayPrice(calculateSubtotal(item)), currency)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => onRemoveItem(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ResponsiveTable>
      </div>
    </div>
  );
} 