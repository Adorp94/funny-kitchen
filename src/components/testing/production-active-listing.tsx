"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Package, TrendingUp, TrendingDown, Minus, Factory, AlertTriangle, CheckCircle, Clock, Settings } from 'lucide-react';
import { toast } from "sonner";

interface ProductionActiveItem {
  id: number;
  producto_id: number;
  pedidos: number;
  por_detallar: number;
  detallado: number;
  sancocho: number;
  terminado: number;
  piezas_en_proceso: number;
  faltan_sobran: number;
  producto_nombre: string;
  sku: string;
  precio: number;
  tipo_producto: string;
  moldes_disponibles: number;
  updated_at: string;
}

interface ProductionSummary {
  totalProducts: number;
  totalPedidos: number;
  totalEnProceso: number;
  totalTerminado: number;
  productosConDeficit: number;
  productosConSuperavit: number;
  productosAlDia: number;
}

export const ProductionActiveListing: React.FC = () => {
  const [data, setData] = useState<ProductionActiveItem[]>([]);
  const [filteredData, setFilteredData] = useState<ProductionActiveItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'deficit' | 'surplus' | 'balanced'>('all');

  const fetchData = useCallback(async () => {
    console.log("ProductionActiveListing: fetchData triggered");
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/production-active');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`API Error Response: ${response.status}`, errorData);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("Production Active data received from API:", result);
      
      const productionItems = result.data || [];
      setData(productionItems);
      setFilteredData(productionItems);
      
    } catch (err: any) {
      console.error("Error in fetchData:", err);
      const errorMsg = err.message || "Error desconocido al cargar los datos de producción activa.";
      setError(errorMsg);
      toast.error("Error al cargar datos", {
        description: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    applyFilters(term, statusFilter);
  }, [statusFilter]);

  const handleStatusFilter = useCallback((filter: 'all' | 'deficit' | 'surplus' | 'balanced') => {
    setStatusFilter(filter);
    applyFilters(searchTerm, filter);
  }, [searchTerm]);

  const applyFilters = useCallback((searchTerm: string, statusFilter: string) => {
    if (!data) return;

    let filtered = data;

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.producto_nombre.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => {
        const status = getProductionStatus(item);
        return status === statusFilter;
      });
    }

    // Sort alphabetically by product name
    filtered.sort((a, b) => a.producto_nombre.localeCompare(b.producto_nombre, 'es', { 
      sensitivity: 'base',
      numeric: true 
    }));

    setFilteredData(filtered);
  }, [data]);

  const calculateSummary = useCallback((): ProductionSummary => {
    return {
      totalProducts: data.length,
      totalPedidos: data.reduce((sum, item) => sum + item.pedidos, 0),
      totalEnProceso: data.reduce((sum, item) => sum + item.piezas_en_proceso, 0),
      totalTerminado: data.reduce((sum, item) => sum + item.terminado, 0),
      productosConDeficit: data.filter(item => item.faltan_sobran < 0).length,
      productosConSuperavit: data.filter(item => item.faltan_sobran > 0).length,
      productosAlDia: data.filter(item => item.faltan_sobran === 0).length,
    };
  }, [data]);

  const getStatusIcon = (faltanSobran: number) => {
    if (faltanSobran < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    if (faltanSobran > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getStatusBadge = (faltanSobran: number) => {
    if (faltanSobran < 0) {
      return <Badge variant="destructive" className="text-xs">Déficit: {Math.abs(faltanSobran)}</Badge>;
    }
    if (faltanSobran > 0) {
      return <Badge variant="default" className="text-xs bg-green-600">Superávit: {faltanSobran}</Badge>;
    }
    return <Badge variant="outline" className="text-xs">Balanceado</Badge>;
  };

  const getProcessStageIcon = (stage: string, value: number) => {
    if (value === 0) return null;
    
    switch (stage) {
      case 'por_detallar':
        return <Settings className="h-3 w-3 text-yellow-500" />;
      case 'detallado':
        return <CheckCircle className="h-3 w-3 text-blue-500" />;
      case 'sancocho':
        return <Factory className="h-3 w-3 text-orange-500" />;
      case 'terminado':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      default:
        return null;
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    applyFilters(searchTerm, statusFilter);
  }, [data, searchTerm, statusFilter, applyFilters]);

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="flex justify-center items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Cargando producción activa...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-red-500 mb-2 text-sm">{error}</p>
        <Button onClick={fetchData} variant="outline" size="sm">
          Reintentar
        </Button>
      </div>
    );
  }

  const summary = calculateSummary();

  return (
    <div className="space-y-3">
      {/* Compact Summary Bar */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="grid grid-cols-7 gap-4 text-center">
          <div>
            <div className="text-sm font-medium text-gray-900">{summary.totalProducts}</div>
            <div className="text-xs text-gray-500">Productos</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{summary.totalPedidos.toLocaleString()}</div>
            <div className="text-xs text-gray-500">Pedidos</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{summary.totalEnProceso.toLocaleString()}</div>
            <div className="text-xs text-gray-500">En proceso</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{summary.totalTerminado.toLocaleString()}</div>
            <div className="text-xs text-gray-500">Terminado</div>
          </div>
          <div>
            <div className="text-sm font-medium text-red-600">{summary.productosConDeficit}</div>
            <div className="text-xs text-gray-500">Déficit</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-600">{summary.productosConSuperavit}</div>
            <div className="text-xs text-gray-500">Superávit</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-600">{summary.productosAlDia}</div>
            <div className="text-xs text-gray-500">Balanceado</div>
          </div>
        </div>
      </div>

      {/* Compact Filters */}
      <div className="flex justify-between items-center bg-white border border-gray-200 rounded-lg p-2">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Buscar producto..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-7 text-xs max-w-xs border-gray-300 focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
          />
        </div>
        <div className="flex items-center space-x-1">
          <Button
            onClick={() => handleStatusFilter('all')}
            variant={statusFilter === 'all' ? 'default' : 'ghost'}
            size="sm"
            className="h-6 px-2 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            Todos
          </Button>
          <Button
            onClick={() => handleStatusFilter('deficit')}
            variant={statusFilter === 'deficit' ? 'default' : 'ghost'}
            size="sm"
            className="h-6 px-2 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            Déficit
          </Button>
          <Button
            onClick={() => handleStatusFilter('surplus')}
            variant={statusFilter === 'surplus' ? 'default' : 'ghost'}
            size="sm"
            className="h-6 px-2 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            Superávit
          </Button>
          <Button
            onClick={() => handleStatusFilter('balanced')}
            variant={statusFilter === 'balanced' ? 'default' : 'ghost'}
            size="sm"
            className="h-6 px-2 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            Balanceado
          </Button>
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <Button 
            onClick={fetchData} 
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Production Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 border-b border-gray-200 h-8">
              <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 w-48">Producto</TableHead>
              <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center w-20">Pedidos</TableHead>
              <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center w-24">Por Det.</TableHead>
              <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center w-24">Detallado</TableHead>
              <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center w-24">Sancocho</TableHead>
              <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center w-24">Terminado</TableHead>
              <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center w-24">Total</TableHead>
              <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center w-20">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-xs text-gray-500">
                  {searchTerm || statusFilter !== 'all' ? 'No se encontraron resultados' : 'No hay datos disponibles'}
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item, index) => (
                <TableRow key={item.producto_id} className={`h-10 border-b border-gray-100 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                  {/* Producto */}
                  <TableCell className="px-3 py-2 text-xs">
                    <div>
                      <div className="font-medium text-xs text-gray-900 max-w-[200px] truncate" title={item.producto_nombre}>
                        {item.producto_nombre}
                      </div>
                      {item.tipo_producto && (
                        <div className="text-xs text-gray-500 truncate">{item.tipo_producto}</div>
                      )}
                    </div>
                  </TableCell>

                  {/* Pedidos */}
                  <TableCell className="px-3 py-2 text-xs text-center">
                    <span className="font-medium text-gray-900">{item.pedidos}</span>
                  </TableCell>

                  {/* Por Detallar */}
                  <TableCell className="px-3 py-2 text-xs text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${item.por_detallar > 0 ? 'bg-orange-400' : 'bg-gray-200'}`} />
                      <span className={item.por_detallar > 0 ? 'text-gray-900' : 'text-gray-400'}>
                        {item.por_detallar}
                      </span>
                    </div>
                  </TableCell>

                  {/* Detallado */}
                  <TableCell className="px-3 py-2 text-xs text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${item.detallado > 0 ? 'bg-blue-400' : 'bg-gray-200'}`} />
                      <span className={item.detallado > 0 ? 'text-gray-900' : 'text-gray-400'}>
                        {item.detallado}
                      </span>
                    </div>
                  </TableCell>

                  {/* Sancocho */}
                  <TableCell className="px-3 py-2 text-xs text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${item.sancocho > 0 ? 'bg-red-400' : 'bg-gray-200'}`} />
                      <span className={item.sancocho > 0 ? 'text-gray-900' : 'text-gray-400'}>
                        {item.sancocho}
                      </span>
                    </div>
                  </TableCell>

                  {/* Terminado */}
                  <TableCell className="px-3 py-2 text-xs text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${item.terminado > 0 ? 'bg-green-400' : 'bg-gray-200'}`} />
                      <span className={item.terminado > 0 ? 'text-gray-900' : 'text-gray-400'}>
                        {item.terminado}
                      </span>
                    </div>
                  </TableCell>

                  {/* Total en Proceso */}
                  <TableCell className="px-3 py-2 text-xs text-center">
                    <span className="font-medium text-gray-900">{item.piezas_en_proceso}</span>
                  </TableCell>

                  {/* Balance */}
                  <TableCell className="px-3 py-2 text-xs text-center">
                    <span className={`text-xs font-medium ${
                      item.faltan_sobran < 0 
                        ? 'text-red-600' 
                        : item.faltan_sobran > 0 
                        ? 'text-gray-600' 
                        : 'text-gray-500'
                    }`}>
                      {item.faltan_sobran > 0 ? '+' : ''}{item.faltan_sobran}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer Summary */}
      {filteredData.length > 0 && (
        <div className="flex justify-between items-center text-xs text-gray-500 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
          <span>
            {filteredData.length} de {data.length} productos
          </span>
          <span>
            Actualizado: {data.length > 0 ? new Date(data[0].updated_at).toLocaleString('es-MX', { 
              month: 'short', 
              day: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit' 
            }) : 'N/A'}
          </span>
        </div>
      )}
    </div>
  );
}; 