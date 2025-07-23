"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, Download, ArrowUpDown, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from "sonner";
import { cn } from '@/lib/utils';

// Types
interface Producto {
  producto_id: number;
  nombre: string;
  sku?: string;
  moldes_disponibles: number;
  precio: number;
  tipo_producto?: string;
  tipo_ceramica?: string;
  vueltas_max_dia?: number;
}

interface Stats {
  totalProducts: number;
  withMoldes: number;
  withoutMoldes: number;
  lowMoldes: number;
  showing: number;
}

export default function InventarioMoldesPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingQuantities, setEditingQuantities] = useState<Record<number, string>>({});
  const [pendingUpdates, setPendingUpdates] = useState<Set<number>>(new Set());
  const [savingUpdates, setSavingUpdates] = useState<Set<number>>(new Set());
  const [filterStock, setFilterStock] = useState<'all' | 'sin-moldes' | 'moldes-bajos' | 'moldes-suficientes'>('all');
  const [sortBy, setSortBy] = useState<'nombre' | 'sku' | 'moldes'>('nombre');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Load products
  const loadProductos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/productos?pageSize=1000');
      if (!response.ok) throw new Error('Failed to fetch products');
      
      const result = await response.json();
      setProductos(result.data || []);
    } catch (error) {
      console.error('Error loading productos:', error);
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProductos();
  }, [loadProductos]);

  // Filter and sort products
  const filteredAndSortedProductos = useMemo(() => {
    let filtered = productos.filter(producto => {
      const matchesSearch = producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (producto.sku && producto.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const moldesCount = producto.moldes_disponibles || 0;
      const matchesStockFilter = (() => {
        switch (filterStock) {
          case 'sin-moldes': return moldesCount === 0;
          case 'moldes-bajos': return moldesCount > 0 && moldesCount <= 3;
          case 'moldes-suficientes': return moldesCount > 3;
          default: return true;
        }
      })();

      return matchesSearch && matchesStockFilter;
    });

    // Sort products
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'nombre':
          comparison = a.nombre.localeCompare(b.nombre);
          break;
        case 'sku':
          comparison = (a.sku || '').localeCompare(b.sku || '');
          break;
        case 'moldes':
          comparison = (a.moldes_disponibles || 0) - (b.moldes_disponibles || 0);
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [productos, searchTerm, filterStock, sortBy, sortOrder]);

  // Handle quantity input change
  const handleQuantityInputChange = (producto_id: number, value: string) => {
    setEditingQuantities(prev => ({
      ...prev,
      [producto_id]: value
    }));
    setPendingUpdates(prev => new Set(prev).add(producto_id));
  };

  // Save quantity change
  const saveQuantityChange = async (producto_id: number, newValue: string) => {
    const newQuantity = parseInt(newValue) || 0;
    if (newQuantity < 0) {
      toast.error('La cantidad no puede ser negativa');
      return;
    }

    const producto = productos.find(p => p.producto_id === producto_id);
    if (!producto) return;

    const currentMoldes = producto.moldes_disponibles || 0;
    if (newQuantity === currentMoldes) {
      setEditingQuantities(prev => {
        const newState = { ...prev };
        delete newState[producto_id];
        return newState;
      });
      setPendingUpdates(prev => {
        const newSet = new Set(prev);
        newSet.delete(producto_id);
        return newSet;
      });
      return;
    }

    try {
      setSavingUpdates(prev => new Set(prev).add(producto_id));
      
      const response = await fetch('/api/productos', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          producto_id: producto_id,
          ...producto,
          moldes_disponibles: newQuantity
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update product');
      }

      setProductos(prev => prev.map(p => 
        p.producto_id === producto_id 
          ? { ...p, moldes_disponibles: newQuantity }
          : p
      ));

      setEditingQuantities(prev => {
        const newState = { ...prev };
        delete newState[producto_id];
        return newState;
      });
      
      setPendingUpdates(prev => {
        const newSet = new Set(prev);
        newSet.delete(producto_id);
        return newSet;
      });

      toast.success(`${producto.nombre}: ${newQuantity} moldes`);
    } catch (error) {
      console.error('Error updating mold inventory:', error);
      toast.error('Error al actualizar');
    } finally {
      setSavingUpdates(prev => {
        const newSet = new Set(prev);
        newSet.delete(producto_id);
        return newSet;
      });
    }
  };

  const handleQuantityKeyDown = async (
    e: React.KeyboardEvent<HTMLInputElement>, 
    producto_id: number
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'Escape') {
      setEditingQuantities(prev => {
        const newState = { ...prev };
        delete newState[producto_id];
        return newState;
      });
      setPendingUpdates(prev => {
        const newSet = new Set(prev);
        newSet.delete(producto_id);
        return newSet;
      });
    }
  };

  const handleQuantityBlur = (producto_id: number) => {
    const currentEditValue = editingQuantities[producto_id];
    if (currentEditValue !== undefined) {
      saveQuantityChange(producto_id, currentEditValue);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const dataToExport = filteredAndSortedProductos;

    const csv = [
      ['SKU', 'NOMBRE', 'MOLDES'].join(','),
      ...dataToExport.map(p => [
        p.sku || '',
        `"${p.nombre || p.sku || 'Sin nombre'}"`,
        p.moldes_disponibles || 0
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moldes-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success(`${dataToExport.length} productos exportados`);
  };

  // Get mold status
  const getMoldStatus = (moldes: number) => {
    const count = moldes || 0;
    if (count === 0) return { 
      color: 'text-red-700', 
      bg: 'bg-red-50 border-red-200', 
      badge: 'destructive',
      icon: <AlertTriangle className="h-3 w-3" />
    };
    if (count <= 3) return { 
      color: 'text-yellow-700', 
      bg: 'bg-yellow-50 border-yellow-200', 
      badge: 'secondary',
      icon: <AlertTriangle className="h-3 w-3" />
    };
    return { 
      color: 'text-green-700', 
      bg: 'bg-green-50 border-green-200', 
      badge: 'default',
      icon: <CheckCircle className="h-3 w-3" />
    };
  };

  // Handle sorting
  const handleSort = (column: 'nombre' | 'sku' | 'moldes') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Stats
  const stats: Stats = useMemo(() => {
    const totalProducts = productos.length;
    const withMoldes = productos.filter(p => (p.moldes_disponibles || 0) > 0).length;
    const withoutMoldes = productos.filter(p => (p.moldes_disponibles || 0) === 0).length;
    const lowMoldes = productos.filter(p => {
      const m = p.moldes_disponibles || 0;
      return m > 0 && m <= 3;
    }).length;
    return { 
      totalProducts, 
      withMoldes, 
      withoutMoldes, 
      lowMoldes,
      showing: filteredAndSortedProductos.length 
    };
  }, [productos, filteredAndSortedProductos]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-lg">Cargando inventario...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventario de Moldes</h1>
          <p className="text-muted-foreground">
            Gestión de moldes disponibles para producción
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {stats.showing} de {stats.totalProducts} productos
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con Moldes</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.withMoldes}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pocos Moldes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.lowMoldes}</div>
            <p className="text-xs text-muted-foreground">1-3 moldes</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Moldes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.withoutMoldes}</div>
            <p className="text-xs text-muted-foreground">Necesitan reposición</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros y Acciones</CardTitle>
          <CardDescription>
            Busca y filtra productos por estado de moldes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterStock} onValueChange={(value: any) => setFilterStock(value)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los productos</SelectItem>
                <SelectItem value="sin-moldes">Sin moldes (0)</SelectItem>
                <SelectItem value="moldes-bajos">Pocos moldes (1-3)</SelectItem>
                <SelectItem value="moldes-suficientes">Suficientes (4+)</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={exportToCSV} className="w-full sm:w-auto">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
          
          {pendingUpdates.size > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Tienes {pendingUpdates.size} cambio(s) pendiente(s)
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Productos ({stats.showing})</CardTitle>
          <CardDescription>
            Click en la cantidad para editar. Presiona Enter para guardar o Escape para cancelar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort('sku')}
                      className="h-8 p-0 font-medium"
                    >
                      SKU
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort('nombre')}
                      className="h-8 p-0 font-medium"
                    >
                      Producto
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center w-[120px]">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSort('moldes')}
                      className="h-8 p-0 font-medium"
                    >
                      Moldes
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center w-[100px]">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedProductos.map((producto) => {
                  const isEditing = editingQuantities[producto.producto_id] !== undefined;
                  const isPending = pendingUpdates.has(producto.producto_id);
                  const isSaving = savingUpdates.has(producto.producto_id);
                  const currentMoldes = producto.moldes_disponibles || 0;
                  const displayValue = isEditing 
                    ? editingQuantities[producto.producto_id] 
                    : currentMoldes.toString();
                  const status = getMoldStatus(currentMoldes);

                  return (
                    <TableRow 
                      key={producto.producto_id} 
                      className={cn(
                        "hover:bg-muted/50",
                        isPending && "bg-yellow-50",
                        isSaving && "bg-blue-50"
                      )}
                    >
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {producto.sku || '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[300px]" title={producto.nombre}>
                            {producto.nombre}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Input 
                            type="number"
                            value={displayValue}
                            onChange={(e) => handleQuantityInputChange(producto.producto_id, e.target.value)}
                            onKeyDown={(e) => handleQuantityKeyDown(e, producto.producto_id)}
                            onBlur={() => handleQuantityBlur(producto.producto_id)}
                            className={cn(
                              "w-16 h-8 text-center",
                              isPending && "border-yellow-400 bg-yellow-50",
                              isSaving && "border-blue-400 bg-blue-50"
                            )}
                            min="0"
                            disabled={isSaving}
                          />
                          {isSaving && (
                            <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          <Badge variant={status.badge as any} className="flex items-center gap-1">
                            {status.icon}
                            {currentMoldes === 0 ? 'Sin stock' : 
                             currentMoldes <= 3 ? 'Bajo' : 'OK'}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {filteredAndSortedProductos.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No se encontraron productos
              </h3>
              <p className="text-sm text-muted-foreground">
                {stats.totalProducts === 0 
                  ? "No hay productos en el inventario" 
                  : "Intenta ajustar los filtros de búsqueda"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}