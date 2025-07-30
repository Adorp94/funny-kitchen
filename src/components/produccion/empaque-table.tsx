"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Truck, Save, Package } from 'lucide-react';
import { toast } from "sonner";
import { dispatchProductionUpdate } from '@/lib/utils/production-sync';

interface EmpaqueProduct {
  nombre: string;
  cantidad: number;
  producto_id?: number;
}

interface EmpaqueData {
  cajas_chicas: number;
  cajas_grandes: number;
  comentarios: string | null;
}

interface EmpaqueTableProps {
  productos: EmpaqueProduct[];
  cotizacionId?: number;
  isLoading?: boolean;
  onProductRemoved?: () => void;
  onProductMoved?: (producto: EmpaqueProduct) => void;
  empaqueData?: EmpaqueData | null;
  onEmpaqueDataUpdated?: () => void;
}

// Memoized empaque product row component
const EmpaqueProductRow = React.memo(({ 
  producto, 
  index, 
  cotizacionId, 
  onRemove, 
  onMove,
  isRemoving 
}: { 
  producto: EmpaqueProduct; 
  index: number;
  cotizacionId?: number;
  onRemove?: (producto: EmpaqueProduct) => void;
  onMove?: (producto: EmpaqueProduct) => void;
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
    {cotizacionId && (onRemove || onMove) && (
      <TableCell className="px-3 py-2 text-center">
        <div className="flex items-center justify-center gap-1">
          {onMove && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
              onClick={() => onMove(producto)}
              disabled={isRemoving}
              title="Marcar como entregado"
            >
              <Truck className="h-3 w-3" />
            </Button>
          )}
          {onRemove && (
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
          )}
        </div>
      </TableCell>
    )}
  </TableRow>
));

EmpaqueProductRow.displayName = 'EmpaqueProductRow';

export const EmpaqueTable: React.FC<EmpaqueTableProps> = React.memo(({ 
  productos = [], // Default to empty array for defensive programming
  cotizacionId, 
  isLoading = false, 
  onProductRemoved,
  onProductMoved,
  empaqueData,
  onEmpaqueDataUpdated
}) => {
  // Ensure productos is always an array
  const productosArray = Array.isArray(productos) ? productos : [];
  const [removingProducts, setRemovingProducts] = useState<Set<string>>(new Set());
  
  // State for box counts and comments - using strings to handle empty values properly
  const [cajasChicas, setCajasChicas] = useState<string>('');
  const [cajasGrandes, setCajasGrandes] = useState<string>('');
  const [comentarios, setComentarios] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // Update local state when empaqueData changes
  useEffect(() => {
    if (empaqueData) {
      // Only show values if they're greater than 0, otherwise keep empty for placeholder
      setCajasChicas(empaqueData.cajas_chicas && empaqueData.cajas_chicas > 0 ? String(empaqueData.cajas_chicas) : '');
      setCajasGrandes(empaqueData.cajas_grandes && empaqueData.cajas_grandes > 0 ? String(empaqueData.cajas_grandes) : '');
      setComentarios(empaqueData.comentarios || '');
      setHasChanges(false);
    }
  }, [empaqueData]);

  // Track changes
  useEffect(() => {
    if (empaqueData) {
      // Convert current string values to numbers for comparison
      const currentCajasChicas = cajasChicas === '' ? 0 : parseInt(cajasChicas) || 0;
      const currentCajasGrandes = cajasGrandes === '' ? 0 : parseInt(cajasGrandes) || 0;
      
      const hasChanged = 
        currentCajasChicas !== (empaqueData.cajas_chicas || 0) ||
        currentCajasGrandes !== (empaqueData.cajas_grandes || 0) ||
        comentarios !== (empaqueData.comentarios || '');
      setHasChanges(hasChanged);
    }
  }, [cajasChicas, cajasGrandes, comentarios, empaqueData]);

  const handleSaveEmpaqueData = async () => {
    if (!cotizacionId) {
      toast.error('Error', { description: 'ID de cotización no disponible' });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/production/empaque', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cotizacion_id: cotizacionId,
          cajas_chicas: cajasChicas === '' ? 0 : parseInt(cajasChicas) || 0,
          cajas_grandes: cajasGrandes === '' ? 0 : parseInt(cajasGrandes) || 0,
          comentarios_empaque: comentarios.trim() || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar información de empaque');
      }

      const result = await response.json();
      
      toast.success('Información guardada', {
        description: 'Los datos de empaque se actualizaron exitosamente'
      });

      setHasChanges(false);
      onEmpaqueDataUpdated?.();

    } catch (error: any) {
      console.error('Error saving empaque data:', error);
      toast.error('Error al guardar', {
        description: error.message
      });
    } finally {
      setIsSaving(false);
    }
  };

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
  const canMove = cotizacionId && onProductMoved;

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-gray-700">Productos en Empaque</h3>
          {productosArray.length > 0 && (
            <Badge variant="outline" className="text-xs border-gray-300 text-gray-700">
              {productosArray.length} productos
            </Badge>
          )}
        </div>
      </div>

      {/* Box Counts and Comments Section */}
      {productosArray.length > 0 && cotizacionId && (
        <div className="px-3 py-3 border-b border-gray-200 bg-gray-50/25">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
              <Package className="h-3.5 w-3.5" />
              Información de Empaque
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Cajas Chicas</label>
                <Input
                  type="number"
                  min="0"
                  value={cajasChicas}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty string or valid numbers
                    if (value === '' || (!isNaN(parseInt(value)) && parseInt(value) >= 0)) {
                      setCajasChicas(value);
                    }
                  }}
                  className="h-7 text-xs"
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Cajas Grandes</label>
                <Input
                  type="number"
                  min="0"
                  value={cajasGrandes}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty string or valid numbers
                    if (value === '' || (!isNaN(parseInt(value)) && parseInt(value) >= 0)) {
                      setCajasGrandes(value);
                    }
                  }}
                  className="h-7 text-xs"
                  placeholder="0"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Comentarios</label>
              <Textarea
                value={comentarios}
                onChange={(e) => setComentarios(e.target.value)}
                className="text-xs resize-none"
                rows={2}
                placeholder="Comentarios adicionales sobre el empaque..."
              />
            </div>
            
            {hasChanges && (
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveEmpaqueData}
                  disabled={isSaving}
                  size="sm"
                  className="h-7 px-3 text-xs"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin mr-1.5 h-3 w-3 border border-white border-t-transparent rounded-full"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-3 w-3 mr-1.5" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {productosArray.length === 0 ? (
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
                {(canRemove || canMove) && (
                  <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center h-8">Acciones</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {productosArray.map((producto, index) => {
                const productKey = `${producto.producto_id}-${cotizacionId}`;
                const isRemoving = removingProducts.has(productKey);
                
                return (
                  <EmpaqueProductRow
                    key={`empaque-${producto.nombre}-${index}`}
                    producto={producto}
                    index={index}
                    cotizacionId={cotizacionId}
                    onRemove={canRemove ? handleRemoveProduct : undefined}
                    onMove={canMove ? onProductMoved : undefined}
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