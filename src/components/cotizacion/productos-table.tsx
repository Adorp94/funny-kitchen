"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { ResponsiveTable } from "@/components/ui/responsive-table";

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
    <div className="rounded-md border overflow-hidden">
      <ResponsiveTable noBorder>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center whitespace-nowrap">#</TableHead>
              <TableHead className="whitespace-nowrap">Nombre</TableHead>
              <TableHead className="whitespace-nowrap">Colores</TableHead>
              <TableHead className="text-right whitespace-nowrap">Cantidad</TableHead>
              <TableHead className="text-right whitespace-nowrap">Precio</TableHead>
              <TableHead className="text-right whitespace-nowrap">Descuento</TableHead>
              <TableHead className="text-right whitespace-nowrap">Subtotal</TableHead>
              <TableHead className="w-12 whitespace-nowrap"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length > 0 ? (
              products.map((product) => (
                <TableRow key={product.prodsxc_id}>
                  <TableCell className="text-center whitespace-nowrap">{product.item}</TableCell>
                  <TableCell className="max-w-[150px] sm:max-w-none">
                    <div className="truncate">
                      {product.nombre || product.producto}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[120px] sm:max-w-none">
                    <div className="truncate">
                      {product.colores}
                    </div>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">{product.cantidad}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <span className="whitespace-nowrap">
                      {formatCurrency(getDisplayPrice(product.precio_final), currency)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="w-12 sm:w-16 text-right bg-transparent border-b border-gray-300 focus:border-emerald-500 focus:outline-hidden"
                      value={
                        editingDescount?.id === product.prodsxc_id
                          ? editingDescount.value * 100
                          : product.descuento * 100
                      }
                      onChange={(e) => handleDescuentoChange(product.prodsxc_id, e.target.value)}
                      onBlur={handleDescuentoBlur}
                    />
                    <span className="ml-1">%</span>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <span className="whitespace-nowrap">
                      {formatCurrency(calculateSubtotal(product), currency)}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => onDelete(product.prodsxc_id)}
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Eliminar</span>
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
      </ResponsiveTable>
    </div>
  );
}