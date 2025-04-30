"use client";

import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

interface ListaProductosProps {
  productos: Producto[];
  onRemoveProduct: (id: string) => void;
  moneda?: 'MXN' | 'USD';
}

export function ListaProductos({
  productos,
  onRemoveProduct,
  moneda = 'MXN'
}: ListaProductosProps) {
  // Calculate total
  const total = productos.reduce((sum, producto) => sum + (producto.subtotal || 0), 0);

  if (productos.length === 0) {
    return (
      <div className="text-center py-10 border border-dashed rounded-lg">
        <p className="text-muted-foreground">No hay productos agregados.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead className="text-center w-[80px]">Cant.</TableHead>
            <TableHead className="text-right w-[120px]">Precio</TableHead>
            <TableHead className="text-right w-[120px]">Subtotal</TableHead>
            <TableHead className="text-center w-[80px]">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productos.map((producto) => (
            <TableRow key={producto.id}>
              <TableCell className="font-medium">{producto.nombre}</TableCell>
              <TableCell className="text-center">{producto.cantidad}</TableCell>
              <TableCell className="text-right">{formatCurrency(producto.precio || 0, moneda)}</TableCell>
              <TableCell className="text-right font-medium">{formatCurrency(producto.subtotal || 0, moneda)}</TableCell>
              <TableCell className="text-center">
                <Button
                  variant="ghost"
                  size="icon" 
                  onClick={() => onRemoveProduct(producto.id)}
                  className="text-destructive hover:text-destructive h-7 w-7"
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Eliminar</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3} className="text-right font-semibold">Total</TableCell>
            <TableCell className="text-right font-bold text-lg">{formatCurrency(total, moneda)}</TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

export default ListaProductos; 