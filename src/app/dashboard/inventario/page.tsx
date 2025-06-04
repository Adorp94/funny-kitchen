"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, Download, X, ArrowUpDown } from 'lucide-react';
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

export default function InventarioMoldesPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingQuantities, setEditingQuantities] = useState<Record<number, string>>({});
  const [pendingUpdates, setPendingUpdates] = useState<Set<number>>(new Set());
  const [savingUpdates, setSavingUpdates] = useState<Set<number>>(new Set());
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [filterStock, setFilterStock] = useState<'all' | 'sin-moldes' | 'moldes-bajos' | 'moldes-suficientes'>('all');
  const [sortBy, setSortBy] = useState<'nombre' | 'sku' | 'moldes'>('nombre');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Load products
  const loadProductos = useCallback(async () => {
    try {
      setLoading(true);
      // Request all products by setting a large pageSize
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

  // Split products into multiple tables (like Excel layout)
  const productsPerTable = 35; // Closer to Excel layout
  const productTables = useMemo(() => {
    const tables = [];
    for (let i = 0; i < filteredAndSortedProductos.length; i += productsPerTable) {
      tables.push(filteredAndSortedProductos.slice(i, i + productsPerTable));
    }
    return tables;
  }, [filteredAndSortedProductos]);

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

  // Toggle product selection
  const toggleProductSelection = (producto_id: number) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(producto_id)) {
        newSet.delete(producto_id);
      } else {
        newSet.add(producto_id);
      }
      return newSet;
    });
  };

  // Export to CSV
  const exportToCSV = () => {
    const dataToExport = selectedProducts.size > 0 
      ? productos.filter(p => selectedProducts.has(p.producto_id))
      : filteredAndSortedProductos;

    const csv = [
      ['SKU', 'NOMBRE', 'MOLDES'].join(','),
      ...dataToExport.map(p => [
        p.sku || '',
        `"${p.nombre}"`,
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
    if (count === 0) return { color: 'text-red-600', bg: 'bg-red-50' };
    if (count <= 3) return { color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { color: 'text-green-600', bg: 'bg-green-50' };
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
  const stats = useMemo(() => {
    const total = productos.length;
    const sin = productos.filter(p => (p.moldes_disponibles || 0) === 0).length;
    const pocos = productos.filter(p => {
      const m = p.moldes_disponibles || 0;
      return m > 0 && m <= 3;
    }).length;
    return { total, sin, pocos };
  }, [productos]);

  // Render a single table
  const renderTable = (products: Producto[], tableIndex: number) => (
    <div key={tableIndex} className="border rounded">
      <Table>
        <TableHeader>
          <TableRow className="h-6 bg-gray-50">
            <TableHead className="w-6 p-1">
              <Checkbox
                checked={products.length > 0 && products.every(p => selectedProducts.has(p.producto_id))}
                onCheckedChange={(checked) => {
                  if (checked) {
                    const tableIds = products.map(p => p.producto_id);
                    setSelectedProducts(prev => new Set([...prev, ...tableIds]));
                  } else {
                    const tableIds = products.map(p => p.producto_id);
                    setSelectedProducts(prev => {
                      const newSet = new Set(prev);
                      tableIds.forEach(id => newSet.delete(id));
                      return newSet;
                    });
                  }
                }}
              />
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-gray-100 p-1 text-xs font-bold">
              SKU
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-gray-100 p-1 text-xs font-bold">
              PRODUCTO
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-gray-100 p-1 text-xs font-bold text-center w-16">
              QTY
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((producto) => {
            const isEditing = editingQuantities[producto.producto_id] !== undefined;
            const isPending = pendingUpdates.has(producto.producto_id);
            const isSaving = savingUpdates.has(producto.producto_id);
            const isSelected = selectedProducts.has(producto.producto_id);
            const currentMoldes = producto.moldes_disponibles || 0;
            const displayValue = isEditing 
              ? editingQuantities[producto.producto_id] 
              : currentMoldes.toString();
            const status = getMoldStatus(currentMoldes);

            return (
              <TableRow 
                key={producto.producto_id} 
                className={cn(
                  "h-6 hover:bg-gray-50",
                  isPending && "bg-yellow-50",
                  isSaving && "bg-blue-50",
                  isSelected && "bg-blue-50",
                  status.bg
                )}
              >
                <TableCell className="p-1">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleProductSelection(producto.producto_id)}
                  />
                </TableCell>
                <TableCell className="p-1 text-xs text-gray-600">
                  {producto.sku || '-'}
                </TableCell>
                <TableCell className="p-1 text-xs font-medium">
                  <div className="truncate max-w-48" title={producto.nombre}>
                    {producto.nombre}
                  </div>
                </TableCell>
                <TableCell className="p-1 text-center">
                  <div className="relative inline-block">
                    <Input 
                      type="number"
                      value={displayValue}
                      onChange={(e) => handleQuantityInputChange(producto.producto_id, e.target.value)}
                      onKeyDown={(e) => handleQuantityKeyDown(e, producto.producto_id)}
                      onBlur={() => handleQuantityBlur(producto.producto_id)}
                      className={cn(
                        "w-10 h-5 text-center text-xs border-0 bg-transparent focus:bg-white focus:border focus:border-blue-300",
                        isPending && "bg-yellow-100",
                        isSaving && "bg-blue-100",
                        status.color,
                        "font-bold"
                      )}
                      min="0"
                      disabled={isSaving}
                    />
                    {isSaving && (
                      <Loader2 className="absolute right-0 top-1/2 transform -translate-y-1/2 h-2 w-2 animate-spin text-blue-500" />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">INVENTARIO MOLDES</h1>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span>Total: {stats.total}</span>
          <span className="text-red-600">Sin: {stats.sin}</span>
          <span className="text-yellow-600">Pocos: {stats.pocos}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-7 h-6 text-xs"
          />
        </div>
        <Select value={filterStock} onValueChange={(value: any) => setFilterStock(value)}>
          <SelectTrigger className="w-32 h-6 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="sin-moldes">Sin moldes</SelectItem>
            <SelectItem value="moldes-bajos">Pocos</SelectItem>
            <SelectItem value="moldes-suficientes">Suficientes</SelectItem>
          </SelectContent>
        </Select>
        {selectedProducts.size > 0 && (
          <Button variant="outline" size="sm" onClick={() => setSelectedProducts(new Set())} className="h-6 text-xs">
            <X className="h-3 w-3 mr-1" />
            {selectedProducts.size}
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={exportToCSV} className="h-6 text-xs">
          <Download className="h-3 w-3 mr-1" />
          CSV
        </Button>
      </div>

      {/* Status */}
      <div className="flex items-center gap-4 text-xs text-gray-600">
        <span>Mostrando: {filteredAndSortedProductos.length}</span>
        {pendingUpdates.size > 0 && (
          <span className="text-yellow-600">Pendientes: {pendingUpdates.size}</span>
        )}
      </div>

      {/* Multiple Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        {productTables.map((products, index) => renderTable(products, index))}
      </div>

      {filteredAndSortedProductos.length === 0 && (
        <div className="text-center py-8 text-sm text-gray-500">
          No se encontraron productos
        </div>
      )}
    </div>
  );
} 