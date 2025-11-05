/**
 * DOM Utilities
 * Helper functions for DOM manipulation
 */

/**
 * Enable/disable buttons
 */
export function setButtonsDisabled(buttonIds, disabled) {
  buttonIds.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = disabled;
    }
  });
}

/**
 * Toggle dropdown visibility
 */
export function toggleDropdown(dropdownId) {
  const dropdown = document.getElementById(dropdownId);
  if (dropdown) {
    dropdown.classList.toggle('show');
  }
}

/**
 * Close dropdown
 */
export function closeDropdown(dropdownId) {
  const dropdown = document.getElementById(dropdownId);
  if (dropdown) {
    dropdown.classList.remove('show');
  }
}

/**
 * Toggle mobile menu
 */
export function toggleMobileMenu() {
  const mobileMenu = document.getElementById('mobileMenu');
  if (mobileMenu) {
    mobileMenu.classList.toggle('show');
  }
}

/**
 * Close mobile menu
 */
export function closeMobileMenu() {
  const mobileMenu = document.getElementById('mobileMenu');
  if (mobileMenu) {
    mobileMenu.classList.remove('show');
  }
}

/**
 * Setup event delegation for a container
 */
export function setupEventDelegation(container, actions) {
  if (!container) return;

  container.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const handler = actions[action];

    if (handler) {
      handler(target, e);
    }
  });

  // Also handle change events for form inputs
  container.addEventListener('change', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const handler = actions[action];

    if (handler) {
      handler(target, e);
    }
  });
}

/**
 * Hide element by setting display to none
 */
export function hideElement(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.style.display = 'none';
  }
}

/**
 * Show element by setting display to block
 */
export function showElement(elementId, display = 'block') {
  const element = document.getElementById(elementId);
  if (element) {
    element.style.display = display;
  }
}
