"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, User, Receipt, Save } from "lucide-react";
import { ClienteForm } from "@/components/cotizacion/cliente-form";

// Match the interface with ClienteForm component
interface Cliente {
  cliente_id: number;
  nombre: string;
  celular: string;
  correo: string | null;
  tipo_cliente: string | null;
  atencion: string | null;
}

export default function NuevaCotizacionPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<number>(1);
  
  // State for cliente
  const [clienteData, setClienteData] = useState<Cliente | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Use effect to update cliente state after render
  useEffect(() => {
    if (clienteData) {
      setCliente(clienteData);
    }
  }, [clienteData]);
  
  // Add a useEffect to preserve client data when navigating between steps
  useEffect(() => {
    // Save client data to sessionStorage whenever it changes
    if (cliente) {
      sessionStorage.setItem('cotizacion_cliente', JSON.stringify(cliente));
    }
  }, [cliente]);

  // Add a useEffect to load any previously saved client data on component mount
  useEffect(() => {
    // Try to load any saved client data from sessionStorage
    const savedCliente = sessionStorage.getItem('cotizacion_cliente');
    if (savedCliente && !cliente) {
      try {
        const parsedCliente = JSON.parse(savedCliente);
        setClienteData(parsedCliente);
        setCliente(parsedCliente);
      } catch (e) {
        console.error("Error parsing saved client data:", e);
      }
    }
  }, []);
  
  // Navigate to next step
  const nextStep = () => {
    if (activeStep === 1 && !cliente) {
      toast.error("Por favor, ingresa la información del cliente");
      return;
    }
    
    setActiveStep(prev => Math.min(prev + 1, 2));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Navigate to previous step
  const prevStep = () => {
    setActiveStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle form submission (simplified version)
  const handleGenerateCotizacion = async () => {
    if (!cliente) {
      toast.error("Por favor, ingresa la información del cliente");
      return;
    }
    
    setIsLoading(true);

    try {
      // In a simplified version, just show a success message
      setTimeout(() => {
        // Clear session storage 
        sessionStorage.removeItem('cotizacion_cliente');
        sessionStorage.removeItem('cotizacion_clienteForm');
        
        setIsLoading(false);
        router.push('/');
        toast.success("¡Cotización generada con éxito!");
      }, 1500);
    } catch (error) {
      console.error('Error generating quotation:', error);
      setIsLoading(false);
      toast.error("Error al generar la cotización");
    }
  };
  
  // Get CSS classes for step indicator
  const getStepClasses = (step: number) => {
    if (step < activeStep) {
      return "text-white bg-teal-500 ring-teal-500"; // completed
    } else if (step === activeStep) {
      return "text-teal-600 bg-white ring-teal-500"; // current
    } else {
      return "text-gray-400 bg-white ring-gray-200"; // upcoming
    }
  };
  
  return (
    <div className="py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col items-center mb-12">
          <h1 className="text-2xl font-medium text-gray-900 mb-10">Nueva Cotización (Versión Simplificada)</h1>
          
          {/* Step indicators */}
          <div className="flex w-full max-w-md justify-between relative">
            {/* Progress bar */}
            <div className="absolute top-4 left-0 w-full h-0.5 bg-gray-200">
              <div 
                className="absolute h-0.5 bg-teal-500 transition-all duration-500" 
                style={{ width: `${(activeStep - 1) * 100}%` }}
              ></div>
            </div>
            
            {/* Step 1 */}
            <div className="flex flex-col items-center relative z-10">
              <button 
                onClick={() => setActiveStep(1)}
                className={`
                  h-9 w-9 rounded-full ring-2 flex items-center justify-center
                  transition-all duration-200 font-medium text-sm
                  ${getStepClasses(1)}
                `}
              >
                1
              </button>
              <span className="mt-2 text-sm font-medium text-gray-700">Cliente</span>
            </div>
            
            {/* Step 2 */}
            <div className="flex flex-col items-center relative z-10">
              <button 
                onClick={() => cliente && setActiveStep(2)}
                className={`
                  h-9 w-9 rounded-full ring-2 flex items-center justify-center
                  transition-all duration-200 font-medium text-sm
                  ${getStepClasses(2)}
                `}
              >
                2
              </button>
              <span className="mt-2 text-sm font-medium text-gray-700">Finalizar</span>
            </div>
          </div>
        </div>
        
        {/* Step content */}
        <div className="space-y-6">
          {/* Step 1: Cliente */}
          {activeStep === 1 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100">
                <div className="flex items-center">
                  <User className="h-5 w-5 text-teal-600 mr-2" />
                  <h2 className="text-lg font-medium text-gray-900">Información del Cliente</h2>
                </div>
              </div>
              <div className="p-6">
                <ClienteForm onClienteChange={setClienteData} />
              </div>
              <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t border-gray-100">
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/')}
                  className="text-gray-600 border-gray-300"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={nextStep} 
                  disabled={!cliente} 
                  className="bg-teal-500 hover:bg-teal-600 text-white px-5"
                >
                  Continuar <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          
          {/* Step 2: Resumen y Finalizar */}
          {activeStep === 2 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100">
                <div className="flex items-center">
                  <Receipt className="h-5 w-5 text-teal-600 mr-2" />
                  <h2 className="text-lg font-medium text-gray-900">Resumen de la Cotización</h2>
                </div>
              </div>
              <div className="p-6">
                {/* Client Info */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-gray-700 mb-3">Información del Cliente</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex">
                      <span className="text-gray-500 w-20">Nombre:</span>
                      <span className="font-medium text-gray-900">{cliente?.nombre}</span>
                    </li>
                    <li className="flex">
                      <span className="text-gray-500 w-20">Teléfono:</span>
                      <span className="font-medium text-gray-900">{cliente?.celular}</span>
                    </li>
                    {cliente?.correo && (
                      <li className="flex">
                        <span className="text-gray-500 w-20">Correo:</span>
                        <span className="font-medium text-gray-900">{cliente?.correo}</span>
                      </li>
                    )}
                    {cliente?.atencion && (
                      <li className="flex">
                        <span className="text-gray-500 w-20">Atención:</span>
                        <span className="font-medium text-gray-900">{cliente?.atencion}</span>
                      </li>
                    )}
                  </ul>
                  <Button 
                    variant="ghost" 
                    className="text-teal-600 p-0 h-auto mt-3 text-xs" 
                    onClick={() => setActiveStep(1)}
                  >
                    Editar cliente
                  </Button>
                </div>
                
                <div className="text-center py-6">
                  <p className="text-gray-500 mb-4">
                    Esta es una versión simplificada. En la versión completa, aquí verías los productos y las opciones de cotización.
                  </p>
                </div>
              </div>
              <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t border-gray-100">
                <Button 
                  variant="outline" 
                  onClick={prevStep}
                  className="text-gray-600 border-gray-300"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Regresar
                </Button>
                <Button 
                  onClick={handleGenerateCotizacion}
                  disabled={isLoading || !cliente}
                  className="bg-teal-500 hover:bg-teal-600 text-white px-5"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generando...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      Generar Cotización <Save className="ml-2 h-4 w-4" />
                    </span>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
