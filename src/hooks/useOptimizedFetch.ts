import { useState, useEffect, useCallback, useRef } from 'react';

interface FetchOptions {
  cacheDuration?: number; // in milliseconds, default 2 minutes
  dependencies?: any[]; // dependencies to trigger refetch
}

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastFetch: number;
}

// Global cache for all fetch requests
const globalCache = new Map<string, { data: any; timestamp: number }>();

export function useOptimizedFetch<T>(
  url: string,
  options: FetchOptions = {}
) {
  const { cacheDuration = 120000, dependencies = [] } = options; // 2 min default
  
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: true,
    error: null,
    lastFetch: 0
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (force = false) => {
    const cacheKey = url;
    const cached = globalCache.get(cacheKey);
    const now = Date.now();

    // Check cache first unless forced
    if (!force && cached && now - cached.timestamp < cacheDuration) {
      setState(prev => ({
        ...prev,
        data: cached.data,
        loading: false,
        error: null,
        lastFetch: cached.timestamp
      }));
      return cached.data;
    }

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    // Only set loading if we don't have cached data
    setState(prev => ({
      ...prev,
      loading: !cached?.data,
      error: null
    }));

    try {
      const response = await fetch(url, {
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const data = result.data || result;

      // Cache the result
      globalCache.set(cacheKey, {
        data,
        timestamp: now
      });

      setState({
        data,
        loading: false,
        error: null,
        lastFetch: now
      });

      return data;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return; // Request was cancelled, don't update state
      }

      const errorMsg = err.message || "Error al cargar datos";
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMsg
      }));
      
      throw err;
    }
  }, [url, cacheDuration]);

  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  // Clear cache for specific URL
  const clearCache = useCallback(() => {
    globalCache.delete(url);
  }, [url]);

  // Effect for initial load and dependency changes
  useEffect(() => {
    fetchData();
    
    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, ...dependencies]);

  return {
    ...state,
    refetch,
    clearCache,
    isStale: state.lastFetch > 0 && Date.now() - state.lastFetch > cacheDuration
  };
}

// Utility to clear all cache
export const clearAllCache = () => {
  globalCache.clear();
};

// Utility to get cache size
export const getCacheSize = () => {
  return globalCache.size;
}; 