"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";

interface Product {
  prodsxc_id: number;
  item: number;
  producto_id: number;
  nombre: string | null;
  producto: string | null;
  colores: string;
  cantidad: number;
  precio_final: number;
  descuento: number;
  capacidad?: number;
  unidad?: string;
  descripcion?: string;
  acabado?: string;
}

interface ProductosTableProps {
  products: Product[];
  onDelete: (id: number) => void;
  onDescuentoChange: (id: number, descuento: number) => void;
  currency: "MXN" | "USD";
  exchangeRate: number;
}

export function ProductosTable({
  products,
  onDelete,
  onDescuentoChange,
  currency,
  exchangeRate,
}: ProductosTableProps) {
  const [editingDescount, setEditingDescount] = useState<{ id: number; value: number } | null>(null);

  const handleDescuentoChange = (id: number, value: string) => {
    const numValue = parseFloat(value) / 100;
    setEditingDescount({ id, value: numValue });
  };

  const handleDescuentoBlur = () => {
    if (editingDescount) {
      onDescuentoChange(editingDescount.id, editingDescount.value);
      setEditingDescount(null);
    }
  };

  const getDisplayPrice = (price: number) => {
    return currency === "USD" ? price / exchangeRate : price;
  };

  const calculateSubtotal = (item: Product) => {
    const basePrice = item.cantidad * (item.precio_final - item.precio_final * item.descuento);
    return getDisplayPrice(basePrice);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-center">#</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Colores</TableHead>
            <TableHead className="text-right">Cantidad</TableHead>
            <TableHead className="text-right">Precio</TableHead>
            <TableHead className="text-right">Descuento</TableHead>
            <TableHead className="text-right">Subtotal</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length > 0 ? (
            products.map((product) => (
              <TableRow key={product.prodsxc_id}>
                <TableCell className="text-center">{product.item}</TableCell>
                <TableCell>{product.nombre || product.producto}</TableCell>
                <TableCell>{product.colores}</TableCell>
                <TableCell className="text-right">{product.cantidad}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(getDisplayPrice(product.precio_final), currency)}
                </TableCell>
                <TableCell className="text-right">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="w-16 text-right bg-transparent border-b border-gray-300 focus:border-primary focus:outline-none"
                    value={
                      editingDescount?.id === product.prodsxc_id
                        ? editingDescount.value * 100
                        : product.descuento * 100
                    }
                    onChange={(e) => handleDescuentoChange(product.prodsxc_id, e.target.value)}
                    onBlur={handleDescuentoBlur}
                  />
                  %
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(calculateSubtotal(product), currency)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => onDelete(product.prodsxc_id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-6 text-gray-500">
                Sin registros
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}