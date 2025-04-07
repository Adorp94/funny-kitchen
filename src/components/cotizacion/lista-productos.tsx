"use client";

import { Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Producto } from './producto-simplificado';
import { ResponsiveTable } from '../ui/responsive-table';

interface ListaProductosProps {
  productos: Producto[];
  onRemoveProduct: (id: string) => void;
  moneda?: 'MXN' | 'USD';
}

export function ListaProductos({
  productos,
  onRemoveProduct,
  moneda = 'MXN'
}: ListaProductosProps) {
  // Format currency based on selected currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: moneda,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Calculate total
  const total = productos.reduce((sum, producto) => sum + producto.subtotal, 0);

  if (productos.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
        <p className="text-gray-500">No hay productos agregados.</p>
        <p className="text-sm text-gray-400 mt-1">Agrega productos utilizando el formulario.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ResponsiveTable>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Producto</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Cant.</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Precio</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Subtotal</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {productos.map((producto) => (
              <tr key={producto.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900 max-w-[150px] sm:max-w-none">
                  <div className="truncate">{producto.nombre}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 text-center whitespace-nowrap">
                  {producto.cantidad}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 text-right whitespace-nowrap">
                  <span className="whitespace-nowrap">{formatCurrency(producto.precio)}</span>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right whitespace-nowrap">
                  <span className="whitespace-nowrap">{formatCurrency(producto.subtotal)}</span>
                </td>
                <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                  <Button
                    variant="ghost"
                    size="sm" 
                    onClick={() => onRemoveProduct(producto.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 h-auto"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Eliminar</span>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td colSpan={3} className="px-4 py-3 text-sm font-medium text-gray-900 text-right whitespace-nowrap">
                Total:
              </td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right whitespace-nowrap">
                <span className="whitespace-nowrap">{formatCurrency(total)}</span>
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </ResponsiveTable>
    </div>
  );
}

export default ListaProductos; 