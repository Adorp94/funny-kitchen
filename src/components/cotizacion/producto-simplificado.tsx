"use client";

import { useState } from 'react';
import { Plus, Package, DollarSign, Hash, AlertCircle } from 'lucide-react';
import { FormControl, FormLabel } from '../ui/form';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

export interface Producto {
  id: string;
  nombre: string;
  cantidad: number;
  precio: number;
  subtotal: number;
  producto_id?: number | null;
}

interface ProductoFormErrors {
  nombre?: string;
  cantidad?: string;
  precio?: string;
}

interface ProductoFormProps {
  onAddProduct: (producto: Producto) => void;
}

export function ProductoSimplificado({ onAddProduct }: ProductoFormProps) {
  const [producto, setProducto] = useState<Omit<Producto, 'id' | 'subtotal'>>({
    nombre: '',
    cantidad: 1,
    precio: 0
  });
  
  const [errors, setErrors] = useState<ProductoFormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateForm = (): ProductoFormErrors => {
    const newErrors: ProductoFormErrors = {};
    
    if (!producto.nombre.trim()) {
      newErrors.nombre = "El nombre es obligatorio";
    }
    
    if (!producto.cantidad || producto.cantidad < 1) {
      newErrors.cantidad = "La cantidad debe ser mayor a 0";
    }
    
    if (!producto.precio || producto.precio <= 0) {
      newErrors.precio = "El precio debe ser mayor a 0";
    }
    
    return newErrors;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let parsedValue: string | number = value;
    
    // Convert to number for number fields
    if (name === 'cantidad' || name === 'precio') {
      parsedValue = value === '' ? 0 : parseFloat(value);
    }
    
    setProducto(prev => ({
      ...prev,
      [name]: parsedValue
    }));
    
    // Mark as touched
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));
    
    // Validate the form on blur
    setErrors(validateForm());
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate form
    const formErrors = validateForm();
    setErrors(formErrors);
    
    // Mark all fields as touched
    setTouched({
      nombre: true,
      cantidad: true,
      precio: true
    });
    
    if (Object.keys(formErrors).length === 0) {
      // Create new product with ID and subtotal
      const newProduct: Producto = {
        id: Date.now().toString(), // Simple ID generation
        nombre: producto.nombre,
        cantidad: producto.cantidad,
        precio: producto.precio,
        subtotal: producto.cantidad * producto.precio
      };
      
      // Call onAddProduct callback
      onAddProduct(newProduct);
      
      // Reset form
      setProducto({
        nombre: '',
        cantidad: 1,
        precio: 0
      });
      
      // Reset touched state
      setTouched({});
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nombre del producto */}
        <div className="md:col-span-2">
          <FormControl>
            <FormLabel required>Nombre del producto</FormLabel>
            <Input
              name="nombre"
              value={producto.nombre}
              onChange={handleInputChange}
              onBlur={() => handleBlur('nombre')}
              placeholder="Ejemplo: Mesa de acero inoxidable"
              icon={<Package className="h-4 w-4" />}
              className={`${touched.nombre && errors.nombre ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
            />
            {touched.nombre && errors.nombre && (
              <div className="text-red-500 text-xs mt-1 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.nombre}
              </div>
            )}
          </FormControl>
        </div>
        
        {/* Cantidad */}
        <FormControl>
          <FormLabel required>Cantidad</FormLabel>
          <Input
            type="number"
            name="cantidad"
            value={producto.cantidad || ''}
            onChange={handleInputChange}
            onBlur={() => handleBlur('cantidad')}
            placeholder="1"
            icon={<Hash className="h-4 w-4" />}
            min={1}
            className={`${touched.cantidad && errors.cantidad ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
          />
          {touched.cantidad && errors.cantidad && (
            <div className="text-red-500 text-xs mt-1 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" />
              {errors.cantidad}
            </div>
          )}
        </FormControl>
        
        {/* Precio */}
        <FormControl>
          <FormLabel required>Precio unitario</FormLabel>
          <Input
            type="number"
            name="precio"
            value={producto.precio || ''}
            onChange={handleInputChange}
            onBlur={() => handleBlur('precio')}
            placeholder="0.00"
            icon={<DollarSign className="h-4 w-4" />}
            min={0}
            step={0.01}
            className={`${touched.precio && errors.precio ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
          />
          {touched.precio && errors.precio && (
            <div className="text-red-500 text-xs mt-1 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" />
              {errors.precio}
            </div>
          )}
        </FormControl>
      </div>
      
      {/* Subtotal (calculated) */}
      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
        <div>
          <span className="text-sm text-gray-500">Subtotal:</span>
          <span className="ml-2 font-medium">${(producto.cantidad * producto.precio).toFixed(2)}</span>
        </div>
        <Button 
          type="submit" 
          className="bg-teal-500 hover:bg-teal-600 text-white"
        >
          <Plus className="mr-1 h-4 w-4" />
          Agregar producto
        </Button>
      </div>
    </form>
  );
}

export default ProductoSimplificado; 