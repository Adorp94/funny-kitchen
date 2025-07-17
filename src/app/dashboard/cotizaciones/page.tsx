"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  ArrowUpDown, 
  Plus, 
  Search, 
  Download, 
  Loader2, 
  X, 
  Filter,
  FileText,
  TrendingUp,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CotizacionActionsButton } from '@/components/cotizacion/cotizacion-actions-button';
import { formatCurrency } from '@/lib/utils';

interface Cotizacion {
  cotizacion_id: number;
  folio: string;
  fecha_creacion: string;
  estado: string;
  cliente: {
    nombre: string;
    celular: string;
  };
  moneda: string;
  total: number;
  total_mxn?: number;
  fecha_pago_inicial?: string;
  tiempo_estimado?: number;
  tiempo_estimado_max?: number;
}

export default function CotizacionesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [filteredCotizaciones, setFilteredCotizaciones] = useState<Cotizacion[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [sortBy, setSortBy] = useState<{field: string, direction: 'asc' | 'desc'}>({
    field: 'fecha_creacion',
    direction: 'desc'
  });
  
  // Data for metrics
  const [metrics, setMetrics] = useState({
    totalCotizaciones: 0,
    cotizacionesPendientes: 0,
    cotizacionesAceptadas: 0,
    montoTotalMXN: 0,
    montoTotalUSD: 0
  });
  
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  
  // Add state for pagination after the other state declarations
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15; // Increase items per page slightly
  
  // Add state for CSV download
  const [isDownloadingCSV, setIsDownloadingCSV] = useState(false);
  
  const fetchCotizacionesData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorDetails(null);
      console.log("Fetching cotizaciones from API...");
      
      const response = await fetch("/api/cotizaciones");
      
      if (!response.ok) {
        const errorStatus = response.status;
        let errorText = "";
        
        try {
          const errorData = await response.json();
          errorText = errorData.error || 'Unknown error';
        } catch (jsonError) {
          errorText = await response.text();
        }
        
        console.error(`API responded with status ${errorStatus}:`, errorText);
        const errorDetail = `Server error ${errorStatus}: ${errorText}`;
        setErrorDetails(errorDetail);
        throw new Error(errorDetail);
      }
      
      const data = await response.json();
      console.log("Cotizaciones received:", data);
      
      if (!data.cotizaciones || !Array.isArray(data.cotizaciones)) {
        const errorDetail = "Invalid data structure received from API";
        console.error(errorDetail, data);
        setErrorDetails(errorDetail);
        throw new Error(errorDetail);
      }
      
      // Map the data to match our Cotizacion interface
      const formattedCotizaciones: Cotizacion[] = data.cotizaciones.map((cot: any) => ({
        cotizacion_id: cot.cotizacion_id,
        folio: cot.folio,
        fecha_creacion: cot.fecha_creacion,
        estado: cot.estado,
        cliente: cot.cliente,
        moneda: cot.moneda,
        total: cot.total,
        total_mxn: cot.total_mxn,
        fecha_pago_inicial: cot.fecha_pago_inicial,
        tiempo_estimado: cot.tiempo_estimado,
        tiempo_estimado_max: cot.tiempo_estimado_max
      }));
      
      setCotizaciones(formattedCotizaciones);
      setFilteredCotizaciones(formattedCotizaciones);
      
      // Calculate metrics
      const totalCotizaciones = formattedCotizaciones.length;
      const cotizacionesPendientes = formattedCotizaciones.filter(c => c.estado === 'pendiente').length;
      const cotizacionesAceptadas = formattedCotizaciones.filter(c => c.estado === 'aceptada').length;
      
      // Calculate total amount in MXN using total_mxn field when available
      const montoTotalMXN = formattedCotizaciones.reduce((sum, c) => {
        // For MXN currency quotes that don't have total_mxn field
        if (c.moneda === 'MXN' && (c.total_mxn === null || c.total_mxn === undefined)) {
          return sum + c.total;
        }
        // For quotes with total_mxn field (either USD or MXN)
        else if (c.total_mxn !== null && c.total_mxn !== undefined) {
          return sum + Number(c.total_mxn);
        }
        // Skip quotes without proper MXN value
        return sum;
      }, 0);
      
      setMetrics({
        totalCotizaciones,
        cotizacionesPendientes,
        cotizacionesAceptadas,
        montoTotalMXN,
        montoTotalUSD: 0 // We're not using this anymore
      });
    } catch (error) {
      console.error("Error fetching quotations:", error);
      toast.error(`No se pudieron cargar las cotizaciones: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      // Set empty data to avoid UI issues
      setCotizaciones([]);
      setFilteredCotizaciones([]);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchCotizacionesData();
  }, [fetchCotizacionesData]);
  
  useEffect(() => {
    // Apply filters and sorting whenever search term, estado filter, or sort criteria changes
    let results = [...cotizaciones];
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(cotizacion => 
        (cotizacion.folio?.toLowerCase().includes(term) || false) || 
        (cotizacion.cliente?.nombre?.toLowerCase().includes(term) || false)
      );
    }
    
    // Filter by estado
    if (filterEstado !== "todos") {
      results = results.filter(cotizacion => cotizacion.estado === filterEstado);
    }
    
    // Sort the results
    results.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy.field) {
        case 'fecha_creacion':
          aValue = new Date(a.fecha_creacion || '').getTime();
          bValue = new Date(b.fecha_creacion || '').getTime();
          break;
        case 'total':
          aValue = a.total || 0;
          bValue = b.total || 0;
          break;
        case 'cliente':
          aValue = a.cliente?.nombre?.toLowerCase() || '';
          bValue = b.cliente?.nombre?.toLowerCase() || '';
          break;
        default:
          // Use a type assertion to access dynamic property
          aValue = (a as any)[sortBy.field] || '';
          bValue = (b as any)[sortBy.field] || '';
      }
      
      if (sortBy.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    setFilteredCotizaciones(results);
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [searchTerm, filterEstado, cotizaciones, sortBy]);
  
  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Intl.DateTimeFormat('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date(dateString));
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return 'Fecha inválida';
    }
  };

  // Add function to calculate delivery deadline
  const calculateDeliveryDeadline = (fechaPagoInicial: string | undefined, tiempoEstimado: number | undefined, tiempoEstimadoMax: number | undefined) => {
    if (!fechaPagoInicial) return null;
    
    // Use the maximum estimated time or tiempo_estimado_max if available, or tiempo_estimado
    const weeksToAdd = tiempoEstimadoMax || tiempoEstimado || 8;
    
    const startDate = new Date(fechaPagoInicial);
    const deliveryDate = new Date(startDate);
    deliveryDate.setDate(deliveryDate.getDate() + (weeksToAdd * 7)); // Add weeks converted to days
    
    return deliveryDate;
  };

  const formatDeliveryDate = (deadline: Date | null) => {
    if (!deadline) return '—';
    try {
      return new Intl.DateTimeFormat('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(deadline);
    } catch (error) {
      console.error("Error formatting delivery date:", deadline, error);
      return 'Fecha inválida';
    }
  };
  
  const handleViewCotizacion = (id: number) => {
    router.push(`/dashboard/cotizaciones/${id}`);
  };
  
  const handleNewCotizacion = () => {
    setIsNavigating(true);
    router.push('/nueva-cotizacion');
  };
  
  const handleSort = (field: string) => {
    if (sortBy.field === field) {
      // Toggle direction if clicking the same field
      setSortBy({
        field,
        direction: sortBy.direction === 'asc' ? 'desc' : 'asc'
      });
    } else {
      // Default to descending for new field
      setSortBy({
        field,
        direction: 'desc'
      });
    }
  };
  
  const handleDownloadCSV = async () => {
    try {
      setIsDownloadingCSV(true);
      
      // Build query parameters for filtering
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterEstado !== 'todos') params.append('estado', filterEstado);
      
      const response = await fetch(`/api/cotizaciones/export-csv?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(errorData.error || 'Error al generar el CSV');
      }
      
      // Get the filename from the response headers
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') 
        : `cotizaciones_${new Date().toISOString().split('T')[0]}.csv`;
      
      // Create and download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('CSV descargado exitosamente');
    } catch (error) {
      console.error('Error downloading CSV:', error);
      toast.error(`Error al descargar CSV: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsDownloadingCSV(false);
    }
  };
  
  // Minimal status badge component
  const getStatusBadge = (estado: string) => {
    const status = estado?.toLowerCase() || 'desconocido';
    switch (status) {
      case 'pendiente':
        return <Badge variant="secondary" className="text-xs font-normal border-0 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">Pendiente</Badge>;
      case 'producción':
        return <Badge variant="secondary" className="text-xs font-normal border-0 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Producción</Badge>;
      case 'rechazada':
      case 'cancelada':
        return <Badge variant="secondary" className="text-xs font-normal border-0 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Cancelada</Badge>;
      case 'enviada':
        return <Badge variant="secondary" className="text-xs font-normal border-0 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Enviada</Badge>;
      case 'vencida':
        return <Badge variant="secondary" className="text-xs font-normal border-0 bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300">Vencida</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs font-normal border-0 bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300">{estado ? estado.charAt(0).toUpperCase() + estado.slice(1) : 'Desconocido'}</Badge>;
    }
  };
  
  const renderErrorDetails = () => {
    if (!errorDetails) return null;
    
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="text-sm font-medium text-red-800 mb-1">Error de Conexión</div>
        <div className="text-xs text-red-600 mb-3">No se pudo conectar con la base de datos.</div>
        <Button 
          onClick={fetchCotizacionesData}
          variant="outline"
          size="sm"
          className="h-7 px-3 text-xs border-red-200 text-red-700 hover:bg-red-100"
        >
          Reintentar
        </Button>
      </div>
    );
  };
  
  // Pagination logic
  const totalPages = Math.ceil(filteredCotizaciones.length / itemsPerPage);
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredCotizaciones.slice(startIndex, endIndex);
  };
  
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };
  
  return (
    <div className="space-y-4">
      {/* Clean Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Cotizaciones
          </h1>
          <p className="text-sm text-muted-foreground">
            Administra cotizaciones y pedidos.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={handleDownloadCSV}
            variant="ghost"
            size="sm"
            disabled={isDownloadingCSV || loading}
            className="h-8 px-3 text-xs"
          >
            {isDownloadingCSV ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-3.5 w-3.5" />
            )}
            Exportar
          </Button>
          <Button
            onClick={handleNewCotizacion}
            size="sm"
            disabled={isNavigating || loading}
            className="h-8 px-3 text-xs"
          >
            {isNavigating ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="mr-1.5 h-3.5 w-3.5" />
            )}
            Nueva
          </Button>
        </div>
      </div>
      
      {/* Error details section */}
      {errorDetails && renderErrorDetails()}
      
      {/* Compact Metrics */}
      <div className="flex items-center gap-6 px-1">
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">Total</div>
          <div className="text-lg font-semibold">{metrics.totalCotizaciones}</div>
        </div>
        <Separator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">Pendientes</div>
          <div className="text-lg font-semibold">{metrics.cotizacionesPendientes}</div>
        </div>
      </div>
      
      {/* Clean Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar folio o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-9 h-8 border-0 bg-muted/50 focus-visible:bg-background transition-colors"
          />
          {searchTerm && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Limpiar</span>
            </Button>
          )}
        </div>
        
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-[140px] h-8 border-0 bg-muted/50 text-xs">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="producción">Producción</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
            <SelectItem value="enviada">Enviada</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Modern Table */}
      <div className="border border-border/50 rounded-lg bg-background/50">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/50 hover:bg-transparent">
                <TableHead 
                  onClick={() => handleSort('folio')} 
                  className="cursor-pointer h-10 px-3 text-xs font-medium text-muted-foreground"
                >
                  <div className="flex items-center gap-1">
                    Folio
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead className="h-10 px-3 text-xs font-medium text-muted-foreground hidden md:table-cell">
                  Cliente
                </TableHead>
                <TableHead className="h-10 px-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">
                  Fecha
                </TableHead>
                <TableHead className="h-10 px-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">
                  Estado
                </TableHead>
                <TableHead 
                  onClick={() => handleSort('total')} 
                  className="cursor-pointer h-10 px-3 text-xs font-medium text-muted-foreground text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    Total
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead className="h-10 px-3 text-xs font-medium text-muted-foreground text-right w-[40px]">
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : getCurrentPageItems().length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">
                    No se encontraron cotizaciones.
                  </TableCell>
                </TableRow>
              ) : (
                getCurrentPageItems().map((cotizacion) => (
                  <TableRow 
                    key={cotizacion.cotizacion_id} 
                    className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="py-3 px-3">
                      <div 
                        className="font-medium text-sm cursor-pointer hover:text-foreground text-muted-foreground transition-colors"
                        onClick={() => handleViewCotizacion(cotizacion.cotizacion_id)}
                      >
                        {cotizacion.folio || 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground md:hidden mt-0.5 truncate max-w-[120px]">
                        {cotizacion.cliente.nombre}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-3 hidden md:table-cell">
                      <div className="text-sm text-foreground font-medium truncate max-w-[200px]">
                        {cotizacion.cliente.nombre}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {cotizacion.cliente.celular || '—'}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-3 text-xs text-muted-foreground hidden sm:table-cell">
                      {formatDate(cotizacion.fecha_creacion)}
                    </TableCell>
                    <TableCell className="py-3 px-3 hidden lg:table-cell">
                      {getStatusBadge(cotizacion.estado)}
                    </TableCell>
                    <TableCell className="py-3 px-3 text-right">
                      <div className="text-sm font-medium">
                        {formatCurrency(cotizacion.total, cotizacion.moneda as 'MXN' | 'USD')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {cotizacion.moneda}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-3 text-right">
                      <CotizacionActionsButton 
                        cotizacion={cotizacion}
                        onStatusChanged={fetchCotizacionesData}
                        buttonSize="sm" 
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Clean Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
            <div className="text-xs text-muted-foreground">
              Página {currentPage} de {totalPages}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
                className="h-7 px-2 text-xs"
              >
                Anterior
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className="h-7 px-2 text-xs"
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 