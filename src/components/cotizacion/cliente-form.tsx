"use client";

import { useState, useEffect, useRef } from 'react';
import { Mail, Phone, Building2, FileText, MapPin, User, Loader2, Search, X } from 'lucide-react';
import { FormControl, FormLabel } from '../ui/form';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import 'react-phone-number-input/style.css';
import PhoneInput from 'react-phone-number-input/input';
import { supabase } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";

// Match the database schema exactly
interface Cliente {
  cliente_id: number;
  nombre: string;
  celular: string;
  correo: string | null;
  razon_social: string | null;
  rfc: string | null;
  tipo_cliente: string | null;
  lead: string | null;
  direccion_envio: string | null;
  recibe: string | null;
  atencion: string | null;
}

// Form data interface with string cliente_id for form handling
interface ClienteFormData {
  cliente_id: string;
  nombre: string;
  celular: string;
  correo: string;
  razon_social: string;
  rfc: string;
  tipo_cliente: string;
  lead: string;
  direccion_envio: string;
  recibe: string;
  atencion: string;
}

interface ClienteFormProps {
  clienteId?: number;
  onClienteChange?: (cliente: Cliente | null) => void;
}

export function ClienteForm({ clienteId, onClienteChange }: ClienteFormProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('nuevo');
  const [formData, setFormData] = useState<ClienteFormData>({
    cliente_id: '',
    nombre: '',
    celular: '',
    correo: '',
    razon_social: '',
    rfc: '',
    tipo_cliente: '',
    lead: '',
    direccion_envio: '',
    recibe: '',
    atencion: ''
  });
  
  // New state for searchable client dropdown
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
  
  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchClientes = async () => {
    setLoading(true);
    try {
      // Use Supabase client directly instead of API route
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre');
      
      if (error) {
        throw error;
      }
      
      console.log('Fetched clients from Supabase:', data);
      setClientes(data || []);
    } catch (error) {
      console.error('Error fetching clientes:', error);
      toast.error('Error al cargar los clientes');
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCliente = async (id: number) => {
    setLoading(true);
    try {
      // Use Supabase client directly instead of API route
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('cliente_id', id)
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log('Fetched client details:', data);
      
      // Convert any null values to empty strings for the form
      setFormData({
        cliente_id: data.cliente_id.toString(),
        nombre: data.nombre || '',
        celular: data.celular || '',
        correo: data.correo || '',
        razon_social: data.razon_social || '',
        rfc: data.rfc || '',
        tipo_cliente: data.tipo_cliente || 'Normal',
        lead: data.lead || 'No',
        direccion_envio: data.direccion_envio || '',
        recibe: data.recibe || '',
        atencion: data.atencion || ''
      });
      
      // Update the search term with the client's name
      setSearchTerm(data.nombre || '');
      setSelectedCliente(data);
      setActiveTab('existente');
      
      if (onClienteChange) {
        // Ensure cliente_id is a number
        const cliente: Cliente = {
          cliente_id: typeof data.cliente_id === 'string' ? parseInt(data.cliente_id) : data.cliente_id,
          nombre: data.nombre,
          celular: data.celular,
          correo: data.correo,
          razon_social: data.razon_social,
          rfc: data.rfc,
          tipo_cliente: data.tipo_cliente,
          lead: data.lead,
          direccion_envio: data.direccion_envio,
          recibe: data.recibe,
          atencion: data.atencion
        };
        onClienteChange(cliente);
      }
    } catch (error) {
      console.error('Error fetching cliente:', error);
      toast.error('Error al cargar el cliente');
    } finally {
      setLoading(false);
    }
  };

  // Convert form data to Cliente object for parent component
  const formDataToCliente = (data: ClienteFormData): Cliente => {
    return {
      cliente_id: data.cliente_id ? parseInt(data.cliente_id) : 0,
      nombre: data.nombre,
      celular: data.celular,
      correo: data.correo || null,
      razon_social: data.razon_social || null,
      rfc: data.rfc || null,
      tipo_cliente: data.tipo_cliente || null,
      lead: data.lead || null,
      direccion_envio: data.direccion_envio || null,
      recibe: data.recibe || null,
      atencion: data.atencion || null
    };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value
      };
      
      // Only notify parent if we're in nuevo tab or if we're editing the atencion field in existente tab
      if (onClienteChange && (activeTab === 'nuevo' || (activeTab === 'existente' && name === 'atencion'))) {
        onClienteChange(formDataToCliente(newData));
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
      
      if (onClienteChange && activeTab === 'nuevo') {
        onClienteChange(formDataToCliente(newData));
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
        lead: 'No',
        direccion_envio: '',
        recibe: '',
        atencion: ''
      });
      
      if (onClienteChange) {
        onClienteChange(null);
      }
    }
  };

  // Filter clients based on search term
  const filteredClientes = clientes.filter(cliente => {
    if (!searchTerm || searchTerm.trim() === '') return true;
    
    try {
      const searchLower = searchTerm.toLowerCase();
      return (
        (typeof cliente.nombre === 'string' && cliente.nombre.toLowerCase().includes(searchLower)) || 
        (typeof cliente.celular === 'string' && cliente.celular.includes(searchTerm)) ||
        (typeof cliente.correo === 'string' && cliente.correo.toLowerCase().includes(searchLower))
      );
    } catch (error) {
      console.error('Error filtering cliente:', error);
      return false;
    }
  });
  
  const resetSelection = () => {
    setSelectedCliente(null);
    setSearchTerm("");
    setFormData({
      cliente_id: '',
      nombre: '',
      celular: '',
      correo: '',
      razon_social: '',
      rfc: '',
      tipo_cliente: 'Normal',
      lead: 'No',
      direccion_envio: '',
      recibe: '',
      atencion: ''
    });
    
    if (onClienteChange) {
      onClienteChange(null);
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
                onValueChange={(value) => {
                  setFormData(prev => {
                    const newData = { ...prev, tipo_cliente: value };
                    
                    if (onClienteChange) {
                      onClienteChange(formDataToCliente(newData));
                    }
                    
                    return newData;
                  });
                }}
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
              <FormLabel required>Cliente existente</FormLabel>
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <Input
                    placeholder="Buscar por nombre o teléfono"
                    className="pl-10 pr-10"
                    value={searchTerm}
                    onChange={(e) => {
                      const value = e.target.value || '';
                      setSearchTerm(value);
                      setShowDropdown(true);
                      if (selectedCliente && value !== selectedCliente.nombre) {
                        setSelectedCliente(null);
                        setFormData(prev => ({ ...prev, cliente_id: '' }));
                        
                        if (onClienteChange) {
                          onClienteChange(null);
                        }
                      }
                    }}
                    onFocus={() => setShowDropdown(true)}
                    disabled={loading}
                  />
                  {loading && (
                    <div className="absolute inset-y-0 right-0 pr-10 flex items-center">
                      <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                    </div>
                  )}
                  {searchTerm && (
                    <button
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={resetSelection}
                    >
                      <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>
                
                {/* Dropdown for search results */}
                {showDropdown && (
                  <div className="absolute z-20 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200">
                    <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-track-gray-100">
                      {loading ? (
                        <div className="p-4 flex items-center justify-center">
                          <Loader2 className="h-5 w-5 text-teal-500 animate-spin mr-2" />
                          <span className="text-sm text-gray-500">Cargando clientes...</span>
                        </div>
                      ) : filteredClientes.length > 0 ? (
                        <ul className="py-1 text-sm divide-y divide-gray-100">
                          {filteredClientes.map((cliente) => (
                            <li
                              key={cliente.cliente_id}
                              className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                              onClick={async () => {
                                setSelectedCliente(cliente);
                                setSearchTerm(cliente.nombre || '');
                                setShowDropdown(false);
                                await fetchCliente(cliente.cliente_id);
                              }}
                            >
                              <div className="font-medium text-gray-900">{cliente.nombre || 'Cliente sin nombre'}</div>
                              <div className="text-xs text-gray-500 mt-1 flex flex-col">
                                {cliente.celular && <span>Tel: {cliente.celular}</span>}
                                {cliente.correo && <span>Email: {cliente.correo}</span>}
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          No se encontraron clientes
                        </div>
                      )}
                    </div>
                    {filteredClientes.length > 10 && (
                      <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100 text-center bg-gray-50">
                        {filteredClientes.length} clientes encontrados
                      </div>
                    )}
                  </div>
                )}
              </div>
            </FormControl>
            
            {formData.cliente_id && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
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
                  <FormLabel>Correo</FormLabel>
                  <Input
                    name="correo"
                    value={formData.correo}
                    readOnly
                    icon={<Mail className="h-4 w-4" />}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>Tipo de cliente</FormLabel>
                  <Input
                    name="tipo_cliente"
                    value={formData.tipo_cliente}
                    readOnly
                  />
                </FormControl>
                
                {/* Business Information */}
                <FormControl className="col-span-1 md:col-span-2">
                  <FormLabel>Razón Social</FormLabel>
                  <Input
                    name="razon_social"
                    value={formData.razon_social}
                    readOnly
                    icon={<Building2 className="h-4 w-4" />}
                  />
                </FormControl>
                
                <FormControl className="col-span-1 md:col-span-2">
                  <FormLabel>RFC</FormLabel>
                  <Input
                    name="rfc"
                    value={formData.rfc}
                    readOnly
                    icon={<FileText className="h-4 w-4" />}
                  />
                </FormControl>
                
                {/* Shipping Information */}
                <FormControl>
                  <FormLabel>Dirección de envío</FormLabel>
                  <Input
                    name="direccion_envio"
                    value={formData.direccion_envio}
                    readOnly
                    icon={<MapPin className="h-4 w-4" />}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>¿Quién recibe?</FormLabel>
                  <Input
                    name="recibe"
                    value={formData.recibe}
                    readOnly
                    icon={<User className="h-4 w-4" />}
                  />
                </FormControl>
                
                {/* Only editable field */}
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
            {!formData.cliente_id && searchTerm && filteredClientes.length === 0 && (
              <div className="p-6 text-center">
                <p className="text-gray-500">No se encontraron resultados para "{searchTerm}"</p>
                <p className="text-gray-500 mt-2">Prueba con otro término de búsqueda o crea un nuevo cliente.</p>
              </div>
            )}
            {!formData.cliente_id && !searchTerm && (
              <div className="p-6 text-center">
                <p className="text-gray-500">Busca un cliente existente usando el campo de búsqueda.</p>
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