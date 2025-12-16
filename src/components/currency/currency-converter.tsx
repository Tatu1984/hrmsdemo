'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  CURRENCIES,
  CurrencyCode,
  calculatePayoutBreakdown,
  formatCurrencyWithSymbol,
  calculateInstaLinksFees,
  getCurrency
} from '@/lib/currencies';
import { ArrowRightLeft, Loader2, TrendingUp, DollarSign, Info } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface ConversionResult {
  convertedAmount: number;
  rate: number;
  timestamp: Date;
}

export function CurrencyConverter() {
  const [amount, setAmount] = useState<string>('1000');
  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>('USD');
  const [toCurrency, setToCurrency] = useState<CurrencyCode>('INR');
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConvert = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/currency/convert?from=${fromCurrency}&to=${toCurrency}&amount=${numAmount}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch conversion rate');
      }

      const data = await response.json();
      setResult({
        convertedAmount: data.convertedAmount,
        rate: data.rate,
        timestamp: new Date(),
      });
    } catch (err) {
      setError('Failed to convert currency. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setResult(null);
  };

  // Auto-convert on amount or currency change
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

  // Calculate Skydo fees if converting FROM USD to INR
  const showSkydoBreakdown = fromCurrency === 'USD' && toCurrency === 'INR' && result;
  const payoutBreakdown = showSkydoBreakdown
    ? calculatePayoutBreakdown(parseFloat(amount), result.rate)
    : null;

  const instaLinksFees = showSkydoBreakdown
    ? calculateInstaLinksFees(parseFloat(amount))
    : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            Currency Converter
          </CardTitle>
          <CardDescription>
            Live exchange rates with Skydo-style payout calculations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="from-currency">From</Label>
              <Select value={fromCurrency} onValueChange={(value) => setFromCurrency(value as CurrencyCode)}>
                <SelectTrigger id="from-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      <div className="flex items-center gap-2">
                        <span>{currency.flag}</span>
                        <span className="font-medium">{currency.code}</span>
                        <span className="text-gray-500 text-sm">{currency.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="to-currency">To</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSwapCurrencies}
                  className="h-6 px-2"
                >
                  <ArrowRightLeft className="w-3 h-3" />
                </Button>
              </div>
              <Select value={toCurrency} onValueChange={(value) => setToCurrency(value as CurrencyCode)}>
                <SelectTrigger id="to-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      <div className="flex items-center gap-2">
                        <span>{currency.flag}</span>
                        <span className="font-medium">{currency.code}</span>
                        <span className="text-gray-500 text-sm">{currency.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          )}

          {result && !loading && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Converted Amount</span>
                  <Badge variant="outline" className="bg-white">
                    Live Rate: 1 {fromCurrency} = {result.rate.toFixed(4)} {toCurrency}
                  </Badge>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-blue-900">
                    {formatCurrencyWithSymbol(result.convertedAmount, toCurrency)}
                  </span>
                  <span className="text-lg text-gray-500">
                    {toCurrencyInfo?.code}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  {formatCurrencyWithSymbol(parseFloat(amount), fromCurrency)} {fromCurrencyInfo?.code}
                </div>
              </div>

              <div className="text-xs text-gray-500 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Last updated: {result.timestamp.toLocaleTimeString()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skydo Payout Breakdown - Only for USD to INR */}
      {showSkydoBreakdown && payoutBreakdown && instaLinksFees && (
        <Card className="border-purple-200 bg-purple-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-900">
              <TrendingUp className="w-5 h-5" />
              Skydo Payout Breakdown
            </CardTitle>
            <CardDescription>
              Fee structure and net payout calculation for international payments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main Payout Calculation */}
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-700">Gross Amount (USD)</span>
                <span className="font-semibold text-lg">
                  {formatCurrencyWithSymbol(payoutBreakdown.grossAmount, 'USD')}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b">
                <div className="flex items-center gap-2">
                  <span className="text-gray-700">Skydo Fee</span>
                  <Badge variant="outline" className="bg-white text-xs">
                    {payoutBreakdown.grossAmount <= 2000 ? '$19 flat' :
                     payoutBreakdown.grossAmount <= 10000 ? '$29 flat' : '0.3%'}
                  </Badge>
                </div>
                <span className="font-semibold text-red-600">
                  -{formatCurrencyWithSymbol(payoutBreakdown.skydoFee, 'USD')}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-purple-300 bg-purple-100/50 px-3 rounded-lg">
                <span className="font-semibold text-gray-900">Net Amount (USD)</span>
                <span className="font-bold text-xl text-purple-900">
                  {formatCurrencyWithSymbol(payoutBreakdown.netAmountUSD, 'USD')}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b">
                <div className="flex items-center gap-2">
                  <span className="text-gray-700">Exchange Rate</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
                    Mid-market • 0% markup
                  </Badge>
                </div>
                <span className="font-semibold">
                  1 USD = ₹{payoutBreakdown.exchangeRate.toFixed(4)}
                </span>
              </div>

              <div className="flex justify-between items-center py-3 bg-gradient-to-r from-green-50 to-emerald-50 px-4 rounded-lg border-2 border-green-300">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Final Payout (INR)</div>
                  <div className="text-xs text-green-700">After Skydo fees, before taxes</div>
                </div>
                <span className="font-bold text-3xl text-green-700">
                  {formatCurrencyWithSymbol(payoutBreakdown.netAmountINR, 'INR')}
                </span>
              </div>
            </div>

            {/* InstaLinks Payment Method Fees */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <h4 className="font-semibold text-sm">InstaLinks Payment Method Fees</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center py-1.5 border-b">
                  <span className="text-gray-600">Credit/Debit Card (5%)</span>
                  <span className="font-semibold text-orange-600">
                    {formatCurrencyWithSymbol(instaLinksFees.cardFee, 'USD')}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-gray-600">ACH Transfer (2%)</span>
                  <span className="font-semibold text-blue-600">
                    {formatCurrencyWithSymbol(instaLinksFees.achFee, 'USD')}
                  </span>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                <Info className="w-3 h-3 inline mr-1" />
                InstaLinks fees apply when collecting payments via payment request links
              </div>
            </div>

            {/* Comparison with Traditional Banks */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-sm text-blue-900 mb-2">
                Why Skydo?
              </h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>✓ Mid-market exchange rate (0% forex markup)</li>
                <li>✓ Transparent flat fees (no hidden charges)</li>
                <li>✓ Free FIRA (Foreign Inward Remittance Advice)</li>
                <li>✓ RBI approved Payment Aggregator (PA-CB)</li>
                <li>✓ Save ~2-4% compared to PayPal/banks</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
