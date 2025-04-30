"use client";

import { useState, useEffect } from 'react';
import { ArrowDown, ArrowUp, DollarSign, FileText, ReceiptIcon, Plus, CreditCard, RefreshCw, TrendingUp } from 'lucide-react';
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
import { IngresoModal } from '@/components/finanzas/ingreso-modal';
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
  notas?: string;
  comprobante_url?: string;
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
  comprobante_url?: string | null;
  notas?: string | null;
}

export default function FinanzasPage() {
  const [activeTab, setActiveTab] = useState("ingresos");
  const [isIngresoModalOpen, setIsIngresoModalOpen] = useState(false);
  const [isEgresoModalOpen, setIsEgresoModalOpen] = useState(false);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [egresos, setEgresos] = useState<Egreso[]>([]);
  const [ingresosPagination, setIngresosPagination] = useState({ page: 1, totalPages: 1 });
  const [egresosPagination, setEgresosPagination] = useState({ page: 1, totalPages: 1 });
  const [loadingIngresos, setLoadingIngresos] = useState(false);
  const [loadingEgresos, setLoadingEgresos] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [metrics, setMetrics] = useState({
    ingresos: { mxn: 0, usd: 0 },
    egresos: { mxn: 0, usd: 0 },
    balance: { mxn: 0, usd: 0 },
    cotizacionesPagadas: 0
  });
  
  useEffect(() => {
    fetchMetrics();
    fetchIngresos(1);
    fetchEgresos(1);
  }, []);

  const fetchMetrics = async () => {
    try {
      const result = await getFinancialMetrics();
      if (result.success && result.data) {
        setMetrics(result.data);
      }
    } catch (error) {
      console.error("Error fetching metrics:", error);
    }
  };

  const fetchIngresos = async (page: number) => {
    setLoadingIngresos(true);
    try {
      const result = await getAllIngresos(page);
      if (result.success && result.data) {
        setIngresos(result.data);
        if (result.pagination) {
          setIngresosPagination({
            page: result.pagination.page,
            totalPages: result.pagination.totalPages
          });
        }
      }
    } catch (error) {
      console.error("Error fetching ingresos:", error);
    } finally {
      setLoadingIngresos(false);
    }
  };

  const fetchEgresos = async (page: number) => {
    setLoadingEgresos(true);
    try {
      const result = await getAllEgresos(page);
      if (result.success && result.data) {
        setEgresos(result.data);
        if (result.pagination) {
          setEgresosPagination({
            page: result.pagination.page,
            totalPages: result.pagination.totalPages
          });
        }
      }
    } catch (error) {
      console.error("Error fetching egresos:", error);
    } finally {
      setLoadingEgresos(false);
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchMetrics(),
        fetchIngresos(ingresosPagination.page),
        fetchEgresos(egresosPagination.page)
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleIngresoSubmit = async (data: any) => {
    try {
      const result = await createIngreso(data);
      if (result.success) {
        fetchMetrics();
        fetchIngresos(1);
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
        fetchMetrics();
        fetchEgresos(1);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error creating egreso:", error);
      return false;
    }
  };

  const handleIngresoPageChange = (page: number) => {
    fetchIngresos(page);
  };

  const handleEgresoPageChange = (page: number) => {
    fetchEgresos(page);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 flex flex-col min-h-[calc(100vh-120px)]">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-10 md:mb-12">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Finanzas</h1>
          <p className="mt-2 text-base text-slate-500 max-w-xl">
            Gestiona los ingresos y egresos de tu negocio. Visualiza y administra tu flujo de efectivo en tiempo real.
          </p>
        </div>
        <div className="flex items-center space-x-3 mt-5 sm:mt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isRefreshing}
            className="h-10 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          {activeTab === "ingresos" ? (
            <Button 
              size="sm"
              className="h-10 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
              onClick={() => setIsIngresoModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Ingreso
            </Button>
          ) : (
            <Button 
              size="sm"
              className="h-10 bg-linear-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white"
              onClick={() => setIsEgresoModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Egreso
            </Button>
          )}
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10 mb-10 md:mb-12">
        {/* Ingresos MXN Card */}
        <Card className="bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-emerald-700 dark:text-emerald-400 flex items-center">
              <DollarSign className="h-5 w-5 mr-1.5 text-emerald-600 dark:text-emerald-500" />
              Ingresos MXN
            </CardTitle>
            <CardDescription className="text-xs text-emerald-600/70 dark:text-emerald-500/70">
              Total recibido en pesos mexicanos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <span className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                {formatCurrency(metrics.ingresos.mxn, "MXN")}
              </span>
            </div>
          </CardContent>
        </Card>
        
        {/* Egresos MXN Card */}
        <Card className="bg-rose-50 border-rose-200 dark:bg-rose-900/30 dark:border-rose-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-rose-700 dark:text-rose-400 flex items-center">
              <ReceiptIcon className="h-5 w-5 mr-1.5 text-rose-600 dark:text-rose-500" />
              Egresos MXN
            </CardTitle>
            <CardDescription className="text-xs text-rose-600/70 dark:text-rose-500/70">
              Total gastado en pesos mexicanos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <span className="text-3xl font-bold text-rose-700 dark:text-rose-400">
                {formatCurrency(metrics.egresos.mxn, "MXN")}
              </span>
            </div>
          </CardContent>
        </Card>
        
        {/* Balance MXN Card */}
        <Card className={
            metrics.balance.mxn >= 0 
              ? "bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800" 
              : "bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800"
          }>
          <CardHeader className="pb-2">
            <CardTitle className={`text-base font-medium flex items-center ${
              metrics.balance.mxn >= 0 
                ? 'text-blue-700 dark:text-blue-400' 
                : 'text-amber-700 dark:text-amber-400'
            }`}>
              {metrics.balance.mxn >= 0 ? (
                <TrendingUp className="h-5 w-5 mr-1.5 text-blue-600 dark:text-blue-500" />
              ) : (
                <ArrowDown className="h-5 w-5 mr-1.5 text-amber-600 dark:text-amber-500" />
              )}
              Balance MXN
            </CardTitle>
            <CardDescription className={`text-xs ${
              metrics.balance.mxn >= 0 
                ? 'text-blue-600/70 dark:text-blue-500/70' 
                : 'text-amber-600/70 dark:text-amber-500/70'
            }`}>
              {metrics.balance.mxn >= 0 ? 'Saldo positivo actual' : 'Saldo negativo actual'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <span className={`text-3xl font-bold ${
                metrics.balance.mxn >= 0 
                  ? 'text-blue-700 dark:text-blue-400' 
                  : 'text-amber-700 dark:text-amber-400'
              }`}>
                {formatCurrency(Math.abs(metrics.balance.mxn), "MXN")}
              </span>
            </div>
          </CardContent>
        </Card>
        
        {/* Cotizaciones Pagadas Card */}
        <Card className="bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-indigo-700 dark:text-indigo-400 flex items-center">
              <CreditCard className="h-5 w-5 mr-1.5 text-indigo-600 dark:text-indigo-500" />
              Cotizaciones Pagadas
            </CardTitle>
            <CardDescription className="text-xs text-indigo-600/70 dark:text-indigo-500/70">
              Total de cotizaciones completadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <span className="text-3xl font-bold text-indigo-700 dark:text-indigo-400">
                {metrics.cotizacionesPagadas}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100/80 p-1 rounded-xl border border-slate-200">
          <TabsTrigger 
            value="ingresos" 
            className="rounded-lg px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:text-slate-900"
          >
            Ingresos
          </TabsTrigger>
          <TabsTrigger 
            value="egresos" 
            className="rounded-lg px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-rose-700 data-[state=active]:shadow-sm data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:text-slate-900"
          >
            Egresos
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="ingresos" className="mt-8">
          <IngresosTable 
            ingresos={ingresos}
            isLoading={loadingIngresos}
            page={ingresosPagination.page}
            totalPages={ingresosPagination.totalPages}
            onPageChange={handleIngresoPageChange}
          />
        </TabsContent>
        
        <TabsContent value="egresos" className="mt-8">
          <EgresosTable 
            egresos={egresos}
            isLoading={loadingEgresos}
            page={egresosPagination.page}
            totalPages={egresosPagination.totalPages}
            onPageChange={handleEgresoPageChange}
          />
        </TabsContent>
      </Tabs>
      
      {/* Modals */}
      <IngresoModal 
        isOpen={isIngresoModalOpen} 
        onClose={() => setIsIngresoModalOpen(false)} 
        onSubmit={handleIngresoSubmit} 
      />
      
      <EgresoModal 
        isOpen={isEgresoModalOpen} 
        onClose={() => setIsEgresoModalOpen(false)} 
        onSubmit={handleEgresoSubmit} 
      />
    </div>
  );
} 