"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { RefreshCw, Search, Plus, Trash2, Package, TableIcon, ChevronDown, ChevronRight, ChevronsUpDown, Check, Loader2, Edit3 } from 'lucide-react';
import { toast } from "sonner";
import { cn } from '@/lib/utils';

// Types
interface ProductoEnMesa {
  id: string;
  producto_id: number;
  nombre: string;
  sku?: string;
  cantidad_moldes: number;
}

interface Mesa {
  id: string;
  nombre: string;
  numero: number;
  productos: ProductoEnMesa[];
}

interface Producto {
  producto_id: number;
  nombre: string;
  sku?: string;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Summary stats component
const SummaryStats = React.memo(({ mesas }: { mesas: Mesa[] }) => {
  const stats = useMemo(() => {
    const totalMesas = mesas.length;
    const totalProductos = mesas.reduce((sum, mesa) => sum + mesa.productos.length, 0);
    const totalMoldes = mesas.reduce((sum, mesa) => 
      sum + mesa.productos.reduce((mesaSum, producto) => mesaSum + producto.cantidad_moldes, 0), 0
    );
    const mesasActivas = mesas.filter(mesa => mesa.productos.length > 0).length;
    
    return { totalMesas, totalProductos, totalMoldes, mesasActivas };
  }, [mesas]);

  return (
    <div className="grid grid-cols-4 gap-4 p-3 bg-muted/30 border rounded-lg">
      <div className="text-center">
        <div className="text-sm font-semibold text-foreground">{stats.totalMesas}</div>
        <div className="text-xs text-muted-foreground">Mesas</div>
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold text-foreground">{stats.totalProductos}</div>
        <div className="text-xs text-muted-foreground">Productos</div>
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold text-foreground">{stats.totalMoldes.toLocaleString()}</div>
        <div className="text-xs text-muted-foreground">Moldes</div>
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold text-foreground">{stats.mesasActivas}</div>
        <div className="text-xs text-muted-foreground">Activas</div>
      </div>
    </div>
  );
});

SummaryStats.displayName = 'SummaryStats';

export function MoldesActivos() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedMesas, setExpandedMesas] = useState<Set<string>>(new Set());
  
  // Dialog states
  const [showAddProductoDialog, setShowAddProductoDialog] = useState(false);
  const [selectedMesaId, setSelectedMesaId] = useState<string>('');
  const [selectedProductoId, setSelectedProductoId] = useState<string>('');
  const [cantidadMoldes, setCantidadMoldes] = useState('');
  
  // Combobox states
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [searchProductTerm, setSearchProductTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Producto[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Editing states
  const [editingQuantities, setEditingQuantities] = useState<Record<string, string>>({});
  
  // Moldes needed states
  const [moldesNeeded, setMoldesNeeded] = useState<any[]>([]);
  const [showMoldesNeeded, setShowMoldesNeeded] = useState(true);

  // Debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Filter and group mesas
  const filteredMesas = useMemo(() => {
    let filtered = mesas;
    
    // Apply search filter
    if (debouncedSearchTerm.trim()) {
      const term = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(mesa => 
        mesa.nombre.toLowerCase().includes(term) ||
        mesa.productos.some(producto => 
          producto.nombre.toLowerCase().includes(term) ||
          (producto.sku && producto.sku.toLowerCase().includes(term))
        )
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      switch (statusFilter) {
        case 'active':
          filtered = filtered.filter(mesa => mesa.productos.length > 0);
          break;
        case 'empty':
          filtered = filtered.filter(mesa => mesa.productos.length === 0);
          break;
      }
    }
    
    return filtered.sort((a, b) => a.numero - b.numero);
  }, [mesas, debouncedSearchTerm, statusFilter]);

  // Fetch functions
  const fetchMesas = useCallback(async () => {
    try {
      const response = await fetch('/api/moldes-activos/mesas');
      if (!response.ok) throw new Error('Failed to fetch mesas');
      const data = await response.json();
      setMesas(data);
    } catch (error) {
      console.error('Error fetching mesas:', error);
      toast.error('Error al cargar las mesas');
    }
  }, []);

  const fetchProductos = useCallback(async () => {
    try {
      const response = await fetch('/api/productos?pageSize=100');
      if (!response.ok) throw new Error('Failed to fetch productos');
      const result = await response.json();
      const productos = (result.data || result).map((p: any) => ({
        producto_id: p.producto_id,
        nombre: p.nombre,
        sku: p.sku
      }));
      setProductos(productos);
    } catch (error) {
      console.error('Error fetching productos:', error);
      toast.error('Error al cargar productos');
    }
  }, []);

  const fetchMoldesNeeded = useCallback(async () => {
    try {
      const response = await fetch('/api/production/moldes-needed');
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch moldes needed:', response.status, errorText);
        // Don't throw error, just set empty array
        setMoldesNeeded([]);
        return;
      }
      
      const result = await response.json();
      setMoldesNeeded(result.data || []);
    } catch (error) {
      console.error('Error fetching moldes needed:', error);
      // Set empty array on error so UI doesn't break
      setMoldesNeeded([]);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch core data first, then moldes needed separately
      await Promise.all([fetchMesas(), fetchProductos()]);
      // Fetch moldes needed separately - don't let it break the main functionality
      fetchMoldesNeeded();
    } finally {
      setLoading(false);
    }
  }, [fetchMesas, fetchProductos, fetchMoldesNeeded]);

  // Search productos
  const searchProductos = useCallback(async (searchValue: string) => {
    setIsSearching(true);
    try {
      if (!searchValue.trim()) {
        setSearchResults(productos.slice(0, 50));
      } else {
        const response = await fetch(`/api/productos?query=${encodeURIComponent(searchValue)}&pageSize=50`);
        if (!response.ok) throw new Error('Failed to search productos');
        const result = await response.json();
        const searchedProductos = (result.data || result).map((p: any) => ({
          producto_id: p.producto_id,
          nombre: p.nombre,
          sku: p.sku
        }));
        setSearchResults(searchedProductos);
      }
    } catch (error) {
      console.error('Error searching productos:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [productos]);

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleProductSearchChange = useCallback((value: string) => {
    setSearchProductTerm(value);
    searchProductos(value);
  }, [searchProductos]);

  // Toggle mesa expansion
  const toggleMesa = useCallback((mesaId: string) => {
    setExpandedMesas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mesaId)) {
        newSet.delete(mesaId);
      } else {
        newSet.add(mesaId);
      }
      return newSet;
    });
  }, []);

  // Expand all mesas by default when data loads
  useEffect(() => {
    if (filteredMesas.length > 0) {
      const mesaIds = new Set(filteredMesas.map(m => m.id));
      setExpandedMesas(mesaIds);
    }
  }, [filteredMesas]);

  // Initialize search results when combobox opens
  useEffect(() => {
    if (comboboxOpen && productos.length > 0) {
      searchProductos('');
    }
  }, [comboboxOpen, productos, searchProductos]);

  // Get selected product
  const selectedProduct = productos.find(p => p.producto_id.toString() === selectedProductoId) || 
                         searchResults.find(p => p.producto_id.toString() === selectedProductoId);

  // Add producto to mesa
  const handleAddProducto = async () => {
    if (!selectedMesaId || !selectedProductoId) {
      toast.error('Selecciona una mesa y un producto');
      return;
    }

    try {
      const quantity = cantidadMoldes ? parseInt(cantidadMoldes) : 0;
      
      const response = await fetch('/api/moldes-activos/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mesa_id: selectedMesaId,
          producto_id: parseInt(selectedProductoId),
          cantidad_moldes: quantity
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add producto');
      }

      const result = await response.json();
      const productName = result.producto.nombre;
      const mesaName = mesas.find(m => m.id === selectedMesaId)?.nombre || 'la mesa';
      
      if (result.action === 'updated') {
        setMesas(prev => prev.map(mesa => 
          mesa.id === selectedMesaId 
            ? {
                ...mesa, 
                productos: mesa.productos.map(producto => 
                  producto.id === result.producto.id ? result.producto : producto
                )
              }
            : mesa
        ));
        toast.success(`${productName} actualizado en ${mesaName}: ${result.producto.cantidad_moldes} moldes`);
      } else {
        setMesas(prev => prev.map(mesa => 
          mesa.id === selectedMesaId 
            ? { ...mesa, productos: [...mesa.productos, result.producto] }
            : mesa
        ));
        toast.success(`${productName} agregado a ${mesaName}`);
      }
      
      // Reset form
      setSelectedProductoId('');
      setSearchProductTerm('');
      setCantidadMoldes('');
      setShowAddProductoDialog(false);
      setComboboxOpen(false);
    } catch (error: any) {
      console.error('Error adding producto:', error);
      toast.error(`Error: ${error.message}`);
    }
  };

  // Handle quantity changes
  const handleQuantityChange = (productoId: string, value: string) => {
    setEditingQuantities(prev => ({ ...prev, [productoId]: value }));
  };

  const handleQuantityKeyDown = async (
    e: React.KeyboardEvent<HTMLInputElement>, 
    mesaId: string, 
    productoId: string, 
    currentValue: string
  ) => {
    if (e.key === 'Enter') {
      const newQuantity = parseInt(currentValue) || 0;
      if (newQuantity < 0) return;

      try {
        const response = await fetch('/api/moldes-activos/productos', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: productoId, cantidad_moldes: newQuantity })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update cantidad');
        }

        setMesas(prev => prev.map(mesa => 
          mesa.id === mesaId 
            ? {
                ...mesa, 
                productos: mesa.productos.map(producto => 
                  producto.id === productoId 
                    ? { ...producto, cantidad_moldes: newQuantity }
                    : producto
                )
              }
            : mesa
        ));

        setEditingQuantities(prev => {
          const newState = { ...prev };
          delete newState[productoId];
          return newState;
        });

        toast.success('Cantidad actualizada');
      } catch (error: any) {
        console.error('Error updating cantidad:', error);
        toast.error(`Error: ${error.message}`);
        setEditingQuantities(prev => {
          const newState = { ...prev };
          delete newState[productoId];
          return newState;
        });
      }
    }
  };

  const handleQuantityBlur = (productoId: string) => {
    setEditingQuantities(prev => {
      const newState = { ...prev };
      delete newState[productoId];
      return newState;
    });
  };

  // Remove producto
  const handleRemoveProducto = async (mesaId: string, productoId: string) => {
    try {
      const mesa = mesas.find(m => m.id === mesaId);
      const producto = mesa?.productos.find(p => p.id === productoId);
      const productName = producto?.nombre || 'Producto';

      const response = await fetch(`/api/moldes-activos/productos?id=${productoId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove producto');
      }

      setMesas(prev => prev.map(mesa => 
        mesa.id === mesaId 
          ? { ...mesa, productos: mesa.productos.filter(p => p.id !== productoId) }
          : mesa
      ));
      
      toast.success(`${productName} removido`);
    } catch (error: any) {
      console.error('Error removing producto:', error);
      toast.error(`Error: ${error.message}`);
    }
  };

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && mesas.length === 0) {
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

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">Mesas de Trabajo</h2>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="active">Con productos</SelectItem>
              <SelectItem value="empty">Vacías</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Buscar mesas o productos..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs w-48"
            />
          </div>
          <Button 
            onClick={fetchData} 
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
      <SummaryStats mesas={filteredMesas} />

      {/* Moldes Needed Section */}
      {moldesNeeded.length > 0 && (
        <div className="border rounded-lg bg-card shadow-sm">
          <div 
            className="flex items-center justify-between p-3 bg-orange-50/50 border-b cursor-pointer hover:bg-orange-50/80 transition-colors"
            onClick={() => setShowMoldesNeeded(!showMoldesNeeded)}
          >
            <div className="flex items-center gap-2">
              {showMoldesNeeded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-foreground">Moldes Necesarios</span>
              </div>
            </div>
            <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-200">
              {moldesNeeded.length} productos
            </Badge>
          </div>
          {showMoldesNeeded && (
            <div className="p-4">
              <div className="text-xs text-muted-foreground mb-3">
                Productos que necesitan moldes para completar cotizaciones en producción activa
              </div>
              <div className="grid gap-2">
                {moldesNeeded.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-orange-50/30 rounded border">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">{item.producto_nombre}</div>
                      <div className="text-xs text-muted-foreground">
                        Cotización: {item.cotizacion_folio} • {item.days_pending} días pendiente
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          // TODO: Add functionality to mark as resolved
                          toast.info("Funcionalidad pendiente: marcar como resuelto");
                        }}
                      >
                        Resuelto
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground">
            {filteredMesas.length} mesas • {filteredMesas.reduce((sum, mesa) => sum + mesa.productos.length, 0)} productos
          </div>
          {filteredMesas.length > 0 && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => {
                  const allMesaIds = new Set(filteredMesas.map(m => m.id));
                  setExpandedMesas(allMesaIds);
                }}
              >
                Expandir todo
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setExpandedMesas(new Set())}
              >
                Contraer todo
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mesas Groups */}
      <div className="space-y-2">
        {filteredMesas.length === 0 ? (
          <div className="border rounded-lg bg-card shadow-sm">
            <div className="h-24 text-center text-sm text-muted-foreground flex items-center justify-center">
              {debouncedSearchTerm || statusFilter !== 'all' 
                ? 'No se encontraron mesas con los filtros actuales' 
                : 'No hay mesas disponibles'
              }
            </div>
          </div>
        ) : (
          filteredMesas.map((mesa) => (
            <div key={mesa.id} className="border rounded-lg bg-card shadow-sm">
              {/* Mesa Header */}
              <div 
                className="flex items-center justify-between p-3 bg-muted/30 border-b cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleMesa(mesa.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {expandedMesas.has(mesa.id) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Badge variant="outline" className="text-xs font-medium">
                      Mesa {mesa.numero}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <TableIcon className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{mesa.nombre}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {mesa.productos.length} productos
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {mesa.productos.reduce((sum, p) => sum + p.cantidad_moldes, 0)} moldes
                  </Badge>
                  <Dialog 
                    open={showAddProductoDialog && selectedMesaId === mesa.id} 
                    onOpenChange={(open) => {
                      setShowAddProductoDialog(open);
                      if (open) {
                        setSelectedMesaId(mesa.id);
                        setSelectedProductoId('');
                        setSearchProductTerm('');
                        setCantidadMoldes('');
                        setComboboxOpen(false);
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-6 w-6 p-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-sm">Agregar Producto a {mesa.nombre}</DialogTitle>
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
                                {selectedProduct
                                  ? `${selectedProduct.nombre}${selectedProduct.sku ? ` (${selectedProduct.sku})` : ''}`
                                  : "Buscar producto..."}
                                <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                              <Command shouldFilter={false}>
                                <CommandInput 
                                  placeholder="Buscar por nombre o SKU..." 
                                  value={searchProductTerm}
                                  onValueChange={handleProductSearchChange}
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
                                            const selected = searchResults.find(p => p.producto_id.toString() === value);
                                            if (selected) {
                                              setSearchProductTerm(selected.nombre);
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
                                            <div className="font-medium">{producto.nombre}</div>
                                            {producto.sku && (
                                              <div className="text-xs text-muted-foreground">SKU: {producto.sku}</div>
                                            )}
                                          </div>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  )}
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block">Cantidad de Moldes</label>
                          <Input 
                            type="number"
                            value={cantidadMoldes}
                            onChange={(e) => setCantidadMoldes(e.target.value)}
                            placeholder="0"
                            min="0"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            onClick={() => setShowAddProductoDialog(false)} 
                            size="sm" 
                            className="h-7 px-2 text-xs"
                          >
                            Cancelar
                          </Button>
                          <Button 
                            onClick={handleAddProducto} 
                            disabled={!selectedProductoId} 
                            size="sm" 
                            className="h-7 px-2 text-xs"
                          >
                            Agregar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Products Table */}
              {expandedMesas.has(mesa.id) && (
                <div className="overflow-x-auto">
                  {mesa.productos.length === 0 ? (
                    <div className="h-24 text-center text-sm text-muted-foreground flex items-center justify-center">
                      Sin productos asignados
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-b">
                          <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground">Producto</TableHead>
                          <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground text-center w-32">SKU</TableHead>
                          <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground text-center w-24">Moldes</TableHead>
                          <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground text-center w-20">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mesa.productos.map((producto) => {
                          const isEditing = editingQuantities[producto.id] !== undefined;
                          const displayValue = isEditing 
                            ? editingQuantities[producto.id] 
                            : producto.cantidad_moldes.toString();
                          
                          return (
                            <TableRow key={producto.id} className="hover:bg-muted/30 transition-colors h-12">
                              <TableCell className="px-4 py-2">
                                <div className="flex items-center gap-2">
                                  <Package className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm font-medium text-foreground">{producto.nombre}</span>
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-2 text-center w-32">
                                {producto.sku ? (
                                  <Badge variant="outline" className="text-xs whitespace-nowrap">{producto.sku}</Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="px-4 py-2 text-center">
                                <div className="flex items-center justify-center">
                                  <Input 
                                    type="number"
                                    value={displayValue}
                                    onChange={(e) => handleQuantityChange(producto.id, e.target.value)}
                                    onKeyDown={(e) => handleQuantityKeyDown(e, mesa.id, producto.id, displayValue)}
                                    onBlur={() => handleQuantityBlur(producto.id)}
                                    className="w-16 h-7 text-center text-xs"
                                    min="0"
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-2 text-center">
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => handleRemoveProducto(mesa.id, producto.id)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {filteredMesas.length > 0 && (
        <div className="flex justify-between items-center text-xs text-muted-foreground px-1">
          <span>
            {filteredMesas.length} mesas • {filteredMesas.reduce((sum, mesa) => sum + mesa.productos.length, 0)} productos
          </span>
          <span>
            {filteredMesas.reduce((sum, mesa) => sum + mesa.productos.reduce((mesaSum, producto) => mesaSum + producto.cantidad_moldes, 0), 0).toLocaleString()} moldes total
          </span>
        </div>
      )}
    </div>
  );
}