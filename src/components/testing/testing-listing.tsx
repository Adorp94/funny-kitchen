"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Search, Calendar, Factory, Activity, BarChart3, Users } from 'lucide-react';
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

  // Production constants - More realistic for actual production
  const DAILY_CAPACITY = 340; // pieces per day production capacity
  const WORK_DAYS_PER_WEEK = 6; // working days per week
  const MERMA_PERCENTAGE = 0.25; // 25% waste/buffer

  // NEW: State for product data
  const [productData, setProductData] = useState<Map<string, { vueltas_max_dia: number; moldes_disponibles: number }>>(new Map());

  // NEW: Fetch real product data for accurate calculations
  const fetchProductData = useCallback(async (productNames: string[]) => {
    try {
      const response = await fetch('/api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_names: productNames })
      });
      
      if (response.ok) {
        const data = await response.json();
        const productMap = new Map();
        
        data.productos?.forEach((producto: any) => {
          productMap.set(producto.nombre, {
            vueltas_max_dia: producto.vueltas_max_dia || 1,
            moldes_disponibles: producto.moldes_disponibles || 1
          });
        });
        
        setProductData(productMap);
        console.log('Loaded product data for', productMap.size, 'products');
      }
    } catch (error) {
      console.error('Error fetching product data:', error);
    }
  }, []);

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

  // IMPROVED: Create production schedule with real product data
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

      // Get REAL product data from the fetched data
      const realProductData = productData.get(producto);
      const vueltas_max_dia = realProductData?.vueltas_max_dia || 1;
      const moldes_disponibles = realProductData?.moldes_disponibles || 1;
      
      // Calculate total production
      const totalCantidadOriginal = group.totalCantidad;
      
      // Apply realistic merma percentage
      const totalCantidadConMerma = Math.ceil(totalCantidadOriginal * (1 + MERMA_PERCENTAGE));
      
      // Calculate daily production capacity for this specific product
      const dailyProductionCapacity = moldes_disponibles * vueltas_max_dia;
      
      // Check if limited by molds or by global capacity
      const limitadoPorMoldes = dailyProductionCapacity < DAILY_CAPACITY;
      
      // Effective daily production (limited by either molds or global capacity)
      const effectiveDailyCapacity = Math.min(dailyProductionCapacity, DAILY_CAPACITY);
      
      // Calculate production days needed
      const totalDiasProduccion = Math.ceil(totalCantidadConMerma / effectiveDailyCapacity);
      
      // Calculate molds theoretically needed
      const moldesNecesarios = Math.ceil(totalCantidadConMerma / DAILY_CAPACITY);

      // For individual client display
      const clientesWithProduction = sortedClientes.map((cliente, index) => {
        const cantidadConMerma = Math.ceil(cliente.cantidad * (1 + MERMA_PERCENTAGE));

        return {
          ...cliente,
          cantidadConMerma,
          cumulativeCantidad: totalCantidadConMerma,
          diasProduccion: totalDiasProduccion,
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
        moldesDisponibles: moldes_disponibles,
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
  }, [calculateCompletionDate, productData]);

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
      
      // The rest will be handled by useEffect when data changes
      
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
  }, []); // Remove dependencies to prevent infinite loop

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
  }, []);

  // Handle product data fetching when data changes
  useEffect(() => {
    if (data.length > 0) {
      const uniqueProductNames = [...new Set(data.map((item: TestingDataItem) => item.producto))];
      fetchProductData(uniqueProductNames);
    }
  }, [data]);

  // Handle initial grouping and schedule creation when data is first loaded
  useEffect(() => {
    if (data.length > 0 && productData.size === 0) {
      // Create initial schedule without product data (will be updated later)
      const schedule = createProductionSchedule(data);
      setProductionSchedule(schedule);

      // Group by cliente + fecha
      const grouped = groupData(data);
      
      // Calculate delivery dates for client groups
      const groupedWithDelivery = calculateClientDeliveryDates(grouped, schedule);
      setGroupedData(groupedWithDelivery);
      setFilteredData(groupedWithDelivery);
    }
  }, [data]);

  // Recreate production schedule when product data is loaded
  useEffect(() => {
    if (data.length > 0 && productData.size > 0) {
      console.log('Recreating production schedule with real product data...');
      
      // Create production schedule with product data inline to avoid dependency issues
      const productGroups = new Map<string, {
        totalCantidad: number;
        clientes: Array<{ cliente: string; fecha: string; cantidad: number; }>;
      }>();

      data.forEach(item => {
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

      // Convert to schedule
      const schedule: ProductionScheduleItem[] = [];
      
      productGroups.forEach((group, producto) => {
        const sortedClientes = group.clientes.sort((a, b) => 
          new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
        );

        const realProductData = productData.get(producto);
        const vueltas_max_dia = realProductData?.vueltas_max_dia || 1;
        const moldes_disponibles = realProductData?.moldes_disponibles || 1;
        
        const totalCantidadOriginal = group.totalCantidad;
        const totalCantidadConMerma = Math.ceil(totalCantidadOriginal * (1 + MERMA_PERCENTAGE));
        const dailyProductionCapacity = moldes_disponibles * vueltas_max_dia;
        const limitadoPorMoldes = dailyProductionCapacity < DAILY_CAPACITY;
        const effectiveDailyCapacity = Math.min(dailyProductionCapacity, DAILY_CAPACITY);
        const totalDiasProduccion = Math.ceil(totalCantidadConMerma / effectiveDailyCapacity);
        const moldesNecesarios = Math.ceil(totalCantidadConMerma / DAILY_CAPACITY);

        const clientesWithProduction = sortedClientes.map((cliente, index) => {
          const cantidadConMerma = Math.ceil(cliente.cantidad * (1 + MERMA_PERCENTAGE));
          return {
            ...cliente,
            cantidadConMerma,
            cumulativeCantidad: totalCantidadConMerma,
            diasProduccion: totalDiasProduccion,
            order: index + 1
          };
        });
        
        const totalSemanasProduccion = Math.ceil(totalDiasProduccion / WORK_DAYS_PER_WEEK);
        const { date, formatted } = calculateCompletionDate(1, totalDiasProduccion);
        const earliestDate = sortedClientes.length > 0 ? sortedClientes[0].fecha : new Date().toISOString();

        schedule.push({
          producto,
          totalCantidad: group.totalCantidad,
          totalCantidadConMerma,
          moldesDisponibles: moldes_disponibles,
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

      // Sort and set schedule
      const sortedSchedule = schedule.sort((a, b) => 
        new Date(a.earliestDate).getTime() - new Date(b.earliestDate).getTime()
      );
      setProductionSchedule(sortedSchedule);
      
      // Update grouped data for client view
      const clientGroups = new Map<string, GroupedTestingData>();
      data.forEach(item => {
        const key = `${item.cliente}-${item.fecha}`;
        if (clientGroups.has(key)) {
          const group = clientGroups.get(key)!;
          group.productos.push({
            id: item.id,
            producto: item.producto,
            cantidad: item.cantidad
          });
          group.totalCantidad += item.cantidad;
          group.ids.push(item.id);
        } else {
          clientGroups.set(key, {
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

      const grouped = Array.from(clientGroups.values()).sort((a, b) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );
      
      // Calculate delivery dates
      const productCompletionMap = new Map<string, { date: string; formatted: string }>();
      sortedSchedule.forEach(item => {
        productCompletionMap.set(item.producto, {
          date: item.completionDate,
          formatted: item.formattedCompletionDate
        });
      });

      const groupedWithDelivery = grouped.map(group => {
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
      
      setGroupedData(groupedWithDelivery);
      setFilteredData(groupedWithDelivery);
    }
  }, [data.length, productData.size]); // Only depend on the length/size, not the functions

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
  
  // Fix: Calculate merma globally for more accurate total
  const globalMermaTotal = Math.ceil(totalScheduledPieces * (1 + MERMA_PERCENTAGE));
  // Keep the per-product calculation for individual display but use global total for main metric
  const totalScheduledPiecesConMerma = globalMermaTotal;
  
  // Fix: Calculate parallel production timeline instead of summing sequential days
  // Find the cumulative production timeline considering parallel capacity
  const calculateParallelProductionTimeline = () => {
    if (productionSchedule.length === 0) return { totalDays: 0, totalWeeks: 0, lastCompletionDate: 'N/A' };
    
    // Sort products by earliest date to establish priority order
    const sortedByPriority = [...productionSchedule].sort((a, b) => 
      new Date(a.earliestDate).getTime() - new Date(b.earliestDate).getTime()
    );
    
    // Simulate day-by-day production with capacity constraints
    let currentDay = 0;
    let remainingCapacity = DAILY_CAPACITY;
    const productionQueue = sortedByPriority.map(item => ({
      producto: item.producto,
      remainingPieces: item.totalCantidadConMerma,
      dailyCapacity: Math.min(item.moldesDisponibles, DAILY_CAPACITY),
      isLimited: item.limitadoPorMoldes
    }));
    
    // Process production day by day until all products are completed
    while (productionQueue.some(p => p.remainingPieces > 0)) {
      currentDay++;
      remainingCapacity = DAILY_CAPACITY;
      
      // Allocate capacity to products in priority order
      for (const product of productionQueue) {
        if (product.remainingPieces > 0 && remainingCapacity > 0) {
          const canProduce = Math.min(
            product.remainingPieces,
            product.dailyCapacity,
            remainingCapacity
          );
          product.remainingPieces -= canProduce;
          remainingCapacity -= canProduce;
        }
      }
    }
    
    const totalWeeks = Math.ceil(currentDay / WORK_DAYS_PER_WEEK);
    
    // Calculate actual completion date
    const { formatted: lastDate } = calculateCompletionDate(1, currentDay);
    
    return {
      totalDays: currentDay,
      totalWeeks: totalWeeks,
      lastCompletionDate: lastDate
    };
  };
  
  const { totalDays: totalWorkDays, totalWeeks: totalWorkWeeks, lastCompletionDate } = calculateParallelProductionTimeline();
  const productosLimitadosPorMoldes = productionSchedule.filter(item => item.limitadoPorMoldes).length;

  return (
    <div className="space-y-2">
      <Tabs defaultValue="clientes" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-8 text-xs">
          <TabsTrigger value="clientes" className="flex items-center gap-1 text-xs py-1">
            <Users className="h-3 w-3" />
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
          {/* Compact Summary Bar */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
            <div className="grid grid-cols-5 gap-4 text-center">
              <div>
                <div className="text-sm font-medium text-gray-900">{new Set(filteredData.map(group => group.cliente.split(' ')[0])).size}</div>
                <div className="text-xs text-gray-500">Cotizaciones</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{uniqueClientes}</div>
                <div className="text-xs text-gray-500">Clientes</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{new Set(filteredData.flatMap(group => group.productos.map(p => p.producto))).size}</div>
                <div className="text-xs text-gray-500">Productos Únicos</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{totalPieces.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Piezas Total</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{Math.round(totalPieces / Math.max(new Set(filteredData.map(group => group.cliente.split(' ')[0])).size, 1))}</div>
                <div className="text-xs text-gray-500">Piezas/Cotización</div>
              </div>
            </div>
          </div>

          {/* Compact Search */}
          <div className="flex justify-between items-center bg-white border border-gray-200 rounded-lg p-2 mb-3">
            <Input
              placeholder="Buscar cliente o producto..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-7 text-xs max-w-xs border-gray-300 focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
            />
          </div>

          {/* Client Groups Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 border-b border-gray-200 h-8">
                  <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 w-32">Cliente</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 w-40">Productos</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center w-20">Total</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center w-24">Fecha Pedido</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center w-24">Fecha Entrega</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-xs text-gray-500">
                      {searchTerm ? 'No se encontraron resultados' : 'No hay datos disponibles'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((group, index) => (
                    <TableRow key={`${group.cliente}-${group.fecha}-${index}`} className={`h-auto border-b border-gray-100 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      {/* Cliente - Separate cotización number and client name */}
                      <TableCell className="px-3 py-2 text-xs">
                        <div className="space-y-1">
                          {(() => {
                            // Parse the cliente field to separate cotización and client name
                            const clienteText = group.cliente;
                            const parts = clienteText.split(' ');
                            
                            // Find the cotización part (starts with COT-)
                            const cotizacionIndex = parts.findIndex(part => part.startsWith('COT-'));
                            if (cotizacionIndex !== -1) {
                              const cotizacion = parts[cotizacionIndex];
                              const clientName = parts.slice(cotizacionIndex + 1).join(' ');
                              
                              return (
                                <>
                                  <div className="font-medium text-xs text-gray-900" title={cotizacion}>
                                    {cotizacion}
                                  </div>
                                  <div className="text-xs text-gray-600 leading-tight break-words max-w-[120px]" title={clientName}>
                                    {clientName}
                                  </div>
                                </>
                              );
                            } else {
                              // Fallback for unexpected format
                              return (
                                <div className="font-medium text-xs text-gray-900 leading-tight break-words max-w-[120px]" title={clienteText}>
                                  {clienteText}
                                </div>
                              );
                            }
                          })()}
                        </div>
                      </TableCell>

                      {/* Productos - Show ALL products, not just first 2 */}
                      <TableCell className="px-3 py-2 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-gray-600 mb-1">
                            <div className="flex items-center space-x-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                              <span className="font-medium">{group.productos.length} productos</span>
                            </div>
                            <span className="font-medium text-gray-900">{group.totalCantidad}</span>
                          </div>
                          <div className="space-y-0.5">
                            {/* Show ALL products */}
                            {group.productos.map((producto, pIndex) => (
                              <div key={pIndex} className="flex justify-between text-xs">
                                <span className="text-gray-700 max-w-[160px] truncate" title={producto.producto}>
                                  {producto.producto}
                                </span>
                                <span className="font-medium text-gray-900 ml-2">{producto.cantidad}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TableCell>

                      {/* Total Cantidad - Better aligned */}
                      <TableCell className="px-3 py-2 text-xs text-center">
                        <div className="bg-gray-100 rounded px-2 py-1 inline-block">
                          <span className="font-bold text-gray-900">{group.totalCantidad}</span>
                        </div>
                      </TableCell>

                      {/* Fecha Pedido */}
                      <TableCell className="px-3 py-2 text-xs text-center">
                        <span className="text-gray-600">
                          {new Date(group.fecha).toLocaleDateString('es-MX', { 
                            day: '2-digit',
                            month: '2-digit'
                          })}
                        </span>
                      </TableCell>

                      {/* Fecha Entrega */}
                      <TableCell className="px-3 py-2 text-xs text-center">
                        {group.deliveryDate ? (
                          <span className="text-gray-900 font-medium">
                            {new Date(group.deliveryDate).toLocaleDateString('es-MX', { 
                              day: '2-digit',
                              month: '2-digit'
                            })}
                          </span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer Summary */}
          {filteredData.length > 0 && (
            <div className="flex justify-between items-center text-xs text-gray-500 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg mt-3">
              <span>
                {new Set(filteredData.map(group => group.cliente.split(' ')[0])).size} cotizaciones en producción
              </span>
              <span>
                Total: {totalPieces.toLocaleString()} piezas • {new Set(filteredData.flatMap(group => group.productos.map(p => p.producto))).size} productos únicos
              </span>
            </div>
          )}
        </TabsContent>

        <TabsContent value="produccion" className="mt-2">
          {/* Enhanced Summary Bar with Key Insights */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
            <div className="grid grid-cols-8 gap-3 text-center">
              <div>
                <div className="text-sm font-medium text-gray-900">{totalScheduledPieces.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Piezas</div>
              </div>
              <div>
                <div className="text-sm font-medium text-blue-600">{totalScheduledPiecesConMerma.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Con Merma</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-sm font-medium text-gray-900">{Math.round((totalScheduledPiecesConMerma / DAILY_CAPACITY) * 100)}%</div>
                <div className="text-xs text-gray-500">Capacidad</div>
              </div>
              <div>
                <div className={`text-sm font-medium ${productosLimitadosPorMoldes > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {productosLimitadosPorMoldes}
                </div>
                <div className="text-xs text-gray-500">Limitados</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{totalWorkDays}</div>
                <div className="text-xs text-gray-500">Días</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{totalWorkWeeks}</div>
                <div className="text-xs text-gray-500">Semanas</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{productionSchedule.length}</div>
                <div className="text-xs text-gray-500">Productos</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 leading-tight">{lastCompletionDate?.split(',')[0] || 'N/A'}</div>
                <div className="text-xs text-gray-500">Última Entrega</div>
              </div>
            </div>
            
            {/* Warning/Status indicators */}
            {productosLimitadosPorMoldes > 0 && (
              <div className="mt-2 text-center">
                <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  {productosLimitadosPorMoldes} productos limitados por moldes disponibles
                </div>
              </div>
            )}
            
            {/* Real-time data indicator */}
            <div className="mt-2 text-center">
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                Datos en tiempo real desde cotizaciones en producción
              </div>
            </div>
          </div>

          {/* Production Schedule Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 border-b border-gray-200 h-8">
                  <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 w-32">Producto</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center w-20">Cantidad</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center w-20">Con Merma</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center w-20">Moldes</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center w-16">Días</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center w-16">Semanas</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center w-24">Entrega</TableHead>
                  <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 w-40">Clientes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productionSchedule.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-xs text-gray-500">
                      No hay productos programados
                    </TableCell>
                  </TableRow>
                ) : (
                  productionSchedule.map((item, index) => (
                    <TableRow key={`${item.producto}-${index}`} className={`h-10 border-b border-gray-100 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      {/* Producto */}
                      <TableCell className="px-3 py-2 text-xs">
                        <div className="font-medium text-xs text-gray-900 max-w-[120px] truncate" title={item.producto}>
                          {item.producto}
                        </div>
                      </TableCell>

                      {/* Cantidad Original */}
                      <TableCell className="px-3 py-2 text-xs text-center">
                        <span className="font-medium text-gray-900">{item.totalCantidad}</span>
                      </TableCell>

                      {/* Cantidad Con Merma */}
                      <TableCell className="px-3 py-2 text-xs text-center">
                        <span className="font-medium text-gray-900">{item.totalCantidadConMerma}</span>
                      </TableCell>

                      {/* Moldes */}
                      <TableCell className="px-3 py-2 text-xs text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <span className={`${item.limitadoPorMoldes ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                            {item.moldesDisponibles}
                          </span>
                          {item.limitadoPorMoldes && (
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" title="Limitado por moldes disponibles" />
                          )}
                          {!item.limitadoPorMoldes && (
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400" title="Capacidad suficiente" />
                          )}
                        </div>
                        {item.limitadoPorMoldes && (
                          <div className="text-xs text-red-500 mt-0.5">
                            Necesita {item.moldesNecesarios}
                          </div>
                        )}
                      </TableCell>

                      {/* Días Totales */}
                      <TableCell className="px-3 py-2 text-xs text-center">
                        <span className={`font-medium ${item.limitadoPorMoldes ? 'text-red-600' : 'text-gray-900'}`}>
                          {item.totalDiasProduccion}
                        </span>
                      </TableCell>

                      {/* Semanas */}
                      <TableCell className="px-3 py-2 text-xs text-center">
                        <span className="text-gray-900">{item.totalSemanasProduccion}</span>
                      </TableCell>

                      {/* Fecha Entrega */}
                      <TableCell className="px-3 py-2 text-xs text-center">
                        <div className="flex flex-col items-center">
                          <span className={`font-medium ${item.limitadoPorMoldes ? 'text-red-600' : 'text-gray-900'}`}>
                            {new Date(item.completionDate).toLocaleDateString('es-MX', { 
                              day: '2-digit',
                              month: '2-digit'
                            })}
                          </span>
                          {/* Days from today indicator */}
                          {(() => {
                            const today = new Date();
                            const deliveryDate = new Date(item.completionDate);
                            const diffTime = deliveryDate.getTime() - today.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            
                            if (diffDays <= 7) {
                              return <span className="text-xs text-red-500">En {diffDays}d</span>;
                            } else if (diffDays <= 14) {
                              return <span className="text-xs text-yellow-600">En {diffDays}d</span>;
                            } else {
                              return <span className="text-xs text-gray-500">En {diffDays}d</span>;
                            }
                          })()}
                        </div>
                      </TableCell>

                      {/* Clientes */}
                      <TableCell className="px-3 py-2 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-gray-600 mb-1">
                            <div className="flex items-center space-x-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                              <span className="font-medium">{item.clientes.length} clientes</span>
                            </div>
                            <span className="font-medium text-gray-900">{item.totalCantidad}</span>
                          </div>
                          <div className="space-y-0.5">
                            {/* Show ALL clients */}
                            {item.clientes.map((cliente, cIndex) => (
                              <div key={cIndex} className="flex justify-between text-xs">
                                <span className="text-gray-700 leading-tight break-words max-w-[120px]" title={cliente.cliente}>
                                  {cliente.cliente}
                                </span>
                                <span className="font-medium text-gray-900">{cliente.cantidad}</span>
                              </div>
                            ))}
                          </div>
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