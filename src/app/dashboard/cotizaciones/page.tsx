"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { ArrowLeft, Eye, Filter, Home, Pencil, Plus, Search } from "lucide-react";
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
    // Apply filters whenever search term or estado filter changes
    let results = cotizaciones;
    
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
    
    setFilteredCotizaciones(results);
  }, [searchTerm, filterEstado, cotizaciones]);
  
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
  
  return (
    <div className="py-8 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => router.push('/')}
          className="flex items-center"
        >
          <Home className="mr-2 h-4 w-4" />
          Inicio
        </Button>
        
        <h1 className="text-2xl font-bold">Cotizaciones</h1>
        
        <Button
          onClick={handleNewCotizacion}
          className="flex items-center bg-teal-600 hover:bg-teal-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Cotización
        </Button>
      </div>
      
      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
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
      
      {/* Cotizaciones Table */}
      {loading ? (
        <div className="text-center py-10">
          <p>Cargando cotizaciones...</p>
        </div>
      ) : filteredCotizaciones.length === 0 ? (
        <div className="text-center py-10 border rounded-lg">
          <p className="text-gray-500">No se encontraron cotizaciones</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCotizaciones.map((cotizacion) => (
                <TableRow key={cotizacion.cotizacion_id}>
                  <TableCell className="font-medium">{cotizacion.folio}</TableCell>
                  <TableCell>{formatDate(cotizacion.fecha_creacion)}</TableCell>
                  <TableCell>
                    <div>
                      <div>{cotizacion.cliente.nombre}</div>
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
                  <TableCell>{formatCurrency(cotizacion.total, cotizacion.moneda)}</TableCell>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditCotizacion(cotizacion.cotizacion_id)}
                      className="h-8 w-8 p-0 ml-2"
                      title="Editar cotización"
                    >
                      <Pencil className="h-4 w-4" />
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