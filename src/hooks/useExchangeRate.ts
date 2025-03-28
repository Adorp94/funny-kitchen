import { useState, useEffect } from 'react';

interface BanxicoResponse {
  bmx: {
    series: Array<{
      datos: Array<{
        fecha: string;
        dato: string;
      }>;
    }>;
  };
}

export function useExchangeRate() {
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        console.log('Fetching exchange rate from Banxico...');
        
        // Use a fallback value for testing
        const fallbackExchangeRate = 17.32;

        try {
          const response = await fetch(
            'https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/oportuno',
            {
              headers: {
                'Bmx-Token': '66c15536eef14c33ee04957d8ac9fc8fc7c6a3fa819c6fc4d3d6515448f14433'
              }
            }
          );

          console.log('Banxico API response status:', response.status);
          
          if (!response.ok) {
            console.error('Banxico API error:', response.status, response.statusText);
            throw new Error(`Failed to fetch exchange rate: ${response.status} ${response.statusText}`);
          }

          const responseText = await response.text();
          console.log('Banxico API response:', responseText.substring(0, 200) + '...');
          
          const data: BanxicoResponse = JSON.parse(responseText);
          
          if (!data.bmx?.series?.[0]?.datos?.[0]) {
            console.error('Invalid Banxico API response format:', data);
            throw new Error('Invalid response format');
          }

          const latestData = data.bmx.series[0].datos[0];
          const rate = parseFloat(latestData.dato);
          
          if (isNaN(rate)) {
            throw new Error('Invalid exchange rate value');
          }

          // Add 1.5 to the exchange rate as markup
          const rateWithMarkup = rate + 1.5;
          setExchangeRate(rateWithMarkup);
          setLastUpdated(latestData.fecha);
          console.log('Successfully fetched exchange rate:', rate, 'with markup:', rateWithMarkup);
        } catch (apiError) {
          console.error('Error fetching from Banxico API:', apiError);
          console.log('Using fallback exchange rate:', fallbackExchangeRate);
          
          // Use fallback value if API fails
          setExchangeRate(fallbackExchangeRate + 1.5);
          setLastUpdated(new Date().toISOString().split('T')[0]);
          setError(`API Error: ${apiError instanceof Error ? apiError.message : 'Unknown error'} (Using fallback rate)`);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Uncaught error fetching exchange rate:', err);
        
        // Emergency fallback
        setExchangeRate(18.82); // Base rate + markup
        setLastUpdated(new Date().toISOString().split('T')[0]);
        setError('Failed to fetch exchange rate (Using emergency fallback rate)');
        setLoading(false);
      }
    };

    fetchExchangeRate();
  }, []);

  const convertMXNtoUSD = (amountMXN: number): number => {
    if (!exchangeRate) return amountMXN;
    return Number((amountMXN / exchangeRate).toFixed(2));
  };

  const convertUSDtoMXN = (amountUSD: number): number => {
    if (!exchangeRate) return amountUSD;
    return Number((amountUSD * exchangeRate).toFixed(2));
  };

  const formatExchangeRateInfo = (): string => {
    if (!exchangeRate) return '';
    const baseRate = exchangeRate - 1.5;
    return `1 USD = ${exchangeRate.toFixed(2)} MXN (Base: ${baseRate.toFixed(2)} + 1.50)`;
  };

  return {
    exchangeRate,
    loading,
    error,
    lastUpdated,
    convertMXNtoUSD,
    convertUSDtoMXN,
    formatExchangeRateInfo
  };
} 