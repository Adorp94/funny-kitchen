"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Trash2, ArrowLeft, RefreshCw, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from "sonner";
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';

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

export default function SafeDeleteCotizacionPage() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [manualId, setManualId] = useState('');
  const [deleteResult, setDeleteResult] = useState<any>(null);

  // Fetch cotizaciones list
  const fetchCotizaciones = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/cotizaciones');
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.cotizaciones && Array.isArray(data.cotizaciones)) {
        setCotizaciones(data.cotizaciones);
      } else {
        throw new Error('Invalid data structure received');
      }
    } catch (error) {
      console.error('Error fetching cotizaciones:', error);
      toast.error('Error al cargar cotizaciones', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Safe delete function
  const handleSafeDelete = async (cotizacionId: number, folio: string) => {
    // Confirmation dialog
    const confirmed = window.confirm(
      `⚠️ ELIMINACIÓN SEGURA ⚠️\n\n` +
      `¿Estás seguro de que deseas eliminar PERMANENTEMENTE la cotización:\n\n` +
      `• ID: ${cotizacionId}\n` +
      `• Folio: ${folio}\n\n` +
      `Esta acción:\n` +
      `✓ Eliminará todos los productos relacionados\n` +
      `✓ Eliminará todo el historial\n` +
      `✓ Eliminará todos los pagos asociados\n` +
      `✓ Eliminará la cotización completa\n` +
      `✓ Reiniciará las secuencias de la base de datos\n\n` +
      `Esta acción NO SE PUEDE DESHACER.\n\n` +
      `Escriba "CONFIRMAR" para continuar:`
    );

    if (!confirmed) return;

    const finalConfirm = window.prompt(
      `Por favor, escriba "CONFIRMAR" para proceder con la eliminación segura de la cotización ${folio}:`
    );

    if (finalConfirm !== "CONFIRMAR") {
      toast.error("Eliminación cancelada", {
        description: "Debe escribir exactamente 'CONFIRMAR' para proceder"
      });
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteResult(null);

      console.log(`[Safe Delete] Starting deletion process for cotización ID: ${cotizacionId}`);

      const response = await fetch('/api/testing/delete-cotizacion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cotizacion_id: cotizacionId.toString()
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setDeleteResult({
          success: true,
          message: result.message,
          cotizacionId,
          folio
        });

        toast.success('Cotización eliminada exitosamente', {
          description: `${folio} y todos sus datos relacionados han sido eliminados`,
          duration: 5000
        });

        // Refresh the list
        await fetchCotizaciones();
        setManualId(''); // Clear manual ID if it was used

      } else {
        throw new Error(result.error || 'Error desconocido en la eliminación');
      }

    } catch (error) {
      console.error('Error in safe delete:', error);
      
      setDeleteResult({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        cotizacionId,
        folio
      });

      toast.error('Error al eliminar cotización', {
        description: error instanceof Error ? error.message : 'Error desconocido',
        duration: 5000
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle manual ID deletion
  const handleManualDelete = () => {
    const id = parseInt(manualId.trim());
    if (isNaN(id) || id <= 0) {
      toast.error('ID inválido', {
        description: 'Por favor, ingrese un ID de cotización válido'
      });
      return;
    }

    // Check if this ID exists in our list
    const existingCotizacion = cotizaciones.find(c => c.cotizacion_id === id);
    const folio = existingCotizacion ? existingCotizacion.folio : `ID-${id}`;

    handleSafeDelete(id, folio);
  };

  useEffect(() => {
    fetchCotizaciones();
  }, []);

  const getStatusBadgeColor = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'aprobada': return 'bg-green-100 text-green-800';
      case 'rechazada': return 'bg-red-100 text-red-800';
      case 'cancelada': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link href="/testing">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Testing
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-red-600 flex items-center">
              <AlertTriangle className="h-6 w-6 mr-2" />
              Eliminación Segura de Cotizaciones
            </h1>
            <p className="text-sm text-muted-foreground">
              Herramienta avanzada para eliminar cotizaciones de forma segura con limpieza completa de datos
            </p>
          </div>
        </div>
        <Button 
          onClick={fetchCotizaciones} 
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar Lista
        </Button>
      </div>

      {/* Warning Banner */}
      <Card className="mb-6 border-red-200 bg-red-50">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <CardTitle className="text-red-800">⚠️ ZONA DE PELIGRO - ELIMINACIÓN PERMANENTE</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-sm text-red-700 space-y-2">
            <p><strong>Esta herramienta realiza eliminación COMPLETA y PERMANENTE:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Elimina todos los productos de la cotización</li>
              <li>Elimina todo el historial de cambios</li>
              <li>Elimina todos los pagos asociados</li>
              <li>Elimina la cotización principal</li>
              <li>Reinicia las secuencias de la base de datos</li>
            </ul>
            <p className="font-semibold">⚠️ Esta acción NO SE PUEDE DESHACER ⚠️</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Manual ID Input */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Eliminación por ID</CardTitle>
            <CardDescription>
              Ingrese manualmente el ID de la cotización a eliminar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">ID de Cotización</label>
              <Input
                type="number"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                placeholder="Ej: 123"
                min="1"
                disabled={isDeleting}
              />
            </div>
            <Button
              onClick={handleManualDelete}
              disabled={!manualId.trim() || isDeleting}
              variant="destructive"
              className="w-full"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar por ID
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Result Display */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Resultado de la Operación</CardTitle>
          </CardHeader>
          <CardContent>
            {deleteResult ? (
              <div className={`p-4 rounded-lg border ${
                deleteResult.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start space-x-3">
                  {deleteResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h4 className={`font-semibold ${
                      deleteResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {deleteResult.success ? 'Eliminación Exitosa' : 'Error en Eliminación'}
                    </h4>
                    <p className={`text-sm mt-1 ${
                      deleteResult.success ? 'text-green-700' : 'text-red-700'
                    }`}>
                      <strong>Cotización:</strong> {deleteResult.folio} (ID: {deleteResult.cotizacionId})
                    </p>
                    <p className={`text-sm mt-1 ${
                      deleteResult.success ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {deleteResult.success ? deleteResult.message : deleteResult.error}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Los resultados de la eliminación aparecerán aquí</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator className="my-6" />

      {/* Cotizaciones List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lista de Cotizaciones Disponibles</CardTitle>
          <CardDescription>
            Seleccione una cotización de la lista para eliminarla de forma segura
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">Cargando cotizaciones...</p>
            </div>
          ) : cotizaciones.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No se encontraron cotizaciones</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Folio</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-center">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cotizaciones.map((cotizacion) => (
                    <TableRow key={cotizacion.cotizacion_id}>
                      <TableCell className="font-mono text-sm">
                        {cotizacion.cotizacion_id}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {cotizacion.folio}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{cotizacion.cliente.nombre}</p>
                          <p className="text-xs text-muted-foreground">{cotizacion.cliente.celular}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(cotizacion.fecha_creacion)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(cotizacion.estado)}>
                          {cotizacion.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {formatCurrency(cotizacion.total, cotizacion.moneda)}
                          </p>
                          {cotizacion.total_mxn && cotizacion.moneda !== 'MXN' && (
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(cotizacion.total_mxn, 'MXN')}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          onClick={() => handleSafeDelete(cotizacion.cotizacion_id, cotizacion.folio)}
                          disabled={isDeleting}
                          variant="destructive"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 