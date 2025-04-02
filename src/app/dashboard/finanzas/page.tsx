"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { ArrowDown, ArrowUp, DollarSign, Filter, Search, CreditCard, ShoppingBag, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { CotizacionStatusModal } from '@/components/cotizacion/cotizacion-status-modal';
import { CotizacionActionsButton } from '@/components/cotizacion/cotizacion-actions-button';
import { getAllAdvancePayments, getCotizacionDetails } from '@/app/actions/cotizacion-actions';
import { formatCurrency } from '@/lib/utils';
import { formatDate } from '@/lib/utils';

interface Pago {
  anticipo_id: number;
  cotizacion_id: number;
  monto: number;
  monto_mxn: number | null;
  moneda: string;
  metodo_pago: string;
  fecha_pago: string;
  porcentaje: number | null;
  notas: string | null;
  usuario_id: string | null;
  cotizacion: {
    folio: string;
    total: number;
  };
  cliente_nombre: string;
}

export default function FinanzasPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [filteredPagos, setFilteredPagos] = useState<Pago[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMetodoPago, setFilterMetodoPago] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<{ field: string; direction: 'asc' | 'desc' }>({
    field: 'fecha_pago',
    direction: 'desc'
  });

  // Metrics for dashboard
  const [metrics, setMetrics] = useState({
    totalPagos: 0,
    montoTotalMXN: 0,
    montoTotalUSD: 0,
    cantidadCotizaciones: 0
  });

  // For modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCotizacion, setCurrentCotizacion] = useState<any>(null);

  // Fetch pagos on mount
  useEffect(() => {
    fetchPagos();
  }, [currentPage]);

  // Filter pagos when search or filter changes
  useEffect(() => {
    applyFilters();
  }, [searchTerm, filterMetodoPago, pagos]);

  // Fetch pagos from server
  const fetchPagos = useCallback(async () => {
    setLoading(true);
    setErrorDetails(null);
    
    try {
      const result = await getAllAdvancePayments(currentPage, 10);
      
      if (result.success) {
        setPagos(result.data);
        setTotalPages(result.pagination.totalPages);
        
        // Calculate metrics
        const total = result.pagination.total;
        const montoMXN = result.data.reduce((sum, pago) => {
          // If amount is in MXN
          if (pago.moneda === 'MXN') {
            return sum + Number(pago.monto);
          }
          // If amount is in USD and has monto_mxn
          else if (pago.monto_mxn !== null) {
            return sum + Number(pago.monto_mxn);
          }
          return sum;
        }, 0);
        
        const montoUSD = result.data.reduce((sum, pago) => {
          if (pago.moneda === 'USD') {
            return sum + Number(pago.monto);
          }
          return sum;
        }, 0);
        
        // Count unique cotizaciones
        const uniqueCotizaciones = new Set(result.data.map(pago => pago.cotizacion_id)).size;
        
        setMetrics({
          totalPagos: total,
          montoTotalMXN: montoMXN,
          montoTotalUSD: montoUSD,
          cantidadCotizaciones: uniqueCotizaciones
        });
        
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudieron cargar los pagos",
          variant: "destructive"
        });
        setPagos([]);
        setErrorDetails(result.error || "Error desconocido");
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error(`Error al cargar pagos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      setPagos([]);
      setErrorDetails(error instanceof Error ? error.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [currentPage, toast]);

  // Apply filters
  const applyFilters = useCallback(() => {
    let filtered = [...pagos];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(pago => 
        pago.cliente_nombre.toLowerCase().includes(term) || 
        pago.cotizacion.folio.toLowerCase().includes(term) ||
        String(pago.monto).includes(term)
      );
    }
    
    // Apply método de pago filter
    if (filterMetodoPago) {
      filtered = filtered.filter(pago => pago.metodo_pago === filterMetodoPago);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy.field) {
        case 'fecha_pago':
          comparison = new Date(a.fecha_pago).getTime() - new Date(b.fecha_pago).getTime();
          break;
        case 'monto':
          comparison = a.monto - b.monto;
          break;
        case 'cliente':
          comparison = a.cliente_nombre.localeCompare(b.cliente_nombre);
          break;
        default:
          comparison = 0;
      }
      
      return sortBy.direction === 'asc' ? comparison : -comparison;
    });
    
    setFilteredPagos(filtered);
  }, [searchTerm, filterMetodoPago, pagos, sortBy]);

  // Handle sort change
  const handleSort = (field: string) => {
    setSortBy(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // View cotizacion details
  const handleViewCotizacion = async (cotizacionId: number) => {
    setLoading(true);
    
    try {
      const result = await getCotizacionDetails(cotizacionId);
      
      if (result.success) {
        setCurrentCotizacion(result.data);
        setIsModalOpen(true);
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo cargar la información de la cotización",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al cargar la cotización",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Payment method badge
  const getPaymentMethodBadge = (method: string) => {
    switch (method) {
      case 'efectivo':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Efectivo</Badge>;
      case 'transferencia':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Transferencia</Badge>;
      case 'tarjeta':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Tarjeta</Badge>;
      case 'cheque':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Cheque</Badge>;
      case 'deposito':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Depósito</Badge>;
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  // Error display component
  const renderErrorDetails = () => {
    if (!errorDetails) return null;
    
    return (
      <div className="mb-6 p-4 border border-red-300 bg-red-50 rounded-md">
        <h3 className="text-lg font-medium text-red-800 mb-2">Error al conectar con la base de datos</h3>
        <p className="text-red-700 text-sm whitespace-pre-wrap break-words font-mono">{errorDetails}</p>
        <div className="mt-4">
          <Button 
            onClick={() => fetchPagos()}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Reintentar conexión
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="py-8 px-6 sm:px-10 max-w-7xl mx-auto">
      {/* Header with title and actions */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Finanzas</h1>
          <p className="text-gray-500">Gestión de pagos y anticipos</p>
        </div>
      </div>
      
      {/* Error details section */}
      {errorDetails && renderErrorDetails()}
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-gray-500" />
              Total Pagos
            </CardDescription>
            <CardTitle className="text-2xl">{metrics.totalPagos}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-500" />
              Cotizaciones con Anticipos
            </CardDescription>
            <CardTitle className="text-2xl text-blue-600">{metrics.cantidadCotizaciones}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-500" />
              Monto Total (MXN)
            </CardDescription>
            <CardTitle className="text-2xl text-emerald-600">{formatCurrency(metrics.montoTotalMXN, 'MXN')}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-500" />
              Monto Total (USD)
            </CardDescription>
            <CardTitle className="text-2xl text-emerald-600">{formatCurrency(metrics.montoTotalUSD, 'USD')}</CardTitle>
          </CardHeader>
        </Card>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-lg border shadow-sm p-4 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por cliente o folio..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="w-full md:w-48">
            <Select 
              value={filterMetodoPago || "todos"}
              onValueChange={(value) => setFilterMetodoPago(value === "todos" ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Método de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="transferencia">Transferencia</SelectItem>
                <SelectItem value="tarjeta">Tarjeta</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="deposito">Depósito</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Table */}
        <ResponsiveTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('fecha_pago')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Fecha</span>
                    {sortBy.field === 'fecha_pago' && (
                      sortBy.direction === 'asc' 
                        ? <ArrowUp className="h-3 w-3" /> 
                        : <ArrowDown className="h-3 w-3" />
                    )}
                  </div>
                </TableHead>
                <TableHead>Cotización</TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort('cliente')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Cliente</span>
                    {sortBy.field === 'cliente' && (
                      sortBy.direction === 'asc' 
                        ? <ArrowUp className="h-3 w-3" /> 
                        : <ArrowDown className="h-3 w-3" />
                    )}
                  </div>
                </TableHead>
                <TableHead>Método</TableHead>
                <TableHead
                  className="cursor-pointer text-right"
                  onClick={() => handleSort('monto')}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Monto</span>
                    {sortBy.field === 'monto' && (
                      sortBy.direction === 'asc' 
                        ? <ArrowUp className="h-3 w-3" /> 
                        : <ArrowDown className="h-3 w-3" />
                    )}
                  </div>
                </TableHead>
                <TableHead>Porcentaje</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex justify-center items-center">
                      <span className="h-6 w-6 animate-spin rounded-full border-b-2 border-emerald-600"></span>
                      <span className="ml-2">Cargando pagos...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredPagos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                    No se encontraron pagos
                  </TableCell>
                </TableRow>
              ) : (
                filteredPagos.map((pago) => (
                  <TableRow key={pago.anticipo_id} className="hover:bg-gray-50">
                    <TableCell className="whitespace-nowrap">
                      {formatDate(pago.fecha_pago)}
                    </TableCell>
                    <TableCell className="font-medium text-emerald-600 whitespace-nowrap">
                      {pago.cotizacion.folio}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium truncate max-w-[120px] sm:max-w-none">
                        {pago.cliente_nombre}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {getPaymentMethodBadge(pago.metodo_pago)}
                    </TableCell>
                    <TableCell className="font-medium text-right whitespace-nowrap">
                      {formatCurrency(pago.monto, pago.moneda)}
                      {pago.monto_mxn && pago.moneda === 'USD' && (
                        <div className="text-xs text-gray-500">
                          ({formatCurrency(pago.monto_mxn, 'MXN')})
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      {pago.porcentaje ? `${pago.porcentaje}%` : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleViewCotizacion(pago.cotizacion_id)}
                        className="h-8 px-2"
                      >
                        <FileText className="h-4 w-4" />
                        <span className="sr-only md:not-sr-only md:ml-2">Ver</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ResponsiveTable>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 border-t pt-4">
            <div className="text-sm text-gray-500">
              Página {currentPage} de {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || loading}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || loading}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Cotizacion Status Modal */}
      <CotizacionStatusModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        cotizacion={currentCotizacion}
        onStatusChange={async (id, newStatus, paymentData) => {
          const result = await fetch(`/api/cotizaciones/${id}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newStatus, paymentData })
          });
          
          if (result.ok) {
            fetchPagos();
            return true;
          }
          return false;
        }}
      />
    </div>
  );
} 