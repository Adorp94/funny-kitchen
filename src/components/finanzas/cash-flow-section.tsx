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
  TrendingDown, 
  DollarSign, 
  ReceiptIcon, 
  ArrowRight, 
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  ArrowLeft
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
}

export function CashFlowSection({ selectedMonth, selectedYear }: CashFlowSectionProps) {
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
    try {
      const result = await getCashFlowMetrics(
        selectedMonth || undefined, 
        selectedYear || undefined
      );
      if (result.success && result.data) {
        setMetrics(result.data);
      }
    } catch (error) {
      console.error('Error fetching cash flow data:', error);
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
    if (rate >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getCollectionRateIcon = (rate: number) => {
    if (rate >= 80) return <CheckCircle2 className="h-4 w-4" />;
    if (rate >= 60) return <Clock className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
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
    const estadoMap: Record<string, { label: string; style: string }> = {
      "pendiente": { label: "Pendiente", style: "bg-yellow-100 text-yellow-800" },
      "aprobada": { label: "Aprobada", style: "bg-blue-100 text-blue-800" },
      "producción": { label: "En Producción", style: "bg-purple-100 text-purple-800" },
      "enviada": { label: "Enviada", style: "bg-green-100 text-green-800" },
      "completada": { label: "Completada", style: "bg-emerald-100 text-emerald-800" },
      "cancelada": { label: "Cancelada", style: "bg-red-100 text-red-800" }
    };
    const estadoInfo = estadoMap[estado] || { label: estado, style: "bg-gray-100 text-gray-800" };
    return (
      <Badge variant="outline" className={estadoInfo.style}>
        {estadoInfo.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cash Flow Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <ReceiptIcon className="h-4 w-4 mr-2 text-purple-500" />
              Cotizaciones Activas
            </CardTitle>
            <CardDescription className="text-xs">
              En producción o con anticipo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(metrics.totalActiveQuotes.mxn, "MXN")}
            </div>
            {metrics.totalActiveQuotes.usd > 0 && (
              <div className="text-sm text-muted-foreground">
                + {formatCurrency(metrics.totalActiveQuotes.usd, "USD")}
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-1">
              {metrics.activeCotizaciones} de {metrics.totalCotizaciones} cotizaciones
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <DollarSign className="h-4 w-4 mr-2 text-emerald-500" />
              Pagos Recibidos
            </CardTitle>
            <CardDescription className="text-xs">
              Dinero real cobrado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(metrics.actualPayments.mxn, "MXN")}
            </div>
            {metrics.actualPayments.usd > 0 && (
              <div className="text-sm text-muted-foreground">
                + {formatCurrency(metrics.actualPayments.usd, "USD")}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Clock className="h-4 w-4 mr-2 text-orange-500" />
              Pendiente por Cobrar
            </CardTitle>
            <CardDescription className="text-xs">
              De cotizaciones activas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(metrics.pendingCollections.mxn, "MXN")}
            </div>
            {metrics.pendingCollections.usd > 0 && (
              <div className="text-sm text-muted-foreground">
                + {formatCurrency(metrics.pendingCollections.usd, "USD")}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              {getCollectionRateIcon(metrics.collectionRate)}
              <span className="ml-2">Tasa de Cobranza</span>
            </CardTitle>
            <CardDescription className="text-xs">
              % de dinero ya cobrado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getCollectionRateColor(metrics.collectionRate)}`}>
              {metrics.collectionRate.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">
              de cotizaciones activas
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Quotations Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-500" />
            Pagos de Cotizaciones Activas
          </CardTitle>
          <CardDescription>
            Pagos recibidos de cotizaciones en producción o con anticipo (flujo de efectivo real)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : payments.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cotización</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>% del Total</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.pago_id}>
                      <TableCell>
                        {formatDate(payment.fecha_pago)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{payment.folio}</div>
                        <div className="text-sm text-muted-foreground">
                          Total: {formatCurrency(payment.cotizacion_total, payment.moneda)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{payment.cliente_nombre}</div>
                      </TableCell>
                      <TableCell>
                        {getEstadoBadge(payment.cotizacion_estado)}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-emerald-600">
                          {formatCurrency(payment.monto, payment.moneda)}
                        </div>
                        {payment.moneda === 'USD' && payment.monto_mxn && (
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(payment.monto_mxn, 'MXN')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {payment.porcentaje_aplicado ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            {payment.porcentaje_aplicado.toFixed(1)}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getMetodoPagoLabel(payment.metodo_pago)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {payment.notas || '-'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {paymentsTotalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Página {paymentsPage} de {paymentsTotalPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentsPage(Math.max(1, paymentsPage - 1))}
                      disabled={paymentsPage <= 1 || paymentsLoading}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentsPage(Math.min(paymentsTotalPages, paymentsPage + 1))}
                      disabled={paymentsPage >= paymentsTotalPages || paymentsLoading}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron pagos de cotizaciones para el período seleccionado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 