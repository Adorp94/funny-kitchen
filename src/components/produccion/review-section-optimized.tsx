"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Search, Factory, Users, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { toast } from "sonner";

// Types from the new API
interface CronogramaProducto {
  producto_id: number;
  nombre: string;
  sku?: string;
  cantidad_pedida: number;
  cantidad_asignada: number;
  cantidad_pendiente: number;
  produccion_status: {
    por_detallar: number;
    detallado: number;
    sancocho: number;
    terminado: number;
    total_en_pipeline: number;
  };
  moldes_disponibles: number;
  vueltas_max_dia: number;
  capacidad_diaria: number;
  precio_venta: number;
}

interface CronogramaCotizacion {
  cotizacion_id: number;
  folio: string;
  cliente: string;
  cliente_id: number;
  fecha_creacion: string;
  estado: string;
  productos: CronogramaProducto[];
  total_piezas: number;
  total_pendientes: number;
  total_en_pipeline: number;
}

interface ProductoPrioridad {
  producto_id: number;
  nombre: string;
  total_pendiente: number;
  total_en_pipeline: number;
  moldes_disponibles: number;
  capacidad_diaria: number;
  limitado_por_moldes: boolean;
  cotizaciones_count: number;
  fecha_mas_temprana: string;
}

interface CronogramaResponse {
  cotizaciones: CronogramaCotizacion[];
  summary: {
    total_cotizaciones: number;
    total_productos_unicos: number;
    total_piezas_pedidas: number;
    total_piezas_pendientes: number;
    total_piezas_en_pipeline: number;
    productos_por_prioridad: ProductoPrioridad[];
  };
}

interface ProductionScheduleItem {
  producto: string;
  producto_id: number;
  totalPendiente: number;
  totalPendienteConMerma: number;
  totalEnPipeline: number;
  moldesDisponibles: number;
  capacidadDiaria: number;
  limitadoPorMoldes: boolean;
  cotizacionesCount: number;
  fechaMasTemprana: string;
  diasProduccionNecesarios: number;
  semanasProduccionNecesarias: number;
  fechaCompletacionEstimada: string;
  clientes: Array<{
    cotizacion_id: number;
    folio: string;
    cliente: string;
    fecha_creacion: string;
    cantidad_pendiente: number;
  }>;
}

export const ReviewSectionOptimized: React.FC = () => {
  const [data, setData] = useState<CronogramaResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredCotizaciones, setFilteredCotizaciones] = useState<CronogramaCotizacion[]>([]);
  const [productionSchedule, setProductionSchedule] = useState<ProductionScheduleItem[]>([]);

  // Production constants
  const DAILY_CAPACITY = 340; // Global factory capacity
  const WORK_DAYS_PER_WEEK = 6;
  const MERMA_PERCENTAGE = 0.25; // 25% buffer

  // Calculate work days and completion date from today
  const calculateCompletionDate = useCallback((daysRequired: number): { date: Date; formatted: string } => {
    const today = new Date();
    let currentDate = new Date(today);
    let remainingWorkDays = daysRequired;
    
    while (remainingWorkDays > 0) {
      currentDate.setDate(currentDate.getDate() + 1);
      const dayOfWeek = currentDate.getDay();
      
      // Count Monday (1) to Saturday (6) as work days
      if (dayOfWeek >= 1 && dayOfWeek <= 6) {
        remainingWorkDays--;
      }
    }
    
    const formatted = currentDate.toLocaleDateString('es-MX', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    return { date: currentDate, formatted };
  }, []);

  // Create production schedule from API data
  const createProductionSchedule = useCallback((cronogramaData: CronogramaResponse): ProductionScheduleItem[] => {
    const schedule: ProductionScheduleItem[] = [];

    cronogramaData.summary.productos_por_prioridad.forEach(producto => {
      if (producto.total_pendiente === 0) return; // Skip products without pending work

      // Apply merma to pending quantities
      const totalPendienteConMerma = Math.ceil(producto.total_pendiente * (1 + MERMA_PERCENTAGE));
      
      // Calculate production days needed
      const effectiveCapacity = Math.min(producto.capacidad_diaria, DAILY_CAPACITY);
      const diasProduccion = Math.ceil(totalPendienteConMerma / effectiveCapacity);
      const semanasProduccion = Math.ceil(diasProduccion / WORK_DAYS_PER_WEEK);
      
      // Get completion date
      const { formatted: fechaCompletion } = calculateCompletionDate(diasProduccion);

      // Find all cotizaciones that have this product with pending work
      const clientesConProducto = cronogramaData.cotizaciones
        .filter(cotizacion => {
          return cotizacion.productos.some(p => 
            p.producto_id === producto.producto_id && p.cantidad_pendiente > 0
          );
        })
        .map(cotizacion => {
          const productoEnCotizacion = cotizacion.productos.find(p => p.producto_id === producto.producto_id)!;
          return {
            cotizacion_id: cotizacion.cotizacion_id,
            folio: cotizacion.folio,
            cliente: cotizacion.cliente,
            fecha_creacion: cotizacion.fecha_creacion,
            cantidad_pendiente: productoEnCotizacion.cantidad_pendiente
          };
        })
        .sort((a, b) => new Date(a.fecha_creacion).getTime() - new Date(b.fecha_creacion).getTime());

      schedule.push({
        producto: producto.nombre,
        producto_id: producto.producto_id,
        totalPendiente: producto.total_pendiente,
        totalPendienteConMerma,
        totalEnPipeline: producto.total_en_pipeline,
        moldesDisponibles: producto.moldes_disponibles,
        capacidadDiaria: producto.capacidad_diaria,
        limitadoPorMoldes: producto.limitado_por_moldes,
        cotizacionesCount: producto.cotizaciones_count,
        fechaMasTemprana: producto.fecha_mas_temprana,
        diasProduccionNecesarios: diasProduccion,
        semanasProduccionNecesarias: semanasProduccion,
        fechaCompletacionEstimada: fechaCompletion,
        clientes: clientesConProducto
      });
    });

    return schedule;
  }, [calculateCompletionDate]);

  // Fetch data from optimized API
  const fetchData = useCallback(async () => {
    console.log("ReviewSectionOptimized: fetchData triggered");
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/production/cronograma');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`API Error Response: ${response.status}`, errorData);
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const result: CronogramaResponse = await response.json();
      console.log("Optimized cronograma data received:", result.summary);
      
      setData(result);
      setFilteredCotizaciones(result.cotizaciones);
      
      // Create production schedule
      const schedule = createProductionSchedule(result);
      setProductionSchedule(schedule);
      
    } catch (err: any) {
      console.error("Error in fetchData:", err);
      const errorMsg = err.message || "Error desconocido al cargar los datos de cronograma.";
      setError(errorMsg);
      toast.error("Error al cargar cronograma", {
        description: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  }, [createProductionSchedule]);

  // Handle search functionality
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    if (!data) return;

    if (!term.trim()) {
      setFilteredCotizaciones(data.cotizaciones);
    } else {
      const filtered = data.cotizaciones.filter(cotizacion => 
        cotizacion.cliente.toLowerCase().includes(term.toLowerCase()) ||
        cotizacion.folio.toLowerCase().includes(term.toLowerCase()) ||
        cotizacion.productos.some(p => p.nombre.toLowerCase().includes(term.toLowerCase()))
      );
      setFilteredCotizaciones(filtered);
    }
  }, [data]);

  // Calculate parallel production timeline
  const calculateParallelTimeline = useCallback(() => {
    if (productionSchedule.length === 0) return { totalDays: 0, totalWeeks: 0, lastDate: 'N/A' };
    
    let currentDay = 0;
    let remainingCapacity = DAILY_CAPACITY;
    
    // Create queue of products with remaining work
    const productionQueue = productionSchedule.map(item => ({
      producto: item.producto,
      remainingPieces: item.totalPendienteConMerma,
      dailyCapacity: item.capacidadDiaria,
      isLimited: item.limitadoPorMoldes
    }));
    
    // Simulate daily production
    while (productionQueue.some(p => p.remainingPieces > 0)) {
      currentDay++;
      remainingCapacity = DAILY_CAPACITY;
      
      for (const product of productionQueue) {
        if (product.remainingPieces > 0 && remainingCapacity > 0) {
          const canProduce = Math.min(
            product.remainingPieces,
            product.dailyCapacity,
            remainingCapacity
          );
          product.remainingPieces -= canProduce;
          remainingCapacity -= canProduce;
        }
      }
    }
    
    const totalWeeks = Math.ceil(currentDay / WORK_DAYS_PER_WEEK);
    const { formatted: lastDate } = calculateCompletionDate(currentDay);
    
    return { totalDays: currentDay, totalWeeks, lastDate };
  }, [productionSchedule, calculateCompletionDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    handleSearch(searchTerm);
  }, [data, searchTerm, handleSearch]);

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="flex justify-center items-center space-x-3">
          <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
          <span className="text-sm text-muted-foreground">Cargando cronograma optimizado...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <div className="space-y-3">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
          <p className="text-red-600 text-sm font-medium">{error}</p>
          <Button onClick={fetchData} variant="outline" size="sm" className="h-8 px-3 text-xs">
            <RefreshCw className="h-3 w-3 mr-1" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Calculate metrics
  const { totalDays, totalWeeks, lastDate } = calculateParallelTimeline();
  const productosLimitados = productionSchedule.filter(item => item.limitadoPorMoldes).length;
  const totalCapacityUtilization = Math.round((data.summary.total_piezas_pendientes * (1 + MERMA_PERCENTAGE) / DAILY_CAPACITY) * 100);

  return (
    <div className="space-y-3">
      <Tabs defaultValue="clientes" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-8 text-xs">
          <TabsTrigger value="clientes" className="flex items-center gap-1 text-xs py-1">
            <Users className="h-3 w-3" />
            Por Cliente
          </TabsTrigger>
          <TabsTrigger value="produccion" className="flex items-center gap-1 text-xs py-1">
            <Factory className="h-3 w-3" />
            Cronograma Producción
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clientes" className="mt-2">
          {/* Enhanced Summary Bar */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 mb-3">
            <div className="grid grid-cols-6 gap-3 text-center">
              <div>
                <div className="text-sm font-bold text-blue-900">{data.summary.total_cotizaciones}</div>
                <div className="text-xs text-blue-700">Cotizaciones</div>
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">{data.summary.total_productos_unicos}</div>
                <div className="text-xs text-gray-600">Productos</div>
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">{data.summary.total_piezas_pedidas.toLocaleString()}</div>
                <div className="text-xs text-gray-600">Piezas Pedidas</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-sm font-bold text-orange-700">{data.summary.total_piezas_pendientes.toLocaleString()}</div>
                <div className="text-xs text-orange-600">Pendientes</div>
              </div>
              <div>
                <div className="text-sm font-bold text-green-700">{data.summary.total_piezas_en_pipeline.toLocaleString()}</div>
                <div className="text-xs text-green-600">En Proceso</div>
              </div>
              <div>
                <div className="text-sm font-bold text-indigo-700">{Math.round(data.summary.total_piezas_pedidas / Math.max(data.summary.total_cotizaciones, 1))}</div>
                <div className="text-xs text-indigo-600">Pzas/Cotización</div>
              </div>
            </div>
            
            {/* Real-time indicator */}
            <div className="mt-2 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                <CheckCircle className="h-3 w-3" />
                Datos en tiempo real desde producción activa
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex justify-between items-center bg-white border border-gray-200 rounded-lg p-2 mb-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
              <Input
                placeholder="Buscar cotización, cliente o producto..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="h-7 pl-7 text-xs border-gray-300"
              />
            </div>
            <Button onClick={fetchData} variant="outline" size="sm" className="h-7 px-2 ml-2">
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>

          {/* Cotizaciones Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 border-b border-gray-200 h-8">
                  <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 w-32">Cotización</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 w-32">Cliente</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 w-40">Productos</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center w-20">Pedidas</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center w-20">Pendientes</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center w-20">En Proceso</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center w-24">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCotizaciones.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-xs text-gray-500">
                      {searchTerm ? 'No se encontraron resultados' : 'No hay cotizaciones en producción'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCotizaciones.map((cotizacion, index) => (
                    <TableRow key={cotizacion.cotizacion_id} className={`h-auto border-b border-gray-100 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <TableCell className="px-3 py-2 text-xs">
                        <div className="font-medium text-blue-700">{cotizacion.folio}</div>
                      </TableCell>
                      
                      <TableCell className="px-3 py-2 text-xs">
                        <div className="font-medium text-gray-900 max-w-[120px] truncate" title={cotizacion.cliente}>
                          {cotizacion.cliente}
                        </div>
                      </TableCell>

                      <TableCell className="px-3 py-2 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-gray-600 mb-1">
                            <span className="font-medium">{cotizacion.productos.length} productos</span>
                          </div>
                          <div className="space-y-0.5 max-h-20 overflow-y-auto">
                            {cotizacion.productos.map((producto, pIndex) => (
                              <div key={pIndex} className="flex justify-between text-xs">
                                <span className="text-gray-700 max-w-[150px] truncate" title={producto.nombre}>
                                  {producto.nombre}
                                </span>
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-900">{producto.cantidad_pedida}</span>
                                  {producto.cantidad_pendiente > 0 && (
                                    <Badge variant="secondary" className="text-xs px-1 py-0">
                                      {producto.cantidad_pendiente} pend
                                    </Badge>
                                  )}
                                  {producto.produccion_status.total_en_pipeline > 0 && (
                                    <Badge variant="outline" className="text-xs px-1 py-0 border-green-300 text-green-700">
                                      {producto.produccion_status.total_en_pipeline} proc
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="px-3 py-2 text-xs text-center">
                        <div className="bg-blue-100 rounded px-2 py-1 inline-block">
                          <span className="font-bold text-blue-900">{cotizacion.total_piezas}</span>
                        </div>
                      </TableCell>

                      <TableCell className="px-3 py-2 text-xs text-center">
                        {cotizacion.total_pendientes > 0 ? (
                          <div className="bg-orange-100 rounded px-2 py-1 inline-block">
                            <span className="font-bold text-orange-900">{cotizacion.total_pendientes}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </TableCell>

                      <TableCell className="px-3 py-2 text-xs text-center">
                        {cotizacion.total_en_pipeline > 0 ? (
                          <div className="bg-green-100 rounded px-2 py-1 inline-block">
                            <span className="font-bold text-green-900">{cotizacion.total_en_pipeline}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </TableCell>

                      <TableCell className="px-3 py-2 text-xs text-center">
                        <span className="text-gray-600">
                          {new Date(cotizacion.fecha_creacion).toLocaleDateString('es-MX', { 
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit'
                          })}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="produccion" className="mt-2">
          {/* Production Summary */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-3 mb-3">
            <div className="grid grid-cols-8 gap-3 text-center">
              <div>
                <div className="text-sm font-bold text-orange-700">{data.summary.total_piezas_pendientes.toLocaleString()}</div>
                <div className="text-xs text-orange-600">Pendientes</div>
              </div>
              <div>
                <div className="text-sm font-bold text-blue-700">{Math.ceil(data.summary.total_piezas_pendientes * (1 + MERMA_PERCENTAGE)).toLocaleString()}</div>
                <div className="text-xs text-blue-600">Con Merma</div>
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">{totalCapacityUtilization}%</div>
                <div className="text-xs text-gray-600">Capacidad</div>
              </div>
              <div>
                <div className={`text-sm font-bold ${productosLimitados > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  {productosLimitados}
                </div>
                <div className="text-xs text-gray-600">Limitados</div>
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">{totalDays}</div>
                <div className="text-xs text-gray-600">Días</div>
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">{totalWeeks}</div>
                <div className="text-xs text-gray-600">Semanas</div>
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">{productionSchedule.length}</div>
                <div className="text-xs text-gray-600">Productos</div>
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900 leading-tight">{lastDate?.split(',')[0] || 'N/A'}</div>
                <div className="text-xs text-gray-600">Entrega Final</div>
              </div>
            </div>
            
            {/* Status Indicators */}
            <div className="mt-3 flex justify-center gap-4">
              {productosLimitados > 0 && (
                <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  {productosLimitados} productos limitados por moldes
                </div>
              )}
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                <Clock className="h-3 w-3" />
                Cronograma optimizado con datos reales
              </div>
            </div>
          </div>

          {/* Production Schedule Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 border-b border-gray-200 h-8">
                  <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 w-32">Producto</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center w-20">Pendiente</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center w-20">En Proceso</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center w-20">Con Merma</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center w-20">Moldes</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center w-16">Días</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center w-24">Completion</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 w-40">Cotizaciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productionSchedule.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-xs text-gray-500">
                      No hay productos con trabajo pendiente
                    </TableCell>
                  </TableRow>
                ) : (
                  productionSchedule.map((item, index) => (
                    <TableRow key={item.producto_id} className={`h-10 border-b border-gray-100 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <TableCell className="px-3 py-2 text-xs">
                        <div className="font-medium text-gray-900 max-w-[120px] truncate" title={item.producto}>
                          {item.producto}
                        </div>
                      </TableCell>

                      <TableCell className="px-3 py-2 text-xs text-center">
                        <span className="font-bold text-orange-700">{item.totalPendiente}</span>
                      </TableCell>

                      <TableCell className="px-3 py-2 text-xs text-center">
                        <span className="font-medium text-green-700">{item.totalEnPipeline}</span>
                      </TableCell>

                      <TableCell className="px-3 py-2 text-xs text-center">
                        <span className="font-medium text-blue-700">{item.totalPendienteConMerma}</span>
                      </TableCell>

                      <TableCell className="px-3 py-2 text-xs text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <span className={`${item.limitadoPorMoldes ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                            {item.moldesDisponibles}
                          </span>
                          <div className={`w-1.5 h-1.5 rounded-full ${item.limitadoPorMoldes ? 'bg-red-400' : 'bg-green-400'}`} />
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {item.capacidadDiaria}/día
                        </div>
                      </TableCell>

                      <TableCell className="px-3 py-2 text-xs text-center">
                        <span className={`font-bold ${item.limitadoPorMoldes ? 'text-red-600' : 'text-gray-900'}`}>
                          {item.diasProduccionNecesarios}
                        </span>
                      </TableCell>

                      <TableCell className="px-3 py-2 text-xs text-center">
                        <div className="space-y-1">
                          <span className={`font-medium ${item.limitadoPorMoldes ? 'text-red-600' : 'text-gray-900'}`}>
                            {item.fechaCompletacionEstimada.split(',')[0]}
                          </span>
                          <div className="text-xs text-gray-500">
                            {item.semanasProduccionNecesarias} sem
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="px-3 py-2 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-gray-600 mb-1">
                            <span className="font-medium">{item.cotizacionesCount} cotizaciones</span>
                            <span className="font-bold text-orange-700">{item.totalPendiente}</span>
                          </div>
                          <div className="space-y-0.5 max-h-16 overflow-y-auto">
                            {item.clientes.map((cliente, cIndex) => (
                              <div key={cIndex} className="flex justify-between text-xs">
                                <span className="text-blue-600 font-medium" title={`${cliente.folio} - ${cliente.cliente}`}>
                                  {cliente.folio}
                                </span>
                                <span className="font-medium text-orange-700">{cliente.cantidad_pendiente}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};