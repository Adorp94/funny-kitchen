"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { ArrowUp, ArrowDown, Eye, Filter, Plus, Search } from "lucide-react";
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
  
  useEffect(() => {
    const fetchCotizaciones = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/cotizaciones");
        
        if (!response.ok) {
          throw new Error("Error al obtener las cotizaciones");
        }
        
        const data = await response.json();
        
        // Map the data to match our Cotizacion interface if needed
        const formattedCotizaciones = data.cotizaciones.map((cot: any) => ({
          cotizacion_id: cot.cotizacion_id,
          folio: cot.folio,
          fecha_creacion: cot.fecha_creacion,
          estado: cot.estado,
          cliente: cot.cliente,
          moneda: cot.moneda,
          total: cot.total
        }));
        
        setCotizaciones(formattedCotizaciones);
        setFilteredCotizaciones(formattedCotizaciones);
        
        // Calculate metrics
        const totalCotizaciones = formattedCotizaciones.length;
        const cotizacionesPendientes = formattedCotizaciones.filter(c => c.estado === 'pendiente').length;
        const cotizacionesAceptadas = formattedCotizaciones.filter(c => c.estado === 'aceptada').length;
        
        // Calculate total amounts by currency
        const montoTotalMXN = formattedCotizaciones
          .filter(c => c.moneda === 'MXN')
          .reduce((sum, c) => sum + c.total, 0);
          
        const montoTotalUSD = formattedCotizaciones
          .filter(c => c.moneda === 'USD')
          .reduce((sum, c) => sum + c.total, 0);
        
        setMetrics({
          totalCotizaciones,
          cotizacionesPendientes,
          cotizacionesAceptadas,
          montoTotalMXN,
          montoTotalUSD
        });
      } catch (error) {
        console.error("Error fetching quotations:", error);
        toast.error("No se pudieron cargar las cotizaciones");
      } finally {
        setLoading(false);
      }
    };
    
    fetchCotizaciones();
  }, []);
  
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
      let aValue, bValue;
      
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
          aValue = a[sortBy.field as keyof Cotizacion];
          bValue = b[sortBy.field as keyof Cotizacion];
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
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
            <CardDescription>Total MXN</CardDescription>
            <CardTitle className="text-2xl text-emerald-600">{formatCurrency(metrics.montoTotalMXN, 'MXN')}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total USD</CardDescription>
            <CardTitle className="text-2xl text-emerald-600">{formatCurrency(metrics.montoTotalUSD, 'USD')}</CardTitle>
          </CardHeader>
        </Card>
      </div>
      
      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Buscar Cotizaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por folio o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="w-full sm:w-56 flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <Select
                value={filterEstado}
                onValueChange={setFilterEstado}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="aceptada">Aceptada</SelectItem>
                  <SelectItem value="rechazada">Rechazada</SelectItem>
                  <SelectItem value="vencida">Vencida</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Cotizaciones Table */}
      {loading ? (
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-4"></div>
              <p className="text-gray-500">Cargando cotizaciones...</p>
            </div>
          </CardContent>
        </Card>
      ) : filteredCotizaciones.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <p className="text-gray-500 mb-4">No se encontraron cotizaciones</p>
              <Button 
                onClick={handleNewCotizacion}
                variant="outline" 
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                <Plus className="mr-2 h-4 w-4" />
                <span className="whitespace-nowrap">Crear nueva cotización</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0 sm:p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-gray-50/50">
                    <TableHead 
                      className="cursor-pointer whitespace-nowrap"
                      onClick={() => handleSort('folio')}
                    >
                      <div className="flex items-center">
                        Folio
                        {sortBy.field === 'folio' && (
                          sortBy.direction === 'asc' ? 
                            <ArrowUp className="ml-1 h-3 w-3" /> : 
                            <ArrowDown className="ml-1 h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer whitespace-nowrap"
                      onClick={() => handleSort('fecha_creacion')}
                    >
                      <div className="flex items-center">
                        Fecha
                        {sortBy.field === 'fecha_creacion' && (
                          sortBy.direction === 'asc' ? 
                            <ArrowUp className="ml-1 h-3 w-3" /> : 
                            <ArrowDown className="ml-1 h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer whitespace-nowrap"
                      onClick={() => handleSort('cliente')}
                    >
                      <div className="flex items-center">
                        Cliente
                        {sortBy.field === 'cliente' && (
                          sortBy.direction === 'asc' ? 
                            <ArrowUp className="ml-1 h-3 w-3" /> : 
                            <ArrowDown className="ml-1 h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="whitespace-nowrap">Estado</TableHead>
                    <TableHead 
                      className="cursor-pointer whitespace-nowrap"
                      onClick={() => handleSort('total')}
                    >
                      <div className="flex items-center">
                        Total
                        {sortBy.field === 'total' && (
                          sortBy.direction === 'asc' ? 
                            <ArrowUp className="ml-1 h-3 w-3" /> : 
                            <ArrowDown className="ml-1 h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCotizaciones.map((cotizacion) => (
                    <TableRow key={cotizacion.cotizacion_id} className="hover:bg-gray-50">
                      <TableCell className="font-medium text-emerald-600 whitespace-nowrap">{cotizacion.folio}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(cotizacion.fecha_creacion)}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium truncate max-w-[120px] sm:max-w-none">{cotizacion.cliente.nombre}</div>
                          <div className="text-sm text-gray-500 truncate max-w-[120px] sm:max-w-none">{cotizacion.cliente.celular}</div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {getStatusBadge(cotizacion.estado)}
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        {formatCurrency(cotizacion.total, cotizacion.moneda)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewCotizacion(cotizacion.cotizacion_id)}
                          className="h-8 w-8 p-0 hover:bg-emerald-50 hover:text-emerald-700"
                          title="Ver cotización"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Ver cotización</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 