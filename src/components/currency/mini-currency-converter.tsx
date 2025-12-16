'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CURRENCIES,
  CurrencyCode,
  formatCurrencyWithSymbol,
  getCurrency,
  calculatePayoutBreakdown,
} from '@/lib/currencies';
import { ArrowRightLeft, Info } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface MiniCurrencyConverterProps {
  defaultAmount?: number;
  defaultFrom?: CurrencyCode;
  defaultTo?: CurrencyCode;
  onConversionChange?: (result: { amount: number; rate: number; convertedAmount: number }) => void;
}

export function MiniCurrencyConverter({
  defaultAmount = 1000,
  defaultFrom = 'USD',
  defaultTo = 'INR',
  onConversionChange,
}: MiniCurrencyConverterProps) {
  const [amount, setAmount] = useState<string>(defaultAmount.toString());
  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>(defaultFrom);
  const [toCurrency, setToCurrency] = useState<CurrencyCode>(defaultTo);
  const [rate, setRate] = useState<number | null>(null);
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConvert = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    setLoading(true);

    try {
      const response = await fetch(
        `/api/currency/convert?from=${fromCurrency}&to=${toCurrency}&amount=${numAmount}`
      );

      if (response.ok) {
        const data = await response.json();
        setRate(data.rate);
        setConvertedAmount(data.convertedAmount);

        if (onConversionChange) {
          onConversionChange({
            amount: numAmount,
            rate: data.rate,
            convertedAmount: data.convertedAmount,
          });
        }
      }
    } catch (err) {
      console.error('Conversion error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (amount && parseFloat(amount) > 0) {
      const timer = setTimeout(() => {
        handleConvert();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [amount, fromCurrency, toCurrency]);

  const fromCurrencyInfo = getCurrency(fromCurrency);
  const toCurrencyInfo = getCurrency(toCurrency);

  // Show Skydo breakdown for USD to INR
  const showSkydoFee = fromCurrency === 'USD' && toCurrency === 'INR' && rate;
  const payoutBreakdown = showSkydoFee
    ? calculatePayoutBreakdown(parseFloat(amount), rate)
    : null;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <ArrowRightLeft className="w-4 h-4 text-blue-600" />
        <h3 className="font-semibold text-sm text-blue-900">Quick Currency Converter</h3>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label htmlFor="mini-amount" className="text-xs">Amount</Label>
          <Input
            id="mini-amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="mini-from" className="text-xs">From</Label>
          <Select value={fromCurrency} onValueChange={(value) => setFromCurrency(value as CurrencyCode)}>
            <SelectTrigger id="mini-from" className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              {CURRENCIES.map((currency) => (
                <SelectItem key={currency.code} value={currency.code} className="text-xs">
                  {currency.flag} {currency.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="mini-to" className="text-xs">To</Label>
          <Select value={toCurrency} onValueChange={(value) => setToCurrency(value as CurrencyCode)}>
            <SelectTrigger id="mini-to" className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              {CURRENCIES.map((currency) => (
                <SelectItem key={currency.code} value={currency.code} className="text-xs">
                  {currency.flag} {currency.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {rate && convertedAmount && !loading && (
        <div className="space-y-2">
          <div className="bg-white rounded-lg p-3 border border-blue-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600">Converted Amount</span>
              <Badge variant="outline" className="text-xs h-5">
                Rate: {rate.toFixed(4)}
              </Badge>
            </div>
            <div className="text-2xl font-bold text-blue-900">
              {formatCurrencyWithSymbol(convertedAmount, toCurrency)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {formatCurrencyWithSymbol(parseFloat(amount), fromCurrency)} {fromCurrencyInfo?.code}
            </div>
          </div>

          {/* Skydo Payout Summary */}
          {showSkydoFee && payoutBreakdown && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-1 text-xs font-semibold text-purple-900">
                <Info className="w-3 h-3" />
                Skydo Payout (After Fees)
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Skydo Fee:</span>
                  <span className="text-red-600 font-medium">
                    -{formatCurrencyWithSymbol(payoutBreakdown.skydoFee, 'USD')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Net USD:</span>
                  <span className="font-medium">
                    {formatCurrencyWithSymbol(payoutBreakdown.netAmountUSD, 'USD')}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-purple-300">
                  <span className="font-semibold text-purple-900">Net INR:</span>
                  <span className="font-bold text-green-700">
                    {formatCurrencyWithSymbol(payoutBreakdown.netAmountINR, 'INR')}
                  </span>
                </div>
              </div>
              <div className="text-xs text-purple-700 bg-purple-100 px-2 py-1 rounded">
                Mid-market rate • 0% forex markup
              </div>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="text-center text-xs text-gray-500 py-2">
          Converting...
        </div>
      )}
    </div>
  );
}
