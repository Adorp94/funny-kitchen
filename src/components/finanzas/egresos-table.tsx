"use client";

import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Download, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/utils/date";
import { Badge } from "@/components/ui/badge";

interface Egreso {
  egreso_id: number;
  descripcion: string;
  categoria: string;
  fecha: string;
  monto: number;
  monto_mxn: number;
  moneda: string;
  metodo_pago: string;
  comprobante_url?: string | null;
  notas?: string | null;
}

interface EgresosTableProps {
  egresos: Egreso[];
  isLoading?: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function EgresosTable({ 
  egresos, 
  isLoading = false, 
  page, 
  totalPages, 
  onPageChange 
}: EgresosTableProps) {
  
  // Translate payment method to Spanish
  const getMetodoPagoLabel = (metodo: string) => {
    const metodosMap: Record<string, string> = {
      "efectivo": "Efectivo",
      "transferencia": "Transferencia",
      "tarjeta": "Tarjeta",
      "cheque": "Cheque",
      "deposito": "Depósito"
    };
    return metodosMap[metodo] || metodo;
  };

  // Translate category to Spanish
  const getCategoriaLabel = (categoria: string) => {
    const categoriasMap: Record<string, string> = {
      "materia_prima": "Materia Prima",
      "servicios": "Servicios",
      "nominas": "Nóminas",
      "renta": "Renta/Alquiler",
      "equipo": "Equipo/Maquinaria",
      "marketing": "Marketing",
      "impuestos": "Impuestos",
      "gastos_varios": "Gastos Varios",
      "Caja chica": "Caja Chica",
      "Devoluciones": "Devoluciones",
      "Envíos": "Envíos",
      "Instalación y mantenimiento": "Instalación y Mantenimiento",
      "Pago a proveedores": "Pago a Proveedores",
    };
    return categoriasMap[categoria] || categoria;
  };

  // Get category badge style
  const getCategoriaBadgeStyle = (categoria: string) => {
    const styleMap: Record<string, string> = {
      "materia_prima": "bg-blue-100 text-blue-800 border-blue-200",
      "servicios": "bg-purple-100 text-purple-800 border-purple-200",
      "nominas": "bg-green-100 text-green-800 border-green-200",
      "renta": "bg-yellow-100 text-yellow-800 border-yellow-200",
      "equipo": "bg-indigo-100 text-indigo-800 border-indigo-200",
      "marketing": "bg-orange-100 text-orange-800 border-orange-200",
      "impuestos": "bg-red-100 text-red-800 border-red-200",
      "gastos_varios": "bg-gray-100 text-gray-800 border-gray-200",
      "Caja chica": "bg-pink-100 text-pink-800 border-pink-200",
      "Devoluciones": "bg-teal-100 text-teal-800 border-teal-200",
      "Envíos": "bg-cyan-100 text-cyan-800 border-cyan-200",
      "Instalación y mantenimiento": "bg-lime-100 text-lime-800 border-lime-200",
      "Pago a proveedores": "bg-sky-100 text-sky-800 border-sky-200",
    };
    return styleMap[categoria] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  // Get payment method badge style
  const getMetodoPagoBadgeStyle = (metodo: string) => {
    const styleMap: Record<string, string> = {
      "efectivo": "bg-green-100 text-green-800 border-green-200",
      "transferencia": "bg-blue-100 text-blue-800 border-blue-200",
      "tarjeta": "bg-purple-100 text-purple-800 border-purple-200",
      "cheque": "bg-amber-100 text-amber-800 border-amber-200",
      "deposito": "bg-indigo-100 text-indigo-800 border-indigo-200"
    };
    return styleMap[metodo] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader className="bg-slate-50 border-b border-slate-200">
            <TableRow className="hover:bg-slate-50">
              <TableHead className="h-10 text-xs font-medium text-slate-500">Descripción</TableHead>
              <TableHead className="h-10 text-xs font-medium text-slate-500">Categoría</TableHead>
              <TableHead className="h-10 text-xs font-medium text-slate-500">Fecha</TableHead>
              <TableHead className="h-10 text-xs font-medium text-slate-500">Monto</TableHead>
              <TableHead className="h-10 text-xs font-medium text-slate-500">Método</TableHead>
              <TableHead className="h-10 text-xs font-medium text-slate-500 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-[300px] text-center">
                  <div className="flex flex-col items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 text-rose-500 animate-spin mb-3" />
                    <p className="text-sm text-slate-500">Cargando egresos...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : egresos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-[300px] text-center">
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="rounded-full bg-slate-50 p-3 mb-3">
                      <Eye className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-900 mb-1">No hay egresos registrados</p>
                    <p className="text-sm text-slate-500">Usa el botón "Nuevo Egreso" para agregar uno.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              egresos.map((egreso) => (
                <TableRow 
                  key={egreso.egreso_id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <TableCell className="py-3 font-medium text-slate-900">
                    {egreso.descripcion}
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge className={`border ${getCategoriaBadgeStyle(egreso.categoria)}`}>
                      {getCategoriaLabel(egreso.categoria)}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 text-slate-700">
                    {formatDate(egreso.fecha)}
                  </TableCell>
                  <TableCell className="py-3 font-medium text-rose-700">
                    {formatCurrency(egreso.monto, egreso.moneda)}
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge variant="outline" className={getMetodoPagoBadgeStyle(egreso.metodo_pago)}>
                      {getMetodoPagoLabel(egreso.metodo_pago)}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {egreso.comprobante_url && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                          title="Descargar comprobante"
                          onClick={() => window.open(egreso.comprobante_url!, '_blank')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
          <div className="text-sm text-slate-500">
            Página {page} de {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="h-8 text-slate-700 border-slate-200 hover:bg-slate-100 focus:ring-slate-200"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="h-8 text-slate-700 border-slate-200 hover:bg-slate-100 focus:ring-slate-200"
            >
              Siguiente
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 