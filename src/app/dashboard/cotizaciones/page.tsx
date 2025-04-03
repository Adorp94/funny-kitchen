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
  
  // Get status badge component
  const getStatusBadge = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'pendiente':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-medium">Pendiente</Badge>;
      case 'aprobada':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">Aprobada</Badge>;
      case 'rechazada':
        return <Badge className="bg-red-50 text-red-700 border-red-200 font-medium">Rechazada</Badge>;
      case 'cerrada':
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200 font-medium">Cerrada</Badge>;
      case 'vencida':
        return <Badge className="bg-gray-50 text-gray-700 border-gray-200 font-medium">Vencida</Badge>;
      default:
        return <Badge className="bg-gray-50">{estado ? estado.charAt(0).toUpperCase() + estado.slice(1) : 'No definido'}</Badge>;
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
    <div className="py-8 px-6 sm:px-10 max-w-7xl mx-auto">
      {/* Header with title and actions */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Cotizaciones</h1>
          <p className="text-gray-500">Gestión de cotizaciones y pedidos</p>
        </div>
        
        <Button
          onClick={handleNewCotizacion}
          className="flex items-center bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white mt-4 sm:mt-0 border-0 shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          <span className="whitespace-nowrap">Nueva Cotización</span>
        </Button>
      </div>
      
      {/* Error details section */}
      {errorDetails && renderErrorDetails()}
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card className="border border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Total Cotizaciones</CardDescription>
            <CardTitle className="text-2xl">{metrics.totalCotizaciones}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card className="border border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Cotizaciones Pendientes</CardDescription>
            <CardTitle className="text-2xl text-blue-600">{metrics.cotizacionesPendientes}</CardTitle>
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
        <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-6 text-center">
          <div className="flex justify-center my-6">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
          </div>
          <p className="text-gray-500">Cargando cotizaciones...</p>
        </div>
      ) : filteredCotizaciones.length === 0 ? (
        <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-6 text-center">
          <div className="flex justify-center my-6">
            <div className="bg-gray-50 p-3 rounded-full">
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
        </div>
      ) : (
        <div className="bg-white border border-gray-100 shadow-sm rounded-xl overflow-hidden">
          <div className="p-4 px-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-medium text-gray-900">Lista de Cotizaciones</h2>
            <p className="text-sm text-gray-500">{filteredCotizaciones.length} cotizaciones</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th onClick={() => handleSort('folio')} className="cursor-pointer whitespace-nowrap text-left px-6 py-3">
                    <div className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Folio
                      {sortBy.field === 'folio' && (
                        sortBy.direction === 'asc' 
                          ? <ArrowUp className="ml-1 h-4 w-4" /> 
                          : <ArrowDown className="ml-1 h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('fecha_creacion')} className="cursor-pointer whitespace-nowrap text-left px-6 py-3">
                    <div className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                      {sortBy.field === 'fecha_creacion' && (
                        sortBy.direction === 'asc' 
                          ? <ArrowUp className="ml-1 h-4 w-4" /> 
                          : <ArrowDown className="ml-1 h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('cliente')} className="cursor-pointer whitespace-nowrap text-left px-6 py-3 hidden lg:table-cell">
                    <div className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                      {sortBy.field === 'cliente' && (
                        sortBy.direction === 'asc' 
                          ? <ArrowUp className="ml-1 h-4 w-4" /> 
                          : <ArrowDown className="ml-1 h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th className="whitespace-nowrap text-left px-6 py-3 hidden lg:table-cell">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </div>
                  </th>
                  <th className="whitespace-nowrap text-left px-6 py-3 hidden sm:table-cell">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Moneda
                    </div>
                  </th>
                  <th onClick={() => handleSort('total')} className="cursor-pointer whitespace-nowrap text-right px-6 py-3">
                    <div className="flex items-center justify-end text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                      {sortBy.field === 'total' && (
                        sortBy.direction === 'asc' 
                          ? <ArrowUp className="ml-1 h-4 w-4" /> 
                          : <ArrowDown className="ml-1 h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th className="whitespace-nowrap text-right px-6 py-3">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {getCurrentPageItems().map((cotizacion) => (
                  <tr key={cotizacion.cotizacion_id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4">
                      <button 
                        onClick={() => router.push(`/dashboard/cotizaciones/${cotizacion.cotizacion_id}`)}
                        className="font-medium text-emerald-600 hover:text-emerald-800"
                      >
                        {cotizacion.folio}
                      </button>
                      <span className="block lg:hidden text-xs text-gray-500 mt-1">
                        {cotizacion.cliente.nombre}
                      </span>
                      <span className="block lg:hidden text-xs mt-0.5">
                        {getStatusBadge(cotizacion.estado)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                      {formatDate(cotizacion.fecha_creacion)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 hidden lg:table-cell">
                      <div>
                        <div className="font-medium truncate max-w-[180px] sm:max-w-none text-gray-800">{cotizacion.cliente.nombre}</div>
                        <div className="text-sm text-gray-500 truncate max-w-[180px] sm:max-w-none">{cotizacion.cliente.celular}</div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 hidden lg:table-cell">
                      {getStatusBadge(cotizacion.estado)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 hidden sm:table-cell">
                      <Badge variant="outline" className="bg-gray-50 text-gray-700">
                        {cotizacion.moneda}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-800">{formatCurrency(cotizacion.total, cotizacion.moneda)}</span>
                        <span className="sm:hidden text-xs text-gray-500 mt-1">
                          {cotizacion.moneda}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex justify-end">
                        <CotizacionActionsButton 
                          cotizacion={cotizacion}
                          onStatusChanged={fetchCotizaciones}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {filteredCotizaciones.length > itemsPerPage && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <div className="text-sm text-gray-500">
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
        </div>
      )}
    </div>
  );
} 