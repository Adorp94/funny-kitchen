"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Mail, Phone, User, Building, FileText, MapPin, Search, AlertCircle, Save, Check, ChevronsUpDown, Plus, Loader2, X } from 'lucide-react';
import { FormControl, FormLabel } from '../ui/form';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { toast } from "react-hot-toast";
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
  tipo_cliente?: string;
  cliente_id?: string;
}

interface ClienteFormProps {
  clienteId?: number;
  onClienteChange?: (cliente: ClienteType | null) => void;
}

// Add a debounce function
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): Promise<ReturnType<F>> => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    return new Promise(resolve => {
      timeout = setTimeout(() => {
        const result = func(...args);
        resolve(result);
      }, waitFor);
    });
  };
}

export function ClienteForm({ clienteId, onClienteChange }: ClienteFormProps) {
  const [activeTab, setActiveTab] = useState<string>("nuevo");
  const [formDataChanged, setFormDataChanged] = useState<boolean>(false);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [searchResults, setSearchResults] = useState<ClienteType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreResults, setHasMoreResults] = useState(true);
  const pageSize = 10;
  const listRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  
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

  // Add state to track if search is active
  const [isDebouncing, setIsDebouncing] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRequestIdRef = useRef<number>(0);

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
    
    // Validate phone - using just numeric length check since we're storing digits only
    if (!data.celular) {
      newErrors.celular = "El teléfono es obligatorio";
    } else if (data.celular.replace(/\D/g, '').length < 10) {
      newErrors.celular = "El número de teléfono es demasiado corto";
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
        // Simply notify the parent with the current form data (saved or unsaved)
        // DO NOT automatically save to database here
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

  // Helper to convert formData to Cliente
  const formDataToCliente = (data: ClienteFormData): ClienteType => {
    return {
      cliente_id: parseInt(data.cliente_id) || 0,
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

  // Format phone for react-phone-input-2
  const formatPhoneForInput = (phone: string): string => {
    return phone || '';
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

  const handlePhoneChange = (value: string) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        celular: value
      };
      
      // Mark field as touched
      setTouched(prev => ({
        ...prev,
        celular: true
      }));
      
      // Mark data as changed to trigger parent notification
      setFormDataChanged(true);
      
      // Save to sessionStorage
      sessionStorage.setItem('cotizacion_clienteForm', JSON.stringify(newData));
      
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
  const handleClienteClick = (cliente: ClienteType) => {
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
    
    // Notify parent immediately with the selected client
    safeNotifyParent(cliente);
    
    // Close combobox
    setComboboxOpen(false);
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
      return null;
    }
    
    setIsSearching(true);
    
    try {
      // Check if we're actually creating a new client or not
      if (formData.cliente_id) {
        console.log("Client already has ID, not creating a new one", formData.cliente_id);
        setIsSearching(false);
        return formDataToCliente(formData);
      }
      
      // Create cliente object for API
      const clienteToCreate = {
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
      
      console.log("Creating new client:", clienteToCreate);
      
      // Insert the client using the API
      const response = await fetch('/api/clientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clienteToCreate),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create client');
      }
      
      console.log("Create response:", responseData);
      
      if (responseData.success && responseData.cliente) {
        // Update form data with the new client ID
        const updatedFormData = {
          ...formData,
          cliente_id: responseData.cliente.cliente_id.toString()
        };
        
        setFormData(updatedFormData);
        setFormDataChanged(true);
        
        // Save to sessionStorage
        sessionStorage.setItem('cotizacion_clienteForm', JSON.stringify(updatedFormData));
        
        toast.success("Cliente creado exitosamente");
        
        // Return the created client
        return formDataToCliente(updatedFormData);
      }
      
      return null;
    } catch (error) {
      console.error("Error creating client:", error);
      toast.error("Error al crear el cliente");
      return null;
    } finally {
      setIsSearching(false);
    }
  };

  // Update existing client in database
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
    
    setIsSearching(true);
    
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
      setIsSearching(false);
    }
  };

  // Add additional debugging effect to monitor sessionStorage (only in dev mode)
  useEffect(() => {
    // Only log in development environment
    if (process.env.NODE_ENV !== 'development') return;
    
    // Check saved data on tab change or other updates to help debug persistence
    const savedData = sessionStorage.getItem('cotizacion_clienteForm');
    
    // Listen for storage events from other tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'cotizacion_clienteForm' && process.env.NODE_ENV === 'development') {
        console.log("Storage changed in another tab:", e.newValue ? JSON.parse(e.newValue) : "No data");
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [activeTab]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    // If switching from "nuevo" tab and we have valid data, save the client first
    if (activeTab === "nuevo" && value === "existente" && formData.nombre && formData.celular) {
      const errors = validateForm(formData);
      if (Object.keys(errors).length === 0 && !formData.cliente_id) {
        // We're switching tabs with valid data but no client ID, so save first
        toast.promise(handleSaveClient(), {
          loading: "Guardando cliente...",
          success: "Cliente guardado correctamente",
          error: "Error al guardar el cliente"
        });
      }
    }
    
    // If switching from "existente" to "nuevo", clear the form data for a fresh start
    if (activeTab === "existente" && value === "nuevo") {
      // Save the current client data to avoid losing it completely
      if (formData.cliente_id) {
        sessionStorage.setItem('cotizacion_lastExistingClient', JSON.stringify(formData));
      }
      
      // Reset form to empty state
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
      
      // Update sessionStorage
      sessionStorage.setItem('cotizacion_clienteForm', JSON.stringify({
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
      }));
      
      // Reset errors and touched state
      setErrors({});
      setTouched({});
      
      // Mark as changed to trigger parent notification with null client
      setFormDataChanged(true);
      safeNotifyParent(null); // Explicitly notify parent that we have no client selected
    }
    
    // When switching tabs, ensure the appropriate state is set
    if (value === "nuevo") {
      // If switching to nuevo, and we have data from a previous existente tab, clear it
      if (formData.cliente_id) {
        // Reset form and notify parent
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
        sessionStorage.setItem('cotizacion_clienteForm', JSON.stringify({
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
        }));
        setFormDataChanged(true);
        safeNotifyParent(null);
      }
    }
    
    setActiveTab(value);
  };

  // Add function to auto-save client when unmounting if needed
  useEffect(() => {
    // We will not auto-save on unmounting anymore
    // This will be handled by the parent component when creating the cotización
    return () => {};
  }, []);

  // Replace the existing fetchClients function with this improved version
  const fetchClients = useCallback(async (
    searchTerm: string, 
    page: number, 
    append: boolean = false
  ) => {
    // Create a unique ID for this request
    const requestId = ++lastRequestIdRef.current;
    
    try {
      setIsSearching(true);
      // Try with both pageSize and limit parameters to support different API versions
      let endpoint = searchTerm 
        ? `/api/clientes?query=${encodeURIComponent(searchTerm)}&page=${page}&pageSize=${pageSize}` 
        : `/api/clientes?page=${page}&pageSize=${pageSize}`;
      
      console.log(`[Request #${requestId}] Fetching clients from: ${endpoint}`);
      const response = await fetch(endpoint);
      
      // If a newer request has already started, ignore this one
      if (requestId < lastRequestIdRef.current) {
        console.log(`[Request #${requestId}] Abandoned - newer request in progress`);
        return;
      }
      
      if (!response.ok) {
        console.error(`[Request #${requestId}] API response not OK:`, response.status, response.statusText);
        toast.error("No se pudieron cargar los clientes");
        return;
      }
      
      const result = await response.json();
      
      // Check again if this is still the most recent request
      if (requestId < lastRequestIdRef.current) {
        console.log(`[Request #${requestId}] Abandoned - newer request completed`);
        return;
      }
      
      console.log(`[Request #${requestId}] API response:`, {
        searchTerm,
        page,
        append,
        hasData: !!result.data,
        dataLength: result.data?.length || 0,
        hasMore: result.hasMore,
        count: result.count
      });
      
      // Handle different response formats
      if (Array.isArray(result)) {
        // Array response format
        setHasMoreResults(result.length >= pageSize);
        setSearchResults(prev => append ? [...prev, ...result] : result);
      } else if (result.data && Array.isArray(result.data)) {
        // Object with data array response format
        setHasMoreResults(result.hasMore === true);
        setSearchResults(prev => append ? [...prev, ...result.data] : result.data);
      } else {
        // Unknown format
        console.error(`[Request #${requestId}] Unexpected API response format:`, result);
        setSearchResults([]);
        setHasMoreResults(false);
      }
      
    } catch (error) {
      // Only show errors for the most recent request
      if (requestId === lastRequestIdRef.current) {
        console.error(`[Request #${requestId}] Error fetching clients:`, error);
        toast.error("No se pudieron cargar los clientes");
        setSearchResults([]);
        setHasMoreResults(false);
      }
    } finally {
      // Only update loading state for the most recent request
      if (requestId === lastRequestIdRef.current) {
        setIsSearching(false);
      }
    }
  }, [toast, pageSize]);

  // Replace with debounced search
  const debouncedFetchClients = useCallback(
    debounce((term: string, page: number, append: boolean) => {
      fetchClients(term, page, append);
    }, 300),
    [fetchClients]
  );

  // Handler for search term changes with debounce
  const handleSearchTermChange = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(0);
    setIsDebouncing(true);
    
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set a flag to indicate we're waiting for debounce
    setIsDebouncing(true);
    
    // Use the debounced function
    debouncedFetchClients(value, 0, false).then(() => {
      setIsDebouncing(false);
    });
  }, [debouncedFetchClients]);

  // Handle scroll to load more results
  const handleScroll = useCallback(() => {
    if (listRef.current && !isSearching && hasMoreResults) {
      const { scrollTop, scrollHeight, clientHeight } = listRef.current;
      
      // When user has scrolled to the bottom (or near bottom)
      if (scrollTop + clientHeight >= scrollHeight - 50) {
        console.log('Near bottom, loading more results');
        setCurrentPage(prevPage => {
          const nextPage = prevPage + 1;
          fetchClients(searchTerm, nextPage, true);
          return nextPage;
        });
      }
    }
  }, [fetchClients, hasMoreResults, isSearching, searchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setComboboxOpen(false);
      }
    };

    if (comboboxOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [comboboxOpen]);

  // Attach scroll listener to the results list
  useEffect(() => {
    const currentListRef = listRef.current;
    
    if (comboboxOpen && currentListRef) {
      currentListRef.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (currentListRef) {
        currentListRef.removeEventListener('scroll', handleScroll);
      }
    };
  }, [comboboxOpen, handleScroll]);

  // Initial fetch when combobox opens - don't use search term here
  useEffect(() => {
    if (comboboxOpen) {
      setCurrentPage(0);
      setHasMoreResults(true);
      // Only fetch all clients if search term is empty
      if (!searchTerm) {
        fetchClients("", 0, false);
      }
    }
  }, [comboboxOpen, fetchClients]);

  // Define a more readable validation error message
  const getErrorMessage = (field: string) => {
    if (errors[field as keyof FormErrors] && touched[field]) {
      return errors[field as keyof FormErrors];
    }
    return undefined;
  };

  // Define button styles for better mobile experience
  const tabButtonClass = (isActive: boolean) => cn(
    "px-4 py-3 text-sm font-medium relative transition-colors",
    isActive 
      ? "text-emerald-600 border-b-2 border-emerald-500" 
      : "text-gray-500 hover:text-gray-700"
  );

  return (
    <div className="space-y-6">
      <div>
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => handleTabChange('buscar')}
            className={tabButtonClass(activeTab === 'buscar')}
          >
            Buscar Existente
          </button>
          <button
            onClick={() => handleTabChange('nuevo')}
            className={tabButtonClass(activeTab === 'nuevo')}
          >
            Nuevo Cliente
          </button>
        </div>
        
        {/* Buscar Tab */}
        {activeTab === 'buscar' && (
          <div>
            {/* Cliente search with improved styling */}
            <div className="relative w-full">
              <div 
                className="flex items-center border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500"
                onClick={() => setComboboxOpen(true)}
              >
                <Search className="h-5 w-5 text-gray-400 mr-2" />
                <input
                  type="text"
                  placeholder="Buscar cliente por nombre, teléfono o correo"
                  className="flex-1 outline-none text-sm"
                  value={searchTerm}
                  onChange={(e) => handleSearchTermChange(e.target.value)}
                  onFocus={() => setComboboxOpen(true)}
                />
              </div>

              {comboboxOpen && (
                <div 
                  ref={dropdownRef}
                  className="absolute z-30 mt-1 w-full bg-white rounded-md shadow-lg max-h-80 overflow-auto focus:outline-none border border-gray-200"
                >
                  <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
                    <div className="flex items-center px-4 py-2">
                      <Search className="h-4 w-4 text-gray-400 mr-2" />
                      <input
                        type="text"
                        placeholder="Buscar cliente por nombre, teléfono o correo"
                        className="flex-1 outline-none text-sm py-1"
                        value={searchTerm}
                        onChange={(e) => handleSearchTermChange(e.target.value)}
                        autoFocus
                      />
                      <button 
                        onClick={() => setComboboxOpen(false)}
                        className="ml-2 text-gray-400 hover:text-gray-500 focus:outline-none"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div ref={listRef} className="px-1 py-2 max-h-60 overflow-y-auto">
                    {(isSearching || isDebouncing) && searchResults.length === 0 ? (
                      <div className="px-4 py-2 text-sm text-gray-500 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span>{isDebouncing ? "Esperando para buscar..." : "Buscando clientes..."}</span>
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <p className="text-sm text-gray-500 mb-4">No se encontraron clientes</p>
                        {searchTerm.trim() !== '' && (
                          <div className="text-center text-sm text-amber-600 mt-2 p-2 bg-amber-50 rounded-md border border-amber-200">
                            <p>Para crear un nuevo cliente, ve a la pestaña <strong>Nuevo</strong> y completa los datos.</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        {searchResults.map((cliente, index) => (
                          <div
                            key={`${cliente.cliente_id}-${index}`}
                            className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100 rounded-md mx-1 group transition-colors"
                            onClick={() => handleClienteClick(cliente)}
                          >
                            <div className="flex items-center">
                              <User className="flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-emerald-500 mr-3" />
                              <div className="flex-1 truncate">
                                <div className="flex">
                                  <span className="truncate font-medium text-gray-900">
                                    {searchTerm && searchTerm.length > 1
                                      ? highlightMatch(cliente.nombre, searchTerm)
                                      : cliente.nombre}
                                  </span>
                                  {formData.cliente_id && formData.cliente_id === cliente.cliente_id.toString() && (
                                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-emerald-600">
                                      <Check className="h-5 w-5" />
                                    </span>
                                  )}
                                </div>
                                <div className="flex text-xs text-gray-500 mt-0.5">
                                  <span className="truncate">{cliente.celular}</span>
                                  {cliente.correo && (
                                    <>
                                      <span className="mx-1">•</span>
                                      <span className="truncate">{cliente.correo}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {(isSearching || isDebouncing) && hasMoreResults && (
                          <div className="px-4 py-2 text-sm text-gray-500 flex items-center justify-center">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span>{isDebouncing ? "Esperando para buscar..." : "Cargando más resultados..."}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="p-2 border-t flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setComboboxOpen(false)}
                      className="h-9 px-4 text-sm font-medium"
                    >
                      Cerrar
                    </Button>
                  </div>
                </div>
              )}
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
          <PhoneInput
            country={'mx'}
            value={formData.celular}
            onChange={handlePhoneChange}
            onBlur={() => handleBlur('celular')}
            inputProps={{
              name: 'celular',
              required: true,
              disabled: !formData.cliente_id && activeTab !== 'nuevo',
              placeholder: "Número de teléfono"
            }}
            containerClass={touched.celular && errors.celular ? 'error' : ''}
            enableSearch={true}
            disableSearchIcon={false}
            preferredCountries={['mx', 'us', 'ca']}
            searchPlaceholder="Buscar país..."
          />
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
        
        {/* Action buttons - organized in a consistent grid */}
        <div className="md:col-span-2 mt-6 space-y-4">
          {!formData.cliente_id ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => setComboboxOpen(true)}
                variant="outline"
                size="action"
                className="w-full sm:w-auto"
              >
                <Search className="h-4 w-4 mr-2" />
                Buscar Cliente
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
              <Button
                variant="outline"
                size="action"
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
                  
                  // Explicitly notify parent that client was cleared
                  safeNotifyParent(null);
                  
                  setComboboxOpen(true);
                }}
                className="w-full sm:w-auto"
              >
                <Search className="h-4 w-4 mr-2" />
                Cambiar cliente
              </Button>
              
              <Button
                type="button"
                onClick={handleUpdateClient}
                disabled={isSearching || !formData.nombre || !formData.celular || Object.keys(errors).length > 0}
                variant="default"
                size="action"
                className="w-full sm:w-auto"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    <span>Actualizando...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    <span>Actualizar Cliente</span>
                  </>
                )}
              </Button>
            </div>
          )}

          {!formData.cliente_id && searchResults.length === 0 && !isSearching && searchTerm.length > 0 && (
            <div className="border border-amber-300 bg-amber-50 p-4 rounded-md mt-4 text-sm">
              <p className="font-medium text-amber-800 mb-2">No se encontraron clientes con ese nombre</p>
              <p className="text-amber-700">Para crear un nuevo cliente, utiliza la pestaña "Nuevo" y completa los datos necesarios.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Keep the default export for backward compatibility
export default ClienteForm;