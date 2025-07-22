"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from "sonner";
import { MoveToEmpaqueDialog } from './move-to-empaque-dialog';
import { EmpaqueTable } from './empaque-table';
import { EnviadosTable } from './enviados-table';
import { MoveToEnviadosDialog } from './move-to-enviados-dialog';
import { useProductionSync, dispatchProductionUpdate } from '@/lib/utils/production-sync';

interface ProductoConEstatus {
  nombre: string;
  cantidad: number;
  fecha: string;
  precio_venta: number;
  precio_total: number;
  producto_id: number;
  produccion_status: {
    por_detallar: number;
    detallado: number;
    sancocho: number;
    terminado: number;
    terminado_disponible: number;
  };
  empaque_status: {
    cantidad_empaque: number;
  };
}

interface ClienteActivoData {
  cotizacion_id: number;
  folio: string;
  cliente: string;
  total_productos: number;
  precio_total: number;
  productos: ProductoConEstatus[];
}

interface ClienteActivoResponse {
  data: ClienteActivoData;
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
  };
}

// Cache for client data
const clientCache = new Map<string, { data: ClienteActivoData; timestamp: number }>();
const CACHE_DURATION = 120000; // 2 minutes

// Memoized summary component
const ClienteSummary = React.memo(({ clienteData }: { clienteData: ClienteActivoData }) => {
  const totalPiezas = useMemo(() => 
    clienteData.productos.reduce((sum, producto) => sum + producto.cantidad, 0), 
    [clienteData.productos]
  );

  return (
    <div className="grid grid-cols-4 gap-3 p-3 bg-gray-50/50 border border-gray-200 rounded-md">
      <div className="text-center">
        <div className="text-sm font-medium text-gray-900">{clienteData.folio}</div>
        <div className="text-xs text-gray-500">Cotización</div>
      </div>
      <div className="text-center">
        <div className="text-sm font-medium text-gray-900 truncate" title={clienteData.cliente}>
          {clienteData.cliente}
        </div>
        <div className="text-xs text-gray-500">Cliente</div>
      </div>
      <div className="text-center">
        <div className="text-sm font-medium text-gray-900">{totalPiezas} pzas</div>
        <div className="text-xs text-gray-500">Total Productos</div>
      </div>
      <div className="text-center">
        <div className="text-sm font-medium text-gray-900">${clienteData.precio_total.toLocaleString()}</div>
        <div className="text-xs text-gray-500">Precio Total</div>
      </div>
    </div>
  );
});

ClienteSummary.displayName = 'ClienteSummary';

// Memoized product row component
const ProductRow = React.memo(({ 
  producto, 
  index, 
  onProductClick 
}: { 
  producto: ProductoConEstatus; 
  index: number;
  onProductClick?: (producto: ProductoConEstatus) => void;
}) => (
  <TableRow 
    className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
    onClick={() => onProductClick?.(producto)}
  >
    <TableCell className="px-3 py-2">
      <span className="text-xs font-medium text-gray-900">{producto.nombre}</span>
    </TableCell>
    <TableCell className="px-3 py-2 text-center">
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
        {producto.cantidad}
      </span>
    </TableCell>
    <TableCell className="px-3 py-2 text-center">
      <span className="text-xs text-gray-600">{producto.fecha}</span>
    </TableCell>
    <TableCell className="px-3 py-2 text-right">
      <span className="text-xs font-medium text-gray-900">
        ${producto.precio_venta.toLocaleString()}
      </span>
    </TableCell>
    <TableCell className="px-3 py-2 text-right">
      <span className="text-xs font-medium text-green-700">
        ${producto.precio_total.toLocaleString()}
      </span>
    </TableCell>
  </TableRow>
));

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

export const ClientesActivosSection: React.FC = React.memo(() => {
  const [cotizacionId, setCotizacionId] = useState<string>('');
  const [clienteData, setClienteData] = useState<ClienteActivoData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  
  // Enviados data
  const [enviadosData, setEnviadosData] = useState<EnviadosProduct[]>([]);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductoConEstatus | null>(null);
  
  // Move to enviados dialog state
  const [enviadosDialogOpen, setEnviadosDialogOpen] = useState<boolean>(false);
  const [selectedEmpaqueProduct, setSelectedEmpaqueProduct] = useState<{
    nombre: string;
    producto_id: number;
    cantidad_empaque: number;
  } | null>(null);

  const fetchEnviadosData = useCallback(async (cotId: string) => {
    try {
      const response = await fetch(`/api/production/enviados?cotizacion_id=${cotId}`);
      if (response.ok) {
        const result: EnviadosResponse = await response.json();
        setEnviadosData(result.data.productos_enviados || []);
      } else {
        console.error("Error fetching enviados data:", response.status);
        setEnviadosData([]);
      }
    } catch (error) {
      console.error("Error in fetchEnviadosData:", error);
      setEnviadosData([]);
    }
  }, []);

  const searchCotizacion = useCallback(async (forceRefresh = false) => {
    if (!cotizacionId.trim()) {
      toast.error("Por favor ingrese un ID de cotización");
      return;
    }

    const cacheKey = cotizacionId;
    const cached = clientCache.get(cacheKey);
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setClienteData(cached.data);
      setError(null);
      setHasSearched(true);
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);
    
    try {
      const response = await fetch(`/api/production/clientes-activos/${cotizacionId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError("Cotización no encontrada");
          setClienteData(null);
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const result: ClienteActivoResponse = await response.json();
      
      // Cache the result
      clientCache.set(cacheKey, {
        data: result.data,
        timestamp: Date.now()
      });
      
      setClienteData(result.data);
      setError(null);
      
      // Fetch enviados data for this cotizacion
      await fetchEnviadosData(cotizacionId);
      
    } catch (err: any) {
      console.error("Error in searchCotizacion:", err);
      const errorMsg = err.message || "Error al buscar la cotización.";
      setError(errorMsg);
      setClienteData(null);
      toast.error("Error al buscar cotización", {
        description: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  }, [cotizacionId]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchCotizacion();
    }
  }, [searchCotizacion]);

  const clearSearch = useCallback(() => {
    setCotizacionId('');
    setClienteData(null);
    setError(null);
    setHasSearched(false);
    setEnviadosData([]);
  }, []);

  // Handle product click to open empaque dialog
  const handleProductClick = useCallback((producto: ProductoConEstatus) => {
    setSelectedProduct(producto);
    setDialogOpen(true);
  }, []);

  // Handle dialog success (refresh data)
  const handleDialogSuccess = useCallback(() => {
    searchCotizacion(true); // Force refresh to get updated data
    
    // Also dispatch update event for other sections
    if (selectedProduct) {
      dispatchProductionUpdate({
        type: 'empaque_update',
        producto_id: selectedProduct.producto_id,
        timestamp: Date.now(),
        source: 'clientes-activos-empaque'
      });
    }
  }, [searchCotizacion, selectedProduct]);

  // Handle empaque product click to move to enviados
  const handleEmpaqueProductClick = useCallback((producto: any) => {
    setSelectedEmpaqueProduct({
      nombre: producto.nombre,
      producto_id: producto.producto_id || 0,
      cantidad_empaque: producto.cantidad
    });
    setEnviadosDialogOpen(true);
  }, []);

  // Handle enviados dialog success
  const handleEnviadosDialogSuccess = useCallback(() => {
    searchCotizacion(true); // Force refresh to get updated data
    
    // Dispatch update event for other sections
    if (selectedEmpaqueProduct) {
      dispatchProductionUpdate({
        type: 'enviados_update',
        producto_id: selectedEmpaqueProduct.producto_id,
        timestamp: Date.now(),
        source: 'clientes-activos-enviados'
      });
    }
  }, [searchCotizacion, selectedEmpaqueProduct]);

  // Listen for production updates from other sections
  useEffect(() => {
    const cleanup = useProductionSync((event) => {
      // Refresh if we have data loaded - this includes updates from empaque operations
      if (clienteData) {
        const affectedProducts = clienteData.productos.some(p => p.producto_id === event.producto_id);
        
        if (affectedProducts) {
          console.log('Auto-refreshing clientes activos due to production update:', event);
          // Force refresh to get updated production status
          searchCotizacion(true);
        }
      }
    });

    return cleanup;
  }, [clienteData, searchCotizacion]);

  return (
    <div className="space-y-3">
      {/* Search Section */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-900">Buscar Cliente Activo</h2>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              placeholder="ID de cotización (ej: 2126)"
              value={cotizacionId}
              onChange={(e) => setCotizacionId(e.target.value)}
              onKeyPress={handleKeyPress}
              className="h-7 pl-7 pr-3 text-xs w-48 border-gray-300"
              type="number"
            />
          </div>
          <Button 
            onClick={searchCotizacion} 
            disabled={loading || !cotizacionId.trim()}
            size="sm"
            className="h-7 px-3"
          >
            {loading ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <Search className="h-3 w-3" />
            )}
            <span className="ml-1">{loading ? 'Buscando...' : 'Buscar'}</span>
          </Button>
          {(clienteData || hasSearched) && (
            <Button onClick={clearSearch} variant="outline" size="sm" className="h-7 px-2">
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          <div className="h-16 bg-gray-100 rounded animate-pulse"></div>
          <div className="h-32 bg-gray-100 rounded animate-pulse"></div>
          <div className="h-32 bg-gray-100 rounded animate-pulse"></div>
        </div>
      )}

      {/* Error State */}
      {error && hasSearched && !loading && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-3 w-3 text-red-600" />
          <AlertDescription className="text-xs text-red-700">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Client Data Display */}
      {clienteData && !loading && (
        <div className="space-y-3">
          {/* Client Summary */}
          <ClienteSummary clienteData={clienteData} />

          {/* Tables Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Products Table - Left */}
            <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-200 bg-gray-50/50">
                <h3 className="text-xs font-medium text-gray-700">Detalle de Productos</h3>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50 border-b border-gray-200">
                      <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 h-8">Producto</TableHead>
                      <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center h-8">Cantidad</TableHead>
                      <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center h-8">Fecha</TableHead>
                      <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-right h-8">Precio</TableHead>
                      <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-right h-8">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clienteData.productos.map((producto, index) => (
                      <ProductRow
                        key={`${producto.nombre}-${index}`}
                        producto={producto}
                        index={index}
                        onProductClick={handleProductClick}
                      />
                    ))}
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
                  <TableBody>
                    {clienteData.productos.map((producto, index) => (
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

          {/* Empaque and Entregados Tables - Below main tables, side by side */}
          <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
            <EmpaqueTable
              productos={clienteData.productos
                .filter(p => p.empaque_status.cantidad_empaque > 0)
                .map(p => ({
                  nombre: p.nombre,
                  cantidad: p.empaque_status.cantidad_empaque,
                  producto_id: p.producto_id
                }))
              }
              cotizacionId={clienteData.cotizacion_id}
              isLoading={false}
              onProductRemoved={handleDialogSuccess}
              onProductMoved={handleEmpaqueProductClick}
            />
            <EnviadosTable
              productos={enviadosData}
              isLoading={false}
            />
          </div>
        </div>
      )}

      {/* No Search State */}
      {!hasSearched && !loading && (
        <div className="text-center py-12 text-gray-500">
          <Search className="h-6 w-6 text-gray-300 mx-auto mb-2" />
          <h3 className="text-sm font-medium text-gray-700 mb-1">Buscar Cliente Activo</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Ingrese el ID de una cotización para ver el detalle de productos y su estado en la línea de producción.
          </p>
        </div>
      )}

      {/* Move to Empaque Dialog */}
      {selectedProduct && clienteData && (
        <MoveToEmpaqueDialog
          isOpen={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setSelectedProduct(null);
          }}
          producto={{
            nombre: selectedProduct.nombre,
            producto_id: selectedProduct.producto_id,
            cantidad_solicitada: selectedProduct.cantidad,
            terminado_disponible: selectedProduct.produccion_status.terminado_disponible
          }}
          cotizacion_id={clienteData.cotizacion_id}
          onSuccess={handleDialogSuccess}
        />
      )}

      {/* Move to Enviados Dialog */}
      {selectedEmpaqueProduct && clienteData && (
        <MoveToEnviadosDialog
          isOpen={enviadosDialogOpen}
          onClose={() => {
            setEnviadosDialogOpen(false);
            setSelectedEmpaqueProduct(null);
          }}
          producto={{
            nombre: selectedEmpaqueProduct.nombre,
            producto_id: selectedEmpaqueProduct.producto_id,
            cantidad_empaque: selectedEmpaqueProduct.cantidad_empaque
          }}
          cotizacion_id={clienteData.cotizacion_id}
          onSuccess={handleEnviadosDialogSuccess}
        />
      )}
    </div>
  );
});

ClientesActivosSection.displayName = 'ClientesActivosSection'; 