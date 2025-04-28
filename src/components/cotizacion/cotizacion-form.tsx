"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock } from 'lucide-react';
import { FormControl, FormLabel } from '../ui/form';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { generateCotizacionId } from '@/lib/utils';
import ClienteForm from './cliente-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface CotizacionFormProps {
  cotizacionId?: number;
}

export default function CotizacionForm({ cotizacionId }: CotizacionFormProps) {
  const router = useRouter();
  const [nextId, setNextId] = useState<number>(0);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    fecha_cotizacion: new Date().toISOString().split('T')[0],
    vendedor_id: '',
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      
      try {
        // Fetch next cotizacion ID
        const idRes = await fetch('/api/cotizaciones/next-id');
        const idData = await idRes.json();
        setNextId(idData.nextId);
        
        // Fetch vendedores
        const vendedoresRes = await fetch('/api/vendedores');
        const vendedoresData = await vendedoresRes.json();
        setVendedores(vendedoresData);
        
        // Set default vendedor based on user (in a real app, this would be based on auth)
        if (vendedoresData.length > 0) {
          // Default to first vendedor or user's vendedor
          setFormData(prev => ({
            ...prev,
            vendedor_id: vendedoresData[0].vendedor_id.toString()
          }));
        }
        
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialData();
  }, []);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold mb-4">
          Cotización - {generateCotizacionId(nextId)}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Fecha cotización */}
          <FormControl>
            <FormLabel required>Fecha cotización</FormLabel>
            <Input
              type="date"
              name="fecha_cotizacion"
              value={formData.fecha_cotizacion}
              onChange={handleInputChange}
              icon={<Calendar className="h-4 w-4" />}
              required
            />
          </FormControl>
          
          {/* Vendedor */}
          <FormControl>
            <FormLabel required>Vendedor</FormLabel>
            <Select 
              name="vendedor_id" 
              value={formData.vendedor_id}
              onValueChange={(value) => 
                setFormData(prev => ({ ...prev, vendedor_id: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el vendedor" />
              </SelectTrigger>
              <SelectContent>
                {vendedores.map((vendedor) => (
                  <SelectItem 
                    key={vendedor.vendedor_id} 
                    value={vendedor.vendedor_id.toString()}
                  >
                    {`${vendedor.nombre} ${vendedor.apellidos}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
        </div>
      </div>
      
      {/* Cliente Form */}
      <ClienteForm />
    </div>
  );
}