/**
 * API Client Module
 * Centralized API communication layer
 */

class APIClientManager {
  constructor() {
    this.baseURL = '/api';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Generic fetch wrapper with error handling and caching
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const method = options.method || 'GET';

    // ✅ Only cache GET requests
    if (method === 'GET') {
      const cacheKey = this.getCacheKey(endpoint, options);
      const cached = this.cache.get(cacheKey);

      if (this.isCacheValid(cached)) {
        console.log(`📦 Cache HIT: ${endpoint}`);
        return cached.data;
      }
    }

    try {
      const data = {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      };

      console.log(`🌐 API Call: ${method} ${endpoint}`);
      const response = await fetch(url, data);
      const result = await response.json();

      if (!response.ok) {
        throw Error(`Response error. URL ${url}. ${JSON.stringify(result)}`);
      }

      // ✅ Cache successful GET requests
      if (method === 'GET') {
        const cacheKey = this.getCacheKey(endpoint, options);
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
        console.log(`💾 Cached: ${endpoint}`);
      }

      // ✅ Invalidate cache on mutations
      if (['POST', 'PUT', 'DELETE'].includes(method)) {
        // Clear related cache entries
        const resource = endpoint.split('/')[1]; // e.g., 'recipes' from '/recipes/123'
        this.clearCache(resource);
        console.log(`🗑️ Cache cleared for: ${resource}`);
      }

      return result;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      return {
        success: false,
        error: error.message || 'Network error',
      };
    }
  }


  /**
   * Generate cache key from endpoint and options
   */
  getCacheKey(endpoint, options = {}) {
    const method = options.method || 'GET';
    const body = options.body || '';
    return `${method}:${endpoint}:${body}`;
  }

  /**
   * Check if cache entry is still valid
   */
  isCacheValid(entry) {
    return entry && (Date.now() - entry.timestamp < this.cacheTimeout);
  }

  /**
   * Clear cache for specific endpoint pattern
   */
  clearCache(pattern) {
    if (pattern) {
      // Clear entries matching pattern
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear entire cache
      this.cache.clear();
    }
  }
  /**
   * Force refresh data by clearing cache and making request
   */
  async forceRefresh(endpoint, options = {}) {
    const cacheKey = this.getCacheKey(endpoint, options);
    this.cache.delete(cacheKey);
    return await this.request(endpoint, options);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    let valid = 0;
    let expired = 0;

    for (const entry of this.cache.values()) {
      if (this.isCacheValid(entry)) {
        valid++;
      } else {
        expired++;
      }
    }

    return {
      total: this.cache.size,
      valid,
      expired,
      size: `${(JSON.stringify([...this.cache.values()]).length / 1024).toFixed(2)} KB`
    };
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

  // ===== USER SETTINGS ENDPOINTS =====

  /**
   * Get user settings
   * @param {string} userId - User ID
   */
  async getUserSettings(userId) {
    return await this.request(`/user-settings/${userId}`);
  }

  /**
   * Create user settings
   * @param {Object} settings - { userId, caloriesPerDay, age, useAge, kidneyStoneRisk }
   */
  async createUserSettings(settings) {
    return await this.request('/user-settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }

  /**
   * Update user settings (creates if doesn't exist)
   * @param {string} userId - User ID
   * @param {Object} settings - { caloriesPerDay, age, useAge, kidneyStoneRisk }
   */
  async updateUserSettings(userId, settings) {
    return await this.request(`/user-settings/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // ===== DIETARY ASSESSMENT ENDPOINT =====

  /**
   * Get dietary assessment
   * @param {Object} data - { totals, oxalateMg, type, userId }
   */
  async getDietaryAssessment(data) {
    return await this.request('/dietary-assessment', {
      method: 'POST',
      body: JSON.stringify(data),
    });
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

  // ===== MENU ENDPOINTS =====

  /**
   * Get all menus
   * @param {string} search - Optional search term
   */
  async getMenus(search = '') {
    const endpoint = search ? `/menus?search=${encodeURIComponent(search)}` : '/menus';
    return await this.request(endpoint);
  }

  /**
   * Get a single menu with details
   * @param {string} id - Menu ID
   */
  async getMenu(id) {
    return await this.request(`/menus/${id}`);
  }

  /**
   * Create a new menu
   * @param {Object} menuData - { name, recipeIds: [recipeId1, recipeId2, ...] }
   */
  async createMenu(menuData) {
    return await this.request('/menus', {
      method: 'POST',
      body: JSON.stringify(menuData),
    });
  }

  /**
   * Update a menu
   * @param {string} id - Menu ID
   * @param {Object} menuData - { name, recipeIds: [recipeId1, recipeId2, ...] }
   */
  async updateMenu(id, menuData) {
    return await this.request(`/menus/${id}`, {
      method: 'PUT',
      body: JSON.stringify(menuData),
    });
  }

  /**
   * Delete a menu
   * @param {string} id - Menu ID
   */
  async deleteMenu(id) {
    return await this.request(`/menus/${id}`, {
      method: 'DELETE',
    });
  }

  // ===== DAILY PLAN ENDPOINTS =====

  /**
   * Get all daily plans
   * @param {string} search - Optional search term
   */
  async getDailyPlans(search = '') {
    const endpoint = search ? `/daily-plans?search=${encodeURIComponent(search)}` : '/daily-plans';
    return await this.request(endpoint);
  }

  /**
   * Get a single daily plan with details
   * @param {string} id - Daily Plan ID
   */
  async getDailyPlan(id) {
    return await this.request(`/daily-plans/${id}`);
  }

  /**
   * Create a new daily plan
   * @param {Object} dailyPlanData - { name, dailyPlanMenus: [{ menuId, type }, ...] }
   */
  async createDailyPlan(dailyPlanData) {
    return await this.request('/daily-plans', {
      method: 'POST',
      body: JSON.stringify(dailyPlanData),
    });
  }

  /**
   * Update a daily plan
   * @param {string} id - Daily Plan ID
   * @param {Object} dailyPlanData - { name, dailyPlanMenus: [{ menuId, type }, ...] }
   */
  async updateDailyPlan(id, dailyPlanData) {
    return await this.request(`/daily-plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dailyPlanData),
    });
  }

  /**
   * Delete a daily plan
   * @param {string} id - Daily Plan ID
   */
  async deleteDailyPlan(id) {
    return await this.request(`/daily-plans/${id}`, {
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

  // ===== NUTRIENT METADATA ENDPOINTS =====

  async getNutrients() {
    return await this.request('/nutrients');
  }

  // ===== PREVIEW ENDPOINTS =====

  /**
   * Preview recipe nutrition from ingredients
   * @param {Array} ingredients - [{ brandId, amount, unit }]
   */
  async previewRecipe(ingredients) {
    return await this.request('/preview/recipe', {
      method: 'POST',
      body: JSON.stringify({ ingredients }),
    });
  }

  /**
   * Preview menu nutrition from recipes
   * @param {Array} recipeIds - [recipeId1, recipeId2, ...]
   */
  async previewMenu(recipeIds) {
    return await this.request('/preview/menu', {
      method: 'POST',
      body: JSON.stringify({ recipeIds }),
    });
  }

  /**
   * Preview daily plan nutrition from menus
   * @param {Array} menuIds - [menuId1, menuId2, ...]
   */
  async previewDailyPlan(menuIds) {
    return await this.request('/preview/daily-plan', {
      method: 'POST',
      body: JSON.stringify({ menuIds }),
    });
  }
}

// Export singleton instance
export const APIClient = new APIClientManager();  