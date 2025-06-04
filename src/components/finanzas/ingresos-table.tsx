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
import { Eye, Download, ArrowLeft, ArrowRight, Loader2, FileText, FileInput, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/utils/date";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { toast } from "sonner";

interface Ingreso {
  pago_id: number;
  tipo_ingreso: 'cotizacion' | 'otro';
  descripcion?: string | null;
  cotizacion_id?: number | null;
  folio?: string | null;
  cliente_nombre?: string | null;
  moneda: string;
  monto: number;
  monto_mxn: number;
  metodo_pago: string;
  fecha_pago: string;
  porcentaje?: number | null;
  notas?: string | null;
  comprobante_url?: string | null;
}

interface IngresoTableProps {
  ingresos?: Ingreso[];
  isLoading?: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onDelete?: (pagoId: number) => Promise<void>;
}

export function IngresosTable({ 
  ingresos = [],
  isLoading = false, 
  page, 
  totalPages, 
  onPageChange,
  onDelete
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

  const handleDelete = async (pagoId: number, descripcion?: string) => {
    if (!onDelete) return;
    
    // Create a confirmation toast
    toast.custom((t) => (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-md">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900">
              Confirmar eliminación
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              ¿Estás seguro de que quieres eliminar {descripcion ? `"${descripcion}"` : 'este ingreso'}? Esta acción no se puede deshacer.
            </p>
            <div className="flex space-x-2 mt-3">
              <button
                onClick={() => {
                  toast.dismiss(t);
                  toast.promise(onDelete(pagoId), {
                    loading: 'Eliminando ingreso...',
                    success: 'Ingreso eliminado correctamente',
                    error: 'Error al eliminar el ingreso'
                  });
                }}
                className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
              >
                Eliminar
              </button>
              <button
                onClick={() => toast.dismiss(t)}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    ), {
      duration: Infinity,
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader className="bg-slate-50 border-b border-slate-200">
            <TableRow className="hover:bg-slate-50">
              <TableHead className="h-10 text-xs font-medium text-slate-500 w-[100px]">Tipo</TableHead>
              <TableHead className="h-10 text-xs font-medium text-slate-500">Detalle</TableHead>
              <TableHead className="h-10 text-xs font-medium text-slate-500 w-[120px]">Fecha</TableHead>
              <TableHead className="h-10 text-xs font-medium text-slate-500 w-[150px] text-right">Monto</TableHead>
              <TableHead className="h-10 text-xs font-medium text-slate-500 w-[140px]">Método</TableHead>
              <TableHead className="h-10 text-xs font-medium text-slate-500 w-[120px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-[300px] text-center">
                  <div className="flex flex-col items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mb-3" />
                    <p className="text-sm text-slate-500">Cargando ingresos...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : !Array.isArray(ingresos) || ingresos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-[300px] text-center">
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="rounded-full bg-slate-50 p-3 mb-3">
                      <FileText className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-900 mb-1">No hay ingresos registrados</p>
                    <p className="text-sm text-slate-500">Usa el botón "Nuevo Ingreso" para agregar uno.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              ingresos.map((ingreso, index) => { 
                if (!ingreso) {
                  console.warn("[IngresosTable] Skipping rendering of null/undefined ingreso item.");
                  return null;
                }
                return (
                  <TableRow 
                    key={ingreso.pago_id || index}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <TableCell className="py-3 font-medium text-slate-900">
                      {ingreso.tipo_ingreso === 'cotizacion' ? (
                        <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                          Cotización
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                          Otro Ingreso
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-slate-700">
                      {ingreso.tipo_ingreso === 'cotizacion' ? (
                        <div className="flex flex-col">
                          {ingreso.folio && ingreso.cotizacion_id ? (
                            <Link href={`/dashboard/cotizaciones/${ingreso.cotizacion_id}/edit`} className="font-medium text-primary hover:underline">
                              {ingreso.folio}
                            </Link>
                          ) : (
                            <span className="font-medium text-muted-foreground italic">Folio no disponible</span>
                          )}
                          <span className="text-xs text-muted-foreground">{ingreso.cliente_nombre || 'Cliente no especificado'}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-800 font-medium">{ingreso.descripcion || 'Sin descripción'}</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-slate-700">
                      {formatDate(ingreso.fecha_pago)}
                    </TableCell>
                    <TableCell className="py-3 font-medium text-emerald-700 text-right">
                      {formatCurrency(ingreso.monto, ingreso.moneda)}
                      {ingreso.moneda === 'USD' && ingreso.monto_mxn && (
                        <span className="block text-xs text-muted-foreground">({formatCurrency(ingreso.monto_mxn, 'MXN')})</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge className={`border ${getMetodoPagoBadgeStyle(ingreso.metodo_pago)}`}>
                        {getMetodoPagoLabel(ingreso.metodo_pago)}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                          title="Ver detalles (próximamente)"
                          disabled
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {ingreso.comprobante_url && (
                          <Button 
                            asChild
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                            title="Descargar comprobante"
                          >
                            <a href={ingreso.comprobante_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {onDelete && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Eliminar ingreso"
                            onClick={() => handleDelete(ingreso.pago_id, ingreso.descripcion)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      
      {!isLoading && Array.isArray(ingresos) && totalPages > 1 && (
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