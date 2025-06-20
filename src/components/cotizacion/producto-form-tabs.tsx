"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Package, FileText, Search, AlertCircle, Save, Check, ChevronsUpDown, Banknote, Box, Layers, Hash, X, User, Loader2, RefreshCw, Plus, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { FormControl, FormLabel } from '../ui/form';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { toast } from "react-hot-toast";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { searchProductos, insertProducto, Producto as ProductoType } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useProductionBalance } from '@/hooks/useProductionBalance';
import { Badge } from '../ui/badge';

// Match the database schema exactly
interface Producto {
  producto_id: number;
  nombre: string;
  tipo_ceramica: string | null;
  precio: number | null;
  sku: string | null;
  capacidad: number | null;
  unidad: string | null;
  tipo_producto: string | null;
  descripcion: string | null;
  colores: string | null;
  tiempo_produccion: number | null;
  cantidad_inventario: number | null;
  inventario: number | null;
}

// Form data interface with string producto_id for form handling
interface ProductoFormData {
  producto_id: string;
  nombre: string;
  tipo_ceramica: string;
  precio: string;
  sku: string;
  capacidad: string;
  unidad: string;
  tipo_producto: string;
  descripcion: string;
  colores: string;
  acabado: string; // Not in the database, but needed for the form
  cantidad: string; // For order quantity, not in the database
}

// Validation errors interface
interface FormErrors {
  nombre?: string;
  precio?: string;
  capacidad?: string;
  cantidad?: string;
}

interface ProductoFormProps {
  productoId?: number;
  onProductoChange?: (producto: ProductoType | null) => void;
}

export function ProductoFormTabs({ productoId, onProductoChange }: ProductoFormProps) {
  // Production balance hook
  const { getProductionBalance, getBalanceDisplay, getBalanceColor, loading: balanceLoading } = useProductionBalance();
  
  // Production balance state
  const [productionBalance, setProductionBalance] = useState<{ 
    balance: number; 
    hasInventory: boolean; 
    loading: boolean;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<string>(() => {
    // Check if we have previously saved form data with a product_id
    const savedForm = sessionStorage.getItem('cotizacion_productoForm');
    if (savedForm) {
      try {
        const parsedForm = JSON.parse(savedForm);
        // If we have a product ID, go to "existente" tab
        if (parsedForm.producto_id) {
          return "existente";
        }
      } catch (error) {
        console.error('Error parsing saved form data', error);
      }
    }
    // Default to "existente" tab regardless
    return "existente";
  });
  const [formDataChanged, setFormDataChanged] = useState<boolean>(false);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<ProductoType[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRequestIdRef = useRef<number>(0);
  const listRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const pageSize = 20;
  
  // Initialize Supabase client
  const supabase = createClientComponentClient();

  const [formData, setFormData] = useState<ProductoFormData>({
    producto_id: "",
    nombre: "",
    tipo_ceramica: "CERÁMICA DE ALTA TEMPERATURA",
    precio: "",
    sku: "",
    capacidad: "",
    unidad: "ml",
    tipo_producto: "Personalizado",
    descripcion: "",
    colores: "",
    acabado: "",
    cantidad: "1"
  });

  // Initialize form and handle persistence
  useEffect(() => {
    const initializeForm = () => {
      // Always clear session storage on component mount during development
      // This prevents leftover data from previous sessions
      if (process.env.NODE_ENV === 'development') {
        console.log("Development mode detected: clearing form data");
        sessionStorage.removeItem('cotizacion_productoForm');
        sessionStorage.removeItem('navigationOccurred');
      } else {
        // Check if this is a page refresh or a navigation in production
        const isPageRefresh = !sessionStorage.getItem('navigationOccurred');
        
        if (isPageRefresh) {
          // On page refresh, clear everything
          console.log("Page refresh detected: clearing form data");
          sessionStorage.removeItem('cotizacion_productoForm');
        }
      }
      
      // Always start with a fresh form
      setFormData({
        producto_id: "",
        nombre: "",
        tipo_ceramica: "CERÁMICA DE ALTA TEMPERATURA",
        precio: "",
        sku: "",
        capacidad: "",
        unidad: "ml",
        tipo_producto: "Personalizado",
        descripcion: "",
        colores: "",
        acabado: "",
        cantidad: "1"
      });
      
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
  
  // Convert form data to Producto object for parent component
  const formDataToProducto = (data: ProductoFormData): ProductoType => {
    return {
      producto_id: data.producto_id ? parseInt(data.producto_id) : 0,
      nombre: data.nombre,
      tipo_ceramica: data.tipo_ceramica || null,
      precio: data.precio ? parseFloat(data.precio) : null,
      sku: data.sku || null,
      capacidad: data.capacidad ? parseInt(data.capacidad) : null,
      unidad: data.unidad || null,
      tipo_producto: data.tipo_producto || null,
      descripcion: data.descripcion || null,
      colores: data.colores || null,
      tiempo_produccion: null,
      cantidad_inventario: null,
      inventario: null
    };
  };

  // Safe way to notify parent of changes to avoid issues during initialization
  const safeNotifyParent = (producto: any, cantidad?: number) => {
    if (onProductoChange && producto) {
      // Create a modified product with the cantidad field and a clear marker for new products
      const productoWithCantidad = {
        ...producto,
        cantidad: cantidad || parseInt(formData.cantidad) || 1,
        // For new products without a producto_id, ensure id is set to 'new'
        id: producto.producto_id ? String(producto.producto_id) : 'new'
      };
      
      // Use setTimeout to move the state update out of the render cycle
      setTimeout(() => {
        onProductoChange(productoWithCantidad);
      }, 0);
    } else if (onProductoChange) {
      // Just pass null if the product is null
      setTimeout(() => {
        onProductoChange(null);
      }, 0);
    }
  };

  // Validate the form with less strict requirements for existing products
  const validateForm = (data: ProductoFormData): FormErrors => {
    const newErrors: FormErrors = {};
    
    // For existing products, only check that we have a name and a product_id
    if (data.producto_id) {
      // Validate name for existing products
      if (!data.nombre.trim()) {
        newErrors.nombre = "El nombre es obligatorio";
      }
      
      // Validate quantity for existing products
      if (!data.cantidad) {
        newErrors.cantidad = "La cantidad es obligatoria";
      } else if (isNaN(parseInt(data.cantidad)) || parseInt(data.cantidad) <= 0) {
        newErrors.cantidad = "La cantidad debe ser un número entero positivo";
      }
      
      return newErrors; // Return early, other validations not needed for existing products
    }
    
    // More strict validation for new products
    if (!data.nombre.trim()) {
      newErrors.nombre = "El nombre es obligatorio";
    } else if (data.nombre.trim().length < 3) {
      newErrors.nombre = "El nombre debe tener al menos 3 caracteres";
    }
    
    // Validate price
    if (!data.precio) {
      newErrors.precio = "El precio es obligatorio";
    } else if (isNaN(parseFloat(data.precio)) || parseFloat(data.precio) < 0) {
      newErrors.precio = "El precio debe ser un número positivo";
    }
    
    // Validate capacity if provided
    if (data.capacidad && (isNaN(parseFloat(data.capacidad)) || parseFloat(data.capacidad) <= 0)) {
      newErrors.capacidad = "La capacidad debe ser un número positivo";
    }
    
    // Validate quantity
    if (!data.cantidad) {
      newErrors.cantidad = "La cantidad es obligatoria";
    } else if (isNaN(parseInt(data.cantidad)) || parseInt(data.cantidad) <= 0) {
      newErrors.cantidad = "La cantidad debe ser un número entero positivo";
    }
    
    return newErrors;
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value
      };
      
      // Don't mark field as touched while typing
      // This prevents validation errors from showing up during typing
      
      // Save to sessionStorage without triggering parent notification
      sessionStorage.setItem('cotizacion_productoForm', JSON.stringify({
        ...prev,
        [name]: value
      }));
      
      return newData;
    });
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
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
      
      // Save to sessionStorage without triggering parent notification
      // This prevents auto-adding to cart when changing dropdowns
      sessionStorage.setItem('cotizacion_productoForm', JSON.stringify({
        ...prev,
        [name]: value
      }));
      
      return newData;
    });
  };

  // Handle blur for validation
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

  // Debounce function
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

  // Add debounced search function
  const debouncedSearch = useCallback(
    debounce((term: string, page: number, append: boolean) => {
      handleSearch(term, page, append);
    }, 300),
    []
  );

  // Update the handleSearch function for better race condition handling
  const handleSearch = async (searchTermValue: string, page: number, append: boolean = false) => {
    // Create a unique ID for this request
    const requestId = ++lastRequestIdRef.current;
    
    try {
      setIsSearching(true);
      console.log(`[Request #${requestId}] Searching products with term: "${searchTermValue}", page: ${page}`);
      
      // Use direct fetch instead of the helper function while debugging
      const response = await fetch(`/api/productos?query=${encodeURIComponent(searchTermValue)}&page=${page}&pageSize=${pageSize}`);
      
      // If a newer request has started, abandon this one
      if (requestId < lastRequestIdRef.current) {
        console.log(`[Request #${requestId}] Abandoned - newer request in progress`);
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      
      const result = await response.json();
      
      // Check again if this is still the most recent request
      if (requestId < lastRequestIdRef.current) {
        console.log(`[Request #${requestId}] Abandoned - newer request completed`);
        return;
      }
      
      // Process results
      const data = result.data || [];
      const hasMore = result.hasMore || false;
      const count = result.count || 0;
      
      console.log(`[Request #${requestId}] Found ${data.length} results, total count: ${count}, hasMore: ${hasMore}`);
      
      if (data) {
        if (append) {
          // Append results for pagination
          setSearchResults(prev => [...prev, ...data]);
        } else {
          // Replace results for new search
          setSearchResults(data);
        }
        
        setHasMoreResults(hasMore);
        setCurrentPage(page);
      }
    } catch (error) {
      // Only show errors for the most recent request
      if (requestId === lastRequestIdRef.current) {
        console.error("[Request #${requestId}] Error searching for products:", error);
        toast.error("Error al buscar productos");
      }
    } finally {
      // Only update loading state for the most recent request
      if (requestId === lastRequestIdRef.current) {
        setIsSearching(false);
      }
    }
  };

  // Handle search term changes with debounce
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
    debouncedSearch(value, 0, false).then(() => {
      setIsDebouncing(false);
    });
  }, [debouncedSearch]);

  // Handle scrolling to load more results - preserve scroll position
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    
    // Check if we're close to the bottom
    if (
      element.scrollHeight - element.scrollTop <= element.clientHeight + 100 &&
      hasMoreResults &&
      !isSearching &&
      !isDebouncing
    ) {
      // Remember current scroll position and height
      const scrollTop = element.scrollTop;
      const previousHeight = element.scrollHeight;
      
      // Load more results
      setIsSearching(true);
      
      handleSearch(searchTerm, currentPage + 1, true)
        .then(() => {
          // Use a small timeout to ensure the DOM has updated
          setTimeout(() => {
            // Calculate new position: previous scroll position + difference in heights
            if (element) {
              const newPosition = scrollTop + (element.scrollHeight - previousHeight);
              element.scrollTop = newPosition;
            }
          }, 10);
        });
    }
  }, [searchTerm, currentPage, hasMoreResults, isSearching, isDebouncing]);
  
  // Load initial product list when dropdown opens
  useEffect(() => {
    if (comboboxOpen) {
      handleSearch('', 0, false);
    }
  }, [comboboxOpen]);

  // Reset search criteria when search term changes
  useEffect(() => {
    if (searchTerm !== undefined) {
      // Reset pagination
      setCurrentPage(0);
      
      // If the dropdown is open, perform the search
      if (comboboxOpen) {
        handleSearchTermChange(searchTerm);
      }
    }
  }, [searchTerm, comboboxOpen, handleSearchTermChange]);

  // Function to fetch production balance for a product
  const fetchProductionBalance = async (productoId: number) => {
    setProductionBalance({ balance: 0, hasInventory: false, loading: true });
    
    try {
      const balanceData = await getProductionBalance(productoId);
      
      if (balanceData) {
        setProductionBalance({
          balance: balanceData.faltan_sobran,
          hasInventory: true,
          loading: false
        });
      } else {
        setProductionBalance({
          balance: 0,
          hasInventory: false,
          loading: false
        });
      }
    } catch (error) {
      console.log('Error fetching production balance:', error);
      setProductionBalance({
        balance: 0,
        hasInventory: false,
        loading: false
      });
    }
  };

  // Handle selection of an existing product
  const handleSelectProduct = (productoId: string) => {
    const producto = searchResults.find(p => p.producto_id.toString() === productoId);
    
    if (!producto) return;
    
    // Fetch production balance for the selected product
    fetchProductionBalance(producto.producto_id);
    
    // Completely replace the form data with the selected product
    const updatedFormData = {
      producto_id: producto.producto_id.toString(),
      nombre: producto.nombre || "",
      tipo_ceramica: producto.tipo_ceramica || "CERÁMICA DE ALTA TEMPERATURA",
      precio: producto.precio !== null ? producto.precio.toString() : "",
      sku: producto.sku || "",
      capacidad: producto.capacidad !== null ? producto.capacidad.toString() : "",
      unidad: producto.unidad || "ml",
      tipo_producto: producto.tipo_producto || "Personalizado",
      descripcion: producto.descripcion || "",
      colores: producto.colores || "",
      acabado: "", // Not part of the database schema
      cantidad: "1" // Default quantity
    };
    
    setFormData(updatedFormData);
    
    // Save to sessionStorage without triggering parent notification
    sessionStorage.setItem('cotizacion_productoForm', JSON.stringify(updatedFormData));
    console.log("Product selected, saved to sessionStorage:", updatedFormData);
    
    // Do NOT set formDataChanged to true here, as we don't want to auto-add to cart
    // setFormDataChanged(true);
    
    // Close combobox
    setComboboxOpen(false);
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    // When switching tabs, clear the form to avoid data confusion
    setActiveTab(value);
    
    // Clear the form when switching tabs
    setFormData({
      producto_id: "",
      nombre: "",
      tipo_ceramica: "CERÁMICA DE ALTA TEMPERATURA",
      precio: "",
      sku: "",
      capacidad: "",
      unidad: "ml",
      tipo_producto: "Personalizado",
      descripcion: "",
      colores: "",
      acabado: "",
      cantidad: "1"
    });
    
    setTouched({});
    
    // We no longer auto-open search when switching to Existente tab
    // This improves UX by giving users more control
  };

  // Add useEffect to handle clicks outside the combobox
  useEffect(() => {
    // Only add listener if combobox is open
    if (comboboxOpen) {
      const handleClickOutside = (event: MouseEvent) => {
        // Check if the click was outside the combobox
        if (listRef.current && !listRef.current.contains(event.target as Node)) {
          // Close the combobox
          setComboboxOpen(false);
        }
      };
      
      // Add the event listener
      document.addEventListener('mousedown', handleClickOutside);
      
      // Clean up
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [comboboxOpen]);

  // Add utility function to prevent scroll on number inputs
  const preventScrollInput = (e: React.WheelEvent<HTMLInputElement>) => {
    // Prevent the input value from changing when scrolling
    e.currentTarget.blur();
  };

  // Update existing product in database
  const handleUpdateProduct = async () => {
    // Validate form first
    const validationErrors = validateForm(formData);
    setErrors(validationErrors);
    
    // Mark all fields as touched
    setTouched({
      nombre: true,
      precio: true,
      capacidad: true,
      cantidad: true
    });
    
    if (Object.keys(validationErrors).length > 0) {
      toast.error("Por favor corrige los errores antes de guardar");
      return;
    }
    
    setIsSaving(true);
    
    try {
      if (!formData.producto_id) {
        throw new Error("No product ID provided for update");
      }
      
      // Create producto object for update
      const productoToUpdate = {
        producto_id: parseInt(formData.producto_id),
        nombre: formData.nombre,
        tipo_ceramica: formData.tipo_ceramica || null,
        precio: formData.precio ? parseFloat(formData.precio) : null,
        sku: formData.sku || null,
        capacidad: formData.capacidad ? parseInt(formData.capacidad) : null,
        unidad: formData.unidad || null,
        tipo_producto: formData.tipo_producto || null,
        descripcion: formData.descripcion || null,
        colores: formData.colores || null,
        // Not updating these fields as they're not in the form
        tiempo_produccion: null, 
        cantidad_inventario: null,
        inventario: null
      };
      
      console.log("Updating product:", productoToUpdate);
      
      // Update the product in the database
      const response = await fetch(`/api/productos/${formData.producto_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productoToUpdate),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update product');
      }
      
      const data = await response.json();
      console.log("Update response:", data);
      
      // Show success message
      toast.success("Producto actualizado exitosamente");
      
      // Refresh the product list
      handleSearch("", 0, false);
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("Error al actualizar el producto");
    } finally {
      setIsSaving(false);
    }
  };

  // Save new product to database
  const handleSaveProduct = async () => {
    // Validate form first
    const validationErrors = validateForm(formData);
    setErrors(validationErrors);
    
    // Mark all fields as touched
    setTouched({
      nombre: true,
      precio: true,
      capacidad: true,
      cantidad: true
    });
    
    if (Object.keys(validationErrors).length > 0) {
      toast.error("Por favor corrige los errores antes de guardar");
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Create producto object for API
      const productoToCreate = {
        nombre: formData.nombre.trim(), // Trim name to avoid extra spaces
        tipo_ceramica: formData.tipo_ceramica || null,
        precio: formData.precio ? parseFloat(formData.precio) : null,
        sku: formData.sku || null,
        capacidad: formData.capacidad ? parseInt(formData.capacidad) : null,
        unidad: formData.unidad || null,
        tipo_producto: formData.tipo_producto || null,
        descripcion: formData.descripcion || null,
        colores: formData.colores || null,
        // Not setting these fields as they're not in the form
        tiempo_produccion: null, 
        cantidad_inventario: 0,
        inventario: null
      };
      
      console.log("Creating new product:", productoToCreate);
      
      // Insert the product using the API
      const response = await fetch('/api/productos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productoToCreate),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create product');
      }
      
      const data = await response.json();
      console.log("Create response:", data);
      
      if (data.success && data.producto) {
        // Update the form with the new product ID
        setFormData(prev => ({
          ...prev,
          producto_id: data.producto.producto_id.toString()
        }));
        
        // Show success message
        toast.success("Producto creado exitosamente");
        
        // Prepare the product for adding to cart
        const nuevoProducto = {
          id: data.producto.producto_id.toString(),
          producto_id: data.producto.producto_id,
          nombre: data.producto.nombre,
          precio_unitario: data.producto.precio || 0,
          cantidad: parseInt(formData.cantidad) || 1,
          descuento: 0,
          sku: data.producto.sku || "",
          descripcion: data.producto.descripcion || "",
          colores: data.producto.colores ? data.producto.colores.split(',') : [],
          acabado: formData.acabado || ""
        };
        
        // Add to cart
        safeNotifyParent(nuevoProducto);
        
        // Reset form after saving
        setFormData({
          producto_id: "",
          nombre: "",
          tipo_ceramica: "CERÁMICA DE ALTA TEMPERATURA",
          precio: "",
          sku: "",
          capacidad: "",
          unidad: "ml",
          tipo_producto: "Personalizado",
          descripcion: "",
          colores: "",
          acabado: "",
          cantidad: "1"
        });
        
        // Clear touched state
        setTouched({});
        
        // Clear session storage
        sessionStorage.removeItem('cotizacion_productoForm');
      }
    } catch (error) {
      console.error("Error creating product:", error);
      if (error instanceof Error) {
        toast.error(`Error al crear el producto: ${error.message}`);
      } else {
        toast.error("Error al crear el producto");
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Modify handleAddToCart to not open search after adding product
  const handleAddToCart = () => {
    // Validate based on the active tab
    const isNewProduct = activeTab === 'nuevo';

    // Always require nombre and cantidad
    const requiredFields: Array<keyof ProductoFormData> = ['nombre', 'cantidad'];
    if (isNewProduct) {
        // Only require precio for NEW products
        requiredFields.push('precio');
    }

    const currentErrors = validateForm(formData);
    
    // Check only required fields for the current mode
    let hasRequiredErrors = false;
    requiredFields.forEach(field => {
        if (currentErrors[field as keyof FormErrors]) {
            hasRequiredErrors = true;
        }
        // Mark required fields as touched to show errors immediately
        setTouched(prev => ({ ...prev, [field]: true }));
    });

    // Specific check for price validity on new products AFTER general validation
    if (isNewProduct && (!formData.precio || parseFloat(formData.precio) <= 0)) {
        // Ensure an error message exists for price if it's invalid or missing
        if (!currentErrors.precio) {
            currentErrors.precio = "El precio debe ser un número positivo";
        }
        setTouched(prev => ({ ...prev, precio: true })); // Mark as touched
        hasRequiredErrors = true;
    }

    if (hasRequiredErrors) {
        toast.error("Por favor, completa los campos obligatorios correctamente.");
        setErrors(currentErrors); // Update errors state to show messages
        return;
    }

    // --- Robust Price Conversion --- 
    // Attempt to parse price, handle potential NaN
    let precioUnitarioValue: number | null = null;
    if (formData.precio) {
        const parsedPrice = parseFloat(formData.precio);
        if (!isNaN(parsedPrice) && parsedPrice >= 0) { // Allow 0 price, but validation checks > 0 for new
            precioUnitarioValue = parsedPrice;
        } else {
            // This case should ideally be caught by validation, but as a fallback:
            console.error("Invalid price format encountered after validation:", formData.precio);
            toast.error("Error interno: formato de precio inválido.");
            return; // Prevent adding with invalid price
        }
    } else if (!isNewProduct) {
        // If it's an existing product, price might not be present/required in this form
        // We might need to fetch the price or handle it differently if updates are allowed
        console.warn("Adding existing product without price from form. Price might be missing.");
    } // If it's a new product, the validation above should have caught the missing price

    // Ensure precioUnitarioValue is at least 0 if it's null but required (e.g., for context)
    const finalPrecioUnitario = precioUnitarioValue ?? 0;

    const productToSend: any = { // Use 'any' temporarily or define a specific type
        producto_id: formData.producto_id ? parseInt(formData.producto_id) : null,
        nombre: formData.nombre,
        // Use finalPrecioUnitario which defaults null to 0, as context expects a number
        precio_unitario: finalPrecioUnitario, 
        cantidad: parseInt(formData.cantidad) || 1,
        descuento: 0, // Assuming no discount field in this form?
        sku: formData.sku,
        tipo_ceramica: formData.tipo_ceramica,
        capacidad: formData.capacidad ? parseInt(formData.capacidad) : null,
        unidad: formData.unidad,
        tipo_producto: formData.tipo_producto,
        descripcion: formData.descripcion,
        colores: formData.colores,
        acabado: formData.acabado
    };

    // --- Corrected Logic --- 
    // ONLY notify the parent component (NuevaCotizacionClient/EditCotizacionClient)
    // It is the PARENT's responsibility to call the context's addProducto function.
    // DO NOT call handleSaveProduct or handleUpdateProduct here.

    console.log("Calling onProductoChange with:", productToSend);
    if (onProductoChange) {
        onProductoChange(productToSend);
        toast.success("Producto listo para agregar a la cotización."); // More accurate toast
    } else {
        console.error("onProductoChange handler is not defined in ProductoFormTabs!");
        toast.error("Error interno: No se pudo agregar el producto.");
    }

    // Fully reset the form after adding to cart
    setFormData({
        producto_id: "",
        nombre: "",
        tipo_ceramica: "CERÁMICA DE ALTA TEMPERATURA",
        precio: "",
        sku: "",
        capacidad: "",
        unidad: "ml",
        tipo_producto: "Personalizado",
        descripcion: "",
        colores: "",
        acabado: "",
        cantidad: "1"
    });

    // Clear touched state
    setTouched({});

    // Clear the data from session storage
    sessionStorage.removeItem('cotizacion_productoForm');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 w-full">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid grid-cols-2 mb-6">
          <TabsTrigger value="existente">Existente</TabsTrigger>
          <TabsTrigger value="nuevo">Nuevo</TabsTrigger>
        </TabsList>
        
        <TabsContent value="existente">
          <div className="space-y-6">
            <div className="text-sm text-gray-500 mb-4">
              Busca y selecciona un producto existente para usar en esta cotización. Si no encuentras el producto, puedes crear uno nuevo en la pestaña "Nuevo".
            </div>
            
            {/* Producto search with simplified combobox */}
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
                    
                    // Fetch all products on open
                    handleSearch('', 0, false);
                  }}
                  className="w-full flex justify-between items-center"
                >
                  {formData.producto_id ? (
                    <span className="truncate">
                      {formData.sku ? `${formData.sku} - ` : ''}{formData.nombre}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Buscar producto por nombre o SKU...</span>
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
                        onChange={(e) => handleSearchTermChange(e.target.value)}
                        autoFocus
                        placeholder="Buscar por nombre o SKU..."
                        className="w-full pl-8 py-2 border border-gray-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                  
                  <div 
                    className="max-h-[300px] overflow-auto" 
                    ref={listRef}
                    onScroll={handleScroll}
                  >
                    {(isSearching || isDebouncing) && searchResults.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        <div className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                        {isDebouncing ? "Esperando para buscar..." : "Buscando productos..."}
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="py-4 text-center">
                        <p className="text-sm text-muted-foreground mb-2">No se encontraron productos</p>
                        <Button 
                          size="sm" 
                          onClick={() => {
                            // Create new product with the search term as name
                            const newFormData = {
                              producto_id: "",
                              nombre: searchTerm,
                              tipo_ceramica: "CERÁMICA DE ALTA TEMPERATURA",
                              precio: "",
                              sku: "",
                              capacidad: "",
                              unidad: "ml",
                              tipo_producto: "Personalizado",
                              descripcion: "",
                              colores: "",
                              acabado: "",
                              cantidad: "1"
                            };
                            
                            setActiveTab("nuevo");
                            setFormData(newFormData);
                            setFormDataChanged(true);
                            
                            // Save to sessionStorage
                            sessionStorage.setItem('cotizacion_productoForm', JSON.stringify(newFormData));
                            
                            setComboboxOpen(false);
                          }}
                          className="bg-teal-500 hover:bg-teal-600 text-white"
                        >
                          Crear nuevo producto
                        </Button>
                      </div>
                    ) : (
                      searchResults.map((producto, index) => (
                        <div
                          key={`${producto.producto_id}-${index}`}
                          className="flex items-center px-3 py-2 cursor-pointer hover:bg-slate-100"
                          onClick={() => handleSelectProduct(producto.producto_id.toString())}
                        >
                          <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {producto.sku && (
                                <span className="text-gray-500 mr-2">{producto.sku}</span>
                              )}
                              {searchTerm && searchTerm.length > 1
                                ? highlightMatch(producto.nombre, searchTerm)
                                : producto.nombre}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-1">
                              {producto.capacidad && producto.unidad && (
                                <span className="bg-gray-100 px-1 rounded-sm">
                                  {producto.capacidad} {producto.unidad}
                                </span>
                              )}
                              {producto.precio !== null && (
                                <span className="bg-gray-100 px-1 rounded-sm">
                                  ${producto.precio.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    
                    {(isSearching || isDebouncing) && hasMoreResults && (
                      <div className="py-2 text-center text-xs text-gray-500 border-t">
                        <div className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                        {isDebouncing ? "Esperando para buscar..." : "Cargando más resultados..."}
                      </div>
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
            
            {/* Product form fields - always visible */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* Nombre */}
              <FormControl>
                <FormLabel required>Nombre del producto</FormLabel>
                <Input
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('nombre')}
                  placeholder="Ingresa el nombre del producto"
                  icon={<Package className="h-4 w-4" />}
                  className={`${touched.nombre && errors.nombre ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  required
                  readOnly={!formData.producto_id && !comboboxOpen}
                  onClick={() => !formData.producto_id && setComboboxOpen(true)}
                />
                {touched.nombre && errors.nombre && (
                  <div className="text-red-500 text-xs mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.nombre}
                  </div>
                )}
              </FormControl>
              
              {/* Descripción */}
              <FormControl>
                <FormLabel>Descripción</FormLabel>
                <textarea
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  placeholder="Describe el producto"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  readOnly={!formData.producto_id && !comboboxOpen}
                />
              </FormControl>
              
              {/* Colores */}
              <FormControl>
                <FormLabel>Colores</FormLabel>
                <Input
                  name="colores"
                  value={formData.colores}
                  onChange={handleInputChange}
                  placeholder="Ej: Rojo, Azul, Verde"
                  icon={<Layers className="h-4 w-4" />}
                  readOnly={!formData.producto_id && !comboboxOpen}
                />
              </FormControl>
              
              {/* Acabado */}
              <FormControl>
                <FormLabel>Acabado</FormLabel>
                <Select 
                  value={formData.acabado} 
                  onValueChange={(value) => handleSelectChange('acabado', value)}
                  disabled={!formData.producto_id && !comboboxOpen}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar acabado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mate">Mate</SelectItem>
                    <SelectItem value="Brillante">Brillante</SelectItem>
                    <SelectItem value="Satinado">Satinado</SelectItem>
                    <SelectItem value="Rústico">Rústico</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              
              {/* Cantidad */}
              <FormControl>
                <FormLabel required>Cantidad</FormLabel>
                <Input
                  name="cantidad"
                  type="number"
                  min="1"
                  value={formData.cantidad}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('cantidad')}
                  onWheel={preventScrollInput}
                  placeholder="Ej: 10"
                  icon={<Layers className="h-4 w-4" />}
                  className={`${touched.cantidad && errors.cantidad ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  required
                  readOnly={!formData.producto_id && !comboboxOpen}
                />
                {touched.cantidad && errors.cantidad && (
                  <div className="text-red-500 text-xs mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.cantidad}
                  </div>
                )}
              </FormControl>
              
              {/* Precio unitario */}
              <FormControl>
                <FormLabel required>Precio unitario</FormLabel>
                <Input
                  name="precio"
                  type="number"
                  step="0.01"
                  value={formData.precio}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('precio')}
                  onWheel={preventScrollInput}
                  placeholder="Ej: 150.00"
                  icon={<Banknote className="h-4 w-4" />}
                  className={`${touched.precio && errors.precio ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                  required
                  readOnly={!formData.producto_id && !comboboxOpen}
                />
                              {touched.precio && errors.precio && (
                <div className="text-red-500 text-xs mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {errors.precio}
                </div>
              )}
            </FormControl>
            
            {/* Production Balance Display */}
            {formData.producto_id && (
              <div className="md:col-span-2">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-gray-600" />
                    <span className="font-medium text-gray-900 text-sm">Estado de Inventario en Producción</span>
                  </div>
                  
                  {productionBalance?.loading ? (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Consultando inventario...</span>
                    </div>
                  ) : productionBalance?.hasInventory ? (
                    <div className="flex items-center gap-2">
                      {productionBalance.balance < 0 ? (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      ) : productionBalance.balance > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <Minus className="h-4 w-4 text-gray-500" />
                      )}
                      <Badge 
                        variant={productionBalance.balance < 0 ? "destructive" : 
                                productionBalance.balance > 0 ? "default" : "outline"}
                        className={`text-xs ${
                          productionBalance.balance > 0 ? 'bg-green-600 hover:bg-green-700' : ''
                        }`}
                      >
                        {getBalanceDisplay(productionBalance.balance)}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        (Balance entre pedidos y producción activa)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <span className="text-xs text-amber-700">
                        No hay inventario registrado para este producto en la planificación de producción
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Action buttons */}
              <div className="md:col-span-2 mt-4 flex justify-between">
                {!formData.producto_id ? (
                  <Button 
                    onClick={() => setComboboxOpen(true)}
                    variant="default"
                    className="bg-teal-500 hover:bg-teal-600 text-white"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Buscar Producto
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Clear the product selection
                      const updatedFormData = {
                        ...formData,
                        producto_id: ""
                      };
                      
                      setFormData(updatedFormData);
                      setFormDataChanged(true);
                      
                      // Save to sessionStorage
                      sessionStorage.setItem('cotizacion_productoForm', JSON.stringify(updatedFormData));
                      console.log("Product selection cleared");
                      
                      setComboboxOpen(true);
                    }}
                  >
                    Cambiar producto
                  </Button>
                )}
                
                <div className="flex gap-2">
                  {formData.producto_id && (
                    <Button
                      type="button"
                      onClick={handleUpdateProduct}
                      disabled={isSaving || !formData.nombre || !formData.precio || Object.keys(errors).length > 0}
                      variant="outline"
                      className="border-teal-500 text-teal-600 hover:bg-teal-50"
                    >
                      {isSaving ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          <span className="hidden xs:inline">Actualizando...</span>
                          <span className="inline xs:hidden">...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Actualizar</span>
                        </>
                      )}
                    </Button>
                  )}
                  
                  <Button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={!formData.nombre || !formData.precio || Object.keys(errors).length > 0}
                    variant="default"
                    className="bg-teal-500 hover:bg-teal-600 text-white"
                  >
                    <Package className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Agregar al Carrito</span>
                    <span className="inline sm:hidden">Agregar</span>
                  </Button>
                </div>
              </div>
            </div>
            
            {!formData.producto_id && searchResults.length === 0 && !isSearching && searchTerm.length > 0 && (
              <div className="border border-amber-300 bg-amber-50 p-4 rounded-md mt-4 text-sm">
                <p className="font-medium text-amber-800 mb-2">No se encontraron productos con ese nombre</p>
                <p className="text-amber-700">Puedes crear un nuevo producto en la pestaña "Nuevo".</p>
                <Button 
                  className="mt-3 bg-teal-500 hover:bg-teal-600 text-white" 
                  size="sm"
                  onClick={() => {
                    // Create new product with the search term as name
                    const newFormData = {
                      producto_id: "",
                      nombre: searchTerm,
                      tipo_ceramica: "CERÁMICA DE ALTA TEMPERATURA",
                      precio: "",
                      sku: "",
                      capacidad: "",
                      unidad: "ml",
                      tipo_producto: "Personalizado",
                      descripcion: "",
                      colores: "",
                      acabado: "",
                      cantidad: "1"
                    };
                    
                    setActiveTab("nuevo");
                    setFormData(newFormData);
                    setFormDataChanged(true);
                    
                    // Save to sessionStorage
                    sessionStorage.setItem('cotizacion_productoForm', JSON.stringify(newFormData));
                  }}
                >
                  Crear nuevo producto
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="nuevo">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nombre */}
            <FormControl>
              <FormLabel required>Nombre del producto</FormLabel>
              <Input
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                onBlur={() => handleBlur('nombre')}
                placeholder="Ingresa el nombre del producto"
                icon={<Package className="h-4 w-4" />}
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
            
            {/* Capacidad y Unidad */}
            <div className="grid grid-cols-2 gap-2">
              <FormControl>
                <FormLabel required>Capacidad</FormLabel>
                <Input
                  name="capacidad"
                  type="number"
                  value={formData.capacidad}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('capacidad')}
                  onWheel={preventScrollInput}
                  placeholder="Ej: 350"
                  icon={<Box className="h-4 w-4" />}
                  className={`${touched.capacidad && errors.capacidad ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                />
                {touched.capacidad && errors.capacidad && (
                  <div className="text-red-500 text-xs mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.capacidad}
                  </div>
                )}
              </FormControl>
              
              <FormControl>
                <FormLabel required>Unidad</FormLabel>
                <Select 
                  value={formData.unidad} 
                  onValueChange={(value) => handleSelectChange('unidad', value)}
                  onOpenChange={() => handleBlur('unidad')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="oz">oz</SelectItem>
                    <SelectItem value="lt">lt</SelectItem>
                    <SelectItem value="cm">cm</SelectItem>
                    <SelectItem value="m">m</SelectItem>
                    <SelectItem value="pz">pz</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
            </div>
            
            {/* SKU */}
            <FormControl>
              <FormLabel>SKU</FormLabel>
              <Input
                name="sku"
                value={formData.sku}
                onChange={handleInputChange}
                placeholder="Código de producto"
                icon={<Hash className="h-4 w-4" />}
              />
            </FormControl>
            
            {/* Tipo Cerámica */}
            <FormControl>
              <FormLabel>Tipo Cerámica</FormLabel>
              <Select 
                value={formData.tipo_ceramica} 
                onValueChange={(value) => handleSelectChange('tipo_ceramica', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CERÁMICA DE ALTA TEMPERATURA">Cerámica de alta temperatura</SelectItem>
                  <SelectItem value="CERÁMICA DE BAJA TEMPERATURA">Cerámica de baja temperatura</SelectItem>
                  <SelectItem value="PORCELANA">Porcelana</SelectItem>
                  <SelectItem value="GRES">Gres</SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            
            {/* Tipo Producto */}
            <FormControl>
              <FormLabel>Tipo de Producto</FormLabel>
              <Select 
                value={formData.tipo_producto} 
                onValueChange={(value) => handleSelectChange('tipo_producto', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Personalizado">Personalizado</SelectItem>
                  <SelectItem value="Estándar">Estándar</SelectItem>
                  <SelectItem value="Catálogo">Catálogo</SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            
            {/* Descripción */}
            <FormControl className="md:col-span-2">
              <FormLabel>Descripción</FormLabel>
              <textarea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleInputChange}
                placeholder="Describe el producto"
                className="flex h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </FormControl>
            
            {/* Colores */}
            <FormControl>
              <FormLabel>Colores disponibles</FormLabel>
              <Input
                name="colores"
                value={formData.colores}
                onChange={handleInputChange}
                placeholder="Ej: Rojo, Azul, Verde"
                icon={<Layers className="h-4 w-4" />}
              />
            </FormControl>
            
            {/* Acabado */}
            <FormControl>
              <FormLabel>Acabado</FormLabel>
              <Select 
                value={formData.acabado} 
                onValueChange={(value) => handleSelectChange('acabado', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar acabado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mate">Mate</SelectItem>
                  <SelectItem value="Brillante">Brillante</SelectItem>
                  <SelectItem value="Satinado">Satinado</SelectItem>
                  <SelectItem value="Rústico">Rústico</SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            
            {/* Precio y Cantidad */}
            <div className="grid grid-cols-2 gap-2">
              <FormControl>
                <FormLabel required>Precio unitario</FormLabel>
                <Input
                  name="precio"
                  type="number"
                  step="0.01"
                  value={formData.precio}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('precio')}
                  onWheel={preventScrollInput}
                  placeholder="Ej: 150.00"
                  icon={<Banknote className="h-4 w-4" />}
                  className={`${touched.precio && errors.precio ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                  required
                />
                {touched.precio && errors.precio && (
                  <div className="text-red-500 text-xs mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.precio}
                  </div>
                )}
              </FormControl>
              
              <FormControl>
                <FormLabel required>Cantidad</FormLabel>
                <Input
                  name="cantidad"
                  type="number"
                  min="1"
                  value={formData.cantidad}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('cantidad')}
                  onWheel={preventScrollInput}
                  placeholder="Ej: 10"
                  icon={<Layers className="h-4 w-4" />}
                  className={`${touched.cantidad && errors.cantidad ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  required
                />
                {touched.cantidad && errors.cantidad && (
                  <div className="text-red-500 text-xs mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.cantidad}
                  </div>
                )}
              </FormControl>
            </div>
            
            {/* Add button at the end */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-between items-center">
              <Button
                variant="outline"
                size="action"
                onClick={() => onProductoChange && onProductoChange(null)}
                className="w-full sm:w-auto"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              
              <Button 
                type="button"
                onClick={handleSaveProduct}
                disabled={!formData.nombre || !formData.precio || Object.keys(errors).length > 0 || isSaving}
                variant="success"
                size="action"
                className="w-full sm:w-auto"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    <span>Agregando...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    <span>Agregar Producto</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Keep the default export for backward compatibility
export default ProductoFormTabs; 