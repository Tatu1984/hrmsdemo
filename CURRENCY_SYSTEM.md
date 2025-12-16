# Currency Converter & Skydo Integration

## Overview

The HRMS system now includes a comprehensive currency management system with live exchange rates and Skydo-style payout calculations. This feature helps you understand international payment flows and calculate net payouts after fees.

## Features

### 1. Currency List (32 Currencies Supported)

**Major Currencies:**
- 🇺🇸 USD - US Dollar
- 🇪🇺 EUR - Euro
- 🇬🇧 GBP - British Pound
- 🇨🇦 CAD - Canadian Dollar
- 🇦🇺 AUD - Australian Dollar
- 🇸🇬 SGD - Singapore Dollar
- 🇦🇪 AED - UAE Dirham
- 🇮🇳 INR - Indian Rupee

**And 24 more currencies** including CHF, JPY, CNY, HKD, NZD, SEK, NOK, DKK, MXN, BRL, ZAR, PLN, THB, MYR, IDR, PHP, KRW, TRY, RUB, CZK, HUF, ILS, SAR, KWD

### 2. Live Exchange Rates

- Real-time currency conversion using exchangerate-api.com
- Rates cached for 1 hour for optimal performance
- Mid-market rates (no markup)
- Supports conversion between any two currencies

### 3. Skydo Payout Calculator

Based on Skydo's 2025 fee structure:

#### Standard Fees:
- **Up to $2,000**: $19 flat fee
- **$2,001 - $10,000**: $29 flat fee
- **Above $10,000**: 0.3% of amount

#### InstaLinks Payment Fees:
- **Credit/Debit Card**: 5% fee
- **ACH Transfer**: 2% fee

#### Key Benefits:
- ✓ Mid-market exchange rate (0% forex markup)
- ✓ Transparent flat fees (no hidden charges)
- ✓ Free FIRA (Foreign Inward Remittance Advice)
- ✓ RBI approved Payment Aggregator (PA-CB)
- ✓ Save ~2-4% compared to PayPal/banks

## Where to Find Currency Converter

### 1. **Dedicated Currency Page**
Navigate to: **Accounts → Currency Converter**

Full-featured converter with:
- Live exchange rates
- Skydo payout breakdown (USD → INR)
- InstaLinks fee comparison
- Detailed fee explanations

### 2. **Invoice Upload Dialog**
When creating/uploading invoices:
- Enter invoice amount
- Mini converter automatically appears
- Shows converted amount and Skydo fees
- Helps calculate expected payout

### 3. **Invoice View Dialog**
When viewing invoice details:
- Converter embedded at bottom
- Pre-filled with invoice amount and currency
- Real-time conversion to INR
- Skydo breakdown for USD invoices

### 4. **Project Creation Dialog**
When creating new projects:
- Enter total budget
- Currency converter shows below
- Calculate project value in different currencies
- Understand international project pricing

## Usage Examples

### Example 1: Converting Invoice Amount
**Scenario:** Client will pay $5,000 USD

**Breakdown:**
```
Gross Amount:        $5,000.00 USD
Skydo Fee:          -$   29.00 USD (flat fee for $2,001-$10,000)
Net Amount USD:      $4,971.00 USD
Exchange Rate:       1 USD = ₹85.00 INR (mid-market, 0% markup)
Final Payout INR:    ₹4,22,535.00
```

**Savings vs Traditional Banks:**
- Banks typically charge 2-4% forex markup
- On $5,000: Save ₹8,500 - ₹17,000

### Example 2: InstaLinks Payment Collection
**Scenario:** Collecting $10,000 via InstaLinks

**Payment Method Comparison:**
```
Option 1 - ACH Transfer (2% fee):
Collection Fee:      $200.00
Net Received:        $9,800.00
Skydo Fee:          -$  29.00
Final USD:           $9,771.00
Final INR:           ₹8,30,535.00

Option 2 - Credit Card (5% fee):
Collection Fee:      $500.00
Net Received:        $9,500.00
Skydo Fee:          -$  29.00
Final USD:           $9,471.00
Final INR:           ₹8,05,035.00

Recommendation: Use ACH for better rates
```

### Example 3: Large Project Pricing
**Scenario:** Project budget $25,000 USD

**Breakdown:**
```
Gross Amount:        $25,000.00 USD
Skydo Fee:          -$    75.00 USD (0.3% for amounts >$10,000)
Net Amount USD:      $24,925.00 USD
Exchange Rate:       1 USD = ₹85.00 INR
Final Payout INR:    ₹21,18,625.00
```

## Technical Details

### API Endpoint
```
GET /api/currency/convert?from={FROM}&to={TO}&amount={AMOUNT}

Response:
{
  "from": "USD",
  "to": "INR",
  "amount": 1000,
  "rate": 85.0,
  "convertedAmount": 85000,
  "timestamp": "2025-01-23T10:30:00Z"
}
```

### Components

1. **CurrencyConverter** (`/src/components/currency/currency-converter.tsx`)
   - Full-featured converter with Skydo breakdown
   - Used in dedicated currency page

2. **MiniCurrencyConverter** (`/src/components/currency/mini-currency-converter.tsx`)
   - Compact widget for embedding
   - Used in dialogs and forms

3. **Currency Utilities** (`/src/lib/currencies.ts`)
   - Currency definitions
   - Fee calculation functions
   - Formatting utilities

### Fee Calculation Functions

```typescript
// Calculate Skydo fee
calculateSkydoFee(amountUSD: number): number

// Calculate InstaLinks fees
calculateInstaLinksFees(amount: number): { cardFee: number, achFee: number }

// Get full payout breakdown
calculatePayoutBreakdown(amountUSD: number, exchangeRate: number): PayoutBreakdown

// Format currency with symbol
formatCurrencyWithSymbol(amount: number, currencyCode: CurrencyCode): string
```

## Best Practices

1. **Always Check Real Rates**: Exchange rates fluctuate. Use the live converter before finalizing invoices.

2. **Factor in Fees**: When quoting international clients, consider Skydo fees in your pricing.

3. **Use ACH When Possible**: For InstaLinks payments, ACH (2%) is more cost-effective than cards (5%).

4. **Large Transactions**: For amounts >$10,000, the 0.3% fee becomes more economical than flat fees.

5. **Currency Matching**: Try to invoice in USD for Skydo payments to minimize conversion steps.

## Troubleshooting

### Exchange Rate Not Loading
- Check internet connection
- API may be rate-limited (1,500 requests/month on free tier)
- Wait a few seconds and try again

### Incorrect Calculations
- Verify amounts are entered correctly
- Check currency selection (FROM/TO)
- Ensure using latest exchange rates

### Skydo Breakdown Not Showing
- Skydo breakdown only appears for USD → INR conversions
- Ensure FROM currency is USD and TO currency is INR

## References

Based on Skydo's official 2025 fee structure and payment processing capabilities.

**Sources:**
- [Skydo vs Payoneer (2025): Fees, FX, FIRA & Speed](https://www.skydo.com/blog/skydo-vs-payoneer-international-payments-2025)
- [Skydo vs Wise (2025): Best Payment Platform for India?](https://www.xflowpay.com/blog/skydo-vs-wise)
- [Skydo FAQ: Supported Currencies](https://www.skydo.com/faqs/international-accounts)

## Future Enhancements

Potential additions:
- [ ] Multi-currency invoice support in database
- [ ] Historical exchange rate tracking
- [ ] Automatic currency detection from client location
- [ ] Batch conversion for multiple invoices
- [ ] Currency preferences per client
- [ ] Exchange rate alerts
- [ ] Integration with actual Skydo API (when available)
