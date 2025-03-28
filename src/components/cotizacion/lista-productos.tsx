"use client";

import { Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Producto } from './producto-simplificado';

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
    return `${amount.toFixed(2)} ${moneda === 'MXN' ? 'MXN' : 'USD'}`;
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
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cant.</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Precio</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {productos.map((producto) => (
              <tr key={producto.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">
                  {producto.nombre}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 text-center">
                  {producto.cantidad}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 text-right">
                  {formatCurrency(producto.precio)}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                  {formatCurrency(producto.subtotal)}
                </td>
                <td className="px-4 py-3 text-sm text-center">
                  <Button
                    variant="ghost"
                    size="sm" 
                    onClick={() => onRemoveProduct(producto.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 h-auto"
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
              <td colSpan={3} className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                Total:
              </td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                {formatCurrency(total)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default ListaProductos; 