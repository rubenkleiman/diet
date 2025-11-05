/**
 * State Management Module
 * Provides centralized state with subscription capabilities
 */

class StateManager {
  constructor() {
    this.state = {
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
      recipes: [],
      selectedRecipeId: null,
      ingredients: [],
      selectedIngredientId: null,
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
