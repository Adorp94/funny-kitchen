"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, FilePlus, Sparkles, Database, ListChecks, FileText, LucideGithub } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-teal-500 to-teal-700 text-white py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="md:w-1/2 mb-10 md:mb-0">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Cotizaciones simples para tu cocina
              </h1>
              <p className="text-xl mb-8 text-teal-100">
                Una herramienta optimizada para crear cotizaciones de cocinas y muebles de manera rápida y sencilla.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/nueva-cotizacion">
                  <Button size="lg" className="bg-white text-teal-700 hover:bg-teal-50 w-full sm:w-auto">
                    <FilePlus className="mr-2 h-5 w-5" />
                    Nueva Cotización
                  </Button>
                </Link>
                <Link href="https://github.com/adolfojmnz/funny-kitchen" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-teal-600 w-full sm:w-auto">
                    <LucideGithub className="mr-2 h-5 w-5" />
                    Ver en GitHub
                  </Button>
                </Link>
              </div>
            </div>
            <div className="md:w-5/12">
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div 
                  className="w-full h-[250px] bg-gradient-to-br from-teal-100 to-teal-300 flex items-center justify-center"
                >
                  <span className="text-teal-700 font-medium">Funny Kitchen</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">Características</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mb-4">
                <ListChecks className="h-6 w-6 text-teal-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-800">Formulario de Cliente</h3>
              <p className="text-gray-600">
                Captura información del cliente con validación de campos para asegurar datos correctos.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mb-4">
                <Database className="h-6 w-6 text-teal-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-800">Productos Personalizados</h3>
              <p className="text-gray-600">
                Agrega y administra productos con precios en diferentes monedas para tu cotización.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-teal-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-800">Resumen Detallado</h3>
              <p className="text-gray-600">
                Obtén un resumen completo de la cotización con todos los detalles del cliente y productos.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 px-4 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-block p-2 bg-teal-100 rounded-full mb-4">
            <Sparkles className="h-6 w-6 text-teal-600" />
          </div>
          <h2 className="text-3xl font-bold mb-4 text-gray-800">
            Empieza a crear cotizaciones ahora
          </h2>
          <p className="text-lg mb-8 text-gray-600">
            Simplifique el proceso de cotización para sus proyectos de cocina y muebles con nuestra herramienta fácil de usar.
          </p>
          <Link href="/nueva-cotizacion">
            <Button size="lg" className="bg-teal-600 hover:bg-teal-700 text-white">
              Crear Mi Primera Cotización
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}