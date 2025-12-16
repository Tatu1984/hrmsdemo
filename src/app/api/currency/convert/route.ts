import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const amount = searchParams.get('amount');

    if (!from || !to || !amount) {
      return NextResponse.json(
        { error: 'Missing required parameters: from, to, amount' },
        { status: 400 }
      );
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Use exchangerate-api.com free tier (1,500 requests/month)
    // For production, consider using a paid API or caching rates
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${from}`,
      {
        next: { revalidate: 3600 } // Cache for 1 hour
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }

    const data = await response.json();
    const rate = data.rates[to];

    if (!rate) {
      return NextResponse.json(
        { error: `Exchange rate not found for ${from} to ${to}` },
        { status: 404 }
      );
    }

    const convertedAmount = numAmount * rate;

    return NextResponse.json({
      from,
      to,
      amount: numAmount,
      rate,
      convertedAmount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Currency conversion error:', error);
    return NextResponse.json(
      { error: 'Failed to convert currency' },
      { status: 500 }
    );
  }
}
