import { useState, useEffect, useCallback } from 'react';

interface ExchangeRates {
  USD: number;
  EUR: number;
}

interface BaseRates {
  USD: number;
  EUR: number;
}

interface BanxicoResponse {
  bmx: {
    series: Array<{
      idSerie: string;
      titulo: string;
      datos: Array<{
        fecha: string;
        dato: string;
      }>;
    }>;
  };
}

export function useExchangeRate() {
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [baseRates, setBaseRates] = useState<BaseRates | null>(null);
  // Initialize loading as false to prevent hydration mismatch during SSG
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const MARKUP = -0.8; // Subtract 0.8 from the base rate

  useEffect(() => {
    // Set loading to true when effect starts to run
    setLoading(true);
    
    const fetchExchangeRates = async () => {
      try {
        console.log('[useExchangeRate] Fetching exchange rates from Banxico API...');
        
        // Set fallback values to use in case of error
        const fallbackRates = {
          USD: 20.4003,
          EUR: 22.1500
        };
        const fallbackDate = '28/06/2024';
        
        try {
          // Use server-side API route as a proxy to fetch Banxico data
          // This avoids CORS issues in the browser
          const response = await fetch('/api/exchange-rate');
          
          if (!response.ok) {
            throw new Error(`Failed to fetch exchange rates: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          
          if (!data.success) {
            console.log('Banxico API returned unsuccessful response, using fallback rates');
            throw new Error(data.error || 'API returned unsuccessful response');
          }
          
          const rates = data.rates;
          const date = data.date;
          
          if (!rates || !rates.USD || !rates.EUR || isNaN(parseFloat(rates.USD)) || isNaN(parseFloat(rates.EUR))) {
            throw new Error('Invalid exchange rate values received');
          }
          
          // Save the base rates
          const parsedRates = {
            USD: parseFloat(rates.USD),
            EUR: parseFloat(rates.EUR)
          };
          setBaseRates(parsedRates);
          
          // Calculate rates with markup
          const ratesWithMarkup = {
            USD: parsedRates.USD + MARKUP,
            EUR: parsedRates.EUR + MARKUP
          };
          setExchangeRates(ratesWithMarkup);
          setLastUpdated(date || fallbackDate);
          
          console.log('[useExchangeRate] Successfully fetched exchange rates:', parsedRates, 'with markup:', ratesWithMarkup);
          console.log('[useExchangeRate] Last updated date:', date);
        } catch (apiError) {
          console.log('Error fetching exchange rates, using fallback values:', apiError);
          setError(apiError instanceof Error ? apiError.message : 'Failed to fetch exchange rates');
          
          // Use fallback values
          setBaseRates(fallbackRates);
          setExchangeRates({
            USD: fallbackRates.USD + MARKUP,
            EUR: fallbackRates.EUR + MARKUP
          });
          setLastUpdated(fallbackDate);
        }
      } finally {
        console.log('[useExchangeRate] Setting loading to false');
        setLoading(false);
      }
    };

    fetchExchangeRates();
  }, []);

  // Fixed function to handle the date format from Banxico
  const formatDate = (dateStr: string): string => {
    try {
      // Handle the date format from Banxico (dd/mm/yyyy)
      const [day, month, year] = dateStr.split('/');
      return new Date(`${year}-${month}-${day}`).toLocaleDateString();
    } catch (e) {
      console.error('Error formatting date:', e);
      return dateStr; // Return the original string if parsing fails
    }
  };

  const convertMXNtoUSD = useCallback((amountMXN: number): number => {
    if (!exchangeRates) return amountMXN;
    return Number((amountMXN / exchangeRates.USD).toFixed(2));
  }, [exchangeRates]);

  const convertUSDtoMXN = useCallback((amountUSD: number): number => {
    if (!exchangeRates) return amountUSD;
    return Number((amountUSD * exchangeRates.USD).toFixed(2));
  }, [exchangeRates]);

  const convertMXNtoEUR = useCallback((amountMXN: number): number => {
    if (!exchangeRates) return amountMXN;
    return Number((amountMXN / exchangeRates.EUR).toFixed(2));
  }, [exchangeRates]);

  const convertEURtoMXN = useCallback((amountEUR: number): number => {
    if (!exchangeRates) return amountEUR;
    return Number((amountEUR * exchangeRates.EUR).toFixed(2));
  }, [exchangeRates]);

  const getExchangeRate = useCallback((currency: 'USD' | 'EUR'): number | null => {
    if (!exchangeRates) return null;
    return exchangeRates[currency];
  }, [exchangeRates]);

  const formatExchangeRateInfo = useCallback((): string => {
    if (!exchangeRates || !baseRates) return '';
    return `USD: ${exchangeRates.USD.toFixed(2)} MXN (Base: ${baseRates.USD.toFixed(2)} - ${Math.abs(MARKUP).toFixed(2)}) | EUR: ${exchangeRates.EUR.toFixed(2)} MXN (Base: ${baseRates.EUR.toFixed(2)} - ${Math.abs(MARKUP).toFixed(2)})`;
  }, [exchangeRates, baseRates]);

  return {
    exchangeRates,
    baseRates,
    loading,
    error,
    lastUpdated,
    formatDate,
    convertMXNtoUSD,
    convertUSDtoMXN,
    convertMXNtoEUR,
    convertEURtoMXN,
    getExchangeRate,
    formatExchangeRateInfo
  };
} 