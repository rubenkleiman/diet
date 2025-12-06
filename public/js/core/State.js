/**
 * State Management Module
 * Provides centralized state with subscription capabilities
 */

class StateManager {
  constructor() {
    this.state = {

      // Daily Plan data
      dailyPlans: [],
      selectedDailyPlanId: null,
      editingDailyPlanId: null,
      selectedMenusForDailyPlan: [],
      showAllDailyNutrients: false,
      currentDailyNutrientPage: 0,

      // Menu data 
      menus: [],
      selectedMenuId: null,
      editingMenuId: null,
      selectedRecipesForMenu: [],

      // Recipe data
      recipes: [],
      selectedRecipeId: null,

      // Ingredient data
      ingredients: [],
      selectedIngredientId: null,

      // Configuration
      config: {},
      kidneyStoneRiskData: {},
      dailyRequirements: {},

      // User settings
      userSettings: {
        caloriesPerDay: 2000,
        age: null,
        useAge: false,
        kidneyStoneRisk: 'Normal'
      },

      // UI state
      currentPage: 'home',
      showAllNutrients: false,
      currentNutrientPage: 0,

      // Recipe editor state
      editingRecipeId: null,
      selectedIngredientsForRecipe: [],

      // Ingredient editor state
      editingIngredientId: null,

      // Nutrient state
      nutrientMetadata: [],
      nutrientMap: {},
    };

    // Subscribers: { key: [callback1, callback2, ...] }
    this.subscribers = {};
  }

  /**
   * Get a value from state
   */
  get(key) {
    return this.state[key];
  }

  /**
   * Set a value in state and notify subscribers
   */
  set(key, value) {
    const oldValue = this.state[key];
    this.state[key] = value;

    // Notify subscribers if value changed
    if (oldValue !== value) {
      this.notify(key, value, oldValue);
    }
  }

  /**
   * Update multiple state values at once
   */
  update(updates) {
    Object.entries(updates).forEach(([key, value]) => {
      this.set(key, value);
    });
  }

  /**
   * Subscribe to state changes
   * @param {string} key - State key to watch
   * @param {Function} callback - Function to call on change
   * @returns {Function} Unsubscribe function
   */
  subscribe(key, callback) {
    if (!this.subscribers[key]) {
      this.subscribers[key] = [];
    }

    this.subscribers[key].push(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers[key] = this.subscribers[key].filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all subscribers of a state change
   */
  notify(key, newValue, oldValue) {
    if (this.subscribers[key]) {
      this.subscribers[key].forEach(callback => {
        callback(newValue, oldValue);
      });
    }
  }

  /**
   * Get entire state (for debugging)
   */
  getAll() {
    return { ...this.state };
  }

  /**
   * Reset state to initial values
   */
  reset() {
    const initialState = {
      dailyPlans: [],
      selectedDailyPlanId: null,
      editingDailyPlanId: null,
      selectedMenusForDailyPlan: [],
      showAllDailyNutrients: false,
      currentDailyNutrientPage: 0,
      recipes: [],
      selectedRecipeId: null,
      ingredients: [],
      selectedIngredientId: null,
      menus: [],
      selectedMenuId: null,
      editingMenuId: null,
      selectedRecipesForMenu: [],
      config: {},
      kidneyStoneRiskData: {},
      dailyRequirements: {},
      userSettings: {
        caloriesPerDay: 2000,
        age: null,
        useAge: false,
        kidneyStoneRisk: 'Normal'
      },
      currentPage: 'home',
      showAllNutrients: false,
      currentNutrientPage: 0,
      editingRecipeId: null,
      selectedIngredientsForRecipe: [],
      editingIngredientId: null,
    };

    Object.entries(initialState).forEach(([key, value]) => {
      this.set(key, value);
    });
  }
}

// Export singleton instance
export const State = new StateManager();

/**
 * Creates and displays a modal dialog dynamically
 * @param {string} header - Modal header text
 * @param {string} message - Modal body message
 * @param {Array<Object>} buttons - Array of button objects, e.g., [{"OK": "green"}, {"Cancel": "neutral"}]
 * @returns {Promise<string>} Resolves with the button name clicked or "ESC" if escaped
 */
export /**
 * Creates and displays a modal dialog dynamically
 * @param {string} header - Modal header text
 * @param {string} message - Modal body message
 * @param {Array<Object>} buttons - Array of button objects, e.g., [{"OK": "green"}, {"Cancel": "neutral"}]
 * @returns {Promise<string>} Resolves with the button name clicked or "ESC" if escaped
 */
function showModal(header, message, buttons) {
  return new Promise((resolve) => {
    // Check if modal already exists and remove it
    const existingModal = document.getElementById('dynamic-modal-overlay');
    if (existingModal) {
      existingModal.remove();
    }

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'dynamic-modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    // Create modal container
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      max-width: 500px;
      width: 90%;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transform: scale(0.9);
      transition: transform 0.3s ease;
    `;

    // Create header
    const headerEl = document.createElement('div');
    headerEl.style.cssText = `
      padding: 20px 24px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 18px;
      font-weight: 600;
      color: #111827;
    `;
    headerEl.textContent = header;

    // Create body
    const body = document.createElement('div');
    body.style.cssText = `
      padding: 24px;
      font-size: 14px;
      color: #374151;
      line-height: 1.6;
      overflow-y: auto;
    `;
    body.textContent = message;

    // Create footer with buttons
    const footer = document.createElement('div');
    footer.style.cssText = `
      padding: 16px 24px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    `;

    // Function to close modal with animation
    const closeModal = (result) => {
      overlay.style.opacity = '0';
      modal.style.transform = 'scale(0.9)';
      
      setTimeout(() => {
        overlay.remove();
        document.removeEventListener('keydown', handleEscape);
        resolve(result);
      }, 300);
    };

    // Handle ESC key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeModal('ESC');
      }
    };

    // Create buttons
    buttons.forEach((buttonObj) => {
      const buttonName = Object.keys(buttonObj)[0];
      const buttonColor = buttonObj[buttonName];
      
      const button = document.createElement('button');
      button.textContent = buttonName;
      button.style.cssText = `
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        outline: none;
      `;

      // Apply color styling
      if (buttonColor === 'neutral') {
        button.style.backgroundColor = '#f3f4f6';
        button.style.color = '#374151';
        button.onmouseover = () => {
          button.style.backgroundColor = '#e5e7eb';
        };
        button.onmouseout = () => {
          button.style.backgroundColor = '#f3f4f6';
        };
      } else {
        button.style.backgroundColor = buttonColor;
        button.style.color = 'white';
        button.onmouseover = () => {
          button.style.filter = 'brightness(0.9)';
        };
        button.onmouseout = () => {
          button.style.filter = 'brightness(1)';
        };
      }

      button.onclick = () => closeModal(buttonName);
      footer.appendChild(button);
    });

    // Assemble modal
    modal.appendChild(headerEl);
    modal.appendChild(body);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Add escape key listener
    document.addEventListener('keydown', handleEscape);

    // Trigger fade-in animation
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      modal.style.transform = 'scale(1)';
    });
  });
}


// Example usage:
// (async () => {
//   const result = await showModal(
//     'Confirm Action',
//     'Are you sure you want to delete this item? This action cannot be undone.',
//     [
//       { 'Delete': '#ef4444' },
//       { 'Cancel': 'neutral' }
//     ]
//   );
//   console.log('User clicked:', result);
// })();