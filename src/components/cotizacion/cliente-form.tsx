"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle, Search, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from "@/lib/utils";
import { type Cliente } from "@/lib/supabase"; // Use type import for interfaces
import { Value as PhoneNumberValue } from 'react-phone-number-input';
import { PhoneInput } from '@/components/ui/phone-input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Highlighting function (Corrected)
const highlightMatch = (text: string, query: string): React.ReactNode => {
  if (!query || !text) {
    return text;
  }
  // Escape regex special characters in the query
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!escapedQuery) { // Avoid creating an empty regex group
    return text;
  }
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
  return parts.map((part, index) => {
    if (part.toLowerCase() === query.toLowerCase()) {
      return (
        <mark
          key={index}
          className="bg-yellow-200 dark:bg-yellow-700 px-0 py-0 font-semibold rounded"
        >
          {part}
        </mark>
      );
    } else {
      return part;
    }
  });
};

// Helper function to format E.164 to storage format
const formatPhoneNumberForStorage = (phoneNumber: string | undefined): string => {
  if (!phoneNumber) return '';
  const cleaned = phoneNumber.replace(/[^\d+]/g, ''); 
  let digits = cleaned.startsWith('+') ? cleaned.substring(1) : cleaned;
  if (!digits.startsWith('52')) {
    if (digits.length === 10) {
      digits = '52' + digits;
    } else {
      return digits; 
    }
  }
  if (digits.length === 12) {
    const cc = digits.substring(0, 2); 
    const area = digits.substring(2, 4);
    const part1 = digits.substring(4, 8);
    const part2 = digits.substring(8, 12);
    return `${cc} ${area} ${part1} ${part2}`; 
  } else {
    return digits;
  }
};

// Helper function to normalize storage format back to E.164 for the input
const normalizePhoneNumberToE164 = (phoneNumber: string | undefined): string => {
  if (!phoneNumber) return '';
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  // If it starts with country code (e.g., 52) and has the right length, add '+'
  if (digits.startsWith('52') && digits.length === 12) {
    return `+${digits}`;
  }
  // Basic check for 10 digits (assume MX local), prepend +52
  if (digits.length === 10) {
    return `+52${digits}`;
  }
  // If it already looks like E.164, return as is
  if (phoneNumber.startsWith('+') && digits.length > 5) { // Basic E.164 check
      return phoneNumber;
  }
  // Fallback: return EMPTY string if it cannot be normalized
  return ''; 
};

interface ClienteFormProps {
  onClientSelect: (cliente: Cliente | null, needsCreation?: boolean) => void; // Pass creation flag separately
  initialData?: Partial<Cliente>;
  mode: 'search' | 'create';
  onModeChange: (mode: 'search' | 'create') => void;
}

export function ClienteForm({
  onClientSelect,
  initialData = {},
  mode,
  onModeChange
}: ClienteFormProps) {
  const initialTab: 'buscar' | 'crear' = mode === 'create' ? 'crear' : 'buscar';
  const [activeTab, setActiveTab] = useState<'buscar' | 'crear'>(initialTab);
  const [formData, setFormData] = useState<Partial<Cliente>>(initialData);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false); // State for Popover

  // Sync active tab with mode prop
  useEffect(() => {
    const newTabValue: 'buscar' | 'crear' = mode === 'create' ? 'crear' : 'buscar';
    setActiveTab(newTabValue);
  }, [mode]);

  // Sync formData with initialData when it changes
  useEffect(() => {
    const initialClient = initialData.cliente_id 
        ? searchResults.find(c => c.cliente_id === initialData.cliente_id) ?? (initialData as Cliente)
        : (initialData as Cliente);

    // IMPORTANT: Normalize phone number from initialData before setting formData
    const normalizedInitialData = {
        ...initialClient,
        celular: normalizePhoneNumberToE164(initialClient.celular)
    };

    setFormData(normalizedInitialData); // Use normalized data

    if (initialClient?.cliente_id) {
      setSelectedClient(initialClient); // Keep original client for display/selection logic if needed
      setSearchTerm(''); 
      setSearchResults([]);
    } else if (selectedClient) {
      setSelectedClient(null);
      setSearchTerm('');
      setSearchResults([]);
      fetchClientes('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]); // Keep dependency only on initialData

  // Fetch function using useCallback
  const fetchClientes = useCallback(async (query: string) => {
    setError(null);
    setIsLoading(true);
    console.log(`Fetching clients with query: "${query}"`); // Log fetch start

    try {
      const response = await fetch(`/api/clientes?search=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        let errorBody = 'Error buscando clientes';
        try {
          const errorData = await response.json();
          errorBody = errorData.error || errorData.message || JSON.stringify(errorData);
        } catch (parseError) {
          errorBody = `HTTP error ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorBody);
      }

      const data = await response.json();
      // Ensure data.clientes is an array, use data.data as fallback if structure is different
      const fetchedClientes = Array.isArray(data?.clientes) 
          ? data.clientes 
          : Array.isArray(data?.data) ? data.data : []; 
      
      console.log("Fetched clients:", fetchedClientes); // Log fetched data
      setSearchResults(fetchedClientes);
      
      if (query && fetchedClientes.length === 0) {
          setError('No se encontraron clientes.');
      } else if (!query && fetchedClientes.length === 0) {
         // Don't set an error if the initial fetch returns empty, maybe just indicate no clients yet
         setError('No hay clientes registrados aún.'); // Or null if preferred
      }

    } catch (err: any) {
      console.error("Fetch Client Error:", err);
      setError(err.message || 'Error al cargar clientes');
      setSearchResults([]); 
    } finally {
      setIsLoading(false);
      console.log("Finished fetching clients."); // Log fetch end
    }
  }, []); // Keep fetchClientes stable

  // Fetch initial list when component mounts and is in 'buscar' mode
  useEffect(() => {
      if (activeTab === 'buscar') {
          console.log("Initial fetch triggered by mount/tab");
          fetchClientes('');
      }
  }, [activeTab, fetchClientes]); // fetchClientes is stable due to useCallback

  // Search Input Change Handler (for CommandInput)
  const handleSearchInputChange = (value: string) => {
    setSearchTerm(value);
    // Don't clear selection here, let the user explicitly deselect if needed
    // setSelectedClient(null); 
    // onClientSelect(null);   
    fetchClientes(value); // Fetch based on the new search term
  };

  // Client Selection Handler (for CommandItem onSelect)
  const handleClientSelection = (clientIdString: string) => {
      console.log("handleClientSelection called with:", clientIdString);
      setPopoverOpen(false); // Close Popover on selection
      
      // Find the client from the current searchResults
      // Need to use toString() for comparison as CommandItem value is string
      const selected = searchResults.find((cliente) => cliente.cliente_id.toString() === clientIdString);
      
      if (selected) {
          console.log("Client selected:", selected);
          setSelectedClient(selected);
          setSearchTerm(selected.nombre); // Update search input display text
          onClientSelect(selected, false); // Notify parent
          setError(null);
      } else {
          console.warn("Selected client ID not found in search results:", clientIdString);
          // Clear selection if the selected ID wasn't found (shouldn't normally happen)
          setSelectedClient(null);
          setSearchTerm(""); // Clear search text
          onClientSelect(null); // Notify parent
          setError("Error al seleccionar cliente.");
      }
  };

  // Tab Change Handler
  const handleTabChange = (value: string) => {
    const newTab = value as 'buscar' | 'crear';
    setActiveTab(newTab);
    const newModeForParent: 'search' | 'create' = newTab === 'crear' ? 'create' : 'search';
    onModeChange(newModeForParent);

    setSearchTerm(''); // Clear search term
    setSelectedClient(null); // Clear selected client
    onClientSelect(null); // Notify parent
    setError(null); // Clear errors

    if (newTab === 'crear' && !initialData?.nombre) {
        setFormData({}); // Reset form data only if creating and no initial data
    } else if (newTab === 'buscar') {
        // Fetch initial list when switching to search tab explicitly
        console.log("Fetch triggered by tab change to 'buscar'");
        fetchClientes(''); 
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: Partial<Cliente>) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev: Partial<Cliente>) => ({ ...prev, tipo_cliente: value }));
  };

  const handlePhoneChange = (value: PhoneNumberValue | undefined) => {
    // Store the raw E.164 value (or empty string) from the input
    setFormData((prev: Partial<Cliente>) => ({ ...prev, celular: value || '' }));
  };

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || !formData.celular) {
      setError("Nombre y celular son requeridos para crear un cliente.");
      return;
    }
    setError(null);
    
    // Format the E.164 number from state ONLY for sending up
    const formattedCelular = formatPhoneNumberForStorage(formData.celular as string);
    
    // Initialize the object ensuring all fields required by Cliente type are present
    const newClientData: Cliente = {
      cliente_id: 0, 
      nombre: formData.nombre.trim().toUpperCase(), 
      celular: formattedCelular, // Use FORMATTED number here
      correo: formData.correo || null,
      razon_social: formData.razon_social || null,
      rfc: formData.rfc || null,
      atencion: formData.atencion || null,
      direccion_envio: formData.direccion_envio || null,
      recibe: formData.recibe || null,
      tipo_cliente: formData.tipo_cliente || null,
    };

    console.log("Creating client with formatted data:", newClientData);
    onClientSelect(newClientData, true);
  };

  // Get the currently selected client's ID as a string for the Popover value
  const selectedClientIdString = selectedClient ? selectedClient.cliente_id.toString() : "";

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="buscar">Buscar Cliente Existente</TabsTrigger>
        <TabsTrigger value="crear">Crear Nuevo Cliente</TabsTrigger>
      </TabsList>

      <TabsContent value="buscar" className="mt-4 border-t pt-4">
        {/* Display selected client info if one IS selected */} 
        {selectedClient ? (
          <div className="p-4 border rounded-md bg-gray-50 dark:bg-gray-800 space-y-1">
            <p className="font-medium">{selectedClient.nombre}</p>
            {selectedClient.razon_social && <p className="text-sm text-gray-600 dark:text-gray-400">{selectedClient.razon_social}</p>}
            {selectedClient.rfc && <p className="text-sm text-gray-600 dark:text-gray-400">RFC: {selectedClient.rfc}</p>}
            <p className="text-sm text-gray-600 dark:text-gray-400">{selectedClient.celular} {selectedClient.correo ? `| ${selectedClient.correo}` : ''}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => { // Clear selection logic
                setSelectedClient(null);
                setSearchTerm('');
                setSearchResults([]);
                onClientSelect(null);
                setError(null);
                fetchClientes(''); // Fetch initial list again after clearing
              }}
            >
              Buscar Otro Cliente
            </Button>
          </div>
        ) :
        /* Show Popover + Command for searching if NO client is selected */
        (
          <div className="space-y-2">
            <Label htmlFor="cliente-search-combobox">Buscar Cliente</Label>
            <Popover open={popoverOpen} onOpenChange={(open) => {
                setPopoverOpen(open);
                // Fetch initial results when opening the popover if search is empty
                if (open && !searchTerm) {
                   console.log("Fetch triggered by popover open");
                   fetchClientes('');
                }
            }}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={popoverOpen}
                  className="w-full justify-between text-sm" // Ensure w-full
                  id="cliente-search-combobox" // Add id for label association
                >
                  {selectedClient
                    ? (selectedClient as Cliente).nombre // Explicit cast to Cliente
                    : "Buscar por nombre, RFC..."} 
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="p-0" // Keep width rules off content
                side="bottom" // Explicitly set side
                align="start" // Keep align start for now
                sideOffset={4} 
                collisionPadding={8} // Add collision padding
                style={{ width: 'var(--radix-popover-trigger-width)' }} // Try applying width via style prop
              >
                <Command 
                  shouldFilter={false} 
                  className="w-full" // Keep w-full on Command
                >
                  <CommandInput 
                    placeholder="Escribe para buscar..." 
                    value={searchTerm}
                    onValueChange={handleSearchInputChange} // Use our handler
                  />
                  <CommandList>
                    {isLoading && (
                       <div className="p-4 py-6 text-center text-sm flex items-center justify-center text-muted-foreground">
                         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                         Buscando...
                       </div>
                     )}
                    {!isLoading && searchResults.length === 0 && (
                       <CommandEmpty>{error || 'No se encontraron clientes.'}</CommandEmpty>
                     )}
                    {!isLoading && searchResults.length > 0 && (
                      <CommandGroup>
                        {searchResults.map((cliente) => (
                          <CommandItem
                            key={cliente.cliente_id}
                            value={cliente.cliente_id.toString()} // Use ID as value
                            onSelect={handleClientSelection} // Use correct selection handler
                            className="text-sm"
                          >
                             <Check
                               className={cn(
                                 "mr-2 h-4 w-4",
                                 selectedClientIdString === cliente.cliente_id.toString() ? "opacity-100" : "opacity-0"
                               )}
                             />
                            {/* Display name and maybe RFC */}
                            {cliente.nombre} {cliente.rfc ? `(${cliente.rfc})` : ''}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {/* Display error message below combobox if not loading and error exists outside the popover */}
            {!isLoading && error && searchResults.length === 0 && (
                <p className="text-sm text-red-600 px-1 pt-1">{error}</p>
            )}
          </div>
        )}
      </TabsContent>

      <TabsContent value="crear" className="mt-4 border-t pt-4">
        <form onSubmit={handleCreateClient} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre Completo*</Label>
              <Input id="nombre" name="nombre" value={formData.nombre || ''} onChange={handleInputChange} required placeholder="Ej: Juan Pérez García" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="celular-create">Celular <span className="text-destructive">*</span></Label>
              <PhoneInput
                id="celular-create"
                name="celular"
                value={formData.celular as PhoneNumberValue} // Should be E.164
                onChange={handlePhoneChange} // Receives E.164
                placeholder="Celular"
                defaultCountry="MX"
                className="w-full"
                // Add required attribute for basic HTML validation
                required 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="correo">Correo Electrónico</Label>
              <Input id="correo" name="correo" type="email" value={formData.correo || ''} onChange={handleInputChange} placeholder="ejemplo@correo.com" />
            </div>
             <div className="space-y-2">
              <Label htmlFor="tipo_cliente">Tipo Cliente</Label>
              <Select name="tipo_cliente" value={formData.tipo_cliente || 'Normal'} onValueChange={handleSelectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Distribuidor">Distribuidor</SelectItem>
                  <SelectItem value="Gobierno">Gobierno</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="razon_social">Razón Social</Label>
              <Input id="razon_social" name="razon_social" value={formData.razon_social || ''} onChange={handleInputChange} placeholder="Nombre de la empresa (si aplica)" />
            </div>
             <div className="space-y-2">
              <Label htmlFor="rfc">RFC</Label>
              <Input id="rfc" name="rfc" value={formData.rfc || ''} onChange={handleInputChange} placeholder="Registro Federal de Contribuyentes" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="direccion_envio">Dirección de Envío Completa</Label>
            <Textarea id="direccion_envio" name="direccion_envio" value={formData.direccion_envio || ''} onChange={handleInputChange} placeholder="Calle, Número, Colonia, CP, Ciudad, Estado" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
              <Label htmlFor="recibe">Recibe</Label>
              <Input id="recibe" name="recibe" value={formData.recibe || ''} onChange={handleInputChange} placeholder="Persona que recibe el pedido" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="atencion">Atención</Label>
              <Input id="atencion" name="atencion" value={formData.atencion || ''} onChange={handleInputChange} placeholder="Persona de contacto principal" />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit">Crear y Usar Cliente</Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}