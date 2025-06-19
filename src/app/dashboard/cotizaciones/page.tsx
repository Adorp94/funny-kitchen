"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { ArrowUp, ArrowDown, Eye, Filter, Plus, Search, FileText, Download, DollarSign, Loader2, X, FileClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TableFooter
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CotizacionActionsButton } from '@/components/cotizacion/cotizacion-actions-button';
import { PDFService } from '@/services/pdf-service';
import { fetchCotizaciones } from '@/app/actions/cotizacion-actions';
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
  
  // Get status badge component - using standard variants
  const getStatusBadge = (estado: string) => {
    const status = estado?.toLowerCase() || 'desconocido';
    switch (status) {
      case 'pendiente':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700">Pendiente</Badge>;
      case 'producción':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700">Producción</Badge>;
      case 'rechazada':
      case 'cancelada':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700">{estado}</Badge>;
      case 'enviada':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700">Enviada</Badge>;
      case 'vencida':
        return <Badge variant="secondary">Vencida</Badge>; // Use secondary for neutral/past
      default:
        return <Badge variant="secondary">{estado ? estado.charAt(0).toUpperCase() + estado.slice(1) : 'Desconocido'}</Badge>;
    }
  };
  
  const renderErrorDetails = () => {
    if (!errorDetails) return null;
    
    return (
      <Card className="border-destructive/50 bg-destructive/10">
        <CardHeader>
          <CardTitle className="text-destructive">Error de Conexión</CardTitle>
          <CardDescription className="text-destructive/90">No se pudo conectar con la base de datos.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs text-destructive/80 whitespace-pre-wrap break-words font-mono bg-destructive/5 p-2 rounded">{errorDetails}</pre>
          <Button 
            onClick={fetchCotizacionesData}
            variant="destructive"
            size="sm"
            className="mt-4"
          >
            Reintentar
          </Button>
        </CardContent>
      </Card>
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
  
  const renderPagination = () => {
    return (
      <CardFooter className="flex items-center justify-between border-t px-6 py-3">
        <div className="text-xs text-muted-foreground">
          Página {currentPage} de {totalPages}
        </div>
        <div className="flex space-x-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
            className="h-7 px-2.5"
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage >= totalPages}
            className="h-7 px-2.5"
          >
            Siguiente
          </Button>
        </div>
      </CardFooter>
    );
  };
  
  // Skeleton Loader Component
  const TableSkeletonLoader = () => {
    return (
      <TableRow>
        <TableCell colSpan={8} className="h-24 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </TableCell>
      </TableRow>
    );
  };
  
  return (
    <div className="py-8 space-y-6">
      {/* Header with title and actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-600"/>
            Cotizaciones
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Administra cotizaciones y pedidos.
          </p>
        </div>
        
        <Button
          onClick={handleNewCotizacion}
          size="sm"
          disabled={isNavigating || loading}
        >
          {isNavigating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Nueva Cotización
        </Button>
      </div>
      
      {/* Error details section */}
      {errorDetails && renderErrorDetails()}
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Total Cotizaciones */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cotizaciones</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalCotizaciones}</div>
          </CardContent>
        </Card>
        
        {/* Cotizaciones Pendientes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <FileClock className="h-4 w-4 text-muted-foreground" /> 
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.cotizacionesPendientes}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar folio o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-8 h-9" // Adjusted padding and height
          />
          {searchTerm && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Limpiar</span>
            </Button>
          )}
        </div>
        
        <div className="w-full sm:w-auto">
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="h-9 w-full sm:w-[180px]">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Filtrar estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="producción">Producción</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
              <SelectItem value="enviada">Enviada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Table Section */}
      <Card>
        <CardHeader>
          {/* ... CardHeader content ... */}
        </CardHeader>
        <CardContent>
          {errorDetails ? renderErrorDetails() : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead onClick={() => handleSort('folio')} className="cursor-pointer w-[120px]">
                      <div className="flex items-center gap-1">
                        Folio / Cliente
                        {sortBy.field === 'folio' && (sortBy.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </div>
                    </TableHead>
                    <TableHead onClick={() => handleSort('fecha_creacion')} className="cursor-pointer w-[100px] hidden sm:table-cell">
                      <div className="flex items-center gap-1">
                        Fecha
                        {sortBy.field === 'fecha_creacion' && (sortBy.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </div>
                    </TableHead>
                    <TableHead onClick={() => handleSort('cliente')} className="cursor-pointer hidden md:table-cell">
                      <div className="flex items-center gap-1">
                        Cliente
                        {sortBy.field === 'cliente' && (sortBy.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </div>
                    </TableHead>
                    <TableHead className="hidden lg:table-cell w-[120px]">Estado</TableHead>
                    <TableHead className="hidden xl:table-cell w-[100px]">Fecha Anticipo</TableHead>
                    <TableHead className="hidden xl:table-cell w-[100px]">Entrega Est.</TableHead>
                    <TableHead onClick={() => handleSort('total')} className="cursor-pointer text-right w-[120px]">
                      <div className="flex items-center justify-end gap-1">
                        Total
                        {sortBy.field === 'total' && (sortBy.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </div>
                    </TableHead>
                    <TableHead className="text-right w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableSkeletonLoader />
                  ) : getCurrentPageItems().length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                        No se encontraron cotizaciones.
                      </TableCell>
                    </TableRow>
                  ) : (
                    getCurrentPageItems().map((cotizacion) => {
                      const deliveryDeadline = calculateDeliveryDeadline(
                        cotizacion.fecha_pago_inicial, 
                        cotizacion.tiempo_estimado, 
                        cotizacion.tiempo_estimado_max
                      );
                      
                      return (
                      <TableRow key={cotizacion.cotizacion_id} className="hover:bg-slate-50">
                        <TableCell className="py-2.5 px-3">
                          <div 
                            className="font-medium text-emerald-600 cursor-pointer hover:underline whitespace-nowrap"
                            onClick={() => handleViewCotizacion(cotizacion.cotizacion_id)}
                          >
                            {cotizacion.folio || 'N/A'}
                          </div>
                          <div className="text-xs text-muted-foreground md:hidden" title={cotizacion.cliente.nombre}>
                            {cotizacion.cliente.nombre}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{formatDate(cotizacion.fecha_creacion)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="font-medium truncate max-w-[200px] lg:max-w-[300px]" title={cotizacion.cliente.nombre}>{cotizacion.cliente.nombre}</div>
                          <div className="text-xs text-muted-foreground truncate">{cotizacion.cliente.celular || '—'}</div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">{getStatusBadge(cotizacion.estado)}</TableCell>
                        <TableCell className="hidden xl:table-cell text-sm">
                          {cotizacion.estado === 'producción' && cotizacion.fecha_pago_inicial ? (
                            <div className="text-xs">
                              <div className="font-medium">{formatDate(cotizacion.fecha_pago_inicial)}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-sm">
                          {cotizacion.estado === 'producción' && deliveryDeadline ? (
                            <div className="text-xs">
                              <div className="font-medium">{formatDeliveryDate(deliveryDeadline)}</div>
                              <div className="text-muted-foreground">
                                ({cotizacion.tiempo_estimado_max || cotizacion.tiempo_estimado || 8} sem)
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-medium">{formatCurrency(cotizacion.total, cotizacion.moneda as 'MXN' | 'USD')}</div>
                          <div className="text-xs text-muted-foreground">{cotizacion.moneda}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <CotizacionActionsButton 
                            cotizacion={cotizacion}
                            onStatusChanged={fetchCotizacionesData}
                            buttonSize="sm" 
                          />
                        </TableCell>
                      </TableRow>
                    )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {totalPages > 1 && renderPagination()}
      </Card>
    </div>
  );
} 