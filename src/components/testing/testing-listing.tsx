"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Package, Search, Trash2, Calendar, Factory } from 'lucide-react';
import { toast } from "sonner";

interface TestingDataItem {
  id: number;
  cliente: string;
  producto: string;
  cantidad: number;
  fecha: string;
  created_at: string;
  updated_at: string;
}

interface GroupedTestingData {
  cliente: string;
  fecha: string;
  productos: Array<{
    id: number;
    producto: string;
    cantidad: number;
  }>;
  totalCantidad: number;
  ids: number[];
  deliveryDate?: string;
  formattedDeliveryDate?: string;
}

interface ProductionScheduleItem {
  producto: string;
  totalCantidad: number;
  earliestDate: string;
  clientes: Array<{
    cliente: string;
    fecha: string;
    cantidad: number;
  }>;
  startDay: number;
  daysRequired: number;
  completionDate: string;
  formattedCompletionDate: string;
}

export const TestingListing: React.FC = () => {
  const [data, setData] = useState<TestingDataItem[]>([]);
  const [groupedData, setGroupedData] = useState<GroupedTestingData[]>([]);
  const [filteredData, setFilteredData] = useState<GroupedTestingData[]>([]);
  const [productionSchedule, setProductionSchedule] = useState<ProductionScheduleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Production constants
  const DAILY_CAPACITY = 340; // pieces per day
  const WORK_DAYS_PER_WEEK = 6; // Monday to Saturday

  // Calculate work days and completion date from today
  const calculateCompletionDate = useCallback((startDay: number, daysRequired: number): { date: Date; formatted: string } => {
    const today = new Date();
    let currentDate = new Date(today);
    let remainingWorkDays = startDay + daysRequired - 1; // -1 because startDay is inclusive
    
    while (remainingWorkDays > 0) {
      currentDate.setDate(currentDate.getDate() + 1);
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      
      // Count only Monday (1) to Saturday (6) as work days
      if (dayOfWeek >= 1 && dayOfWeek <= 6) {
        remainingWorkDays--;
      }
    }
    
    const formatted = currentDate.toLocaleDateString('es-MX', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    return { date: currentDate, formatted };
  }, []);

  // Create production schedule starting from today
  const createProductionSchedule = useCallback((rawData: TestingDataItem[]): ProductionScheduleItem[] => {
    // Group by product name
    const productGroups = new Map<string, {
      totalCantidad: number;
      earliestDate: string;
      clientes: Array<{ cliente: string; fecha: string; cantidad: number; }>;
    }>();

    rawData.forEach(item => {
      if (productGroups.has(item.producto)) {
        const group = productGroups.get(item.producto)!;
        group.totalCantidad += item.cantidad;
        group.clientes.push({
          cliente: item.cliente,
          fecha: item.fecha,
          cantidad: item.cantidad
        });
        
        // Update earliest date if this one is older
        if (new Date(item.fecha) < new Date(group.earliestDate)) {
          group.earliestDate = item.fecha;
        }
      } else {
        productGroups.set(item.producto, {
          totalCantidad: item.cantidad,
          earliestDate: item.fecha,
          clientes: [{
            cliente: item.cliente,
            fecha: item.fecha,
            cantidad: item.cantidad
          }]
        });
      }
    });

    // Convert to array and sort by earliest date (priority)
    const sortedProducts = Array.from(productGroups.entries())
      .map(([producto, group]) => ({
        producto,
        ...group
      }))
      .sort((a, b) => new Date(a.earliestDate).getTime() - new Date(b.earliestDate).getTime());

    // Calculate production schedule starting from today
    let currentDay = 1;
    const schedule: ProductionScheduleItem[] = [];

    sortedProducts.forEach(product => {
      const daysRequired = Math.ceil(product.totalCantidad / DAILY_CAPACITY);
      const { date, formatted } = calculateCompletionDate(currentDay, daysRequired);

      schedule.push({
        producto: product.producto,
        totalCantidad: product.totalCantidad,
        earliestDate: product.earliestDate,
        clientes: product.clientes.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()),
        startDay: currentDay,
        daysRequired,
        completionDate: date.toISOString().split('T')[0],
        formattedCompletionDate: formatted
      });

      currentDay += daysRequired;
    });

    return schedule;
  }, [calculateCompletionDate]);

  // Calculate delivery dates for client groups based on production schedule
  const calculateClientDeliveryDates = useCallback((
    clientGroups: GroupedTestingData[], 
    schedule: ProductionScheduleItem[]
  ): GroupedTestingData[] => {
    // Create a map of product to completion date
    const productCompletionMap = new Map<string, { date: string; formatted: string }>();
    schedule.forEach(item => {
      productCompletionMap.set(item.producto, {
        date: item.completionDate,
        formatted: item.formattedCompletionDate
      });
    });

    return clientGroups.map(group => {
      // Find the latest completion date among all products for this client
      let latestDate = new Date('1900-01-01');
      let latestFormatted = 'N/A';

      group.productos.forEach(producto => {
        const completion = productCompletionMap.get(producto.producto);
        if (completion) {
          const completionDate = new Date(completion.date);
          if (completionDate > latestDate) {
            latestDate = completionDate;
            latestFormatted = completion.formatted;
          }
        }
      });

      return {
        ...group,
        deliveryDate: latestDate.getTime() > new Date('1900-01-01').getTime() ? 
          latestDate.toISOString().split('T')[0] : undefined,
        formattedDeliveryDate: latestFormatted !== 'N/A' ? latestFormatted : undefined
      };
    });
  }, []);

  // Group data by cliente + fecha
  const groupData = useCallback((rawData: TestingDataItem[]): GroupedTestingData[] => {
    const groups = new Map<string, GroupedTestingData>();

    rawData.forEach(item => {
      const key = `${item.cliente}-${item.fecha}`;
      
      if (groups.has(key)) {
        const group = groups.get(key)!;
        group.productos.push({
          id: item.id,
          producto: item.producto,
          cantidad: item.cantidad
        });
        group.totalCantidad += item.cantidad;
        group.ids.push(item.id);
      } else {
        groups.set(key, {
          cliente: item.cliente,
          fecha: item.fecha,
          productos: [{
            id: item.id,
            producto: item.producto,
            cantidad: item.cantidad
          }],
          totalCantidad: item.cantidad,
          ids: [item.id]
        });
      }
    });

    return Array.from(groups.values()).sort((a, b) => 
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
  }, []);

  const fetchData = useCallback(async () => {
    console.log("TestingListing: fetchData triggered");
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/testing-datos');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`API Error Response: ${response.status}`, errorData);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("Data received from API:", result);
      
      const testingItems = result.data || [];
      setData(testingItems);
      
      // Create production schedule first
      const schedule = createProductionSchedule(testingItems);
      setProductionSchedule(schedule);

      // Group by cliente + fecha
      const grouped = groupData(testingItems);
      
      // Calculate delivery dates for client groups
      const groupedWithDelivery = calculateClientDeliveryDates(grouped, schedule);
      setGroupedData(groupedWithDelivery);
      setFilteredData(groupedWithDelivery);
      
    } catch (err: any) {
      console.error("Error in fetchData:", err);
      const errorMsg = err.message || "Error desconocido al cargar los datos de prueba.";
      setError(errorMsg);
      toast.error("Error al cargar datos", {
        description: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  }, [groupData, createProductionSchedule, calculateClientDeliveryDates]);

  const handleDeleteGroup = useCallback(async (ids: number[]) => {
    try {
      // Delete all records in the group
      const deletePromises = ids.map(id => 
        fetch(`/api/testing-datos?id=${id}`, { method: 'DELETE' })
      );
      
      const responses = await Promise.all(deletePromises);
      const failed = responses.filter(r => !r.ok);
      
      if (failed.length > 0) {
        throw new Error(`Failed to delete ${failed.length} records`);
      }

      toast.success("Eliminado", {
        description: `${ids.length} registros eliminados correctamente`,
      });

      // Refresh data
      await fetchData();

    } catch (err: any) {
      console.error("Error deleting group:", err);
      toast.error("Error al eliminar", {
        description: err.message,
      });
    }
  }, [fetchData]);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredData(groupedData);
    } else {
      const filtered = groupedData.filter(group => 
        group.cliente.toLowerCase().includes(term.toLowerCase()) ||
        group.productos.some(p => p.producto.toLowerCase().includes(term.toLowerCase()))
      );
      setFilteredData(filtered);
    }
  }, [groupedData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    handleSearch(searchTerm);
  }, [groupedData, searchTerm, handleSearch]);

  if (loading) {
    return (
      <div className="text-center py-2">
        <div className="flex justify-center items-center space-x-2">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span className="text-xs text-muted-foreground">Cargando...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-2">
        <p className="text-red-500 mb-2 text-xs">{error}</p>
        <Button onClick={fetchData} variant="outline" size="sm" className="h-7 px-2 text-xs">
          Reintentar
        </Button>
      </div>
    );
  }

  const totalRecords = filteredData.reduce((sum, group) => sum + group.productos.length, 0);
  const totalPieces = filteredData.reduce((sum, group) => sum + group.totalCantidad, 0);
  const uniqueClientes = new Set(filteredData.map(group => group.cliente)).size;

  // Production schedule metrics
  const totalScheduledPieces = productionSchedule.reduce((sum, item) => sum + item.totalCantidad, 0);
  const totalWorkDays = productionSchedule.reduce((sum, item) => sum + item.daysRequired, 0);
  const lastCompletionDate = productionSchedule.length > 0 ? 
    productionSchedule[productionSchedule.length - 1].formattedCompletionDate : 'N/A';

  return (
    <div className="space-y-2">
      <Tabs defaultValue="clientes" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-8 text-xs">
          <TabsTrigger value="clientes" className="flex items-center gap-1 text-xs py-1">
            <Package className="h-3 w-3" />
            Por Cliente
          </TabsTrigger>
          <TabsTrigger value="produccion" className="flex items-center gap-1 text-xs py-1">
            <Factory className="h-3 w-3" />
            Cronograma Producción
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clientes" className="mt-2">
          {/* Search and Summary */}
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center space-x-2">
              <Search className="h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente o producto..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="h-7 text-xs max-w-xs"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs">
                {filteredData.length} grupos
              </Badge>
              <Badge variant="outline" className="text-xs">
                {totalRecords} registros
              </Badge>
              <Badge variant="outline" className="text-xs">
                {totalPieces} piezas total
              </Badge>
            </div>
          </div>

          {/* Client Groups Table with Delivery Dates */}
          <div className="border rounded">
            <Table>
              <TableHeader>
                <TableRow className="h-8">
                  <TableHead className="p-1 text-xs font-medium w-28">Cliente</TableHead>
                  <TableHead className="p-1 text-xs font-medium w-32">Productos</TableHead>
                  <TableHead className="p-1 text-xs font-medium w-16">Total Piezas</TableHead>
                  <TableHead className="p-1 text-xs font-medium w-20">Fecha Pedido</TableHead>
                  <TableHead className="p-1 text-xs font-medium w-28">Fecha Entrega</TableHead>
                  <TableHead className="p-1 text-xs font-medium w-16">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-xs text-muted-foreground">
                      {searchTerm ? 'No se encontraron resultados' : 'No hay datos disponibles'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((group, index) => (
                    <TableRow key={`${group.cliente}-${group.fecha}-${index}`} className="h-6">
                      {/* Cliente */}
                      <TableCell className="p-1 text-xs">
                        <div className="max-w-[110px] break-words" title={group.cliente}>
                          {group.cliente}
                        </div>
                      </TableCell>

                      {/* Productos */}
                      <TableCell className="p-1 text-xs">
                        <div>
                          <div className="flex items-center space-x-1 mb-1">
                            <Package className="h-3 w-3" />
                            <span className="font-medium">{group.productos.length}</span>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            {group.productos.map((producto, pIndex) => (
                              <div key={pIndex} className="flex justify-between">
                                <span className="break-words max-w-[100px]">{producto.producto}</span>
                                <span className="ml-1 font-medium text-blue-600">{producto.cantidad}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TableCell>

                      {/* Total Cantidad */}
                      <TableCell className="p-1 text-xs">
                        <div className="flex items-center space-x-1">
                          <Package className="h-3 w-3" />
                          <span className="font-bold text-green-600">{group.totalCantidad}</span>
                        </div>
                      </TableCell>

                      {/* Fecha Pedido */}
                      <TableCell className="p-1 text-xs">
                        <div className="text-muted-foreground">
                          {new Date(group.fecha).toLocaleDateString('es-MX', { 
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </div>
                      </TableCell>

                      {/* Fecha Entrega */}
                      <TableCell className="p-1 text-xs">
                        {group.deliveryDate ? (
                          <div className="text-green-600 font-medium text-xs leading-tight">
                            {new Date(group.deliveryDate).toLocaleDateString('es-MX', { 
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </div>
                        ) : (
                          <div className="text-muted-foreground text-xs">N/A</div>
                        )}
                      </TableCell>

                      {/* Acciones */}
                      <TableCell className="p-1 text-xs">
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={() => handleDeleteGroup(group.ids)}
                            title={`Eliminar ${group.productos.length} registros`}
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Summary Footer */}
          {filteredData.length > 0 && (
            <div className="flex justify-between items-center text-xs text-muted-foreground p-2 bg-muted/20 rounded">
              <span>
                {filteredData.length} grupos • {uniqueClientes} clientes únicos • {totalRecords} registros
              </span>
              <span>
                Total: {totalPieces} piezas
              </span>
            </div>
          )}
        </TabsContent>

        <TabsContent value="produccion" className="mt-2">
          {/* Production Summary */}
          <div className="mb-2 p-2 bg-muted/30 rounded border">
            <div className="grid grid-cols-4 gap-4 text-xs">
              <div className="text-center">
                <div className="font-medium text-blue-600">{totalScheduledPieces}</div>
                <div className="text-muted-foreground">Piezas Totales</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-orange-600">{DAILY_CAPACITY}</div>
                <div className="text-muted-foreground">Capacidad/Día</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-green-600">{totalWorkDays}</div>
                <div className="text-muted-foreground">Días Totales</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-purple-600 text-xs leading-tight">{lastCompletionDate}</div>
                <div className="text-muted-foreground">Última Entrega</div>
              </div>
            </div>
          </div>

          {/* Production Schedule Table */}
          <div className="border rounded">
            <Table>
              <TableHeader>
                <TableRow className="h-8">
                  <TableHead className="p-1 text-xs font-medium w-32">Producto</TableHead>
                  <TableHead className="p-1 text-xs font-medium w-20">Cantidad</TableHead>
                  <TableHead className="p-1 text-xs font-medium w-24">Fecha Más Antigua</TableHead>
                  <TableHead className="p-1 text-xs font-medium w-20">Días Req.</TableHead>
                  <TableHead className="p-1 text-xs font-medium w-32">Fecha Entrega</TableHead>
                  <TableHead className="p-1 text-xs font-medium w-40">Clientes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productionSchedule.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-xs text-muted-foreground">
                      No hay productos programados
                    </TableCell>
                  </TableRow>
                ) : (
                  productionSchedule.map((item, index) => (
                    <TableRow key={`${item.producto}-${index}`} className="h-6">
                      {/* Producto */}
                      <TableCell className="p-1 text-xs">
                        <div className="max-w-[120px] break-words font-medium" title={item.producto}>
                          {item.producto}
                        </div>
                      </TableCell>

                      {/* Cantidad */}
                      <TableCell className="p-1 text-xs">
                        <div className="flex items-center space-x-1">
                          <Package className="h-3 w-3" />
                          <span className="font-bold text-blue-600">{item.totalCantidad}</span>
                        </div>
                      </TableCell>

                      {/* Fecha Más Antigua */}
                      <TableCell className="p-1 text-xs">
                        <div className="text-muted-foreground">
                          {new Date(item.earliestDate).toLocaleDateString('es-MX', { 
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </div>
                      </TableCell>

                      {/* Días Requeridos */}
                      <TableCell className="p-1 text-xs">
                        <Badge variant="secondary" className="text-xs">
                          {item.daysRequired}
                        </Badge>
                      </TableCell>

                      {/* Fecha Entrega */}
                      <TableCell className="p-1 text-xs">
                        <div className="text-green-600 font-medium text-xs leading-tight">
                          {new Date(item.completionDate).toLocaleDateString('es-MX', { 
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </div>
                      </TableCell>

                      {/* Clientes */}
                      <TableCell className="p-1 text-xs">
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {item.clientes.slice(0, 2).map((cliente, cIndex) => (
                            <div key={cIndex} className="flex justify-between">
                              <span className="break-words max-w-[100px]" title={cliente.cliente}>
                                {cliente.cliente.length > 15 ? `${cliente.cliente.substring(0, 15)}...` : cliente.cliente}
                              </span>
                              <span className="ml-1 font-medium text-blue-600">{cliente.cantidad}</span>
                            </div>
                          ))}
                          {item.clientes.length > 2 && (
                            <div className="text-muted-foreground">
                              +{item.clientes.length - 2} más
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 