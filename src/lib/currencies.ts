// Comprehensive currency list based on Skydo's supported currencies
export const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED', flag: '🇦🇪' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', flag: '🇳🇴' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', flag: '🇩🇰' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'Mex$', flag: '🇲🇽' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', flag: '🇵🇱' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', flag: '🇹🇷' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', flag: '🇷🇺' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', flag: '🇨🇿' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', flag: '🇭🇺' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', flag: '🇮🇱' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SR', flag: '🇸🇦' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KD', flag: '🇰🇼' },
] as const;

export type CurrencyCode = typeof CURRENCIES[number]['code'];

// Skydo fee structure based on payment amount
export function calculateSkydoFee(amountUSD: number): number {
  if (amountUSD <= 2000) {
    return 19;
  } else if (amountUSD <= 10000) {
    return 29;
  } else {
    return amountUSD * 0.003; // 0.3%
  }
}

// InstaLinks fee structure
export interface InstaLinksFee {
  cardFee: number; // 5%
  achFee: number; // 2%
}

export function calculateInstaLinksFees(amount: number): InstaLinksFee {
  return {
    cardFee: amount * 0.05,
    achFee: amount * 0.02,
  };
}

// Format currency with symbol
export function formatCurrencyWithSymbol(amount: number, currencyCode: CurrencyCode): string {
  const currency = CURRENCIES.find(c => c.code === currencyCode);
  if (!currency) return `${amount.toFixed(2)}`;

  // Special formatting for certain currencies
  if (currencyCode === 'JPY' || currencyCode === 'KRW' || currencyCode === 'IDR') {
    // No decimal places for these currencies
    return `${currency.symbol}${Math.round(amount).toLocaleString()}`;
  }

  return `${currency.symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Get currency by code
export function getCurrency(code: string) {
  return CURRENCIES.find(c => c.code === code);
}

// Calculate net payout after Skydo fees (for USD payments)
export interface PayoutBreakdown {
  grossAmount: number;
  skydoFee: number;
  netAmountUSD: number;
  exchangeRate: number;
  netAmountINR: number;
  conversionFeePercentage: number; // Skydo uses 0% - mid-market rate
}

export function calculatePayoutBreakdown(
  amountUSD: number,
  exchangeRate: number
): PayoutBreakdown {
  const skydoFee = calculateSkydoFee(amountUSD);
  const netAmountUSD = amountUSD - skydoFee;
  const netAmountINR = netAmountUSD * exchangeRate;

  return {
    grossAmount: amountUSD,
    skydoFee,
    netAmountUSD,
    exchangeRate,
    netAmountINR,
    conversionFeePercentage: 0, // Skydo uses mid-market rate with 0% markup
  };
}

// Convert between any two currencies
export async function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode
): Promise<{ convertedAmount: number; rate: number } | null> {
  try {
    // Use exchangerate-api.com free tier (1,500 requests/month)
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${from}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }

    const data = await response.json();
    const rate = data.rates[to];

    if (!rate) {
      throw new Error(`Exchange rate not found for ${from} to ${to}`);
    }

    return {
      convertedAmount: amount * rate,
      rate,
    };
  } catch (error) {
    console.error('Currency conversion error:', error);
    return null;
  }
}
