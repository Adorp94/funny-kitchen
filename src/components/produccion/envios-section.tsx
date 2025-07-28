"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Search, Package, Truck, CheckCircle, Calendar, User, Clock } from 'lucide-react';
import { toast } from "sonner";

interface EnviosProduct {
  nombre: string;
  cantidad_empaque: number;
  cantidad_enviados: number;
  producto_id: number;
  empaque_status: 'parcial' | 'completo';
  envio_status: 'parcial' | 'completo' | 'pendiente';
}

interface EnviosCotizacion {
  cotizacion_id: number;
  folio: string;
  cliente: string;
  fecha_creacion: string;
  estimated_delivery_date?: string;
  days_until_delivery?: number;
  estado: string;
  productos: EnviosProduct[];
  totals: {
    productos_count: number;
    empaque_count: number;
    enviados_count: number;
    cajas_chicas: number;
    cajas_grandes: number;
  };
}

interface EnviosResponse {
  data: EnviosCotizacion[];
  total: number;
}

// Memoized summary stats component
const EnviosSummary = React.memo(({ envios }: { envios: EnviosCotizacion[] }) => {
  const stats = useMemo(() => {
    const totalCotizaciones = envios.length;
    const totalProductos = envios.reduce((sum, envio) => sum + envio.totals.productos_count, 0);
    const totalEmpaque = envios.reduce((sum, envio) => sum + envio.totals.empaque_count, 0);
    const totalEnviados = envios.reduce((sum, envio) => sum + envio.totals.enviados_count, 0);
    const totalCajas = envios.reduce((sum, envio) => sum + envio.totals.cajas_chicas + envio.totals.cajas_grandes, 0);
    
    return { totalCotizaciones, totalProductos, totalEmpaque, totalEnviados, totalCajas };
  }, [envios]);

  return (
    <div className="grid grid-cols-5 gap-4 p-3 bg-muted/30 border rounded-lg">
      <div className="text-center">
        <div className="text-sm font-semibold text-foreground">{stats.totalCotizaciones}</div>
        <div className="text-xs text-muted-foreground">Cotizaciones</div>
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold text-foreground">{stats.totalProductos}</div>
        <div className="text-xs text-muted-foreground">Productos</div>
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold text-foreground">{stats.totalEmpaque}</div>
        <div className="text-xs text-muted-foreground">En Empaque</div>
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold text-foreground">{stats.totalEnviados}</div>
        <div className="text-xs text-muted-foreground">Enviados</div>
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold text-foreground">{stats.totalCajas}</div>
        <div className="text-xs text-muted-foreground">Cajas Total</div>
      </div>
    </div>
  );
});

EnviosSummary.displayName = 'EnviosSummary';

// Memoized cotización row component
const EnviosCotizacionRow = React.memo(({ 
  cotizacion, 
  index,
  isExpanded,
  onToggleExpand
}: { 
  cotizacion: EnviosCotizacion; 
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) => {
  const getPriorityBadge = (days?: number) => {
    if (days === undefined || days === null) {
      return <Badge variant="secondary" className="text-xs">Sin fecha</Badge>;
    }
    
    if (days < 0) {
      return <Badge className="text-xs bg-red-50 text-red-700 border-red-200 hover:bg-red-100 whitespace-nowrap">
        {Math.abs(days)}d atraso
      </Badge>;
    }
    
    if (days <= 7) {
      return <Badge className="text-xs bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 whitespace-nowrap">
        Urgente
      </Badge>;
    }
    
    return <Badge variant="outline" className="text-xs whitespace-nowrap">{days}d</Badge>;
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'enviada':
        return <Badge className="text-xs bg-green-100 text-green-700">Enviada</Badge>;
      case 'producción':
        return <Badge className="text-xs bg-orange-100 text-orange-700">Producción</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{estado}</Badge>;
    }
  };

  return (
    <>
      <TableRow 
        className={`cursor-pointer hover:bg-muted/30 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
        onClick={onToggleExpand}
      >
        <TableCell className="px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-blue-600">{cotizacion.folio}</span>
          </div>
        </TableCell>
        <TableCell className="px-3 py-2">
          <div className="flex items-center gap-2">
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-gray-900 truncate" title={cotizacion.cliente}>
              {cotizacion.cliente}
            </span>
          </div>
        </TableCell>
        <TableCell className="px-3 py-2 text-center">
          <span className="text-xs text-gray-600">{cotizacion.totals.productos_count}</span>
        </TableCell>
        <TableCell className="px-3 py-2 text-center">
          <div className="flex items-center justify-center gap-1">
            <Package className="h-3 w-3 text-orange-600" />
            <span className="text-xs font-medium text-orange-600">{cotizacion.totals.empaque_count}</span>
          </div>
        </TableCell>
        <TableCell className="px-3 py-2 text-center">
          <div className="flex items-center justify-center gap-1">
            <Truck className="h-3 w-3 text-green-600" />
            <span className="text-xs font-medium text-green-600">{cotizacion.totals.enviados_count}</span>
          </div>
        </TableCell>
        <TableCell className="px-3 py-2 text-center">
          <span className="text-xs text-gray-600">{cotizacion.totals.cajas_chicas + cotizacion.totals.cajas_grandes}</span>
        </TableCell>
        <TableCell className="px-3 py-2 text-center">
          {getEstadoBadge(cotizacion.estado)}
        </TableCell>
        <TableCell className="px-3 py-2 text-center">
          {getPriorityBadge(cotizacion.days_until_delivery)}
        </TableCell>
      </TableRow>
      
      {/* Expanded row showing products */}
      {isExpanded && (
        <TableRow className="bg-gray-50/50">
          <TableCell colSpan={8} className="px-6 py-4">
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-gray-700">Detalle de Productos</h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100/50">
                      <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 h-8">Producto</TableHead>
                      <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center h-8">En Empaque</TableHead>
                      <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center h-8">Enviados</TableHead>
                      <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center h-8">Estado Empaque</TableHead>
                      <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center h-8">Estado Envío</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="[&_tr:last-child]:border-0">
                    {cotizacion.productos.map((producto, prodIndex) => (
                      <TableRow key={`${producto.producto_id}-${prodIndex}`} className="hover:bg-gray-50">
                        <TableCell className="px-3 py-2">
                          <span className="text-xs font-medium text-gray-900">{producto.nombre}</span>
                        </TableCell>
                        <TableCell className="px-3 py-2 text-center">
                          <Badge variant="outline" className="text-xs">
                            {producto.cantidad_empaque}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-3 py-2 text-center">
                          <Badge variant="outline" className="text-xs">
                            {producto.cantidad_enviados}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-3 py-2 text-center">
                          {producto.empaque_status === 'completo' ? (
                            <Badge className="text-xs bg-green-100 text-green-700">Completo</Badge>
                          ) : (
                            <Badge className="text-xs bg-orange-100 text-orange-700">Parcial</Badge>
                          )}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-center">
                          {producto.envio_status === 'completo' ? (
                            <Badge className="text-xs bg-green-100 text-green-700">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Completo
                            </Badge>
                          ) : producto.envio_status === 'parcial' ? (
                            <Badge className="text-xs bg-amber-100 text-amber-700">
                              <Clock className="h-3 w-3 mr-1" />
                              Parcial
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Pendiente</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
});

EnviosCotizacionRow.displayName = 'EnviosCotizacionRow';

export const EnviosSection: React.FC = React.memo(() => {
  const [envios, setEnvios] = useState<EnviosCotizacion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedCotizaciones, setExpandedCotizaciones] = useState<Set<number>>(new Set());

  // Filtered envios
  const filteredEnvios = useMemo(() => {
    let filtered = envios;
    
    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(envio => 
        envio.cliente.toLowerCase().includes(term) ||
        envio.folio.toLowerCase().includes(term) ||
        envio.productos.some(p => p.nombre.toLowerCase().includes(term))
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      switch (statusFilter) {
        case 'pendiente':
          filtered = filtered.filter(envio => 
            envio.totals.empaque_count === 0 && envio.totals.enviados_count === 0
          );
          break;
        case 'empaque':
          filtered = filtered.filter(envio => envio.totals.empaque_count > 0);
          break;
        case 'enviados':
          filtered = filtered.filter(envio => envio.totals.enviados_count > 0);
          break;
        case 'completo':
          filtered = filtered.filter(envio => envio.estado === 'enviada');
          break;
      }
    }
    
    return filtered;
  }, [envios, searchTerm, statusFilter]);

  const fetchEnvios = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/production/envios');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: EnviosResponse = await response.json();
      const enviosData = result.data || [];
      
      setEnvios(enviosData);
      
      if (enviosData.length > 0) {
        toast.success(`${enviosData.length} envíos cargados exitosamente`);
      }
      
    } catch (err: any) {
      console.error("Error in fetchEnvios:", err);
      const errorMsg = err.message || "Error al cargar los envíos.";
      setError(errorMsg);
      toast.error("Error al cargar envíos", {
        description: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    fetchEnvios();
  }, [fetchEnvios]);

  const toggleCotizacion = useCallback((cotizacionId: number) => {
    setExpandedCotizaciones(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cotizacionId)) {
        newSet.delete(cotizacionId);
      } else {
        newSet.add(cotizacionId);
      }
      return newSet;
    });
  }, []);

  // Initial load
  useEffect(() => {
    fetchEnvios();
  }, [fetchEnvios]);

  if (loading && envios.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
        </div>
        <div className="h-20 bg-gray-100 rounded animate-pulse"></div>
        <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
      </div>
    );
  }

  if (error && envios.length === 0) {
    return (
      <div className="text-center py-8 space-y-3">
        <p className="text-sm text-red-600">{error}</p>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-3 w-3 mr-2" />
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">Envíos y Empaque</h2>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pendiente">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-gray-600" />
                  Pendiente
                </div>
              </SelectItem>
              <SelectItem value="empaque">
                <div className="flex items-center gap-2">
                  <Package className="h-3 w-3 text-orange-600" />
                  En Empaque
                </div>
              </SelectItem>
              <SelectItem value="enviados">
                <div className="flex items-center gap-2">
                  <Truck className="h-3 w-3 text-green-600" />
                  Enviados
                </div>
              </SelectItem>
              <SelectItem value="completo">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  Completo
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Buscar envíos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs w-48"
            />
          </div>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm" 
            className="h-8 px-3"
            disabled={loading}
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Summary */}
      <EnviosSummary envios={filteredEnvios} />

      {/* Envíos Table */}
      <div className="border rounded-lg bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto rounded-b-lg">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="px-3 py-3 text-xs font-semibold text-muted-foreground">Folio</TableHead>
                <TableHead className="px-3 py-3 text-xs font-semibold text-muted-foreground">Cliente</TableHead>
                <TableHead className="px-3 py-3 text-xs font-semibold text-muted-foreground text-center">Productos</TableHead>
                <TableHead className="px-3 py-3 text-xs font-semibold text-muted-foreground text-center">Empaque</TableHead>
                <TableHead className="px-3 py-3 text-xs font-semibold text-muted-foreground text-center">Enviados</TableHead>
                <TableHead className="px-3 py-3 text-xs font-semibold text-muted-foreground text-center">Cajas</TableHead>
                <TableHead className="px-3 py-3 text-xs font-semibold text-muted-foreground text-center">Estado</TableHead>
                <TableHead className="px-3 py-3 text-xs font-semibold text-muted-foreground text-center">Prioridad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr:last-child]:border-0">
              {filteredEnvios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <div className="text-sm text-muted-foreground">
                      {searchTerm || statusFilter !== 'all' 
                        ? 'No se encontraron resultados con los filtros actuales' 
                        : 'No hay envíos disponibles'
                      }
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEnvios.map((cotizacion, index) => (
                  <EnviosCotizacionRow
                    key={cotizacion.cotizacion_id}
                    cotizacion={cotizacion}
                    index={index}
                    isExpanded={expandedCotizaciones.has(cotizacion.cotizacion_id)}
                    onToggleExpand={() => toggleCotizacion(cotizacion.cotizacion_id)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Footer */}
      {filteredEnvios.length > 0 && (
        <div className="flex justify-between items-center text-xs text-muted-foreground px-1">
          <span>
            {filteredEnvios.length} cotizaciones con envíos
          </span>
          <span>
            {filteredEnvios.reduce((sum, e) => sum + e.totals.productos_count, 0)} productos total
          </span>
        </div>
      )}
    </div>
  );
});

EnviosSection.displayName = 'EnviosSection';