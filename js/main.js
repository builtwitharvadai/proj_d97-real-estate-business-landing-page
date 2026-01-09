/**
 * Main JavaScript Module - Interactive Functionality
 * 
 * Implements contact form validation, mobile navigation, smooth scrolling,
 * and interactive UI elements with comprehensive error handling and logging.
 * 
 * @module main
 * @version 1.0.0
 */

(function () {
  'use strict';

  // ============================================
  // CONSTANTS & CONFIGURATION
  // ============================================

  const CONFIG = Object.freeze({
    VALIDATION: {
      EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      PHONE_PATTERN: /^[\d\s()+-]+$/,
      NAME_MIN_LENGTH: 2,
      NAME_MAX_LENGTH: 100,
      MESSAGE_MIN_LENGTH: 10,
      MESSAGE_MAX_LENGTH: 1000,
    },
    UI: {
      SCROLL_OFFSET: 80,
      SCROLL_BEHAVIOR: 'smooth',
      DEBOUNCE_DELAY: 300,
      FORM_SUBMIT_TIMEOUT: 5000,
    },
    MESSAGES: {
      REQUIRED: 'This field is required',
      EMAIL_INVALID: 'Please enter a valid email address',
      PHONE_INVALID: 'Please enter a valid phone number',
      NAME_TOO_SHORT: 'Name must be at least 2 characters',
      NAME_TOO_LONG: 'Name must not exceed 100 characters',
      MESSAGE_TOO_SHORT: 'Message must be at least 10 characters',
      MESSAGE_TOO_LONG: 'Message must not exceed 1000 characters',
      SERVICE_REQUIRED: 'Please select a service',
      CONSENT_REQUIRED: 'You must agree to be contacted',
      SUBMIT_SUCCESS: 'Thank you! Your message has been sent successfully.',
      SUBMIT_ERROR: 'Sorry, there was an error sending your message. Please try again.',
      NETWORK_ERROR: 'Network error. Please check your connection and try again.',
    },
  });

  const SELECTORS = Object.freeze({
    MOBILE_MENU_TOGGLE: '.mobile-menu-toggle',
    NAV_MENU: '.nav-menu',
    CONTACT_FORM: '.contact-form',
    FORM_SUBMIT_BUTTON: '.btn-submit',
    FORM_STATUS: '.form-status',
    BUTTON_TEXT: '.button-text',
    SMOOTH_SCROLL_LINKS: 'a[href^="#"]',
  });

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  /**
   * Debounce function to limit execution rate
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   */
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Log structured message with context
   * @param {string} level - Log level (info, warn, error)
   * @param {string} message - Log message
   * @param {Object} context - Additional context
   */
  function log(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };

    if (level === 'error') {
      console.error('[RealEstate]', logEntry);
    } else if (level === 'warn') {
      console.warn('[RealEstate]', logEntry);
    } else {
      console.log('[RealEstate]', logEntry);
    }
  }

  /**
   * Safely query selector with error handling
   * @param {string} selector - CSS selector
   * @param {Element} context - Context element (default: document)
   * @returns {Element|null} Found element or null
   */
  function safeQuerySelector(selector, context = document) {
    try {
      return context.querySelector(selector);
    } catch (error) {
      log('error', 'Invalid selector', { selector, error: error.message });
      return null;
    }
  }

  /**
   * Safely query all selectors with error handling
   * @param {string} selector - CSS selector
   * @param {Element} context - Context element (default: document)
   * @returns {NodeList} Found elements
   */
  function safeQuerySelectorAll(selector, context = document) {
    try {
      return context.querySelectorAll(selector);
    } catch (error) {
      log('error', 'Invalid selector', { selector, error: error.message });
      return [];
    }
  }

  // ============================================
  // VALIDATION FUNCTIONS
  // ============================================

  /**
   * Validation result object
   * @typedef {Object} ValidationResult
   * @property {boolean} valid - Whether validation passed
   * @property {string} message - Error message if invalid
   */

  /**
   * Validate required field
   * @param {string} value - Field value
   * @returns {ValidationResult} Validation result
   */
  function validateRequired(value) {
    const trimmedValue = String(value).trim();
    return {
      valid: trimmedValue.length > 0,
      message: trimmedValue.length > 0 ? '' : CONFIG.MESSAGES.REQUIRED,
    };
  }

  /**
   * Validate email format
   * @param {string} email - Email address
   * @returns {ValidationResult} Validation result
   */
  function validateEmail(email) {
    const trimmedEmail = String(email).trim();
    
    if (!trimmedEmail) {
      return { valid: false, message: CONFIG.MESSAGES.REQUIRED };
    }

    const isValid = CONFIG.VALIDATION.EMAIL_PATTERN.test(trimmedEmail);
    return {
      valid: isValid,
      message: isValid ? '' : CONFIG.MESSAGES.EMAIL_INVALID,
    };
  }

  /**
   * Validate phone number format
   * @param {string} phone - Phone number
   * @returns {ValidationResult} Validation result
   */
  function validatePhone(phone) {
    const trimmedPhone = String(phone).trim();
    
    // Phone is optional, so empty is valid
    if (!trimmedPhone) {
      return { valid: true, message: '' };
    }

    const isValid = CONFIG.VALIDATION.PHONE_PATTERN.test(trimmedPhone) && 
                    trimmedPhone.replace(/\D/g, '').length >= 10;
    return {
      valid: isValid,
      message: isValid ? '' : CONFIG.MESSAGES.PHONE_INVALID,
    };
  }

  /**
   * Validate name field
   * @param {string} name - Name value
   * @returns {ValidationResult} Validation result
   */
  function validateName(name) {
    const trimmedName = String(name).trim();
    
    if (!trimmedName) {
      return { valid: false, message: CONFIG.MESSAGES.REQUIRED };
    }

    if (trimmedName.length < CONFIG.VALIDATION.NAME_MIN_LENGTH) {
      return { valid: false, message: CONFIG.MESSAGES.NAME_TOO_SHORT };
    }

    if (trimmedName.length > CONFIG.VALIDATION.NAME_MAX_LENGTH) {
      return { valid: false, message: CONFIG.MESSAGES.NAME_TOO_LONG };
    }

    return { valid: true, message: '' };
  }

  /**
   * Validate message field
   * @param {string} message - Message value
   * @returns {ValidationResult} Validation result
   */
  function validateMessage(message) {
    const trimmedMessage = String(message).trim();
    
    if (!trimmedMessage) {
      return { valid: false, message: CONFIG.MESSAGES.REQUIRED };
    }

    if (trimmedMessage.length < CONFIG.VALIDATION.MESSAGE_MIN_LENGTH) {
      return { valid: false, message: CONFIG.MESSAGES.MESSAGE_TOO_SHORT };
    }

    if (trimmedMessage.length > CONFIG.VALIDATION.MESSAGE_MAX_LENGTH) {
      return { valid: false, message: CONFIG.MESSAGES.MESSAGE_TOO_LONG };
    }

    return { valid: true, message: '' };
  }

  /**
   * Validate select field
   * @param {string} value - Select value
   * @returns {ValidationResult} Validation result
   */
  function validateSelect(value) {
    const trimmedValue = String(value).trim();
    return {
      valid: trimmedValue.length > 0,
      message: trimmedValue.length > 0 ? '' : CONFIG.MESSAGES.SERVICE_REQUIRED,
    };
  }

  /**
   * Validate checkbox field
   * @param {boolean} checked - Checkbox state
   * @returns {ValidationResult} Validation result
   */
  function validateCheckbox(checked) {
    return {
      valid: checked === true,
      message: checked ? '' : CONFIG.MESSAGES.CONSENT_REQUIRED,
    };
  }

  // ============================================
  // FORM VALIDATION & HANDLING
  // ============================================

  /**
   * Display validation error for a field
   * @param {HTMLElement} field - Form field element
   * @param {string} message - Error message
   */
  function showFieldError(field, message) {
    if (!field) return;

    const errorId = field.getAttribute('aria-describedby');
    const errorElement = errorId ? document.getElementById(errorId) : null;

    field.setAttribute('aria-invalid', 'true');
    field.classList.add('error');

    if (errorElement) {
      errorElement.textContent = message;
    }

    log('info', 'Field validation error', { 
      fieldId: field.id, 
      message,
    });
  }

  /**
   * Clear validation error for a field
   * @param {HTMLElement} field - Form field element
   */
  function clearFieldError(field) {
    if (!field) return;

    const errorId = field.getAttribute('aria-describedby');
    const errorElement = errorId ? document.getElementById(errorId) : null;

    field.setAttribute('aria-invalid', 'false');
    field.classList.remove('error');

    if (errorElement) {
      errorElement.textContent = '';
    }
  }

  /**
   * Validate single form field
   * @param {HTMLElement} field - Form field element
   * @returns {boolean} Whether field is valid
   */
  function validateField(field) {
    if (!field) return false;

    const fieldName = field.name;
    const fieldValue = field.type === 'checkbox' ? field.checked : field.value;
    let result;

    switch (fieldName) {
      case 'name':
        result = validateName(fieldValue);
        break;
      case 'email':
        result = validateEmail(fieldValue);
        break;
      case 'phone':
        result = validatePhone(fieldValue);
        break;
      case 'service':
        result = validateSelect(fieldValue);
        break;
      case 'message':
        result = validateMessage(fieldValue);
        break;
      case 'consent':
        result = validateCheckbox(fieldValue);
        break;
      default:
        result = { valid: true, message: '' };
    }

    if (result.valid) {
      clearFieldError(field);
    } else {
      showFieldError(field, result.message);
    }

    return result.valid;
  }

  /**
   * Validate entire form
   * @param {HTMLFormElement} form - Form element
   * @returns {boolean} Whether form is valid
   */
  function validateForm(form) {
    if (!form) return false;

    const fields = form.querySelectorAll('input, select, textarea');
    let isValid = true;

    fields.forEach((field) => {
      const fieldValid = validateField(field);
      if (!fieldValid) {
        isValid = false;
      }
    });

    log('info', 'Form validation completed', { isValid });
    return isValid;
  }

  /**
   * Show form status message
   * @param {HTMLElement} statusElement - Status element
   * @param {string} message - Status message
   * @param {string} type - Message type (success, error)
   */
  function showFormStatus(statusElement, message, type) {
    if (!statusElement) return;

    statusElement.textContent = message;
    statusElement.className = `form-status form-status--${type}`;
    statusElement.setAttribute('role', 'status');

    log('info', 'Form status displayed', { message, type });
  }

  /**
   * Clear form status message
   * @param {HTMLElement} statusElement - Status element
   */
  function clearFormStatus(statusElement) {
    if (!statusElement) return;

    statusElement.textContent = '';
    statusElement.className = 'form-status';
  }

  /**
   * Set form loading state
   * @param {HTMLFormElement} form - Form element
   * @param {boolean} loading - Loading state
   */
  function setFormLoading(form, loading) {
    if (!form) return;

    const submitButton = safeQuerySelector(SELECTORS.FORM_SUBMIT_BUTTON, form);
    
    if (submitButton) {
      submitButton.setAttribute('aria-busy', loading ? 'true' : 'false');
      submitButton.disabled = loading;
    }

    const formFields = form.querySelectorAll('input, select, textarea, button');
    formFields.forEach((field) => {
      field.disabled = loading;
    });

    log('info', 'Form loading state changed', { loading });
  }

  /**
   * Submit form data
   * @param {HTMLFormElement} form - Form element
   * @returns {Promise<Object>} Submission result
   */
  async function submitFormData(form) {
    if (!form) {
      throw new Error('Form element is required');
    }

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    log('info', 'Submitting form data', { 
      fields: Object.keys(data),
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        CONFIG.UI.FORM_SUBMIT_TIMEOUT
      );

      const response = await fetch(form.action, {
        method: form.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      log('info', 'Form submitted successfully', { result });
      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        log('error', 'Form submission timeout', { 
          timeout: CONFIG.UI.FORM_SUBMIT_TIMEOUT,
        });
        throw new Error(CONFIG.MESSAGES.NETWORK_ERROR);
      }

      log('error', 'Form submission failed', { 
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Handle form submission
   * @param {Event} event - Submit event
   */
  async function handleFormSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const statusElement = safeQuerySelector(SELECTORS.FORM_STATUS, form);

    clearFormStatus(statusElement);

    if (!validateForm(form)) {
      log('warn', 'Form validation failed');
      showFormStatus(statusElement, 'Please correct the errors above.', 'error');
      return;
    }

    setFormLoading(form, true);

    try {
      await submitFormData(form);
      showFormStatus(statusElement, CONFIG.MESSAGES.SUBMIT_SUCCESS, 'success');
      form.reset();
      
      // Clear all field errors after successful submission
      const fields = form.querySelectorAll('input, select, textarea');
      fields.forEach(clearFieldError);
    } catch (error) {
      const errorMessage = error.message === CONFIG.MESSAGES.NETWORK_ERROR
        ? CONFIG.MESSAGES.NETWORK_ERROR
        : CONFIG.MESSAGES.SUBMIT_ERROR;
      showFormStatus(statusElement, errorMessage, 'error');
    } finally {
      setFormLoading(form, false);
    }
  }

  /**
   * Initialize form validation
   */
  function initFormValidation() {
    const form = safeQuerySelector(SELECTORS.CONTACT_FORM);
    
    if (!form) {
      log('warn', 'Contact form not found');
      return;
    }

    // Real-time validation on blur
    const fields = form.querySelectorAll('input, select, textarea');
    fields.forEach((field) => {
      field.addEventListener('blur', () => {
        if (field.value || field.type === 'checkbox') {
          validateField(field);
        }
      });

      // Clear error on input
      field.addEventListener('input', debounce(() => {
        if (field.getAttribute('aria-invalid') === 'true') {
          validateField(field);
        }
      }, CONFIG.UI.DEBOUNCE_DELAY));
    });

    // Form submission
    form.addEventListener('submit', handleFormSubmit);

    log('info', 'Form validation initialized');
  }

  // ============================================
  // MOBILE NAVIGATION
  // ============================================

  /**
   * Toggle mobile menu
   * @param {HTMLElement} toggle - Toggle button
   * @param {HTMLElement} menu - Menu element
   */
  function toggleMobileMenu(toggle, menu) {
    if (!toggle || !menu) return;

    const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
    const newState = !isExpanded;

    toggle.setAttribute('aria-expanded', String(newState));
    menu.setAttribute('aria-expanded', String(newState));

    log('info', 'Mobile menu toggled', { expanded: newState });
  }

  /**
   * Close mobile menu
   * @param {HTMLElement} toggle - Toggle button
   * @param {HTMLElement} menu - Menu element
   */
  function closeMobileMenu(toggle, menu) {
    if (!toggle || !menu) return;

    toggle.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-expanded', 'false');

    log('info', 'Mobile menu closed');
  }

  /**
   * Initialize mobile navigation
   */
  function initMobileNavigation() {
    const toggle = safeQuerySelector(SELECTORS.MOBILE_MENU_TOGGLE);
    const menu = safeQuerySelector(SELECTORS.NAV_MENU);

    if (!toggle || !menu) {
      log('warn', 'Mobile navigation elements not found');
      return;
    }

    // Toggle menu on button click
    toggle.addEventListener('click', () => {
      toggleMobileMenu(toggle, menu);
    });

    // Close menu when clicking menu links
    const menuLinks = safeQuerySelectorAll('a', menu);
    menuLinks.forEach((link) => {
      link.addEventListener('click', () => {
        closeMobileMenu(toggle, menu);
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (event) => {
      const isClickInside = menu.contains(event.target) || 
                           toggle.contains(event.target);
      
      if (!isClickInside && toggle.getAttribute('aria-expanded') === 'true') {
        closeMobileMenu(toggle, menu);
      }
    });

    // Close menu on escape key
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        closeMobileMenu(toggle, menu);
        toggle.focus();
      }
    });

    log('info', 'Mobile navigation initialized');
  }

  // ============================================
  // SMOOTH SCROLL NAVIGATION
  // ============================================

  /**
   * Smooth scroll to target element
   * @param {string} targetId - Target element ID
   */
  function smoothScrollTo(targetId) {
    const target = document.getElementById(targetId);
    
    if (!target) {
      log('warn', 'Scroll target not found', { targetId });
      return;
    }

    const targetPosition = target.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = targetPosition - CONFIG.UI.SCROLL_OFFSET;

    window.scrollTo({
      top: offsetPosition,
      behavior: CONFIG.UI.SCROLL_BEHAVIOR,
    });

    // Update focus for accessibility
    target.setAttribute('tabindex', '-1');
    target.focus();

    log('info', 'Smooth scroll executed', { targetId });
  }

  /**
   * Initialize smooth scroll navigation
   */
  function initSmoothScroll() {
    const scrollLinks = safeQuerySelectorAll(SELECTORS.SMOOTH_SCROLL_LINKS);

    scrollLinks.forEach((link) => {
      link.addEventListener('click', (event) => {
        const href = link.getAttribute('href');
        
        if (!href || !href.startsWith('#')) return;

        const targetId = href.substring(1);
        
        if (!targetId) return;

        event.preventDefault();
        smoothScrollTo(targetId);
      });
    });

    log('info', 'Smooth scroll initialized', { 
      linkCount: scrollLinks.length,
    });
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Initialize all interactive functionality
   */
  function init() {
    try {
      log('info', 'Initializing interactive functionality');

      initFormValidation();
      initMobileNavigation();
      initSmoothScroll();

      log('info', 'Interactive functionality initialized successfully');
    } catch (error) {
      log('error', 'Initialization failed', { 
        error: error.message,
        stack: error.stack,
      });
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();