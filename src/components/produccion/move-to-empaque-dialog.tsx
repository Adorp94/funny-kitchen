"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Package, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from "sonner";
import { dispatchProductionUpdate } from '@/lib/utils/production-sync';

interface MoveToEmpaqueDialogProps {
  isOpen: boolean;
  onClose: () => void;
  producto: {
    nombre: string;
    producto_id: number;
    cantidad_solicitada: number;
    terminado_disponible: number;
  };
  cotizacion_id: number;
  onSuccess: () => void;
}

export const MoveToEmpaqueDialog: React.FC<MoveToEmpaqueDialogProps> = ({
  isOpen,
  onClose,
  producto,
  cotizacion_id,
  onSuccess
}) => {
  const [cantidad, setCantidad] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (cantidad <= 0) {
      setError('La cantidad debe ser mayor a 0');
      return;
    }

    if (cantidad > producto.terminado_disponible) {
      setError(`No hay suficientes productos terminados (máximo: ${producto.terminado_disponible})`);
      return;
    }

    if (cantidad > producto.cantidad_solicitada) {
      setError(`La cantidad no puede exceder la cantidad solicitada (${producto.cantidad_solicitada})`);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/production/empaque', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          producto_id: producto.producto_id,
          cotizacion_id: cotizacion_id,
          cantidad: cantidad
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      toast.success("Productos movidos a empaque exitosamente", {
        description: `${cantidad} unidades de "${producto.nombre}" asignadas para empaque`
      });

      // Dispatch sync event for other sections
      dispatchProductionUpdate({
        type: 'empaque_update',
        producto_id: producto.producto_id,
        timestamp: Date.now(),
        source: 'move-to-empaque-dialog'
      });

      // Reset form and close dialog
      setCantidad(0);
      onClose();
      onSuccess(); // Trigger data refresh

    } catch (err: any) {
      console.error("Error moving products to empaque:", err);
      const errorMsg = err.message || "Error al mover productos a empaque";
      setError(errorMsg);
      toast.error("Error al mover productos", {
        description: errorMsg
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setCantidad(0);
      setError(null);
      onClose();
    }
  };

  const maxCantidad = Math.min(producto.terminado_disponible, producto.cantidad_solicitada);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Mover a Empaque
          </DialogTitle>
          <DialogDescription>
            Asignar productos terminados para el empaque de esta cotización
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Info */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-sm text-gray-900">
                {producto.nombre}
              </h4>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <div className="text-gray-600">Cantidad Solicitada</div>
                <Badge variant="secondary" className="text-xs">
                  {producto.cantidad_solicitada} pzs
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="text-gray-600">Terminados Disponibles</div>
                <Badge 
                  variant={producto.terminado_disponible > 0 ? "default" : "destructive"}
                  className="text-xs"
                >
                  {producto.terminado_disponible} pzs
                </Badge>
              </div>
            </div>
          </div>

          {/* Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor="cantidad" className="text-sm font-medium">
              Cantidad a Mover a Empaque
            </Label>
            <div className="flex items-center space-x-2">
              <Input
                id="cantidad"
                type="number"
                min={0}
                max={maxCantidad}
                value={cantidad || ''}
                onChange={(e) => setCantidad(parseInt(e.target.value) || 0)}
                placeholder="0"
                disabled={loading || maxCantidad === 0}
                className="flex-1"
              />
              {maxCantidad > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCantidad(maxCantidad)}
                  disabled={loading}
                  className="whitespace-nowrap"
                >
                  Usar Max ({maxCantidad})
                </Button>
              )}
            </div>
            <div className="text-xs text-gray-500">
              Máximo disponible: {maxCantidad} productos
            </div>
          </div>

          {/* Flow Visualization */}
          {cantidad > 0 && (
            <div className="rounded border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-center justify-center space-x-2 text-sm">
                <Badge variant="outline" className="text-blue-700 border-blue-300">
                  Terminado: {cantidad}
                </Badge>
                <ArrowRight className="h-3 w-3 text-blue-600" />
                <Badge className="bg-blue-600 text-white">
                  Empaque: {cantidad}
                </Badge>
              </div>
              <div className="text-xs text-blue-700 text-center mt-1">
                Asignado a cotización #{cotizacion_id}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-sm text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* No products warning */}
          {maxCantidad === 0 && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-sm text-yellow-700">
                No hay productos terminados disponibles para mover a empaque
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            type="button" 
            onClick={handleSubmit}
            disabled={loading || cantidad <= 0 || maxCantidad === 0}
          >
            {loading ? 'Moviendo...' : `Mover ${cantidad || 0} a Empaque`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};