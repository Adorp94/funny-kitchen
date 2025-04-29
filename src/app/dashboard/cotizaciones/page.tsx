"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { ArrowUp, ArrowDown, Eye, Filter, Plus, Search, FileText, Download, DollarSign, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CotizacionActionsButton } from '@/components/cotizacion/cotizacion-actions-button';
import { PDFService } from '@/services/pdf-service';

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
}

export default function CotizacionesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
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
  const itemsPerPage = 10; // Show 10 items per page
  
  const fetchCotizaciones = useCallback(async () => {
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
      
      // Debug log to examine the first record in detail (if it exists)
      if (data.cotizaciones && data.cotizaciones.length > 0) {
        console.log("Sample cotización data:", {
          first_record: data.cotizaciones[0],
          has_total_mxn: data.cotizaciones[0].hasOwnProperty('total_mxn'),
          total_mxn_value: data.cotizaciones[0].total_mxn,
          moneda: data.cotizaciones[0].moneda,
          total: data.cotizaciones[0].total
        });
      }
      
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
        total_mxn: cot.total_mxn
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
    fetchCotizaciones();
  }, [fetchCotizaciones]);
  
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
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };
  
  // Format currency
  const formatCurrency = (amount: number, currency: string): string => {
    return currency === 'MXN' 
      ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)
      : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };
  
  const handleViewCotizacion = (id: number) => {
    // Store ID in session storage and navigate to view page
    sessionStorage.setItem('cotizacion_id', id.toString());
    router.push('/ver-cotizacion');
  };
  
  const handleNewCotizacion = () => {
    // Clear any existing session storage data and navigate to new quote page
    sessionStorage.removeItem('cotizacion_id');
    sessionStorage.removeItem('cotizacion_cliente');
    sessionStorage.removeItem('cotizacion_productos');
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
        return <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400">Pendiente</Badge>;
      case 'producción':
        return <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400">Producción</Badge>;
      case 'rechazada':
      case 'cancelada':
        return <Badge variant="outline" className="border-red-300 text-red-700 dark:border-red-700 dark:text-red-400">{estado}</Badge>;
      case 'enviada':
        return <Badge variant="outline" className="border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-400">Enviada</Badge>;
      case 'vencida':
        return <Badge variant="secondary">Vencida</Badge>; // Use secondary for neutral/past
      default:
        return <Badge variant="secondary">{estado ? estado.charAt(0).toUpperCase() + estado.slice(1) : 'Desconocido'}</Badge>;
    }
  };
  
  const renderErrorDetails = () => {
    if (!errorDetails) return null;
    
    return (
      <div className="mb-6 p-4 border border-red-300 bg-red-50 rounded-md">
        <h3 className="text-lg font-medium text-red-800 mb-2">Error al conectar con la base de datos</h3>
        <p className="text-red-700 text-sm whitespace-pre-wrap break-words font-mono">{errorDetails}</p>
        <div className="mt-4">
          <Button 
            onClick={() => fetchCotizaciones()}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Reintentar conexión
          </Button>
        </div>
      </div>
    );
  };
  
  // Add a function to get current page items after the formatCurrency function
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredCotizaciones.slice(startIndex, endIndex);
  };
  
  return (
    <div className="flex flex-col flex-1 bg-gray-50/70 dark:bg-gray-950/50 py-6 md:py-8 gap-y-6 md:gap-y-8">
      {/* Header with title and actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100 mb-1">
             Cotizaciones
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestión de cotizaciones y pedidos
          </p>
        </div>
        
        <Button
          onClick={handleNewCotizacion}
          variant="default"
          size="sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Cotización
        </Button>
      </div>
      
      {/* Error details section */}
      {errorDetails && renderErrorDetails()}
      
      {/* Summary Cards - Adjusted styling */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {/* Total Cotizaciones */}
        <Card className="shadow-sm p-4">
          <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Cotizaciones
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl font-bold">{metrics.totalCotizaciones}</div>
          </CardContent>
        </Card>
        
        {/* Cotizaciones Pendientes */}
        <Card className="shadow-sm p-4">
          <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
               Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl font-bold">{metrics.cotizacionesPendientes}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Input
            placeholder="Buscar por folio o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-8 h-10"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          {searchTerm && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Limpiar búsqueda</span>
            </Button>
          )}
        </div>
        
        <div className="flex gap-4">
          <div className="w-full sm:w-[180px]">
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="h-10 bg-white">
                <div className="flex items-center">
                  <Filter className="mr-2 h-4 w-4 text-gray-500" />
                  <span className="truncate">
                    {filterEstado === "todos" ? "Todos los estados" : 
                     filterEstado.charAt(0).toUpperCase() + filterEstado.slice(1)}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent className="min-w-[180px] bg-white">
                <SelectItem value="todos" className="bg-white hover:bg-gray-50">Todos los estados</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="producción">Producción</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
                <SelectItem value="enviada">Enviada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {/* Table Section */}
      <section>
        {loading ? (
          // Use Card for loading state
          <Card className="shadow-sm p-6 text-center">
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <p className="text-muted-foreground text-sm">Cargando cotizaciones...</p>
          </Card>
        ) : filteredCotizaciones.length === 0 ? (
          // Use Card for empty state
          <Card className="shadow-sm p-6 text-center">
            <div className="flex flex-col items-center py-10">
              <div className="bg-muted rounded-full p-3 mb-3">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">No hay cotizaciones</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {searchTerm || filterEstado !== "todos" 
                  ? "No se encontraron cotizaciones con los filtros aplicados."
                  : "Aún no hay cotizaciones registradas."}
              </p>
              
              {(searchTerm || filterEstado !== "todos") && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterEstado("todos");
                  }}
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          </Card>
        ) : (
          // Use Card as table container
          <Card className="shadow-sm overflow-hidden"> 
            {/* Removed CardHeader - Assuming title is handled by page header */}
            {/* Removed CardContent - Table manages its own structure */}
            <Table>
              <TableHeader className="bg-muted/50"><TableRow>
                  {/* Folio */}
                  <TableHead onClick={() => handleSort('folio')} className="cursor-pointer w-[110px] sm:w-[150px]">
                    <div className="flex items-center">
                      Folio
                      {sortBy.field === 'folio' && (
                        sortBy.direction === 'asc' 
                          ? <ArrowUp className="ml-1 h-3 w-3" /> 
                          : <ArrowDown className="ml-1 h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                  {/* Fecha */}
                  <TableHead onClick={() => handleSort('fecha_creacion')} className="cursor-pointer w-[120px]">
                    <div className="flex items-center">
                      Fecha
                      {sortBy.field === 'fecha_creacion' && (
                        sortBy.direction === 'asc' 
                          ? <ArrowUp className="ml-1 h-3 w-3" /> 
                          : <ArrowDown className="ml-1 h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                   {/* Cliente */}
                  <TableHead onClick={() => handleSort('cliente')} className="cursor-pointer hidden lg:table-cell lg:w-[250px] xl:w-[300px]">
                    <div className="flex items-center">
                      Cliente
                      {sortBy.field === 'cliente' && (
                        sortBy.direction === 'asc' 
                          ? <ArrowUp className="ml-1 h-3 w-3" /> 
                          : <ArrowDown className="ml-1 h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                   {/* Estado */}
                  <TableHead className="hidden lg:table-cell w-[120px]">Estado</TableHead>
                   {/* Moneda */}
                  <TableHead className="hidden sm:table-cell w-[100px]">Moneda</TableHead>
                   {/* Total */}
                  <TableHead onClick={() => handleSort('total')} className="cursor-pointer text-right w-[120px]">
                    <div className="flex items-center justify-end">
                      Total
                      {sortBy.field === 'total' && (
                        sortBy.direction === 'asc' 
                          ? <ArrowUp className="ml-1 h-3 w-3" /> 
                          : <ArrowDown className="ml-1 h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                   {/* Acciones */}
                  <TableHead className="text-right w-[150px] sm:w-[180px]">Acciones</TableHead>
                </TableRow></TableHeader>
              <TableBody>
                {getCurrentPageItems().map((cotizacion) => (
                  <TableRow key={cotizacion.cotizacion_id} className="hover:bg-muted/50">
                    {/* Use TableCell component */} 
                    <TableCell>
                      <button 
                        onClick={() => router.push(`/dashboard/cotizaciones/${cotizacion.cotizacion_id}`)}
                        className="font-medium text-primary hover:underline"
                      >
                        {cotizacion.folio}
                      </button>
                      {/* Mobile only info */} 
                      <div className="lg:hidden text-xs text-muted-foreground mt-1">
                        {cotizacion.cliente.nombre}
                      </div>
                      <div className="lg:hidden text-xs mt-0.5">
                        {getStatusBadge(cotizacion.estado)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm"> {/* Apply text size */} 
                      {formatDate(cotizacion.fecha_creacion)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div>
                        <div className="font-medium line-clamp-2 break-words max-w-[250px] xl:max-w-[350px]" title={cotizacion.cliente.nombre}>
                          {cotizacion.cliente.nombre}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[250px] xl:max-w-[350px]" title={cotizacion.cliente.celular}>
                          {cotizacion.cliente.celular || '—'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {getStatusBadge(cotizacion.estado)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {/* Replaced Badge variant */}
                      <Badge variant="secondary"> 
                        {cotizacion.moneda}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-medium text-foreground">{formatCurrency(cotizacion.total, cotizacion.moneda)}</span>
                        {/* Mobile only info */} 
                        <div className="sm:hidden text-xs text-muted-foreground mt-1">
                          {cotizacion.moneda}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-2">
                        <CotizacionActionsButton 
                          cotizacion={cotizacion}
                          onStatusChanged={fetchCotizaciones}
                          // Pass size="sm" or similar if needed for consistency
                        />
                        {/* Adjusted PDF button style */}
                        <Button
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8" 
                          onClick={async () => {
                            // ... PDF generation logic ...
                          }}
                          title="Descargar PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Pagination Controls - Placed inside CardFooter */}
            {filteredCotizaciones.length > itemsPerPage && (
              <div className="px-6 py-4 border-t flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Mostrando {Math.min(filteredCotizaciones.length, (currentPage - 1) * itemsPerPage + 1)} 
                  - {Math.min(filteredCotizaciones.length, currentPage * itemsPerPage)} 
                  de {filteredCotizaciones.length} cotizaciones
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="h-8 px-3"
                  >
                    Anterior
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => 
                      Math.min(prev + 1, Math.ceil(filteredCotizaciones.length / itemsPerPage))
                    )}
                    disabled={currentPage >= Math.ceil(filteredCotizaciones.length / itemsPerPage)}
                    className="h-8 px-3"
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </section>
    </div>
  );
} 