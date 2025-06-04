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
      <div className="text-center py-2">
        <div className="flex justify-center items-center space-x-2">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span className="text-xs text-muted-foreground">Cargando...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-2">
        <p className="text-red-500 mb-2 text-xs">{error}</p>
        <Button onClick={fetchData} variant="outline" size="sm" className="h-7 px-2 text-xs">
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Compact Header */}
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">
          {items.length} cotizaciones en producción
        </span>
        <Button onClick={fetchData} disabled={loading} variant="outline" size="sm" className="h-7 px-2 text-xs">
          <RefreshCw className={`mr-1 h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Data Table */}
      {items.length === 0 ? (
        <div className="text-center py-4 border rounded text-xs text-muted-foreground">
          No hay cotizaciones en producción
        </div>
      ) : (
        <div className="border rounded">
          <Table>
            <TableHeader>
              <TableRow className="h-8">
                <TableHead className="p-1 text-xs font-medium w-20">Folio</TableHead>
                <TableHead className="p-1 text-xs font-medium w-24">Cliente</TableHead>
                <TableHead className="p-1 text-xs font-medium w-40">Productos</TableHead>
                <TableHead className="p-1 text-xs font-medium w-20">Fecha</TableHead>
                <TableHead className="p-1 text-xs font-medium w-24">Total</TableHead>
                <TableHead className="p-1 text-xs font-medium w-24">Anticipo</TableHead>
                <TableHead className="p-1 text-xs font-medium w-20">Estado</TableHead>
                <TableHead className="p-1 text-xs font-medium w-16">ETA</TableHead>
                <TableHead className="p-1 text-xs font-medium text-center w-12">Prior.</TableHead>
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
                  <TableRow 
                    key={item.cotizacion_id} 
                    className={`h-6 hover:bg-muted/50 ${item.prioridad ? "bg-yellow-50 border-l-2 border-l-yellow-400" : ""}`}
                  >
                    {/* Folio with priority indicator */}
                    <TableCell className="p-1 text-xs">
                      <div className="flex items-center space-x-1">
                        <span className="font-medium">{item.cotizacion_folio}</span>
                        {item.prioridad && (
                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                        )}
                      </div>
                    </TableCell>

                    {/* Cliente */}
                    <TableCell className="p-1 text-xs">
                      <div className="max-w-[100px] break-words" title={item.cliente_nombre}>
                        {item.cliente_nombre}
                      </div>
                    </TableCell>

                    {/* Productos */}
                    <TableCell className="p-1 text-xs">
                      <div>
                        <div className="flex items-center space-x-1 mb-1">
                          <Package className="h-3 w-3" />
                          <span className="font-medium">{item.productos.length}</span>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {item.productos.map((producto, index) => (
                            <div key={index} className="flex justify-between">
                              <span className="break-words max-w-[120px]">{producto.producto_nombre}</span>
                              <span className="ml-1 font-medium flex-shrink-0">{producto.cantidad}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TableCell>

                    {/* Fecha */}
                    <TableCell className="p-1 text-xs">
                      {formatDate(item.fecha_movido_produccion)}
                    </TableCell>

                    {/* Total */}
                    <TableCell className="p-1 text-xs font-medium">
                      {formatCurrency(item.total_cotizacion)}
                    </TableCell>

                    {/* Anticipo */}
                    <TableCell className="p-1 text-xs">
                      <div>
                        <div className="font-medium">{formatCurrency(item.anticipo_monto)}</div>
                        <div className="text-xs text-muted-foreground">({item.anticipo_porcentaje}%)</div>
                      </div>
                    </TableCell>

                    {/* Estado Productos */}
                    <TableCell className="p-1 text-xs">
                      <div className="flex flex-wrap gap-0.5">
                        {hasPending && (
                          <span className="inline-flex items-center px-1 py-0.5 rounded bg-gray-100 text-gray-800 text-xs">
                            {statusSummary.pending}P
                          </span>
                        )}
                        {hasQueued && (
                          <span className="inline-flex items-center px-1 py-0.5 rounded bg-blue-100 text-blue-800 text-xs">
                            {statusSummary.queued}C
                          </span>
                        )}
                        {hasInProgress && (
                          <span className="inline-flex items-center px-1 py-0.5 rounded bg-green-100 text-green-800 text-xs">
                            {statusSummary.in_progress}PR
                          </span>
                        )}
                        {hasCompleted && (
                          <span className="inline-flex items-center px-1 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs">
                            {statusSummary.completed}OK
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* ETA */}
                    <TableCell className="p-1 text-xs">
                      <span className="inline-flex items-center px-1 py-0.5 rounded bg-gray-100 text-gray-800 text-xs">
                        {item.eta || "TBD"}
                      </span>
                    </TableCell>

                    {/* Priority Toggle */}
                    <TableCell className="p-1 text-center">
                      <Checkbox
                        checked={item.prioridad}
                        onCheckedChange={() => handlePriorityToggle(item.cotizacion_id, item.prioridad)}
                        aria-label={`Toggle priority for ${item.cotizacion_folio}`}
                        className="h-3 w-3"
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