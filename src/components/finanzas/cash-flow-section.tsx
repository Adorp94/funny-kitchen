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
  TrendingUp, 
  DollarSign, 
  ReceiptIcon, 
  Clock,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Download
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/utils/date";
import { 
  getCashFlowMetrics, 
  getCotizacionPayments 
} from "@/app/actions/finanzas-actions";

interface CashFlowMetrics {
  totalActiveQuotes: { mxn: number; usd: number };
  actualPayments: { mxn: number; usd: number };
  pendingCollections: { mxn: number; usd: number };
  collectionRate: number;
  activeCotizaciones: number;
  totalCotizaciones: number;
}

interface CotizacionPayment {
  pago_id: number;
  cotizacion_id: number;
  monto: number;
  monto_mxn: number;
  moneda: string;
  metodo_pago: string;
  fecha_pago: string;
  notas?: string;
  porcentaje_aplicado?: number;
  cliente_nombre: string;
  folio: string;
  cotizacion_total: number;
  cotizacion_estado: string;
}

interface CashFlowSectionProps {
  selectedMonth?: number;
  selectedYear?: number;
  onDownloadCSV?: () => void;
  isDownloadingCSV?: boolean;
  onDownloadHistoricCSV?: () => void;
  isDownloadingHistoricCSV?: boolean;
}

export function CashFlowSection({ selectedMonth, selectedYear, onDownloadCSV, isDownloadingCSV, onDownloadHistoricCSV, isDownloadingHistoricCSV }: CashFlowSectionProps) {
  const [metrics, setMetrics] = useState<CashFlowMetrics>({
    totalActiveQuotes: { mxn: 0, usd: 0 },
    actualPayments: { mxn: 0, usd: 0 },
    pendingCollections: { mxn: 0, usd: 0 },
    collectionRate: 0,
    activeCotizaciones: 0,
    totalCotizaciones: 0
  });
  const [payments, setPayments] = useState<CotizacionPayment[]>([]);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsTotalPages, setPaymentsTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  useEffect(() => {
    fetchCashFlowData();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchPayments(paymentsPage);
  }, [paymentsPage, selectedMonth, selectedYear]);

  const fetchCashFlowData = async () => {
    setLoading(true);
    console.log('[CashFlowSection] Fetching cash flow data with filters:', { selectedMonth, selectedYear });
    try {
      const result = await getCashFlowMetrics(
        selectedMonth || undefined, 
        selectedYear || undefined
      );
      console.log('[CashFlowSection] getCashFlowMetrics result:', result);
      if (result.success && result.data) {
        console.log('[CashFlowSection] Setting metrics to:', result.data);
        setMetrics(result.data);
      } else {
        console.error('[CashFlowSection] Failed to fetch metrics:', result.error);
      }
    } catch (error) {
      console.error('[CashFlowSection] Error fetching cash flow data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async (page: number) => {
    setPaymentsLoading(true);
    try {
      const result = await getCotizacionPayments(
        page,
        10,
        selectedMonth || undefined,
        selectedYear || undefined
      );
      if (result.success && result.data) {
        setPayments(result.data);
        if (result.pagination) {
          setPaymentsTotalPages(result.pagination.totalPages);
        }
      }
    } catch (error) {
      console.error('Error fetching cotizacion payments:', error);
    } finally {
      setPaymentsLoading(false);
    }
  };

  const getCollectionRateColor = (rate: number) => {
    if (rate >= 80) return "text-emerald-600";
    if (rate >= 60) return "text-blue-600";
    if (rate >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getCollectionRateIcon = (rate: number) => {
    if (rate >= 80) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (rate >= 60) return <TrendingUp className="h-4 w-4 text-blue-500" />;
    if (rate >= 40) return <TrendingUp className="h-4 w-4 text-orange-500" />;
    return <TrendingUp className="h-4 w-4 text-red-500" />;
  };

  const getMetodoPagoLabel = (metodo: string) => {
    const metodosMap: Record<string, string> = {
      "efectivo": "Efectivo",
      "transferencia": "Transferencia",
      "tarjeta": "Tarjeta",
      "cheque": "Cheque",
      "deposito": "Depósito"
    };
    return metodosMap[metodo] || metodo;
  };

  const getEstadoBadge = (estado: string) => {
    const estadoMap: Record<string, { label: string; className: string }> = {
      "pendiente": { label: "Pendiente", className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
      "aprobada": { label: "Aprobada", className: "bg-blue-50 text-blue-700 border-blue-200" },
      "producción": { label: "En Producción", className: "bg-purple-50 text-purple-700 border-purple-200" },
      "enviada": { label: "Enviada", className: "bg-green-50 text-green-700 border-green-200" },
      "completada": { label: "Completada", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
      "cancelada": { label: "Cancelada", className: "bg-red-50 text-red-700 border-red-200" }
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
      {/* Cash Flow Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cotizaciones Vendidas */}
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-1.5 bg-gray-100 rounded-md">
                <ReceiptIcon className="h-4 w-4 text-gray-600" />
              </div>
              <div className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {metrics.activeCotizaciones}/{metrics.totalCotizaciones}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-600">Cotizaciones Vendidas</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(metrics.totalActiveQuotes.mxn, "MXN")}
              </p>
              <p className="text-xs text-gray-500">
                En producción o con anticipo
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pagos Recibidos */}
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-1.5 bg-emerald-100 rounded-md">
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-600">Pagos Recibidos</p>
              <p className="text-lg font-semibold text-emerald-700">
                {formatCurrency(metrics.actualPayments.mxn, "MXN")}
              </p>
              <p className="text-xs text-gray-500">
                Dinero real cobrado
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pendiente por Cobrar */}
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-1.5 bg-orange-100 rounded-md">
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-600">Pendiente por Cobrar</p>
              <p className="text-lg font-semibold text-orange-700">
                {formatCurrency(metrics.pendingCollections.mxn, "MXN")}
              </p>
              <p className="text-xs text-gray-500">
                De cotizaciones vendidas
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tasa de Cobranza */}
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-1.5 bg-blue-100 rounded-md">
                {getCollectionRateIcon(metrics.collectionRate)}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-600">Tasa de Cobranza</p>
              <p className={`text-lg font-semibold ${getCollectionRateColor(metrics.collectionRate)}`}>
                {metrics.collectionRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">
                % de dinero ya cobrado
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gray-100 rounded-md">
                <TrendingUp className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-gray-900">
                  Pagos de Cotizaciones Vendidas
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0.5">
                  Pagos recibidos de cotizaciones en producción o con anticipo
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {onDownloadCSV && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDownloadCSV}
                  disabled={isDownloadingCSV}
                  className="h-7 text-xs"
                >
                  {isDownloadingCSV ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="mr-1 h-3 w-3" />
                  )}
                  Descargar CSV mensual
                </Button>
              )}
              {onDownloadHistoricCSV && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDownloadHistoricCSV}
                  disabled={isDownloadingHistoricCSV}
                  className="h-7 text-xs"
                >
                  {isDownloadingHistoricCSV ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="mr-1 h-3 w-3" />
                  )}
                  Historial CSV
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {paymentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : payments.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200">
                      <TableHead className="font-medium text-gray-600 py-2 text-xs">Fecha</TableHead>
                      <TableHead className="font-medium text-gray-600 text-xs">Cotización</TableHead>
                      <TableHead className="font-medium text-gray-600 text-xs">Cliente</TableHead>
                      <TableHead className="font-medium text-gray-600 text-xs">Estado</TableHead>
                      <TableHead className="font-medium text-gray-600 text-xs">Monto</TableHead>
                      <TableHead className="font-medium text-gray-600 text-xs">% del Total</TableHead>
                      <TableHead className="font-medium text-gray-600 text-xs">Método</TableHead>
                      <TableHead className="font-medium text-gray-600 text-xs">Notas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.pago_id} className="border-gray-200 hover:bg-gray-50/50">
                        <TableCell className="py-2">
                          <span className="text-xs font-medium text-gray-900">
                            {formatDate(payment.fecha_pago)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="text-xs font-medium text-gray-900">{payment.folio}</div>
                            <div className="text-xs text-gray-500">
                              Total: {formatCurrency(payment.cotizacion_total, payment.moneda)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-medium text-gray-900">{payment.cliente_nombre}</span>
                        </TableCell>
                        <TableCell>
                          {getEstadoBadge(payment.cotizacion_estado)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="text-xs font-semibold text-emerald-600">
                              {formatCurrency(payment.monto, payment.moneda)}
                            </div>
                            {payment.moneda === 'USD' && payment.monto_mxn && (
                              <div className="text-xs text-gray-500">
                                {formatCurrency(payment.monto_mxn, 'MXN')}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {payment.porcentaje_aplicado ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                              {payment.porcentaje_aplicado.toFixed(1)}%
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-gray-100 text-gray-700 text-xs">
                            {getMetodoPagoLabel(payment.metodo_pago)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-gray-500 max-w-[200px] truncate">
                            {payment.notas || '-'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {paymentsTotalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    Página {paymentsPage} de {paymentsTotalPages}
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentsPage(Math.max(1, paymentsPage - 1))}
                      disabled={paymentsPage <= 1 || paymentsLoading}
                      className="h-7 w-7 p-0 border-gray-200 hover:bg-gray-100"
                    >
                      <ArrowLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentsPage(Math.min(paymentsTotalPages, paymentsPage + 1))}
                      disabled={paymentsPage >= paymentsTotalPages || paymentsLoading}
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
                <ReceiptIcon className="h-4 w-4 text-gray-400" />
              </div>
              <p className="text-xs font-medium text-gray-900 mb-1">No hay pagos</p>
              <p className="text-xs text-gray-500">
                No se encontraron pagos para el período seleccionado
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 