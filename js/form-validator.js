/**
 * Form Validator Module
 * 
 * Comprehensive form validation system with real-time feedback, security measures,
 * and protection against common form attacks. Provides modular validation functions
 * for email, phone, required fields, character limits, and proper sanitization.
 * 
 * @module form-validator
 * @version 1.0.0
 */

(function () {
  'use strict';

  // ============================================
  // CONSTANTS & CONFIGURATION
  // ============================================

  const VALIDATION_CONFIG = Object.freeze({
    EMAIL: {
      PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      MAX_LENGTH: 254,
      MIN_LENGTH: 5,
      BLOCKED_DOMAINS: ['tempmail.com', 'throwaway.email', '10minutemail.com'],
    },
    PHONE: {
      PATTERN: /^[\d\s()+-]+$/,
      MIN_DIGITS: 10,
      MAX_DIGITS: 15,
    },
    NAME: {
      MIN_LENGTH: 2,
      MAX_LENGTH: 100,
      PATTERN: /^[a-zA-Z\s'-]+$/,
    },
    MESSAGE: {
      MIN_LENGTH: 10,
      MAX_LENGTH: 1000,
    },
    SECURITY: {
      MAX_CONSECUTIVE_CHARS: 5,
      SUSPICIOUS_PATTERNS: [
        /<script[^>]*>.*?<\/script>/gi,
        /<iframe[^>]*>.*?<\/iframe>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<embed[^>]*>/gi,
        /<object[^>]*>/gi,
      ],
      SQL_INJECTION_PATTERNS: [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
        /(--|;|\/\*|\*\/|xp_|sp_)/gi,
        /(\bOR\b.*=.*|1\s*=\s*1)/gi,
      ],
    },
  });

  const ERROR_MESSAGES = Object.freeze({
    REQUIRED: 'This field is required',
    EMAIL_INVALID: 'Please enter a valid email address',
    EMAIL_TOO_LONG: 'Email address is too long',
    EMAIL_BLOCKED: 'Please use a permanent email address',
    PHONE_INVALID: 'Please enter a valid phone number',
    PHONE_TOO_SHORT: 'Phone number must have at least 10 digits',
    PHONE_TOO_LONG: 'Phone number is too long',
    NAME_TOO_SHORT: 'Name must be at least 2 characters',
    NAME_TOO_LONG: 'Name must not exceed 100 characters',
    NAME_INVALID_CHARS: 'Name contains invalid characters',
    MESSAGE_TOO_SHORT: 'Message must be at least 10 characters',
    MESSAGE_TOO_LONG: 'Message must not exceed 1000 characters',
    SERVICE_REQUIRED: 'Please select a service',
    CONSENT_REQUIRED: 'You must agree to be contacted',
    SUSPICIOUS_CONTENT: 'Input contains suspicious content',
    RATE_LIMIT: 'Too many validation attempts. Please wait.',
  });

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  /**
   * Log structured validation message
   * @param {string} level - Log level (info, warn, error)
   * @param {string} message - Log message
   * @param {Object} context - Additional context
   */
  function log(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      module: 'form-validator',
      message,
      ...context,
    };

    if (level === 'error') {
      console.error('[FormValidator]', logEntry);
    } else if (level === 'warn') {
      console.warn('[FormValidator]', logEntry);
    } else {
      console.log('[FormValidator]', logEntry);
    }
  }

  /**
   * Sanitize string input to prevent XSS and injection attacks
   * @param {string} input - Raw input string
   * @returns {string} Sanitized string
   */
  function sanitizeInput(input) {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .trim()
      .replace(/[<>]/g, '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Check for suspicious patterns in input
   * @param {string} input - Input to check
   * @returns {boolean} True if suspicious patterns detected
   */
  function hasSuspiciousPatterns(input) {
    if (typeof input !== 'string') {
      return false;
    }

    const allPatterns = [
      ...VALIDATION_CONFIG.SECURITY.SUSPICIOUS_PATTERNS,
      ...VALIDATION_CONFIG.SECURITY.SQL_INJECTION_PATTERNS,
    ];

    return allPatterns.some((pattern) => pattern.test(input));
  }

  /**
   * Check for excessive consecutive characters
   * @param {string} input - Input to check
   * @returns {boolean} True if excessive repetition detected
   */
  function hasExcessiveRepetition(input) {
    if (typeof input !== 'string') {
      return false;
    }

    const maxConsecutive = VALIDATION_CONFIG.SECURITY.MAX_CONSECUTIVE_CHARS;
    const pattern = new RegExp(`(.)\\1{${maxConsecutive},}`);
    return pattern.test(input);
  }

  /**
   * Validate input against security threats
   * @param {string} input - Input to validate
   * @returns {Object} Security validation result
   */
  function validateSecurity(input) {
    if (hasSuspiciousPatterns(input)) {
      log('warn', 'Suspicious pattern detected', { inputLength: input.length });
      return {
        valid: false,
        message: ERROR_MESSAGES.SUSPICIOUS_CONTENT,
        threat: 'injection',
      };
    }

    if (hasExcessiveRepetition(input)) {
      log('warn', 'Excessive repetition detected', { inputLength: input.length });
      return {
        valid: false,
        message: ERROR_MESSAGES.SUSPICIOUS_CONTENT,
        threat: 'spam',
      };
    }

    return { valid: true, message: '' };
  }

  // ============================================
  // VALIDATION FUNCTIONS
  // ============================================

  /**
   * Validation result object
   * @typedef {Object} ValidationResult
   * @property {boolean} valid - Whether validation passed
   * @property {string} message - Error message if invalid
   * @property {string} [sanitized] - Sanitized value if applicable
   */

  /**
   * Validate required field
   * @param {*} value - Field value
   * @returns {ValidationResult} Validation result
   */
  function validateRequired(value) {
    const stringValue = String(value || '').trim();
    
    if (stringValue.length === 0) {
      return {
        valid: false,
        message: ERROR_MESSAGES.REQUIRED,
      };
    }

    return {
      valid: true,
      message: '',
      sanitized: sanitizeInput(stringValue),
    };
  }

  /**
   * Validate email address with comprehensive checks
   * @param {string} email - Email address to validate
   * @returns {ValidationResult} Validation result
   */
  function validateEmail(email) {
    const trimmedEmail = String(email || '').trim().toLowerCase();

    // Required check
    if (!trimmedEmail) {
      return {
        valid: false,
        message: ERROR_MESSAGES.REQUIRED,
      };
    }

    // Length validation
    if (trimmedEmail.length < VALIDATION_CONFIG.EMAIL.MIN_LENGTH) {
      return {
        valid: false,
        message: ERROR_MESSAGES.EMAIL_INVALID,
      };
    }

    if (trimmedEmail.length > VALIDATION_CONFIG.EMAIL.MAX_LENGTH) {
      return {
        valid: false,
        message: ERROR_MESSAGES.EMAIL_TOO_LONG,
      };
    }

    // Security validation
    const securityCheck = validateSecurity(trimmedEmail);
    if (!securityCheck.valid) {
      return securityCheck;
    }

    // Format validation
    if (!VALIDATION_CONFIG.EMAIL.PATTERN.test(trimmedEmail)) {
      return {
        valid: false,
        message: ERROR_MESSAGES.EMAIL_INVALID,
      };
    }

    // Domain validation
    const domain = trimmedEmail.split('@')[1];
    if (VALIDATION_CONFIG.EMAIL.BLOCKED_DOMAINS.includes(domain)) {
      log('warn', 'Blocked email domain detected', { domain });
      return {
        valid: false,
        message: ERROR_MESSAGES.EMAIL_BLOCKED,
      };
    }

    // Additional format checks
    const localPart = trimmedEmail.split('@')[0];
    if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
      return {
        valid: false,
        message: ERROR_MESSAGES.EMAIL_INVALID,
      };
    }

    log('info', 'Email validation passed', { domain });
    return {
      valid: true,
      message: '',
      sanitized: trimmedEmail,
    };
  }

  /**
   * Validate phone number with international support
   * @param {string} phone - Phone number to validate
   * @returns {ValidationResult} Validation result
   */
  function validatePhone(phone) {
    const trimmedPhone = String(phone || '').trim();

    // Phone is optional, empty is valid
    if (!trimmedPhone) {
      return {
        valid: true,
        message: '',
        sanitized: '',
      };
    }

    // Security validation
    const securityCheck = validateSecurity(trimmedPhone);
    if (!securityCheck.valid) {
      return securityCheck;
    }

    // Format validation
    if (!VALIDATION_CONFIG.PHONE.PATTERN.test(trimmedPhone)) {
      return {
        valid: false,
        message: ERROR_MESSAGES.PHONE_INVALID,
      };
    }

    // Extract digits for length validation
    const digits = trimmedPhone.replace(/\D/g, '');

    if (digits.length < VALIDATION_CONFIG.PHONE.MIN_DIGITS) {
      return {
        valid: false,
        message: ERROR_MESSAGES.PHONE_TOO_SHORT,
      };
    }

    if (digits.length > VALIDATION_CONFIG.PHONE.MAX_DIGITS) {
      return {
        valid: false,
        message: ERROR_MESSAGES.PHONE_TOO_LONG,
      };
    }

    log('info', 'Phone validation passed', { digitCount: digits.length });
    return {
      valid: true,
      message: '',
      sanitized: trimmedPhone,
    };
  }

  /**
   * Validate name field with character restrictions
   * @param {string} name - Name to validate
   * @returns {ValidationResult} Validation result
   */
  function validateName(name) {
    const trimmedName = String(name || '').trim();

    // Required check
    if (!trimmedName) {
      return {
        valid: false,
        message: ERROR_MESSAGES.REQUIRED,
      };
    }

    // Length validation
    if (trimmedName.length < VALIDATION_CONFIG.NAME.MIN_LENGTH) {
      return {
        valid: false,
        message: ERROR_MESSAGES.NAME_TOO_SHORT,
      };
    }

    if (trimmedName.length > VALIDATION_CONFIG.NAME.MAX_LENGTH) {
      return {
        valid: false,
        message: ERROR_MESSAGES.NAME_TOO_LONG,
      };
    }

    // Security validation
    const securityCheck = validateSecurity(trimmedName);
    if (!securityCheck.valid) {
      return securityCheck;
    }

    // Character validation
    if (!VALIDATION_CONFIG.NAME.PATTERN.test(trimmedName)) {
      return {
        valid: false,
        message: ERROR_MESSAGES.NAME_INVALID_CHARS,
      };
    }

    log('info', 'Name validation passed', { length: trimmedName.length });
    return {
      valid: true,
      message: '',
      sanitized: sanitizeInput(trimmedName),
    };
  }

  /**
   * Validate message field with length constraints
   * @param {string} message - Message to validate
   * @returns {ValidationResult} Validation result
   */
  function validateMessage(message) {
    const trimmedMessage = String(message || '').trim();

    // Required check
    if (!trimmedMessage) {
      return {
        valid: false,
        message: ERROR_MESSAGES.REQUIRED,
      };
    }

    // Length validation
    if (trimmedMessage.length < VALIDATION_CONFIG.MESSAGE.MIN_LENGTH) {
      return {
        valid: false,
        message: ERROR_MESSAGES.MESSAGE_TOO_SHORT,
      };
    }

    if (trimmedMessage.length > VALIDATION_CONFIG.MESSAGE.MAX_LENGTH) {
      return {
        valid: false,
        message: ERROR_MESSAGES.MESSAGE_TOO_LONG,
      };
    }

    // Security validation
    const securityCheck = validateSecurity(trimmedMessage);
    if (!securityCheck.valid) {
      return securityCheck;
    }

    log('info', 'Message validation passed', { length: trimmedMessage.length });
    return {
      valid: true,
      message: '',
      sanitized: sanitizeInput(trimmedMessage),
    };
  }

  /**
   * Validate select field
   * @param {string} value - Select value
   * @returns {ValidationResult} Validation result
   */
  function validateSelect(value) {
    const trimmedValue = String(value || '').trim();

    if (!trimmedValue || trimmedValue === '') {
      return {
        valid: false,
        message: ERROR_MESSAGES.SERVICE_REQUIRED,
      };
    }

    // Security validation
    const securityCheck = validateSecurity(trimmedValue);
    if (!securityCheck.valid) {
      return securityCheck;
    }

    log('info', 'Select validation passed', { value: trimmedValue });
    return {
      valid: true,
      message: '',
      sanitized: sanitizeInput(trimmedValue),
    };
  }

  /**
   * Validate checkbox field
   * @param {boolean} checked - Checkbox state
   * @returns {ValidationResult} Validation result
   */
  function validateCheckbox(checked) {
    const isChecked = checked === true;

    if (!isChecked) {
      return {
        valid: false,
        message: ERROR_MESSAGES.CONSENT_REQUIRED,
      };
    }

    log('info', 'Checkbox validation passed');
    return {
      valid: true,
      message: '',
    };
  }

  /**
   * Validate character limit in real-time
   * @param {string} value - Current value
   * @param {number} maxLength - Maximum allowed length
   * @returns {Object} Character limit info
   */
  function validateCharacterLimit(value, maxLength) {
    const currentLength = String(value || '').length;
    const remaining = maxLength - currentLength;
    const percentage = (currentLength / maxLength) * 100;

    return {
      current: currentLength,
      max: maxLength,
      remaining,
      percentage: Math.round(percentage),
      exceeded: currentLength > maxLength,
      warning: percentage >= 90,
    };
  }

  // ============================================
  // RATE LIMITING
  // ============================================

  const rateLimiter = (() => {
    const attempts = new Map();
    const WINDOW_MS = 60000; // 1 minute
    const MAX_ATTEMPTS = 50;

    return {
      /**
       * Check if rate limit exceeded
       * @param {string} identifier - Unique identifier (e.g., field name)
       * @returns {boolean} True if rate limit exceeded
       */
      isLimited(identifier) {
        const now = Date.now();
        const record = attempts.get(identifier) || { count: 0, resetAt: now + WINDOW_MS };

        if (now > record.resetAt) {
          attempts.set(identifier, { count: 1, resetAt: now + WINDOW_MS });
          return false;
        }

        record.count += 1;
        attempts.set(identifier, record);

        if (record.count > MAX_ATTEMPTS) {
          log('warn', 'Rate limit exceeded', { identifier, count: record.count });
          return true;
        }

        return false;
      },

      /**
       * Reset rate limit for identifier
       * @param {string} identifier - Unique identifier
       */
      reset(identifier) {
        attempts.delete(identifier);
      },
    };
  })();

  // ============================================
  // PUBLIC API
  // ============================================

  const FormValidator = {
    validateRequired,
    validateEmail,
    validatePhone,
    validateName,
    validateMessage,
    validateSelect,
    validateCheckbox,
    validateCharacterLimit,
    validateSecurity,
    sanitizeInput,
    rateLimiter,
    ERROR_MESSAGES,
    VALIDATION_CONFIG,
  };

  // Export for use in other modules
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormValidator;
  } else if (typeof window !== 'undefined') {
    window.FormValidator = FormValidator;
  }

  log('info', 'Form validator module loaded successfully');
})();