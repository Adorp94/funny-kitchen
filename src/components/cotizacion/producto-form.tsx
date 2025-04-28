import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface NewProductData {
  nombre: string;
  descripcion?: string;
  colores: string[];
  capacidad: number;
  unidad: string;
  cantidad: number;
  precio: number;
}

export interface ExistingProductData {
  producto_id: number;
  nombre: string;
  colores: string[];
  cantidad: number;
  precio_final: number;
  descuento: number;
  descripcion?: string;
  acabado?: string;
}

interface ProductoFormProps {
  onSubmit: (data: NewProductData) => void;
  onCancel: () => void;
  initialData?: NewProductData;
  existingProducts?: any[];
}

export default function ProductoForm({ onSubmit, onCancel, initialData, existingProducts }: ProductoFormProps) {
  const [formData, setFormData] = useState<NewProductData>(
    initialData || {
      nombre: '',
      descripcion: '',
      colores: [],
      capacidad: 0,
      unidad: 'ml',
      cantidad: 1,
      precio: 0,
    }
  );

  const [selectedColores, setSelectedColores] = useState<string>(formData.colores?.join(', ') || '');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    if (name === 'colores') {
      setSelectedColores(value);
      setFormData(prev => ({
        ...prev,
        colores: value.split(',').map(c => c.trim()).filter(Boolean)
      }));
    } else {
      const val = name === 'cantidad' || name === 'precio' || name === 'capacidad' 
        ? Number(value) 
        : value;
      
      setFormData((prev) => ({
        ...prev,
        [name]: val,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      colores: selectedColores.split(',').map(c => c.trim()).filter(Boolean)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="nombre">Nombre del producto</Label>
        <Input
          id="nombre"
          name="nombre"
          value={formData.nombre}
          onChange={handleChange}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="descripcion">Descripción</Label>
        <textarea
          id="descripcion"
          name="descripcion"
          value={formData.descripcion}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-input rounded-md focus:outline-hidden focus:ring-2 focus:ring-ring"
          rows={3}
        />
      </div>
      
      <div>
        <Label htmlFor="colores">Colores (separados por coma)</Label>
        <Input
          id="colores"
          name="colores"
          value={selectedColores}
          onChange={handleChange}
          placeholder="Ej: Rojo, Azul, Verde"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="capacidad">Capacidad</Label>
          <Input
            id="capacidad"
            name="capacidad"
            type="number"
            min="0"
            value={formData.capacidad}
            onChange={handleChange}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="unidad">Unidad</Label>
          <Select 
            name="unidad" 
            value={formData.unidad}
            onValueChange={(value) => setFormData(prev => ({ ...prev, unidad: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar unidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ml">ml</SelectItem>
              <SelectItem value="oz">oz</SelectItem>
              <SelectItem value="lt">lt</SelectItem>
              <SelectItem value="gal">gal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="cantidad">Cantidad</Label>
          <Input
            id="cantidad"
            name="cantidad"
            type="number"
            min="1"
            value={formData.cantidad}
            onChange={handleChange}
            required
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="precio">Precio unitario</Label>
        <Input
          id="precio"
          name="precio"
          type="number"
          min="0"
          step="0.01"
          value={formData.precio}
          onChange={handleChange}
          required
        />
      </div>
      
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          {initialData ? 'Actualizar Producto' : 'Agregar Producto'}
        </Button>
      </div>
    </form>
  );
}