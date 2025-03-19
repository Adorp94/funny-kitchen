"use client";

import { useState, useEffect } from 'react';
import { Mail, Phone, Building2, FileText, MapPin, User } from 'lucide-react';
import { FormControl, FormLabel } from '../ui/form';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import 'react-phone-number-input/style.css';
import PhoneInput from 'react-phone-number-input/input';

interface ClienteFormProps {
  clienteId?: number;
  onClienteChange?: (cliente: any) => void;
}

export function ClienteForm({ clienteId, onClienteChange }: ClienteFormProps) {
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('nuevo');
  const [formData, setFormData] = useState({
    cliente_id: '',
    nombre: '',
    celular: '',
    correo: '',
    razon_social: '',
    rfc: '',
    tipo_cliente: 'Normal',
    direccion_envio: '',
    recibe: '',
    atencion: ''
  });

  useEffect(() => {
    if (activeTab === 'existente') {
      fetchClientes();
    }
  }, [activeTab]);

  useEffect(() => {
    if (clienteId) {
      fetchCliente(clienteId);
    }
  }, [clienteId]);

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/clientes');
      const data = await res.json();
      setClientes(data);
    } catch (error) {
      console.error('Error fetching clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCliente = async (id: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clientes?id=${id}`);
      const data = await res.json();
      setFormData({
        cliente_id: data.cliente_id.toString(),
        nombre: data.nombre || '',
        celular: data.celular || '',
        correo: data.correo || '',
        razon_social: data.razon_social || '',
        rfc: data.rfc || '',
        tipo_cliente: data.tipo_cliente || 'Normal',
        direccion_envio: data.direccion_envio || '',
        recibe: data.recibe || '',
        atencion: data.atencion || ''
      });
      
      setActiveTab('existente');
      
      if (onClienteChange) {
        onClienteChange(data);
      }
    } catch (error) {
      console.error('Error fetching cliente:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value
      };
      
      if (onClienteChange) {
        onClienteChange(newData);
      }
      
      return newData;
    });
  };

  const handlePhoneChange = (value: string | undefined) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        celular: value || ''
      };
      
      if (onClienteChange) {
        onClienteChange(newData);
      }
      
      return newData;
    });
  };

  const handleClienteSelect = async (id: string) => {
    if (id) {
      await fetchCliente(parseInt(id));
    } else {
      setFormData({
        cliente_id: '',
        nombre: '',
        celular: '',
        correo: '',
        razon_social: '',
        rfc: '',
        tipo_cliente: 'Normal',
        direccion_envio: '',
        recibe: '',
        atencion: ''
      });
      
      if (onClienteChange) {
        onClienteChange(null);
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="nuevo" className="flex-1">Nuevo</TabsTrigger>
          <TabsTrigger value="existente" className="flex-1">Existente</TabsTrigger>
        </TabsList>
        
        <TabsContent value="nuevo">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nombre */}
            <FormControl>
              <FormLabel required>Nombre</FormLabel>
              <Input
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                placeholder="Ingresa el nombre del cliente"
                icon={<User className="h-4 w-4" />}
                required
              />
            </FormControl>
            
            {/* Celular */}
            <FormControl>
              <FormLabel required>Celular</FormLabel>
              <div className="flex h-10 w-full rounded-md border border-input bg-background text-sm ring-offset-background">
                <PhoneInput
                  className="flex-1 px-3 py-2 border-0 focus:outline-none focus:ring-0"
                  country="MX"
                  value={formData.celular}
                  onChange={handlePhoneChange}
                  placeholder="+52"
                  required
                />
              </div>
            </FormControl>
            
            {/* Correo */}
            <FormControl>
              <FormLabel>Correo</FormLabel>
              <Input
                type="email"
                name="correo"
                value={formData.correo}
                onChange={handleInputChange}
                placeholder="funny@ejemplo.com"
                icon={<Mail className="h-4 w-4" />}
              />
            </FormControl>
            
            {/* Tipo de cliente */}
            <FormControl>
              <FormLabel>Tipo de cliente</FormLabel>
              <Select 
                value={formData.tipo_cliente} 
                onValueChange={(value) => 
                  setFormData(prev => ({ 
                    ...prev, 
                    tipo_cliente: value,
                    ...(onClienteChange && { onClienteChange: onClienteChange({ ...prev, tipo_cliente: value }) })
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Normal / Premium / Broker" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Premium">Premium</SelectItem>
                  <SelectItem value="Normal - Broker">Normal - Broker</SelectItem>
                  <SelectItem value="Premium - Broker">Premium - Broker</SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            
            {/* Razón Social */}
            <FormControl className="col-span-1 md:col-span-2">
              <FormLabel>Razón Social</FormLabel>
              <Input
                name="razon_social"
                value={formData.razon_social}
                onChange={handleInputChange}
                placeholder="Restaurante Mexicano, S.A. de C.V."
                icon={<Building2 className="h-4 w-4" />}
              />
            </FormControl>
            
            {/* RFC */}
            <FormControl className="col-span-1 md:col-span-2">
              <FormLabel>RFC</FormLabel>
              <Input
                name="rfc"
                value={formData.rfc}
                onChange={handleInputChange}
                placeholder="RME9312158A2"
                icon={<FileText className="h-4 w-4" />}
              />
            </FormControl>
            
            {/* Dirección de envío */}
            <FormControl>
              <FormLabel>Dirección de envío</FormLabel>
              <Input
                name="direccion_envio"
                value={formData.direccion_envio}
                onChange={handleInputChange}
                placeholder="Indica la dirección"
                icon={<MapPin className="h-4 w-4" />}
              />
            </FormControl>
            
            {/* ¿Quién recibe? */}
            <FormControl>
              <FormLabel>¿Quién recibe?</FormLabel>
              <Input
                name="recibe"
                value={formData.recibe}
                onChange={handleInputChange}
                placeholder="Persona a recibir"
                icon={<User className="h-4 w-4" />}
              />
            </FormControl>
            
            {/* Atención */}
            <FormControl>
              <FormLabel>Atención</FormLabel>
              <Input
                name="atencion"
                value={formData.atencion}
                onChange={handleInputChange}
                placeholder="Dirigirme con..."
                icon={<User className="h-4 w-4" />}
              />
            </FormControl>
          </div>
        </TabsContent>
        
        <TabsContent value="existente">
          <div className="space-y-6">
            <FormControl>
              <FormLabel required>Cliente/Lead existente</FormLabel>
              <Select 
                value={formData.cliente_id} 
                onValueChange={handleClienteSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem 
                      key={cliente.cliente_id} 
                      value={cliente.cliente_id.toString()}
                    >
                      {cliente.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            
            {formData.cliente_id && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormControl>
                  <FormLabel>Nombre</FormLabel>
                  <Input
                    name="nombre"
                    value={formData.nombre}
                    readOnly
                    icon={<User className="h-4 w-4" />}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>Celular</FormLabel>
                  <Input
                    name="celular"
                    value={formData.celular}
                    readOnly
                    icon={<Phone className="h-4 w-4" />}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>Atención</FormLabel>
                  <Input
                    name="atencion"
                    value={formData.atencion}
                    onChange={handleInputChange}
                    placeholder="Dirigirme con..."
                    icon={<User className="h-4 w-4" />}
                  />
                </FormControl>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Keep the default export for backward compatibility
export default ClienteForm;