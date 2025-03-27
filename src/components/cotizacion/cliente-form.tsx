"use client";

import { useState, useEffect } from 'react';
import { Mail, Phone, User } from 'lucide-react';
import { FormControl, FormLabel } from '../ui/form';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import 'react-phone-number-input/style.css';
import PhoneInput from 'react-phone-number-input/input';
import { toast } from "react-hot-toast";

// Match the database schema exactly
interface Cliente {
  cliente_id: number;
  nombre: string;
  celular: string;
  correo: string | null;
  tipo_cliente: string | null;
  atencion: string | null;
}

// Form data interface with string cliente_id for form handling
interface ClienteFormData {
  cliente_id: string;
  nombre: string;
  celular: string;
  correo: string;
  tipo_cliente: string;
  atencion: string;
}

interface ClienteFormProps {
  clienteId?: number;
  onClienteChange?: (cliente: Cliente | null) => void;
}

export function ClienteForm({ clienteId, onClienteChange }: ClienteFormProps) {
  const [activeTab, setActiveTab] = useState<string>("nuevo");
  const [formDataChanged, setFormDataChanged] = useState<boolean>(false);
  const [initialized, setInitialized] = useState<boolean>(false);

  const [formData, setFormData] = useState<ClienteFormData>({
    cliente_id: "",
    nombre: "",
    celular: "",
    correo: "",
    tipo_cliente: "Normal",
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
  const safeNotifyParent = (cliente: Cliente | null) => {
    if (onClienteChange) {
      // Use setTimeout to move the state update out of the render cycle
      setTimeout(() => {
        onClienteChange(cliente);
      }, 0);
    }
  };

  // Update this useEffect to handle parent notification when form data changes
  useEffect(() => {
    // Only notify parent when we have a complete form AND form data has changed
    if (formDataChanged) {
      // Check that we have required fields based on the active tab
      if (activeTab === 'nuevo' && formData.nombre && formData.celular) {
        safeNotifyParent(formDataToCliente(formData));
      } else if (activeTab === 'existente' && formData.cliente_id) {
        safeNotifyParent(formDataToCliente(formData));
      }
      
      // Reset the changed flag after handling
      setFormDataChanged(false);
    }
  }, [formData, formDataChanged, activeTab]);

  // Convert form data to Cliente object for parent component
  const formDataToCliente = (data: ClienteFormData): Cliente => {
    return {
      cliente_id: data.cliente_id ? parseInt(data.cliente_id) : 0,
      nombre: data.nombre,
      celular: data.celular,
      correo: data.correo || null,
      tipo_cliente: data.tipo_cliente || null,
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
      
      // Just mark data as changed, don't notify directly
      setFormDataChanged(true);
      return newData;
    });
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
          <div className="py-10 text-center">
            <p className="text-gray-500">En la versión simplificada, por favor usa la pestaña "Nuevo" para ingresar datos del cliente.</p>
            <p className="text-gray-500 mt-2">La búsqueda de clientes existentes estará disponible en la próxima versión.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Keep the default export for backward compatibility
export default ClienteForm;