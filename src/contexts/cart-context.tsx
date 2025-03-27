"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type CartProduct = {
  id: string;
  sku: string;
  nombre: string;
  colores: string;
  cantidad: number;
  precio: number;
  descuento: number;
  subtotal: number;
};

type CartContextType = {
  cartItems: CartProduct[];
  addToCart: (product: CartProduct) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateDiscount: (productId: string, discount: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  currency: "MXN" | "USD";
  setCurrency: (currency: "MXN" | "USD") => void;
  exchangeRate: number;
  setExchangeRate: (rate: number) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartProduct[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [currency, setCurrency] = useState<"MXN" | "USD">("MXN");
  const [exchangeRate, setExchangeRate] = useState(18.5);

  // Initialize cart from localStorage once on client side
  useEffect(() => {
    setIsClient(true);
    const storedCart = localStorage.getItem("cart");
    const storedCurrency = localStorage.getItem("currency");
    const storedExchangeRate = localStorage.getItem("exchangeRate");
    
    if (storedCart) {
      try {
        setCartItems(JSON.parse(storedCart));
      } catch (error) {
        console.error("Failed to parse cart from localStorage:", error);
        localStorage.removeItem("cart");
      }
    }
    
    if (storedCurrency === "MXN" || storedCurrency === "USD") {
      setCurrency(storedCurrency as "MXN" | "USD");
    }
    
    if (storedExchangeRate) {
      setExchangeRate(parseFloat(storedExchangeRate));
    }
  }, []);

  // Update localStorage whenever cart changes
  useEffect(() => {
    if (isClient) {
      localStorage.setItem("cart", JSON.stringify(cartItems));
    }
  }, [cartItems, isClient]);

  // Update localStorage whenever currency settings change
  useEffect(() => {
    if (isClient) {
      localStorage.setItem("currency", currency);
      localStorage.setItem("exchangeRate", exchangeRate.toString());
    }
  }, [currency, exchangeRate, isClient]);

  // Handle currency changes by updating all product prices
  const handleCurrencyChange = (newCurrency: "MXN" | "USD") => {
    // Only process if there's an actual change
    if (newCurrency === currency) return;
    
    // Convert all prices in the cart based on the new currency
    const updatedItems = cartItems.map(item => {
      let newPrice: number;
      
      if (currency === "MXN" && newCurrency === "USD") {
        // Convert from MXN to USD
        newPrice = parseFloat((item.precio / exchangeRate).toFixed(2));
      } else if (currency === "USD" && newCurrency === "MXN") {
        // Convert from USD to MXN
        newPrice = parseFloat((item.precio * exchangeRate).toFixed(2));
      } else {
        newPrice = item.precio;
      }
      
      // Recalculate subtotal with new price
      const newSubtotal = parseFloat((item.cantidad * newPrice * (1 - item.descuento / 100)).toFixed(2));
      
      return {
        ...item,
        precio: newPrice,
        subtotal: newSubtotal
      };
    });
    
    // Update cart items with converted prices
    setCartItems(updatedItems);
    // Update currency
    setCurrency(newCurrency);
  };

  const addToCart = (product: CartProduct) => {
    setCartItems(prevItems => {
      // Check if product already exists in cart
      const existingItemIndex = prevItems.findIndex(item => item.id === product.id);
      
      if (existingItemIndex >= 0) {
        // Update existing item
        const updatedItems = [...prevItems];
        const existingItem = updatedItems[existingItemIndex];
        updatedItems[existingItemIndex] = {
          ...existingItem,
          cantidad: existingItem.cantidad + product.cantidad,
          subtotal: (existingItem.cantidad + product.cantidad) * existingItem.precio * (1 - existingItem.descuento / 100)
        };
        return updatedItems;
      } else {
        // Add new item
        return [...prevItems, {
          ...product,
          subtotal: product.cantidad * product.precio * (1 - product.descuento / 100)
        }];
      }
    });
  };

  const removeFromCart = (productId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) return;
    
    setCartItems(prevItems => 
      prevItems.map(item => 
        item.id === productId 
          ? { 
              ...item, 
              cantidad: quantity,
              subtotal: quantity * item.precio * (1 - item.descuento / 100)
            } 
          : item
      )
    );
  };

  const updateDiscount = (productId: string, discount: number) => {
    if (discount < 0 || discount > 100) return;
    
    setCartItems(prevItems => 
      prevItems.map(item => 
        item.id === productId 
          ? { 
              ...item, 
              descuento: discount,
              subtotal: item.cantidad * item.precio * (1 - discount / 100)
            } 
          : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const totalItems = cartItems.reduce((total, item) => total + item.cantidad, 0);
  
  const subtotal = cartItems.reduce((total, item) => total + item.subtotal, 0);

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      updateDiscount,
      clearCart,
      totalItems,
      subtotal,
      currency,
      setCurrency: handleCurrencyChange,
      exchangeRate,
      setExchangeRate
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
} 