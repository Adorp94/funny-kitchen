"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { RefreshCw, Package, TrendingUp, TrendingDown, Minus, Factory, AlertTriangle, CheckCircle, Clock, Settings, Plus, ChevronsUpDown, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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

interface Producto {
  producto_id: number;
  nombre: string;
  sku?: string;
  tipo_producto?: string;
}

export const ProductionActiveListing: React.FC = () => {
  const [data, setData] = useState<ProductionActiveItem[]>([]);
  const [filteredData, setFilteredData] = useState<ProductionActiveItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'deficit' | 'surplus' | 'balanced'>('all');
  
  // Editable fields state
  const [editingCell, setEditingCell] = useState<{productId: number, field: string} | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [updating, setUpdating] = useState<Set<number>>(new Set());

  // Add producto dialog state
  const [showAddProductoDialog, setShowAddProductoDialog] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [selectedProductoId, setSelectedProductoId] = useState<string>('');
  const [pedidosQuantity, setPedidosQuantity] = useState<string>('');
  
  // Combobox states for producto selection
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [productoSearchTerm, setProductoSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Producto[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingProducto, setIsAddingProducto] = useState(false);

  // Pagination states for producto selection
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // References for infinite scroll
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

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
      // Don't set filteredData here - let applyFilters handle it
      
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

  // Fetch productos for selection
  const fetchProductos = useCallback(async (page = 0, reset = true) => {
    try {
      const pageSize = 50; // Increased from 20 to show more products initially
      const response = await fetch(`/api/productos?page=${page}&pageSize=${pageSize}`);
      if (!response.ok) {
        throw new Error('Failed to fetch productos');
      }
      const result = await response.json();
      const newProductos = (result.data || result).map((p: any) => ({
        producto_id: p.producto_id,
        nombre: p.nombre,
        sku: p.sku,
        tipo_producto: p.tipo_producto
      }));

      if (reset) {
        setProductos(newProductos);
        setCurrentPage(0);
      } else {
        setProductos(prev => [...prev, ...newProductos]);
      }

      setHasMoreProducts(result.hasMore || false);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching productos:', error);
      toast.error('Error al cargar productos', {
        description: 'No se pudieron cargar los productos disponibles',
        duration: 4000,
      });
    }
  }, []);

  // Load more productos for infinite scroll
  const loadMoreProductos = useCallback(async () => {
    if (isLoadingMore || !hasMoreProducts) return;
    
    setIsLoadingMore(true);
    try {
      await fetchProductos(currentPage + 1, false);
    } catch (error) {
      console.error('Error loading more productos:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentPage, hasMoreProducts, isLoadingMore, fetchProductos]);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    applyFilters(term, statusFilter);
  }, [statusFilter]);

  // Search productos for selection
  const searchProductos = useCallback(async (searchValue: string) => {
    setIsSearching(true);
    try {
      if (!searchValue.trim()) {
        // For initial display, show the loaded products (with infinite scroll support)
        setSearchResults(productos);
      } else {
        // Make API call to search all products in the database
        const response = await fetch(`/api/productos?query=${encodeURIComponent(searchValue)}&pageSize=100`);
        if (!response.ok) {
          throw new Error('Failed to search productos');
        }
        const result = await response.json();
        const searchedProductos = (result.data || result).map((p: any) => ({
          producto_id: p.producto_id,
          nombre: p.nombre,
          sku: p.sku,
          tipo_producto: p.tipo_producto
        }));
        setSearchResults(searchedProductos);
      }
    } catch (error) {
      console.error('Error searching productos:', error);
      setSearchResults([]);
      toast.error('Error al buscar productos', {
        description: 'No se pudieron buscar los productos',
        duration: 3000,
      });
    } finally {
      setIsSearching(false);
    }
  }, [productos]);

  // Handle search input change for producto selection
  const handleProductoSearchChange = useCallback((value: string) => {
    setProductoSearchTerm(value);
    searchProductos(value);
  }, [searchProductos]);

  // Enhanced scroll detection for infinite scroll
  useEffect(() => {
    if (!comboboxOpen) return;

    let scrollContainer: HTMLElement | null = null;
    let retryCount = 0;
    const maxRetries = 20; // Try for 2 seconds
    
    const findScrollContainer = () => {
      const selectors = [
        '[cmdk-list]',
        '[role="listbox"]',
        '.cmdk-list',
        '[data-cmdk-list]',
        '[data-radix-command-list]'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector) as HTMLElement;
        if (element) {
          console.log('Found scroll container:', selector);
          return element;
        }
      }
      return null;
    };

    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        const { scrollTop, scrollHeight, clientHeight } = target;
        const scrollPercentage = scrollHeight > clientHeight ? (scrollTop / (scrollHeight - clientHeight)) * 100 : 0;
        const isNearBottom = scrollPercentage > 70; // Lower threshold for better UX

        console.log('Scroll detected:', { 
          scrollTop, 
          scrollHeight, 
          clientHeight, 
          scrollPercentage: Math.round(scrollPercentage),
          isNearBottom,
          hasMoreProducts,
          isLoadingMore,
          searchTerm: productoSearchTerm.trim()
        });

        if (isNearBottom && !productoSearchTerm.trim() && hasMoreProducts && !isLoadingMore) {
          console.log('Loading more products...');
          loadMoreProductos();
        }
      }, 100);
    };

    const setupScrollListener = () => {
      scrollContainer = findScrollContainer();
      if (scrollContainer) {
        scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
        console.log('Scroll listener attached successfully');
      } else if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(setupScrollListener, 100);
      } else {
        console.warn('Could not find scroll container after', maxRetries, 'attempts');
      }
    };

    // Delay setup to ensure DOM is ready
    setTimeout(setupScrollListener, 200);

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [comboboxOpen, productoSearchTerm, hasMoreProducts, isLoadingMore, loadMoreProductos]);

  const handleStatusFilter = useCallback((filter: 'all' | 'deficit' | 'surplus' | 'balanced') => {
    setStatusFilter(filter);
    applyFilters(searchTerm, filter);
  }, [searchTerm]);

    // Handle adding producto to production
  const handleAddProducto = async () => {
    if (!selectedProductoId) {
      toast.error('Campos requeridos', {
        description: 'Por favor selecciona un producto',
        duration: 3000,
      });
      return;
    }

    // Use 0 as default quantity if no quantity is provided or is empty
    const quantity = pedidosQuantity ? parseInt(pedidosQuantity) : 0;
    if (isNaN(quantity) || quantity < 0) {
      toast.error('Cantidad inválida', {
        description: 'La cantidad debe ser un número entero no negativo',
        duration: 3000,
      });
      return;
    }

    setIsAddingProducto(true);
    try {
      // Check if product already exists
      const existingProduct = data.find(item => item.producto_id === parseInt(selectedProductoId));
      
      const response = await fetch('/api/production-active', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          producto_id: parseInt(selectedProductoId),
          pedidos: existingProduct ? existingProduct.pedidos + quantity : quantity,
          por_detallar: 0,
          detallado: 0,
          sancocho: 0,
          terminado: 0
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add producto to production');
      }

      const result = await response.json();
      const productName = productos.find(p => p.producto_id.toString() === selectedProductoId)?.nombre || 'Producto';
      
      if (existingProduct) {
        // Product already exists, pedidos quantity was updated
        toast.success('Producto actualizado', {
          description: `${productName}: ${existingProduct.pedidos} + ${quantity} = ${existingProduct.pedidos + quantity} pedidos`,
          duration: 4000,
        });
      } else {
        // New product was added
        toast.success('Producto agregado', {
          description: `${productName} agregado a producción con ${quantity} pedidos`,
          duration: 3000,
        });
      }
      
      // Refresh the data
      await fetchData();
      
      // Reset form
      setSelectedProductoId('');
      setProductoSearchTerm('');
      setPedidosQuantity('');
      setShowAddProductoDialog(false);
      setComboboxOpen(false);
    } catch (error: any) {
      console.error('Error adding producto:', error);
      toast.error('Error al agregar producto', {
        description: error.message,
        duration: 4000,
      });
    } finally {
      setIsAddingProducto(false);
    }
  };

  // Load initial productos when combobox opens
  useEffect(() => {
    if (comboboxOpen && productos.length > 0) {
      searchProductos('');
    }
  }, [comboboxOpen, productos, searchProductos]);

  // Initialize productos on component mount
  useEffect(() => {
    fetchProductos(0, true);
  }, [fetchProductos]);

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

  const getProductionStatus = (item: ProductionActiveItem): 'deficit' | 'surplus' | 'balanced' => {
    if (item.faltan_sobran < 0) return 'deficit';
    if (item.faltan_sobran > 0) return 'surplus';
    return 'balanced';
  };

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

  // Handle editing production stages
  const handleCellEdit = (productId: number, field: string, currentValue: number) => {
    setEditingCell({ productId, field });
    setEditingValue(currentValue.toString());
  };

  const handleCellSave = async (productId: number, field: string) => {
    const newValue = parseInt(editingValue);
    
    // Validate input
    if (isNaN(newValue) || newValue < 0) {
      toast.error('Valor inválido', { description: 'El valor debe ser un número entero positivo' });
      setEditingCell(null);
      return;
    }

    // Show loading state
    setUpdating(prev => new Set([...prev, productId]));
    
    try {
      const response = await fetch('/api/production-active', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: productId,
          [field]: newValue
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error HTTP: ${response.status}`);
      }

      // Update local data with recalculated totals
      const updatedData = data.map(item => {
        if (item.producto_id === productId) {
          const updatedItem = { ...item, [field]: newValue };
          // Recalculate total pieces in process
          updatedItem.piezas_en_proceso = updatedItem.por_detallar + updatedItem.detallado + updatedItem.sancocho + updatedItem.terminado;
          // Recalculate balance (remaining/surplus)
          updatedItem.faltan_sobran = updatedItem.piezas_en_proceso - updatedItem.pedidos;
          return updatedItem;
        }
        return item;
      });
      setData(updatedData);
      
      // Better field names for toast
      const fieldNames: Record<string, string> = {
        'por_detallar': 'Por Detallar',
        'detallado': 'Detallado',
        'sancocho': 'Sancocho',
        'terminado': 'Terminado'
      };
      
      toast.success('Actualizado', { description: `${fieldNames[field]} actualizado correctamente` });
    } catch (err: any) {
      console.error('Error updating field:', err);
      toast.error('Error al actualizar', { description: err.message });
    } finally {
      setUpdating(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
      setEditingCell(null);
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditingValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, productId: number, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCellSave(productId, field);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCellCancel();
    }
  };

  // Render editable cell
  const renderEditableCell = (item: ProductionActiveItem, field: 'por_detallar' | 'detallado' | 'sancocho' | 'terminado') => {
    const isEditing = editingCell?.productId === item.producto_id && editingCell?.field === field;
    const isUpdating = updating.has(item.producto_id);
    const value = item[field];
    
    if (isEditing) {
      return (
        <div className="flex items-center justify-center">
          <input
            type="number"
            min="0"
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onBlur={() => handleCellSave(item.producto_id, field)}
            onKeyDown={(e) => handleKeyDown(e, item.producto_id, field)}
            className="w-12 h-6 text-xs text-center border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 bg-blue-50"
            autoFocus
          />
        </div>
      );
    }

    const getFieldColor = (field: string) => {
      switch (field) {
        case 'por_detallar': return 'bg-orange-400';
        case 'detallado': return 'bg-blue-400';
        case 'sancocho': return 'bg-red-400';
        case 'terminado': return 'bg-green-400';
        default: return 'bg-gray-200';
      }
    };

    return (
      <div 
        className="flex items-center justify-center space-x-1 cursor-pointer hover:bg-gray-100 rounded px-1 py-1 transition-colors"
        onClick={() => !isUpdating && handleCellEdit(item.producto_id, field, value)}
        title={`Click para editar ${field}`}
      >
        <div className={`w-1.5 h-1.5 rounded-full ${value > 0 ? getFieldColor(field) : 'bg-gray-200'}`} />
        <span className={`${value > 0 ? 'text-gray-900' : 'text-gray-400'} ${isUpdating ? 'opacity-50' : ''}`}>
          {isUpdating ? '...' : value}
        </span>
      </div>
    );
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
          <Dialog 
            open={showAddProductoDialog} 
            onOpenChange={(open) => {
              setShowAddProductoDialog(open);
                             if (open) {
                 // Reset form when opening
                 setSelectedProductoId('');
                 setProductoSearchTerm('');
                 setPedidosQuantity('');
                 setComboboxOpen(false);
               }
            }}
          >
            <DialogTrigger asChild>
              <Button 
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-sm">Agregar Producto a Producción</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Producto</label>
                  <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={comboboxOpen}
                        className="w-full justify-between h-8 text-xs"
                      >
                        {selectedProductoId
                          ? (() => {
                              const selectedProduct = productos.find(p => p.producto_id.toString() === selectedProductoId);
                              return selectedProduct 
                                ? `${selectedProduct.nombre}${selectedProduct.sku ? ` (${selectedProduct.sku})` : ''}`
                                : "Producto seleccionado";
                            })()
                          : "Buscar producto..."}
                        <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                      <Command shouldFilter={false}>
                                                 <CommandInput 
                           placeholder="Buscar por nombre o SKU..." 
                           value={productoSearchTerm}
                           onValueChange={handleProductoSearchChange}
                           className="text-xs"
                         />
                        <CommandList>
                          {isSearching && (
                            <div className="p-2 text-center text-xs flex items-center justify-center text-muted-foreground">
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              Buscando...
                            </div>
                          )}
                          {!isSearching && searchResults.length === 0 && (
                            <CommandEmpty className="text-xs">No se encontraron productos.</CommandEmpty>
                          )}
                          {!isSearching && searchResults.length > 0 && (
                            <CommandGroup>
                              {searchResults.map((producto) => (
                                <CommandItem
                                  key={producto.producto_id}
                                  value={producto.producto_id.toString()}
                                  onSelect={(value) => {
                                    setSelectedProductoId(value);
                                    setComboboxOpen(false);
                                                                         const selected = productos.find(p => p.producto_id.toString() === value);
                                     if (selected) {
                                       setProductoSearchTerm(selected.nombre);
                                     }
                                  }}
                                  className="text-xs"
                                >
                                  <Check
                                    className={cn(
                                      "mr-1 h-3 w-3",
                                      selectedProductoId === producto.producto_id.toString() ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <Package className="mr-1 h-3 w-3 text-muted-foreground" />
                                  <div className="flex-1">
                                    <div className="font-medium">
                                      {producto.nombre}
                                    </div>
                                    {producto.sku && (
                                      <div className="text-xs text-muted-foreground">
                                        SKU: {producto.sku}
                                      </div>
                                    )}
                                    {producto.tipo_producto && (
                                      <div className="text-xs text-muted-foreground">
                                        Tipo: {producto.tipo_producto}
                                      </div>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                                                             {!productoSearchTerm.trim() && hasMoreProducts && (
                                <div 
                                  ref={loadMoreTriggerRef}
                                  className="p-3 text-center cursor-pointer border-t border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
                                  onClick={() => {
                                    if (!isLoadingMore) {
                                      loadMoreProductos();
                                    }
                                  }}
                                >
                                  {isLoadingMore ? (
                                    <div className="flex items-center justify-center text-sm text-gray-600">
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Cargando más productos...
                                    </div>
                                  ) : (
                                    <div className="text-sm text-blue-600 font-medium">
                                      <div>📦 Cargar más productos</div>
                                      <div className="text-xs text-gray-500 mt-1">Click aquí o desplázate hacia abajo</div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Cantidad de Pedidos (opcional)</label>
                  <Input 
                    type="number"
                    value={pedidosQuantity}
                    onChange={(e) => setPedidosQuantity(e.target.value)}
                    placeholder="0 (por defecto)"
                    min="0"
                    className="h-8 text-xs"
                  />
                  <p className="text-xs text-gray-500 mt-1">Si no especificas una cantidad, se usará 0 por defecto</p>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAddProductoDialog(false)} 
                    size="sm" 
                    className="h-7 px-2 text-xs"
                    disabled={isAddingProducto}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleAddProducto} 
                    disabled={!selectedProductoId || isAddingProducto} 
                    size="sm" 
                    className="h-7 px-2 text-xs"
                  >
                    {isAddingProducto ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Agregando...
                      </>
                    ) : (
                      'Agregar'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
                    {renderEditableCell(item, 'por_detallar')}
                  </TableCell>

                  {/* Detallado */}
                  <TableCell className="px-3 py-2 text-xs text-center">
                    {renderEditableCell(item, 'detallado')}
                  </TableCell>

                  {/* Sancocho */}
                  <TableCell className="px-3 py-2 text-xs text-center">
                    {renderEditableCell(item, 'sancocho')}
                  </TableCell>

                  {/* Terminado */}
                  <TableCell className="px-3 py-2 text-xs text-center">
                    {renderEditableCell(item, 'terminado')}
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