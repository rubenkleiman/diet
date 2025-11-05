/**
 * API Client Module
 * Centralized API communication layer
 */

class APIClientManager {
  constructor() {
    this.baseURL = '/api';
  }

  /**
   * Generic fetch wrapper with error handling
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      return {
        success: false,
        error: error.message || 'Network error',
      };
    }
  }

  // ===== CONFIG ENDPOINTS =====

  async getConfig() {
    return await this.request('/config');
  }

  async getKidneyStoneRisk() {
    return await this.request('/kidney-stone-risk');
  }

  async getDailyRequirements() {
    return await this.request('/daily-requirements');
  }

  // ===== RECIPE ENDPOINTS =====

  /**
   * Get all recipes
   * @param {string} search - Optional search term
   */
  async getRecipes(search = '') {
    const endpoint = search ? `/recipes?search=${encodeURIComponent(search)}` : '/recipes';
    return await this.request(endpoint);
  }

  /**
   * Get a single recipe with details
   * @param {string} id - Recipe ID
   * @param {boolean} summary - Whether to get summary only
   */
  async getRecipe(id, summary = false) {
    return await this.request(`/recipes/${id}?summary=${summary}`);
  }

  /**
   * Get full recipe details (for editing)
   * @param {string} id - Recipe ID
   */
  async getRecipeFull(id) {
    return await this.request(`/recipes/${id}/full`);
  }

  /**
   * Create a new recipe
   * @param {Object} recipeData - { name, ingredients: [{ brandId, amount, unit }] }
   */
  async createRecipe(recipeData) {
    return await this.request('/recipes', {
      method: 'POST',
      body: JSON.stringify(recipeData),
    });
  }

  /**
   * Update a recipe
   * @param {string} id - Recipe ID
   * @param {Object} recipeData - { name, ingredients: [{ brandId, amount, unit }] }
   */
  async updateRecipe(id, recipeData) {
    return await this.request(`/recipes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(recipeData),
    });
  }

  /**
   * Delete a recipe
   * @param {string} id - Recipe ID
   */
  async deleteRecipe(id) {
    return await this.request(`/recipes/${id}`, {
      method: 'DELETE',
    });
  }

  // ===== INGREDIENT ENDPOINTS =====

  /**
   * Get all ingredients
   * @param {string} search - Optional search term
   */
  async getIngredients(search = '') {
    const endpoint = search ? `/ingredients?search=${encodeURIComponent(search)}` : '/ingredients';
    return await this.request(endpoint);
  }

  /**
   * Get a single ingredient
   * @param {string} id - Ingredient ID
   */
  async getIngredient(id) {
    return await this.request(`/ingredients/${id}`);
  }

  /**
   * Get full ingredient details (for editing)
   * @param {string} id - Ingredient ID
   */
  async getIngredientFull(id) {
    return await this.request(`/ingredients/${id}/full`);
  }

  /**
   * Create a new ingredient
   * @param {Object} ingredientData - { name, serving, servingUnit, density, oxalatePerGram, data }
   */
  async createIngredient(ingredientData) {
    return await this.request('/ingredients', {
      method: 'POST',
      body: JSON.stringify(ingredientData),
    });
  }

  /**
   * Update an ingredient
   * @param {string} id - Ingredient ID
   * @param {Object} ingredientData - { name, serving, servingUnit, density, oxalatePerGram, data }
   */
  async updateIngredient(id, ingredientData) {
    return await this.request(`/ingredients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(ingredientData),
    });
  }

  /**
   * Delete an ingredient
   * @param {string} id - Ingredient ID
   */
  async deleteIngredient(id) {
    return await this.request(`/ingredients/${id}`, {
      method: 'DELETE',
    });
  }

  // ===== UTILITY METHODS =====

  /**
   * Check if response is successful
   */
  isSuccess(response) {
    return response && response.success === true;
  }

  /**
   * Extract error message from response
   */
  getError(response) {
    return response?.error || 'Unknown error occurred';
  }

  /**
   * Extract data from successful response
   */
  getData(response) {
    return this.isSuccess(response) ? response.data : null;
  }
}

// Export singleton instance
export const APIClient = new APIClientManager();
