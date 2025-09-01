"use client";

import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Clock, 
  DollarSign, 
  AlertTriangle, 
  TrendingDown,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Phone,
  Mail,
  Eye,
  Calendar
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/utils/date";
import { 
  getAccountsReceivableMetrics, 
  getAccountsReceivableList 
} from "@/app/actions/finanzas-actions";
import Link from 'next/link';

interface AccountsReceivableMetrics {
  totalPorCobrar: { mxn: number; usd: number };
  clientesConSaldo: number;
  clientesMorosos: number;
  promedioDiasCobro: number;
}

interface AccountReceivableItem {
  cotizacion_id: number;
  folio: string;
  estado: string;
  total: number;
  total_mxn: number;
  monto_pagado: number;
  monto_pagado_mxn: number;
  saldo_pendiente: number;
  saldo_pendiente_mxn: number;
  porcentaje_completado: number;
  dias_transcurridos: number;
  fecha_aprobacion: string;
  cliente_nombre: string;
  cliente_celular: string;
  cliente_correo: string;
  moneda: string;
  categoria_vencimiento?: string;
}

interface CuentasPorCobrarSectionProps {
  selectedMonth?: number;
  selectedYear?: number;
}

export function CuentasPorCobrarSection({ selectedMonth, selectedYear }: CuentasPorCobrarSectionProps) {
  const [metrics, setMetrics] = useState<AccountsReceivableMetrics>({
    totalPorCobrar: { mxn: 0, usd: 0 },
    clientesConSaldo: 0,
    clientesMorosos: 0,
    promedioDiasCobro: 0
  });
  const [accounts, setAccounts] = useState<AccountReceivableItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchAccounts(page);
  }, [page, selectedMonth, selectedYear]);

  const fetchMetrics = async () => {
    setLoading(true);
    console.log('[CuentasPorCobrarSection] Fetching metrics with filters:', { selectedMonth, selectedYear });
    try {
      const result = await getAccountsReceivableMetrics(
        selectedMonth || undefined, 
        selectedYear || undefined
      );
      console.log('[CuentasPorCobrarSection] getAccountsReceivableMetrics result:', result);
      if (result.success && result.data) {
        console.log('[CuentasPorCobrarSection] Setting metrics to:', result.data);
        setMetrics(result.data);
      } else {
        console.error('[CuentasPorCobrarSection] Failed to fetch metrics:', result.error);
      }
    } catch (error) {
      console.error('[CuentasPorCobrarSection] Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async (pageNum: number) => {
    setAccountsLoading(true);
    try {
      const result = await getAccountsReceivableList(
        pageNum,
        10,
        selectedMonth || undefined,
        selectedYear || undefined
      );
      if (result.success && result.data) {
        setAccounts(result.data);
        if (result.pagination) {
          setTotalPages(result.pagination.totalPages);
        }
      }
    } catch (error) {
      console.error('Error fetching accounts receivable:', error);
    } finally {
      setAccountsLoading(false);
    }
  };

  const getVencimientoColor = (dias: number) => {
    if (dias > 30) return "text-red-600";
    if (dias > 15) return "text-orange-600";
    return "text-green-600";
  };

  const getVencimientoBadge = (dias: number) => {
    if (dias > 30) {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">Vencida</Badge>;
    }
    if (dias > 15) {
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">Por Vencer</Badge>;
    }
    return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Al Día</Badge>;
  };

  const getEstadoBadge = (estado: string) => {
    const estadoMap: Record<string, { label: string; className: string }> = {
      "aprobada": { label: "Aprobada", className: "bg-blue-50 text-blue-700 border-blue-200" },
      "producción": { label: "En Producción", className: "bg-purple-50 text-purple-700 border-purple-200" },
      "enviada": { label: "Enviada", className: "bg-green-50 text-green-700 border-green-200" }
    };
    const estadoInfo = estadoMap[estado] || { label: estado, className: "bg-gray-50 text-gray-700 border-gray-200" };
    return (
      <Badge variant="outline" className={`text-xs font-medium ${estadoInfo.className}`}>
        {estadoInfo.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Por Cobrar */}
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-1.5 bg-orange-100 rounded-md">
                <DollarSign className="h-4 w-4 text-orange-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-600">Total Por Cobrar</p>
              <p className="text-lg font-semibold text-orange-700">
                {formatCurrency(metrics.totalPorCobrar.mxn, "MXN")}
              </p>
              <p className="text-xs text-gray-500">
                Saldo pendiente total
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Clientes con Saldo */}
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-1.5 bg-blue-100 rounded-md">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-600">Clientes con Saldo</p>
              <p className="text-lg font-semibold text-blue-700">
                {metrics.clientesConSaldo}
              </p>
              <p className="text-xs text-gray-500">
                Cotizaciones pendientes
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Clientes Morosos */}
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-1.5 bg-red-100 rounded-md">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-600">Clientes Morosos</p>
              <p className="text-lg font-semibold text-red-700">
                {metrics.clientesMorosos}
              </p>
              <p className="text-xs text-gray-500">
                Más de 30 días
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Promedio Días Cobro */}
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-1.5 bg-gray-100 rounded-md">
                <TrendingDown className="h-4 w-4 text-gray-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-600">Promedio Días</p>
              <p className="text-lg font-semibold text-gray-700">
                {metrics.promedioDiasCobro}
              </p>
              <p className="text-xs text-gray-500">
                Días promedio de cobro
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Receivable Table */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gray-100 rounded-md">
                <Calendar className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-gray-900">
                  Cuentas por Cobrar
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0.5">
                  Cotizaciones con saldo pendiente de pago
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {accountsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : accounts.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200">
                      <TableHead className="font-medium text-gray-600 py-2 text-xs">Cotización</TableHead>
                      <TableHead className="font-medium text-gray-600 text-xs">Cliente</TableHead>
                      <TableHead className="font-medium text-gray-600 text-xs">Estado</TableHead>
                      <TableHead className="font-medium text-gray-600 text-xs text-right">Total</TableHead>
                      <TableHead className="font-medium text-gray-600 text-xs text-right">Pagado</TableHead>
                      <TableHead className="font-medium text-gray-600 text-xs text-right">Saldo</TableHead>
                      <TableHead className="font-medium text-gray-600 text-xs text-center">%</TableHead>
                      <TableHead className="font-medium text-gray-600 text-xs text-center">Días</TableHead>
                      <TableHead className="font-medium text-gray-600 text-xs text-center">Estado</TableHead>
                      <TableHead className="font-medium text-gray-600 text-xs text-center">Contacto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((account) => (
                      <TableRow key={account.cotizacion_id} className="border-gray-200 hover:bg-gray-50/50">
                        <TableCell className="py-2">
                          <div className="space-y-0.5">
                            <Link 
                              href={`/dashboard/cotizaciones/${account.cotizacion_id}/edit`}
                              className="text-xs font-medium text-blue-600 hover:underline"
                            >
                              {account.folio}
                            </Link>
                            <div className="text-xs text-gray-500">
                              {formatDate(account.fecha_aprobacion)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="text-xs font-medium text-gray-900">{account.cliente_nombre}</div>
                            <div className="text-xs text-gray-500">
                              {account.cliente_celular && (
                                <span className="inline-flex items-center">
                                  <Phone className="h-3 w-3 mr-1" />
                                  {account.cliente_celular}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getEstadoBadge(account.estado)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-xs font-medium text-gray-900">
                            {formatCurrency(account.total, account.moneda)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-xs font-medium text-emerald-600">
                            {formatCurrency(account.monto_pagado, account.moneda)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-xs font-semibold text-orange-600">
                            {formatCurrency(account.saldo_pendiente, account.moneda)}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                            {account.porcentaje_completado.toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-xs font-medium ${getVencimientoColor(account.dias_transcurridos)}`}>
                            {account.dias_transcurridos}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {getVencimientoBadge(account.dias_transcurridos)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center items-center gap-1">
                            {account.cliente_celular && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-green-600 hover:text-green-800 hover:bg-green-50"
                                title={`Llamar a ${account.cliente_celular}`}
                                onClick={() => window.open(`tel:${account.cliente_celular}`, '_self')}
                              >
                                <Phone className="h-3 w-3" />
                              </Button>
                            )}
                            {account.cliente_correo && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                title={`Enviar email a ${account.cliente_correo}`}
                                onClick={() => window.open(`mailto:${account.cliente_correo}?subject=Seguimiento Cotización ${account.folio}`, '_blank')}
                              >
                                <Mail className="h-3 w-3" />
                              </Button>
                            )}
                            <Link href={`/dashboard/cotizaciones/${account.cotizacion_id}/edit`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                                title="Ver cotización"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    Página {page} de {totalPages}
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page <= 1 || accountsLoading}
                      className="h-7 w-7 p-0 border-gray-200 hover:bg-gray-100"
                    >
                      <ArrowLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page >= totalPages || accountsLoading}
                      className="h-7 w-7 p-0 border-gray-200 hover:bg-gray-100"
                    >
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <div className="mx-auto w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center mb-3">
                <DollarSign className="h-4 w-4 text-gray-400" />
              </div>
              <p className="text-xs font-medium text-gray-900 mb-1">No hay cuentas pendientes</p>
              <p className="text-xs text-gray-500">
                Todas las cotizaciones están completamente pagadas
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}