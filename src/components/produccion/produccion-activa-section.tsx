"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Search, AlertCircle, Calendar, Clock, TrendingUp, ChevronDown, ChevronRight, User, Package, Factory } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from "sonner";
import { MoveToEmpaqueDialog } from './move-to-empaque-dialog';
import { EmpaqueTable } from './empaque-table';
import { EnviadosTable } from './enviados-table';
import { MoveToEnviadosDialog } from './move-to-enviados-dialog';
import { useProductionSync, dispatchProductionUpdate } from '@/lib/utils/production-sync';

// Production constants for cronograma calculations
const DAILY_CAPACITY = 340; // Global factory capacity
const WORK_DAYS_PER_WEEK = 6;
const MERMA_PERCENTAGE = 0.25; // 25% buffer

// Debounce hook for search optimization
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

interface ProductoConEstatus {
  nombre: string;
  cantidad: number;
  cantidad_pedida?: number; // Original order quantity
  cantidad_pendiente?: number; // Remaining quantity to produce
  cantidad_asignada?: number; // Allocated to empaque/entregado
  fecha: string;
  precio_venta?: number; // Make optional with fallback
  precio_total?: number; // Make optional with fallback
  producto_id: number;
  moldes_disponibles?: number;
  vueltas_max_dia?: number;
  produccion_status: {
    por_detallar: number;
    detallado: number;
    sancocho: number;
    terminado: number;
    terminado_disponible: number;
  };
  empaque_status?: {
    cantidad_empaque: number;
  };
  allocation_status?: {
    cantidad_cotizacion: number;
    total_asignado: number;
    cantidad_disponible: number;
    limite_alcanzado: boolean;
  };
  // Cronograma timeline info
  timeline?: {
    dias_estimados: number;
    fecha_estimada_completion: string;
    limitado_por_moldes: boolean;
    capacidad_diaria: number;
    moldes_disponibles: number;
  };
}

interface CotizacionActiva {
  cotizacion_id: number;
  folio: string;
  cliente: string;
  cliente_id: number;
  fecha_creacion: string;
  estado: string;
  productos: ProductoConEstatus[];
  total_piezas: number;
  total_pendientes: number;
  total_en_pipeline: number;
  // Cronograma info for the cotizacion
  cronograma?: {
    fecha_estimada_completion: string;
    dias_totales_estimados: number;
    productos_limitados_por_moldes: number;
  };
}

interface EnviadosProduct {
  nombre: string;
  cantidad: number;
  producto_id: number;
  fecha_envio: string;
}

interface EnviadosResponse {
  data: {
    productos_enviados: EnviadosProduct[];
    total_cajas_chicas: number;
    total_cajas_grandes: number;
  };
}

// Cache for client data
const clientCache = new Map<string, { data: CotizacionActiva; timestamp: number }>();
const CACHE_DURATION = 120000; // 2 minutes

// Calculate production timeline for a product using business logic
const calculateProductTimeline = (producto: ProductoConEstatus) => {
  const { moldes_disponibles = 0, vueltas_max_dia = 1 } = producto;
  
  // Use the total cantidad pedida for timeline calculation (not just pending)
  const cantidadPedida = producto.cantidad_pedida || producto.cantidad || 0;
  
  if (cantidadPedida === 0) {
    return {
      dias_estimados: 0,
      fecha_estimada_completion: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }),
      limitado_por_moldes: false,
      capacidad_diaria: 0,
      moldes_disponibles: moldes_disponibles
    };
  }
  
  // If no moldes available, cannot produce
  if (moldes_disponibles === 0) {
    return {
      dias_estimados: 999,
      fecha_estimada_completion: 'Sin moldes',
      limitado_por_moldes: true,
      capacidad_diaria: 0,
      moldes_disponibles: moldes_disponibles
    };
  }
  
  // Business logic: (FULL cantidad pedida + 25% merma) / moldes_activos = days
  // This shows how long the entire order would take to produce
  const cantidadConMerma = Math.ceil(cantidadPedida * (1 + MERMA_PERCENTAGE));
  const capacidadDiariaProducto = moldes_disponibles * vueltas_max_dia;
  const diasEstimados = Math.ceil(cantidadConMerma / capacidadDiariaProducto);
  
  // Calculate estimated completion date (6 work days per week, skip Sundays)
  const today = new Date();
  let workDaysAdded = 0;
  let currentDate = new Date(today);
  
  while (workDaysAdded < diasEstimados) {
    currentDate.setDate(currentDate.getDate() + 1);
    const dayOfWeek = currentDate.getDay();
    // Skip Sundays (0), work Monday (1) through Saturday (6) = 6 days per week
    if (dayOfWeek !== 0) {
      workDaysAdded++;
    }
  }
  
  return {
    dias_estimados: diasEstimados,
    fecha_estimada_completion: currentDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }),
    limitado_por_moldes: moldes_disponibles === 0,
    capacidad_diaria: capacidadDiariaProducto,
    moldes_disponibles: moldes_disponibles
  };
};

// Memoized summary stats component
const SummaryStats = React.memo(({ cotizaciones }: { cotizaciones: CotizacionActiva[] }) => {
  const stats = useMemo(() => {
    const totalCotizaciones = cotizaciones.length;
    const totalPiezas = cotizaciones.reduce((sum, cotizacion) => sum + cotizacion.total_piezas, 0);
    
    // Calculate urgency levels
    const urgentCount = cotizaciones.filter(c => 
      c.cronograma && c.cronograma.dias_totales_estimados <= 3
    ).length;
    
    const thisWeekCount = cotizaciones.filter(c => 
      c.cronograma && c.cronograma.dias_totales_estimados > 3 && c.cronograma.dias_totales_estimados <= 7
    ).length;

    const complexCount = cotizaciones.filter(c => 
      c.cronograma && c.cronograma.productos_limitados_por_moldes > 0
    ).length;
    
    return { 
      totalCotizaciones, 
      totalPiezas, 
      urgentCount,
      thisWeekCount,
      complexCount 
    };
  }, [cotizaciones]);

  if (stats.totalCotizaciones === 0) return null;

  return (
    <div className="grid grid-cols-4 gap-3 p-3 bg-gray-50/50 border border-gray-200 rounded-lg">
      <div className="text-center">
        <div className="text-lg font-semibold text-gray-900">{stats.totalCotizaciones}</div>
        <div className="text-xs text-gray-500">En producción</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-semibold text-gray-900">{stats.totalPiezas.toLocaleString()}</div>
        <div className="text-xs text-gray-500">Piezas total</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-semibold text-red-600">{stats.urgentCount}</div>
        <div className="text-xs text-gray-500">Urgentes</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-semibold text-orange-600">{stats.complexCount}</div>
        <div className="text-xs text-gray-500">Requieren moldes</div>
      </div>
    </div>
  );
});

SummaryStats.displayName = 'SummaryStats';

// Memoized product row component with timeline info
const ProductRow = React.memo(({ 
  producto, 
  index, 
  onProductClick 
}: { 
  producto: ProductoConEstatus; 
  index: number;
  onProductClick?: (producto: ProductoConEstatus) => void;
}) => {
  // Check if product already has all needed pieces in empaque for this cotización
  const cantidadEnEmpaque = producto.empaque_status?.cantidad_empaque || 0;
  const cantidadPedida = producto.cantidad || 0;
  const allPiecesInEmpaque = cantidadEnEmpaque >= cantidadPedida;
  
  const canClickToEmpaque = !producto.allocation_status?.limite_alcanzado && 
                           producto.produccion_status.terminado_disponible > 0 &&
                           !allPiecesInEmpaque;
  
  const timeline = producto.timeline;
  
  return (
    <TableRow 
      className={`${canClickToEmpaque ? 'hover:bg-blue-50/50 cursor-pointer' : 'cursor-not-allowed opacity-60'} transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
      onClick={() => canClickToEmpaque && onProductClick?.(producto)}
      title={!canClickToEmpaque ? 
        (producto.allocation_status?.limite_alcanzado ? 
         `Límite alcanzado: ${producto.allocation_status.total_asignado}/${producto.allocation_status.cantidad_cotizacion} asignados` :
         allPiecesInEmpaque ?
         `Todos los productos ya están en empaque: ${cantidadEnEmpaque}/${cantidadPedida}` :
         'Sin productos terminados disponibles'
        ) : 'Click para mover a empaque'}
    >
      <TableCell className="px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-900">{producto.nombre}</span>
          {producto.allocation_status?.limite_alcanzado && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
              Límite
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="px-3 py-2 text-center">
        <div className="space-y-1">
          {/* Show remaining quantity that still needs to be produced */}
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
            (producto.cantidad_pendiente || 0) > 0 
              ? 'bg-amber-100 text-amber-700' 
              : 'bg-green-100 text-green-700'
          }`}>
            {producto.cantidad_pendiente || 0} restantes
          </span>
          {/* Show breakdown of original quantity */}
          <div className="text-xs text-gray-500 space-y-0.5">
            <div>Original: {producto.cantidad}</div>
            {producto.allocation_status && producto.allocation_status.total_asignado > 0 && (
              <div>Empacado: {producto.allocation_status.total_asignado}</div>
            )}
            {producto.produccion_status?.total_en_pipeline > 0 && (
              <div>En proceso: {producto.produccion_status.total_en_pipeline}</div>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="px-3 py-2 text-center">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
          {timeline?.moldes_disponibles || 0}
        </span>
      </TableCell>
      <TableCell className="px-3 py-2 text-center">
        {timeline ? (
          <span className="text-xs font-medium text-blue-700">
            {timeline.dias_estimados === 999 ? '-' : `${timeline.dias_estimados} días`}
          </span>
        ) : (
          <span className="text-xs text-gray-400">Calculando...</span>
        )}
      </TableCell>
      <TableCell className="px-3 py-2 text-center">
        {timeline ? (
          <span className="text-xs text-gray-600">
            {timeline.fecha_estimada_completion === 'Sin moldes' ? '-' : timeline.fecha_estimada_completion}
          </span>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        )}
      </TableCell>
    </TableRow>
  );
});

ProductRow.displayName = 'ProductRow';

// Memoized production status row component
const ProductionStatusRow = React.memo(({ producto, index }: { producto: ProductoConEstatus; index: number }) => {
  const getStatusBadgeClass = (value: number) => {
    if (value > 0) return 'bg-gray-900 text-white';
    return 'bg-gray-100 text-gray-400';
  };

  return (
    <TableRow className={`hover:bg-gray-50/50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
      <TableCell className="px-3 py-2">
        <span className="text-xs font-medium text-gray-900">{producto.nombre}</span>
      </TableCell>
      <TableCell className="px-3 py-2 text-center">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getStatusBadgeClass(producto.produccion_status.por_detallar)}`}>
          {producto.produccion_status.por_detallar}
        </span>
      </TableCell>
      <TableCell className="px-3 py-2 text-center">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getStatusBadgeClass(producto.produccion_status.detallado)}`}>
          {producto.produccion_status.detallado}
        </span>
      </TableCell>
      <TableCell className="px-3 py-2 text-center">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getStatusBadgeClass(producto.produccion_status.sancocho)}`}>
          {producto.produccion_status.sancocho}
        </span>
      </TableCell>
      <TableCell className="px-3 py-2 text-center">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getStatusBadgeClass(producto.produccion_status.terminado)}`}>
          {producto.produccion_status.terminado}
        </span>
      </TableCell>
    </TableRow>
  );
});

ProductionStatusRow.displayName = 'ProductionStatusRow';

export const ProduccionActivaSection = React.memo(() => {
  // State management
  const [cotizaciones, setCotizaciones] = useState<CotizacionActiva[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Expansion state for cotizaciones (like Pedidos section)
  const [expandedCotizaciones, setExpandedCotizaciones] = useState<Set<number>>(new Set());
  
  // Dialog state for empaque
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductoConEstatus | null>(null);
  const [selectedCotizacionId, setSelectedCotizacionId] = useState<number>(0);
  
  // Dialog state for enviados
  const [enviadosDialogOpen, setEnviadosDialogOpen] = useState<boolean>(false);
  const [selectedEmpaqueProduct, setSelectedEmpaqueProduct] = useState<{
    nombre: string;
    producto_id: number;
    cantidad_empaque: number;
  } | null>(null);
  
  // Empaque and enviados data by cotizacion
  const [empaqueDataMap, setEmpaqueDataMap] = useState<Map<number, any>>(new Map());
  const [enviadosDataMap, setEnviadosDataMap] = useState<Map<number, EnviadosProduct[]>>(new Map());
  const [enviadosBoxDataMap, setEnviadosBoxDataMap] = useState<Map<number, { total_cajas_chicas: number; total_cajas_grandes: number; }>>(new Map());
  const [productionStatusDataMap, setProductionStatusDataMap] = useState<Map<number, ProductoConEstatus[]>>(new Map());

  // Debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Filtered cotizaciones based on search
  const filteredCotizaciones = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return cotizaciones;
    
    const term = debouncedSearchTerm.toLowerCase();
    return cotizaciones.filter(cotizacion =>
      cotizacion.folio.toLowerCase().includes(term) ||
      cotizacion.cliente.toLowerCase().includes(term) ||
      cotizacion.productos.some(p => p.nombre.toLowerCase().includes(term))
    );
  }, [cotizaciones, debouncedSearchTerm]);

  // Fetch cotizaciones that are actually in active production (have products in production_queue)
  const fetchCotizaciones = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && Date.now() - performance.now() < 30000) return; // Cache for 30 seconds
    
    setLoading(true);
    setError(null);
    
    try {
      // First, quickly check if there are any cotizaciones in active production using the simpler API
      const activeResponse = await fetch('/api/production/cotizaciones-activas');
      
      if (!activeResponse.ok && activeResponse.status !== 404) {
        throw new Error(`Error del servidor (${activeResponse.status})`);
      }
      
      const activeResult = await activeResponse.json();
      
      // If no active cotizaciones, show empty state immediately
      if (!activeResult.data || activeResult.data.length === 0) {
        console.log('[ProduccionActivaSection] No cotizaciones in active production');
        setCotizaciones([]);
        setLoading(false);
        return;
      }
      
      // If we have active cotizaciones, get the detailed cronograma data
      const response = await fetch('/api/production/cronograma');
      
      if (!response.ok) {
        throw new Error(`Error del servidor (${response.status})`);
      }
      
      const result = await response.json();
      
      // Handle empty state from cronograma API
      if (!result.cotizaciones || result.cotizaciones.length === 0) {
        console.log('[ProduccionActivaSection] No cronograma data available');
        setCotizaciones([]);
        setLoading(false);
        return;
      }
      
      // Process cotizaciones with cronograma calculations
      const cotizacionesWithTimeline = result.cotizaciones.map((cotizacion: any) => {
        // Add cronograma timeline calculations to each product
        const productosWithTimeline = cotizacion.productos.map((producto: any) => {
          const timeline = calculateProductTimeline(producto);
          return {
            ...producto,
            timeline,
            // Ensure consistent data structure for ProductRow
            cantidad: producto.cantidad_pedida || producto.cantidad || 0,
            cantidad_pedida: producto.cantidad_pedida || producto.cantidad || 0,
            cantidad_pendiente: producto.cantidad_pendiente || 0,
            cantidad_asignada: producto.cantidad_asignada || 0,
            precio_venta: producto.precio_venta || 0,
            precio_total: (producto.precio_venta || 0) * (producto.cantidad_pedida || producto.cantidad || 0),
            fecha: cotizacion.fecha_creacion?.split('T')[0] || new Date().toISOString().split('T')[0],
            // Add default empaque_status if missing
            empaque_status: producto.empaque_status || {
              cantidad_empaque: 0
            },
            // Add default allocation_status if missing
            allocation_status: producto.allocation_status || {
              cantidad_cotizacion: producto.cantidad_pedida || producto.cantidad || 0,
              total_asignado: producto.cantidad_asignada || 0,
              cantidad_disponible: Math.max(0, (producto.cantidad_pedida || producto.cantidad || 0) - (producto.cantidad_asignada || 0)),
              limite_alcanzado: false
            },
            // Ensure production status has terminado_disponible
            produccion_status: {
              ...producto.produccion_status,
              terminado_disponible: producto.produccion_status?.terminado || 0
            }
          };
        });
        
        // Calculate overall cotizacion cronograma
        const latestDate = productosWithTimeline
          .map((p: any) => p.timeline?.fecha_estimada_completion || new Date().toISOString().split('T')[0])
          .sort()
          .pop() || new Date().toISOString().split('T')[0];
        
        const limitadosPorMoldes = productosWithTimeline
          .filter((p: any) => p.timeline?.limitado_por_moldes).length;
        
        const diasTotales = Math.max(...productosWithTimeline
          .map((p: any) => p.timeline?.dias_estimados || 0));
        
        return {
          ...cotizacion,
          productos: productosWithTimeline,
          cronograma: {
            fecha_estimada_completion: latestDate,
            dias_totales_estimados: diasTotales,
            productos_limitados_por_moldes: limitadosPorMoldes
          }
        };
      });
      
      setCotizaciones(cotizacionesWithTimeline);
    } catch (error: any) {
      console.error('Error fetching cotizaciones:', error);
      setError(error.message);
      // Only show toast error for unexpected errors, not for empty states
      if (!error.message.includes('404') && !error.message.includes('No cotizaciones')) {
        toast.error('Error al cargar cotizaciones activas');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    fetchCotizaciones(true);
  }, [fetchCotizaciones]);

  // Fetch empaque data for a specific cotizacion
  const fetchEmpaqueData = useCallback(async (cotizacionId: number) => {
    try {
      const response = await fetch(`/api/production/empaque?cotizacion_id=${cotizacionId}`);
      if (response.ok) {
        const data = await response.json();
        setEmpaqueDataMap(prev => new Map(prev.set(cotizacionId, data)));
      }
    } catch (error) {
      console.error('Error fetching empaque data:', error);
    }
  }, []);

  // Fetch enviados data for a specific cotizacion
  const fetchEnviadosData = useCallback(async (cotizacionId: number) => {
    try {
      const response = await fetch(`/api/production/enviados?cotizacion_id=${cotizacionId}`);
      if (response.ok) {
        const result: EnviadosResponse = await response.json();
        setEnviadosDataMap(prev => new Map(prev.set(cotizacionId, result.data.productos_enviados || [])));
        setEnviadosBoxDataMap(prev => new Map(prev.set(cotizacionId, {
          total_cajas_chicas: result.data.total_cajas_chicas || 0,
          total_cajas_grandes: result.data.total_cajas_grandes || 0
        })));
      }
    } catch (error) {
      console.error('Error fetching enviados data:', error);
    }
  }, []);

  // Fetch production status data for a specific cotizacion
  const fetchProductionStatusData = useCallback(async (cotizacionId: number) => {
    console.log('[ProduccionActiva] fetchProductionStatusData called for:', cotizacionId);
    try {
      const url = `/api/production/clientes-activos/${cotizacionId}`;
      console.log('[ProduccionActiva] Making request to:', url);
      const response = await fetch(url);
      console.log('[ProduccionActiva] Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('[ProduccionActiva] Production status data received:', result);
        if (result.data && result.data.productos) {
          console.log('[ProduccionActiva] Setting production status data for cotizacion:', cotizacionId, result.data.productos);
          // Debug specific ZOMBIE product allocation for cotizacion 2396
          if (cotizacionId === 2396) {
            const zombieProduct = result.data.productos.find((p: any) => p.nombre === 'ZOMBIE');
            if (zombieProduct) {
              console.log('[DEBUG CLIENT] ZOMBIE product data for cotizacion 2396:', {
                nombre: zombieProduct.nombre,
                cantidad: zombieProduct.cantidad,
                produccion_status: zombieProduct.produccion_status,
                allocation_status: zombieProduct.allocation_status,
                empaque_status: zombieProduct.empaque_status
              });
            }
          }
          setProductionStatusDataMap(prev => new Map(prev.set(cotizacionId, result.data.productos)));
        }
      } else {
        console.error('[ProduccionActiva] Response not ok:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('[ProduccionActiva] Error fetching production status data:', error);
    }
  }, []);

  // Toggle cotizacion expansion (like Pedidos section)
  const toggleCotizacion = useCallback((cotizacionId: number) => {
    console.log('[ProduccionActiva] toggleCotizacion called for:', cotizacionId);
    setExpandedCotizaciones(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cotizacionId)) {
        console.log('[ProduccionActiva] Collapsing cotizacion:', cotizacionId);
        newSet.delete(cotizacionId);
      } else {
        console.log('[ProduccionActiva] Expanding cotizacion:', cotizacionId);
        newSet.add(cotizacionId);
        // Fetch empaque, enviados, and production status data for this cotizacion when expanded
        console.log('[ProduccionActiva] Fetching data for cotizacion:', cotizacionId);
        fetchEmpaqueData(cotizacionId);
        fetchEnviadosData(cotizacionId);
        fetchProductionStatusData(cotizacionId);
      }
      return newSet;
    });
  }, [fetchEmpaqueData, fetchEnviadosData, fetchProductionStatusData]);

  // Handle product click to open empaque dialog
  const handleProductClick = useCallback((producto: ProductoConEstatus, cotizacionId: number) => {
    setSelectedProduct(producto);
    setSelectedCotizacionId(cotizacionId);
    setDialogOpen(true);
  }, []);

  // Handle dialog success (refresh data)
  const handleDialogSuccess = useCallback(() => {
    fetchCotizaciones(true); // Force refresh to get updated data
    
    // Also refresh empaque data for the selected cotizacion
    if (selectedCotizacionId) {
      fetchEmpaqueData(selectedCotizacionId);
      fetchEnviadosData(selectedCotizacionId);
      fetchProductionStatusData(selectedCotizacionId);
    }
    
    // Also dispatch update event for other sections
    if (selectedProduct) {
      dispatchProductionUpdate({
        type: 'empaque_update',
        producto_id: selectedProduct.producto_id,
        timestamp: Date.now(),
        source: 'produccion-activa-empaque'
      });
    }
  }, [fetchCotizaciones, selectedCotizacionId, selectedProduct, fetchEmpaqueData, fetchEnviadosData, fetchProductionStatusData]);

  // Handle empaque product removal (needs different refresh logic)
  const handleEmpaqueProductRemoved = useCallback((cotizacionId: number) => {
    console.log('[ProduccionActiva] handleEmpaqueProductRemoved for cotizacion:', cotizacionId);
    
    // Refresh all data for this cotizacion
    fetchEmpaqueData(cotizacionId);
    fetchEnviadosData(cotizacionId);
    fetchProductionStatusData(cotizacionId);
    
    // Also refresh cronograma data
    fetchCotizaciones(true);
  }, [fetchEmpaqueData, fetchEnviadosData, fetchProductionStatusData, fetchCotizaciones]);

  // Handle empaque product click to move to enviados
  const handleEmpaqueProductClick = useCallback((producto: any, cotizacionId: number) => {
    setSelectedEmpaqueProduct({
      nombre: producto.nombre,
      producto_id: producto.producto_id || 0,
      cantidad_empaque: producto.cantidad
    });
    setSelectedCotizacionId(cotizacionId);
    setEnviadosDialogOpen(true);
  }, []);

  // Handle enviados dialog success
  const handleEnviadosDialogSuccess = useCallback(() => {
    fetchCotizaciones(true); // Force refresh to get updated data
    
    // Also refresh enviados data for the selected cotizacion
    if (selectedCotizacionId) {
      fetchEmpaqueData(selectedCotizacionId);
      fetchEnviadosData(selectedCotizacionId);
      fetchProductionStatusData(selectedCotizacionId);
    }
    
    // Dispatch update event for other sections
    if (selectedEmpaqueProduct) {
      dispatchProductionUpdate({
        type: 'enviados_update',
        producto_id: selectedEmpaqueProduct.producto_id,
        timestamp: Date.now(),
        source: 'produccion-activa-enviados'
      });
    }
  }, [fetchCotizaciones, selectedCotizacionId, selectedEmpaqueProduct, fetchEmpaqueData, fetchEnviadosData, fetchProductionStatusData]);

  // Handle empaque data updates
  const handleEmpaqueDataUpdated = useCallback((updatedData: any, cotizacionId: number) => {
    setEmpaqueDataMap(prev => new Map(prev.set(cotizacionId, updatedData)));
  }, []);

  // Listen for production updates from other sections
  useEffect(() => {
    const cleanup = useProductionSync((event) => {
      // Refresh when products are updated
      console.log('Auto-refreshing produccion activa due to production update:', event);
      handleRefresh();
    });

    return cleanup;
  }, [handleRefresh]);

  // Initial load
  useEffect(() => {
    fetchCotizaciones();
  }, [fetchCotizaciones]);

  return (
    <div className="space-y-4">
      {/* Header with search and refresh */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Producción Activa</h1>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 pr-3 w-48 h-9 text-sm border-gray-300 rounded-lg focus:border-gray-400 focus:ring-0"
            />
          </div>
          <Button
            onClick={handleRefresh}
            disabled={loading}
            variant="outline"
            size="sm"
            className="h-9 px-3 border-gray-300 hover:bg-gray-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {!loading && filteredCotizaciones.length > 0 && (
        <SummaryStats cotizaciones={filteredCotizaciones} />
      )}

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Cargando cotizaciones en producción...</p>
        </div>
      )}

      {/* Cotizaciones List (like Pedidos section) */}
      {!loading && filteredCotizaciones.length > 0 && (
        <div className="space-y-3">
          {filteredCotizaciones.map((cotizacion) => (
            <div key={cotizacion.cotizacion_id} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
              {/* Cotizacion Header - Clickable to expand/collapse */}
              <div 
                className="px-4 py-3 border-b border-gray-200 bg-white hover:bg-gray-50/50 cursor-pointer transition-colors"
                onClick={() => toggleCotizacion(cotizacion.cotizacion_id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {expandedCotizaciones.has(cotizacion.cotizacion_id) ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{cotizacion.cliente}</div>
                        <div className="text-xs text-gray-500">{cotizacion.total_piezas} productos</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(() => {
                      // Calculate urgency based on cronograma
                      const daysLeft = cotizacion.cronograma?.dias_totales_estimados || 0;
                      const isComplex = cotizacion.cronograma?.productos_limitados_por_moldes > 0;
                      
                      if (daysLeft >= 999) {
                        // Don't show timeline for products without moldes
                        return null;
                      } else if (daysLeft <= 3) {
                        return (
                          <Badge className="text-xs bg-red-50 text-red-700 border-red-200 hover:bg-red-100">
                            Urgente
                          </Badge>
                        );
                      } else if (daysLeft <= 7) {
                        return (
                          <Badge className="text-xs bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100">
                            Esta semana
                          </Badge>
                        );
                      } else {
                        return (
                          <Badge className="text-xs bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
                            {daysLeft}d restantes
                          </Badge>
                        );
                      }
                    })()}
                    {cotizacion.cronograma?.productos_limitados_por_moldes > 0 && (
                      <Badge className="text-xs bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100">
                        Requiere moldes
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Content - 4 Tables Layout */}
              {expandedCotizaciones.has(cotizacion.cotizacion_id) && (
                <div className="p-4 space-y-4">
                  {/* Top Tables Side by Side */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Products Table with Timeline - Left */}
                    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                      <div className="px-3 py-2 border-b border-gray-200 bg-gray-50/50">
                        <h3 className="text-xs font-medium text-gray-700 flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          Detalle de Productos con Cronograma
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50/50 border-b border-gray-200">
                              <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 h-8">Producto</TableHead>
                              <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center h-8">Cantidad</TableHead>
                              <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center h-8">Moldes</TableHead>
                              <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center h-8">Días</TableHead>
                              <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center h-8">Fecha Entrega</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="[&_tr:last-child]:border-0">
                            {cotizacion.productos.map((producto, index) => {
                              // Get production status data for enhanced product info
                              const productionStatusData = productionStatusDataMap.get(cotizacion.cotizacion_id) || [];
                              const statusProduct = productionStatusData.find(p => p.producto_id === producto.producto_id);
                              
                              // Merge data from both sources, prioritizing cronograma for business data
                              const enhancedProduct = {
                                ...producto, // Start with cronograma data (has pricing)
                                // Override production status if available from production API
                                produccion_status: statusProduct?.produccion_status || producto.produccion_status,
                                empaque_status: statusProduct?.empaque_status || producto.empaque_status,
                                allocation_status: statusProduct?.allocation_status || producto.allocation_status,
                                // Ensure we have pricing data
                                precio_venta: producto.precio_venta || statusProduct?.precio_venta || 0,
                                precio_total: producto.precio_total || statusProduct?.precio_total || 0,
                              };
                              
                              return (
                                <ProductRow
                                  key={`${producto.nombre}-${index}`}
                                  producto={enhancedProduct}
                                  index={index}
                                  onProductClick={(producto) => handleProductClick(producto, cotizacion.cotizacion_id)}
                                />
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* Production Status Table - Right */}
                    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                      <div className="px-3 py-2 border-b border-gray-200 bg-gray-50/50">
                        <h3 className="text-xs font-medium text-gray-700">Estado de Producción</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50/50 border-b border-gray-200">
                              <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 h-8">Producto</TableHead>
                              <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center h-8">Por Detallar</TableHead>
                              <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center h-8">Detallado</TableHead>
                              <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center h-8">Sancocho</TableHead>
                              <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center h-8">Terminado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="[&_tr:last-child]:border-0">
                            {cotizacion.productos.map((producto, index) => (
                              <ProductionStatusRow
                                key={`status-${producto.nombre}-${index}`}
                                producto={producto}
                                index={index}
                              />
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Tables Side by Side */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <EmpaqueTable
                      productos={(() => {
                        // Get production status data for this cotizacion which has empaque_status
                        const productionStatusData = productionStatusDataMap.get(cotizacion.cotizacion_id) || [];
                        const filteredProducts = productionStatusData
                          .filter(p => p.empaque_status && p.empaque_status.cantidad_empaque > 0)
                          .map(p => ({
                            nombre: p.nombre,
                            cantidad: p.empaque_status?.cantidad_empaque || 0,
                            producto_id: p.producto_id
                          }));
                        
                        console.log('[ProduccionActiva] EmpaqueTable productos for cotizacion', cotizacion.cotizacion_id, ':', filteredProducts);
                        return filteredProducts;
                      })()}
                      cotizacionId={cotizacion.cotizacion_id}
                      isLoading={false}
                      onProductRemoved={() => handleEmpaqueProductRemoved(cotizacion.cotizacion_id)}
                      onProductMoved={(producto) => handleEmpaqueProductClick(producto, cotizacion.cotizacion_id)}
                      empaqueData={empaqueDataMap.get(cotizacion.cotizacion_id)}
                      onEmpaqueDataUpdated={(data) => handleEmpaqueDataUpdated(data, cotizacion.cotizacion_id)}
                    />
                    <EnviadosTable
                      productos={enviadosDataMap.get(cotizacion.cotizacion_id) || []}
                      isLoading={false}
                      totalCajasChicas={enviadosBoxDataMap.get(cotizacion.cotizacion_id)?.total_cajas_chicas || 0}
                      totalCajasGrandes={enviadosBoxDataMap.get(cotizacion.cotizacion_id)?.total_cajas_grandes || 0}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No Data State */}
      {!loading && filteredCotizaciones.length === 0 && !error && (
        <div className="text-center py-16 text-gray-500">
          <Factory className="h-8 w-8 text-gray-300 mx-auto mb-4" />
          <h3 className="text-sm font-medium text-gray-700 mb-2">No hay cotizaciones en producción</h3>
          <p className="text-xs text-gray-500">
            Mueve cotizaciones desde Pedidos para comenzar la producción
          </p>
        </div>
      )}

      {/* Dialogs */}
      {selectedProduct && selectedCotizacionId && (
        <MoveToEmpaqueDialog
          isOpen={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setSelectedProduct(null);
            setSelectedCotizacionId(0);
          }}
          producto={{
            nombre: selectedProduct.nombre,
            producto_id: selectedProduct.producto_id,
            cantidad_solicitada: selectedProduct.cantidad,
            terminado_disponible: selectedProduct.produccion_status.terminado_disponible,
            allocation_status: selectedProduct.allocation_status || {
              cantidad_cotizacion: selectedProduct.cantidad,
              total_asignado: 0,
              cantidad_disponible: selectedProduct.cantidad,
              limite_alcanzado: false
            }
          }}
          cotizacion_id={selectedCotizacionId}
          onSuccess={handleDialogSuccess}
        />
      )}

      {selectedEmpaqueProduct && selectedCotizacionId && (
        <MoveToEnviadosDialog
          isOpen={enviadosDialogOpen}
          onClose={() => {
            setEnviadosDialogOpen(false);
            setSelectedEmpaqueProduct(null);
            setSelectedCotizacionId(0);
          }}
          producto={{
            nombre: selectedEmpaqueProduct.nombre,
            producto_id: selectedEmpaqueProduct.producto_id,
            cantidad_empaque: selectedEmpaqueProduct.cantidad_empaque
          }}
          cotizacion_id={selectedCotizacionId}
          onSuccess={handleEnviadosDialogSuccess}
        />
      )}
    </div>
  );
});

ProduccionActivaSection.displayName = 'ProduccionActivaSection';