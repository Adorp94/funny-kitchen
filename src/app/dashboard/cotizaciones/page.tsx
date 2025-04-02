"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { ArrowUp, ArrowDown, Eye, Filter, Plus, Search, FileText } from "lucide-react";
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
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { CotizacionActionsButton } from '@/components/cotizacion/cotizacion-actions-button';

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
        cotizacion.folio.toLowerCase().includes(term) || 
        cotizacion.cliente.nombre.toLowerCase().includes(term)
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
          aValue = new Date(a.fecha_creacion).getTime();
          bValue = new Date(b.fecha_creacion).getTime();
          break;
        case 'total':
          aValue = a.total;
          bValue = b.total;
          break;
        case 'cliente':
          aValue = a.cliente.nombre.toLowerCase();
          bValue = b.cliente.nombre.toLowerCase();
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
  
  // Status badge styles based on estado
  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200">Pendiente</Badge>;
      case 'aceptada':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200">Aceptada</Badge>;
      case 'rechazada':
        return <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50 border-red-200">Rechazada</Badge>;
      case 'vencida':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 hover:bg-gray-50 border-gray-200">Vencida</Badge>;
      default:
        return <Badge variant="outline">{estado.charAt(0).toUpperCase() + estado.slice(1)}</Badge>;
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
  
  return (
    <div className="py-8 px-6 sm:px-10 max-w-7xl mx-auto">
      {/* Header with title and actions */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Cotizaciones</h1>
          <p className="text-gray-500">Gestión de cotizaciones y pedidos</p>
        </div>
        
        <Button
          onClick={handleNewCotizacion}
          className="flex items-center bg-emerald-600 hover:bg-emerald-700 text-white mt-4 sm:mt-0"
        >
          <Plus className="mr-2 h-4 w-4" />
          <span className="whitespace-nowrap">Nueva Cotización</span>
        </Button>
      </div>
      
      {/* Error details section */}
      {errorDetails && renderErrorDetails()}
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Cotizaciones</CardDescription>
            <CardTitle className="text-2xl">{metrics.totalCotizaciones}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cotizaciones Pendientes</CardDescription>
            <CardTitle className="text-2xl text-blue-600">{metrics.cotizacionesPendientes}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Monto Total (MXN)</CardDescription>
            <CardTitle className="text-2xl text-emerald-600">{formatCurrency(metrics.montoTotalMXN, 'MXN')}</CardTitle>
          </CardHeader>
        </Card>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Input
            placeholder="Buscar por folio o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
        </div>
        
        <div className="flex gap-4">
          <div className="w-full sm:w-[180px]">
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="h-10">
                <div className="flex items-center">
                  <Filter className="mr-2 h-4 w-4 text-gray-500" />
                  <span className="truncate">
                    {filterEstado === "todos" ? "Todos los estados" : 
                     filterEstado.charAt(0).toUpperCase() + filterEstado.slice(1)}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent className="min-w-[180px]">
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="aprobada">Aprobada</SelectItem>
                <SelectItem value="rechazada">Rechazada</SelectItem>
                <SelectItem value="cerrada">Cerrada</SelectItem>
                <SelectItem value="vencida">Vencida</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {loading ? (
        <Card className="shadow-sm">
          <CardContent className="p-6 text-center">
            <div className="flex justify-center my-6">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
            </div>
            <p className="text-gray-500">Cargando cotizaciones...</p>
          </CardContent>
        </Card>
      ) : filteredCotizaciones.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="p-6 text-center">
            <div className="flex justify-center my-6">
              <div className="bg-gray-100 p-3 rounded-full">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No hay cotizaciones</h3>
            <p className="text-gray-500">
              {searchTerm || filterEstado !== "todos" 
                ? "No se encontraron cotizaciones con los filtros aplicados"
                : "Aún no hay cotizaciones registradas"}
            </p>
            
            {(searchTerm || filterEstado !== "todos") && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  setSearchTerm("");
                  setFilterEstado("todos");
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm">
          <CardHeader className="pb-0 pt-5 px-6">
            <div className="flex items-center justify-between mb-1">
              <CardTitle>Lista de Cotizaciones</CardTitle>
              <p className="text-sm text-gray-500">{filteredCotizaciones.length} cotizaciones</p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ResponsiveTable>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead onClick={() => handleSort('folio')} className="cursor-pointer w-[90px] sm:w-auto whitespace-nowrap">
                      <div className="flex items-center">
                        Folio
                        {sortBy.field === 'folio' && (
                          sortBy.direction === 'asc' 
                            ? <ArrowUp className="ml-1 h-4 w-4" /> 
                            : <ArrowDown className="ml-1 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead onClick={() => handleSort('fecha_creacion')} className="cursor-pointer whitespace-nowrap">
                      <div className="flex items-center">
                        Fecha
                        {sortBy.field === 'fecha_creacion' && (
                          sortBy.direction === 'asc' 
                            ? <ArrowUp className="ml-1 h-4 w-4" /> 
                            : <ArrowDown className="ml-1 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead onClick={() => handleSort('cliente')} className="cursor-pointer whitespace-nowrap lg:table-cell hidden">
                      <div className="flex items-center">
                        Cliente
                        {sortBy.field === 'cliente' && (
                          sortBy.direction === 'asc' 
                            ? <ArrowUp className="ml-1 h-4 w-4" /> 
                            : <ArrowDown className="ml-1 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="whitespace-nowrap lg:table-cell hidden">Estado</TableHead>
                    <TableHead className="whitespace-nowrap sm:table-cell hidden">Moneda</TableHead>
                    <TableHead onClick={() => handleSort('total')} className="cursor-pointer text-right whitespace-nowrap">
                      <div className="flex items-center justify-end">
                        Total
                        {sortBy.field === 'total' && (
                          sortBy.direction === 'asc' 
                            ? <ArrowUp className="ml-1 h-4 w-4" /> 
                            : <ArrowDown className="ml-1 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCotizaciones.map((cotizacion) => (
                    <TableRow key={cotizacion.cotizacion_id} className="hover:bg-gray-50">
                      <TableCell className="font-medium text-emerald-600 whitespace-nowrap">
                        <div className="flex flex-col">
                          {cotizacion.folio}
                          <span className="lg:hidden text-xs text-gray-500 mt-1">
                            {cotizacion.cliente.nombre}
                          </span>
                          <span className="lg:hidden text-xs text-gray-500 mt-0.5">
                            {getStatusBadge(cotizacion.estado)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(cotizacion.fecha_creacion)}</TableCell>
                      <TableCell className="lg:table-cell hidden">
                        <div>
                          <div className="font-medium truncate max-w-[180px] sm:max-w-none">{cotizacion.cliente.nombre}</div>
                          <div className="text-sm text-gray-500 truncate max-w-[180px] sm:max-w-none">{cotizacion.cliente.celular}</div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap lg:table-cell hidden">
                        {getStatusBadge(cotizacion.estado)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap sm:table-cell hidden">
                        <Badge variant="outline" className="bg-gray-50 text-gray-700">
                          {cotizacion.moneda}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-right whitespace-nowrap">
                        <div className="flex flex-col">
                          {formatCurrency(cotizacion.total, cotizacion.moneda)}
                          <span className="sm:hidden text-xs text-gray-500 mt-1">
                            {cotizacion.moneda}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => router.push(`/dashboard/cotizaciones/${cotizacion.cotizacion_id}`)}
                            className="h-8 px-2"
                          >
                            <Eye className="h-4 w-4 text-gray-600" />
                            <span className="sr-only md:not-sr-only md:ml-2">Ver</span>
                          </Button>
                          <CotizacionActionsButton 
                            cotizacion={cotizacion}
                            onStatusChanged={fetchCotizaciones}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ResponsiveTable>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 