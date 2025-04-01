"use client";

import { Trash2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/contexts/cart-context";
import { formatCurrency } from "@/lib/utils";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from "@/components/ui/table";
import { ResponsiveTable } from "@/components/ui/responsive-table";

export function CartTable() {
  const { 
    cartItems, 
    removeFromCart, 
    updateQuantity, 
    updateDiscount,
    currency,
    exchangeRate 
  } = useCart();

  if (cartItems.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No hay productos en la cotización</p>
      </div>
    );
  }

  const getDisplayPrice = (price: number) => {
    return currency === "USD" ? price / exchangeRate : price;
  };

  return (
    <ResponsiveTable>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">Producto</TableHead>
            <TableHead className="whitespace-nowrap">Colores</TableHead>
            <TableHead className="text-center whitespace-nowrap">Cantidad</TableHead>
            <TableHead className="text-right whitespace-nowrap">Precio</TableHead>
            <TableHead className="text-center whitespace-nowrap">Desc. %</TableHead>
            <TableHead className="text-right whitespace-nowrap">Subtotal</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cartItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                <div>
                  <p className="font-medium">{item.nombre}</p>
                  <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                </div>
              </TableCell>
              <TableCell className="text-sm">{item.colores || "-"}</TableCell>
              <TableCell className="whitespace-nowrap">
                <div className="flex items-center justify-center">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-r-none"
                    onClick={() => updateQuantity(item.id, Math.max(1, item.cantidad - 1))}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    value={item.cantidad}
                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                    className="h-8 w-14 rounded-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-l-none"
                    onClick={() => updateQuantity(item.id, item.cantidad + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
              <TableCell className="text-right whitespace-nowrap">
                {formatCurrency(getDisplayPrice(item.precio), currency)}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={item.descuento}
                  onChange={(e) => updateDiscount(item.id, parseInt(e.target.value) || 0)}
                  className="h-8 w-16 text-center mx-auto [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </TableCell>
              <TableCell className="text-right font-medium whitespace-nowrap">
                {formatCurrency(getDisplayPrice(item.subtotal), currency)}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500"
                  onClick={() => removeFromCart(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ResponsiveTable>
  );
} 