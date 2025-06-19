"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Package, Search, Trash2, Calendar, Factory, Activity, BarChart3 } from 'lucide-react';
import { toast } from "sonner";
import { ProductionActiveListing } from './production-active-listing';
import { ProductionInsights } from './production-insights';

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
  totalCantidadConMerma: number;
  moldesDisponibles: number;
  moldesNecesarios: number;
  limitadoPorMoldes: boolean;
  earliestDate: string;
  clientes: Array<{
    cliente: string;
    fecha: string;
    cantidad: number;
    cantidadConMerma: number;
    cumulativeCantidad: number;
    diasProduccion: number;
    order: number;
  }>;
  totalDiasProduccion: number;
  totalSemanasProduccion: number;
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
  const DAILY_CAPACITY = 340; // pieces per day production capacity
  const WORK_DAYS_PER_WEEK = 6; // working days per week
  const MERMA_PERCENTAGE = 0.25; // 25% waste/buffer

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

  // Create production schedule with new cumulative logic
  const createProductionSchedule = useCallback((rawData: TestingDataItem[]): ProductionScheduleItem[] => {
    // Group by product name
    const productGroups = new Map<string, {
      totalCantidad: number;
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
      } else {
        productGroups.set(item.producto, {
          totalCantidad: item.cantidad,
          clientes: [{
            cliente: item.cliente,
            fecha: item.fecha,
            cantidad: item.cantidad
          }]
        });
      }
    });

    // Convert to array and process each product
    const schedule: ProductionScheduleItem[] = [];

    productGroups.forEach((group, producto) => {
      // Sort clients by date (priority order)
      const sortedClientes = group.clientes.sort((a, b) => 
        new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
      );

                    // Calculate total production for the entire product
       // Step 1: Calculate total pieces across all clients
       const totalCantidadOriginal = group.totalCantidad;
       
       // Step 2: Add 25% merma to the TOTAL
       const totalCantidadConMerma = Math.ceil(totalCantidadOriginal * (1 + MERMA_PERCENTAGE));
       
       // Step 3: Get available molds for this product (test values)
       const moldesDisponibles = producto === "Juan Gabriel" ? 6 : 10;
       
       // Step 4: Calculate effective daily production capacity
       // If molds are the limiting factor: daily_capacity = min(moldes_disponibles, DAILY_CAPACITY)
       const effectiveDailyCapacity = Math.min(moldesDisponibles, DAILY_CAPACITY);
       
       // Step 5: Check if limited by molds
       const limitadoPorMoldes = moldesDisponibles < DAILY_CAPACITY;
       
       // Step 6: Calculate molds theoretically needed if no mold constraint
       const moldesNecesarios = limitadoPorMoldes ? moldesDisponibles : Math.ceil(totalCantidadConMerma / DAILY_CAPACITY);
       
       // Step 7: Calculate production days using effective capacity
       const totalDiasProduccion = Math.ceil(totalCantidadConMerma / effectiveDailyCapacity);

       // For individual client display, calculate their merma quantities but use total days for all
       const clientesWithProduction = sortedClientes.map((cliente, index) => {
         const cantidadConMerma = Math.ceil(cliente.cantidad * (1 + MERMA_PERCENTAGE));

         // Debug logging for Juan Gabriel
         if (producto === "Juan Gabriel") {
           console.log(`${producto} - Cliente ${index + 1}: ${cliente.cliente}`);
           console.log(`  Original: ${cliente.cantidad}, Con Merma: ${cantidadConMerma}`);
           console.log(`  Total Original: ${totalCantidadOriginal}, Total Con Merma: ${totalCantidadConMerma}`);
           console.log(`  Moldes Disponibles: ${moldesDisponibles}, Effective Daily Capacity: ${effectiveDailyCapacity}`);
           console.log(`  Limitado por Moldes: ${limitadoPorMoldes}`);
           console.log(`  Calculation: ${totalCantidadConMerma} ÷ ${effectiveDailyCapacity} = ${totalDiasProduccion} days`);
           console.log(`  Weeks: ${totalDiasProduccion} ÷ ${WORK_DAYS_PER_WEEK} = ${Math.ceil(totalDiasProduccion / WORK_DAYS_PER_WEEK)} weeks`);
         }

         return {
           ...cliente,
           cantidadConMerma,
           cumulativeCantidad: totalCantidadConMerma, // Show total for all
           diasProduccion: totalDiasProduccion, // Same total days for all clients
           order: index + 1
         };
       });
      
              const totalSemanasProduccion = Math.ceil(totalDiasProduccion / WORK_DAYS_PER_WEEK);

      // Calculate completion date based on total production days
      const { date, formatted } = calculateCompletionDate(1, totalDiasProduccion);
      
      // Get earliest date for sorting
      const earliestDate = sortedClientes.length > 0 ? sortedClientes[0].fecha : new Date().toISOString();

             schedule.push({
         producto,
         totalCantidad: group.totalCantidad,
         totalCantidadConMerma,
         moldesDisponibles,
         moldesNecesarios,
         limitadoPorMoldes,
         earliestDate,
         clientes: clientesWithProduction,
         totalDiasProduccion,
         totalSemanasProduccion,
         completionDate: date.toISOString().split('T')[0],
         formattedCompletionDate: formatted
       });
    });

    // Sort products by earliest date (priority)
    return schedule.sort((a, b) => 
      new Date(a.earliestDate).getTime() - new Date(b.earliestDate).getTime()
    );
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
  const totalScheduledPiecesConMerma = productionSchedule.reduce((sum, item) => sum + item.totalCantidadConMerma, 0);
  const totalWorkDays = productionSchedule.reduce((sum, item) => sum + item.totalDiasProduccion, 0);
  const totalWorkWeeks = Math.ceil(totalWorkDays / WORK_DAYS_PER_WEEK);
  const productosLimitadosPorMoldes = productionSchedule.filter(item => item.limitadoPorMoldes).length;
  const lastCompletionDate = productionSchedule.length > 0 ? 
    productionSchedule[productionSchedule.length - 1].formattedCompletionDate : 'N/A';

  return (
    <div className="space-y-2">
      <Tabs defaultValue="clientes" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-8 text-xs">
          <TabsTrigger value="clientes" className="flex items-center gap-1 text-xs py-1">
            <Package className="h-3 w-3" />
            Por Cliente
          </TabsTrigger>
          <TabsTrigger value="produccion" className="flex items-center gap-1 text-xs py-1">
            <Factory className="h-3 w-3" />
            Cronograma Producción
          </TabsTrigger>
          <TabsTrigger value="production-active" className="flex items-center gap-1 text-xs py-1">
            <Activity className="h-3 w-3" />
            Producción Activa
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-1 text-xs py-1">
            <BarChart3 className="h-3 w-3" />
            Insights
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
            <div className="grid grid-cols-7 gap-2 text-xs">
              <div className="text-center">
                <div className="font-medium text-blue-600">{totalScheduledPieces}</div>
                <div className="text-muted-foreground">Piezas Originales</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-orange-600">{totalScheduledPiecesConMerma}</div>
                <div className="text-muted-foreground">Con Merma (25%)</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-purple-600">{DAILY_CAPACITY}</div>
                <div className="text-muted-foreground">Capacidad/Día</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-red-600">{productosLimitadosPorMoldes}</div>
                <div className="text-muted-foreground">Limitados por Moldes</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-green-600">{totalWorkDays}</div>
                <div className="text-muted-foreground">Días Totales</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-indigo-600">{totalWorkWeeks}</div>
                <div className="text-muted-foreground">Semanas Totales</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-gray-600 text-xs leading-tight">{lastCompletionDate}</div>
                <div className="text-muted-foreground">Última Entrega</div>
              </div>
            </div>
          </div>

          {/* Production Schedule Table */}
          <div className="border rounded">
            <Table>
              <TableHeader>
                <TableRow className="h-8">
                  <TableHead className="p-1 text-xs font-medium w-24">Producto</TableHead>
                  <TableHead className="p-1 text-xs font-medium w-16">Cantidad</TableHead>
                  <TableHead className="p-1 text-xs font-medium w-16">Con Merma</TableHead>
                  <TableHead className="p-1 text-xs font-medium w-20">Moldes</TableHead>
                  <TableHead className="p-1 text-xs font-medium w-14">Días</TableHead>
                  <TableHead className="p-1 text-xs font-medium w-14">Semanas</TableHead>
                  <TableHead className="p-1 text-xs font-medium w-24">Fecha Entrega</TableHead>
                  <TableHead className="p-1 text-xs font-medium w-48">Clientes (Total para Producto)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productionSchedule.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4 text-xs text-muted-foreground">
                      No hay productos programados
                    </TableCell>
                  </TableRow>
                                  ) : (
                    productionSchedule.map((item, index) => (
                      <TableRow key={`${item.producto}-${index}`} className="h-auto">
                        {/* Producto */}
                        <TableCell className="p-1 text-xs">
                          <div className="max-w-[100px] break-words font-medium" title={item.producto}>
                            {item.producto}
                          </div>
                        </TableCell>

                        {/* Cantidad Original */}
                        <TableCell className="p-1 text-xs">
                          <div className="flex items-center space-x-1">
                            <Package className="h-3 w-3" />
                            <span className="font-bold text-blue-600">{item.totalCantidad}</span>
                          </div>
                        </TableCell>

                        {/* Cantidad Con Merma */}
                        <TableCell className="p-1 text-xs">
                          <div className="flex items-center space-x-1">
                            <span className="font-bold text-orange-600">{item.totalCantidadConMerma}</span>
                          </div>
                        </TableCell>

                        {/* Moldes */}
                        <TableCell className="p-1 text-xs">
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-muted-foreground">Disp:</span>
                              <span className="font-medium text-green-600">{item.moldesDisponibles}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-muted-foreground">Nec:</span>
                              <span className={`font-medium ${item.limitadoPorMoldes ? 'text-red-600' : 'text-gray-600'}`}>
                                {item.moldesNecesarios}
                              </span>
                            </div>
                            {item.limitadoPorMoldes && (
                              <Badge variant="destructive" className="text-xs px-1 py-0">
                                Limitado
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* Días Totales */}
                        <TableCell className="p-1 text-xs">
                          <Badge variant={item.limitadoPorMoldes ? "destructive" : "secondary"} className="text-xs">
                            {item.totalDiasProduccion}
                          </Badge>
                        </TableCell>

                        {/* Semanas */}
                        <TableCell className="p-1 text-xs">
                          <Badge variant="outline" className="text-xs">
                            {item.totalSemanasProduccion}
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

                      {/* Clientes (Total para Producto) */}
                      <TableCell className="p-1 text-xs">
                        <div className="space-y-1">
                          <div className="bg-blue-50 p-1 rounded text-xs border-l-2 border-blue-400 mb-1">
                            <div className="font-medium text-blue-800">Total del Producto:</div>
                            <div className="grid grid-cols-3 gap-1 text-xs">
                              <div>
                                <span className="text-muted-foreground">Original:</span> 
                                <span className="font-medium text-blue-600 ml-1">{item.totalCantidad}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Con Merma:</span> 
                                <span className="font-medium text-orange-600 ml-1">{item.totalCantidadConMerma}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Días:</span> 
                                <span className="font-bold text-green-600 ml-1">{item.totalDiasProduccion}</span>
                              </div>
                            </div>
                          </div>
                          {item.clientes.map((cliente, cIndex) => (
                            <div key={cIndex} className="bg-muted/20 p-1 rounded text-xs border-l-2 border-gray-200">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-medium text-xs" title={cliente.cliente}>
                                  {cIndex + 1}. {cliente.cliente.length > 12 ? `${cliente.cliente.substring(0, 12)}...` : cliente.cliente}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(cliente.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-1 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Cantidad:</span> 
                                  <span className="font-medium text-blue-600 ml-1">{cliente.cantidad}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Con Merma:</span> 
                                  <span className="font-medium text-orange-600 ml-1">{cliente.cantidadConMerma}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="production-active" className="mt-2">
          <ProductionActiveListing />
        </TabsContent>

        <TabsContent value="insights" className="mt-2">
          <ProductionInsights />
        </TabsContent>
      </Tabs>
    </div>
  );
}; 