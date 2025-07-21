// Production data synchronization utilities using browser events

export type ProductionUpdateEvent = {
  type: 'production_active_update' | 'empaque_update';
  producto_id: number;
  timestamp: number;
  source?: string;
};

// Custom event dispatcher for production updates
export const dispatchProductionUpdate = (evento: ProductionUpdateEvent) => {
  if (typeof window !== 'undefined') {
    const customEvent = new CustomEvent('production-data-update', {
      detail: evento
    });
    window.dispatchEvent(customEvent);
  }
};

// Hook for listening to production updates
export const useProductionSync = (callback: (event: ProductionUpdateEvent) => void) => {
  const handleProductionUpdate = (event: CustomEvent<ProductionUpdateEvent>) => {
    callback(event.detail);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('production-data-update', handleProductionUpdate as EventListener);
    
    return () => {
      window.removeEventListener('production-data-update', handleProductionUpdate as EventListener);
    };
  }
  
  return () => {};
};