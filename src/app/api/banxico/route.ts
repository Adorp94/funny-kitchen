import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Mock response instead of calling the Banxico API which requires a token
    const mockExchangeRate = 18.5; // MXN to USD exchange rate
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];

    return NextResponse.json({
      raw: {
        bmx: {
          series: [
            {
              datos: [
                {
                  dato: mockExchangeRate.toString(),
                  fecha: formattedDate
                }
              ]
            }
          ]
        }
      },
      exchangeRate: mockExchangeRate + 1.5, // Add business margin
      date: formattedDate,
    });
  } catch (error) {
    console.error('Error creating mock exchange rate:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exchange rate' },
      { status: 500 }
    );
  }
}