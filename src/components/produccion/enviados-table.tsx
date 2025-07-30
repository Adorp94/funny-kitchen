"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface EnviadosProduct {
  nombre: string;
  cantidad: number;
  producto_id?: number;
  fecha_envio?: string;
  cajas_chicas?: number;
  cajas_grandes?: number;
  comentarios_empaque?: string;
}

interface EnviadosTableProps {
  productos?: EnviadosProduct[]; // Make optional for defensive programming
  cotizacionId?: number; // Add cotizacionId to fetch own data
  isLoading?: boolean;
  totalCajasChicas?: number;
  totalCajasGrandes?: number;
  onUpdate?: () => void; // Add update callback
}

// Memoized enviados product row component
const EnviadosProductRow = React.memo(({ 
  producto, 
  index
}: { 
  producto: EnviadosProduct; 
  index: number;
}) => (
  <TableRow className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
    <TableCell className="px-3 py-2">
      <span className="text-xs font-medium text-gray-900">{producto.nombre}</span>
    </TableCell>
    <TableCell className="px-3 py-2 text-center">
      <Badge className="bg-blue-600 text-white text-xs">
        {producto.cantidad}
      </Badge>
    </TableCell>
    <TableCell className="px-3 py-2 text-center">
      <div className="space-y-1">
        {(producto.cajas_chicas || 0) > 0 && (
          <Badge variant="outline" className="text-xs bg-green-50 border-green-300 text-green-700 mr-1">
            {producto.cajas_chicas} CC
          </Badge>
        )}
        {(producto.cajas_grandes || 0) > 0 && (
          <Badge variant="outline" className="text-xs bg-blue-50 border-blue-300 text-blue-700">
            {producto.cajas_grandes} CG
          </Badge>
        )}
        {!producto.cajas_chicas && !producto.cajas_grandes && (
          <span className="text-xs text-gray-400">-</span>
        )}
      </div>
    </TableCell>
    <TableCell className="px-3 py-2 text-center">
      <span className="text-xs text-gray-600">{producto.fecha_envio || '-'}</span>
    </TableCell>
  </TableRow>
));

EnviadosProductRow.displayName = 'EnviadosProductRow';

export const EnviadosTable: React.FC<EnviadosTableProps> = React.memo(({ 
  productos = [], // Default to empty array for defensive programming
  cotizacionId,
  isLoading = false,
  totalCajasChicas = 0,
  totalCajasGrandes = 0,
  onUpdate
}) => {
  // Ensure productos is always an array
  const productosArray = Array.isArray(productos) ? productos : [];

  if (isLoading) {
    return (
      <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-200 bg-gray-50/50">
          <h3 className="text-xs font-medium text-gray-700">Productos Enviados</h3>
        </div>
        <div className="h-20 bg-gray-100 animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-gray-700">Productos Entregados</h3>
          <div className="flex items-center gap-2">
            {productosArray.length > 0 && (
              <Badge variant="outline" className="text-xs border-gray-300 text-gray-700">
                {productosArray.length} productos
              </Badge>
            )}
            {(totalCajasChicas > 0 || totalCajasGrandes > 0) && (
              <div className="flex items-center gap-1">
                {totalCajasChicas > 0 && (
                  <Badge variant="outline" className="text-xs bg-green-50 border-green-300 text-green-700">
                    {totalCajasChicas} CC
                  </Badge>
                )}
                {totalCajasGrandes > 0 && (
                  <Badge variant="outline" className="text-xs bg-blue-50 border-blue-300 text-blue-700">
                    {totalCajasGrandes} CG
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {productosArray.length === 0 ? (
        <div className="px-4 py-6 text-center text-gray-500">
          <div className="text-xs">No hay productos entregados para esta cotización</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50 border-b border-gray-200">
                <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 h-8">Producto</TableHead>
                <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center h-8">Cantidad</TableHead>
                <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center h-8">Cajas</TableHead>
                <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 text-center h-8">Fecha Entrega</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productosArray.map((producto, index) => (
                <EnviadosProductRow
                  key={`enviados-${producto.nombre}-${index}`}
                  producto={producto}
                  index={index}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
});

EnviadosTable.displayName = 'EnviadosTable';