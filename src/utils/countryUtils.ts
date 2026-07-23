export interface CountryCode {
  code: string;       // e.g. '+971'
  flag: string;       // e.g. '🇦🇪'
  name: string;       // e.g. 'UAE (Dubai)'
  digitCount: number; // e.g. 9
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: '+971', flag: '🇦🇪', name: 'UAE (Dubai)', digitCount: 9 },
  { code: '+91', flag: '🇮🇳', name: 'India', digitCount: 10 },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia', digitCount: 9 },
  { code: '+974', flag: '🇶🇦', name: 'Qatar', digitCount: 8 },
  { code: '+965', flag: '🇰🇼', name: 'Kuwait', digitCount: 8 },
  { code: '+968', flag: '🇴🇲', name: 'Oman', digitCount: 8 },
  { code: '+973', flag: '🇧🇭', name: 'Bahrain', digitCount: 8 },
  { code: '+1', flag: '🇺🇸', name: 'US / Canada', digitCount: 10 },
  { code: '+44', flag: '🇬🇧', name: 'United Kingdom', digitCount: 10 },
];

export const UAE_EMIRATES = [
  'Dubai',
  'Abu Dhabi',
  'Sharjah',
  'Ajman',
  'Ras Al Khaimah',
  'Fujairah',
  'Umm Al Quwain'
];

export interface CurrencyOption {
  code: string;
  symbol: string;
  label: string;
}

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'AED', symbol: 'AED', label: 'AED (UAE Dirham)' },
  { code: 'INR', symbol: '₹', label: 'INR (Indian Rupee)' },
  { code: 'USD', symbol: '$', label: 'USD (US Dollar)' },
  { code: 'EUR', symbol: '€', label: 'EUR (Euro)' },
  { code: 'GBP', symbol: '£', label: 'GBP (British Pound)' },
  { code: 'SAR', symbol: 'SAR', label: 'SAR (Saudi Riyal)' },
  { code: 'QAR', symbol: 'QAR', label: 'QAR (Qatari Riyal)' },
];

/**
 * Standardizes phone number to digits only
 */
export function sanitizePhoneDigits(phone: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * Clean phone for WhatsApp linking URL (wa.me/XYZ)
 * Handles Dubai/UAE numbers starting with 05..., 971..., +971...
 */
export function getWhatsAppPhone(phone: string, defaultCountryCode = '971'): string {
  if (!phone) return '';
  let digits = sanitizePhoneDigits(phone);
  
  // If user entered e.g. "0501234567" or "0551234567" (local UAE mobile format)
  if (digits.startsWith('05') && digits.length === 10) {
    digits = '971' + digits.substring(1);
    return digits;
  }
  
  // If user entered e.g. "501234567" (9 digits UAE mobile)
  if (digits.length === 9 && (digits.startsWith('50') || digits.startsWith('52') || digits.startsWith('54') || digits.startsWith('55') || digits.startsWith('56') || digits.startsWith('58'))) {
    return '971' + digits;
  }

  // If already starts with 971 or 91 or 1 or 966, etc.
  const hasKnownCountryCode = COUNTRY_CODES.some(c => {
    const codeDigits = c.code.replace('+', '');
    return digits.startsWith(codeDigits) && digits.length >= (codeDigits.length + 7);
  });

  if (hasKnownCountryCode) {
    return digits;
  }

  // Default fallback: prepend default country code (e.g. 971)
  const codeDigits = defaultCountryCode.replace('+', '');
  return codeDigits + digits;
}

/**
 * Build WhatsApp shareable URL
 */
export function buildWhatsAppLink(phone: string, text: string, defaultCountryCode = '971'): string {
  const cleanNum = getWhatsAppPhone(phone, defaultCountryCode);
  return `https://wa.me/${cleanNum}?text=${encodeURIComponent(text)}`;
}

/**
 * Format displayed phone number nicely, e.g. +971 50 123 4567
 */
export function formatDisplayPhone(phone: string, countryCode = '+971'): string {
  if (!phone) return '';
  const digits = sanitizePhoneDigits(phone);
  
  if (phone.trim().startsWith('+')) {
    return phone;
  }

  if (digits.startsWith('971') && digits.length >= 11) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }

  return `${countryCode} ${phone}`;
}

/**
 * Format currency amount with symbol / code
 */
export function formatCurrency(amount: number | undefined | null, currencyCode = 'AED'): string {
  const num = Number(amount || 0);
  const matched = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
  const symbol = matched ? matched.symbol : currencyCode;
  
  if (currencyCode === 'AED' || currencyCode === 'SAR' || currencyCode === 'QAR') {
    return `${symbol} ${num.toLocaleString('en-US', { minimumFractionDigits: num % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
  }
  
  if (currencyCode === 'INR') {
    return `₹${num.toLocaleString('en-IN')}`;
  }

  if (currencyCode === 'USD') {
    return `$${num.toLocaleString('en-US')}`;
  }

  return `${symbol} ${num.toLocaleString()}`;
}

/**
 * VAT 5% calculation helper for UAE Dubai
 */
export function calculateUaeVat(amount: number, vatRatePercent = 5) {
  const subtotal = Math.max(0, amount);
  const vatAmount = Math.round((subtotal * (vatRatePercent / 100)) * 100) / 100;
  const total = Math.round((subtotal + vatAmount) * 100) / 100;
  return { subtotal, vatAmount, total };
}
