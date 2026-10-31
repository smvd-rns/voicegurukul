
/**
 * Validation utility to prevent XSS and Injection attacks.
 * Rejects inputs containing potentially malicious characters like < > ; { }
 */

// Regex to allow safe characters only (Alphanumeric, spaces, and common name punctuation)
// Regex to allow safe characters only (Alphanumeric, spaces, and common name punctuation)
// Specifically EXCLUDES: < > ; { } [ ] \ =
// Added / and # for center names (e.g. "Center #1", "City/Center")
const SAFE_NAME_REGEX = /^[a-zA-Z0-9\s\-\.\,\'\(\)\&\/\#]+$/;

export function isValidName(name: string): boolean {
    if (!name) return false;
    // Check length
    if (name.length < 2 || name.length > 200) return false; // Increased limit to 200
    // Check characters
    return SAFE_NAME_REGEX.test(name);
}

export function sanitizeInput(input: string): string {
    if (!input) return '';
    // Remove potential HTML tags and trim
    return input
        .replace(/<[^>]*>?/gm, '') // Remove HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers like onclick=
        .replace(/[<>;{}[\]\\/='"]/g, '') // Remove potentially dangerous characters
        .trim();
}

/**
 * Sanitize text input - allows letters, numbers, spaces, and basic punctuation
 * Removes HTML tags, scripts, and special characters
 */
export function sanitizeTextInput(input: string): string {
    if (!input) return '';

    // Remove HTML tags and scripts
    let sanitized = input
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .replace(/data:/gi, '') // Remove data URIs
        .replace(/vbscript:/gi, ''); // Remove vbscript

    // Allow safe characters: letters, numbers, spaces, basic punctuation
    sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-\.\,\'\(\)\&\:\/]/g, '');

    return sanitized;
}

/**
 * Validate and sanitize general text input (for names, institutions, etc.)
 */
export function validateTextInput(input: string, fieldName: string, maxLength: number = 200): ValidationResult {
    if (!input || !input.trim()) {
        return { valid: false, error: `${fieldName} is required` };
    }

    const trimmed = input.trim();

    // Check length
    if (trimmed.length < 1) {
        return { valid: false, error: `${fieldName} cannot be empty` };
    }

    if (trimmed.length > maxLength) {
        return { valid: false, error: `${fieldName} must be less than ${maxLength} characters` };
    }

    // Check for dangerous characters
    const dangerousChars = /[<>;{}[\]\\/='"]/;
    if (dangerousChars.test(trimmed)) {
        return { valid: false, error: `Invalid text in ${fieldName}. Special characters like < > ; { } [ ] are not allowed.` };
    }

    // Check for script tags and javascript
    const scriptPattern = /<script|javascript:|on\w+=/i;
    if (scriptPattern.test(trimmed)) {
        return { valid: false, error: `Invalid text in ${fieldName}. Malicious code detected.` };
    }

    return { valid: true };
}

/**
 * Validate phone number input
 */
export function validatePhone(phone: string): ValidationResult {
    if (!phone || !phone.trim()) {
        return { valid: true }; // Phone is optional
    }

    const trimmed = phone.trim();

    // Remove spaces and common formatting characters for validation
    const cleaned = trimmed.replace(/[\s\-\(\)\+]/g, '');

    // Check if it's all digits
    if (!/^\d+$/.test(cleaned)) {
        return { valid: false, error: 'Invalid phone number. Phone number should contain only digits and formatting characters (+, -, spaces, parentheses)' };
    }

    // Check length (typically 10-15 digits for international numbers)
    if (cleaned.length < 10 || cleaned.length > 15) {
        return { valid: false, error: 'Invalid phone number. Phone number should be between 10 and 15 digits' };
    }

    return { valid: true };
}

/**
 * Validate education/work input fields
 */
export function validateEducationField(value: string, fieldName: string): ValidationResult {
    return validateTextInput(value, fieldName, 200);
}

export function validateWorkField(value: string, fieldName: string): ValidationResult {
    return validateTextInput(value, fieldName, 200);
}

export function validateEmail(email: string): ValidationResult {
    if (!email) return { valid: false, error: 'Email is required' };

    // Basic email regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        return { valid: false, error: 'Invalid email format. Please enter a valid email address (e.g., name@example.com)' };
    }

    return { valid: true };
}

export function validatePassword(password: string): ValidationResult {
    if (!password) return { valid: false, error: 'Password is required' };

    if (password.length < 6) {
        return { valid: false, error: 'Password must be at least 6 characters long' };
    }

    return { valid: true };
}

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

export function validateCityInput(state: string, city: string): ValidationResult {
    if (!state || !city) {
        return { valid: false, error: 'State and city are required' };
    }

    if (!isValidName(state)) {
        return { valid: false, error: 'Invalid characters in state name. Only letters, numbers, and basic punctuation (.,-\'&) are allowed.' };
    }

    if (!isValidName(city)) {
        return { valid: false, error: 'Invalid characters in city name. Only letters, numbers, and basic punctuation (.,-\'&) are allowed.' };
    }

    return { valid: true };
}

export function validateCenterInput(
    name: string,
    state: string,
    city: string,
    address?: string,
    contact?: string
): ValidationResult {
    // Validate required fields
    const cityValidation = validateCityInput(state, city);
    if (!cityValidation.valid) return cityValidation;

    if (!isValidName(name)) {
        return { valid: false, error: 'Invalid characters in center name. Malicious code detected.' };
    }

    // Address can be more permissive but still needs basic HTML tag protection
    if (address && (address.includes('<') || address.includes('>'))) {
        return { valid: false, error: 'Invalid characters in address. HTML tags are not allowed.' };
    }

    // Contact should be phone number-ish
    if (contact) {
        // Allow +, -, spaces, numbers, parens
        const phoneRegex = /^[0-9\+\-\s\(\)]*$/;
        if (!phoneRegex.test(contact) || contact.length > 20) {
            return { valid: false, error: 'Invalid contact format' };
        }
    }

    return { valid: true };
}

export function validateMobile(mobile: string): ValidationResult {
    if (!mobile || !mobile.trim()) {
        return { valid: false, error: 'Mobile number is required' };
    }

    // Remove spaces and common formatting characters for validation
    const cleaned = mobile.replace(/[\s\-\(\)\+]/g, '');

    // Check if it's all digits
    if (!/^\d+$/.test(cleaned)) {
        return { valid: false, error: 'Invalid mobile number. Mobile number should contain only digits and formatting characters (+, -, spaces, parentheses)' };
    }

    // Check length (typically 10-15 digits for international numbers)
    if (cleaned.length < 10 || cleaned.length > 15) {
        return { valid: false, error: 'Invalid mobile number. Mobile number should be between 10 and 15 digits' };
    }

    return { valid: true };
}

export function validateCounselorInput(
    name: string,
    mobile: string,
    email: string
): ValidationResult {
    // Validate name
    if (!name || !name.trim()) {
        return { valid: false, error: 'Counselor name is required' };
    }

    if (!isValidName(name)) {
        return { valid: false, error: 'Invalid characters in counselor name. Only letters, numbers, and basic punctuation (.,-\'&) are allowed.' };
    }

    // Validate mobile
    const mobileValidation = validateMobile(mobile);
    if (!mobileValidation.valid) {
        return mobileValidation;
    }

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
        return { valid: false, error: `Invalid email address: ${emailValidation.error || 'Please enter a valid email format (e.g., name@example.com)'}` };
    }

    return { valid: true };
}

// Re-export phone & country code validation utilities
export {
  COUNTRY_CODES,
  parsePhoneNumber,
  validatePhoneNumber,
  type CountryCode,
  type ParsedPhone,
  type PhoneValidationResult,
} from './phone-validation';
