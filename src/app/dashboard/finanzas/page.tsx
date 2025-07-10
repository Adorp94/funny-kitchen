"use client";

import { useState, useEffect } from 'react';
import { ArrowDown, ArrowUp, DollarSign, FileText, ReceiptIcon, Plus, CreditCard, RefreshCw, TrendingUp, Calendar, Download, Loader2 } from 'lucide-react';
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
import { CashFlowSection } from '@/components/finanzas/cash-flow-section';
import { 
  createIngreso, 
  createEgreso, 
  getAllIngresos, 
  getAllEgresos,
  getFinancialMetrics,
  getVentasForCSV,
  getIngresosFilteredForCSV,
  getEgresosFilteredForCSV,
  deleteIngreso,
  deleteEgreso
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
import { toast } from "sonner";

// Define types for our components
interface Ingreso {
  pago_id: number; 
  tipo_ingreso: 'cotizacion' | 'otro';
  descripcion?: string | null;
  cotizacion_id?: number | null;
  folio?: string | null;
  cliente_nombre?: string | null;
  moneda: string;
  monto: number;
  monto_mxn: number;
  metodo_pago: string;
  fecha_pago: string;
  porcentaje?: number | null;
  notas?: string | null;
  comprobante_url?: string | null;
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
  const [activeTab, setActiveTab] = useState("cashflow");
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
  const [isDownloadingVentas, setIsDownloadingVentas] = useState(false);
  const [isDownloadingIngresos, setIsDownloadingIngresos] = useState(false);
  const [isDownloadingEgresos, setIsDownloadingEgresos] = useState(false);

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
    // Pass filters to fetchMetrics - fix: properly handle 0 values
    const monthParam = selectedMonth === 0 ? undefined : selectedMonth;
    const yearParam = selectedYear === 0 ? undefined : selectedYear;
    fetchMetrics(monthParam, yearParam); 
    fetchIngresos(1, monthParam, yearParam);
    fetchEgresos(1, monthParam, yearParam);
  }, [selectedMonth, selectedYear]); // Re-fetch when filters change

  // --- Fetching Functions ---
  // Updated fetchMetrics to accept filters
  const fetchMetrics = async (month: number | undefined, year: number | undefined) => {
    console.log('[FinanzasPage] fetchMetrics called with:', { month, year });
    try {
      // Pass filters to the server action
      const result = await getFinancialMetrics(month, year); 
      console.log('[FinanzasPage] getFinancialMetrics result:', result);
      if (result.success && result.data) {
        console.log('[FinanzasPage] Setting metrics to:', result.data);
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
    console.log(`[fetchIngresos] Fetching page ${page}, month: ${month}, year: ${year}`); // Log input
    try {
      // Pass 0 or undefined directly (backend will handle)
      const result = await getAllIngresos(page, 10, month, year); 
      console.log("[fetchIngresos] Result:", JSON.stringify(result, null, 2)); // Log the full result

      if (result.success && result.data) {
        // Ensure result.data is an array before setting state
        if (Array.isArray(result.data)) {
            console.log(`[fetchIngresos] Success, setting ${result.data.length} ingresos.`);
            setIngresos(result.data);
        } else {
            console.warn("[fetchIngresos] getAllIngresos successful but data is not an array:", result.data);
            setIngresos([]); // Set to empty array if data is not array
        }
        
        if (result.pagination) {
          setIngresosPagination({
            page: result.pagination.page,
            totalPages: result.pagination.totalPages
          });
        } else {
           console.warn("[fetchIngresos] Pagination data missing in successful result.");
           setIngresosPagination({ page: 1, totalPages: 1 });
        }
      } else {
        console.warn("[fetchIngresos] Failed to fetch ingresos or no data for filter. Error:", result?.error);
        setIngresos([]); 
        setIngresosPagination({ page: 1, totalPages: 1 }); 
      }
    } catch (error) {
      console.error("[fetchIngresos] Error fetching ingresos (catch block):", error);
      setIngresos([]); 
      setIngresosPagination({ page: 1, totalPages: 1 }); 
    } finally {
      setLoadingIngresos(false);
    }
  };

  const fetchEgresos = async (page: number, month: number | undefined, year: number | undefined) => {
    setLoadingEgresos(true);
    try {
      const result = await getAllEgresos(page, 10, month, year);
      if (result.success && result.data) {
        if (Array.isArray(result.data)) {
          setEgresos(result.data);
        } else {
          console.warn("getAllEgresos successful but data is not an array:", result.data);
          setEgresos([]);
        }
        
        if (result.pagination) {
          setEgresosPagination({
            page: result.pagination.page,
            totalPages: result.pagination.totalPages
          });
        } else {
          setEgresosPagination({ page: 1, totalPages: 1 });
        }
      } else {
        console.warn("Failed to fetch egresos or no data:", result?.error);
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

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const monthParam = selectedMonth === 0 ? undefined : selectedMonth;
      const yearParam = selectedYear === 0 ? undefined : selectedYear;
      await Promise.all([
        fetchMetrics(monthParam, yearParam),
        fetchIngresos(1, monthParam, yearParam),
        fetchEgresos(1, monthParam, yearParam)
      ]);
    } catch (error) {
      console.error("Error refreshing data:", error);
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
        fetchMetrics(selectedMonth === 0 ? undefined : selectedMonth, selectedYear === 0 ? undefined : selectedYear); 
        fetchIngresos(1, selectedMonth === 0 ? undefined : selectedMonth, selectedYear === 0 ? undefined : selectedYear); 
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
      console.log('[handleEgresoSubmit] Submitting egreso data:', data);
      const result = await createEgreso(data);
      console.log('[handleEgresoSubmit] Create egreso result:', result);
      
      if (result.success) {
        // Pass filters to fetchMetrics
        fetchMetrics(selectedMonth === 0 ? undefined : selectedMonth, selectedYear === 0 ? undefined : selectedYear); 
        fetchEgresos(1, selectedMonth === 0 ? undefined : selectedMonth, selectedYear === 0 ? undefined : selectedYear); 
        return true;
      } else {
        console.error('[handleEgresoSubmit] Failed to create egreso:', result.error);
        return false;
      }
    } catch (error) {
      console.error('[handleEgresoSubmit] Error creating egreso:', error);
      return false;
    }
  };

  // --- Pagination Handlers (Use current filters) ---
  const handleIngresoPageChange = (page: number) => {
    const monthParam = selectedMonth === 0 ? undefined : selectedMonth;
    const yearParam = selectedYear === 0 ? undefined : selectedYear;
    fetchIngresos(page, monthParam, yearParam);
  };

  const handleEgresoPageChange = (page: number) => {
    const monthParam = selectedMonth === 0 ? undefined : selectedMonth;
    const yearParam = selectedYear === 0 ? undefined : selectedYear;
    fetchEgresos(page, monthParam, yearParam);
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

  // --- Download Handlers ---
  const handleDownloadVentasCSV = async () => {
    setIsDownloadingVentas(true);
    try {
      const monthParam = selectedMonth === 0 ? undefined : selectedMonth;
      const yearParam = selectedYear === 0 ? undefined : selectedYear;
      const result = await getVentasForCSV(monthParam, yearParam);
      
      if (result.success && typeof result.data === 'string' && result.data.length > 0) {
        const csvData = result.data;
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const date = new Date().toISOString().slice(0, 10);
        const filterSuffix = monthParam && yearParam ? `_${yearParam}_${monthParam.toString().padStart(2, '0')}` : 
                            yearParam ? `_${yearParam}` : '';
        link.setAttribute('download', `ventas${filterSuffix}_${date}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Reporte de ventas descargado exitosamente");
      } else if (result.success && (typeof result.data !== 'string' || result.data.length === 0)) {
        toast.info("No hay ventas para descargar en el período seleccionado");
      } else {
        console.error("Error generating Ventas CSV. Full result:", result);
        toast.error("Error al generar el archivo CSV de ventas");
      }
    } catch (error) {
      console.error("Error downloading Ventas CSV:", error);
      toast.error("Error al descargar el archivo CSV de ventas");
    } finally {
      setIsDownloadingVentas(false);
    }
  };

  const handleDownloadIngresosCSV = async () => {
    setIsDownloadingIngresos(true);
    try {
      const monthParam = selectedMonth === 0 ? undefined : selectedMonth;
      const yearParam = selectedYear === 0 ? undefined : selectedYear;
      const result = await getIngresosFilteredForCSV(monthParam, yearParam);
      
      if (result.success && typeof result.data === 'string' && result.data.length > 0) {
        const csvData = result.data;
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const date = new Date().toISOString().slice(0, 10);
        const filterSuffix = monthParam && yearParam ? `_${yearParam}_${monthParam.toString().padStart(2, '0')}` : 
                            yearParam ? `_${yearParam}` : '';
        link.setAttribute('download', `ingresos${filterSuffix}_${date}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Reporte de ingresos descargado exitosamente");
      } else if (result.success && (typeof result.data !== 'string' || result.data.length === 0)) {
        toast.info("No hay ingresos para descargar en el período seleccionado");
      } else {
        console.error("Error generating Ingresos CSV. Full result:", result);
        toast.error("Error al generar el archivo CSV de ingresos");
      }
    } catch (error) {
      console.error("Error downloading Ingresos CSV:", error);
      toast.error("Error al descargar el archivo CSV de ingresos");
    } finally {
      setIsDownloadingIngresos(false);
    }
  };

  const handleDownloadEgresosCSV = async () => {
    setIsDownloadingEgresos(true);
    try {
      const monthParam = selectedMonth === 0 ? undefined : selectedMonth;
      const yearParam = selectedYear === 0 ? undefined : selectedYear;
      const result = await getEgresosFilteredForCSV(monthParam, yearParam);
      
      if (result.success && typeof result.data === 'string' && result.data.length > 0) {
        const csvData = result.data;
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const date = new Date().toISOString().slice(0, 10);
        const filterSuffix = monthParam && yearParam ? `_${yearParam}_${monthParam.toString().padStart(2, '0')}` : 
                            yearParam ? `_${yearParam}` : '';
        link.setAttribute('download', `egresos${filterSuffix}_${date}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Reporte de egresos descargado exitosamente");
      } else if (result.success && (typeof result.data !== 'string' || result.data.length === 0)) {
        toast.info("No hay egresos para descargar en el período seleccionado");
      } else {
        console.error("Error generating Egresos CSV. Full result:", result);
        toast.error("Error al generar el archivo CSV de egresos");
      }
    } catch (error) {
      console.error("Error downloading Egresos CSV:", error);
      toast.error("Error al descargar el archivo CSV de egresos");
    } finally {
      setIsDownloadingEgresos(false);
    }
  };

  // --- Delete Handlers ---
  const handleDeleteIngreso = async (pagoId: number) => {
    try {
      const result = await deleteIngreso(pagoId);
      if (result.success) {
        // Refresh data after successful deletion
        const monthParam = selectedMonth === 0 ? undefined : selectedMonth;
        const yearParam = selectedYear === 0 ? undefined : selectedYear;
        await Promise.all([
          fetchMetrics(monthParam, yearParam),
          fetchIngresos(1, monthParam, yearParam)
        ]);
      } else {
        throw new Error(result.error || "Error al eliminar el ingreso");
      }
    } catch (error) {
      console.error("Error deleting ingreso:", error);
      throw error; // Re-throw to let toast.promise handle it
    }
  };

  const handleDeleteEgreso = async (egresoId: number) => {
    try {
      const result = await deleteEgreso(egresoId);
      if (result.success) {
        // Refresh data after successful deletion
        const monthParam = selectedMonth === 0 ? undefined : selectedMonth;
        const yearParam = selectedYear === 0 ? undefined : selectedYear;
        await Promise.all([
          fetchMetrics(monthParam, yearParam),
          fetchEgresos(1, monthParam, yearParam)
        ]);
      } else {
        throw new Error(result.error || "Error al eliminar el egreso");
      }
    } catch (error) {
      console.error("Error deleting egreso:", error);
      throw error; // Re-throw to let toast.promise handle it
    }
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

      <div className="py-8 md:py-12 space-y-8 md:space-y-10">
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
              {activeTab === "ingresos" && (
                <Button 
                  size="sm"
                  onClick={() => setIsIngresoModalOpen(true)}
                  className="w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Ingreso
                </Button>
              )}
              {activeTab === "egresos" && (
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
              {activeTab === "cashflow" && (
                <div className="text-sm text-muted-foreground">
                  Análisis de ventas reales
                </div>
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
             <TabsTrigger value="cashflow">Ventas</TabsTrigger>
             <TabsTrigger value="ingresos">Ingresos</TabsTrigger>
             <TabsTrigger value="egresos">Egresos</TabsTrigger>
           </TabsList>
           <TabsContent value="cashflow" className="space-y-4">
             <CashFlowSection 
               selectedMonth={selectedMonth === 0 ? undefined : selectedMonth}
               selectedYear={selectedYear === 0 ? undefined : selectedYear}
               onDownloadVentasCSV={handleDownloadVentasCSV}
               isDownloadingVentasCSV={isDownloadingVentas}
             />
           </TabsContent>
           <TabsContent value="ingresos" className="space-y-4">
             <div className="flex items-center justify-between">
               <h3 className="text-xl font-semibold tracking-tight">Ingresos Recientes</h3>
               <div className="flex items-center space-x-2">
                  <Button 
                     variant="outline"
                     size="sm"
                     onClick={handleDownloadIngresosCSV}
                     disabled={isDownloadingIngresos}
                  >
                    {isDownloadingIngresos ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Descargar Ingresos
                  </Button>
               </div>
             </div>
             <IngresosTable 
               ingresos={ingresos}
               page={ingresosPagination.page}
               totalPages={ingresosPagination.totalPages}
               onPageChange={handleIngresoPageChange}
               isLoading={loadingIngresos}
               onDelete={handleDeleteIngreso}
             />
           </TabsContent>
           <TabsContent value="egresos" className="space-y-4">
             <div className="flex items-center justify-between">
                 <h3 className="text-xl font-semibold tracking-tight">Egresos Recientes</h3>
                  <div className="flex items-center space-x-2">
                   <Button 
                       variant="outline"
                       size="sm"
                       onClick={handleDownloadEgresosCSV}
                       disabled={isDownloadingEgresos}
                   >
                     {isDownloadingEgresos ? (
                       <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                     ) : (
                       <Download className="mr-2 h-4 w-4" />
                     )}
                     Descargar Egresos
                   </Button>
                 </div>
             </div>
             <EgresosTable 
              egresos={egresos}
              page={egresosPagination.page}
              totalPages={egresosPagination.totalPages}
              onPageChange={handleEgresoPageChange}
              isLoading={loadingEgresos}
              onDelete={handleDeleteEgreso}
            />
           </TabsContent>
         </Tabs>
      </div>
    </>
  );
} 