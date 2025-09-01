"use client";

import { useState, useEffect } from 'react';
import { ProtectedRoute } from "@/components/protected-route";
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
import { ReportesSection } from '@/components/finanzas/reportes-section';
import { CuentasPorCobrarSection } from '@/components/finanzas/cuentas-por-cobrar-section';
import { 
  createIngreso, 
  createEgreso, 
  getAllIngresos, 
  getAllEgresos,
  getFinancialMetrics,
  getVentasForCSV,
  getIngresosFilteredForCSV,
  getEgresosFilteredForCSV,
  getVentasMonthlyReport,
  getVentasBiMonthlyReport,
  getVentasTriMonthlyReport,
  getVentasAnnualReport,
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
  
  // Reportes loading states
  const [isDownloadingMonthly, setIsDownloadingMonthly] = useState(false);
  const [isDownloadingBiMonthly, setIsDownloadingBiMonthly] = useState(false);
  const [isDownloadingTriMonthly, setIsDownloadingTriMonthly] = useState(false);
  const [isDownloadingAnnual, setIsDownloadingAnnual] = useState(false);

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

  // --- Reportes Download Handlers ---
  const handleDownloadMonthlyReport = async (year: number, month: number) => {
    setIsDownloadingMonthly(true);
    try {
      const result = await getVentasMonthlyReport(year, month);
      
      if (result.success && typeof result.data === 'string' && result.data.length > 0) {
        const csvData = result.data;
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const date = new Date().toISOString().slice(0, 10);
        link.setAttribute('download', `ventas_mensual_${year}_${month.toString().padStart(2, '0')}_${date}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Reporte mensual descargado exitosamente");
      } else if (result.success && (typeof result.data !== 'string' || result.data.length === 0)) {
        toast.info("No hay ventas para descargar en el período seleccionado");
      } else {
        console.error("Error generating Monthly Report. Full result:", result);
        toast.error("Error al generar el reporte mensual");
      }
    } catch (error) {
      console.error("Error downloading Monthly Report:", error);
      toast.error("Error al descargar el reporte mensual");
    } finally {
      setIsDownloadingMonthly(false);
    }
  };

  const handleDownloadBiMonthlyReport = async (year: number, startMonth: number) => {
    setIsDownloadingBiMonthly(true);
    try {
      const result = await getVentasBiMonthlyReport(year, startMonth);
      
      if (result.success && typeof result.data === 'string' && result.data.length > 0) {
        const csvData = result.data;
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const date = new Date().toISOString().slice(0, 10);
        const endMonth = startMonth + 1;
        link.setAttribute('download', `ventas_bimestral_${year}_${startMonth.toString().padStart(2, '0')}-${endMonth.toString().padStart(2, '0')}_${date}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Reporte bimestral descargado exitosamente");
      } else if (result.success && (typeof result.data !== 'string' || result.data.length === 0)) {
        toast.info("No hay ventas para descargar en el período seleccionado");
      } else {
        console.error("Error generating Bi-Monthly Report. Full result:", result);
        toast.error("Error al generar el reporte bimestral");
      }
    } catch (error) {
      console.error("Error downloading Bi-Monthly Report:", error);
      toast.error("Error al descargar el reporte bimestral");
    } finally {
      setIsDownloadingBiMonthly(false);
    }
  };

  const handleDownloadTriMonthlyReport = async (year: number, quarter: number) => {
    setIsDownloadingTriMonthly(true);
    try {
      const result = await getVentasTriMonthlyReport(year, quarter);
      
      if (result.success && typeof result.data === 'string' && result.data.length > 0) {
        const csvData = result.data;
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const date = new Date().toISOString().slice(0, 10);
        link.setAttribute('download', `ventas_trimestral_${year}_Q${quarter}_${date}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Reporte trimestral descargado exitosamente");
      } else if (result.success && (typeof result.data !== 'string' || result.data.length === 0)) {
        toast.info("No hay ventas para descargar en el período seleccionado");
      } else {
        console.error("Error generating Tri-Monthly Report. Full result:", result);
        toast.error("Error al generar el reporte trimestral");
      }
    } catch (error) {
      console.error("Error downloading Tri-Monthly Report:", error);
      toast.error("Error al descargar el reporte trimestral");
    } finally {
      setIsDownloadingTriMonthly(false);
    }
  };

  const handleDownloadAnnualReport = async (year: number) => {
    setIsDownloadingAnnual(true);
    try {
      const result = await getVentasAnnualReport(year);
      
      if (result.success && typeof result.data === 'string' && result.data.length > 0) {
        const csvData = result.data;
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const date = new Date().toISOString().slice(0, 10);
        link.setAttribute('download', `ventas_anual_${year}_${date}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Reporte anual descargado exitosamente");
      } else if (result.success && (typeof result.data !== 'string' || result.data.length === 0)) {
        toast.info("No hay ventas para descargar en el año seleccionado");
      } else {
        console.error("Error generating Annual Report. Full result:", result);
        toast.error("Error al generar el reporte anual");
      }
    } catch (error) {
      console.error("Error downloading Annual Report:", error);
      toast.error("Error al descargar el reporte anual");
    } finally {
      setIsDownloadingAnnual(false);
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
    <ProtectedRoute requiredModule="finanzas">
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

      <div className="space-y-6">
        {/* Clean Header */}
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground flex items-center">
            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
            Finanzas
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestiona ingresos, egresos y análisis financiero.
          </p>
        </div>

        {/* Compact Filters and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Filters */}
          <div className="flex items-center gap-2">
            <Select value={selectedMonth.toString()} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-[140px] h-8 text-xs border-0 bg-muted/50">
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
              <SelectTrigger className="w-[100px] h-8 text-xs border-0 bg-muted/50">
                <SelectValue placeholder="Año" />
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
              variant="ghost"
              size="sm"
              onClick={refreshData}
              disabled={isRefreshing || loadingIngresos || loadingEgresos}
              className="h-8 px-3 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {activeTab === "ingresos" && (
              <Button 
                size="sm"
                onClick={() => setIsIngresoModalOpen(true)}
                className="h-8 px-3 text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Nuevo Ingreso
              </Button>
            )}
            {activeTab === "egresos" && (
              <Button 
                variant="destructive"
                size="sm"
                onClick={() => setIsEgresoModalOpen(true)}
                className="h-8 px-3 text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Nuevo Egreso
              </Button>
            )}
          </div>
        </div>
        
        {/* Compact Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="border-border/50 bg-background/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground flex items-center">
                    <DollarSign className="h-3 w-3 mr-1 text-emerald-500" />
                    Ingresos
                  </p>
                  <p className="text-lg font-semibold text-foreground mt-1">
                    {formatCurrency(metrics.ingresos.mxn, "MXN")}
                  </p>
                </div>
                <div className="h-8 w-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <ArrowUp className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 bg-background/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground flex items-center">
                    <DollarSign className="h-3 w-3 mr-1 text-red-500" />
                    Egresos
                  </p>
                  <p className="text-lg font-semibold text-foreground mt-1">
                    {formatCurrency(metrics.egresos.mxn, "MXN")}
                  </p>
                </div>
                <div className="h-8 w-8 bg-red-50 rounded-lg flex items-center justify-center">
                  <ArrowDown className="h-4 w-4 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-background/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1 text-blue-500" />
                    Balance
                  </p>
                  <p className={`text-lg font-semibold mt-1 ${metrics.balance.mxn >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(metrics.balance.mxn, "MXN")}
                  </p>
                </div>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                  metrics.balance.mxn >= 0 ? 'bg-blue-50' : 'bg-orange-50'
                }`}>
                  <TrendingUp className={`h-4 w-4 ${
                    metrics.balance.mxn >= 0 ? 'text-blue-600' : 'text-orange-600'
                  }`} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-background/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground flex items-center">
                    <ReceiptIcon className="h-3 w-3 mr-1 text-indigo-500" />
                    Pagadas
                  </p>
                  <p className="text-lg font-semibold text-foreground mt-1">
                    {metrics.cotizacionesPagadas}
                  </p>
                </div>
                <div className="h-8 w-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <ReceiptIcon className="h-4 w-4 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Tables Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 h-9 bg-muted p-1">
            <TabsTrigger 
              value="cashflow" 
              className="text-xs font-medium data-[state=active]:bg-green-100 data-[state=active]:text-green-800 data-[state=active]:shadow-sm"
            >
              Ventas
            </TabsTrigger>
            <TabsTrigger 
              value="ingresos" 
              className="text-xs font-medium data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800 data-[state=active]:shadow-sm"
            >
              Ingresos
            </TabsTrigger>
            <TabsTrigger 
              value="egresos" 
              className="text-xs font-medium data-[state=active]:bg-red-100 data-[state=active]:text-red-800 data-[state=active]:shadow-sm"
            >
              Egresos
            </TabsTrigger>
            <TabsTrigger 
              value="por-cobrar" 
              className="text-xs font-medium data-[state=active]:bg-orange-100 data-[state=active]:text-orange-800 data-[state=active]:shadow-sm"
            >
              Por Cobrar
            </TabsTrigger>
            <TabsTrigger 
              value="reportes" 
              className="text-xs font-medium data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800 data-[state=active]:shadow-sm"
            >
              Reportes
            </TabsTrigger>
          </TabsList>
           <TabsContent value="cashflow" className="space-y-4 mt-6">
             <CashFlowSection 
               selectedMonth={selectedMonth === 0 ? undefined : selectedMonth}
               selectedYear={selectedYear === 0 ? undefined : selectedYear}
               onDownloadVentasCSV={handleDownloadVentasCSV}
               isDownloadingVentasCSV={isDownloadingVentas}
             />
           </TabsContent>
           <TabsContent value="ingresos" className="space-y-4 mt-6">
             <div className="flex items-center justify-between">
               <h3 className="text-base font-medium text-foreground">Ingresos Recientes</h3>
               <Button 
                 variant="ghost"
                 size="sm"
                 onClick={handleDownloadIngresosCSV}
                 disabled={isDownloadingIngresos}
                 className="h-8 px-3 text-xs"
               >
                 {isDownloadingIngresos ? (
                   <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                 ) : (
                   <Download className="mr-1.5 h-3.5 w-3.5" />
                 )}
                 Exportar
               </Button>
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
           <TabsContent value="egresos" className="space-y-4 mt-6">
             <div className="flex items-center justify-between">
               <h3 className="text-base font-medium text-foreground">Egresos Recientes</h3>
               <Button 
                 variant="ghost"
                 size="sm"
                 onClick={handleDownloadEgresosCSV}
                 disabled={isDownloadingEgresos}
                 className="h-8 px-3 text-xs"
               >
                 {isDownloadingEgresos ? (
                   <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                 ) : (
                   <Download className="mr-1.5 h-3.5 w-3.5" />
                 )}
                 Exportar
               </Button>
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
           <TabsContent value="por-cobrar" className="space-y-4 mt-6">
             <CuentasPorCobrarSection 
               selectedMonth={selectedMonth === 0 ? undefined : selectedMonth}
               selectedYear={selectedYear === 0 ? undefined : selectedYear}
             />
           </TabsContent>
           <TabsContent value="reportes" className="space-y-4 mt-6">
             <div className="space-y-1">
               <h3 className="text-base font-medium text-foreground">Reportes de Ventas</h3>
               <p className="text-sm text-muted-foreground">
                 Descarga reportes por diferentes períodos de tiempo
               </p>
             </div>
             <ReportesSection 
               onDownloadMonthly={handleDownloadMonthlyReport}
               onDownloadBiMonthly={handleDownloadBiMonthlyReport}
               onDownloadTriMonthly={handleDownloadTriMonthlyReport}
               onDownloadAnnual={handleDownloadAnnualReport}
               isDownloadingMonthly={isDownloadingMonthly}
               isDownloadingBiMonthly={isDownloadingBiMonthly}
               isDownloadingTriMonthly={isDownloadingTriMonthly}
               isDownloadingAnnual={isDownloadingAnnual}
             />
           </TabsContent>
         </Tabs>
      </div>
      </>
    </ProtectedRoute>
  );
} 