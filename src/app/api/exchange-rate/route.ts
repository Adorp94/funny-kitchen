import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // URL for Banxico API to get the USD to MXN exchange rate
    const url = 'https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/oportuno';
    
    // Token provided by the user
    const token = '66c15536eef14c33ee04957d8ac9fc8fc7c6a3fa819c6fc4d3d6515448f14433';
    
    const response = await fetch(url, {
      headers: {
        'Bmx-Token': token
      },
      // Add a cache: 'no-store' to make a fresh request each time
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`Banxico API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Extract the exchange rate and date from the response
    const seriesData = data?.bmx?.series?.[0]?.datos?.[0];
    
    if (!seriesData || !seriesData.dato) {
      throw new Error('Invalid response from Banxico API');
    }
    
    const exchangeRate = parseFloat(seriesData.dato);
    const date = seriesData.fecha;
    
    return NextResponse.json({
      success: true,
      rate: exchangeRate,
      date: date
    });
  } catch (error) {
    console.error('Error fetching exchange rate from Banxico:', error);
    
    // Fallback to a default exchange rate if the API call fails
    const fallbackRate = 20.4003;
    const fallbackDate = '28/06/2024';
    
    return NextResponse.json({
      success: false,
      rate: fallbackRate,
      date: fallbackDate,
      error: 'Failed to fetch from Banxico API, using fallback rate'
    });
  }
} 