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
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Ingreso {
  anticipo_id: number;
  cotizacion_id: number;
  folio: string;
  cliente_nombre: string;
  moneda: string;
  monto: number;
  monto_mxn: number;
  metodo_pago: string;
  fecha_pago: string;
  porcentaje: number;
  notas?: string;
  comprobante_url?: string;
}

interface IngresoTableProps {
  ingresos: Ingreso[];
  isLoading?: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function IngresosTable({ 
  ingresos, 
  isLoading = false, 
  page, 
  totalPages, 
  onPageChange 
}: IngresoTableProps) {
  
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
        <Table>
          <TableHeader className="bg-slate-50 border-b border-slate-200">
            <TableRow className="hover:bg-slate-50">
              <TableHead className="h-10 text-xs font-medium text-slate-500">Folio</TableHead>
              <TableHead className="h-10 text-xs font-medium text-slate-500">Cliente</TableHead>
              <TableHead className="h-10 text-xs font-medium text-slate-500">Fecha</TableHead>
              <TableHead className="h-10 text-xs font-medium text-slate-500">Monto</TableHead>
              <TableHead className="h-10 text-xs font-medium text-slate-500">Porcentaje</TableHead>
              <TableHead className="h-10 text-xs font-medium text-slate-500">Método</TableHead>
              <TableHead className="h-10 text-xs font-medium text-slate-500 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-[300px] text-center">
                  <div className="flex flex-col items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mb-3" />
                    <p className="text-sm text-slate-500">Cargando ingresos...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : ingresos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-[300px] text-center">
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="rounded-full bg-slate-50 p-3 mb-3">
                      <Eye className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-900 mb-1">No hay ingresos registrados</p>
                    <p className="text-sm text-slate-500">Usa el botón "Nuevo Ingreso" para agregar uno.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              ingresos.map((ingreso) => (
                <TableRow 
                  key={ingreso.anticipo_id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <TableCell className="py-3 font-medium text-slate-900">
                    {ingreso.folio}
                  </TableCell>
                  <TableCell className="py-3 text-slate-700">
                    {ingreso.cliente_nombre}
                  </TableCell>
                  <TableCell className="py-3 text-slate-700">
                    {formatDate(ingreso.fecha_pago)}
                  </TableCell>
                  <TableCell className="py-3 font-medium text-emerald-700">
                    {formatCurrency(ingreso.monto, ingreso.moneda)}
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">
                      {ingreso.porcentaje}%
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge className={`border ${getMetodoPagoBadgeStyle(ingreso.metodo_pago)}`}>
                      {getMetodoPagoLabel(ingreso.metodo_pago)}
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
                      {ingreso.comprobante_url && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                          title="Descargar comprobante"
                          onClick={() => window.open(ingreso.comprobante_url, '_blank')}
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