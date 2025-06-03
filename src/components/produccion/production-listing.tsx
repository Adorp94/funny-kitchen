"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw, Star, Package, Plus } from 'lucide-react';
import { toast } from "sonner";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Type definition for production listing items
type ProductionListingItem = {
  cotizacion_id: number;
  cotizacion_folio: string;
  cliente_id: number;
  cliente_nombre: string;
  productos: {
    producto_id: number;
    producto_nombre: string;
    cantidad: number;
    production_status: string;
  }[];
  fecha_movido_produccion: string | null;
  total_cotizacion: number;
  anticipo_porcentaje: number;
  anticipo_monto: number;
  eta: string | null;
  estado: string;
  prioridad: boolean;
  created_at: string;
};

// Helper function to format dates
const formatDate = (dateString: string | null): string => {
  if (!dateString) return "N/A";
  try {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: es });
  } catch (error) {
    return "Fecha inválida";
  }
};

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
};

// Helper function to get production status badge variant
const getStatusBadgeVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
  switch (status) {
    case 'pending': return 'outline';
    case 'queued': return 'secondary';
    case 'in_progress': return 'default';
    case 'completed': return 'destructive'; // Using destructive as "success" variant
    default: return 'outline';
  }
};

// Helper function to get production status text
const getStatusText = (status: string): string => {
  switch (status) {
    case 'pending': return 'Pendiente';
    case 'queued': return 'En Cola';
    case 'in_progress': return 'En Progreso';
    case 'completed': return 'Completado';
    default: return status;
  }
};

// Helper function to summarize product statuses
const summarizeProductStatuses = (productos: ProductionListingItem['productos']) => {
  const statusCounts = productos.reduce((acc, producto) => {
    const status = producto.production_status || 'pending';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return statusCounts;
};

export function ProductionListing() {
  const [items, setItems] = useState<ProductionListingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch production listing data
  const fetchData = useCallback(async () => {
    console.log("ProductionListing: fetchData triggered");
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/production/listing');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`API Error Response: ${response.status}`, errorData);
        throw new Error(errorData.error || `Error HTTP ${response.status}`);
      }
      const data = await response.json();
      console.log("Production listing data received:", data);
      setItems(data.items || []);
    } catch (err: any) {
      console.error("Error in fetchData:", err);
      const errorMsg = err.message || "Error desconocido al cargar el listado de producción.";
      setError(errorMsg);
      toast.error("Error al cargar datos", {
        description: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle priority toggle
  const handlePriorityToggle = useCallback(async (cotizacionId: number, currentPriority: boolean) => {
    const newPriority = !currentPriority;
    console.log(`Toggling priority for cotización ${cotizacionId} to ${newPriority}`);
    
    try {
      const response = await fetch('/api/production/priority', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          cotizacion_id: cotizacionId, 
          prioridad: newPriority 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al actualizar prioridad');
      }

      const result = await response.json();
      console.log("Priority update successful:", result);
      
      toast.success("Prioridad actualizada", {
        description: `La cotización ahora ${newPriority ? 'tiene' : 'no tiene'} prioridad.`,
      });

      // Refresh data after successful update
      await fetchData();

    } catch (err: any) {
      console.error("Failed to update priority:", err);
      const errorMsg = err.message || "No se pudo actualizar la prioridad.";
      toast.error("Error al actualizar prioridad", {
        description: errorMsg,
      });
    }
  }, [fetchData]);

  // Load data on component mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Listado de Producción</h2>
            <p className="text-muted-foreground">
              Vista detallada de cotizaciones en producción con información de clientes y pagos
            </p>
          </div>
        </div>
        <div className="text-center py-8">
          <div className="flex justify-center items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Cargando listado de producción...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Listado de Producción</h2>
            <p className="text-muted-foreground">
              Vista detallada de cotizaciones en producción con información de clientes y pagos
            </p>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchData} variant="outline">
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Listado de Producción</h2>
          <p className="text-muted-foreground">
            Vista detallada de cotizaciones en producción ({items.length} {items.length === 1 ? 'registro' : 'registros'})
          </p>
        </div>
        <Button onClick={fetchData} disabled={loading} variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Data Table */}
      {items.length === 0 ? (
        <div className="text-center py-8 border rounded-lg">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay cotizaciones en producción</h3>
          <p className="text-muted-foreground">
            Actualmente no hay cotizaciones en estado de producción.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Folio</TableHead>
                <TableHead className="w-[150px]">Cliente</TableHead>
                <TableHead className="w-[280px]">Productos</TableHead>
                <TableHead className="w-[120px]">Fecha Prod.</TableHead>
                <TableHead className="w-[120px]">Total</TableHead>
                <TableHead className="w-[140px]">Anticipo</TableHead>
                <TableHead className="w-[150px]">Estado Productos</TableHead>
                <TableHead className="w-[100px]">ETA</TableHead>
                <TableHead className="w-[80px] text-center">Prioridad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const statusSummary = summarizeProductStatuses(item.productos);
                const hasCompleted = statusSummary.completed > 0;
                const hasInProgress = statusSummary.in_progress > 0;
                const hasQueued = statusSummary.queued > 0;
                const hasPending = statusSummary.pending > 0;

                return (
                  <TableRow key={item.cotizacion_id} className={item.prioridad ? "bg-yellow-50 border-l-4 border-l-yellow-400" : ""}>
                    {/* Folio with priority indicator */}
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{item.cotizacion_folio}</span>
                        {item.prioridad && (
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        )}
                      </div>
                    </TableCell>

                    {/* Cliente */}
                    <TableCell>
                      <div className="max-w-[140px] truncate" title={item.cliente_nombre}>
                        {item.cliente_nombre}
                      </div>
                    </TableCell>

                    {/* Productos */}
                    <TableCell>
                      <div>
                        <div className="flex items-center space-x-1 mb-1">
                          <Package className="h-3 w-3" />
                          <span className="text-sm font-medium">{item.productos.length} productos</span>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          {item.productos.map((producto, index) => (
                            <div key={index} className="flex justify-between">
                              <span>{producto.producto_nombre}</span>
                              <span className="ml-2 font-medium">Cant: {producto.cantidad}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TableCell>

                    {/* Fecha */}
                    <TableCell className="text-sm">
                      {formatDate(item.fecha_movido_produccion)}
                    </TableCell>

                    {/* Total */}
                    <TableCell className="text-sm font-medium">
                      {formatCurrency(item.total_cotizacion)}
                    </TableCell>

                    {/* Anticipo */}
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{formatCurrency(item.anticipo_monto)}</div>
                        <div className="text-xs text-muted-foreground">({item.anticipo_porcentaje}%)</div>
                      </div>
                    </TableCell>

                    {/* Estado Productos */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {hasPending && (
                          <Badge variant="outline" className="text-xs">
                            {statusSummary.pending} Pend.
                          </Badge>
                        )}
                        {hasQueued && (
                          <Badge variant="secondary" className="text-xs">
                            {statusSummary.queued} Cola
                          </Badge>
                        )}
                        {hasInProgress && (
                          <Badge variant="default" className="text-xs">
                            {statusSummary.in_progress} Prog.
                          </Badge>
                        )}
                        {hasCompleted && (
                          <Badge variant="destructive" className="text-xs">
                            {statusSummary.completed} Comp.
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* ETA */}
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {item.eta || "Por calc."}
                      </Badge>
                    </TableCell>

                    {/* Priority Toggle */}
                    <TableCell className="text-center">
                      <Checkbox
                        checked={item.prioridad}
                        onCheckedChange={() => handlePriorityToggle(item.cotizacion_id, item.prioridad)}
                        aria-label={`Toggle priority for ${item.cotizacion_folio}`}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
} 