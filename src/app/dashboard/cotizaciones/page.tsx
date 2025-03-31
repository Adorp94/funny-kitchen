"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { ArrowUp, ArrowDown, Eye, Filter, Plus, Search, DollarSign, Calendar, BarChart, FileText } from "lucide-react";
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
  
  const handleEditCotizacion = (id: number) => {
    // Store ID in session storage and navigate to edit page
    sessionStorage.setItem('cotizacion_id', id.toString());
    router.push('/editar-cotizacion');
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
  
  return (
    <div className="py-6 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">Dashboard de Cotizaciones</h1>
        
        <Button
          onClick={handleNewCotizacion}
          className="flex items-center bg-teal-600 hover:bg-teal-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Cotización
        </Button>
      </div>
      
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white shadow-sm rounded-lg p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Cotizaciones</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalCotizaciones}</p>
            </div>
            <div className="rounded-full p-2 bg-teal-50">
              <FileText className="h-6 w-6 text-teal-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Cotizaciones Pendientes</p>
              <p className="text-2xl font-bold text-blue-600">{metrics.cotizacionesPendientes}</p>
            </div>
            <div className="rounded-full p-2 bg-blue-50">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total MXN</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(metrics.montoTotalMXN, 'MXN')}</p>
            </div>
            <div className="rounded-full p-2 bg-green-50">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total USD</p>
              <p className="text-2xl font-bold text-indigo-600">{formatCurrency(metrics.montoTotalUSD, 'USD')}</p>
            </div>
            <div className="rounded-full p-2 bg-indigo-50">
              <DollarSign className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">Cotizaciones</h2>
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
      </div>
      
      {/* Cotizaciones Table */}
      {loading ? (
        <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-4">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Cargando cotizaciones...</p>
          </div>
        </div>
      ) : filteredCotizaciones.length === 0 ? (
        <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-4">
          <div className="text-center py-8">
            <p className="text-gray-500">No se encontraron cotizaciones</p>
            <Button 
              onClick={handleNewCotizacion}
              variant="outline" 
              className="mt-4"
            >
              <Plus className="mr-2 h-4 w-4" />
              Crear nueva cotización
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg border border-gray-100 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer"
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
                  className="cursor-pointer"
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
                  className="cursor-pointer"
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
                <TableHead>Estado</TableHead>
                <TableHead 
                  className="cursor-pointer"
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
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCotizaciones.map((cotizacion) => (
                <TableRow key={cotizacion.cotizacion_id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{cotizacion.folio}</TableCell>
                  <TableCell>{formatDate(cotizacion.fecha_creacion)}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{cotizacion.cliente.nombre}</div>
                      <div className="text-sm text-gray-500">{cotizacion.cliente.celular}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${cotizacion.estado === 'pendiente' ? 'bg-blue-100 text-blue-800' : ''}
                      ${cotizacion.estado === 'aceptada' ? 'bg-green-100 text-green-800' : ''}
                      ${cotizacion.estado === 'rechazada' ? 'bg-red-100 text-red-800' : ''}
                      ${cotizacion.estado === 'vencida' ? 'bg-gray-100 text-gray-800' : ''}
                    `}>
                      {cotizacion.estado.charAt(0).toUpperCase() + cotizacion.estado.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(cotizacion.total, cotizacion.moneda)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewCotizacion(cotizacion.cotizacion_id)}
                      className="h-8 w-8 p-0"
                      title="Ver cotización"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
} 