"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Package, 
  Users, 
  ArrowRight, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Send,
  Edit3,
  Calendar
} from 'lucide-react';
import { toast } from "sonner";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Types
interface ProductionPhase {
  pedidos: number;
  por_detallar: number;
  detallado: number;
  sancocho: number;
  terminado: number;
  piezas_en_proceso: number;
}

interface ClientDemand {
  cotizacion_id: number;
  cotizacion_folio: string;
  cliente_id: number;
  cliente_nombre: string;
  cantidad_pendiente: number;
  cantidad_total: number;
  fecha_pago: string;
  dias_espera: number;
  prioridad: boolean;
  is_premium: boolean;
  fecha_prometida?: string;
}

interface ProductInfo {
  producto_id: number;
  nombre: string;
  sku?: string;
  vueltas_max_dia: number;
  moldes_disponibles: number;
}

interface AllocationRecord {
  cotizacion_id: number;
  cantidad_asignada: number;
  fecha_asignacion: string;
  notas?: string;
}

export function ProductionFulfillmentDashboard() {
  // State
  const [selectedProduct, setSelectedProduct] = useState<ProductInfo | null>(null);
  const [productionStatus, setProductionStatus] = useState<ProductionPhase | null>(null);
  const [clientDemands, setClientDemands] = useState<ClientDemand[]>([]);
  const [availableProducts, setAvailableProducts] = useState<ProductInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [allocating, setAllocating] = useState(false);
  
  // Phase update states
  const [editingPhase, setEditingPhase] = useState<string | null>(null);
  const [tempPhaseValues, setTempPhaseValues] = useState<Partial<ProductionPhase>>({});
  
  // Allocation dialog
  const [showAllocationDialog, setShowAllocationDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientDemand | null>(null);
  const [allocationQuantity, setAllocationQuantity] = useState<string>('');
  const [allocationNotes, setAllocationNotes] = useState<string>('');

  // Fetch available products
  const fetchAvailableProducts = useCallback(async () => {
    try {
      const response = await fetch('/api/production/products-with-demand');
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      setAvailableProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Error al cargar productos');
    }
  }, []);

  // Fetch production status for selected product
  const fetchProductionStatus = useCallback(async (productId: number) => {
    try {
      const response = await fetch(`/api/production/status/${productId}`);
      if (!response.ok) throw new Error('Failed to fetch production status');
      const data = await response.json();
      setProductionStatus(data.status);
    } catch (error) {
      console.error('Error fetching production status:', error);
      toast.error('Error al cargar estado de producción');
    }
  }, []);

  // Fetch client demands for selected product
  const fetchClientDemands = useCallback(async (productId: number) => {
    try {
      const response = await fetch(`/api/production/client-demands/${productId}`);
      if (!response.ok) throw new Error('Failed to fetch client demands');
      const data = await response.json();
      setClientDemands(data.demands || []);
    } catch (error) {
      console.error('Error fetching client demands:', error);
      toast.error('Error al cargar demanda de clientes');
    }
  }, []);

  // Load data when product is selected
  useEffect(() => {
    if (selectedProduct) {
      setLoading(true);
      Promise.all([
        fetchProductionStatus(selectedProduct.producto_id),
        fetchClientDemands(selectedProduct.producto_id)
      ]).finally(() => setLoading(false));
    }
  }, [selectedProduct, fetchProductionStatus, fetchClientDemands]);

  // Load available products on mount
  useEffect(() => {
    fetchAvailableProducts();
  }, [fetchAvailableProducts]);

  // Update production phase
  const updateProductionPhase = async (phase: string, newValue: number) => {
    if (!selectedProduct) return;

    try {
      const response = await fetch('/api/production/update-phase', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: selectedProduct.producto_id,
          phase,
          value: newValue
        })
      });

      if (!response.ok) throw new Error('Failed to update phase');
      
      await fetchProductionStatus(selectedProduct.producto_id);
      toast.success(`${phase} actualizado exitosamente`);
      setEditingPhase(null);
      setTempPhaseValues({});
    } catch (error) {
      console.error('Error updating phase:', error);
      toast.error('Error al actualizar fase de producción');
    }
  };

  // Handle allocation
  const handleAllocation = async () => {
    if (!selectedProduct || !selectedClient || !allocationQuantity) return;

    const quantity = parseInt(allocationQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Cantidad inválida');
      return;
    }

    if (quantity > (productionStatus?.terminado || 0)) {
      toast.error('No hay suficientes productos terminados');
      return;
    }

    if (quantity > selectedClient.cantidad_pendiente) {
      toast.error('La cantidad excede lo que necesita el cliente');
      return;
    }

    setAllocating(true);
    try {
      const response = await fetch('/api/production/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: selectedProduct.producto_id,
          cotizacion_id: selectedClient.cotizacion_id,
          cantidad: quantity,
          notas: allocationNotes
        })
      });

      if (!response.ok) throw new Error('Failed to allocate products');

      toast.success(`${quantity} unidades asignadas a ${selectedClient.cliente_nombre}`);
      
      // Refresh data
      await Promise.all([
        fetchProductionStatus(selectedProduct.producto_id),
        fetchClientDemands(selectedProduct.producto_id)
      ]);

      // Reset dialog
      setShowAllocationDialog(false);
      setSelectedClient(null);
      setAllocationQuantity('');
      setAllocationNotes('');
    } catch (error) {
      console.error('Error allocating products:', error);
      toast.error('Error al asignar productos');
    } finally {
      setAllocating(false);
    }
  };

  // Phase update handlers
  const startEditingPhase = (phase: string, currentValue: number) => {
    setEditingPhase(phase);
    setTempPhaseValues({ [phase]: currentValue });
  };

  const savePhaseEdit = async (phase: string) => {
    const newValue = tempPhaseValues[phase as keyof ProductionPhase];
    if (newValue !== undefined) {
      await updateProductionPhase(phase, newValue);
    }
  };

  const cancelPhaseEdit = () => {
    setEditingPhase(null);
    setTempPhaseValues({});
  };

  // Format helpers
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: es });
  };

  const getDaysWaitingColor = (days: number) => {
    if (days > 30) return 'text-red-600 font-semibold';
    if (days > 14) return 'text-orange-600 font-medium';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Package className="h-5 w-5 text-blue-600" />
          <h1 className="text-xl font-semibold">Dashboard de Cumplimiento de Producción</h1>
        </div>
        <Button onClick={fetchAvailableProducts} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Product Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Seleccionar Producto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableProducts.map((product) => (
              <Card 
                key={product.producto_id}
                className={`cursor-pointer transition-all ${
                  selectedProduct?.producto_id === product.producto_id 
                    ? 'ring-2 ring-blue-500 bg-blue-50' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedProduct(product)}
              >
                <CardContent className="p-3">
                  <div className="font-medium text-sm">{product.nombre}</div>
                  {product.sku && (
                    <div className="text-xs text-gray-500 mt-1">SKU: {product.sku}</div>
                  )}
                  <div className="flex justify-between items-center mt-2 text-xs text-gray-600">
                    <span>Vueltas/día: {product.vueltas_max_dia}</span>
                    <span>Moldes: {product.moldes_disponibles}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Dashboard */}
      {selectedProduct && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Production Pipeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-4 w-4" />
                <span>Pipeline de Producción - {selectedProduct.nombre}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : productionStatus ? (
                <div className="space-y-4">
                  {[
                    { key: 'pedidos', label: 'Pedidos', icon: Clock, color: 'bg-gray-100' },
                    { key: 'por_detallar', label: 'Por Detallar', icon: Edit3, color: 'bg-yellow-100' },
                    { key: 'detallado', label: 'Detallado', icon: CheckCircle, color: 'bg-blue-100' },
                    { key: 'sancocho', label: 'Sancocho', icon: Package, color: 'bg-orange-100' },
                    { key: 'terminado', label: 'Terminado', icon: CheckCircle, color: 'bg-green-100' }
                  ].map(({ key, label, icon: Icon, color }) => (
                    <div key={key} className={`p-3 rounded-lg ${color}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Icon className="h-4 w-4" />
                          <span className="font-medium text-sm">{label}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {editingPhase === key ? (
                            <div className="flex items-center space-x-1">
                              <Input
                                type="number"
                                min="0"
                                value={tempPhaseValues[key as keyof ProductionPhase] || 0}
                                onChange={(e) => setTempPhaseValues({
                                  ...tempPhaseValues,
                                  [key]: parseInt(e.target.value) || 0
                                })}
                                className="w-16 h-6 text-xs"
                              />
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-6 px-2 text-xs"
                                onClick={() => savePhaseEdit(key)}
                              >
                                ✓
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-6 px-2 text-xs"
                                onClick={cancelPhaseEdit}
                              >
                                ✕
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="font-semibold text-lg">
                                {productionStatus[key as keyof ProductionPhase]}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => startEditingPhase(key, productionStatus[key as keyof ProductionPhase])}
                              >
                                <Edit3 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Separator />
                  
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">Total en Proceso</span>
                      <span className="font-bold text-lg text-blue-600">
                        {productionStatus.piezas_en_proceso}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No hay datos de producción disponibles
                </div>
              )}
            </CardContent>
          </Card>

          {/* Client Demand Queue */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Cola de Demanda de Clientes</span>
                </div>
                <Badge variant="outline">
                  {clientDemands.length} clientes esperando
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : clientDemands.length > 0 ? (
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {clientDemands.map((demand) => (
                      <Card 
                        key={demand.cotizacion_id} 
                        className="border-l-4 border-l-blue-500 hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          setSelectedClient(demand);
                          setShowAllocationDialog(true);
                        }}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-sm">{demand.cliente_nombre}</span>
                                {demand.prioridad && (
                                  <Badge variant="destructive" className="text-xs">Prioridad</Badge>
                                )}
                                {demand.is_premium && (
                                  <Badge variant="default" className="text-xs">Premium</Badge>
                                )}
                              </div>
                              <div className="text-xs text-gray-600">
                                Folio: {demand.cotizacion_folio}
                              </div>
                              <div className="text-xs text-gray-600">
                                Pago: {formatDate(demand.fecha_pago)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-lg text-blue-600">
                                {demand.cantidad_pendiente}
                              </div>
                              <div className="text-xs text-gray-500">
                                de {demand.cantidad_total}
                              </div>
                              <div className={`text-xs ${getDaysWaitingColor(demand.dias_espera)}`}>
                                {demand.dias_espera} días esperando
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No hay clientes esperando este producto
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Allocation Dialog */}
      <Dialog open={showAllocationDialog} onOpenChange={setShowAllocationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar Productos Terminados</DialogTitle>
          </DialogHeader>
          
          {selectedClient && productionStatus && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="font-medium">{selectedClient.cliente_nombre}</div>
                <div className="text-sm text-gray-600">Folio: {selectedClient.cotizacion_folio}</div>
                <div className="text-sm text-gray-600">
                  Necesita: {selectedClient.cantidad_pendiente} unidades
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Productos terminados disponibles:</div>
                <div className="font-semibold text-lg text-blue-600">
                  {productionStatus.terminado} unidades
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Cantidad a asignar
                </label>
                <Input
                  type="number"
                  min="1"
                  max={Math.min(selectedClient.cantidad_pendiente, productionStatus.terminado)}
                  value={allocationQuantity}
                  onChange={(e) => setAllocationQuantity(e.target.value)}
                  placeholder="Ingrese cantidad"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Notas (opcional)
                </label>
                <Input
                  value={allocationNotes}
                  onChange={(e) => setAllocationNotes(e.target.value)}
                  placeholder="Notas adicionales..."
                />
              </div>

              <div className="flex space-x-2 pt-4">
                <Button 
                  className="flex-1"
                  onClick={handleAllocation}
                  disabled={allocating || !allocationQuantity}
                >
                  {allocating ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Asignar Productos
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowAllocationDialog(false)}
                  disabled={allocating}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {!selectedProduct && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Seleccione un producto para ver su pipeline de producción y demanda de clientes.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
} 