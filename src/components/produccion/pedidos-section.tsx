"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from "sonner";

interface PedidoItem {
  folio: string;
  cliente: string;
  producto: string;
  cantidad: number;
  fecha: string;
  precio_venta: number;
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
const SummaryStats = React.memo(({ pedidos }: { pedidos: PedidoItem[] }) => {
  const stats = useMemo(() => {
    const totalPedidos = pedidos.length;
    const totalPiezas = pedidos.reduce((sum, pedido) => sum + pedido.cantidad, 0);
    const uniqueClientes = new Set(pedidos.map(pedido => pedido.cliente)).size;
    const uniqueProductos = new Set(pedidos.map(pedido => pedido.producto)).size;
    const totalValue = pedidos.reduce((sum, pedido) => sum + (pedido.cantidad * pedido.precio_venta), 0);
    
    return { totalPedidos, totalPiezas, uniqueClientes, uniqueProductos, totalValue };
  }, [pedidos]);

  return (
    <div className="grid grid-cols-5 gap-2 p-3 bg-gray-50/50 border border-gray-200 rounded-md">
      <div className="text-center">
        <div className="text-sm font-medium text-gray-900">{stats.totalPedidos}</div>
        <div className="text-xs text-gray-500">Pedidos</div>
      </div>
      <div className="text-center">
        <div className="text-sm font-medium text-gray-900">{stats.totalPiezas.toLocaleString()}</div>
        <div className="text-xs text-gray-500">Piezas</div>
      </div>
      <div className="text-center">
        <div className="text-sm font-medium text-gray-900">{stats.uniqueClientes}</div>
        <div className="text-xs text-gray-500">Clientes</div>
      </div>
      <div className="text-center">
        <div className="text-sm font-medium text-gray-900">{stats.uniqueProductos}</div>
        <div className="text-xs text-gray-500">Productos</div>
      </div>
      <div className="text-center">
        <div className="text-sm font-medium text-gray-900">${stats.totalValue.toLocaleString()}</div>
        <div className="text-xs text-gray-500">Valor</div>
      </div>
    </div>
  );
});

SummaryStats.displayName = 'SummaryStats';

// Memoized table row component
const PedidoRow = React.memo(({ pedido, index }: { pedido: PedidoItem; index: number }) => (
  <TableRow className={`hover:bg-gray-50/50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
    <TableCell className="px-3 py-2">
      <div className="space-y-0.5">
        <div className="text-xs font-medium text-gray-900">{pedido.folio}</div>
        <div className="text-xs text-gray-600 max-w-[140px] truncate" title={pedido.cliente}>
          {pedido.cliente}
        </div>
      </div>
    </TableCell>
    <TableCell className="px-3 py-2">
      <span className="text-xs text-gray-900">{pedido.producto}</span>
    </TableCell>
    <TableCell className="px-3 py-2 text-center">
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
        {pedido.cantidad}
      </span>
    </TableCell>
    <TableCell className="px-3 py-2 text-center">
      <span className="text-xs text-gray-600">{pedido.fecha}</span>
    </TableCell>
    <TableCell className="px-3 py-2 text-right">
      <span className="text-xs font-medium text-gray-900">
        ${pedido.precio_venta.toLocaleString()}
      </span>
    </TableCell>
  </TableRow>
));

PedidoRow.displayName = 'PedidoRow';

export const PedidosSection: React.FC = React.memo(() => {
  const [pedidos, setPedidos] = useState<PedidoItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [lastFetch, setLastFetch] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 50;

  // Debounced search term to reduce filtering frequency
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Memoized filtered and paginated data
  const filteredPedidos = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return pedidos;
    
    const term = debouncedSearchTerm.toLowerCase();
    return pedidos.filter(pedido => 
      pedido.cliente.toLowerCase().includes(term) ||
      pedido.producto.toLowerCase().includes(term) ||
      pedido.folio.toLowerCase().includes(term)
    );
  }, [pedidos, debouncedSearchTerm]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredPedidos.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedPedidos = filteredPedidos.slice(startIndex, endIndex);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

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
  }, [fetchPedidos]);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  // Initial load
  useEffect(() => {
    fetchPedidos();
  }, [fetchPedidos]);

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
        <h2 className="text-sm font-medium text-gray-900">Pedidos en Producción</h2>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-7 pl-7 pr-3 text-xs w-48 border-gray-300"
            />
          </div>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm" 
            className="h-7 px-2"
            disabled={loading}
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Summary */}
      <SummaryStats pedidos={filteredPedidos} />

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <div className="text-xs text-gray-500">
            Página {currentPage} de {totalPages} ({filteredPedidos.length} resultados)
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border border-gray-200 rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50 border-b border-gray-200">
              <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 h-8">Cliente</TableHead>
              <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 h-8">Producto</TableHead>
              <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center h-8">Cantidad</TableHead>
              <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center h-8">Fecha</TableHead>
              <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-right h-8">Precio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPedidos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-sm text-gray-500">
                  {debouncedSearchTerm ? 'No se encontraron resultados' : 'No hay pedidos disponibles'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedPedidos.map((pedido, index) => (
                <PedidoRow
                  key={`${pedido.folio}-${pedido.producto}-${startIndex + index}`}
                  pedido={pedido}
                  index={startIndex + index}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      {filteredPedidos.length > 0 && (
        <div className="flex justify-between items-center text-xs text-gray-500 px-1">
          <span>
            Mostrando {paginatedPedidos.length} de {filteredPedidos.length} pedidos
            {filteredPedidos.length !== pedidos.length && ` (filtrados de ${pedidos.length})`}
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