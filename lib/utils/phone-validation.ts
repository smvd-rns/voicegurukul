/**
 * Phone Number & Country Code Validation Utilities for VOICE Gurukul
 * Default Country Code: +91 (India)
 */

export interface CountryCode {
  code: string;
  name: string;
  flag: string;
  expectedDigits?: number; // e.g. 10 for India
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: '+91', name: 'India', flag: '🇮🇳', expectedDigits: 10 },
  { code: '+1', name: 'USA / Canada', flag: '🇺🇸', expectedDigits: 10 },
  { code: '+44', name: 'UK', flag: '🇬🇧', expectedDigits: 10 },
  { code: '+971', name: 'UAE', flag: '🇦🇪', expectedDigits: 9 },
  { code: '+65', name: 'Singapore', flag: '🇸🇬', expectedDigits: 8 },
  { code: '+61', name: 'Australia', flag: '🇦🇺', expectedDigits: 9 },
  { code: '+60', name: 'Malaysia', flag: '🇲🇾', expectedDigits: 9 },
  { code: '+977', name: 'Nepal', flag: '🇳🇵', expectedDigits: 10 },
  { code: '+880', name: 'Bangladesh', flag: '🇧🇩', expectedDigits: 10 },
  { code: '+94', name: 'Sri Lanka', flag: '🇱🇰', expectedDigits: 9 },
  { code: '+974', name: 'Qatar', flag: '🇶🇦', expectedDigits: 8 },
  { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦', expectedDigits: 9 },
  { code: '+968', name: 'Oman', flag: '🇴🇲', expectedDigits: 8 },
  { code: '+973', name: 'Bahrain', flag: '🇧🇭', expectedDigits: 8 },
  { code: '+965', name: 'Kuwait', flag: '🇰🇼', expectedDigits: 8 },
  { code: '+49', name: 'Germany', flag: '🇩🇪', expectedDigits: 10 },
  { code: '+33', name: 'France', flag: '🇫🇷', expectedDigits: 9 },
  { code: '+27', name: 'South Africa', flag: '🇿🇦', expectedDigits: 9 },
  { code: '+254', name: 'Kenya', flag: '🇰🇪', expectedDigits: 9 },
  { code: '+255', name: 'Tanzania', flag: '🇹🇿', expectedDigits: 9 },
  { code: '+256', name: 'Uganda', flag: '🇺🇬', expectedDigits: 9 },
  { code: '+230', name: 'Mauritius', flag: '🇲🇺', expectedDigits: 8 },
  { code: '+7', name: 'Russia', flag: '🇷🇺', expectedDigits: 10 },
  { code: '+81', name: 'Japan', flag: '🇯🇵', expectedDigits: 10 },
  { code: '+64', name: 'New Zealand', flag: '🇳🇿', expectedDigits: 9 },
  { code: '+31', name: 'Netherlands', flag: '🇳🇱', expectedDigits: 9 },
  { code: '+41', name: 'Switzerland', flag: '🇨🇭', expectedDigits: 9 },
  { code: '+46', name: 'Sweden', flag: '🇸🇪', expectedDigits: 9 },
  { code: '+353', name: 'Ireland', flag: '🇮🇪', expectedDigits: 9 },
  { code: '+39', name: 'Italy', flag: '🇮🇹', expectedDigits: 10 },
  { code: '+34', name: 'Spain', flag: '🇪🇸', expectedDigits: 9 },
  { code: '+55', name: 'Brazil', flag: '🇧🇷', expectedDigits: 11 },
  { code: '+52', name: 'Mexico', flag: '🇲🇽', expectedDigits: 10 },
  { code: '+62', name: 'Indonesia', flag: '🇮🇩', expectedDigits: 10 },
  { code: '+66', name: 'Thailand', flag: '🇹🇭', expectedDigits: 9 },
  { code: '+84', name: 'Vietnam', flag: '🇻🇳', expectedDigits: 9 },
  { code: '+852', name: 'Hong Kong', flag: '🇭🇰', expectedDigits: 8 },
];

export interface ParsedPhone {
  countryCode: string;
  nationalNumber: string;
  fullPhone: string;
}

/**
 * Parses any incoming phone string into country code and national number.
 * Defaults country code to '+91' if none is found.
 */
export function parsePhoneNumber(rawPhone?: string | null): ParsedPhone {
  if (!rawPhone || !rawPhone.trim()) {
    return { countryCode: '+91', nationalNumber: '', fullPhone: '' };
  }

  const clean = rawPhone.trim();

  // If already starts with '+', attempt to match known country code
  if (clean.startsWith('+')) {
    // Sort country codes by length descending (e.g. +971 before +9)
    const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
    for (const item of sorted) {
      if (clean.startsWith(item.code)) {
        const remainder = clean.slice(item.code.length).trim().replace(/\D/g, '');
        return {
          countryCode: item.code,
          nationalNumber: remainder,
          fullPhone: remainder ? `${item.code} ${remainder}` : '',
        };
      }
    }

    // Generic match for other +<digits> codes
    const match = clean.match(/^(\+\d{1,4})\s*(.*)$/);
    if (match) {
      const code = match[1];
      const digits = match[2].replace(/\D/g, '');
      return {
        countryCode: code,
        nationalNumber: digits,
        fullPhone: digits ? `${code} ${digits}` : '',
      };
    }
  }

  // If no '+' prefix:
  const digitsOnly = clean.replace(/\D/g, '');

  // If 12 digits starting with '91' (e.g. 919876543210), treat as +91
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    const national = digitsOnly.slice(2);
    return {
      countryCode: '+91',
      nationalNumber: national,
      fullPhone: `+91 ${national}`,
    };
  }

  // Default to +91 with digits
  return {
    countryCode: '+91',
    nationalNumber: digitsOnly,
    fullPhone: digitsOnly ? `+91 ${digitsOnly}` : '',
  };
}

export interface PhoneValidationResult {
  valid: boolean;
  isValid: boolean; // Alias for valid
  error?: string;
  normalizedPhone?: string; // Formatted as "+91 9876543210"
  parsed: {
    countryCode: string;
    nationalNumber: string;
    cleanNumber: string;
  };
}

/**
 * Validates a phone number based on country code.
 * - +91 (India): exactly 10 digits, starts with 6, 7, 8, or 9, rejects repeating dummy numbers.
 * - Other countries: 7 to 15 digits, digits only, rejects all zeros.
 */
export function validatePhoneNumber(
  phoneOrNational: string,
  countryCode: string = '+91',
  required: boolean = true
): PhoneValidationResult {
  // If input contains country code prefix, parse it
  const parsed = phoneOrNational.trim().startsWith('+')
    ? parsePhoneNumber(phoneOrNational)
    : { countryCode, nationalNumber: phoneOrNational.replace(/\D/g, ''), fullPhone: '' };

  const activeCode = parsed.countryCode || countryCode || '+91';
  const digits = parsed.nationalNumber;

  const parsedInfo = {
    countryCode: activeCode,
    nationalNumber: digits,
    cleanNumber: digits,
  };

  if (!digits) {
    if (required) {
      return { valid: false, isValid: false, error: 'Mobile number is required', parsed: parsedInfo };
    }
    return { valid: true, isValid: true, normalizedPhone: '', parsed: parsedInfo };
  }

  if (activeCode === '+91') {
    if (digits.length !== 10) {
      return {
        valid: false,
        isValid: false,
        error: `Please enter a valid 10-digit mobile number (currently ${digits.length} digits)`,
        parsed: parsedInfo,
      };
    }

    if (!/^[6-9]/.test(digits)) {
      return {
        valid: false,
        isValid: false,
        error: 'Indian mobile numbers must start with 6, 7, 8, or 9',
        parsed: parsedInfo,
      };
    }

    // Check for repetitive dummy numbers (e.g. 0000000000, 1111111111, 9999999999)
    if (/^(\d)\1{9}$/.test(digits)) {
      return {
        valid: false,
        isValid: false,
        error: 'Please enter a valid mobile number (not repeating dummy digits)',
        parsed: parsedInfo,
      };
    }

    // Check for sequential dummy numbers (1234567890)
    if (digits === '1234567890') {
      return {
        valid: false,
        isValid: false,
        error: 'Please enter a genuine mobile number',
        parsed: parsedInfo,
      };
    }

    return {
      valid: true,
      isValid: true,
      normalizedPhone: `+91 ${digits}`,
      parsed: parsedInfo,
    };
  }

  // International Numbers
  if (digits.length < 7 || digits.length > 15) {
    return {
      valid: false,
      isValid: false,
      error: `Phone number must be between 7 and 15 digits for ${activeCode}`,
      parsed: parsedInfo,
    };
  }

  if (/^0+$/.test(digits)) {
    return {
      valid: false,
      isValid: false,
      error: 'Please enter a valid phone number',
      parsed: parsedInfo,
    };
  }

  return {
    valid: true,
    isValid: true,
    normalizedPhone: `${activeCode} ${digits}`,
    parsed: parsedInfo,
  };
}
