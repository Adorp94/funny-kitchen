"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Plus, Trash2, Package, TableIcon, ChevronsUpDown, Check, Loader2 } from 'lucide-react';
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

export function MoldesActivos() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);

  // Dialog states for adding productos
  const [showAddProductoDialog, setShowAddProductoDialog] = useState(false);
  const [selectedMesaId, setSelectedMesaId] = useState<string>('');
  
  // Form states
  const [selectedProductoId, setSelectedProductoId] = useState<string>('');
  const [cantidadMoldes, setCantidadMoldes] = useState('');

  // Combobox states
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Producto[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // State for editing quantities (to avoid constant API calls)
  const [editingQuantities, setEditingQuantities] = useState<Record<string, string>>({});

  // Fetch data from API
  const fetchMesas = useCallback(async () => {
    try {
      const response = await fetch('/api/moldes-activos/mesas');
      if (!response.ok) {
        throw new Error('Failed to fetch mesas');
      }
      const data = await response.json();
      setMesas(data);
    } catch (error) {
      console.error('Error fetching mesas:', error);
      toast.error('Error al cargar las mesas', {
        description: 'No se pudieron cargar las mesas de producción',
        duration: 4000,
      });
    }
  }, []);

  const fetchProductos = useCallback(async () => {
    try {
      const response = await fetch('/api/productos');
      if (!response.ok) {
        throw new Error('Failed to fetch productos');
      }
      const result = await response.json();
      const productos = result.data || result;
      setProductos(productos.map((p: any) => ({
        producto_id: p.producto_id,
        nombre: p.nombre,
        sku: p.sku
      })));
    } catch (error) {
      console.error('Error fetching productos:', error);
      toast.error('Error al cargar los productos', {
        description: 'No se pudieron cargar los productos disponibles',
        duration: 4000,
      });
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchMesas(), fetchProductos()]);
    } finally {
      setLoading(false);
    }
  }, [fetchMesas, fetchProductos]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Search productos with debouncing
  const searchProductos = useCallback(async (searchValue: string) => {
    setIsSearching(true);
    try {
      if (!searchValue.trim()) {
        setSearchResults(productos.slice(0, 20)); // Show first 20 products when no search
      } else {
        const filtered = productos.filter(producto => 
          producto.nombre.toLowerCase().includes(searchValue.toLowerCase()) ||
          (producto.sku && producto.sku.toLowerCase().includes(searchValue.toLowerCase()))
        );
        setSearchResults(filtered.slice(0, 20)); // Limit to 20 results
      }
    } catch (error) {
      console.error('Error searching productos:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [productos]);

  // Handle search input change with debouncing
  const handleSearchInputChange = useCallback((value: string) => {
    setSearchTerm(value);
    searchProductos(value);
  }, [searchProductos]);

  // Load initial products when combobox opens
  useEffect(() => {
    if (comboboxOpen && productos.length > 0) {
      searchProductos('');
    }
  }, [comboboxOpen, productos, searchProductos]);

  // Get selected product for display
  const selectedProduct = productos.find(p => p.producto_id.toString() === selectedProductoId);

  // Add producto to mesa
  const handleAddProducto = async () => {
    if (!selectedMesaId || !selectedProductoId || !cantidadMoldes) {
      toast.error('Campos requeridos', {
        description: 'Por favor complete todos los campos',
        duration: 3000,
      });
      return;
    }

    try {
      const response = await fetch('/api/moldes-activos/productos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mesa_id: selectedMesaId,
          producto_id: parseInt(selectedProductoId),
          cantidad_moldes: parseInt(cantidadMoldes)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add producto to mesa');
      }

      const result = await response.json();
      const productName = result.producto.nombre;
      const mesaName = mesas.find(m => m.id === selectedMesaId)?.nombre || 'la mesa';
      
      if (result.action === 'updated') {
        // Product already existed, quantity was updated
        setMesas(prev => prev.map(mesa => 
          mesa.id === selectedMesaId 
            ? {
                ...mesa, 
                productos: mesa.productos.map(producto => 
                  producto.id === result.producto.id 
                    ? result.producto
                    : producto
                )
              }
            : mesa
        ));
        
        toast.success('Cantidad actualizada', {
          description: `${productName} en ${mesaName}: ${result.previousQuantity} + ${result.addedQuantity} = ${result.producto.cantidad_moldes} moldes`,
          duration: 4000,
        });
      } else {
        // New product was added
        setMesas(prev => prev.map(mesa => 
          mesa.id === selectedMesaId 
            ? { ...mesa, productos: [...mesa.productos, result.producto] }
            : mesa
        ));
        
        toast.success('Producto agregado', {
          description: `${productName} agregado a ${mesaName} con ${result.producto.cantidad_moldes} moldes`,
          duration: 3000,
        });
      }
      
      // Reset form
      setSelectedProductoId('');
      setSearchTerm('');
      setCantidadMoldes('');
      setShowAddProductoDialog(false);
      setComboboxOpen(false);
    } catch (error) {
      console.error('Error adding producto:', error);
      toast.error('Error al agregar producto', {
        description: error.message,
        duration: 4000,
      });
    }
  };

  // Handle quantity input change (optimistic update)
  const handleQuantityInputChange = (productoId: string, value: string) => {
    setEditingQuantities(prev => ({
      ...prev,
      [productoId]: value
    }));
  };

  // Handle Enter key press to save quantity
  const handleQuantityKeyDown = async (
    e: React.KeyboardEvent<HTMLInputElement>, 
    mesaId: string, 
    productoId: string, 
    currentValue: string
  ) => {
    console.log('Key pressed:', e.key, 'for product:', productoId);
    
    if (e.key === 'Enter') {
      console.log('Enter key detected! Processing...', 'Product:', productoId, 'Value:', currentValue);
      
      const newQuantity = parseInt(currentValue) || 0;
      if (newQuantity < 0) return;

      // Get product name BEFORE the API call to ensure we have it
      const mesa = mesas.find(m => m.id === mesaId);
      const producto = mesa?.productos.find(p => p.id === productoId);
      const productName = producto?.nombre || 'Producto';
      
      console.log('Found product for notification:', productName);

      try {
        console.log('Making PATCH request to update quantity...');
        
        const response = await fetch('/api/moldes-activos/productos', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: productoId,
            cantidad_moldes: newQuantity
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update cantidad');
        }

        const result = await response.json();
        console.log('API response:', result);

        // Update the actual data
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

        // Clear the editing state
        setEditingQuantities(prev => {
          const newState = { ...prev };
          delete newState[productoId];
          return newState;
        });

        console.log('About to show toast notification...');

        toast.success('Cantidad actualizada', {
          description: `${productName}: ${newQuantity} moldes`,
          duration: 3000,
        });
        
        console.log('Toast notification should be visible now');
        
      } catch (error) {
        console.error('Error updating cantidad:', error);
        toast.error('Error al actualizar cantidad', {
          description: error.message,
          duration: 4000,
        });
        
        // Revert the editing state
        setEditingQuantities(prev => {
          const newState = { ...prev };
          delete newState[productoId];
          return newState;
        });
      }
    }
  };

  // Handle blur event to revert if no save occurred
  const handleQuantityBlur = (productoId: string, originalValue: number) => {
    setEditingQuantities(prev => {
      const newState = { ...prev };
      delete newState[productoId];
      return newState;
    });
  };

  // Remove producto from mesa
  const handleRemoveProducto = async (mesaId: string, productoId: string) => {
    try {
      // Get product and mesa names before removal for better notification
      const mesa = mesas.find(m => m.id === mesaId);
      const producto = mesa?.productos.find(p => p.id === productoId);
      const productName = producto?.nombre || 'Producto';
      const mesaName = mesa?.nombre || 'la mesa';

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
      
      toast.success('Producto removido', {
        description: `${productName} removido de ${mesaName}`,
        duration: 3000,
      });
    } catch (error) {
      console.error('Error removing producto:', error);
      toast.error('Error al remover producto', {
        description: error.message,
        duration: 4000,
      });
    }
  };

  return (
    <div className="space-y-2">
      {/* Compact Header */}
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">
          {mesas.length} mesas de trabajo
        </span>
        <Button 
          onClick={fetchData} 
          disabled={loading} 
          variant="outline" 
          size="sm"
          className="h-7 px-2 text-xs"
        >
          <Package className={`mr-1 h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <div className="flex justify-center items-center space-x-2">
            <Package className="h-3 w-3 animate-spin" />
            <span className="text-xs text-muted-foreground">Cargando mesas...</span>
          </div>
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {mesas.map((mesa) => (
            <Card key={mesa.id} className="border">
              <CardHeader className="p-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-1 text-sm">
                    <TableIcon className="h-3 w-3" />
                    {mesa.nombre}
                  </CardTitle>
                  <Dialog 
                    open={showAddProductoDialog && selectedMesaId === mesa.id} 
                    onOpenChange={(open) => {
                      setShowAddProductoDialog(open);
                      if (open) {
                        setSelectedMesaId(mesa.id);
                        // Reset form when opening
                        setSelectedProductoId('');
                        setSearchTerm('');
                        setCantidadMoldes('');
                        setComboboxOpen(false);
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="h-6 w-6 p-0">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
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
                                  value={searchTerm}
                                  onValueChange={handleSearchInputChange}
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
                                              setSearchTerm(selected.nombre);
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
                            placeholder="ej: 10"
                            min="1"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setShowAddProductoDialog(false)} size="sm" className="h-7 px-2 text-xs">
                            Cancelar
                          </Button>
                          <Button onClick={handleAddProducto} disabled={!selectedProductoId || !cantidadMoldes} size="sm" className="h-7 px-2 text-xs">
                            Agregar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="p-2">
                <div className="space-y-1">
                  {mesa.productos.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Sin productos
                    </p>
                  ) : (
                    mesa.productos.map((producto) => {
                      const isEditing = editingQuantities[producto.id] !== undefined;
                      const displayValue = isEditing 
                        ? editingQuantities[producto.id] 
                        : producto.cantidad_moldes.toString();
                      
                      return (
                        <div key={producto.id} className="flex items-center justify-between p-1 bg-muted rounded text-xs">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium truncate">{producto.nombre}</span>
                            </div>
                            {producto.sku && (
                              <p className="text-xs text-muted-foreground truncate">{producto.sku}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                            <Input 
                              type="number"
                              value={displayValue}
                              onChange={(e) => handleQuantityInputChange(producto.id, e.target.value)}
                              onKeyDown={(e) => handleQuantityKeyDown(e, mesa.id, producto.id, displayValue)}
                              onBlur={() => handleQuantityBlur(producto.id, producto.cantidad_moldes)}
                              className="w-12 h-6 text-center text-xs border-0 bg-background"
                              min="0"
                            />
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleRemoveProducto(mesa.id, producto.id)}
                              className="h-6 w-6 p-0"
                            >
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {mesa.productos.length > 0 && (
                  <div className="mt-2 pt-1 border-t">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">Total:</span>
                      <span className="font-bold">
                        {mesa.productos.reduce((sum, p) => {
                          // Use editing value if currently editing, otherwise use actual value
                          const value = editingQuantities[p.id] !== undefined 
                            ? parseInt(editingQuantities[p.id]) || 0
                            : p.cantidad_moldes;
                          return sum + value;
                        }, 0)} moldes
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}