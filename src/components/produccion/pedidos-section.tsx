"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Search, AlertTriangle, Clock, Calendar, CheckCircle2, ChevronDown, ChevronRight as ChevronRightIcon, User, Package, Plus } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
}

interface SelectedProduct {
  folio: string;
  producto_id: number;
  producto_nombre: string;
  cantidad_total: number;
  cantidad_selected: number;
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

// Memoized summary stats component
const SummaryStats = React.memo(({ pedidos, selectedCount }: { pedidos: PedidoItem[]; selectedCount: number }) => {
  const stats = useMemo(() => {
    const totalPedidos = pedidos.length;
    const totalPiezas = pedidos.reduce((sum, pedido) => sum + pedido.cantidad, 0);
    const uniqueClientes = new Set(pedidos.map(pedido => pedido.cliente)).size;
    const uniqueProductos = new Set(pedidos.map(pedido => pedido.producto)).size;
    const totalValue = pedidos.reduce((sum, pedido) => sum + (pedido.cantidad * pedido.precio_venta), 0);
    
    return { totalPedidos, totalPiezas, uniqueClientes, uniqueProductos, totalValue };
  }, [pedidos]);

  return (
    <div className="grid grid-cols-4 gap-4 p-3 bg-muted/30 border rounded-lg">
      <div className="text-center">
        <div className="text-sm font-semibold text-foreground">{stats.totalPedidos}</div>
        <div className="text-xs text-muted-foreground">Cotizaciones</div>
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold text-foreground">{stats.totalPiezas.toLocaleString()}</div>
        <div className="text-xs text-muted-foreground">Piezas</div>
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold text-foreground">{stats.uniqueProductos}</div>
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
  const [selectedProducts, setSelectedProducts] = useState<Map<string, SelectedProduct>>(new Map());
  const [selectedRowId, setSelectedRowId] = useState<string>('');
  const [isMovingToBitacora, setIsMovingToBitacora] = useState<boolean>(false);

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

  // Handle radio selection change
  useEffect(() => {
    if (selectedRowId) {
      // Find the selected product across all groups
      let foundProduct: (PedidoItem & { moldesInfo: MoldeInfo | null; hasMoldes: boolean }) | null = null;
      
      for (const group of groupedPedidos) {
        for (const producto of group.productos) {
          const productId = `${producto.folio}-${producto.producto_id}`;
          if (productId === selectedRowId) {
            foundProduct = producto;
            break;
          }
        }
        if (foundProduct) break;
      }
      
      if (foundProduct && foundProduct.hasMoldes && foundProduct.producto_id) {
        const productKey = `${foundProduct.folio}-${foundProduct.producto_id}`;
        setSelectedProducts(new Map([
          [productKey, {
            folio: foundProduct.folio,
            producto_id: foundProduct.producto_id,
            producto_nombre: foundProduct.producto,
            cantidad_total: foundProduct.cantidad,
            cantidad_selected: foundProduct.cantidad
          }]
        ]));
      } else {
        setSelectedProducts(new Map());
      }
    } else {
      setSelectedProducts(new Map());
    }
  }, [selectedRowId, groupedPedidos]);

  // Handle product selection
  const handleProductSelect = useCallback((pedido: PedidoItem, selected: boolean) => {
    if (!pedido.producto_id) return;
    
    const productKey = `${pedido.folio}-${pedido.producto_id}`;
    
    setSelectedProducts(prev => {
      const newMap = new Map(prev);
      
      if (selected) {
        newMap.set(productKey, {
          folio: pedido.folio,
          producto_id: pedido.producto_id,
          producto_nombre: pedido.producto,
          cantidad_total: pedido.cantidad,
          cantidad_selected: pedido.cantidad
        });
      } else {
        newMap.delete(productKey);
      }
      
      return newMap;
    });
  }, []);

  // Fetch moldes data
  const fetchMoldesData = useCallback(async () => {
    try {
      const response = await fetch('/api/moldes-activos/mesas');
      if (!response.ok) throw new Error('Failed to fetch moldes data');
      
      const mesas = await response.json();
      const moldesMap: Record<number, MoldeInfo> = {};
      
      mesas.forEach((mesa: any) => {
        mesa.productos.forEach((producto: any) => {
          const productoId = producto.producto_id;
          if (!moldesMap[productoId]) {
            moldesMap[productoId] = {
              producto_id: productoId,
              total_moldes: 0,
              mesas: []
            };
          }
          
          moldesMap[productoId].total_moldes += producto.cantidad_moldes;
          moldesMap[productoId].mesas.push({
            nombre: mesa.nombre,
            cantidad: producto.cantidad_moldes
          });
        });
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

  // Move selected products to bitácora
  const handleMoveToBitacora = useCallback(async () => {
    if (selectedProducts.size === 0) {
      toast.error("Selecciona al menos un producto para mover a bitácora");
      return;
    }

    setIsMovingToBitacora(true);
    
    try {
      const productsToMove = Array.from(selectedProducts.values());
      
      const response = await fetch('/api/production/move-to-bitacora', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          products: productsToMove
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al mover productos a bitácora');
      }

      const result = await response.json();
      
      toast.success(`${selectedProducts.size} productos movidos a bitácora exitosamente`);
      
      // Clear selections and refresh data
      setSelectedProducts(new Map());
      fetchPedidos(true);
      
    } catch (error: any) {
      console.error('Error moving products to bitácora:', error);
      toast.error(`Error al mover productos: ${error.message}`);
    } finally {
      setIsMovingToBitacora(false);
    }
  }, [selectedProducts, fetchPedidos]);

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
    fetchPedidos();
    fetchMoldesData();
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
                  Urgente (≤7d)
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
                  Bajo (>14d)
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
      <SummaryStats pedidos={filteredPedidos} selectedCount={selectedProducts.size} />

      {/* Controls */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground">
            {groupedPedidos.length} cotizaciones • {filteredPedidos.length} productos
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {selectedProducts.size > 0 && (
            <Button
              onClick={handleMoveToBitacora}
              disabled={isMovingToBitacora}
              size="sm"
              className="h-7 px-3 text-xs bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="h-3 w-3 mr-1" />
              {isMovingToBitacora ? 'Moviendo...' : `Mover a Bitácora`}
            </Button>
          )}
          {selectedRowId && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setSelectedRowId('')}
            >
              Limpiar selección
            </Button>
          )}
        </div>
      </div>

      {/* Grouped Cotizaciones */}
      <div className="space-y-2">
        <RadioGroup value={selectedRowId} onValueChange={setSelectedRowId}>
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
                {/* Cotizacion Header */}
                <div 
                  className="flex items-center justify-between p-3 bg-muted/30 border-b cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleCotizacion(cotizacion.folio)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {expandedCotizaciones.has(cotizacion.folio) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Badge variant="outline" className="text-xs font-medium">
                        {cotizacion.folio}
                      </Badge>
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
                          <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground w-12">Sel.</TableHead>
                          <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground">Producto</TableHead>
                          <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground text-center">Cantidad</TableHead>
                          <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground text-center">Moldes</TableHead>
                          <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground text-center">Fecha Est.</TableHead>
                          <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground text-center">Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cotizacion.productos.map((producto) => {
                          const productId = `${producto.folio}-${producto.producto_id}`;
                          const isSelected = selectedRowId === productId;
                          
                          return (
                            <TableRow
                              key={productId}
                              data-state={isSelected ? "selected" : undefined}
                              className="hover:bg-muted/30 transition-colors"
                            >
                              <TableCell className="px-4 py-2">
                                {!producto.hasMoldes || !producto.producto_id ? (
                                  <div className="flex items-center justify-center">
                                    <div className="h-4 w-4 rounded-full border-2 border-gray-200 bg-gray-100 opacity-30"></div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center">
                                    <RadioGroupItem 
                                      value={productId} 
                                      id={`radio-${productId}`}
                                      className="h-4 w-4"
                                    />
                                    <Label htmlFor={`radio-${productId}`} className="sr-only">
                                      Select {producto.producto}
                                    </Label>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="px-4 py-2">
                                <div className="flex items-center gap-2">
                                  <div className={`h-2 w-2 rounded-full ${producto.hasMoldes ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                                  <span className="text-sm font-medium text-foreground">{producto.producto}</span>
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-2 text-center">
                                <Badge variant="secondary" className="text-xs font-medium">
                                  {producto.cantidad}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-4 py-2 text-center">
                                {producto.hasMoldes ? (
                                    <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                                      <Package className="h-3 w-3 mr-1" />
                                      {producto.moldesInfo?.total_moldes}
                                    </Badge>
                                ) : (
                                  <div className="text-xs text-muted-foreground italic">Sin moldes</div>
                                )}
                              </TableCell>
                              <TableCell className="px-4 py-2 text-center">
                                <div className="text-xs text-muted-foreground">
                                  {producto.estimated_delivery_date || '-'}
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-2 text-center">
                                {(() => {
                                  const days = producto.days_until_delivery;
                                  
                                  if (days === undefined || days === null) {
                                    return <Badge variant="secondary" className="text-xs">Sin fecha</Badge>;
                                  }
                                  
                                  if (days < 0) {
                                    return <Badge variant="destructive" className="text-xs">{Math.abs(days)}d atraso</Badge>;
                                  }
                                  
                                  if (days <= 7) {
                                    return <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">Urgente</Badge>;
                                  }
                                  
                                  return <Badge variant="outline" className="text-xs">{days}d</Badge>;
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
        </RadioGroup>
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
    </div>
  );
});

PedidosSection.displayName = 'PedidosSection'; 