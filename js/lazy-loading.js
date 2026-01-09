/**
 * Lazy Loading Module - Image Optimization
 * 
 * Implements lazy loading for below-the-fold images using Intersection Observer API
 * with comprehensive fallback support, loading states, and error handling.
 * 
 * @module lazy-loading
 * @version 1.0.0
 */

(function () {
  'use strict';

  // ============================================
  // CONSTANTS & CONFIGURATION
  // ============================================

  const CONFIG = Object.freeze({
    OBSERVER: {
      ROOT_MARGIN: '50px',
      THRESHOLD: 0.01,
    },
    SELECTORS: {
      LAZY_IMAGE: '[data-lazy-src]',
      LAZY_BACKGROUND: '[data-lazy-bg]',
    },
    CLASSES: {
      LOADING: 'lazy-loading',
      LOADED: 'lazy-loaded',
      ERROR: 'lazy-error',
    },
    ATTRIBUTES: {
      SRC: 'data-lazy-src',
      SRCSET: 'data-lazy-srcset',
      SIZES: 'data-lazy-sizes',
      BACKGROUND: 'data-lazy-bg',
      LOADED: 'data-lazy-loaded',
    },
    RETRY: {
      MAX_ATTEMPTS: 3,
      DELAY: 1000,
      BACKOFF_MULTIPLIER: 2,
    },
  });

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

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
      module: 'lazy-loading',
      message,
      ...context,
    };

    if (level === 'error') {
      console.error('[LazyLoad]', logEntry);
    } else if (level === 'warn') {
      console.warn('[LazyLoad]', logEntry);
    } else {
      console.log('[LazyLoad]', logEntry);
    }
  }

  /**
   * Check if Intersection Observer is supported
   * @returns {boolean} Whether Intersection Observer is supported
   */
  function isIntersectionObserverSupported() {
    return (
      'IntersectionObserver' in window &&
      'IntersectionObserverEntry' in window &&
      'intersectionRatio' in window.IntersectionObserverEntry.prototype
    );
  }

  /**
   * Calculate exponential backoff delay
   * @param {number} attempt - Current attempt number
   * @returns {number} Delay in milliseconds
   */
  function calculateBackoffDelay(attempt) {
    return CONFIG.RETRY.DELAY * Math.pow(CONFIG.RETRY.BACKOFF_MULTIPLIER, attempt - 1);
  }

  /**
   * Sleep for specified duration
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================
  // IMAGE LOADING FUNCTIONS
  // ============================================

  /**
   * Preload image with retry logic
   * @param {string} src - Image source URL
   * @param {number} attempt - Current attempt number
   * @returns {Promise<HTMLImageElement>} Loaded image element
   */
  async function preloadImage(src, attempt = 1) {
    return new Promise((resolve, reject) => {
      const img = new Image();

      const cleanup = () => {
        img.onload = null;
        img.onerror = null;
      };

      img.onload = () => {
        cleanup();
        log('info', 'Image preloaded successfully', { src, attempt });
        resolve(img);
      };

      img.onerror = async () => {
        cleanup();
        
        if (attempt < CONFIG.RETRY.MAX_ATTEMPTS) {
          const delay = calculateBackoffDelay(attempt);
          log('warn', 'Image load failed, retrying', { 
            src, 
            attempt, 
            nextAttempt: attempt + 1,
            delay,
          });
          
          await sleep(delay);
          
          try {
            const result = await preloadImage(src, attempt + 1);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        } else {
          log('error', 'Image load failed after max retries', { 
            src, 
            attempts: CONFIG.RETRY.MAX_ATTEMPTS,
          });
          reject(new Error(`Failed to load image: ${src}`));
        }
      };

      img.src = src;
    });
  }

  /**
   * Load image element with lazy attributes
   * @param {HTMLImageElement} img - Image element
   * @returns {Promise<void>}
   */
  async function loadImage(img) {
    const src = img.getAttribute(CONFIG.ATTRIBUTES.SRC);
    const srcset = img.getAttribute(CONFIG.ATTRIBUTES.SRCSET);
    const sizes = img.getAttribute(CONFIG.ATTRIBUTES.SIZES);

    if (!src) {
      log('warn', 'Image missing data-lazy-src attribute', { 
        element: img.tagName,
      });
      return;
    }

    img.classList.add(CONFIG.CLASSES.LOADING);

    try {
      await preloadImage(src);

      img.src = src;

      if (srcset) {
        img.srcset = srcset;
      }

      if (sizes) {
        img.sizes = sizes;
      }

      img.removeAttribute(CONFIG.ATTRIBUTES.SRC);
      img.removeAttribute(CONFIG.ATTRIBUTES.SRCSET);
      img.removeAttribute(CONFIG.ATTRIBUTES.SIZES);
      img.setAttribute(CONFIG.ATTRIBUTES.LOADED, 'true');

      img.classList.remove(CONFIG.CLASSES.LOADING);
      img.classList.add(CONFIG.CLASSES.LOADED);

      log('info', 'Image loaded successfully', { src });
    } catch (error) {
      img.classList.remove(CONFIG.CLASSES.LOADING);
      img.classList.add(CONFIG.CLASSES.ERROR);

      log('error', 'Failed to load image', { 
        src, 
        error: error.message,
      });
    }
  }

  /**
   * Load background image for element
   * @param {HTMLElement} element - Element with background image
   * @returns {Promise<void>}
   */
  async function loadBackgroundImage(element) {
    const bgUrl = element.getAttribute(CONFIG.ATTRIBUTES.BACKGROUND);

    if (!bgUrl) {
      log('warn', 'Element missing data-lazy-bg attribute', { 
        element: element.tagName,
      });
      return;
    }

    element.classList.add(CONFIG.CLASSES.LOADING);

    try {
      await preloadImage(bgUrl);

      element.style.backgroundImage = `url('${bgUrl}')`;
      element.removeAttribute(CONFIG.ATTRIBUTES.BACKGROUND);
      element.setAttribute(CONFIG.ATTRIBUTES.LOADED, 'true');

      element.classList.remove(CONFIG.CLASSES.LOADING);
      element.classList.add(CONFIG.CLASSES.LOADED);

      log('info', 'Background image loaded successfully', { bgUrl });
    } catch (error) {
      element.classList.remove(CONFIG.CLASSES.LOADING);
      element.classList.add(CONFIG.CLASSES.ERROR);

      log('error', 'Failed to load background image', { 
        bgUrl, 
        error: error.message,
      });
    }
  }

  /**
   * Handle element intersection
   * @param {HTMLElement} element - Element that intersected
   * @param {IntersectionObserver} observer - Observer instance
   * @returns {Promise<void>}
   */
  async function handleIntersection(element, observer) {
    if (element.getAttribute(CONFIG.ATTRIBUTES.LOADED) === 'true') {
      return;
    }

    observer.unobserve(element);

    if (element.hasAttribute(CONFIG.ATTRIBUTES.SRC)) {
      await loadImage(element);
    } else if (element.hasAttribute(CONFIG.ATTRIBUTES.BACKGROUND)) {
      await loadBackgroundImage(element);
    }
  }

  // ============================================
  // INTERSECTION OBSERVER IMPLEMENTATION
  // ============================================

  /**
   * Create and configure Intersection Observer
   * @returns {IntersectionObserver} Configured observer
   */
  function createObserver() {
    const options = {
      root: null,
      rootMargin: CONFIG.OBSERVER.ROOT_MARGIN,
      threshold: CONFIG.OBSERVER.THRESHOLD,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          handleIntersection(entry.target, observer);
        }
      });
    }, options);

    log('info', 'Intersection Observer created', { options });

    return observer;
  }

  /**
   * Observe lazy-loadable elements
   * @param {IntersectionObserver} observer - Observer instance
   */
  function observeElements(observer) {
    const lazyImages = document.querySelectorAll(CONFIG.SELECTORS.LAZY_IMAGE);
    const lazyBackgrounds = document.querySelectorAll(CONFIG.SELECTORS.LAZY_BACKGROUND);

    let observedCount = 0;

    lazyImages.forEach((img) => {
      if (img.getAttribute(CONFIG.ATTRIBUTES.LOADED) !== 'true') {
        observer.observe(img);
        observedCount++;
      }
    });

    lazyBackgrounds.forEach((element) => {
      if (element.getAttribute(CONFIG.ATTRIBUTES.LOADED) !== 'true') {
        observer.observe(element);
        observedCount++;
      }
    });

    log('info', 'Elements observed for lazy loading', { 
      images: lazyImages.length,
      backgrounds: lazyBackgrounds.length,
      total: observedCount,
    });
  }

  // ============================================
  // FALLBACK IMPLEMENTATION
  // ============================================

  /**
   * Load all images immediately (fallback for unsupported browsers)
   */
  async function loadAllImagesImmediately() {
    log('warn', 'Intersection Observer not supported, loading all images immediately');

    const lazyImages = document.querySelectorAll(CONFIG.SELECTORS.LAZY_IMAGE);
    const lazyBackgrounds = document.querySelectorAll(CONFIG.SELECTORS.LAZY_BACKGROUND);

    const imagePromises = Array.from(lazyImages).map((img) => loadImage(img));
    const backgroundPromises = Array.from(lazyBackgrounds).map((element) => 
      loadBackgroundImage(element)
    );

    try {
      await Promise.allSettled([...imagePromises, ...backgroundPromises]);
      log('info', 'All images loaded (fallback mode)', {
        images: lazyImages.length,
        backgrounds: lazyBackgrounds.length,
      });
    } catch (error) {
      log('error', 'Error loading images in fallback mode', { 
        error: error.message,
      });
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Initialize lazy loading functionality
   */
  function init() {
    try {
      log('info', 'Initializing lazy loading');

      if (isIntersectionObserverSupported()) {
        const observer = createObserver();
        observeElements(observer);
        log('info', 'Lazy loading initialized with Intersection Observer');
      } else {
        loadAllImagesImmediately();
        log('info', 'Lazy loading initialized with fallback mode');
      }
    } catch (error) {
      log('error', 'Failed to initialize lazy loading', { 
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

  // Export for testing purposes
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      init,
      loadImage,
      loadBackgroundImage,
      isIntersectionObserverSupported,
    };
  }
})();