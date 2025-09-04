"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  FileText, 
  Download, 
  Plus,
  Eye,
  FileEdit,
  DollarSign,
  Pen
} from "lucide-react";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { ProtectedRoute } from "@/components/protected-route";

interface Cotizacion {
  cotizacion_id: number;
  cliente_id: number;
  vendedor_id: number;
  fecha_cotizacion: string;
  moneda: "MXN" | "USD";
  tipo_cambio: number;
  iva: number;
  tipo_cuenta: string;
  descuento_total: number;
  precio_total: number;
  tiempo_estimado: number;
  estatus: string;
  cliente_nombre: string;
  vendedor_nombre: string;
}

// Add function to detect mobile devices
const isMobileDevice = () => {
  return (
    typeof window !== 'undefined' && 
    (window.innerWidth <= 768 || 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
  );
};

function CotizacionesPageContent() {
  const router = useRouter();
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [filteredCotizaciones, setFilteredCotizaciones] = useState<Cotizacion[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  
  const itemsPerPage = 10;
  
  // Fetch cotizaciones on mount
  useEffect(() => {
    fetchCotizaciones();
  }, []);
  
  // Filter cotizaciones whenever search or status filter changes
  useEffect(() => {
    filterCotizaciones();
  }, [searchTerm, statusFilter, cotizaciones]);
  
  // Update total pages whenever filtered cotizaciones change
  useEffect(() => {
    setTotalPages(Math.ceil(filteredCotizaciones.length / itemsPerPage));
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [filteredCotizaciones]);
  
  const fetchCotizaciones = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/cotizaciones");
      const data = await response.json();
      
      // The API returns an object with a cotizaciones property
      if (data && data.cotizaciones) {
        // Map the data to include client and vendor names
        const formattedCotizaciones = data.cotizaciones.map((cotizacion: any) => ({
          ...cotizacion,
          cliente_nombre: cotizacion.clientes?.nombre || 'Cliente sin nombre',
          vendedor_nombre: cotizacion.vendedores ? 
            `${cotizacion.vendedores.nombre} ${cotizacion.vendedores.apellidos || ''}` : 
            'Vendedor sin nombre'
        }));
        setCotizaciones(formattedCotizaciones);
      } else {
        setCotizaciones([]);
      }
    } catch (error) {
      console.error("Error fetching cotizaciones:", error);
      setCotizaciones([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const filterCotizaciones = () => {
    let filtered = cotizaciones;
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(cotizacion => 
        cotizacion.cliente_nombre.toLowerCase().includes(term) || 
        cotizacion.cotizacion_id.toString().includes(term)
      );
    }
    
    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(cotizacion => cotizacion.estatus === statusFilter);
    }
    
    setFilteredCotizaciones(filtered);
  };
  
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredCotizaciones.slice(startIndex, endIndex);
  };
  
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const handleDownloadPdf = async (id: number, clientName: string) => {
    try {
      if (isMobileDevice()) {
        // For mobile devices, create an anchor element and trigger download
        const link = document.createElement('a');
        link.href = `/api/direct-pdf/${id}`;
        link.setAttribute('download', `${id}-${clientName.replace(/\s+/g, '-')}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // For desktop, open in a new tab
        window.open(`/api/direct-pdf/${id}`, '_blank');
      }
    } catch (error) {
      console.error(`Error downloading PDF for cotización ${id}:`, error);
    }
  };

  const handlePaymentClick = (id: number) => {
    // This function will need to be customized based on your app's payment flow
    // For now, it will just navigate to the cotization detail page
    router.push(`/cotizaciones/${id}?action=payment`);
  };
  
  return (
    <main className="mx-auto w-full max-w-6xl px-4 flex flex-col min-h-[calc(100vh-120px)]">
      <div className="flex justify-between items-center mb-6 md:mb-12">
        <h1 className="text-2xl md:text-4xl font-bold">Cotizaciones</h1>
        <Link 
          href="/nueva-cotizacion"
          className="inline-flex items-center justify-center rounded-md font-medium bg-teal-500 text-white hover:bg-teal-600 h-10 px-4 py-2 transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva cotización
        </Link>
      </div>
      
      <div className="bg-white rounded-lg border shadow-sm p-6 md:p-10">
        <div className="flex flex-col md:flex-row justify-between mb-6 md:gap-10 gap-4">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por cliente o ID"
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="w-full md:w-64">
            <Select 
              value={statusFilter || "all"}
              onValueChange={(value) => setStatusFilter(value === "all" ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por estatus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Pendiente">Pendiente</SelectItem>
                <SelectItem value="Producción">Producción</SelectItem>
                <SelectItem value="Cancelada">Cancelada</SelectItem>
                <SelectItem value="Enviada">Enviada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="rounded-md border overflow-auto">
          <ResponsiveTable noBorder>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14 whitespace-nowrap">ID</TableHead>
                  <TableHead className="max-w-[180px] md:max-w-[250px]">Cliente</TableHead>
                  <TableHead className="whitespace-nowrap">Fecha</TableHead>
                  <TableHead className="hidden md:table-cell">Vendedor</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Total</TableHead>
                  <TableHead className="whitespace-nowrap">Estatus</TableHead>
                  <TableHead className="text-right whitespace-nowrap w-[170px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                      </div>
                      <p className="mt-2 text-sm text-gray-500">Cargando cotizaciones...</p>
                    </TableCell>
                  </TableRow>
                ) : getCurrentPageItems().length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                      {searchTerm || statusFilter 
                        ? "No se encontraron resultados con los filtros aplicados"
                        : "No hay cotizaciones disponibles"}
                    </TableCell>
                  </TableRow>
                ) : (
                  getCurrentPageItems().map((cotizacion) => (
                    <TableRow key={cotizacion.cotizacion_id}>
                      <TableCell className="font-medium whitespace-nowrap">CT{cotizacion.cotizacion_id}</TableCell>
                      <TableCell className="max-w-[180px] md:max-w-[250px]">
                        <div className="truncate" title={cotizacion.cliente_nombre}>
                          {cotizacion.cliente_nombre}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(cotizacion.fecha_cotizacion)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="truncate">{cotizacion.vendedor_nombre}</div>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatCurrency(cotizacion.precio_total, cotizacion.moneda)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            cotizacion.estatus === 'Pendiente'
                              ? 'bg-yellow-100 text-yellow-800'
                              : cotizacion.estatus === 'Producción'
                              ? 'bg-green-100 text-green-800'
                              : cotizacion.estatus === 'Cancelada'
                              ? 'bg-red-100 text-red-800'
                              : cotizacion.estatus === 'Enviada'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {cotizacion.estatus}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/cotizaciones/${cotizacion.cotizacion_id}`)}
                            title="Ver detalle"
                            className="h-7 w-7 p-0 flex items-center justify-center"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/cotizaciones/editar/${cotizacion.cotizacion_id}`)}
                            title="Editar cotización"
                            className="h-7 w-7 p-0 flex items-center justify-center text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                          >
                            <Pen className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => handlePaymentClick(cotizacion.cotizacion_id)}
                            title="Procesar pago"
                            className="h-7 w-7 p-0 flex items-center justify-center text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
                          >
                            <DollarSign className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadPdf(cotizacion.cotizacion_id, cotizacion.cliente_nombre)}
                            title="Descargar PDF"
                            className="h-7 w-7 p-0 flex items-center justify-center"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ResponsiveTable>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-500">
              Mostrando {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, filteredCotizaciones.length)} de{" "}
              {filteredCotizaciones.length} resultados
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function CotizacionesPage() {
  return (
    <ProtectedRoute requiredModule="cotizaciones">
      <CotizacionesPageContent />
    </ProtectedRoute>
  );
}