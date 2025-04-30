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
import { ScrollArea } from "@/components/ui/scroll-area";

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
    <>
      {/* Temporarily remove outer ScrollArea to isolate issues */}
      {/* <ScrollArea> */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8 md:space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Finanzas</h1>
              <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
                Gestiona los ingresos y egresos de tu negocio. Visualiza y administra tu flujo de efectivo.
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center space-x-3 mt-4 sm:mt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
              {activeTab === "ingresos" ? (
                <Button 
                  size="sm"
                  onClick={() => setIsIngresoModalOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Ingreso
                </Button>
              ) : (
                <Button 
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsEgresoModalOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Egreso
                </Button>
              )}
            </div>
          </div>
          
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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="ingresos">Ingresos</TabsTrigger>
              <TabsTrigger value="egresos">Egresos</TabsTrigger>
            </TabsList>
            <TabsContent value="ingresos" className="mt-0">
               <IngresosTable 
                  ingresos={ingresos} 
                  loading={loadingIngresos} 
                  pagination={ingresosPagination}
                  onPageChange={handleIngresoPageChange}
               />
            </TabsContent>
            <TabsContent value="egresos" className="mt-0">
               <EgresosTable 
                  egresos={egresos} 
                  loading={loadingEgresos} 
                  pagination={egresosPagination}
                  onPageChange={handleEgresoPageChange}
               />
            </TabsContent>
          </Tabs>
          
        </div>
      {/* </ScrollArea> */}

      {/* Modals remain siblings */}
      <>
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
      </>
    </>
  );
} 