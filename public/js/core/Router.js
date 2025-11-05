/**
 * Router Module
 * Handles page navigation and URL history
 */

import { State } from './State.js';

class RouterManager {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.beforeNavigateHooks = [];
    this.afterNavigateHooks = [];
  }

  /**
   * Initialize router and set up event listeners
   */
  init() {
    // Handle browser back/forward
    window.addEventListener('popstate', (event) => {
      const page = event.state?.page || 'home';
      this.navigateTo(page, false);
    });

    // Handle initial page from URL
    const initialPage = window.location.hash.slice(1) || 'home';
    this.navigateTo(initialPage, false);
  }

  /**
   * Register a route
   * @param {string} name - Route name
   * @param {Function} handler - Function to call when navigating to this route
   */
  register(name, handler) {
    this.routes.set(name, handler);
  }

  /**
   * Navigate to a page
   * @param {string} page - Page name
   * @param {boolean} pushState - Whether to update browser history
   */
  navigateTo(page, pushState = true) {
    // Run before-navigate hooks
    for (const hook of this.beforeNavigateHooks) {
      const result = hook(page, this.currentRoute);
      if (result === false) {
        return; // Cancel navigation
      }
    }

    // Update state
    State.set('currentPage', page);
    
    // Scroll to top
    window.scrollTo(0, 0);

    // Remove active class from all pages
    document.querySelectorAll('.page').forEach(p => {
      p.classList.remove('active');
    });

    // Add active class to target page
    const pageElement = document.getElementById(`${page}Page`);
    if (pageElement) {
      pageElement.classList.add('active');

      // Update URL without reloading
      if (pushState) {
        history.pushState({ page }, '', `#${page}`);
      }

      // Call registered route handler
      const handler = this.routes.get(page);
      if (handler) {
        handler();
      }

      this.currentRoute = page;

      // Run after-navigate hooks
      for (const hook of this.afterNavigateHooks) {
        hook(page);
      }
    } else {
      console.warn(`Page not found: ${page}`);
    }
  }

  /**
   * Get current route
   */
  getCurrentRoute() {
    return this.currentRoute;
  }

  /**
   * Add a hook to run before navigation
   * @param {Function} hook - Function that receives (toPage, fromPage)
   */
  beforeNavigate(hook) {
    this.beforeNavigateHooks.push(hook);
  }

  /**
   * Add a hook to run after navigation
   * @param {Function} hook - Function that receives (page)
   */
  afterNavigate(hook) {
    this.afterNavigateHooks.push(hook);
  }

  /**
   * Navigate back
   */
  back() {
    window.history.back();
  }

  /**
   * Navigate forward
   */
  forward() {
    window.history.forward();
  }
}

// Export singleton instance
export const Router = new RouterManager();
