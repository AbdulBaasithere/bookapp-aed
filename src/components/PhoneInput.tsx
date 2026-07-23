import React from 'react';
import { COUNTRY_CODES, CountryCode } from '../utils/countryUtils';

interface PhoneInputProps {
  value: string;
  onChange: (val: string) => void;
  countryCode?: string;
  onCountryCodeChange?: (code: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  id?: string;
  label?: string;
}

export default function PhoneInput({
  value,
  onChange,
  countryCode = '+971',
  onCountryCodeChange,
  placeholder = '50 123 4567',
  required = false,
  className = '',
  id,
  label
}: PhoneInputProps) {
  const currentCountry = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0];

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="relative flex items-center rounded-xl border border-slate-200 bg-white shadow-2xs focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all overflow-hidden">
        {/* Country Code Select Dropdown */}
        <div className="relative flex items-center bg-slate-50 border-r border-slate-200 px-2.5 py-2.5 hover:bg-slate-100 transition-colors shrink-0">
          <span className="mr-1 text-sm">{currentCountry.flag}</span>
          <select
            value={countryCode}
            onChange={(e) => onCountryCodeChange && onCountryCodeChange(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-800 cursor-pointer focus:outline-hidden pr-1"
            title="Select Country Code"
            aria-label="Country Code"
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code} ({c.name})
              </option>
            ))}
          </select>
        </div>

        {/* Number Input */}
        <input
          id={id}
          type="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full bg-transparent px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden font-medium"
        />
      </div>
    </div>
  );
}
