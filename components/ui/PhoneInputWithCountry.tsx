'use client';

import React, { useState, useEffect, useId } from 'react';
import { Phone, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';
import {
  COUNTRY_CODES,
  parsePhoneNumber,
  validatePhoneNumber,
  PhoneValidationResult,
} from '@/lib/utils/phone-validation';

export interface PhoneInputWithCountryProps {
  value?: string;
  onChange: (fullPhone: string, isValid: boolean) => void;
  onBlur?: () => void;
  id?: string;
  name?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  error?: string;
  showInlineFeedback?: boolean;
  defaultCountryCode?: string;
}

export default function PhoneInputWithCountry({
  value = '',
  onChange,
  onBlur,
  id,
  name,
  label,
  required = false,
  disabled = false,
  placeholder,
  className = '',
  inputClassName = '',
  error: externalError,
  showInlineFeedback = true,
  defaultCountryCode = '+91',
}: PhoneInputWithCountryProps) {
  const generatedId = useId();
  const inputId = id || generatedId;

  // Internal state parsed from value
  const initial = parsePhoneNumber(value);
  const [countryCode, setCountryCode] = useState<string>(initial.countryCode || defaultCountryCode);
  const [nationalNumber, setNationalNumber] = useState<string>(initial.nationalNumber);
  const [isTouched, setIsTouched] = useState<boolean>(false);

  // Sync state if external value changes (e.g. form reset or autofill)
  useEffect(() => {
    const parsed = parsePhoneNumber(value);
    if (parsed.countryCode && parsed.countryCode !== countryCode) {
      setCountryCode(parsed.countryCode);
    }
    if (parsed.nationalNumber !== nationalNumber) {
      setNationalNumber(parsed.nationalNumber);
    }
  }, [value]);

  // Current validation status
  const validation: PhoneValidationResult = validatePhoneNumber(
    nationalNumber,
    countryCode,
    required
  );

  const displayError = externalError || (isTouched && nationalNumber.length > 0 && !validation.valid ? validation.error : '');
  const isValid = validation.valid && (required ? nationalNumber.length > 0 : true);

  const handleCountryChange = (newCode: string) => {
    setCountryCode(newCode);
    const combined = nationalNumber ? `${newCode} ${nationalNumber}` : '';
    const res = validatePhoneNumber(nationalNumber, newCode, required);
    onChange(combined, res.valid);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits
    const digitsOnly = e.target.value.replace(/\D/g, '');

    // Limit digits based on country
    const maxDigits = countryCode === '+91' ? 10 : 15;
    const trimmed = digitsOnly.slice(0, maxDigits);

    setNationalNumber(trimmed);
    const combined = trimmed ? `${countryCode} ${trimmed}` : '';
    const res = validatePhoneNumber(trimmed, countryCode, required);
    onChange(combined, res.valid);
  };

  const handleInputBlur = () => {
    setIsTouched(true);
    if (onBlur) onBlur();
  };

  const dynamicPlaceholder = placeholder || (countryCode === '+91' ? '9876543210' : 'Mobile number');

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5"
        >
          <Phone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>{label}</span>
          {required && <span className="text-red-500 font-bold">*</span>}
        </label>
      )}

      <div
        className={`relative flex items-center rounded-xl border-2 bg-white transition-all shadow-2xs ${
          displayError
            ? 'border-red-400 ring-4 ring-red-500/10'
            : 'border-slate-300 hover:border-amber-400 focus-within:border-amber-500 focus-within:ring-4 focus-within:ring-amber-500/15'
        } ${disabled ? 'opacity-70 bg-slate-100 cursor-not-allowed border-slate-200' : ''}`}
      >
        {/* Country Code Dropdown - Compact +91 Display */}
        <div className="relative shrink-0 flex items-center border-r-2 border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-l-xl px-2.5 py-2 sm:py-2.5 transition-colors cursor-pointer group">
          <span className="text-xs font-black text-slate-800 pointer-events-none select-none tracking-tight">
            {countryCode}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-800 pointer-events-none ml-1 shrink-0 transition-colors" />
          <select
            value={countryCode}
            onChange={(e) => handleCountryChange(e.target.value)}
            disabled={disabled}
            aria-label="Country Code"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code} ({c.name})
              </option>
            ))}
          </select>
        </div>

        {/* National Number Input */}
        <input
          id={inputId}
          name={name}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={nationalNumber}
          onChange={handleNumberChange}
          onBlur={handleInputBlur}
          disabled={disabled}
          placeholder={dynamicPlaceholder}
          required={required}
          className={`w-full pl-3 pr-9 py-2 sm:py-2.5 text-xs text-slate-900 bg-transparent placeholder:text-slate-400 focus:outline-none rounded-r-xl font-semibold ${inputClassName}`}
        />

        {/* Status Indicator Icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {isValid && nationalNumber.length > 0 ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : displayError ? (
            <AlertCircle className="w-4 h-4 text-red-500" />
          ) : null}
        </div>
      </div>

      {/* Inline Feedback Messages */}
      {showInlineFeedback && (
        <div className="min-h-[18px] mt-1 text-xs">
          {displayError ? (
            <p className="text-red-600 flex items-center gap-1 font-medium animate-fadeIn">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{displayError}</span>
            </p>
          ) : countryCode === '+91' && nationalNumber.length > 0 && nationalNumber.length < 10 ? (
            <p className="text-amber-600 text-[11px] font-medium">
              Enter 10 digits ({10 - nationalNumber.length} more needed)
            </p>
          ) : isValid && nationalNumber.length > 0 ? (
            <p className="text-emerald-700 text-[11px] font-semibold flex items-center gap-1">
              <span>✓ Valid mobile number</span>
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
