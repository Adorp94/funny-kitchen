"use client";

import { useState, useEffect } from 'react';
import { Mail, Phone, User, Building, FileText, MapPin, Search, AlertCircle, Save } from 'lucide-react';
import { FormControl, FormLabel } from '../ui/form';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import 'react-phone-number-input/style.css';
import PhoneInput from 'react-phone-number-input/input';
import { toast } from "react-hot-toast";
import { isValidPhoneNumber } from 'react-phone-number-input';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { searchClientes, insertCliente } from '@/lib/supabase';
import { Cliente as ClienteType } from '@/types/supabase';

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

// Validation errors interface
interface FormErrors {
  nombre?: string;
  celular?: string;
  correo?: string;
  rfc?: string;
}

interface ClienteFormProps {
  clienteId?: number;
  onClienteChange?: (cliente: ClienteType | null) => void;
}

export function ClienteForm({ clienteId, onClienteChange }: ClienteFormProps) {
  const [activeTab, setActiveTab] = useState<string>("nuevo");
  const [formDataChanged, setFormDataChanged] = useState<boolean>(false);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<ClienteType[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // Initialize Supabase client
  const supabase = createClientComponentClient();

  const [formData, setFormData] = useState<ClienteFormData>({
    cliente_id: "",
    nombre: "",
    celular: "",
    correo: "",
    razon_social: "",
    rfc: "",
    tipo_cliente: "Normal",
    lead: "",
    direccion_envio: "",
    recibe: "",
    atencion: ""
  });

  // Load saved form data from sessionStorage on first render
  useEffect(() => {
    // Try to load any saved form data from sessionStorage
    const savedFormData = sessionStorage.getItem('cotizacion_clienteForm');
    if (savedFormData && !initialized) {
      try {
        const parsedFormData = JSON.parse(savedFormData);
        setFormData(parsedFormData);
        
        // Set active tab based on whether we have a client ID
        if (parsedFormData.cliente_id) {
          setActiveTab("existente");
          // Mark as changed to trigger notification to parent
          setFormDataChanged(true);
        } else if (parsedFormData.nombre || parsedFormData.celular) {
          setActiveTab("nuevo");
          // Mark as changed to trigger notification to parent
          setFormDataChanged(true);
        }
        
        setInitialized(true);
      } catch (e) {
        console.error("Error parsing saved form data:", e);
      }
    }
  }, []);

  // Save form data to sessionStorage when it changes
  useEffect(() => {
    if (formData.nombre || formData.celular || formData.cliente_id) {
      sessionStorage.setItem('cotizacion_clienteForm', JSON.stringify(formData));
    }
  }, [formData]);

  // Safe way to notify parent of changes to avoid issues during initialization
  const safeNotifyParent = (cliente: ClienteType | null) => {
    if (onClienteChange) {
      // Use setTimeout to move the state update out of the render cycle
      setTimeout(() => {
        onClienteChange(cliente);
      }, 0);
    }
  };

  // Validate the form
  const validateForm = (data: ClienteFormData): FormErrors => {
    const newErrors: FormErrors = {};
    
    // Validate name
    if (!data.nombre.trim()) {
      newErrors.nombre = "El nombre es obligatorio";
    } else if (data.nombre.trim().length < 3) {
      newErrors.nombre = "El nombre debe tener al menos 3 caracteres";
    }
    
    // Validate phone
    if (!data.celular) {
      newErrors.celular = "El teléfono es obligatorio";
    } else if (!isValidPhoneNumber(data.celular)) {
      newErrors.celular = "El formato de teléfono no es válido";
    }
    
    // Validate email if provided
    if (data.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.correo)) {
      newErrors.correo = "El formato de correo no es válido";
    }
    
    // Validate RFC if provided
    if (data.rfc && !/^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/.test(data.rfc)) {
      newErrors.rfc = "El formato de RFC no es válido";
    }
    
    return newErrors;
  };

  // Update this useEffect to handle parent notification when form data changes
  useEffect(() => {
    // Only notify parent when we have a complete form AND form data has changed AND no errors
    if (formDataChanged) {
      const validationErrors = validateForm(formData);
      setErrors(validationErrors);
      
      // Only notify if there are no errors and we have required fields
      const hasNoErrors = Object.keys(validationErrors).length === 0;
      
      if (hasNoErrors) {
        // Check that we have required fields based on the active tab
        if (activeTab === 'nuevo' && formData.nombre && formData.celular) {
          safeNotifyParent(formDataToCliente(formData));
        } else if (activeTab === 'existente' && formData.cliente_id) {
          safeNotifyParent(formDataToCliente(formData));
        }
      } else {
        // If we have errors, notify parent with null to indicate invalid data
        safeNotifyParent(null);
      }
      
      // Reset the changed flag after handling
      setFormDataChanged(false);
    }
  }, [formData, formDataChanged, activeTab]);

  // Convert form data to Cliente object for parent component
  const formDataToCliente = (data: ClienteFormData): ClienteType => {
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
      
      // Mark field as touched
      setTouched(prev => ({
        ...prev,
        [name]: true
      }));
      
      // Just mark data as changed, don't notify directly
      setFormDataChanged(true);
      return newData;
    });
  };

  const handlePhoneChange = (value: string | undefined) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        celular: value || ''
      };
      
      // Mark field as touched
      setTouched(prev => ({
        ...prev,
        celular: true
      }));
      
      // Just mark data as changed, don't notify directly
      setFormDataChanged(true);
      return newData;
    });
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));
    
    // Validate the form on blur
    setErrors(validateForm(formData));
  };

  // Handle search for existing clients
  const handleSearch = async () => {
    if (!searchTerm || searchTerm.length < 3) {
      toast.error("Ingresa al menos 3 caracteres para buscar");
      return;
    }

    setIsSearching(true);
    
    try {
      const { data, error } = await searchClientes(searchTerm);
      
      if (error) {
        throw error;
      }
      
      setSearchResults(data || []);
      
      if (data && data.length === 0) {
        toast("No se encontraron clientes con ese nombre");
      }
    } catch (error) {
      console.error("Error searching for clients:", error);
      toast.error("Error al buscar clientes");
    } finally {
      setIsSearching(false);
    }
  };

  // Handle selection of an existing client
  const handleSelectClient = (cliente: ClienteType) => {
    setFormData({
      cliente_id: cliente.cliente_id.toString(),
      nombre: cliente.nombre || "",
      celular: cliente.celular || "",
      correo: cliente.correo || "",
      razon_social: cliente.razon_social || "",
      rfc: cliente.rfc || "",
      tipo_cliente: cliente.tipo_cliente || "Normal",
      lead: cliente.lead || "",
      direccion_envio: cliente.direccion_envio || "",
      recibe: cliente.recibe || "",
      atencion: cliente.atencion || ""
    });
    
    // Mark data as changed to trigger notification to parent
    setFormDataChanged(true);
    
    // Clear search results
    setSearchResults([]);
    setSearchTerm("");
  };

  // Save new client to database
  const handleSaveClient = async () => {
    // Validate form first
    const validationErrors = validateForm(formData);
    setErrors(validationErrors);
    
    // Mark all fields as touched
    setTouched({
      nombre: true,
      celular: true,
      correo: true,
      rfc: true
    });
    
    if (Object.keys(validationErrors).length > 0) {
      toast.error("Por favor corrige los errores antes de guardar");
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Create cliente object without cliente_id (will be generated by the server)
      const clienteToSave = {
        nombre: formData.nombre,
        celular: formData.celular,
        correo: formData.correo || null,
        razon_social: formData.razon_social || null,
        rfc: formData.rfc || null,
        tipo_cliente: formData.tipo_cliente || null,
        lead: formData.lead || null,
        direccion_envio: formData.direccion_envio || null,
        recibe: formData.recibe || null,
        atencion: formData.atencion || null
      };
      
      const { data, error } = await insertCliente(clienteToSave);
      
      if (error) {
        throw error;
      }
      
      if (data) {
        // Update form with the new client ID
        setFormData(prev => ({
          ...prev,
          cliente_id: data.cliente_id.toString()
        }));
        
        // Mark as changed to trigger notification to parent
        setFormDataChanged(true);
        
        toast.success("Cliente guardado exitosamente");
      }
    } catch (error) {
      console.error("Error saving client:", error);
      toast.error("Error al guardar el cliente");
    } finally {
      setIsSaving(false);
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
                onBlur={() => handleBlur('nombre')}
                placeholder="Ingresa el nombre del cliente"
                icon={<User className="h-4 w-4" />}
                className={`${touched.nombre && errors.nombre ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                required
              />
              {touched.nombre && errors.nombre && (
                <div className="text-red-500 text-xs mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {errors.nombre}
                </div>
              )}
            </FormControl>
            
            {/* Celular */}
            <FormControl>
              <FormLabel required>Celular</FormLabel>
              <div className={`flex h-10 w-full rounded-md border ${touched.celular && errors.celular ? 'border-red-500' : 'border-input'} bg-background text-sm ring-offset-background`}>
                <PhoneInput
                  className="flex-1 px-3 py-2 border-0 focus:outline-none focus:ring-0"
                  country="MX"
                  value={formData.celular}
                  onChange={handlePhoneChange}
                  onBlur={() => handleBlur('celular')}
                  placeholder="+52"
                  required
                />
              </div>
              {touched.celular && errors.celular && (
                <div className="text-red-500 text-xs mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {errors.celular}
                </div>
              )}
            </FormControl>
            
            {/* Correo */}
            <FormControl>
              <FormLabel>Correo</FormLabel>
              <Input
                type="email"
                name="correo"
                value={formData.correo}
                onChange={handleInputChange}
                onBlur={() => handleBlur('correo')}
                placeholder="cliente@ejemplo.com"
                icon={<Mail className="h-4 w-4" />}
                className={`${touched.correo && errors.correo ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              />
              {touched.correo && errors.correo && (
                <div className="text-red-500 text-xs mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {errors.correo}
                </div>
              )}
            </FormControl>
            
            {/* Razón Social */}
            <FormControl>
              <FormLabel>Razón Social</FormLabel>
              <Input
                name="razon_social"
                value={formData.razon_social}
                onChange={handleInputChange}
                placeholder="Nombre legal de la empresa"
                icon={<Building className="h-4 w-4" />}
              />
            </FormControl>
            
            {/* RFC */}
            <FormControl>
              <FormLabel>RFC</FormLabel>
              <Input
                name="rfc"
                value={formData.rfc}
                onChange={handleInputChange}
                onBlur={() => handleBlur('rfc')}
                placeholder="Ej: XAXX010101000"
                icon={<FileText className="h-4 w-4" />}
                className={`${touched.rfc && errors.rfc ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              />
              {touched.rfc && errors.rfc && (
                <div className="text-red-500 text-xs mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {errors.rfc}
                </div>
              )}
            </FormControl>
            
            {/* Tipo Cliente */}
            <FormControl>
              <FormLabel>Tipo de Cliente</FormLabel>
              <select
                name="tipo_cliente"
                value={formData.tipo_cliente}
                onChange={handleInputChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="Normal">Normal</option>
                <option value="Premium">Premium</option>
                <option value="Corporativo">Corporativo</option>
                <option value="Mayorista">Mayorista</option>
              </select>
            </FormControl>
            
            {/* Lead */}
            <FormControl>
              <FormLabel>Lead</FormLabel>
              <Input
                name="lead"
                value={formData.lead}
                onChange={handleInputChange}
                placeholder="Origen del cliente"
                icon={<User className="h-4 w-4" />}
              />
            </FormControl>
            
            {/* Dirección de envío */}
            <FormControl className="md:col-span-2">
              <FormLabel>Dirección de Envío</FormLabel>
              <Input
                name="direccion_envio"
                value={formData.direccion_envio}
                onChange={handleInputChange}
                placeholder="Dirección completa de envío"
                icon={<MapPin className="h-4 w-4" />}
              />
            </FormControl>
            
            {/* Recibe */}
            <FormControl>
              <FormLabel>Recibe</FormLabel>
              <Input
                name="recibe"
                value={formData.recibe}
                onChange={handleInputChange}
                placeholder="Persona que recibe"
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
            
            {/* Save to Database Button */}
            <div className="md:col-span-2 mt-4 flex justify-end">
              <Button
                type="button"
                onClick={handleSaveClient}
                disabled={isSaving || !formData.nombre || !formData.celular || Object.keys(errors).length > 0}
                className="bg-teal-500 hover:bg-teal-600 text-white"
              >
                {isSaving ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar en Base de Datos
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="existente">
          <div className="space-y-6">
            {/* Cliente search */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <FormLabel>Buscar cliente por nombre</FormLabel>
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ingresa el nombre del cliente"
                  icon={<Search className="h-4 w-4" />}
                />
              </div>
              <Button 
                onClick={handleSearch} 
                disabled={isSearching || searchTerm.length < 3}
                className="bg-teal-500 hover:bg-teal-600 text-white"
              >
                {isSearching ? "Buscando..." : "Buscar"}
              </Button>
            </div>
            
            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Correo</th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {searchResults.map((cliente) => (
                      <tr key={cliente.cliente_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {cliente.nombre}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {cliente.celular}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {cliente.correo || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <Button
                            variant="ghost"
                            size="sm" 
                            onClick={() => handleSelectClient(cliente)}
                            className="text-teal-500 hover:text-teal-700 hover:bg-teal-50 p-1 h-auto"
                          >
                            Seleccionar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Selected client details */}
            {formData.cliente_id && (
              <div className="bg-gray-50 p-4 rounded-md mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Cliente Seleccionado</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><span className="font-medium">Nombre:</span> {formData.nombre}</p>
                    <p><span className="font-medium">Teléfono:</span> {formData.celular}</p>
                    <p><span className="font-medium">Correo:</span> {formData.correo || "-"}</p>
                    <p><span className="font-medium">Tipo:</span> {formData.tipo_cliente}</p>
                  </div>
                  <div>
                    <p><span className="font-medium">Razón Social:</span> {formData.razon_social || "-"}</p>
                    <p><span className="font-medium">RFC:</span> {formData.rfc || "-"}</p>
                    <p><span className="font-medium">Dirección:</span> {formData.direccion_envio || "-"}</p>
                    <p><span className="font-medium">Atención:</span> {formData.atencion || "-"}</p>
                  </div>
                </div>
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