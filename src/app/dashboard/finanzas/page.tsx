"use client";

import { useState, useEffect } from 'react';
import { ArrowDown, ArrowUp, DollarSign, FileText, ReceiptIcon, Plus, CreditCard, RefreshCw, TrendingUp, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IngresoResponsiveWrapper } from '@/components/finanzas/ingreso-modal';
import { EgresoModal } from '@/components/finanzas/egreso-modal';
import { IngresosTable } from '@/components/finanzas/ingresos-table';
import { EgresosTable } from '@/components/finanzas/egresos-table';
import { 
  createIngreso, 
  createEgreso, 
  getAllIngresos, 
  getAllEgresos,
  getFinancialMetrics 
} from '@/app/actions/finanzas-actions';
import { formatCurrency } from '@/lib/utils';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

// Define types for our components
interface Ingreso {
  anticipo_id: number;
  cotizacion_id: number;
  folio: string;
  cliente_nombre: string;
  moneda: string;
  monto: number;
  monto_mxn: number;
  metodo_pago: string;
  fecha_pago: string;
  porcentaje: number;
}

interface Egreso {
  egreso_id: number;
  descripcion: string;
  categoria: string;
  fecha: string;
  monto: number;
  monto_mxn: number;
  moneda: string;
  metodo_pago: string;
}

// Pagination interface (adjust if needed based on server action return type)
interface PaginationResult {
  page: number;
  totalPages: number;
  totalItems?: number; // Optional based on server action
  itemsPerPage?: number; // Optional based on server action
}

// --- Helper data ---
const currentYear = new Date().getFullYear();
const years = [
  { value: 0, label: "Todos" }, // Added "Todos" option for year
  ...Array.from({ length: 5 }, (_, i) => ({ value: currentYear - i, label: (currentYear - i).toString() })) // Last 5 years
];
const months = [
  { value: 0, label: "Todos" }, // Added "Todos" option for month
  { value: 1, label: "Enero" }, { value: 2, label: "Febrero" }, { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" }, { value: 5, label: "Mayo" }, { value: 6, label: "Junio" },
  { value: 7, label: "Julio" }, { value: 8, label: "Agosto" }, { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" }, { value: 11, label: "Noviembre" }, { value: 12, label: "Diciembre" }
];
// ---

export default function FinanzasPage() {
  const [activeTab, setActiveTab] = useState("ingresos");
  const [isIngresoModalOpen, setIsIngresoModalOpen] = useState(false);
  const [isEgresoModalOpen, setIsEgresoModalOpen] = useState(false);
  
  // State for data
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [egresos, setEgresos] = useState<Egreso[]>([]);
  
  // State for pagination
  const [ingresosPagination, setIngresosPagination] = useState<PaginationResult>({ page: 1, totalPages: 1 });
  const [egresosPagination, setEgresosPagination] = useState<PaginationResult>({ page: 1, totalPages: 1 });
  
  // State for loading & refreshing
  const [loadingIngresos, setLoadingIngresos] = useState(false);
  const [loadingEgresos, setLoadingEgresos] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State for financial metrics
  const [metrics, setMetrics] = useState({
    ingresos: { mxn: 0, usd: 0 },
    egresos: { mxn: 0, usd: 0 },
    balance: { mxn: 0, usd: 0 },
    cotizacionesPagadas: 0
  });

  // State for filters
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // JS months are 0-indexed

  // Fetch initial data based on default filters
  useEffect(() => {
    // Pass filters to fetchMetrics
    fetchMetrics(selectedMonth || undefined, selectedYear || undefined); 
    fetchIngresos(1, selectedMonth || undefined, selectedYear || undefined);
    fetchEgresos(1, selectedMonth || undefined, selectedYear || undefined);
  }, [selectedMonth, selectedYear]); // Re-fetch when filters change

  // --- Fetching Functions ---
  // Updated fetchMetrics to accept filters
  const fetchMetrics = async (month: number | undefined, year: number | undefined) => {
    try {
      // Pass filters to the server action
      const result = await getFinancialMetrics(month, year); 
      if (result.success && result.data) {
        setMetrics(result.data);
      } else {
         console.warn("Failed to fetch metrics or no data:", result.error);
         // Reset metrics state on failure
         setMetrics({ ingresos: { mxn: 0, usd: 0 }, egresos: { mxn: 0, usd: 0 }, balance: { mxn: 0, usd: 0 }, cotizacionesPagadas: 0 });
      }
    } catch (error) {
      console.error("Error fetching metrics:", error);
      setMetrics({ ingresos: { mxn: 0, usd: 0 }, egresos: { mxn: 0, usd: 0 }, balance: { mxn: 0, usd: 0 }, cotizacionesPagadas: 0 });
    }
  };

  // Updated fetchIngresos to handle month/year being potentially 0
  const fetchIngresos = async (page: number, month: number | undefined, year: number | undefined) => {
    setLoadingIngresos(true);
    try {
      // Pass 0 or undefined directly (backend will handle)
      const result = await getAllIngresos(page, 10, month, year); 
      if (result.success && result.data) {
        setIngresos(result.data);
        if (result.pagination) {
          setIngresosPagination({
            page: result.pagination.page,
            totalPages: result.pagination.totalPages
          });
        } else {
           setIngresosPagination({ page: 1, totalPages: 1 });
        }
      } else {
        console.warn("Failed to fetch ingresos or no data for filter:", result.error);
        setIngresos([]); 
        setIngresosPagination({ page: 1, totalPages: 1 }); 
      }
    } catch (error) {
      console.error("Error fetching ingresos:", error);
      setIngresos([]); 
      setIngresosPagination({ page: 1, totalPages: 1 }); 
    } finally {
      setLoadingIngresos(false);
    }
  };

  // Updated fetchEgresos to handle month/year being potentially 0
  const fetchEgresos = async (page: number, month: number | undefined, year: number | undefined) => {
    setLoadingEgresos(true);
    try {
      // Pass 0 or undefined directly (backend will handle)
      const result = await getAllEgresos(page, 10, month, year); 
      if (result.success && result.data) {
        setEgresos(result.data);
        if (result.pagination) {
          setEgresosPagination({
            page: result.pagination.page,
            totalPages: result.pagination.totalPages
          });
        } else {
           setEgresosPagination({ page: 1, totalPages: 1 });
        }
      } else {
        console.warn("Failed to fetch egresos or no data for filter:", result.error);
        setEgresos([]); 
        setEgresosPagination({ page: 1, totalPages: 1 }); 
      }
    } catch (error) {
      console.error("Error fetching egresos:", error);
      setEgresos([]); 
      setEgresosPagination({ page: 1, totalPages: 1 }); 
    } finally {
      setLoadingEgresos(false);
    }
  };

  // Refresh data using current filters
  const refreshData = async () => {
    console.log('[FinanzasPage] Refresh Button Clicked - Calling refreshData...');
    setIsRefreshing(true);
    try {
      await Promise.all([
        // Pass filters to fetchMetrics
        fetchMetrics(selectedMonth || undefined, selectedYear || undefined),
        fetchIngresos(1, selectedMonth || undefined, selectedYear || undefined),
        fetchEgresos(1, selectedMonth || undefined, selectedYear || undefined)
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // --- Submit Handlers (Refetch with current filters after submit) ---
  const handleIngresoSubmit = async (data: any) => {
    try {
      const result = await createIngreso(data);
      if (result.success) {
        // Pass filters to fetchMetrics
        fetchMetrics(selectedMonth || undefined, selectedYear || undefined); 
        fetchIngresos(1, selectedMonth || undefined, selectedYear || undefined); 
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error creating ingreso:", error);
      return false;
    }
  };

  const handleEgresoSubmit = async (data: any) => {
    try {
      const result = await createEgreso(data);
      if (result.success) {
        // Pass filters to fetchMetrics
        fetchMetrics(selectedMonth || undefined, selectedYear || undefined); 
        fetchEgresos(1, selectedMonth || undefined, selectedYear || undefined); 
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error creating egreso:", error);
      return false;
    }
  };

  // --- Pagination Handlers (Use current filters) ---
  const handleIngresoPageChange = (page: number) => {
    // Pass state values (can be 0)
    fetchIngresos(page, selectedMonth || undefined, selectedYear || undefined);
  };

  const handleEgresoPageChange = (page: number) => {
    // Pass state values (can be 0)
    fetchEgresos(page, selectedMonth || undefined, selectedYear || undefined);
  };

  // --- Filter Change Handlers ---
  const handleYearChange = (value: string) => {
    const year = parseInt(value, 10); // value will be "0" for "Todos"
    setSelectedYear(year); 
    // No need to re-fetch here, useEffect handles it
  };

  const handleMonthChange = (value: string) => {
    const month = parseInt(value, 10); // value will be "0" for "Todos"
    setSelectedMonth(month); 
    // No need to re-fetch here, useEffect handles it
  };

  return (
    <>
      {/* Modals remain the same */}
      <IngresoResponsiveWrapper
        isOpen={isIngresoModalOpen}
        onClose={() => setIsIngresoModalOpen(false)}
        onSubmit={handleIngresoSubmit}
      />
      <EgresoModal
        isOpen={isEgresoModalOpen}
        onClose={() => setIsEgresoModalOpen(false)}
        onSubmit={handleEgresoSubmit}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8 md:space-y-10">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-6">
           <div>
             <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
               <Calendar className="h-7 w-7 text-blue-600" />
               Finanzas
             </h1>
             <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
               Gestiona y filtra los ingresos y egresos de tu negocio por mes y año.
             </p>
           </div>
           {/* Action Buttons moved below filters */}
         </div>

        {/* Filters and Actions Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
           {/* Filters */}
           <div className="flex flex-col sm:flex-row items-center gap-3">
             {/* Month Select - uses value 0 for Todos */}
             <Select value={selectedMonth.toString()} onValueChange={handleMonthChange}>
               <SelectTrigger className="w-full sm:w-[180px]">
                 <SelectValue placeholder="Seleccionar Mes" />
               </SelectTrigger>
               <SelectContent>
                 {months.map((month) => (
                   <SelectItem key={month.value} value={month.value.toString()}>
                     {month.label}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
             {/* Year Select - uses value 0 for Todos */}
             <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
               <SelectTrigger className="w-full sm:w-[120px]">
                 <SelectValue placeholder="Seleccionar Año" />
               </SelectTrigger>
               <SelectContent>
                 {years.map((year) => (
                   <SelectItem key={year.value} value={year.value.toString()}>
                     {year.label}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
             <Button
               variant="outline"
               size="sm"
               onClick={refreshData}
               disabled={isRefreshing || loadingIngresos || loadingEgresos}
               className="w-full sm:w-auto"
             >
               <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
               Actualizar Vista
             </Button>
           </div>

           {/* Action Buttons */}
           <div className="flex flex-shrink-0 items-center space-x-3 mt-4 md:mt-0">
              {activeTab === "ingresos" ? (
                <Button 
                  size="sm"
                  onClick={() => setIsIngresoModalOpen(true)}
                  className="w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Ingreso
                </Button>
              ) : (
                <Button 
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsEgresoModalOpen(true)}
                  className="w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Egreso
                </Button>
              )}
            </div>
        </div>
        
        {/* Metrics Section (Consider if these should reflect filters) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
           <Card>
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                 <DollarSign className="h-4 w-4 mr-2 text-emerald-500" />
                 Ingresos (MXN)
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold text-foreground">
                 {formatCurrency(metrics.ingresos.mxn, "MXN")}
               </div>
             </CardContent>
           </Card>
           
           <Card>
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <DollarSign className="h-4 w-4 mr-2 text-red-500" />
                  Egresos (MXN)
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold text-foreground">
                 {formatCurrency(metrics.egresos.mxn, "MXN")}
               </div>
             </CardContent>
           </Card>

           <Card>
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-blue-500" />
                  Balance (MXN)
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className={`text-2xl font-bold ${metrics.balance.mxn >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                 {formatCurrency(metrics.balance.mxn, "MXN")}
               </div>
             </CardContent>
           </Card>

           <Card>
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <ReceiptIcon className="h-4 w-4 mr-2 text-indigo-500" />
                  Cotizaciones Pagadas
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold text-foreground">
                 {metrics.cotizacionesPagadas}
               </div>
             </CardContent>
           </Card>
         </div>

        {/* Data Tables Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
           <TabsList>
             <TabsTrigger value="ingresos">Ingresos</TabsTrigger>
             <TabsTrigger value="egresos">Egresos</TabsTrigger>
           </TabsList>
           <TabsContent value="ingresos" className="mt-0">
              <IngresosTable 
                 ingresos={ingresos} 
                 isLoading={loadingIngresos}
                 page={ingresosPagination.page}
                 totalPages={ingresosPagination.totalPages}
                 onPageChange={handleIngresoPageChange}
              />
           </TabsContent>
           <TabsContent value="egresos" className="mt-0">
              <EgresosTable 
                 egresos={egresos} 
                 isLoading={loadingEgresos}
                 page={egresosPagination.page}
                 totalPages={egresosPagination.totalPages}
                 onPageChange={handleEgresoPageChange}
              />
           </TabsContent>
         </Tabs>
      </div>
    </>
  );
} 