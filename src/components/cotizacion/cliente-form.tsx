"use client";

import { useState, useEffect, useRef } from 'react';
import { Mail, Phone, User, Building, FileText, MapPin, Search, AlertCircle, Save, Check, ChevronsUpDown } from 'lucide-react';
import { FormControl, FormLabel } from '../ui/form';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import 'react-phone-number-input/style.css';
import PhoneInput from 'react-phone-number-input/input';
import { toast } from "react-hot-toast";
import { isValidPhoneNumber } from 'react-phone-number-input';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { searchClientes, insertCliente } from '@/lib/supabase';
import { Cliente as ClienteType } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// Match the database schema exactly
interface Cliente {
  cliente_id: number;
  nombre: string;
  celular: string;
  correo: string | null;
  razon_social: string | null;
  rfc: string | null;
  tipo_cliente: string | null;
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
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const pageSize = 20;
  const listRef = useRef<HTMLDivElement>(null);
  
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
    direccion_envio: "",
    recibe: "",
    atencion: ""
  });

  // Completely rewritten persistence logic
  useEffect(() => {
    const initializeForm = () => {
      // Check if this is a page refresh or a navigation
      const isPageRefresh = !sessionStorage.getItem('navigationOccurred');

      if (isPageRefresh) {
        // On page refresh, clear everything
        console.log("Page refresh detected: clearing form data");
        sessionStorage.removeItem('cotizacion_clienteForm');
        
        setFormData({
          cliente_id: "",
          nombre: "",
          celular: "",
          correo: "",
          razon_social: "",
          rfc: "",
          tipo_cliente: "Normal",
          direccion_envio: "",
          recibe: "",
          atencion: ""
        });
      } else {
        // On regular component mount (like when navigating between steps)
        // try to load saved data
        try {
          const savedData = sessionStorage.getItem('cotizacion_clienteForm');
          if (savedData) {
            const parsedData = JSON.parse(savedData);
            console.log("Loading saved form data:", parsedData);
            
            setFormData(parsedData);
            
            // Set active tab based on whether we have a client ID
            if (parsedData.cliente_id) {
              setActiveTab("existente");
              setFormDataChanged(true); // Trigger parent notification
            } else if (parsedData.nombre || parsedData.celular) {
              setActiveTab("nuevo");
              setFormDataChanged(true); // Trigger parent notification
            }
          } else {
            console.log("No saved form data found");
          }
        } catch (e) {
          console.error("Error loading saved form data:", e);
        }
      }
      
      // Mark that we've initialized and set the navigation flag for next time
      setInitialized(true);
      sessionStorage.setItem('navigationOccurred', 'true');
    };
    
    if (!initialized) {
      initializeForm();
    }
    
    // Add a beforeunload listener to detect actual page refreshes
    const handleBeforeUnload = () => {
      // When the page is refreshed/closed, remove the navigation marker
      // so next load will be treated as a refresh
      sessionStorage.removeItem('navigationOccurred');
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

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
    if (formDataChanged && initialized) {
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
  }, [formData, formDataChanged, activeTab, initialized]);

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
      
      // Mark data as changed to trigger parent notification
      setFormDataChanged(true);
      
      // Save to sessionStorage
      const updatedData = {
        ...prev,
        [name]: value
      };
      sessionStorage.setItem('cotizacion_clienteForm', JSON.stringify(updatedData));
      
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
      
      // Mark data as changed to trigger parent notification
      setFormDataChanged(true);
      
      // Save to sessionStorage
      const updatedData = {
        ...prev,
        celular: value || ''
      };
      sessionStorage.setItem('cotizacion_clienteForm', JSON.stringify(updatedData));
      
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

  // Highlight the matching parts of text
  const highlightMatch = (text: string, query: string) => {
    if (!query || query.length < 2) return <>{text}</>;
    
    try {
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const parts = text.split(regex);
      
      return (
        <>
          {parts.map((part, i) => 
            regex.test(part) ? (
              <span key={i} className="bg-yellow-200 text-black font-medium">
                {part}
              </span>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </>
      );
    } catch (e) {
      return <>{text}</>;
    }
  };

  // Handle selection of an existing client
  const handleSelectClient = (clienteId: string) => {
    const cliente = searchResults.find(c => c.cliente_id.toString() === clienteId);
    
    if (!cliente) return;
    
    // Completely replace the form data with the selected client
    const updatedFormData = {
      cliente_id: cliente.cliente_id.toString(),
      nombre: cliente.nombre || "",
      celular: cliente.celular || "",
      correo: cliente.correo || "",
      razon_social: cliente.razon_social || "",
      rfc: cliente.rfc || "",
      tipo_cliente: cliente.tipo_cliente || "Normal",
      direccion_envio: cliente.direccion_envio || "",
      recibe: cliente.recibe || "",
      atencion: cliente.atencion || ""
    };
    
    setFormData(updatedFormData);
    setFormDataChanged(true);
    
    // Save to sessionStorage
    sessionStorage.setItem('cotizacion_clienteForm', JSON.stringify(updatedFormData));
    console.log("Client selected, saved to sessionStorage:", updatedFormData);
    
    // Close combobox
    setComboboxOpen(false);
  };

  // Save new client to database
  const handleUpdateClient = async () => {
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
      if (!formData.cliente_id) {
        throw new Error("No client ID provided for update");
      }
      
      // Create cliente object for update
      const clienteToUpdate = {
        cliente_id: parseInt(formData.cliente_id),
        nombre: formData.nombre,
        celular: formData.celular,
        correo: formData.correo || null,
        razon_social: formData.razon_social || null,
        rfc: formData.rfc || null,
        tipo_cliente: formData.tipo_cliente || null,
        direccion_envio: formData.direccion_envio || null,
        recibe: formData.recibe || null,
        atencion: formData.atencion || null
      };
      
      // Update the client in the database
      const response = await fetch(`/api/clientes/${formData.cliente_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clienteToUpdate),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update client');
      }
      
      const data = await response.json();
      
      if (data) {
        // Mark as changed to trigger notification to parent
        setFormDataChanged(true);
        
        // Save to sessionStorage
        sessionStorage.setItem('cotizacion_clienteForm', JSON.stringify(formData));
        
        toast.success("Cliente actualizado exitosamente");
      }
    } catch (error) {
      console.error("Error updating client:", error);
      toast.error("Error al actualizar el cliente");
    } finally {
      setIsSaving(false);
    }
  };

  // Add additional debugging effect to monitor sessionStorage
  useEffect(() => {
    // Check saved data on tab change or other updates to help debug persistence
    const savedData = sessionStorage.getItem('cotizacion_clienteForm');
    console.log("Current sessionStorage state:", savedData ? JSON.parse(savedData) : "No data");
    
    // Listen for tab changes in the form
    const handleTabChange = () => {
      const currentData = sessionStorage.getItem('cotizacion_clienteForm');
      console.log("After tab change, sessionStorage:", currentData ? JSON.parse(currentData) : "No data");
    };
    
    // Listen for storage events from other tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'cotizacion_clienteForm') {
        console.log("Storage changed in another tab:", e.newValue ? JSON.parse(e.newValue) : "No data");
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [activeTab]);

  return (
    <div className="bg-white rounded-lg shadow p-6 w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 grid grid-cols-2">
          <TabsTrigger value="nuevo">Nuevo</TabsTrigger>
          <TabsTrigger value="existente">Existente</TabsTrigger>
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
          </div>
        </TabsContent>
        
        <TabsContent value="existente">
          <div className="space-y-6">
            <div className="text-sm text-gray-500 mb-4">
              Busca y selecciona un cliente existente para usar en esta cotización. Si no encuentras al cliente, puedes crear uno nuevo en la pestaña "Nuevo".
            </div>
            
            {/* Cliente search with ultra-simplified combobox */}
            <div className="relative w-full">
              <div className="w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    // Reset and load initial data when opening
                    setSearchTerm('');
                    setSearchResults([]);
                    setIsSearching(true);
                    setComboboxOpen(true);
                    
                    // Fetch all clients on open
                    fetch('/api/clientes')
                      .then(res => res.json())
                      .then(data => {
                        console.log("Loaded initial clients:", data?.data?.length || 0);
                        setSearchResults(data?.data || []);
                        setIsSearching(false);
                      })
                      .catch(err => {
                        console.error("Error loading clients:", err);
                        setIsSearching(false);
                      });
                  }}
                  className="w-full flex justify-between items-center"
                >
                  {formData.cliente_id ? (
                    <span className="truncate">{formData.nombre}</span>
                  ) : (
                    <span className="text-muted-foreground">Buscar cliente por nombre, teléfono o correo...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </div>
              
              {comboboxOpen && (
                <div className="absolute z-50 bg-white border border-gray-200 rounded-md shadow-lg w-full max-w-[400px] mt-1">
                  <div className="border-b p-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <input
                        value={searchTerm}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSearchTerm(value);
                          setIsSearching(true);
                          
                          if (value.trim() === '') {
                            // If empty query, load all clients
                            fetch('/api/clientes')
                              .then(res => res.json())
                              .then(data => {
                                console.log("Loaded all clients:", data?.data?.length || 0);
                                setSearchResults(data?.data || []);
                                setIsSearching(false);
                              })
                              .catch(err => {
                                console.error("Error loading clients:", err);
                                setIsSearching(false);
                              });
                          } else {
                            // Search with query parameter
                            fetch(`/api/clientes?query=${encodeURIComponent(value)}`)
                              .then(res => res.json())
                              .then(data => {
                                console.log(`Search results for "${value}":`, data?.data?.length || 0);
                                setSearchResults(data?.data || []);
                                setIsSearching(false);
                              })
                              .catch(err => {
                                console.error("Error searching clients:", err);
                                setIsSearching(false);
                              });
                          }
                        }}
                        autoFocus
                        placeholder="Buscar por nombre, teléfono o correo..."
                        className="w-full pl-8 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                  
                  <div className="max-h-[300px] overflow-auto">
                    {isSearching ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        <div className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                        Buscando clientes...
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="py-4 text-center">
                        <p className="text-sm text-muted-foreground mb-2">No se encontraron clientes</p>
                        <Button 
                          size="sm" 
                          onClick={() => {
                            // Create new client with the search term as name
                            const newFormData = {
                              cliente_id: "",
                              nombre: searchTerm,
                              celular: "",
                              correo: "",
                              razon_social: "",
                              rfc: "",
                              tipo_cliente: "Normal",
                              direccion_envio: "",
                              recibe: "",
                              atencion: ""
                            };
                            
                            setActiveTab("nuevo");
                            setFormData(newFormData);
                            setFormDataChanged(true);
                            
                            // Save to sessionStorage
                            sessionStorage.setItem('cotizacion_clienteForm', JSON.stringify(newFormData));
                            
                            setComboboxOpen(false);
                          }}
                          className="bg-teal-500 hover:bg-teal-600 text-white"
                        >
                          Crear nuevo cliente
                        </Button>
                      </div>
                    ) : (
                      searchResults.map((cliente) => (
                        <div
                          key={cliente.cliente_id}
                          className="flex items-center px-3 py-2 cursor-pointer hover:bg-slate-100"
                          onClick={() => handleSelectClient(cliente.cliente_id.toString())}
                        >
                          <User className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="flex-1">
                            {searchTerm && searchTerm.length > 1
                              ? highlightMatch(cliente.nombre, searchTerm)
                              : cliente.nombre}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div className="border-t p-2">
                    <Button 
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setComboboxOpen(false)}
                    >
                      Cerrar
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Client form fields - always visible */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
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
                  readOnly={!formData.cliente_id && !comboboxOpen}
                  onClick={() => !formData.cliente_id && setComboboxOpen(true)}
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
                    disabled={!formData.cliente_id && !comboboxOpen}
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
                  readOnly={!formData.cliente_id && !comboboxOpen}
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
                  readOnly={!formData.cliente_id && !comboboxOpen}
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
                  readOnly={!formData.cliente_id && !comboboxOpen}
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
                  disabled={!formData.cliente_id && !comboboxOpen}
                >
                  <option value="Normal">Normal</option>
                  <option value="Premium">Premium</option>
                  <option value="Corporativo">Corporativo</option>
                  <option value="Mayorista">Mayorista</option>
                </select>
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
                  readOnly={!formData.cliente_id && !comboboxOpen}
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
                  readOnly={!formData.cliente_id && !comboboxOpen}
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
                  readOnly={!formData.cliente_id && !comboboxOpen}
                />
              </FormControl>
              
              {/* Action buttons */}
              <div className="md:col-span-2 mt-4 flex justify-between">
                {!formData.cliente_id ? (
                  <Button 
                    onClick={() => setComboboxOpen(true)}
                    variant="default"
                    className="bg-teal-500 hover:bg-teal-600 text-white"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Buscar Cliente
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Clear the client selection
                      const updatedFormData = {
                        ...formData,
                        cliente_id: ""
                      };
                      
                      setFormData(updatedFormData);
                      setFormDataChanged(true);
                      
                      // Save to sessionStorage
                      sessionStorage.setItem('cotizacion_clienteForm', JSON.stringify(updatedFormData));
                      console.log("Client selection cleared");
                      
                      setComboboxOpen(true);
                    }}
                  >
                    Cambiar cliente
                  </Button>
                )}
                
                {formData.cliente_id && (
                  <Button
                    type="button"
                    onClick={handleUpdateClient}
                    disabled={isSaving || !formData.nombre || !formData.celular || Object.keys(errors).length > 0}
                    variant="default"
                    className="bg-teal-500 hover:bg-teal-600 text-white"
                  >
                    {isSaving ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Actualizando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Actualizar Cliente
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {!formData.cliente_id && searchResults.length === 0 && !isSearching && searchTerm.length > 0 && (
              <div className="border border-amber-300 bg-amber-50 p-4 rounded-md mt-4 text-sm">
                <p className="font-medium text-amber-800 mb-2">No se encontraron clientes con ese nombre</p>
                <p className="text-amber-700">Puedes crear un nuevo cliente en la pestaña "Nuevo".</p>
                <Button 
                  className="mt-3 bg-teal-500 hover:bg-teal-600 text-white" 
                  size="sm"
                  onClick={() => {
                    // Create new client with the search term as name
                    const newFormData = {
                      cliente_id: "",
                      nombre: searchTerm,
                      celular: "",
                      correo: "",
                      razon_social: "",
                      rfc: "",
                      tipo_cliente: "Normal",
                      direccion_envio: "",
                      recibe: "",
                      atencion: ""
                    };
                    
                    setActiveTab("nuevo");
                    setFormData(newFormData);
                    setFormDataChanged(true);
                    
                    // Save to sessionStorage
                    sessionStorage.setItem('cotizacion_clienteForm', JSON.stringify(newFormData));
                  }}
                >
                  Crear nuevo cliente
                </Button>
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