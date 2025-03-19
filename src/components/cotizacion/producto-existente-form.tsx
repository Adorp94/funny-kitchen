"use client";

import { useState, useEffect, useRef } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/cart-context";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabase/client";

type Producto = {
  id: string;
  sku: string;
  nombre: string;
  capacidad?: string | null;
  unidad?: string | null;
  precio?: number | null;
};

export function ProductoExistenteForm() {
  const [searchTerm, setSearchTerm] = useState("");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [colores, setColores] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [descuento, setDescuento] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { addToCart } = useCart();

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

  // Fetch products on mount
  useEffect(() => {
    const fetchProductos = async () => {
      try {
        setLoading(true);
        
        // Use Supabase client to fetch actual products
        const { data, error } = await supabase
          .from('productos')
          .select('*')
          .order('nombre');
        
        if (error) {
          throw error;
        }
        
        // Map the data to match our Producto type
        const formattedProducts = data?.map(product => ({
          id: product.producto_id.toString(),
          sku: product.sku || '',
          nombre: product.nombre || '',
          capacidad: product.capacidad,
          unidad: product.unidad,
          precio: product.precio || 0
        })) || [];
        
        console.log('Fetched products from Supabase:', formattedProducts);
        
        // If we have data from Supabase, use it, otherwise fall back to mock data
        if (formattedProducts.length > 0) {
          setProductos(formattedProducts);
        } else {
          // Fallback to mock data
          const mockProductos: Producto[] = [
            { id: "1", sku: "FK-001", nombre: "Gabinete de cocina", capacidad: null, unidad: null, precio: 5000 },
            { id: "2", sku: "FK-002", nombre: "Isla central", capacidad: null, unidad: null, precio: 8500 },
            { id: "3", sku: "FK-003", nombre: "Alacena superior", capacidad: null, unidad: null, precio: 3200 },
            { id: "4", sku: "FK-004", nombre: "Barra desayunadora", capacidad: null, unidad: null, precio: 6000 },
            { id: "5", sku: "FK-005", nombre: "Cajones organizadores", capacidad: null, unidad: "set", precio: 1800 },
            { id: "6", sku: "FK-006", nombre: "Mueble para fregadero", capacidad: null, unidad: null, precio: 4500 },
            { id: "7", sku: "FK-007", nombre: "Mueble para horno", capacidad: null, unidad: null, precio: 3800 },
            { id: "8", sku: "FK-008", nombre: "Alacena para especias", capacidad: null, unidad: null, precio: 2200 },
            { id: "9", sku: "FK-009", nombre: "Estante abierto", capacidad: null, unidad: null, precio: 1500 },
            { id: "10", sku: "FK-010", nombre: "Mueble para microondas", capacidad: null, unidad: null, precio: 2800 },
            { id: "11", sku: "FK-011", nombre: "Gabinete alto", capacidad: null, unidad: null, precio: 3500 },
            { id: "12", sku: "FK-012", nombre: "Despensa", capacidad: null, unidad: null, precio: 9500 },
            { id: "13", sku: "FK-013", nombre: "Organizador de platos", capacidad: null, unidad: null, precio: 1200 },
            { id: "14", sku: "FK-014", nombre: "Gabinete esquinero", capacidad: null, unidad: null, precio: 4200 },
            { id: "15", sku: "FK-015", nombre: "Mueble para lavavajillas", capacidad: null, unidad: null, precio: 3900 },
            { id: "16", sku: "FK-016", nombre: "Organizador de ollas", capacidad: null, unidad: null, precio: 1800 },
            { id: "17", sku: "FK-017", nombre: "Mueble para vinoteca", capacidad: null, unidad: null, precio: 6800 },
            { id: "18", sku: "FK-018", nombre: "Estante para copas", capacidad: null, unidad: null, precio: 2200 },
            { id: "19", sku: "FK-019", nombre: "Barra para desayuno", capacidad: null, unidad: null, precio: 5500 },
            { id: "20", sku: "FK-020", nombre: "Isla con almacenamiento", capacidad: null, unidad: null, precio: 12000 },
          ];
          setProductos(mockProductos);
        }
      } catch (error) {
        console.error("Error fetching productos:", error);
        // Fallback to mock data on error
        const mockProductos: Producto[] = [
          { id: "1", sku: "FK-001", nombre: "Gabinete de cocina", capacidad: null, unidad: null, precio: 5000 },
          { id: "2", sku: "FK-002", nombre: "Isla central", capacidad: null, unidad: null, precio: 8500 },
          { id: "3", sku: "FK-003", nombre: "Alacena superior", capacidad: null, unidad: null, precio: 3200 },
        ];
        setProductos(mockProductos);
      } finally {
        setLoading(false);
      }
    };

    fetchProductos();
  }, []);

  // Filter products based on search term
  const filteredProductos = productos.filter(producto => {
    if (!searchTerm || searchTerm.trim() === '') return true;
    
    try {
      const searchLower = searchTerm.toLowerCase();
      return (
        (typeof producto.sku === 'string' && producto.sku.toLowerCase().includes(searchLower)) || 
        (typeof producto.nombre === 'string' && producto.nombre.toLowerCase().includes(searchLower))
      );
    } catch (error) {
      console.error('Error filtering producto:', error);
      return false;
    }
  });

  const resetSelection = () => {
    setSelectedProducto(null);
    setSearchTerm("");
    setColores("");
    setCantidad(1);
    setDescuento(0);
  };

  const handleAddToCart = () => {
    if (!selectedProducto) return;
    
    // Generate a unique ID for the cart item
    const cartItemId = uuidv4();
    
    // Calculate the subtotal
    const precio = selectedProducto.precio || 0;
    const subtotal = cantidad * precio * (1 - descuento / 100);
    
    // Add the product to the cart
    addToCart({
      id: cartItemId,
      sku: selectedProducto.sku,
      nombre: selectedProducto.nombre,
      colores,
      cantidad,
      precio,
      descuento,
      subtotal
    });
    
    // Reset the form
    resetSelection();
  };

  return (
    <div className="space-y-4">
      {/* Product Search */}
      <div className="relative" ref={dropdownRef}>
        <label htmlFor="producto" className="block text-sm font-medium text-gray-700 mb-1">
          Producto
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            id="producto"
            placeholder="Buscar por SKU o nombre"
            className="pl-10 pr-10"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(true);
              if (selectedProducto && e.target.value !== `${selectedProducto.sku} - ${selectedProducto.nombre}`) {
                setSelectedProducto(null);
              }
            }}
            onFocus={() => setShowDropdown(true)}
          />
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
                  <span className="text-sm text-gray-500">Cargando productos...</span>
                </div>
              ) : filteredProductos.length > 0 ? (
                <ul className="py-1 text-sm divide-y divide-gray-100">
                  {filteredProductos.map((producto) => (
                    <li
                      key={producto.id}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                      onClick={() => {
                        setSelectedProducto(producto);
                        setSearchTerm(`${producto.sku} - ${producto.nombre}`);
                        setShowDropdown(false);
                      }}
                    >
                      <div className="font-medium text-gray-900">
                        {producto.sku} - {producto.nombre}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Precio: ${producto.precio?.toFixed(2) || '0.00'}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                  No se encontraron productos
                </div>
              )}
            </div>
            {filteredProductos.length > 10 && (
              <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100 text-center bg-gray-50">
                {filteredProductos.length} productos encontrados
              </div>
            )}
          </div>
        )}
      </div>

      {/* Additional Product Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Colores */}
        <div>
          <label htmlFor="colores" className="block text-sm font-medium text-gray-700 mb-1">
            Colores
          </label>
          <Input
            id="colores"
            placeholder="Colores del producto"
            value={colores}
            onChange={(e) => setColores(e.target.value)}
          />
        </div>
        
        {/* Cantidad */}
        <div>
          <label htmlFor="cantidad" className="block text-sm font-medium text-gray-700 mb-1">
            Cantidad
          </label>
          <Input
            id="cantidad"
            type="number"
            min="1"
            value={cantidad}
            onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
          />
        </div>
        
        {/* Precio */}
        <div>
          <label htmlFor="precio" className="block text-sm font-medium text-gray-700 mb-1">
            Precio Unitario
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500">$</span>
            </div>
            <Input
              id="precio"
              type="text"
              className="pl-8"
              value={selectedProducto?.precio?.toFixed(2) || '0.00'}
              readOnly
            />
          </div>
        </div>
        
        {/* Descuento */}
        <div>
          <label htmlFor="descuento" className="block text-sm font-medium text-gray-700 mb-1">
            Descuento (%)
          </label>
          <Input
            id="descuento"
            type="number"
            min="0"
            max="100"
            value={descuento}
            onChange={(e) => setDescuento(parseInt(e.target.value) || 0)}
          />
        </div>
      </div>
      
      {/* Add Button */}
      <div className="flex justify-end">
        <Button 
          className="bg-teal-500 hover:bg-teal-600 text-white"
          onClick={handleAddToCart}
          disabled={!selectedProducto}
        >
          Agregar al Carrito
        </Button>
      </div>
    </div>
  );
} 