"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from "sonner";
import { Package, Truck, AlertCircle } from 'lucide-react';
import { dispatchProductionUpdate } from '@/lib/utils/production-sync';

interface MoveToEnviadosDialogProps {
  isOpen: boolean;
  onClose: () => void;
  producto: {
    nombre: string;
    producto_id: number;
    cantidad_empaque: number;
  };
  cotizacion_id: number;
  onSuccess?: () => void;
}

export const MoveToEnviadosDialog: React.FC<MoveToEnviadosDialogProps> = ({
  isOpen,
  onClose,
  producto,
  cotizacion_id,
  onSuccess
}) => {
  const [cantidad, setCantidad] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setCantidad('');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cantidad.trim() || isNaN(Number(cantidad)) || Number(cantidad) <= 0) {
      setError('Ingrese una cantidad válida mayor a 0');
      return;
    }

    const cantidadNum = Number(cantidad);
    if (cantidadNum > producto.cantidad_empaque) {
      setError(`La cantidad no puede ser mayor a ${producto.cantidad_empaque} (disponible en empaque)`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/production/enviados', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          producto_id: producto.producto_id,
          cotizacion_id: cotizacion_id,
          cantidad: cantidadNum
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.details || responseData.error || 'Error en la respuesta del servidor');
      }

      toast.success('Productos entregados exitosamente', {
        description: `${cantidadNum} unidades de "${producto.nombre}" marcadas como entregadas`
      });

      // Dispatch update event for other sections
      dispatchProductionUpdate({
        type: 'enviados_update',
        producto_id: producto.producto_id,
        timestamp: Date.now(),
        source: 'move-to-enviados-dialog'
      });

      onSuccess?.();
      onClose();

    } catch (error: any) {
      console.error('Error moving to enviados:', error);
      const errorMsg = error.message || 'Error al mover productos a enviados';
      setError(errorMsg);
      toast.error('Error al mover productos', {
        description: errorMsg
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const maxCantidad = producto.cantidad_empaque;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-sm font-medium">
            <Truck className="h-4 w-4 text-blue-600 mr-2" />
            Marcar como Entregado
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Product Info */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center text-sm">
              <Package className="h-3 w-3 text-gray-500 mr-2" />
              <span className="font-medium text-gray-900">{producto.nombre}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Disponible en empaque:</span>
              <span className="font-medium">{maxCantidad} unidades</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="cantidad" className="text-xs font-medium text-gray-700">
                Cantidad a entregar
              </Label>
              <Input
                id="cantidad"
                type="number"
                min="1"
                max={maxCantidad}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                placeholder={`Máximo ${maxCantidad}`}
                className="text-sm mt-1"
                disabled={loading}
                autoFocus
              />
            </div>

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-3 w-3 text-red-600" />
                <AlertDescription className="text-xs text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end space-x-2 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                disabled={loading}
                size="sm"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Procesando...' : 'Marcar como Entregado'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};