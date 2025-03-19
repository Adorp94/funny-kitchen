import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0].replace(/-/g, '');

    // Banxico API for USD/MXN exchange rate (series SF43718)
    const url = `https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/${formattedDate}/${formattedDate}`;
    
    const response = await fetch(url, {
      headers: {
        'Bmx-Token': process.env.BANXICO_API_TOKEN || '',
      },
    });

    if (!response.ok) {
      throw new Error(`Banxico API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Add $1.5 to the exchange rate as per business logic
    const exchangeRate = data.bmx.series[0].datos[0].dato 
      ? parseFloat(data.bmx.series[0].datos[0].dato) + 1.5 
      : null;

    return NextResponse.json({
      raw: data,
      exchangeRate,
      date: data.bmx.series[0].datos[0].fecha,
    });
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exchange rate' },
      { status: 500 }
    );
  }
}