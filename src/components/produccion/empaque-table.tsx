"use client";

import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { toast } from "sonner";
import { dispatchProductionUpdate } from '@/lib/utils/production-sync';

interface EmpaqueProduct {
  nombre: string;
  cantidad: number;
  producto_id?: number;
}

interface EmpaqueTableProps {
  productos: EmpaqueProduct[];
  cotizacionId?: number;
  isLoading?: boolean;
  onProductRemoved?: () => void;
}

// Memoized empaque product row component
const EmpaqueProductRow = React.memo(({ 
  producto, 
  index, 
  cotizacionId, 
  onRemove, 
  isRemoving 
}: { 
  producto: EmpaqueProduct; 
  index: number;
  cotizacionId?: number;
  onRemove?: (producto: EmpaqueProduct) => void;
  isRemoving?: boolean;
}) => (
  <TableRow className={`hover:bg-gray-50/50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
    <TableCell className="px-3 py-2">
      <span className="text-xs font-medium text-gray-900">{producto.nombre}</span>
    </TableCell>
    <TableCell className="px-3 py-2 text-center">
      <Badge className="bg-green-600 text-white text-xs">
        {producto.cantidad}
      </Badge>
    </TableCell>
    {cotizacionId && onRemove && (
      <TableCell className="px-3 py-2 text-center">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={() => onRemove(producto)}
          disabled={isRemoving}
          title="Devolver a terminado"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </TableCell>
    )}
  </TableRow>
));

EmpaqueProductRow.displayName = 'EmpaqueProductRow';

export const EmpaqueTable: React.FC<EmpaqueTableProps> = React.memo(({ 
  productos, 
  cotizacionId, 
  isLoading = false, 
  onProductRemoved 
}) => {
  const [removingProducts, setRemovingProducts] = useState<Set<string>>(new Set());

  const handleRemoveProduct = async (producto: EmpaqueProduct) => {
    if (!cotizacionId || !producto.producto_id) {
      toast.error('Error', { description: 'Información de producto incompleta' });
      return;
    }

    const productKey = `${producto.producto_id}-${cotizacionId}`;
    setRemovingProducts(prev => new Set([...prev, productKey]));

    try {
      const response = await fetch(
        `/api/production/empaque?producto_id=${producto.producto_id}&cotizacion_id=${cotizacionId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al devolver producto');
      }

      const result = await response.json();
      
      toast.success('Producto devuelto', {
        description: `${result.data.cantidad_devuelta} unidades de "${producto.nombre}" devueltas a terminado`
      });

      // Dispatch sync event for other sections
      dispatchProductionUpdate({
        type: 'empaque_update',
        producto_id: producto.producto_id,
        timestamp: Date.now(),
        source: 'empaque-table-remove'
      });

      onProductRemoved?.();

    } catch (error: any) {
      console.error('Error removing product from empaque:', error);
      toast.error('Error al devolver producto', {
        description: error.message
      });
    } finally {
      setRemovingProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(productKey);
        return newSet;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-200 bg-gray-50/50">
          <h3 className="text-xs font-medium text-gray-700">Productos en Empaque</h3>
        </div>
        <div className="h-20 bg-gray-100 animate-pulse"></div>
      </div>
    );
  }

  const canRemove = cotizacionId && onProductRemoved;

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-gray-700">Productos en Empaque</h3>
          {productos.length > 0 && (
            <Badge variant="outline" className="text-xs border-gray-300 text-gray-700">
              {productos.length} productos
            </Badge>
          )}
        </div>
      </div>
      
      {productos.length === 0 ? (
        <div className="px-4 py-6 text-center text-gray-500">
          <div className="text-xs">No hay productos en empaque para esta cotización</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50 border-b border-gray-200">
                <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 h-8">Producto</TableHead>
                <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center h-8">Cantidad</TableHead>
                {canRemove && (
                  <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center h-8">Acciones</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {productos.map((producto, index) => {
                const productKey = `${producto.producto_id}-${cotizacionId}`;
                const isRemoving = removingProducts.has(productKey);
                
                return (
                  <EmpaqueProductRow
                    key={`empaque-${producto.nombre}-${index}`}
                    producto={producto}
                    index={index}
                    cotizacionId={cotizacionId}
                    onRemove={canRemove ? handleRemoveProduct : undefined}
                    isRemoving={isRemoving}
                  />
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
});

EmpaqueTable.displayName = 'EmpaqueTable';