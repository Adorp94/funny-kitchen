"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Search, AlertTriangle, Clock, Calendar, CheckCircle2, ChevronDown, ChevronRight as ChevronRightIcon, User, Package, Plus } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from "sonner";

interface PedidoItem {
  folio: string;
  cliente: string;
  producto: string;
  producto_id?: number;
  cantidad: number;
  fecha: string;
  precio_venta: number;
  estimated_delivery_date?: string;
  days_until_delivery?: number;
  is_premium?: boolean;
  inventory_status?: {
    terminado_disponible: number;
    availability: 'sufficient' | 'partial' | 'none';
    can_skip_production: boolean;
    production_needed: number;
  };
  production_status?: {
    is_in_production: boolean;
    pedidos: number;
    por_detallar: number;
    detallado: number;
    sancocho: number;
    terminado: number;
    stage: 'no_production' | 'por_detallar' | 'detallado' | 'sancocho' | 'terminado';
  };
}

interface SelectedCotizacion {
  folio: string;
  cliente: string;
  productos: Array<{
    producto_id: number;
    producto_nombre: string;
    cantidad: number;
    has_moldes: boolean;
    inventory_status?: {
      terminado_disponible: number;
      availability: 'sufficient' | 'partial' | 'none';
      can_skip_production: boolean;
      production_needed: number;
    };
  }>;
}

interface PedidosResponse {
  data: PedidoItem[];
  total: number;
  returned: number;
  filters: {
    status: string;
    limit: number | null;
  };
}


interface MoldeInfo {
  producto_id: number;
  total_moldes: number;
  mesas: Array<{
    nombre: string;
    cantidad: number;
  }>;
}

// Debounce hook for search optimization
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Helper function to get inventory badge colors - modern soft palette
const getInventoryBadgeColor = (availability: 'sufficient' | 'partial' | 'none' | undefined) => {
  switch (availability) {
    case 'sufficient':
      return 'text-emerald-700 bg-emerald-100 border-emerald-300'; // More visible emerald
    case 'partial':
      return 'text-amber-700 bg-amber-100 border-amber-300'; // More visible amber
    case 'none':
      return 'text-rose-700 bg-rose-100 border-rose-300'; // More visible rose
    default:
      return 'text-gray-700 bg-gray-100 border-gray-300'; // Default gray
  }
};

// Helper function to get inventory tooltip text
const getInventoryTooltip = (pedido: PedidoItem & { moldesInfo: any; hasMoldes: boolean }) => {
  if (!pedido.inventory_status) return '';
  
  const { terminado_disponible, availability, production_needed } = pedido.inventory_status;
  
  switch (availability) {
    case 'sufficient':
      return `✅ Inventario suficiente: ${terminado_disponible}/${pedido.cantidad} disponibles. Puede ir directo a empaque.`;
    case 'partial':
      return `⚠️ Inventario parcial: ${terminado_disponible}/${pedido.cantidad} disponibles. Necesita producir ${production_needed} más.`;
    case 'none':
      return `🔴 Sin inventario: 0/${pedido.cantidad} disponibles. Necesita producir todas las ${pedido.cantidad} piezas.`;
    default:
      return '';
  }
};

// Memoized summary stats component
const SummaryStats = React.memo(({ pedidos, selectedCount }: { pedidos: PedidoItem[]; selectedCount: number }) => {
  const stats = useMemo(() => {
    const totalProductos = pedidos.length; // This is the count of individual products
    const totalCotizaciones = new Set(pedidos.map(pedido => pedido.folio)).size; // Unique cotizaciones
    const totalPiezas = pedidos.reduce((sum, pedido) => sum + pedido.cantidad, 0);
    const uniqueClientes = new Set(pedidos.map(pedido => pedido.cliente)).size;
    const uniqueProductos = new Set(pedidos.map(pedido => pedido.producto)).size;
    const totalValue = pedidos.reduce((sum, pedido) => sum + (pedido.cantidad * pedido.precio_venta), 0);
    
    return { totalCotizaciones, totalProductos, totalPiezas, uniqueClientes, uniqueProductos, totalValue };
  }, [pedidos]);

  return (
    <div className="grid grid-cols-4 gap-4 p-3 bg-muted/30 border rounded-lg">
      <div className="text-center">
        <div className="text-sm font-semibold text-foreground">{stats.totalCotizaciones}</div>
        <div className="text-xs text-muted-foreground">Cotizaciones</div>
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold text-foreground">{stats.totalPiezas.toLocaleString()}</div>
        <div className="text-xs text-muted-foreground">Piezas</div>
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold text-foreground">{stats.totalProductos}</div>
        <div className="text-xs text-muted-foreground">Productos</div>
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold text-foreground">{selectedCount}</div>
        <div className="text-xs text-muted-foreground">Seleccionados</div>
      </div>
    </div>
  );
});

SummaryStats.displayName = 'SummaryStats';

export const PedidosSection: React.FC = React.memo(() => {
  const [pedidos, setPedidos] = useState<PedidoItem[]>([]);
  const [moldesData, setMoldesData] = useState<Record<number, MoldeInfo>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [expandedCotizaciones, setExpandedCotizaciones] = useState<Set<string>>(new Set());
  const [lastFetch, setLastFetch] = useState<number>(0);
  const [selectedCotizaciones, setSelectedCotizaciones] = useState<Map<string, SelectedCotizacion>>(new Map());
  
  // Allocation dialog states
  const [showAllocationDialog, setShowAllocationDialog] = useState<boolean>(false);
  const [allocationData, setAllocationData] = useState<{
    cotizaciones: SelectedCotizacion[];
    totalCotizaciones: number;
    totalProducts: number;
    canSkipProduction: number;
    needsProduction: number;
    needsMoldes: Array<{ producto_nombre: string; folio: string }>;
    productsWithInventory: Array<{
      folio: string;
      producto_id: number;
      producto_nombre: string;
      cantidad_necesaria: number;
      inventario_disponible: number;
      cantidad_a_empaque: number; // User can modify this
      ir_a_empaque: boolean; // User can opt-out
    }>;
  } | null>(null);
  const [isProcessingAllocation, setIsProcessingAllocation] = useState<boolean>(false);

  // Debounced search term to reduce filtering frequency
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Group and filter pedidos by cotización
  const groupedPedidos = useMemo(() => {
    let filtered = pedidos;
    
    // Apply search filter
    if (debouncedSearchTerm.trim()) {
      const term = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(pedido => 
        pedido.cliente.toLowerCase().includes(term) ||
        pedido.producto.toLowerCase().includes(term) ||
        pedido.folio.toLowerCase().includes(term)
      );
    }
    
    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(pedido => {
        const days = pedido.days_until_delivery;
        if (days === undefined || days === null) return false;
        
        switch (priorityFilter) {
          case 'overdue': return days < 0;
          case 'urgent': return days >= 0 && days <= 7;
          case 'medium': return days > 7 && days <= 14;
          case 'low': return days > 14;
          default: return true;
        }
      });
    }
    
    // Group by folio
    const grouped = filtered.reduce((acc, pedido) => {
      if (!acc[pedido.folio]) {
        acc[pedido.folio] = {
          folio: pedido.folio,
          cliente: pedido.cliente,
          fecha: pedido.fecha,
          productos: []
        };
      }
      
      acc[pedido.folio].productos.push({
        ...pedido,
        moldesInfo: pedido.producto_id ? moldesData[pedido.producto_id] : null,
        hasMoldes: pedido.producto_id ? (moldesData[pedido.producto_id]?.total_moldes || 0) > 0 : false
      });
      
      return acc;
    }, {} as Record<string, {
      folio: string;
      cliente: string;
      fecha: string;
      productos: (PedidoItem & { moldesInfo: MoldeInfo | null; hasMoldes: boolean })[];
    }>);
    
    return Object.values(grouped);
  }, [pedidos, debouncedSearchTerm, priorityFilter, moldesData]);

  // Calculate filtered pedidos for stats
  const filteredPedidos = useMemo(() => {
    return groupedPedidos.flatMap(group => group.productos);
  }, [groupedPedidos]);

  // Handle cotization selection toggle - now works at cotization level
  const handleCotizacionToggle = useCallback((cotizacionData: {
    folio: string;
    cliente: string;
    productos: (PedidoItem & { moldesInfo: MoldeInfo | null; hasMoldes: boolean })[];
  }) => {
    // Check if any product is already in production
    const productsInProduction = cotizacionData.productos.filter(p => p.production_status?.is_in_production);
    if (productsInProduction.length > 0) {
      toast.error(`Cotización ${cotizacionData.folio} tiene productos en Producción Activa`, {
        description: `${productsInProduction.length} productos ya están en producción`
      });
      return;
    }
    
    // Immediate UI update - no async operations
    setSelectedCotizaciones(prev => {
      const newMap = new Map(prev);
      
      if (newMap.has(cotizacionData.folio)) {
        newMap.delete(cotizacionData.folio);
      } else {
        newMap.set(cotizacionData.folio, {
          folio: cotizacionData.folio,
          cliente: cotizacionData.cliente,
          productos: cotizacionData.productos.map(p => ({
            producto_id: p.producto_id!,
            producto_nombre: p.producto,
            cantidad: p.cantidad,
            has_moldes: p.hasMoldes,
            inventory_status: p.inventory_status
          }))
        });
      }
      
      return newMap;
    });
  }, []);

  // Helper function to get production stage label
  const getProductionStageLabel = (stage: string) => {
    switch (stage) {
      case 'por_detallar': return 'Por Detallar';
      case 'detallado': return 'Detallado';
      case 'sancocho': return 'Sancocho';
      case 'terminado': return 'Terminado';
      case 'no_production': return 'Sin Producción';
      default: return 'Desconocido';
    }
  };


  // Fetch moldes data from productos table (inventory source)
  const fetchMoldesData = useCallback(async () => {
    try {
      const response = await fetch('/api/productos?pageSize=1000');
      if (!response.ok) throw new Error('Failed to fetch moldes data');
      
      const result = await response.json();
      const productos = result.data || [];
      const moldesMap: Record<number, MoldeInfo> = {};
      
      productos.forEach((producto: any) => {
        const productoId = producto.producto_id;
        const moldesDisponibles = producto.moldes_disponibles || 0;
        
        moldesMap[productoId] = {
          producto_id: productoId,
          total_moldes: moldesDisponibles,
          mesas: [] // Not applicable for inventory-based moldes
        };
      });
      
      setMoldesData(moldesMap);
    } catch (error) {
      console.error('Error fetching moldes data:', error);
    }
  }, []);

  // Optimized fetch function with caching and abort controller
  const fetchPedidos = useCallback(async (force = false) => {
    const now = Date.now();
    // Cache for 5 minutes unless forced
    if (!force && now - lastFetch < 300000 && pedidos.length > 0) {
      return;
    }

    setLoading(true);
    setError(null);
    
    const abortController = new AbortController();
    
    try {
      const response = await fetch('/api/production/pedidos', {
        signal: abortController.signal,
        headers: {
          'Cache-Control': 'max-age=300', // 5 minute cache
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: PedidosResponse = await response.json();
      const pedidosData = result.data || [];
      
      setPedidos(pedidosData);
      setLastFetch(now);
      
      if (pedidosData.length > 0) {
        toast.success(`${pedidosData.length} pedidos cargados exitosamente`);
      }
      
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Fetch aborted');
        return;
      }
      console.error("Error in fetchPedidos:", err);
      const errorMsg = err.message || "Error al cargar los pedidos.";
      setError(errorMsg);
      toast.error("Error al cargar pedidos", {
        description: errorMsg,
      });
    } finally {
      setLoading(false);
    }

    return () => {
      abortController.abort();
    };
  }, [lastFetch, pedidos.length]);

  const handleRefresh = useCallback(() => {
    fetchPedidos(true);
    fetchMoldesData();
  }, [fetchPedidos, fetchMoldesData]);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  // Prepare allocation analysis for cotization-level processing
  const prepareAllocationAnalysis = useCallback(async () => {
    if (selectedCotizaciones.size === 0) {
      toast.error("Selecciona al menos una cotización para procesar");
      return;
    }

    const selectedCotizacionesArray = Array.from(selectedCotizaciones.values());
    let totalProducts = 0;
    let canSkipProduction = 0;
    let needsProduction = 0;
    const needsMoldes: Array<{ producto_nombre: string; folio: string }> = [];
    const productsWithInventory: Array<{
      folio: string;
      producto_id: number;
      producto_nombre: string;
      cantidad_necesaria: number;
      inventario_disponible: number;
      cantidad_a_empaque: number;
      ir_a_empaque: boolean;
    }> = [];

    // Get unique product IDs to fetch fresh terminado data
    const allProductIds = [...new Set(
      selectedCotizacionesArray.flatMap(cot => 
        cot.productos.map(p => p.producto_id)
      )
    )];

    // Fetch fresh production_active data for accurate terminado inventory
    try {
      const response = await fetch('/api/production-active');
      if (!response.ok) throw new Error('Failed to fetch production data');
      
      const productionData = await response.json();
      console.log('[DEBUG] Production data response:', productionData);
      
      const terminadoMap = new Map<number, number>();
      
      // Create map of actual terminado inventory
      if (productionData.data) {
        productionData.data.forEach((item: any) => {
          console.log(`[DEBUG] Product ${item.producto_id}: terminado = ${item.terminado}`);
          terminadoMap.set(item.producto_id, item.terminado || 0);
        });
      }
      
      // Debug: Show what products we're checking
      allProductIds.forEach(productId => {
        const terminadoStock = terminadoMap.get(productId) || 0;
        console.log(`[DEBUG] Product ${productId} has ${terminadoStock} terminado stock available`);
      });

      // Analyze each cotization's products with fresh terminado data
      selectedCotizacionesArray.forEach(cotizacion => {
        cotizacion.productos.forEach(producto => {
          totalProducts++;
          
          // Check if product needs moldes
          if (!producto.has_moldes) {
            needsMoldes.push({
              producto_nombre: producto.producto_nombre,
              folio: cotizacion.folio
            });
          }
          
          // Use fresh terminado data instead of stale pedidos data
          const inventarioDisponible = terminadoMap.get(producto.producto_id) || 0;
          const cantidadNecesaria = producto.cantidad;
          
          if (inventarioDisponible > 0) {
            // Product has some inventory available
            const maxParaEmpaque = Math.min(inventarioDisponible, cantidadNecesaria);
            
            productsWithInventory.push({
              folio: cotizacion.folio,
              producto_id: producto.producto_id,
              producto_nombre: producto.producto_nombre,
              cantidad_necesaria: cantidadNecesaria,
              inventario_disponible: inventarioDisponible,
              cantidad_a_empaque: maxParaEmpaque, // Default to maximum possible
              ir_a_empaque: true // Default to enabled
            });
            
            if (inventarioDisponible >= cantidadNecesaria) {
              canSkipProduction++;
            } else {
              needsProduction++; // Still needs some production
            }
          } else {
            needsProduction++;
          }
        });
      });

    } catch (error) {
      console.error('Error fetching fresh production data:', error);
      toast.error('Error al obtener datos de producción actualizados');
      return;
    }

    setAllocationData({
      cotizaciones: selectedCotizacionesArray,
      totalCotizaciones: selectedCotizaciones.size,
      totalProducts,
      canSkipProduction,
      needsProduction,
      needsMoldes,
      productsWithInventory
    });
    setShowAllocationDialog(true);
  }, [selectedCotizaciones]);

  // Process inventory allocation for cotization-based processing
  const handleInventoryAllocation = useCallback(async () => {
    if (!allocationData) return;

    setIsProcessingAllocation(true);
    
    try {
      const response = await fetch('/api/production/process-cotizaciones-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ allocationData })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al procesar asignaciones');
      }

      const result = await response.json();
      
      if (result.success) {
        const { summary } = result;
        const empaqueCount = summary.total_empaque_allocations || 0;
        
        toast.success(
          `Procesamiento completado: ${summary.successful}/${summary.total_cotizaciones} cotizaciones procesadas`,
          {
            description: `${empaqueCount} asignaciones a empaque, ${summary.total_to_bitacora} productos a producción`
          }
        );

        // Show detailed summary if there are empaque allocations
        if (empaqueCount > 0) {
          const empaqueDetails = result.empaque_allocations?.map((a: any) => 
            `${a.cantidad} ${a.producto_nombre} (${a.folio})`
          ).join(', ');
          
          if (empaqueDetails) {
            toast.info(`Asignado a empaque: ${empaqueDetails}`, {
              duration: 8000
            });
          }
        }
      } else {
        throw new Error('Error en el procesamiento de cotizaciones');
      }
      
      // Clear selections and refresh data
      setSelectedCotizaciones(new Map());
      setShowAllocationDialog(false);
      setAllocationData(null);
      fetchPedidos(true);
      
    } catch (error: any) {
      console.error('Error processing allocation:', error);
      toast.error(`Error al procesar: ${error.message}`);
    } finally {
      setIsProcessingAllocation(false);
    }
  }, [allocationData, fetchPedidos]);


  // Toggle cotización expansion
  const toggleCotizacion = useCallback((folio: string) => {
    setExpandedCotizaciones(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folio)) {
        newSet.delete(folio);
      } else {
        newSet.add(folio);
      }
      return newSet;
    });
  }, []);

  // Expand all cotizaciones by default when data loads
  useEffect(() => {
    if (groupedPedidos.length > 0) {
      const folios = new Set(groupedPedidos.map(g => g.folio));
      setExpandedCotizaciones(folios);
    }
  }, [groupedPedidos]);

  // Initial load
  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      if (mounted) {
        await fetchPedidos();
        await fetchMoldesData();
      }
    };
    
    loadData();
    
    return () => {
      mounted = false;
    };
  }, [fetchPedidos, fetchMoldesData]);

  if (loading && pedidos.length === 0) {
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

  if (error && pedidos.length === 0) {
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
        <h2 className="text-sm font-medium text-foreground">Pedidos en Producción</h2>
        <div className="flex items-center gap-3">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue placeholder="Prioridad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="overdue">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3 text-destructive" />
                  Atrasados
                </div>
              </SelectItem>
              <SelectItem value="urgent">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3 text-orange-600" />
                  Urgente (&le;7d)
                </div>
              </SelectItem>
              <SelectItem value="medium">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-yellow-600" />
                  Medio (8-14d)
                </div>
              </SelectItem>
              <SelectItem value="low">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  Bajo (&gt;14d)
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Buscar pedidos..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
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
      <SummaryStats pedidos={filteredPedidos} selectedCount={selectedCotizaciones.size} />

      {/* Controls */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground">
            {groupedPedidos.length} cotizaciones • {filteredPedidos.length} productos
          </div>
          {groupedPedidos.length > 0 && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => {
                  const allFolios = new Set(groupedPedidos.map(g => g.folio));
                  setExpandedCotizaciones(allFolios);
                }}
              >
                Expandir todo
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setExpandedCotizaciones(new Set())}
              >
                Contraer todo
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={prepareAllocationAnalysis}
            disabled={selectedCotizaciones.size === 0}
            size="sm"
            className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Plus className="h-3 w-3 mr-1" />
            Mover a Producción Activa ({selectedCotizaciones.size})
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setSelectedCotizaciones(new Map())}
            disabled={selectedCotizaciones.size === 0}
          >
            Limpiar selecciones
          </Button>
        </div>
      </div>

      {/* Grouped Cotizaciones */}
      <div className="space-y-2">
          {groupedPedidos.length === 0 ? (
            <div className="border rounded-lg bg-card shadow-sm">
              <div className="h-24 text-center text-sm text-muted-foreground flex items-center justify-center">
                {debouncedSearchTerm || priorityFilter !== 'all' 
                  ? 'No se encontraron resultados con los filtros actuales' 
                  : 'No hay pedidos disponibles'
                }
              </div>
            </div>
          ) : (
            groupedPedidos.map((cotizacion) => (
              <div key={cotizacion.folio} className="border rounded-lg bg-card shadow-sm">
                {/* Cotizacion Header with Selection */}
                <div className="flex items-center justify-between p-3 bg-muted/30 border-b">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedCotizaciones.has(cotizacion.folio)}
                        onCheckedChange={() => handleCotizacionToggle(cotizacion)}
                        disabled={cotizacion.productos.some(p => p.production_status?.is_in_production)}
                        aria-label={`Seleccionar cotización ${cotizacion.folio}`}
                      />
                      <div 
                        className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors"
                        onClick={() => toggleCotizacion(cotizacion.folio)}
                      >
                        {expandedCotizaciones.has(cotizacion.folio) ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                        <Badge variant="outline" className="text-xs font-medium">
                          {cotizacion.folio}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{cotizacion.cliente}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{cotizacion.fecha}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {cotizacion.productos.some(p => p.is_premium) && (
                      <Badge variant="default" className="text-xs bg-purple-600 text-white">
                        ⭐ Premium
                      </Badge>
                    )}
                    {cotizacion.productos.some(p => p.production_status?.is_in_production) && (
                      <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 border-orange-200">
                        En Producción
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {cotizacion.productos.length} productos
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {cotizacion.productos.reduce((sum, p) => sum + p.cantidad, 0)} piezas
                    </Badge>
                  </div>
                </div>

                {/* Products Table */}
                {expandedCotizaciones.has(cotizacion.folio) && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-b">
                          <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground">Producto</TableHead>
                          <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground text-center w-20">Cantidad</TableHead>
                          <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground text-center w-24">Inventario</TableHead>
                          <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground text-center w-20">Moldes</TableHead>
                          <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground text-center w-24">Producción</TableHead>
                          <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground text-center w-24">Fecha Est.</TableHead>
                          <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground text-center w-20">Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cotizacion.productos.map((producto) => {
                          return (
                            <TableRow
                              key={`${producto.folio}-${producto.producto_id}`}
                              className="hover:bg-muted/30 transition-colors"
                              title={getInventoryTooltip(producto)}
                            >
                              <TableCell className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className={`h-2 w-2 rounded-full ${producto.hasMoldes ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                                  <span className="text-sm font-medium text-foreground">{producto.producto}</span>
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-3 text-center w-20">
                                <Badge variant="secondary" className="text-xs font-medium">
                                  {producto.cantidad}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-4 py-3 text-center w-24">
                                {producto.inventory_status ? (
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${getInventoryBadgeColor(producto.inventory_status.availability)}`}
                                  >
                                    {producto.inventory_status.terminado_disponible}/{producto.cantidad}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="px-4 py-3 text-center w-20">
                                {producto.hasMoldes ? (
                                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                                      <Package className="h-3 w-3 mr-1" />
                                      {producto.moldesInfo?.total_moldes}
                                    </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic whitespace-nowrap">Sin moldes</span>
                                )}
                              </TableCell>
                              <TableCell className="px-4 py-3 text-center w-24">
                                {producto.production_status?.is_in_production ? (
                                  <Badge variant="secondary" className="text-xs whitespace-nowrap">
                                    {getProductionStageLabel(producto.production_status.stage)}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">-</span>
                                )}
                              </TableCell>
                              <TableCell className="px-4 py-3 text-center w-24">
                                <div className="text-xs text-muted-foreground">
                                  {producto.estimated_delivery_date || '-'}
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-3 text-center w-20">
                                {(() => {
                                  const days = producto.days_until_delivery;
                                  
                                  if (days === undefined || days === null) {
                                    return <div className="text-xs text-muted-foreground">Sin fecha</div>;
                                  }
                                  
                                  if (days < 0) {
                                    return <Badge className="text-xs bg-rose-50/80 text-rose-700 border-rose-200 hover:bg-rose-100/80 whitespace-nowrap">{Math.abs(days)}d atraso</Badge>;
                                  }
                                  
                                  if (days <= 7) {
                                    return <Badge className="text-xs bg-amber-50/80 text-amber-700 border-amber-200 hover:bg-amber-100/80 whitespace-nowrap">Urgente</Badge>;
                                  }
                                  
                                  return <div className="text-xs text-muted-foreground whitespace-nowrap">{days}d</div>;
                                })()}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            ))
          )}
      </div>

      {/* Footer */}
      {groupedPedidos.length > 0 && (
        <div className="flex justify-between items-center text-xs text-muted-foreground px-1">
          <span>
            {groupedPedidos.length} cotizaciones • {filteredPedidos.length} productos
          </span>
          <span>
            {filteredPedidos.reduce((sum, p) => sum + p.cantidad, 0).toLocaleString()} piezas total
          </span>
        </div>
      )}

      {/* Enhanced Allocation Dialog */}
      {showAllocationDialog && allocationData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Mover a Producción Activa</h3>
            
            <div className="space-y-6">
              <div className="text-sm text-gray-600">
                Has seleccionado <strong>{allocationData.totalCotizaciones}</strong> cotizaciones con <strong>{allocationData.totalProducts}</strong> productos.
              </div>
              
              {/* Products with Available Inventory */}
              {allocationData.productsWithInventory.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-900">Productos con Inventario Disponible</h4>
                  <div className="text-xs text-gray-500 mb-3">
                    Puedes asignar inventario directamente a empaque o guardarlo para otras cotizaciones más urgentes.
                  </div>
                  
                  <div className="space-y-3 max-h-64 overflow-y-auto border rounded-lg p-3">
                    {allocationData.productsWithInventory.map((product, index) => (
                      <div key={`${product.folio}-${product.producto_id}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{product.producto_nombre}</div>
                          <div className="text-xs text-gray-500">
                            {product.folio} • Necesita: {product.cantidad_necesaria} • Disponible: {product.inventario_disponible}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={product.ir_a_empaque}
                              onChange={(e) => {
                                const updatedProducts = [...allocationData.productsWithInventory];
                                updatedProducts[index].ir_a_empaque = e.target.checked;
                                if (!e.target.checked) {
                                  updatedProducts[index].cantidad_a_empaque = 0;
                                } else {
                                  updatedProducts[index].cantidad_a_empaque = Math.min(
                                    product.inventario_disponible,
                                    product.cantidad_necesaria
                                  );
                                }
                                setAllocationData({
                                  ...allocationData,
                                  productsWithInventory: updatedProducts
                                });
                              }}
                              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <span className="text-xs text-gray-700">A empaque</span>
                          </label>
                          
                          {product.ir_a_empaque && (
                            <div className="flex items-center space-x-2">
                              <Input
                                type="number"
                                min={0}
                                max={Math.min(product.inventario_disponible, product.cantidad_necesaria)}
                                value={product.cantidad_a_empaque || ''}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value) || 0;
                                  const maxValue = Math.min(product.inventario_disponible, product.cantidad_necesaria);
                                  const finalValue = Math.min(Math.max(0, value), maxValue);
                                  
                                  const updatedProducts = [...allocationData.productsWithInventory];
                                  updatedProducts[index].cantidad_a_empaque = finalValue;
                                  setAllocationData({
                                    ...allocationData,
                                    productsWithInventory: updatedProducts
                                  });
                                }}
                                className="w-20 h-8 text-xs text-center"
                                placeholder="0"
                              />
                              <span className="text-xs text-gray-500">piezas</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Summary */}
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-green-50 rounded text-sm">
                  <span>✅ Directo a empaque:</span>
                  <strong className="text-green-700">
                    {allocationData.productsWithInventory.filter(p => p.ir_a_empaque).length} productos
                  </strong>
                </div>
                <div className="flex justify-between items-center p-2 bg-yellow-50 rounded text-sm">
                  <span>🔄 A bitácora (producción):</span>
                  <strong className="text-yellow-700">{allocationData.needsProduction}</strong>
                </div>
                {allocationData.needsMoldes.length > 0 && (
                  <div className="p-2 bg-orange-50 rounded text-sm">
                    <div className="font-medium text-orange-800 mb-1">⚠️ Productos sin moldes:</div>
                    <div className="text-xs text-orange-700 space-y-1">
                      {allocationData.needsMoldes.slice(0, 3).map((item, idx) => (
                        <div key={idx}>{item.folio}: {item.producto_nombre}</div>
                      ))}
                      {allocationData.needsMoldes.length > 3 && (
                        <div>+{allocationData.needsMoldes.length - 3} más...</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAllocationDialog(false);
                    setAllocationData(null);
                  }}
                  disabled={isProcessingAllocation}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleInventoryAllocation}
                  disabled={isProcessingAllocation}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isProcessingAllocation ? 'Procesando...' : 'Confirmar y Mover'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

PedidosSection.displayName = 'PedidosSection'; 