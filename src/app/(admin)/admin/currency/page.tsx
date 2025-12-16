import { CurrencyConverter } from '@/components/currency/currency-converter';

export default function CurrencyPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Currency Converter</h1>
        <p className="text-gray-600">
          Convert currencies with live exchange rates and Skydo payout calculations
        </p>
      </div>

      <CurrencyConverter />
    </div>
  );
}
