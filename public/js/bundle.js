(() => {
  // public/js/core/State.js
  var StateManager = class {
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
          caloriesPerDay: 2e3,
          age: null,
          useAge: false,
          kidneyStoneRisk: "Normal"
        },
        // UI state
        currentPage: "home",
        showAllNutrients: false,
        currentNutrientPage: 0,
        // Recipe editor state
        editingRecipeId: null,
        selectedIngredientsForRecipe: [],
        // Ingredient editor state
        editingIngredientId: null
      };
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
      return () => {
        this.subscribers[key] = this.subscribers[key].filter((cb) => cb !== callback);
      };
    }
    /**
     * Notify all subscribers of a state change
     */
    notify(key, newValue, oldValue) {
      if (this.subscribers[key]) {
        this.subscribers[key].forEach((callback) => {
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
          caloriesPerDay: 2e3,
          age: null,
          useAge: false,
          kidneyStoneRisk: "Normal"
        },
        currentPage: "home",
        showAllNutrients: false,
        currentNutrientPage: 0,
        editingRecipeId: null,
        selectedIngredientsForRecipe: [],
        editingIngredientId: null
      };
      Object.entries(initialState).forEach(([key, value]) => {
        this.set(key, value);
      });
    }
  };
  var State = new StateManager();

  // public/js/core/Router.js
  var RouterManager = class {
    constructor() {
      this.routes = /* @__PURE__ */ new Map();
      this.currentRoute = null;
      this.beforeNavigateHooks = [];
      this.afterNavigateHooks = [];
    }
    /**
     * Initialize router and set up event listeners
     */
    init() {
      window.addEventListener("popstate", (event) => {
        const page = event.state?.page || "home";
        this.navigateTo(page, false);
      });
      const initialPage = window.location.hash.slice(1) || "home";
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
      for (const hook of this.beforeNavigateHooks) {
        const result = hook(page, this.currentRoute);
        if (result === false) {
          return;
        }
      }
      State.set("currentPage", page);
      window.scrollTo(0, 0);
      document.querySelectorAll(".page").forEach((p) => {
        p.classList.remove("active");
      });
      const pageElement = document.getElementById(`${page}Page`);
      if (pageElement) {
        pageElement.classList.add("active");
        if (pushState) {
          history.pushState({ page }, "", `#${page}`);
        }
        const handler = this.routes.get(page);
        if (handler) {
          handler();
        }
        this.currentRoute = page;
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
  };
  var Router = new RouterManager();

  // public/js/core/APIClient.js
  var APIClientManager = class {
    constructor() {
      this.baseURL = "/api";
    }
    /**
     * Generic fetch wrapper with error handling
     */
    async request(endpoint, options = {}) {
      const url = `${this.baseURL}${endpoint}`;
      try {
        const data = {
          headers: {
            "Content-Type": "application/json",
            ...options.headers
          },
          ...options
        };
        const response = await fetch(url, data);
        if (!response.ok) {
          throw Error(`Response error. URL ${url}`);
        }
        const result = await response.json();
        return result;
      } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        return {
          success: false,
          error: error.message || "Network error"
        };
      }
    }
    // ===== CONFIG ENDPOINTS =====
    async getConfig() {
      return await this.request("/config");
    }
    async getKidneyStoneRisk() {
      return await this.request("/kidney-stone-risk");
    }
    async getDailyRequirements() {
      return await this.request("/daily-requirements");
    }
    // ===== RECIPE ENDPOINTS =====
    /**
     * Get all recipes
     * @param {string} search - Optional search term
     */
    async getRecipes(search = "") {
      const endpoint = search ? `/recipes?search=${encodeURIComponent(search)}` : "/recipes";
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
      return await this.request("/recipes", {
        method: "POST",
        body: JSON.stringify(recipeData)
      });
    }
    /**
     * Update a recipe
     * @param {string} id - Recipe ID
     * @param {Object} recipeData - { name, ingredients: [{ brandId, amount, unit }] }
     */
    async updateRecipe(id, recipeData) {
      return await this.request(`/recipes/${id}`, {
        method: "PUT",
        body: JSON.stringify(recipeData)
      });
    }
    /**
     * Delete a recipe
     * @param {string} id - Recipe ID
     */
    async deleteRecipe(id) {
      return await this.request(`/recipes/${id}`, {
        method: "DELETE"
      });
    }
    // ===== INGREDIENT ENDPOINTS =====
    /**
     * Get all ingredients
     * @param {string} search - Optional search term
     */
    async getIngredients(search = "") {
      const endpoint = search ? `/ingredients?search=${encodeURIComponent(search)}` : "/ingredients";
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
      return await this.request("/ingredients", {
        method: "POST",
        body: JSON.stringify(ingredientData)
      });
    }
    /**
     * Update an ingredient
     * @param {string} id - Ingredient ID
     * @param {Object} ingredientData - { name, serving, servingUnit, density, oxalatePerGram, data }
     */
    async updateIngredient(id, ingredientData) {
      return await this.request(`/ingredients/${id}`, {
        method: "PUT",
        body: JSON.stringify(ingredientData)
      });
    }
    /**
     * Delete an ingredient
     * @param {string} id - Ingredient ID
     */
    async deleteIngredient(id) {
      return await this.request(`/ingredients/${id}`, {
        method: "DELETE"
      });
    }
    // ===== MENU ENDPOINTS =====
    /**
     * Get all menus
     * @param {string} search - Optional search term
     */
    async getMenus(search = "") {
      const endpoint = search ? `/menus?search=${encodeURIComponent(search)}` : "/menus";
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
      return await this.request("/menus", {
        method: "POST",
        body: JSON.stringify(menuData)
      });
    }
    /**
     * Update a menu
     * @param {string} id - Menu ID
     * @param {Object} menuData - { name, recipeIds: [recipeId1, recipeId2, ...] }
     */
    async updateMenu(id, menuData) {
      return await this.request(`/menus/${id}`, {
        method: "PUT",
        body: JSON.stringify(menuData)
      });
    }
    /**
     * Delete a menu
     * @param {string} id - Menu ID
     */
    async deleteMenu(id) {
      return await this.request(`/menus/${id}`, {
        method: "DELETE"
      });
    }
    // ===== DAILY PLAN ENDPOINTS =====
    /**
     * Get all daily plans
     * @param {string} search - Optional search term
     */
    async getDailyPlans(search = "") {
      const endpoint = search ? `/daily-plans?search=${encodeURIComponent(search)}` : "/daily-plans";
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
      return await this.request("/daily-plans", {
        method: "POST",
        body: JSON.stringify(dailyPlanData)
      });
    }
    /**
     * Update a daily plan
     * @param {string} id - Daily Plan ID
     * @param {Object} dailyPlanData - { name, dailyPlanMenus: [{ menuId, type }, ...] }
     */
    async updateDailyPlan(id, dailyPlanData) {
      return await this.request(`/daily-plans/${id}`, {
        method: "PUT",
        body: JSON.stringify(dailyPlanData)
      });
    }
    /**
     * Delete a daily plan
     * @param {string} id - Daily Plan ID
     */
    async deleteDailyPlan(id) {
      return await this.request(`/daily-plans/${id}`, {
        method: "DELETE"
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
      return response?.error || "Unknown error occurred";
    }
    /**
     * Extract data from successful response
     */
    getData(response) {
      return this.isSuccess(response) ? response.data : null;
    }
  };
  var APIClient = new APIClientManager();

  // public/js/managers/DailyPlanManager.js
  var DailyPlanManager = class {
    /**
     * Load all daily plans from API
     */
    async loadDailyPlans() {
      try {
        const result = await APIClient.getDailyPlans();
        if (APIClient.isSuccess(result)) {
          State.set("dailyPlans", result.data);
          return result.data;
        } else {
          console.error("Error loading daily plans:", APIClient.getError(result));
          throw new Error(APIClient.getError(result));
        }
      } catch (error) {
        console.error("Error loading daily plans:", error);
        throw error;
      }
    }
    /**
     * Get daily plan by ID
     */
    async getDailyPlan(id) {
      try {
        const result = await APIClient.getDailyPlan(id);
        if (APIClient.isSuccess(result)) {
          return result.data;
        } else {
          throw new Error(APIClient.getError(result));
        }
      } catch (error) {
        console.error("Error loading daily plan:", error);
        throw error;
      }
    }
    /**
     * Create a new daily plan
     */
    async createDailyPlan(dailyPlanData) {
      try {
        const result = await APIClient.createDailyPlan(dailyPlanData);
        if (APIClient.isSuccess(result)) {
          await this.loadDailyPlans();
          return result.data;
        } else {
          throw new Error(APIClient.getError(result));
        }
      } catch (error) {
        console.error("Error creating daily plan:", error);
        throw error;
      }
    }
    /**
     * Update an existing daily plan
     */
    async updateDailyPlan(id, dailyPlanData) {
      try {
        const result = await APIClient.updateDailyPlan(id, dailyPlanData);
        if (APIClient.isSuccess(result)) {
          await this.loadDailyPlans();
          return result.data;
        } else {
          throw new Error(APIClient.getError(result));
        }
      } catch (error) {
        console.error("Error updating daily plan:", error);
        throw error;
      }
    }
    /**
     * Delete a daily plan
     */
    async deleteDailyPlan(id) {
      try {
        const result = await APIClient.deleteDailyPlan(id);
        if (APIClient.isSuccess(result)) {
          await this.loadDailyPlans();
          return true;
        } else {
          throw new Error(APIClient.getError(result));
        }
      } catch (error) {
        console.error("Error deleting daily plan:", error);
        throw error;
      }
    }
    /**
     * Select a daily plan
     */
    selectDailyPlan(dailyPlanId2) {
      State.set("selectedDailyPlanId", dailyPlanId2);
    }
    /**
     * Deselect daily plan
     */
    deselectDailyPlan() {
      State.set("selectedDailyPlanId", null);
    }
    /**
     * Filter daily plans by search term
     */
    filterDailyPlans(searchTerm) {
      const dailyPlans = State.get("dailyPlans");
      const term = searchTerm.toLowerCase().trim();
      if (!term) {
        return dailyPlans;
      }
      return dailyPlans.filter(
        (plan) => plan.name.toLowerCase().includes(term)
      );
    }
    /**
     * Start editing a daily plan
     */
    startEdit(dailyPlanId2 = null) {
      State.set("editingDailyPlanId", dailyPlanId2);
      if (dailyPlanId2 === null) {
        State.set("selectedMenusForDailyPlan", []);
      }
    }
    /**
     * Cancel editing
     */
    cancelEdit() {
      State.set("editingDailyPlanId", null);
      State.set("selectedMenusForDailyPlan", []);
    }
    /**
     * Add menu to daily plan being edited
     */
    addMenuToDailyPlan(menu) {
      const selected = State.get("selectedMenusForDailyPlan");
      selected.push({
        menuId: menu.id,
        name: menu.name,
        type: "Other"
        // Default type
      });
      State.set("selectedMenusForDailyPlan", [...selected]);
      return true;
    }
    /**
     * Remove menu from daily plan being edited
     */
    removeMenuFromDailyPlan(index) {
      const selected = State.get("selectedMenusForDailyPlan");
      selected.splice(index, 1);
      State.set("selectedMenusForDailyPlan", [...selected]);
    }
    /**
     * Update menu type in daily plan being edited
     */
    updateMenuType(index, type) {
      const selected = State.get("selectedMenusForDailyPlan");
      selected[index].type = type;
      State.set("selectedMenusForDailyPlan", [...selected]);
    }
    /**
     * Calculate oxalate risk for daily plan
     */
    calculateOxalateRisk(oxalateMg) {
      const userSettings = State.get("userSettings");
      const kidneyStoneRiskData = State.get("kidneyStoneRiskData");
      const maxOxalates = kidneyStoneRiskData[userSettings.kidneyStoneRisk]?.maxOxalatesPerDay || 200;
      const percent = oxalateMg / maxOxalates * 100;
      if (percent < 50) {
        return { status: "safe", percent, color: "#27ae60", message: "" };
      } else if (percent < 100) {
        return {
          status: "warning",
          percent,
          color: "#b8860b",
          message: `Approaching your daily oxalate limit (${maxOxalates}mg)`
        };
      } else {
        return {
          status: "danger",
          percent,
          color: "#e74c3c",
          message: `Exceeds your daily oxalate limit (${maxOxalates}mg). This daily plan contains ${oxalateMg.toFixed(1)}mg oxalates, which is ${(percent - 100).toFixed(0)}% over your ${userSettings.kidneyStoneRisk.toLowerCase()} risk limit.`
        };
      }
    }
  };

  // public/js/managers/MenuManager.js
  var MenuManager = class {
    /**
     * Load all menus from API
     */
    async loadMenus() {
      try {
        const result = await APIClient.getMenus();
        if (APIClient.isSuccess(result)) {
          State.set("menus", result.data);
          return result.data;
        } else {
          console.error("Error loading menus:", APIClient.getError(result));
          throw new Error(APIClient.getError(result));
        }
      } catch (error) {
        console.error("Error loading menus:", error);
        throw error;
      }
    }
    /**
     * Get menu by ID
     */
    async getMenu(id) {
      try {
        const result = await APIClient.getMenu(id);
        if (APIClient.isSuccess(result)) {
          return result.data;
        } else {
          throw new Error(APIClient.getError(result));
        }
      } catch (error) {
        console.error("Error loading menu:", error);
        throw error;
      }
    }
    /**
     * Create a new menu
     */
    async createMenu(menuData) {
      try {
        const result = await APIClient.createMenu(menuData);
        if (APIClient.isSuccess(result)) {
          await this.loadMenus();
          return result.data;
        } else {
          throw new Error(APIClient.getError(result));
        }
      } catch (error) {
        console.error("Error creating menu:", error);
        throw error;
      }
    }
    /**
     * Update an existing menu
     */
    async updateMenu(id, menuData) {
      try {
        const result = await APIClient.updateMenu(id, menuData);
        if (APIClient.isSuccess(result)) {
          await this.loadMenus();
          return result.data;
        } else {
          throw new Error(APIClient.getError(result));
        }
      } catch (error) {
        console.error("Error updating menu:", error);
        throw error;
      }
    }
    /**
     * Delete a menu
     */
    async deleteMenu(id) {
      try {
        const result = await APIClient.deleteMenu(id);
        if (APIClient.isSuccess(result)) {
          await this.loadMenus();
          return true;
        } else {
          throw new Error(APIClient.getError(result));
        }
      } catch (error) {
        console.error("Error deleting menu:", error);
        throw error;
      }
    }
    /**
     * Select a menu
     */
    selectMenu(menuId) {
      State.set("selectedMenuId", menuId);
    }
    /**
     * Deselect menu
     */
    deselectMenu() {
      State.set("selectedMenuId", null);
    }
    /**
     * Filter menus by search term
     */
    filterMenus(searchTerm) {
      const menus = State.get("menus");
      const term = searchTerm.toLowerCase().trim();
      if (!term) {
        return menus;
      }
      return menus.filter(
        (menu) => menu.name.toLowerCase().includes(term)
      );
    }
    /**
     * Start editing a menu
     */
    startEdit(menuId = null) {
      State.set("editingMenuId", menuId);
      if (menuId === null) {
        State.set("selectedRecipesForMenu", []);
      }
    }
    /**
     * Cancel editing
     */
    cancelEdit() {
      State.set("editingMenuId", null);
      State.set("selectedRecipesForMenu", []);
    }
    /**
     * Add recipe to menu being edited
     */
    addRecipeToMenu(recipe) {
      const selected = State.get("selectedRecipesForMenu");
      if (selected.some((r) => r.id === recipe.id)) {
        return false;
      }
      selected.push({
        id: recipe.id,
        name: recipe.name
      });
      State.set("selectedRecipesForMenu", [...selected]);
      return true;
    }
    /**
     * Remove recipe from menu being edited
     */
    removeRecipeFromMenu(index) {
      const selected = State.get("selectedRecipesForMenu");
      selected.splice(index, 1);
      State.set("selectedRecipesForMenu", [...selected]);
    }
    /**
     * Fetch recipe details and aggregate nutritional data
     */
    async getMenuNutritionalData(menu) {
      try {
        const recipePromises = menu.recipeIds.map(
          (recipeId) => APIClient.getRecipe(recipeId, false)
        );
        const recipeResults = await Promise.all(recipePromises);
        const recipes = recipeResults.filter((result) => APIClient.isSuccess(result)).map((result) => result.data);
        if (recipes.length === 0) {
          throw new Error("No recipes found in menu");
        }
        const aggregated = this.aggregateNutrition(recipes);
        return {
          menuId: menu.id,
          menuName: menu.name,
          recipes,
          totals: aggregated.totals,
          oxalateMg: aggregated.oxalateMg,
          dashAdherence: aggregated.dashAdherence,
          dashReasons: aggregated.dashReasons,
          oxalateLevel: aggregated.oxalateLevel
        };
      } catch (error) {
        console.error("Error fetching menu nutritional data:", error);
        throw error;
      }
    }
    /**
     * Aggregate nutrition from multiple recipes
     */
    aggregateNutrition(recipes) {
      const totals = {};
      let totalOxalates = 0;
      const dashAdherenceList = [];
      const dashReasonsList = [];
      const oxalateLevelList = [];
      recipes.forEach((recipe) => {
        for (const [nutrient, value] of Object.entries(recipe.totals || {})) {
          if (!totals[nutrient]) {
            totals[nutrient] = 0;
          }
          totals[nutrient] += value;
        }
        totalOxalates += recipe.oxalateMg || 0;
        if (recipe.dashAdherence) {
          dashAdherenceList.push(recipe.dashAdherence);
        }
        if (recipe.dashReasons) {
          dashReasonsList.push(`${recipe.name}: ${recipe.dashReasons}`);
        }
        if (recipe.oxalateLevel) {
          oxalateLevelList.push(recipe.oxalateLevel);
        }
      });
      const dashAdherence = this.calculateOverallDashAdherence(dashAdherenceList);
      const dashReasons = dashReasonsList.join("; ");
      const oxalateLevel = this.calculateOverallOxalateLevel(totalOxalates);
      return {
        totals,
        oxalateMg: totalOxalates,
        dashAdherence,
        dashReasons,
        oxalateLevel
      };
    }
    /**
     * Calculate overall DASH adherence from multiple recipes
     */
    calculateOverallDashAdherence(adherenceList) {
      if (adherenceList.length === 0) return "Unknown";
      const counts = {};
      adherenceList.forEach((adherence) => {
        counts[adherence] = (counts[adherence] || 0) + 1;
      });
      if (counts["Poor"] && counts["Poor"] > adherenceList.length / 2) {
        return "Poor";
      }
      if (counts["Good"] && counts["Good"] > adherenceList.length / 2) {
        return "Good";
      }
      return "Fair";
    }
    /**
     * Calculate overall oxalate level based on total mg
     */
    calculateOverallOxalateLevel(totalOxalates) {
      if (totalOxalates < 50) return "Low";
      if (totalOxalates < 100) return "Moderate";
      if (totalOxalates < 200) return "High";
      return "Very High";
    }
    /**
     * Calculate oxalate risk for menu
     */
    calculateOxalateRisk(oxalateMg) {
      const userSettings = State.get("userSettings");
      const kidneyStoneRiskData = State.get("kidneyStoneRiskData");
      const maxOxalates = kidneyStoneRiskData[userSettings.kidneyStoneRisk]?.maxOxalatesPerDay || 200;
      const percent = oxalateMg / maxOxalates * 100;
      if (percent < 50) {
        return { status: "safe", percent, color: "#27ae60", message: "" };
      } else if (percent < 100) {
        return {
          status: "warning",
          percent,
          color: "#b8860b",
          message: `Approaching your daily oxalate limit (${maxOxalates}mg)`
        };
      } else {
        return {
          status: "danger",
          percent,
          color: "#e74c3c",
          message: `Exceeds your daily oxalate limit (${maxOxalates}mg). This menu contains ${oxalateMg.toFixed(1)}mg oxalates, which is ${(percent - 100).toFixed(0)}% over your ${userSettings.kidneyStoneRisk.toLowerCase()} risk limit.`
        };
      }
    }
  };

  // public/js/managers/RecipeManager.js
  var RecipeManager = class {
    constructor() {
      this.NUTRIENTS_PER_PAGE = 5;
    }
    /**
     * Load all recipes from API
     */
    async loadRecipes() {
      try {
        const result = await APIClient.getRecipes();
        if (APIClient.isSuccess(result)) {
          State.set("recipes", result.data);
          return result.data;
        } else {
          console.error("Error loading recipes:", APIClient.getError(result));
          throw new Error(APIClient.getError(result));
        }
      } catch (error) {
        console.error("Error loading recipes:", error);
        throw error;
      }
    }
    /**
     * Get recipe by ID with details
     */
    async getRecipe(id, summary = false) {
      try {
        const result = await APIClient.getRecipe(id, summary);
        if (APIClient.isSuccess(result)) {
          return result.data;
        } else {
          throw new Error(APIClient.getError(result));
        }
      } catch (error) {
        console.error("Error loading recipe:", error);
        throw error;
      }
    }
    /**
     * Get full recipe details for editing
     */
    async getRecipeFull(id) {
      try {
        const result = await APIClient.getRecipeFull(id);
        if (APIClient.isSuccess(result)) {
          return result.data;
        } else {
          throw new Error(APIClient.getError(result));
        }
      } catch (error) {
        console.error("Error loading recipe for editing:", error);
        throw error;
      }
    }
    /**
     * Create a new recipe
     */
    async createRecipe(recipeData) {
      try {
        const result = await APIClient.createRecipe(recipeData);
        if (APIClient.isSuccess(result)) {
          await this.loadRecipes();
          return result.data;
        } else {
          throw new Error(APIClient.getError(result));
        }
      } catch (error) {
        console.error("Error creating recipe:", error);
        throw error;
      }
    }
    /**
     * Update an existing recipe
     */
    async updateRecipe(id, recipeData) {
      try {
        const result = await APIClient.updateRecipe(id, recipeData);
        if (APIClient.isSuccess(result)) {
          await this.loadRecipes();
          return result.data;
        } else {
          throw new Error(APIClient.getError(result));
        }
      } catch (error) {
        console.error("Error updating recipe:", error);
        throw error;
      }
    }
    /**
     * Delete a recipe
     */
    async deleteRecipe(id) {
      try {
        const result = await APIClient.deleteRecipe(id);
        if (APIClient.isSuccess(result)) {
          await this.loadRecipes();
          return true;
        } else {
          throw new Error(APIClient.getError(result));
        }
      } catch (error) {
        console.error("Error deleting recipe:", error);
        throw error;
      }
    }
    /**
     * Select a recipe
     */
    selectRecipe(recipeId) {
      State.set("selectedRecipeId", recipeId);
    }
    /**
     * Deselect recipe
     */
    deselectRecipe() {
      State.set("selectedRecipeId", null);
    }
    /**
     * Filter recipes by search term
     */
    filterRecipes(searchTerm) {
      const recipes = State.get("recipes");
      const term = searchTerm.toLowerCase().trim();
      if (!term) {
        return recipes;
      }
      return recipes.filter(
        (recipe) => recipe.name.toLowerCase().includes(term)
      );
    }
    /**
     * Calculate oxalate risk
     */
    calculateOxalateRisk(oxalateMg) {
      const userSettings = State.get("userSettings");
      const kidneyStoneRiskData = State.get("kidneyStoneRiskData");
      const maxOxalates = kidneyStoneRiskData[userSettings.kidneyStoneRisk]?.maxOxalatesPerDay || 200;
      const percent = oxalateMg / maxOxalates * 100;
      if (percent < 50) {
        return { status: "safe", percent, color: "#27ae60", message: "" };
      } else if (percent < 100) {
        return {
          status: "warning",
          percent,
          color: "#b8860b",
          message: `Approaching your daily oxalate limit (${maxOxalates}mg)`
        };
      } else {
        return {
          status: "danger",
          percent,
          color: "#e74c3c",
          message: `Exceeds your daily oxalate limit (${maxOxalates}mg). This recipe contains ${oxalateMg.toFixed(1)}mg oxalates, which is ${(percent - 100).toFixed(0)}% over your ${userSettings.kidneyStoneRisk.toLowerCase()} risk limit.`
        };
      }
    }
    /**
     * Calculate ingredient contributions
     */
    calculateContributions(recipeData) {
      const contributions = {};
      recipeData.ingredients.forEach((ingredient) => {
        contributions[ingredient.name] = {
          amount: ingredient.amount,
          nutrients: {}
        };
        for (const [nutrient, value] of Object.entries(ingredient.nutritionScaled)) {
          const total = recipeData.totals[nutrient] || 0;
          const percent = total > 0 ? value / total * 100 : 0;
          contributions[ingredient.name].nutrients[nutrient] = {
            value,
            percent
          };
        }
      });
      return contributions;
    }
    /**
     * Start editing a recipe
     */
    startEdit(recipeId = null) {
      State.set("editingRecipeId", recipeId);
      if (recipeId === null) {
        State.set("selectedIngredientsForRecipe", []);
      }
    }
    /**
     * Cancel editing
     */
    cancelEdit() {
      State.set("editingRecipeId", null);
      State.set("selectedIngredientsForRecipe", []);
    }
    /**
     * Add ingredient to recipe being edited
     */
    addIngredientToRecipe(ingredient) {
      const selected = State.get("selectedIngredientsForRecipe");
      if (selected.some((ing) => ing.brandId === ingredient.id)) {
        return false;
      }
      selected.push({
        brandId: ingredient.id,
        name: ingredient.name,
        amount: 100,
        unit: "g"
      });
      State.set("selectedIngredientsForRecipe", [...selected]);
      return true;
    }
    /**
     * Remove ingredient from recipe being edited
     */
    removeIngredientFromRecipe(index) {
      const selected = State.get("selectedIngredientsForRecipe");
      selected.splice(index, 1);
      State.set("selectedIngredientsForRecipe", [...selected]);
    }
    /**
     * Update ingredient amount in recipe being edited
     */
    updateIngredientAmount(index, amount) {
      const selected = State.get("selectedIngredientsForRecipe");
      selected[index].amount = parseFloat(amount);
      State.set("selectedIngredientsForRecipe", [...selected]);
    }
    /**
     * Update ingredient unit in recipe being edited
     */
    updateIngredientUnit(index, unit) {
      const selected = State.get("selectedIngredientsForRecipe");
      selected[index].unit = unit;
      State.set("selectedIngredientsForRecipe", [...selected]);
    }
    /**
     * Toggle nutrient view (key vs all)
     */
    toggleNutrientView() {
      const current = State.get("showAllNutrients");
      State.set("showAllNutrients", !current);
      State.set("currentNutrientPage", 0);
    }
    /**
     * Navigate to previous nutrient page
     */
    prevNutrientPage() {
      const current = State.get("currentNutrientPage");
      if (current > 0) {
        State.set("currentNutrientPage", current - 1);
      }
    }
    /**
     * Navigate to next nutrient page
     */
    nextNutrientPage() {
      State.set("currentNutrientPage", State.get("currentNutrientPage") + 1);
    }
  };

  // public/js/managers/IngredientManager.js
  var IngredientManager = class {
    /**
     * Load all ingredients from API
     */
    async loadIngredients() {
      try {
        const result = await APIClient.getIngredients();
        if (APIClient.isSuccess(result)) {
          State.set("ingredients", result.data);
          return result.data;
        } else {
          console.error("Error loading ingredients:", APIClient.getError(result));
          throw new Error(APIClient.getError(result));
        }
      } catch (error) {
        console.error("Error loading ingredients:", error);
        throw error;
      }
    }
    /**
     * Get ingredient by ID
     */
    async getIngredient(id) {
      try {
        const result = await APIClient.getIngredient(id);
        if (APIClient.isSuccess(result)) {
          return result.data;
        } else {
          throw new Error(APIClient.getError(result));
        }
      } catch (error) {
        console.error("Error loading ingredient:", error);
        throw error;
      }
    }
    /**
     * Get full ingredient details for editing
     */
    async getIngredientFull(id) {
      try {
        const result = await APIClient.getIngredientFull(id);
        if (APIClient.isSuccess(result)) {
          return result.data;
        } else {
          throw new Error(APIClient.getError(result));
        }
      } catch (error) {
        console.error("Error loading ingredient for editing:", error);
        throw error;
      }
    }
    /**
     * Create a new ingredient
     */
    async createIngredient(ingredientData) {
      try {
        const result = await APIClient.createIngredient(ingredientData);
        if (APIClient.isSuccess(result)) {
          await this.loadIngredients();
          return result.data;
        } else {
          throw new Error(APIClient.getError(result));
        }
      } catch (error) {
        console.error("Error creating ingredient:", error);
        throw error;
      }
    }
    /**
     * Update an existing ingredient
     */
    async updateIngredient(id, ingredientData) {
      try {
        const result = await APIClient.updateIngredient(id, ingredientData);
        if (APIClient.isSuccess(result)) {
          await this.loadIngredients();
          return result.data;
        } else {
          throw new Error(APIClient.getError(result));
        }
      } catch (error) {
        console.error("Error updating ingredient:", error);
        throw error;
      }
    }
    /**
     * Delete an ingredient
     */
    async deleteIngredient(id) {
      try {
        const result = await APIClient.deleteIngredient(id);
        if (APIClient.isSuccess(result)) {
          await this.loadIngredients();
          return true;
        } else {
          throw new Error(APIClient.getError(result));
        }
      } catch (error) {
        console.error("Error deleting ingredient:", error);
        throw error;
      }
    }
    /**
     * Search ingredients
     */
    async searchIngredients(searchTerm) {
      try {
        const result = await APIClient.getIngredients(searchTerm);
        if (APIClient.isSuccess(result)) {
          return result.data;
        } else {
          throw new Error(APIClient.getError(result));
        }
      } catch (error) {
        console.error("Error searching ingredients:", error);
        throw error;
      }
    }
    /**
     * Select an ingredient
     */
    selectIngredient(ingredientId) {
      State.set("selectedIngredientId", ingredientId);
    }
    /**
     * Deselect ingredient
     */
    deselectIngredient() {
      State.set("selectedIngredientId", null);
    }
    /**
     * Filter ingredients by search term
     */
    filterIngredients(searchTerm) {
      const ingredients = State.get("ingredients");
      const term = searchTerm.toLowerCase().trim();
      if (!term) {
        return ingredients;
      }
      return ingredients.filter(
        (ing) => ing.name.toLowerCase().includes(term)
      );
    }
    /**
     * Start editing an ingredient
     */
    startEdit(ingredientId = null) {
      State.set("editingIngredientId", ingredientId);
    }
    /**
     * Cancel editing
     */
    cancelEdit() {
      State.set("editingIngredientId", null);
    }
  };

  // public/js/managers/SettingsManager.js
  var SettingsManager = class {
    /**
     * Load user settings from localStorage
     */
    loadUserSettings() {
      const saved = localStorage.getItem("userSettings");
      if (saved) {
        try {
          const settings = JSON.parse(saved);
          State.set("userSettings", settings);
          return settings;
        } catch (error) {
          console.error("Error parsing saved settings:", error);
        }
      }
      return State.get("userSettings");
    }
    /**
     * Save user settings to localStorage
     */
    saveUserSettings(settings = null) {
      const toSave = settings || State.get("userSettings");
      localStorage.setItem("userSettings", JSON.stringify(toSave));
      if (settings) {
        State.set("userSettings", settings);
      }
    }
    /**
     * Update user settings
     */
    updateSettings(updates) {
      const current = State.get("userSettings");
      const updated = { ...current, ...updates };
      this.saveUserSettings(updated);
      return updated;
    }
    /**
     * Load configuration from API
     */
    async loadConfig() {
      try {
        const result = await APIClient.getConfig();
        if (APIClient.isSuccess(result)) {
          State.set("config", result.data);
          return result.data;
        } else {
          console.error("Error loading config:", APIClient.getError(result));
          throw new Error(APIClient.getError(result));
        }
      } catch (error) {
        console.error("Error loading config:", error);
        throw error;
      }
    }
    /**
     * Load kidney stone risk data from API
     */
    async loadKidneyStoneRiskData() {
      try {
        const result = await APIClient.getKidneyStoneRisk();
        if (APIClient.isSuccess(result)) {
          State.set("kidneyStoneRiskData", result.data);
          return result.data;
        } else {
          console.error("Error loading kidney stone risk data:", APIClient.getError(result));
          throw new Error(APIClient.getError(result));
        }
      } catch (error) {
        console.error("Error loading kidney stone risk data:", error);
        throw error;
      }
    }
    /**
     * Load daily requirements from API
     */
    async loadDailyRequirements() {
      try {
        const result = await APIClient.getDailyRequirements();
        if (APIClient.isSuccess(result)) {
          State.set("dailyRequirements", result.data);
          return result.data;
        } else {
          console.error("Error loading daily requirements:", APIClient.getError(result));
          throw new Error(APIClient.getError(result));
        }
      } catch (error) {
        console.error("Error loading daily requirements:", error);
        throw error;
      }
    }
    /**
     * Get kidney stone risk info for a specific risk level
     */
    getKidneyRiskInfo(riskLevel) {
      const kidneyStoneRiskData = State.get("kidneyStoneRiskData");
      return kidneyStoneRiskData[riskLevel] || null;
    }
    /**
     * Apply UI configuration
     */
    applyUIConfig() {
      const config = State.get("config");
      if (config.ui?.recipeListMaxHeight) {
        const container = document.getElementById("recipeListContainer");
        if (container) {
          container.style.maxHeight = config.ui.recipeListMaxHeight;
        }
      }
      if (config.ui?.recipeDetailsMaxHeight) {
        const content = document.getElementById("recipeDetailsContent");
        if (content) {
          content.style.maxHeight = config.ui.recipeDetailsMaxHeight;
        }
      }
    }
  };

  // public/js/renderers/DailyPlanRenderer.js
  var DailyPlanRenderer = class {
    /**
     * Render daily plan list
     */
    static renderList(dailyPlans, onSelect) {
      const listElement = document.getElementById("dailyPlanList");
      if (!listElement) return;
      listElement.innerHTML = "";
      if (dailyPlans.length === 0) {
        listElement.innerHTML = '<li class="no-results">No daily plans found</li>';
        return;
      }
      const sortedPlans = [...dailyPlans].sort((a, b) => a.name.localeCompare(b.name));
      sortedPlans.forEach((plan) => {
        const li = document.createElement("li");
        li.className = "daily-plan-item";
        li.dataset.dailyPlanId = plan.id;
        li.dataset.action = "select-daily-plan";
        li.innerHTML = `
        <span class="daily-plan-name">${plan.name}</span>
        <span class="daily-plan-meta">
          <span class="daily-plan-menu-count">${plan.dailyPlanMenus?.length || 0} menus</span>
        </span>
      `;
        listElement.appendChild(li);
      });
      listElement.addEventListener("click", (e) => {
        const item = e.target.closest('[data-action="select-daily-plan"]');
        if (item && onSelect) {
          onSelect(item.dataset.dailyPlanId);
        }
      });
    }
    /**
     * Update daily plan item with summary data
     */
    static updateDailyPlanItemWithSummary(dailyPlanId2, summaryData, calculateOxalateRisk) {
      const item = document.querySelector(`[data-daily-plan-id="${dailyPlanId2}"]`);
      if (!item || !summaryData) return;
      const userSettings = State.get("userSettings");
      const dailyRequirements = State.get("dailyRequirements");
      const calories = summaryData.totals.calories || 0;
      const caloriesPercent = (calories / userSettings.caloriesPerDay * 100).toFixed(0);
      const sodium = summaryData.totals.sodium || 0;
      const sodiumReq = parseFloat(dailyRequirements["sodium"]?.maximum) || 2300;
      const sodiumPercent = (sodium / sodiumReq * 100).toFixed(0);
      const oxalates = summaryData.oxalateMg || 0;
      const oxalateRisk = calculateOxalateRisk(oxalates);
      const kidneyStoneRiskData = State.get("kidneyStoneRiskData");
      const maxOxalates = kidneyStoneRiskData[userSettings.kidneyStoneRisk]?.maxOxalatesPerDay || 200;
      const oxalatesPercent = (oxalates / maxOxalates * 100).toFixed(0);
      const menuCount = summaryData.menus.length;
      item.innerHTML = `
      <span class="daily-plan-name">${summaryData.dailyPlanName}</span>
      <span class="daily-plan-meta">
        <span class="daily-plan-menu-count">${menuCount} menus</span>
        <span class="daily-plan-calories">${calories.toFixed(0)} cal (${caloriesPercent}%)</span>
        <span class="daily-plan-sodium">${sodium.toFixed(0)}mg Na (${sodiumPercent}%)</span>
        <span class="daily-plan-oxalates" style="color: ${oxalateRisk.color}">${oxalates.toFixed(1)}mg ox (${oxalatesPercent}%)</span>
      </span>
    `;
      const selectedDailyPlanId = State.get("selectedDailyPlanId");
      if (dailyPlanId2 == selectedDailyPlanId) {
        item.classList.add("selected");
      }
    }
    /**
     * Mark daily plan as selected
     */
    static markAsSelected(dailyPlanId2) {
      document.querySelectorAll(".daily-plan-item").forEach((item) => {
        item.classList.remove("selected");
      });
      const selectedItem = document.querySelector(`[data-daily-plan-id="${dailyPlanId2}"]`);
      if (selectedItem) {
        selectedItem.classList.add("selected");
      }
    }
    /**
     * Render daily plan details
     */
    static renderDetails(data, options = {}) {
      const {
        dailyRequirements,
        userSettings,
        showAllNutrients,
        currentNutrientPage,
        calculateOxalateRisk,
        INGREDIENT_PROPS,
        NUTRIENTS_PER_PAGE
      } = options;
      const section = document.getElementById("dailyPlanDetailsSection");
      const title = document.getElementById("dailyPlanDetailsTitle");
      const content = document.getElementById("dailyPlanDetailsContent");
      if (!section || !title || !content) return;
      title.textContent = `Daily Plan: ${data.dailyPlanName}`;
      let html = '<div class="details-content">';
      html += this.renderDailyTotals(data, {
        dailyRequirements,
        userSettings,
        showAllNutrients,
        currentNutrientPage,
        calculateOxalateRisk,
        INGREDIENT_PROPS,
        NUTRIENTS_PER_PAGE
      });
      html += this.renderMenusByType(data);
      html += "</div>";
      content.innerHTML = html;
      section.style.display = "block";
    }
    /**
     * Render daily totals section
     */
    static renderDailyTotals(data, options) {
      const {
        dailyRequirements,
        userSettings,
        showAllNutrients,
        currentNutrientPage,
        calculateOxalateRisk,
        INGREDIENT_PROPS,
        NUTRIENTS_PER_PAGE
      } = options;
      const oxalateRisk = calculateOxalateRisk(data.oxalateMg);
      let html = '<div class="details-section">';
      html += '<div class="contribution-header">';
      html += "<h3>Daily Totals</h3>";
      html += '<button class="btn btn-secondary btn-small" data-action="toggle-daily-nutrient-view">';
      html += showAllNutrients ? "Show Key Nutrients" : "Show All Nutrients";
      html += "</button>";
      html += "</div>";
      if (showAllNutrients) {
        html += this.renderAllNutrientsTotals(data, {
          dailyRequirements,
          userSettings,
          currentNutrientPage,
          INGREDIENT_PROPS,
          NUTRIENTS_PER_PAGE
        });
      } else {
        html += this.renderKeyNutrientsTotals(data, {
          dailyRequirements,
          userSettings,
          calculateOxalateRisk
        });
      }
      if (oxalateRisk.message) {
        html += `<div class="oxalate-warning" style="border-left-color: ${oxalateRisk.color}; margin-top: 1rem;">${oxalateRisk.message}</div>`;
      }
      html += "</div>";
      return html;
    }
    /**
     * Render key nutrients totals (calories, sodium, oxalates)
     */
    static renderKeyNutrientsTotals(data, options) {
      const { dailyRequirements, userSettings, calculateOxalateRisk } = options;
      const calories = data.totals.calories || 0;
      const caloriesPercent = (calories / userSettings.caloriesPerDay * 100).toFixed(1);
      const sodium = data.totals.sodium || 0;
      const sodiumReq = parseFloat(dailyRequirements["sodium"]?.maximum) || 2300;
      const sodiumPercent = (sodium / sodiumReq * 100).toFixed(1);
      const oxalates = data.oxalateMg || 0;
      const oxalateRisk = calculateOxalateRisk(oxalates);
      const oxalatesPercent = oxalateRisk.percent.toFixed(1);
      let html = '<table class="nutrition-table" style="margin-top: 1rem;">';
      html += `<tr><td class="nutrient-name">Calories</td><td class="nutrient-value">${calories.toFixed(0)} (${caloriesPercent}%)</td></tr>`;
      html += `<tr><td class="nutrient-name">Sodium</td><td class="nutrient-value">${sodium.toFixed(0)} mg (${sodiumPercent}%)</td></tr>`;
      html += `<tr><td class="nutrient-name">Oxalates</td><td class="nutrient-value" style="color: ${oxalateRisk.color}">${oxalates.toFixed(1)} mg (${oxalatesPercent}%)</td></tr>`;
      html += "</table>";
      return html;
    }
    /**
     * Render all nutrients totals with pagination
     */
    static renderAllNutrientsTotals(data, options) {
      const { dailyRequirements, userSettings, currentNutrientPage, INGREDIENT_PROPS, NUTRIENTS_PER_PAGE } = options;
      const allNutrients = Object.keys(data.totals).filter((key) => data.totals[key] > 0);
      const startIdx = currentNutrientPage * NUTRIENTS_PER_PAGE;
      const endIdx = Math.min(startIdx + NUTRIENTS_PER_PAGE, allNutrients.length);
      const pageNutrients = allNutrients.slice(startIdx, endIdx);
      const totalPages = Math.ceil(allNutrients.length / NUTRIENTS_PER_PAGE);
      let html = "";
      if (totalPages > 1) {
        html += '<div class="pagination-controls">';
        html += `<button class="btn btn-secondary btn-small" data-action="prev-daily-nutrient-page" ${currentNutrientPage === 0 ? "disabled" : ""}>\u2190 Prev</button>`;
        html += `<span class="page-info">Page ${currentNutrientPage + 1} of ${totalPages}</span>`;
        html += `<button class="btn btn-secondary btn-small" data-action="next-daily-nutrient-page" ${currentNutrientPage >= totalPages - 1 ? "disabled" : ""}>Next \u2192</button>`;
        html += "</div>";
      }
      html += '<table class="nutrition-table" style="margin-top: 1rem;">';
      pageNutrients.forEach((nutrient) => {
        const value = data.totals[nutrient];
        let formattedValue = typeof value === "number" ? value.toFixed(2) : value;
        let percentDaily = "";
        if (nutrient === "calories") {
          const percent = (value / userSettings.caloriesPerDay * 100).toFixed(1);
          percentDaily = ` (${percent}%)`;
        } else if (dailyRequirements[nutrient]) {
          const req = dailyRequirements[nutrient];
          let dailyValue = null;
          if (req.recommended) {
            dailyValue = parseFloat(req.recommended);
          } else if (req.maximum) {
            dailyValue = parseFloat(req.maximum);
          }
          if (dailyValue) {
            const percent = (value / dailyValue * 100).toFixed(1);
            percentDaily = ` (${percent}%)`;
          }
        }
        if (nutrient !== "calories") {
          const unit = INGREDIENT_PROPS[nutrient]?.unit;
          if (unit && unit !== "none") {
            formattedValue = `${formattedValue} ${unit}`;
          }
        }
        html += `<tr><td class="nutrient-name">${nutrient}</td><td class="nutrient-value">${formattedValue}${percentDaily}</td></tr>`;
      });
      html += "</table>";
      return html;
    }
    /**
     * Render menus grouped by type
     */
    static renderMenusByType(data) {
      const typeOrder = ["Breakfast", "Lunch", "Brunch", "Snack", "Dinner", "Other"];
      const menusByType = {};
      typeOrder.forEach((type) => {
        menusByType[type] = [];
      });
      data.menus.forEach((menu) => {
        const type = menu.type || "Other";
        if (menusByType[type]) {
          menusByType[type].push(menu);
        } else {
          menusByType["Other"].push(menu);
        }
      });
      let html = "";
      typeOrder.forEach((type) => {
        if (menusByType[type].length === 0) return;
        html += '<div class="details-section">';
        html += `<h3>${type}</h3>`;
        html += '<ul class="menu-recipe-list">';
        menusByType[type].forEach((menu) => {
          const calories = menu.totals?.calories || 0;
          const sodium = menu.totals?.sodium || 0;
          const oxalates = menu.oxalateMg || 0;
          html += `
          <li class="menu-recipe-item">
            <span class="recipe-name">${menu.name}</span>
            <span class="recipe-stats">
              <span>${calories.toFixed(0)} cal</span>
              <span>${sodium.toFixed(0)}mg Na</span>
              <span>${oxalates.toFixed(1)}mg ox</span>
            </span>
          </li>
        `;
        });
        html += "</ul>";
        html += "</div>";
      });
      return html;
    }
    /**
     * Show error message in daily plan details
     */
    static showError(message) {
      const content = document.getElementById("dailyPlanDetailsContent");
      if (content) {
        content.innerHTML = `<div class="error-message">${message}</div>`;
        const section = document.getElementById("dailyPlanDetailsSection");
        if (section) section.style.display = "block";
      }
    }
    /**
     * Render selected menus for daily plan editor
     */
    static renderSelectedMenus(menus, onRemove, onTypeChange) {
      const container = document.getElementById("menuRowsForDailyPlan");
      if (!container) return;
      if (menus.length === 0) {
        container.innerHTML = '<div class="no-menus-message">No menus added yet</div>';
        return;
      }
      container.innerHTML = "";
      menus.forEach((menu, index) => {
        const row = document.createElement("div");
        row.className = "menu-row-daily-plan";
        row.dataset.index = index;
        const nameSpan = document.createElement("span");
        nameSpan.className = "menu-name";
        nameSpan.title = menu.name;
        nameSpan.textContent = menu.name;
        const typeSelect = document.createElement("select");
        typeSelect.className = "type-select";
        typeSelect.dataset.index = index;
        typeSelect.innerHTML = `
        <option value="Breakfast" ${menu.type === "Breakfast" ? "selected" : ""}>Breakfast</option>
        <option value="Lunch" ${menu.type === "Lunch" ? "selected" : ""}>Lunch</option>
        <option value="Brunch" ${menu.type === "Brunch" ? "selected" : ""}>Brunch</option>
        <option value="Snack" ${menu.type === "Snack" ? "selected" : ""}>Snack</option>
        <option value="Dinner" ${menu.type === "Dinner" ? "selected" : ""}>Dinner</option>
        <option value="Other" ${menu.type === "Other" ? "selected" : ""}>Other</option>
      `;
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "remove-btn";
        removeBtn.dataset.action = "remove-menu-from-daily-plan";
        removeBtn.dataset.index = index;
        removeBtn.title = "Remove menu";
        removeBtn.innerHTML = "&times;";
        row.appendChild(nameSpan);
        row.appendChild(typeSelect);
        row.appendChild(removeBtn);
        if (onTypeChange) {
          typeSelect.addEventListener("change", () => {
            onTypeChange(index, typeSelect.value);
          });
        }
        container.appendChild(row);
      });
    }
    /**
     * Render menu search results for daily plan editor
     */
    static renderMenuSearchResults(results, onAdd) {
      const resultsContainer = document.getElementById("menuSearchResultsForDailyPlan");
      if (!resultsContainer) return;
      if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="search-result-item">No menus found</div>';
        resultsContainer.classList.add("show");
        return;
      }
      resultsContainer.innerHTML = "";
      results.forEach((menu) => {
        const item = document.createElement("div");
        item.className = "search-result-item";
        item.textContent = menu.name;
        item.dataset.menuId = menu.id;
        item.dataset.menuName = menu.name;
        item.style.cursor = "pointer";
        item.dataset.action = "add-menu-to-daily-plan";
        resultsContainer.appendChild(item);
      });
      resultsContainer.addEventListener("click", (e) => {
        const item = e.target.closest('[data-action="add-menu-to-daily-plan"]');
        if (item && onAdd) {
          onAdd({
            id: item.dataset.menuId,
            name: item.dataset.menuName
          });
        }
      });
      resultsContainer.classList.add("show");
    }
    /**
     * Hide menu search results
     */
    static hideMenuSearchResults() {
      const resultsContainer = document.getElementById("menuSearchResultsForDailyPlan");
      if (resultsContainer) {
        resultsContainer.classList.remove("show");
      }
    }
  };

  // public/js/renderers/MenuRenderer.js
  var MenuRenderer = class {
    /**
     * Render menu list
     */
    static renderList(menus, onSelect) {
      const listElement = document.getElementById("menuList");
      if (!listElement) return;
      listElement.innerHTML = "";
      if (menus.length === 0) {
        listElement.innerHTML = '<li class="no-results">No menus found</li>';
        return;
      }
      menus.forEach((menu) => {
        const li = document.createElement("li");
        li.className = "menu-item";
        li.dataset.menuId = menu.id;
        li.dataset.action = "select-menu";
        li.innerHTML = `
        <span class="menu-name">${menu.name}</span>
        <span class="menu-meta">
          <span class="menu-recipe-count">${menu.recipeIds.length} recipes</span>
        </span>
      `;
        listElement.appendChild(li);
      });
      listElement.addEventListener("click", (e) => {
        const item = e.target.closest('[data-action="select-menu"]');
        if (item && onSelect) {
          onSelect(item.dataset.menuId);
        }
      });
    }
    /**
     * Update menu item with summary data
     */
    static updateMenuItemWithSummary(menuId, summaryData, calculateOxalateRisk) {
      const item = document.querySelector(`[data-menu-id="${menuId}"]`);
      if (!item || !summaryData) return;
      const userSettings = State.get("userSettings");
      const calories = summaryData.totals.calories || 0;
      const caloriesPercent = (calories / userSettings.caloriesPerDay * 100).toFixed(0);
      const oxalates = summaryData.oxalateMg || 0;
      const oxalateRisk = calculateOxalateRisk(oxalates);
      const recipeCount = summaryData.recipes.length;
      item.innerHTML = `
      <span class="menu-name">${summaryData.menuName}</span>
      <span class="menu-meta">
        <span class="menu-recipe-count">${recipeCount} recipes</span>
        <span class="menu-calories">${calories.toFixed(0)} cal (${caloriesPercent}%)</span>
        <span class="menu-oxalates" style="color: ${oxalateRisk.color}">${oxalates.toFixed(1)}mg ox</span>
      </span>
    `;
      const selectedMenuId = State.get("selectedMenuId");
      if (menuId === selectedMenuId) {
        item.classList.add("selected");
      }
    }
    /**
     * Mark menu as selected
     */
    static markAsSelected(menuId) {
      document.querySelectorAll(".menu-item").forEach((item) => {
        item.classList.remove("selected");
      });
      const selectedItem = document.querySelector(`[data-menu-id="${menuId}"]`);
      if (selectedItem) {
        selectedItem.classList.add("selected");
      }
    }
    /**
     * Render menu details
     */
    static renderDetails(data, options = {}) {
      const {
        dailyRequirements,
        userSettings,
        calculateOxalateRisk,
        INGREDIENT_PROPS
      } = options;
      const section = document.getElementById("menuDetailsSection");
      const title = document.getElementById("menuDetailsTitle");
      const content = document.getElementById("menuDetailsContent");
      if (!section || !title || !content) return;
      title.textContent = `Menu: ${data.menuName}`;
      let html = '<div class="details-content">';
      html += this.renderDietaryAssessment(data, calculateOxalateRisk);
      html += this.renderRecipeList(data);
      html += this.renderNutritionalTotals(data, {
        dailyRequirements,
        userSettings,
        INGREDIENT_PROPS
      });
      html += "</div>";
      content.innerHTML = html;
      section.style.display = "block";
    }
    /**
     * Render dietary assessment section
     */
    static renderDietaryAssessment(data, calculateOxalateRisk) {
      const oxalateRisk = calculateOxalateRisk(data.oxalateMg);
      let html = '<div class="details-section">';
      html += "<h3>Dietary Assessment</h3>";
      html += `<p><strong>DASH Adherence:</strong> ${data.dashAdherence}</p>`;
      html += `<p><strong>Reasons:</strong> ${data.dashReasons || "N/A"}</p>`;
      html += `<p><strong>Oxalate Level:</strong> <span style="color: ${oxalateRisk.color}; font-weight: bold;">${data.oxalateLevel}</span> (${data.oxalateMg.toFixed(2)} mg)</p>`;
      if (oxalateRisk.message) {
        html += `<div class="oxalate-warning" style="border-left-color: ${oxalateRisk.color};">${oxalateRisk.message}</div>`;
      }
      html += "</div>";
      return html;
    }
    /**
     * Render recipe list section
     */
    static renderRecipeList(data) {
      let html = '<div class="details-section">';
      html += "<h3>Recipes in this Menu</h3>";
      html += '<ul class="menu-recipe-list">';
      data.recipes.forEach((recipe) => {
        const calories = recipe.totals?.calories || 0;
        const oxalates = recipe.oxalateMg || 0;
        html += `
        <li class="menu-recipe-item">
          <span class="recipe-name">${recipe.name}</span>
          <span class="recipe-stats">
            <span>${calories.toFixed(0)} cal</span>
            <span>${oxalates.toFixed(1)}mg ox</span>
          </span>
        </li>
      `;
      });
      html += "</ul>";
      html += "</div>";
      return html;
    }
    /**
     * Render nutritional totals section
     */
    static renderNutritionalTotals(data, options) {
      const { dailyRequirements, userSettings, INGREDIENT_PROPS } = options;
      let html = '<div class="details-section">';
      html += "<h3>Nutritional Totals</h3>";
      html += "<div><i>Combined nutrition from all recipes (% of Daily Requirement)</i></div>";
      html += '<table class="nutrition-table">';
      for (const [key, value] of Object.entries(data.totals)) {
        if (value === 0 && key !== "oxalates") continue;
        let formattedValue = typeof value === "number" ? value.toFixed(2) : value;
        let percentDaily = "";
        if (key === "calories") {
          const percent = (value / userSettings.caloriesPerDay * 100).toFixed(1);
          percentDaily = ` (${percent}%)`;
        } else if (dailyRequirements[key]) {
          const req = dailyRequirements[key];
          let dailyValue = null;
          if (req.recommended) {
            dailyValue = parseFloat(req.recommended);
          } else if (req.maximum) {
            dailyValue = parseFloat(req.maximum);
          }
          if (dailyValue) {
            const percent = (value / dailyValue * 100).toFixed(1);
            percentDaily = ` (${percent}%)`;
          }
        }
        if (key !== "calories") {
          const unit = INGREDIENT_PROPS[key]?.unit;
          if (unit && unit !== "none") {
            formattedValue = `${formattedValue} ${unit}`;
          }
        }
        html += `<tr><td class="nutrient-name">${key}</td><td class="nutrient-value">${formattedValue}${percentDaily}</td></tr>`;
      }
      html += "</table>";
      html += "</div>";
      return html;
    }
    /**
     * Show error message in menu details
     */
    static showError(message) {
      const content = document.getElementById("menuDetailsContent");
      if (content) {
        content.innerHTML = `<div class="error-message">${message}</div>`;
        const section = document.getElementById("menuDetailsSection");
        if (section) section.style.display = "block";
      }
    }
    /**
     * Render selected recipes for menu editor
     */
    static renderSelectedRecipes(recipes, onRemove) {
      const container = document.getElementById("recipeRows");
      if (!container) return;
      if (recipes.length === 0) {
        container.innerHTML = '<div class="no-recipes-message">No recipes added yet</div>';
        return;
      }
      container.innerHTML = "";
      recipes.forEach((recipe, index) => {
        const row = document.createElement("div");
        row.className = "recipe-row";
        row.dataset.index = index;
        const nameSpan = document.createElement("span");
        nameSpan.className = "recipe-name";
        nameSpan.title = recipe.name;
        nameSpan.textContent = recipe.name;
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "remove-btn";
        removeBtn.dataset.action = "remove-recipe";
        removeBtn.dataset.index = index;
        removeBtn.title = "Remove recipe";
        removeBtn.innerHTML = "&times;";
        row.appendChild(nameSpan);
        row.appendChild(removeBtn);
        container.appendChild(row);
      });
    }
    /**
     * Render recipe search results
     */
    static renderRecipeSearchResults(results, selectedRecipes, onAdd) {
      const resultsContainer = document.getElementById("recipeSearchResults");
      if (!resultsContainer) return;
      if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="search-result-item">No recipes found</div>';
        resultsContainer.classList.add("show");
        return;
      }
      resultsContainer.innerHTML = "";
      results.forEach((recipe) => {
        const alreadyAdded = selectedRecipes.some((r) => r.id == recipe.id);
        const item = document.createElement("div");
        item.className = "search-result-item";
        if (alreadyAdded) item.classList.add("selected");
        item.textContent = recipe.name;
        item.dataset.recipeId = recipe.id;
        item.dataset.recipeName = recipe.name;
        if (!alreadyAdded) {
          item.style.cursor = "pointer";
          item.dataset.action = "add-recipe-to-menu";
        } else {
          item.style.opacity = "0.5";
          item.style.cursor = "not-allowed";
          item.title = "Already added";
        }
        resultsContainer.appendChild(item);
      });
      resultsContainer.addEventListener("click", (e) => {
        const item = e.target.closest('[data-action="add-recipe-to-menu"]');
        if (item && onAdd) {
          onAdd({
            id: item.dataset.recipeId,
            name: item.dataset.recipeName
          });
        }
      });
      resultsContainer.classList.add("show");
    }
    /**
     * Hide recipe search results
     */
    static hideRecipeSearchResults() {
      const resultsContainer = document.getElementById("recipeSearchResults");
      if (resultsContainer) {
        resultsContainer.classList.remove("show");
      }
    }
  };

  // public/js/renderers/RecipeRenderer.js
  var RecipeRenderer = class {
    /**
     * Render recipe list
     */
    static renderList(recipes, onSelect) {
      const listElement = document.getElementById("recipeList");
      if (!listElement) return;
      listElement.innerHTML = "";
      if (recipes.length === 0) {
        listElement.innerHTML = '<li class="no-results">No recipes found</li>';
        return;
      }
      recipes.forEach((recipe) => {
        const li = document.createElement("li");
        li.className = "recipe-item";
        li.dataset.recipeId = recipe.id;
        li.dataset.action = "select-recipe";
        li.textContent = recipe.name;
        listElement.appendChild(li);
      });
      listElement.addEventListener("click", (e) => {
        const item = e.target.closest('[data-action="select-recipe"]');
        if (item && onSelect) {
          onSelect(item.dataset.recipeId);
        }
      });
    }
    /**
     * Update recipe item with summary data (calories and oxalates)
     */
    static updateRecipeItemWithSummary(recipeId, summaryData, calculateOxalateRisk) {
      const item = document.querySelector(`[data-recipe-id="${recipeId}"]`);
      if (!item || !summaryData) return;
      const userSettings = State.get("userSettings");
      const calories = summaryData.totals.calories || 0;
      const caloriesPercent = (calories / userSettings.caloriesPerDay * 100).toFixed(0);
      const oxalates = summaryData.oxalateMg || 0;
      const oxalateRisk = calculateOxalateRisk(oxalates);
      const recipe = summaryData;
      item.innerHTML = `
      <span class="recipe-name">${recipe.name}</span>
      <span class="recipe-meta">
        <span class="recipe-calories">${calories.toFixed(0)} cal (${caloriesPercent}%)</span>
        <span class="recipe-oxalates" style="color: ${oxalateRisk.color}">${oxalates.toFixed(1)}mg ox</span>
      </span>
    `;
      const selectedRecipeId = State.get("selectedRecipeId");
      if (recipeId === selectedRecipeId) {
        item.classList.add("selected");
      }
    }
    /**
     * Mark recipe as selected
     */
    static markAsSelected(recipeId) {
      document.querySelectorAll(".recipe-item").forEach((item) => {
        item.classList.remove("selected");
      });
      const selectedItem = document.querySelector(`[data-recipe-id="${recipeId}"]`);
      if (selectedItem) {
        selectedItem.classList.add("selected");
      }
    }
    /**
     * Render recipe details
     */
    static renderDetails(data, options = {}) {
      const {
        dailyRequirements,
        userSettings,
        showAllNutrients,
        currentNutrientPage,
        calculateOxalateRisk,
        calculateContributions,
        INGREDIENT_PROPS,
        NUTRIENTS_PER_PAGE
      } = options;
      const section = document.getElementById("recipeDetailsSection");
      const title = document.getElementById("recipeDetailsTitle");
      const content = document.getElementById("recipeDetailsContent");
      if (!section || !title || !content) return;
      title.textContent = `Recipe: ${data.name}`;
      let html = '<div class="details-content">';
      html += this.renderDietaryAssessment(data, calculateOxalateRisk);
      if (data.ingredients && data.ingredients.length > 0) {
        html += this.renderIngredientContributions(data, {
          showAllNutrients,
          currentNutrientPage,
          calculateContributions,
          dailyRequirements,
          NUTRIENTS_PER_PAGE
        });
      }
      html += this.renderNutritionalTotals(data, {
        dailyRequirements,
        userSettings,
        INGREDIENT_PROPS
      });
      html += this.renderIngredientDetails(data);
      html += "</div>";
      content.innerHTML = html;
      section.style.display = "block";
    }
    /**
     * Render nutritional totals section
     */
    static renderNutritionalTotals(data, options) {
      const { dailyRequirements, userSettings, INGREDIENT_PROPS } = options;
      let html = '<div class="details-section">';
      html += "<h3>Nutritional Totals</h3>";
      html += "<div><i>Nutrient Amount (% of Daily Requirement)</i></div>";
      html += '<table class="nutrition-table">';
      for (const [key, value] of Object.entries(data.totals)) {
        if (value === 0 && key !== "oxalates") continue;
        let formattedValue = typeof value === "number" ? value.toFixed(2) : value;
        let percentDaily = "";
        if (key === "calories") {
          const percent = (value / userSettings.caloriesPerDay * 100).toFixed(1);
          percentDaily = ` (${percent}%)`;
        } else if (dailyRequirements[key]) {
          const req = dailyRequirements[key];
          let dailyValue = null;
          if (req.recommended) {
            dailyValue = parseFloat(req.recommended);
          } else if (req.maximum) {
            dailyValue = parseFloat(req.maximum);
          }
          if (dailyValue) {
            const percent = (value / dailyValue * 100).toFixed(1);
            percentDaily = ` (${percent}%)`;
          }
        }
        if (key !== "calories") {
          const unit = INGREDIENT_PROPS[key]?.unit;
          if (unit && unit !== "none") {
            formattedValue = `${formattedValue} ${unit}`;
          }
        }
        html += `<tr><td class="nutrient-name">${key}</td><td class="nutrient-value">${formattedValue}${percentDaily}</td></tr>`;
      }
      html += "</table>";
      html += "</div>";
      return html;
    }
    /**
     * Render dietary assessment section
     */
    static renderDietaryAssessment(data, calculateOxalateRisk) {
      const oxalateRisk = calculateOxalateRisk(data.oxalateMg);
      let html = '<div class="details-section">';
      html += "<h3>Dietary Assessment</h3>";
      const color = { Excellent: "green", Good: "green", Fair: "brown", Poor: "red" };
      html += `<p style="color:${color[data.dashAdherence]}"><strong>DASH Adherence:</strong> ${data.dashAdherence} </p>`;
      html += `<p><strong>Reasons:</strong> ${data.dashReasons}</p>`;
      html += `<p><strong>Oxalate Level:</strong> <span style="color: ${oxalateRisk.color}; font-weight: bold;">${data.oxalateLevel}</span> (${data.oxalateMg.toFixed(2)} mg)</p>`;
      if (oxalateRisk.message) {
        html += `<div class="oxalate-warning" style="border-left-color: ${oxalateRisk.color};">${oxalateRisk.message}</div>`;
      }
      html += "</div>";
      return html;
    }
    /**
     * Render ingredient details section
     */
    static renderIngredientDetails(data) {
      if (!data.ingredients) return "";
      let html = '<div class="details-section">';
      html += "<h3>Ingredient Details</h3>";
      for (const ingredient of data.ingredients) {
        html += `<div class="ingredient-detail">`;
        html += `<h4>${ingredient.name} (${ingredient.amount.toFixed(1)}g)</h4>`;
        html += '<table class="nutrition-table">';
        for (const [key, value] of Object.entries(ingredient.nutritionScaled)) {
          if (value === 0 && key !== "oxalates") continue;
          const formattedValue = typeof value === "number" ? value.toFixed(2) : value;
          html += `<tr><td class="nutrient-name">${key}</td><td class="nutrient-value">${formattedValue}</td></tr>`;
        }
        html += "</table>";
        html += "</div>";
      }
      html += "</div>";
      return html;
    }
    /**
     * Render ingredient contributions table
     */
    static renderIngredientContributions(data, options) {
      const { showAllNutrients, calculateContributions } = options;
      let html = '<div class="details-section contribution-section">';
      html += '<div class="contribution-header">';
      html += "<h3>Ingredient Contribution</h3>";
      html += '<button class="btn btn-secondary btn-small" data-action="toggle-nutrient-view">';
      html += showAllNutrients ? "Show Key Nutrients" : "Show All Nutrients";
      html += "</button>";
      html += "</div>";
      html += "<div><i>Displays each nutrient's quantity and its percent contribution towards the recipe's content. Totals show the total nutrition quantity and the percent of the recommended daily requirements.</i></div><br/>";
      const contributions = calculateContributions(data);
      if (showAllNutrients) {
        html += this.renderAllNutrientsTable(contributions, data, options);
      } else {
        html += this.renderKeyNutrientsTable(contributions, data, options);
      }
      html += "</div>";
      return html;
    }
    /**
     * Render key nutrients table
     */
    static renderKeyNutrientsTable(contributions, data, options) {
      const { dailyRequirements } = options;
      let html = '<table class="contribution-table">';
      html += "<thead><tr>";
      html += "<th>Ingredient</th>";
      html += "<th>Amount</th>";
      html += "<th>Calories</th>";
      html += "<th>Sodium</th>";
      html += "<th>Oxalates</th>";
      html += "</tr></thead>";
      html += "<tbody>";
      data.ingredients.forEach((ingredient) => {
        const contrib = contributions[ingredient.name];
        html += "<tr>";
        html += `<td class="ing-name">${ingredient.name}</td>`;
        html += `<td class="ing-amount">${ingredient.amount.toFixed(1)}g</td>`;
        const cal = contrib.nutrients.calories || { value: 0, percent: 0 };
        html += `<td>${cal.value.toFixed(0)} (${cal.percent.toFixed(0)}%)</td>`;
        const sodium = contrib.nutrients.sodium || { value: 0, percent: 0 };
        html += `<td>${sodium.value.toFixed(1)}mg (${sodium.percent.toFixed(0)}%)</td>`;
        const ox = contrib.nutrients.oxalates || { value: 0, percent: 0 };
        html += `<td>${ox.value.toFixed(2)}mg (${ox.percent.toFixed(0)}%)</td>`;
        html += "</tr>";
      });
      html += '<tr class="totals-row">';
      html += '<td colspan="2"><strong>Total:</strong></td>';
      let totalCalories = Math.round(data.totals.calories || 0);
      const calReq = parseFloat(dailyRequirements["calories"]?.recommended);
      if (!isNaN(calReq)) {
        totalCalories = `${totalCalories} (${Math.round(totalCalories / calReq * 100)}%)`;
      }
      let totalSodium = Math.round(data.totals.sodium || 0);
      const sodReq = parseFloat(dailyRequirements["sodium"]?.recommended);
      totalSodium = isNaN(sodReq) ? `${totalSodium} mg` : `${totalSodium} (${Math.round(totalSodium / sodReq * 100)}%)`;
      const oxMax = parseFloat(dailyRequirements["oxalates"]?.maximum);
      let totalOxalates = Math.round(data.oxalateMg || 0);
      totalOxalates = isNaN(oxMax) ? `${totalOxalates} mg` : `${totalOxalates} mg (${Math.round(totalOxalates / oxMax * 100)}%)`;
      html += `<td><strong>${totalCalories}</strong></td>`;
      html += `<td><strong>${totalSodium}</strong></td>`;
      html += `<td><strong>${totalOxalates}</strong></td>`;
      html += "</tr>";
      html += "</tbody></table>";
      return html;
    }
    /**
     * Render all nutrients table with pagination
     */
    static renderAllNutrientsTable(contributions, data, options) {
      const { currentNutrientPage, NUTRIENTS_PER_PAGE, dailyRequirements, userSettings } = options;
      const allNutrients = /* @__PURE__ */ new Set();
      Object.values(contributions).forEach((contrib) => {
        Object.keys(contrib.nutrients).forEach((nutrient) => {
          allNutrients.add(nutrient);
        });
      });
      const activeNutrients = Array.from(allNutrients).filter((nutrient) => {
        return Object.values(contributions).some((contrib) => {
          const val = contrib.nutrients[nutrient];
          return val && val.value > 0;
        });
      });
      const startIdx = currentNutrientPage * NUTRIENTS_PER_PAGE;
      const endIdx = Math.min(startIdx + NUTRIENTS_PER_PAGE, activeNutrients.length);
      const pageNutrients = activeNutrients.slice(startIdx, endIdx);
      const totalPages = Math.ceil(activeNutrients.length / NUTRIENTS_PER_PAGE);
      let html = "";
      if (totalPages > 1) {
        html += '<div class="pagination-controls">';
        html += `<button class="btn btn-secondary btn-small" data-action="prev-nutrient-page" ${currentNutrientPage === 0 ? "disabled" : ""}>\u2190 Prev</button>`;
        html += `<span class="page-info">Page ${currentNutrientPage + 1} of ${totalPages}</span>`;
        html += `<button class="btn btn-secondary btn-small" data-action="next-nutrient-page" ${currentNutrientPage >= totalPages - 1 ? "disabled" : ""}>Next \u2192</button>`;
        html += "</div>";
      }
      html += '<div class="table-scroll">';
      html += '<table class="contribution-table">';
      html += "<thead><tr>";
      html += "<th>Ingredient</th>";
      html += "<th>Amount</th>";
      pageNutrients.forEach((nutrient) => {
        html += `<th>${nutrient.replace(/_/g, " ")}</th>`;
      });
      html += "</tr></thead>";
      html += "<tbody>";
      data.ingredients.forEach((ingredient) => {
        const contrib = contributions[ingredient.name];
        html += "<tr>";
        html += `<td class="ing-name">${ingredient.name}</td>`;
        html += `<td class="ing-amount">${ingredient.amount.toFixed(1)}g</td>`;
        pageNutrients.forEach((nutrient) => {
          const n = contrib.nutrients[nutrient] || { value: 0, percent: 0 };
          if (nutrient === "calories") {
            html += `<td>${n.value.toFixed(0)} (${n.percent.toFixed(0)}%)</td>`;
          } else {
            html += `<td>${n.value.toFixed(1)} (${n.percent.toFixed(0)}%)</td>`;
          }
        });
        html += "</tr>";
      });
      html += '<tr class="totals-row">';
      html += '<td colspan="2"><strong>Total:</strong></td>';
      pageNutrients.forEach((nutrient) => {
        const total = data.totals[nutrient] || 0;
        let formattedValue = "";
        let percentDaily = "";
        if (nutrient === "calories") {
          formattedValue = total.toFixed(0);
          const userSettings2 = State.get("userSettings");
          const percent = (total / userSettings2.caloriesPerDay * 100).toFixed(1);
          percentDaily = ` (${percent}%)`;
        } else if (dailyRequirements[nutrient]) {
          const req = dailyRequirements[nutrient];
          let dailyValue = null;
          if (req.recommended) {
            dailyValue = parseFloat(req.recommended);
          } else if (req.maximum) {
            dailyValue = parseFloat(req.maximum);
          }
          formattedValue = total.toFixed(1);
          if (dailyValue) {
            const percent = (total / dailyValue * 100).toFixed(1);
            percentDaily = ` (${percent}%)`;
          }
        } else {
          formattedValue = total.toFixed(1);
        }
        html += `<td><strong>${formattedValue}${percentDaily}</strong></td>`;
      });
      html += "</tr>";
      html += "</tbody></table>";
      html += "</div>";
      return html;
    }
    /**
     * Show error message in recipe details
     */
    static showError(message) {
      const content = document.getElementById("recipeDetailsContent");
      if (content) {
        content.innerHTML = `<div class="error-message">${message}</div>`;
        const section = document.getElementById("recipeDetailsSection");
        if (section) section.style.display = "block";
      }
    }
  };

  // public/js/renderers/IngredientRenderer.js
  var IngredientRenderer = class {
    /**
     * Render ingredient list
     */
    static renderList(ingredients, onSelect) {
      const listElement = document.getElementById("ingredientList");
      if (!listElement) return;
      listElement.innerHTML = "";
      if (ingredients.length === 0) {
        listElement.innerHTML = '<li class="no-results">No ingredients found</li>';
        return;
      }
      ingredients.forEach((ingredient) => {
        const li = document.createElement("li");
        li.className = "ingredient-item";
        li.dataset.ingredientId = ingredient.id;
        li.dataset.action = "select-ingredient";
        li.innerHTML = `
        <span class="ingredient-name">${ingredient.name}</span>
        <span class="ingredient-compact">${ingredient.compact.display}</span>
      `;
        listElement.appendChild(li);
      });
      listElement.addEventListener("click", (e) => {
        const item = e.target.closest('[data-action="select-ingredient"]');
        if (item && onSelect) {
          onSelect(item.dataset.ingredientId);
        }
      });
    }
    /**
     * Mark ingredient as selected
     */
    static markAsSelected(ingredientId, ingredients) {
      document.querySelectorAll(".ingredient-item").forEach((item) => {
        item.classList.remove("selected");
      });
      document.querySelectorAll(".ingredient-compact").forEach((item) => {
        item.classList.remove("selected");
      });
      const index = ingredients.findIndex((i) => i.id == ingredientId);
      const selectedItem = document.querySelector(`.ingredient-item:nth-child(${index + 1})`);
      if (selectedItem) {
        selectedItem.classList.add("selected");
        const compactItem = selectedItem.querySelector(".ingredient-compact");
        if (compactItem) {
          compactItem.classList.add("selected");
        }
      }
    }
    /**
     * Render ingredient details
     */
    static renderDetails(data) {
      const section = document.getElementById("ingredientDetailsSection");
      const title = document.getElementById("ingredientDetailsTitle");
      const content = document.getElementById("ingredientDetailsContent");
      if (!section || !title || !content) return;
      title.textContent = data.name;
      let html = '<div class="details-content">';
      html += '<div class="details-section">';
      html += `<p><strong>Serving Size:</strong> ${data.serving} (${data.gramsPerServing.toFixed(1)}g)</p>`;
      if (data.density) {
        html += `<p><strong>Density:</strong> ${data.density} g/ml</p>`;
      }
      html += "</div>";
      html += '<div class="details-section">';
      html += "<h3>Nutritional Information (per serving)</h3>";
      html += '<table class="nutrition-table">';
      for (const [key, value] of Object.entries(data.data)) {
        if (value === null || value === void 0) continue;
        let displayValue = value;
        if (key === "calories") {
          displayValue = value;
        } else if (typeof value === "string") {
          displayValue = value;
        } else {
          displayValue = `${value} mg`;
        }
        html += `<tr><td class="nutrient-name">${key.replace(/_/g, " ")}</td><td class="nutrient-value">${displayValue}</td></tr>`;
      }
      html += `<tr><td class="nutrient-name">oxalate (per gram)</td><td class="nutrient-value">${data.oxalatePerGram.toFixed(3)} mg/g</td></tr>`;
      html += `<tr><td class="nutrient-name">oxalate (per serving)</td><td class="nutrient-value">${data.oxalatePerServing.toFixed(2)} mg</td></tr>`;
      html += "</table>";
      html += "</div>";
      html += "</div>";
      content.innerHTML = html;
      section.style.display = "block";
    }
  };

  // public/js/renderers/FormRenderer.js
  var FormRenderer = class {
    /**
     * Render selected ingredients for recipe editor
     */
    static renderSelectedIngredients(ingredients, onUpdate) {
      const container = document.getElementById("ingredientRows");
      if (!container) return;
      if (ingredients.length === 0) {
        container.innerHTML = '<div class="no-ingredients-message">No ingredients added yet</div>';
        return;
      }
      container.innerHTML = "";
      ingredients.forEach((ingredient, index) => {
        const row = document.createElement("div");
        row.className = "ingredient-row";
        row.dataset.index = index;
        const amountInput = document.createElement("input");
        amountInput.type = "number";
        amountInput.className = "amount-input";
        amountInput.value = ingredient.amount;
        amountInput.min = "0.01";
        amountInput.step = "0.01";
        amountInput.dataset.index = index;
        const unitSelect = document.createElement("select");
        unitSelect.className = "unit-select";
        unitSelect.dataset.index = index;
        unitSelect.innerHTML = `
        <option value="g" ${ingredient.unit === "g" ? "selected" : ""}>g</option>
        <option value="ml" ${ingredient.unit === "ml" ? "selected" : ""}>ml</option>
        <option value="mg" ${ingredient.unit === "mg" ? "selected" : ""}>mg</option>
        <option value="mcg" ${ingredient.unit === "mcg" ? "selected" : ""}>mcg</option>
      `;
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "remove-btn";
        removeBtn.dataset.action = "remove-ingredient";
        removeBtn.dataset.index = index;
        removeBtn.title = "Remove ingredient";
        removeBtn.innerHTML = "&times;";
        const nameSpan = document.createElement("span");
        nameSpan.className = "ingredient-name";
        nameSpan.title = ingredient.name;
        nameSpan.textContent = ingredient.name;
        row.appendChild(nameSpan);
        row.appendChild(amountInput);
        row.appendChild(unitSelect);
        row.appendChild(removeBtn);
        if (onUpdate) {
          amountInput.addEventListener("change", () => {
            onUpdate.amount(index, amountInput.value);
          });
          unitSelect.addEventListener("change", () => {
            onUpdate.unit(index, unitSelect.value);
          });
        }
        container.appendChild(row);
      });
    }
    /**
     * Render ingredient search results
     */
    static renderSearchResults(results, selectedIngredients, onAdd) {
      const resultsContainer = document.getElementById("ingredientSearchResults");
      if (!resultsContainer) return;
      if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="search-result-item">No ingredients found</div>';
        resultsContainer.classList.add("show");
        return;
      }
      resultsContainer.innerHTML = "";
      results.forEach((ingredient) => {
        const alreadyAdded = selectedIngredients.some((ing) => ing.brandId === ingredient.id);
        const item = document.createElement("div");
        item.className = "search-result-item";
        if (alreadyAdded) item.classList.add("selected");
        item.textContent = ingredient.name;
        item.dataset.ingredientId = ingredient.id;
        item.dataset.ingredientName = ingredient.name;
        if (!alreadyAdded) {
          item.style.cursor = "pointer";
          item.dataset.action = "add-ingredient-to-recipe";
        } else {
          item.style.opacity = "0.5";
          item.style.cursor = "not-allowed";
          item.title = "Already added";
        }
        resultsContainer.appendChild(item);
      });
      resultsContainer.addEventListener("click", (e) => {
        const item = e.target.closest('[data-action="add-ingredient-to-recipe"]');
        if (item && onAdd) {
          onAdd({
            id: item.dataset.ingredientId,
            name: item.dataset.ingredientName
          });
        }
      });
      resultsContainer.classList.add("show");
    }
    /**
     * Hide ingredient search results
     */
    static hideSearchResults() {
      const resultsContainer = document.getElementById("ingredientSearchResults");
      if (resultsContainer) {
        resultsContainer.classList.remove("show");
      }
    }
    /**
     * Show error message
     */
    static showError(elementId, message) {
      const errorEl = document.getElementById(elementId);
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add("show");
      }
    }
    /**
     * Clear all error messages
     */
    static clearErrors() {
      document.querySelectorAll(".error-text").forEach((el) => {
        el.textContent = "";
        el.classList.remove("show");
      });
    }
    /**
     * Open recipe editor panel
     */
    static openRecipeEditor() {
      const panel = document.getElementById("recipeEditPanel");
      if (panel) {
        panel.classList.add("active");
      }
    }
    /**
     * Close recipe editor panel
     */
    static closeRecipeEditor() {
      const panel = document.getElementById("recipeEditPanel");
      if (panel) {
        panel.classList.remove("active");
      }
    }
    /**
     * Open ingredient editor panel
     */
    static openIngredientEditor() {
      const panel = document.getElementById("ingredientEditPanel");
      if (panel) {
        panel.classList.add("active");
      }
    }
    /**
     * Close ingredient editor panel
     */
    static closeIngredientEditor() {
      const panel = document.getElementById("ingredientEditPanel");
      if (panel) {
        panel.classList.remove("active");
      }
    }
    /**
     * Set recipe editor title
     */
    static setRecipeEditorTitle(title) {
      const titleEl = document.getElementById("editPanelTitle");
      if (titleEl) {
        titleEl.textContent = title;
      }
    }
    /**
     * Set ingredient editor title
     */
    static setIngredientEditorTitle(title) {
      const titleEl = document.getElementById("ingredientEditPanelTitle");
      if (titleEl) {
        titleEl.textContent = title;
      }
    }
    /**
     * Clear recipe form
     */
    static clearRecipeForm() {
      const nameInput = document.getElementById("recipeNameInput");
      const searchBox = document.getElementById("ingredientSearchBox");
      if (nameInput) nameInput.value = "";
      if (searchBox) searchBox.value = "";
    }
    /**
     * Clear ingredient form
     */
    static clearIngredientForm() {
      const fieldIds = [
        "ingredientNameInput",
        "servingSizeInput",
        "densityInput",
        "oxalateInput",
        "caloriesInput",
        "sodiumInput",
        "cholesterolInput",
        "sugarsInput",
        "proteinInput",
        "dietaryFiberInput",
        "carbohydratesInput",
        "calciumInput",
        "potassiumInput",
        "magnesiumInput",
        "seleniumInput",
        "manganeseInput",
        "zincInput",
        "ironInput",
        "fatInput",
        "saturatedFatInput",
        "polysaturatedFatInput",
        "monosaturatedFatInput",
        "thiaminInput",
        "riboflavinInput",
        "niacinInput",
        "folicAcidInput",
        "phosphorusInput",
        "vitaminAInput",
        "vitaminB6Input",
        "vitaminCInput",
        "vitaminDInput",
        "vitaminEInput",
        "vitaminKInput"
      ];
      fieldIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });
      const servingUnitSelect = document.getElementById("servingUnitSelect");
      if (servingUnitSelect) servingUnitSelect.value = "g";
    }
    /**
     * Populate ingredient form with data
     */
    static populateIngredientForm(ingredient) {
      document.getElementById("ingredientNameInput").value = ingredient.name;
      document.getElementById("servingSizeInput").value = ingredient.serving;
      document.getElementById("servingUnitSelect").value = ingredient.servingUnit;
      document.getElementById("densityInput").value = ingredient.density || "";
      document.getElementById("oxalateInput").value = ingredient.oxalatePerGram || "";
      const fieldMapping = {
        caloriesInput: "calories",
        sodiumInput: "sodium",
        cholesterolInput: "cholesterol",
        sugarsInput: "sugars",
        proteinInput: "protein",
        dietaryFiberInput: "dietary_fiber",
        carbohydratesInput: "carbohydrates",
        calciumInput: "calcium",
        potassiumInput: "potassium",
        magnesiumInput: "magnesium",
        seleniumInput: "selenium",
        manganeseInput: "manganese",
        zincInput: "zinc",
        ironInput: "iron",
        fatInput: "fat",
        saturatedFatInput: "saturated_fat",
        polysaturatedFatInput: "polysaturated_fat",
        monosaturatedFatInput: "monosaturated_fat",
        thiaminInput: "thiamin",
        riboflavinInput: "riboflavin",
        niacinInput: "niacin",
        folicAcidInput: "folic_acid",
        phosphorusInput: "phosphorus",
        vitaminAInput: "vitamin_a",
        vitaminB6Input: "vitamin_b6",
        vitaminCInput: "vitamin_c",
        vitaminDInput: "vitamin_d",
        vitaminEInput: "vitamin_e",
        vitaminKInput: "vitamin_k"
      };
      for (const [inputId, dataKey] of Object.entries(fieldMapping)) {
        const el = document.getElementById(inputId);
        if (el) {
          el.value = ingredient.data[dataKey] || "";
        }
      }
    }
    /**
     * Open daily plan editor panel
     */
    static openDailyPlanEditor() {
      const panel = document.getElementById("dailyPlanEditPanel");
      if (panel) {
        panel.classList.add("active");
      }
    }
    /**
     * Close daily plan editor panel
     */
    static closeDailyPlanEditor() {
      const panel = document.getElementById("dailyPlanEditPanel");
      if (panel) {
        panel.classList.remove("active");
      }
    }
    /**
     * Set daily plan editor title
     */
    static setDailyPlanEditorTitle(title) {
      const titleEl = document.getElementById("dailyPlanEditPanelTitle");
      if (titleEl) {
        titleEl.textContent = title;
      }
    }
    /**
     * Clear daily plan form
     */
    static clearDailyPlanForm() {
      const nameInput = document.getElementById("dailyPlanNameInput");
      const searchBox = document.getElementById("menuSearchBoxForDailyPlan");
      if (nameInput) nameInput.value = "";
      if (searchBox) searchBox.value = "";
    }
    /**
     * Open menu editor panel
     */
    static openMenuEditor() {
      const panel = document.getElementById("menuEditPanel");
      if (panel) {
        panel.classList.add("active");
      }
    }
    /**
     * Close menu editor panel
     */
    static closeMenuEditor() {
      const panel = document.getElementById("menuEditPanel");
      if (panel) {
        panel.classList.remove("active");
      }
    }
    /**
     * Set menu editor title
     */
    static setMenuEditorTitle(title) {
      const titleEl = document.getElementById("menuEditPanelTitle");
      if (titleEl) {
        titleEl.textContent = title;
      }
    }
    /**
     * Clear menu form
     */
    static clearMenuForm() {
      const nameInput = document.getElementById("menuNameInput");
      const searchBox = document.getElementById("recipeSearchBox");
      if (nameInput) nameInput.value = "";
      if (searchBox) searchBox.value = "";
    }
  };

  // public/js/utils/Validation.js
  function validateRecipe(recipeName, ingredients) {
    const errors = [];
    if (!recipeName || recipeName.trim().length === 0) {
      errors.push({ field: "recipeNameError", message: "Recipe name is required" });
    }
    if (!ingredients || ingredients.length === 0) {
      errors.push({ field: "ingredientsError", message: "At least one ingredient is required" });
    }
    if (ingredients) {
      for (const ing of ingredients) {
        if (!ing.amount || ing.amount <= 0) {
          errors.push({ field: "ingredientsError", message: "All ingredients must have valid amounts" });
          break;
        }
      }
    }
    return {
      valid: errors.length === 0,
      errors
    };
  }
  function validateIngredient(name, serving) {
    const errors = [];
    if (!name || name.trim().length === 0) {
      errors.push({ field: "ingredientNameError", message: "Ingredient name is required" });
    }
    if (!serving || serving <= 0) {
      errors.push({ field: "ingredientNameError", message: "Valid serving size is required" });
    }
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // public/js/utils/dom.js
  function setButtonsDisabled(buttonIds, disabled) {
    buttonIds.forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.disabled = disabled;
      }
    });
  }
  function closeDropdown(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
      dropdown.classList.remove("show");
    }
  }
  function toggleMobileMenu() {
    const mobileMenu = document.getElementById("mobileMenu");
    if (mobileMenu) {
      mobileMenu.classList.toggle("show");
    }
  }
  function closeMobileMenu() {
    const mobileMenu = document.getElementById("mobileMenu");
    if (mobileMenu) {
      mobileMenu.classList.remove("show");
    }
  }
  function setupEventDelegation(container, actions) {
    if (!container) return;
    container.addEventListener("click", (e) => {
      const target = e.target.closest("[data-action]");
      if (!target) return;
      const action = target.dataset.action;
      const handler = actions[action];
      if (handler) {
        handler(target, e);
      }
    });
    container.addEventListener("change", (e) => {
      const target = e.target.closest("[data-action]");
      if (!target) return;
      const action = target.dataset.action;
      const handler = actions[action];
      if (handler) {
        handler(target, e);
      }
    });
  }
  function hideElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.display = "none";
    }
  }

  // public/js/client.js
  var Client = class _Client {
    // Maps ingredient name to its properties
    static INGREDIENT_PROPS = {
      oxalates: { unit: "mg" },
      calories: { unit: "none" },
      sodium: { unit: "mg" },
      cholesterol: { unit: "mg" },
      sugars: { unit: "g" },
      protein: { unit: "g" },
      dietary_fiber: { unit: "g" },
      carbohydrates: { unit: "g" },
      calcium: { unit: "mg" },
      potassium: { unit: "mg" },
      magnesium: { unit: "mg" },
      selenium: { unit: "mcg" },
      manganese: { unit: "mg" },
      zinc: { unit: "mg" },
      iron: { unit: "mg" },
      fat: { unit: "g" },
      saturated_fat: { unit: "g" },
      polysaturated_fat: { unit: "g" },
      monosaturated_fat: { unit: "g" },
      thiamin: { unit: "mg" },
      riboflavin: { unit: "mg" },
      niacin: { unit: "mg" },
      folic_acid: { unit: "mcg" },
      phosphorus: { unit: "mg" },
      vitamin_a: { unit: "mcg" },
      vitamin_b6: { unit: "mg" },
      vitamin_c: { unit: "mg" },
      vitamin_d: { unit: "mcg" },
      vitamin_e: { unit: "mg" },
      vitamin_k: { unit: "mcg" }
    };
    constructor() {
      this.dailyPlanManager = new DailyPlanManager();
      this.menuManager = new MenuManager();
      this.recipeManager = new RecipeManager();
      this.ingredientManager = new IngredientManager();
      this.settingsManager = new SettingsManager();
      this.menus = [];
      this.selectedMenuId = null;
      this.recipes = [];
      this.ingredients = [];
      this.selectedRecipeId = null;
      this.selectedIngredientId = null;
      this.config = {};
      this.kidneyStoneRiskData = {};
      this.dailyRequirements = {};
      this.userSettings = {
        caloriesPerDay: 2e3,
        age: null,
        useAge: false,
        kidneyStoneRisk: "Normal"
      };
      this.dailyPlans = [];
      this.selectedDailyPlanId = null;
      this.editingDailyPlanId = null;
      this.selectedMenusForDailyPlan = [];
      this.menuSearchTimeout = null;
      this.showAllDailyNutrients = false;
      this.currentDailyNutrientPage = 0;
      this.editingMenuId = null;
      this.selectedRecipesForMenu = [];
      this.recipeSearchTimeout = null;
      this.editingRecipeId = null;
      this.selectedIngredientsForRecipe = [];
      this.ingredientSearchTimeout = null;
      this.editingIngredientId = null;
      this.showAllNutrients = false;
      this.currentNutrientPage = 0;
      this.NUTRIENTS_PER_PAGE = 5;
      this.setupStateSync();
    }
    // Sync legacy properties with State
    setupStateSync() {
      State.subscribe("dailyPlans", (newValue) => {
        this.dailyPlans = newValue;
        this.updateHomeCounts();
      });
      State.subscribe("selectedDailyPlanId", (newValue) => {
        this.selectedDailyPlanId = newValue;
      });
      State.subscribe("editingDailyPlanId", (newValue) => {
        this.editingDailyPlanId = newValue;
      });
      State.subscribe("selectedMenusForDailyPlan", (newValue) => {
        this.selectedMenusForDailyPlan = newValue;
        DailyPlanRenderer.renderSelectedMenus(
          newValue,
          (index) => this.dailyPlanManager.removeMenuFromDailyPlan(index),
          (index, type) => this.dailyPlanManager.updateMenuType(index, type)
        );
      });
      State.subscribe("showAllDailyNutrients", (newValue) => {
        this.showAllDailyNutrients = newValue;
      });
      State.subscribe("currentDailyNutrientPage", (newValue) => {
        this.currentDailyNutrientPage = newValue;
      });
      State.subscribe("menus", (newValue) => {
        this.menus = newValue;
        this.updateHomeCounts();
      });
      State.subscribe("selectedMenuId", (newValue) => {
        this.selectedMenuId = newValue;
      });
      State.subscribe("editingMenuId", (newValue) => {
        this.editingMenuId = newValue;
      });
      State.subscribe("selectedRecipesForMenu", (newValue) => {
        this.selectedRecipesForMenu = newValue;
        MenuRenderer.renderSelectedRecipes(newValue, (index) => {
          this.menuManager.removeRecipeFromMenu(index);
        });
      });
      State.subscribe("recipes", (newValue) => {
        this.recipes = newValue;
        this.updateHomeCounts();
      });
      State.subscribe("ingredients", (newValue) => {
        this.ingredients = newValue;
        this.updateHomeCounts();
      });
      State.subscribe("selectedRecipeId", (newValue) => {
        this.selectedRecipeId = newValue;
      });
      State.subscribe("selectedIngredientId", (newValue) => {
        this.selectedIngredientId = newValue;
      });
      State.subscribe("config", (newValue) => {
        this.config = newValue;
      });
      State.subscribe("kidneyStoneRiskData", (newValue) => {
        this.kidneyStoneRiskData = newValue;
      });
      State.subscribe("dailyRequirements", (newValue) => {
        this.dailyRequirements = newValue;
      });
      State.subscribe("userSettings", (newValue) => {
        this.userSettings = newValue;
      });
      State.subscribe("editingRecipeId", (newValue) => {
        this.editingRecipeId = newValue;
      });
      State.subscribe("selectedIngredientsForRecipe", (newValue) => {
        this.selectedIngredientsForRecipe = newValue;
        FormRenderer.renderSelectedIngredients(newValue, {
          amount: (index, value) => this.recipeManager.updateIngredientAmount(index, value),
          unit: (index, value) => this.recipeManager.updateIngredientUnit(index, value)
        });
      });
      State.subscribe("editingIngredientId", (newValue) => {
        this.editingIngredientId = newValue;
      });
      State.subscribe("showAllNutrients", (newValue) => {
        this.showAllNutrients = newValue;
      });
      State.subscribe("currentNutrientPage", (newValue) => {
        this.currentNutrientPage = newValue;
      });
    }
    // Initialize app
    // Replace your init() method with this version:
    async init() {
      console.log("\u{1F7E2} Client init started");
      try {
        this.settingsManager.loadUserSettings();
        await this.settingsManager.loadConfig();
        await this.settingsManager.loadKidneyStoneRiskData();
        await this.settingsManager.loadDailyRequirements();
        await this.recipeManager.loadRecipes();
        await this.ingredientManager.loadIngredients();
        await this.menuManager.loadMenus();
        try {
          await this.dailyPlanManager.loadDailyPlans();
        } catch (error) {
          console.warn("\u26A0\uFE0F Daily plans not available yet:", error.message);
          State.set("dailyPlans", []);
        }
        this.settingsManager.applyUIConfig();
        this.setupEventListeners();
        this.setupEventDelegation();
        this.updateHomeCounts();
        const page = window.location.hash.slice(1) || "home";
        this.navigateTo(page, false);
        console.log("\u2705 Client init completed successfully");
      } catch (error) {
        console.error("\u274C Client init failed:", error);
        console.error("Stack trace:", error.stack);
        try {
          this.setupEventListeners();
          this.setupEventDelegation();
          this.navigateTo("home", false);
          console.log("\u26A0\uFE0F App running in degraded mode");
        } catch (e) {
          console.error("\u274C Cannot recover from init failure");
        }
      }
    }
    // Update home page counts
    updateHomeCounts() {
      const recipeCountEl = document.getElementById("recipeCount");
      const ingredientCountEl = document.getElementById("ingredientCount");
      const menuCountEl = document.getElementById("menuCount");
      const dailyPlanCountEl = document.getElementById("dailyPlanCount");
      if (menuCountEl) menuCountEl.textContent = this.menus.length;
      if (recipeCountEl) recipeCountEl.textContent = this.recipes.length;
      if (ingredientCountEl) ingredientCountEl.textContent = this.ingredients.length;
      if (dailyPlanCountEl) dailyPlanCountEl.textContent = this.dailyPlans.length;
    }
    // Navigation
    // Replace your navigateTo method with this version:
    navigateTo(page, pushState = true) {
      closeDropdown("accountDropdown");
      closeMobileMenu();
      window.scrollTo(0, 0);
      document.querySelectorAll(".page").forEach((p) => {
        p.classList.remove("active");
      });
      const pageElement = document.getElementById(`${page}Page`);
      if (pageElement) {
        pageElement.classList.add("active");
        const accountBtn = document.querySelector('[data-action="toggle-account-dropdown"]');
        if (accountBtn) {
          accountBtn.setAttribute("aria-expanded", "false");
        }
        const mobileBtn = document.querySelector('[data-action="toggle-mobile-menu"]');
        if (mobileBtn) {
          mobileBtn.setAttribute("aria-expanded", "false");
        }
        if (pushState) {
          history.pushState({ page }, "", `#${page}`);
        }
        if (page === "settings") {
          this.loadSettingsForm();
        } else if (page === "ingredients") {
          this.renderIngredientList(this.ingredients);
        } else if (page === "recipes") {
          this.renderRecipeList(this.recipes);
        } else if (page === "menus") {
          this.renderMenuList(this.menus);
        } else if (page === "dailyPlans") {
          this.renderDailyPlanList(this.dailyPlans);
        }
      } else {
        console.warn(`Page not found: ${page}Page`);
        const homePage = document.getElementById("homePage");
        if (homePage) {
          homePage.classList.add("active");
          if (pushState) {
            history.pushState({ page: "home" }, "", "#home");
          }
        }
      }
    }
    // Account dropdown
    toggleAccountDropdown() {
      const btn = document.querySelector('[data-action="toggle-account-dropdown"]');
      const dropdown = document.getElementById("accountDropdown");
      if (dropdown && btn) {
        const isExpanded = dropdown.classList.toggle("show");
        btn.setAttribute("aria-expanded", isExpanded ? "true" : "false");
      }
    }
    closeAccountDropdown() {
      closeDropdown("accountDropdown");
    }
    // Mobile menu
    toggleMobileMenu() {
      toggleMobileMenu();
    }
    closeMobileMenu() {
      closeMobileMenu();
    }
    // Setup event listeners (non-delegated)
    setupEventListeners() {
      window.addEventListener("popstate", (event) => {
        const page = event.state?.page || "home";
        this.navigateTo(page, false);
      });
      const dailyPlanSearchInput = document.getElementById("dailyPlanSearchInput");
      if (dailyPlanSearchInput) {
        dailyPlanSearchInput.addEventListener("input", (e) => {
          this.filterDailyPlans(e.target.value);
        });
      }
      const dailyPlanEditForm = document.getElementById("dailyPlanEditForm");
      if (dailyPlanEditForm) {
        dailyPlanEditForm.addEventListener("submit", (e) => this.saveDailyPlan(e));
      }
      const menuSearchBoxForDailyPlan = document.getElementById("menuSearchBoxForDailyPlan");
      if (menuSearchBoxForDailyPlan) {
        menuSearchBoxForDailyPlan.addEventListener("input", (e) => {
          this.handleMenuSearchForDailyPlan(e.target.value);
        });
      }
      document.addEventListener("click", (e) => {
        const actionElement = e.target.closest("[data-action]");
        if (actionElement) {
          e.preventDefault();
          this.handleAction(actionElement);
        }
        if (!e.target.closest(".account-dropdown")) {
          this.closeAccountDropdown();
        }
        if (!e.target.closest(".ingredient-search")) {
          FormRenderer.hideSearchResults();
        }
      });
      document.addEventListener("keydown", (e) => {
        const actionElement = e.target.closest("[data-action]");
        if (actionElement && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          this.handleAction(actionElement);
        }
        if (e.key === "Escape") {
          const recipePanel = document.getElementById("recipeEditPanel");
          const ingredientPanel = document.getElementById("ingredientEditPanel");
          if (recipePanel && recipePanel.classList.contains("active")) {
            this.closeRecipeEditor();
          } else if (ingredientPanel && ingredientPanel.classList.contains("active")) {
            this.closeIngredientEditor();
          }
        }
      });
      const searchInput = document.getElementById("searchInput");
      if (searchInput) {
        searchInput.addEventListener("input", (e) => {
          this.filterRecipes(e.target.value);
        });
      }
      const summaryCheckbox = document.getElementById("summaryCheckbox");
      if (summaryCheckbox) {
        summaryCheckbox.addEventListener("change", () => {
          if (this.selectedRecipeId) {
            this.showRecipeDetails(this.selectedRecipeId);
          }
        });
      }
      const settingsForm = document.getElementById("settingsForm");
      if (settingsForm) {
        settingsForm.addEventListener("submit", (e) => this.applySettings(e));
      }
      const recipeEditForm = document.getElementById("recipeEditForm");
      if (recipeEditForm) {
        recipeEditForm.addEventListener("submit", (e) => this.saveRecipe(e));
      }
      const ingredientEditForm = document.getElementById("ingredientEditForm");
      if (ingredientEditForm) {
        ingredientEditForm.addEventListener("submit", (e) => this.saveIngredient(e));
      }
      const useAgeCheckbox = document.getElementById("useAgeCheckbox");
      if (useAgeCheckbox) {
        useAgeCheckbox.addEventListener("change", (e) => {
          document.getElementById("ageInput").disabled = !e.target.checked;
        });
      }
      const kidneyRiskSelect = document.getElementById("kidneyRiskSelect");
      if (kidneyRiskSelect) {
        kidneyRiskSelect.addEventListener("change", () => this.updateKidneyRiskInfo());
      }
      const ingredientSearchInput = document.getElementById("ingredientSearchInput");
      if (ingredientSearchInput) {
        ingredientSearchInput.addEventListener("input", (e) => {
          this.filterIngredients(e.target.value);
        });
      }
      const ingredientSearchBox = document.getElementById("ingredientSearchBox");
      if (ingredientSearchBox) {
        ingredientSearchBox.addEventListener("input", (e) => {
          this.handleIngredientSearch(e.target.value);
        });
      }
      const menuSearchInput = document.getElementById("menuSearchInput");
      if (menuSearchInput) {
        menuSearchInput.addEventListener("input", (e) => {
          this.filterMenus(e.target.value);
        });
      }
      const menuEditForm = document.getElementById("menuEditForm");
      if (menuEditForm) {
        menuEditForm.addEventListener("submit", (e) => this.saveMenu(e));
      }
      const recipeSearchBox = document.getElementById("recipeSearchBox");
      if (recipeSearchBox) {
        recipeSearchBox.addEventListener("input", (e) => {
          this.handleRecipeSearch(e.target.value);
        });
      }
    }
    // Handle data-action clicks
    async handleAction(element) {
      const action = element.dataset.action;
      const page = element.dataset.page;
      const recipeId = element.dataset.recipeId;
      const ingredientId = element.dataset.ingredientId;
      const menuId = element.dataset.menuId;
      switch (action) {
        case "navigate":
          if (page) this.navigateTo(page);
          break;
        case "toggle-account-dropdown":
          this.toggleAccountDropdown();
          break;
        case "toggle-mobile-menu":
          this.toggleMobileMenu();
          break;
        case "toggle-nutrient-view":
          this.toggleNutrientView();
          break;
        case "prev-nutrient-page":
          this.prevNutrientPage();
          break;
        case "next-nutrient-page":
          this.nextNutrientPage();
          break;
        case "select-recipe":
          if (recipeId) {
            this.selectRecipe(recipeId);
            await this.showRecipeDetails(recipeId);
          }
          break;
        case "select-ingredient":
          if (ingredientId) {
            this.selectIngredient(ingredientId);
            await this.showIngredientDetails(ingredientId);
          }
          break;
        case "select-menu":
          if (menuId) {
            this.selectMenu(menuId);
            await this.showMenuDetails(menuId);
          }
          break;
        case "create-recipe":
          this.createRecipe();
          break;
        case "edit-recipe":
          this.editRecipe();
          break;
        case "delete-recipe":
          this.deleteRecipe();
          break;
        case "close-recipe-editor":
          this.closeRecipeEditor();
          break;
        case "create-ingredient":
          this.createIngredient();
          break;
        case "edit-ingredient":
          this.editIngredient();
          break;
        case "delete-ingredient":
          this.deleteIngredient();
          break;
        case "close-ingredient-editor":
          this.closeIngredientEditor();
          break;
        case "cancel-settings":
          this.cancelSettings();
          break;
        case "create-menu":
          this.createMenu();
          break;
        case "edit-menu":
          this.editMenu();
          break;
        case "delete-menu":
          this.deleteMenu();
          break;
        case "close-menu-editor":
          this.closeMenuEditor();
          break;
        case "select-daily-plan":
          if (dailyPlanId) {
            this.selectDailyPlan(dailyPlanId);
            await this.showDailyPlanDetails(dailyPlanId);
          }
          break;
        case "create-daily-plan":
          this.createDailyPlan();
          break;
        case "edit-daily-plan":
          this.editDailyPlan();
          break;
        case "delete-daily-plan":
          this.deleteDailyPlan();
          break;
        case "close-daily-plan-editor":
          this.closeDailyPlanEditor();
          break;
        default:
          console.warn("Unknown action:", action);
      }
    }
    // Setup event delegation for dynamically created content
    setupEventDelegation() {
      const menuRowsForDailyPlan = document.getElementById("menuRowsForDailyPlan");
      if (menuRowsForDailyPlan) {
        setupEventDelegation(menuRowsForDailyPlan, {
          "remove-menu-from-daily-plan": (target) => {
            const index = parseInt(target.dataset.index);
            this.dailyPlanManager.removeMenuFromDailyPlan(index);
          }
        });
      }
      const recipeRows = document.getElementById("recipeRows");
      if (recipeRows) {
        setupEventDelegation(recipeRows, {
          "remove-recipe": (target) => {
            const index = parseInt(target.dataset.index);
            this.menuManager.removeRecipeFromMenu(index);
          }
        });
      }
      const ingredientRows = document.getElementById("ingredientRows");
      if (ingredientRows) {
        setupEventDelegation(ingredientRows, {
          "remove-ingredient": (target) => {
            const index = parseInt(target.dataset.index);
            this.recipeManager.removeIngredientFromRecipe(index);
          }
        });
      }
      const searchResults = document.getElementById("ingredientSearchResults");
      if (searchResults) {
        setupEventDelegation(searchResults, {
          "add-ingredient-to-recipe": (target) => {
            this.addIngredientToRecipe({
              id: target.dataset.ingredientId,
              name: target.dataset.ingredientName
            });
          }
        });
      }
    }
    // Render recipe list
    renderRecipeList(recipesToShow) {
      RecipeRenderer.renderList(recipesToShow, (recipeId) => {
        this.selectRecipe(recipeId);
        this.showRecipeDetails(recipeId);
      });
      recipesToShow.forEach((recipe) => {
        this.fetchRecipeSummary(recipe.id).then((data) => {
          if (data) {
            RecipeRenderer.updateRecipeItemWithSummary(
              recipe.id,
              data,
              (ox) => this.recipeManager.calculateOxalateRisk(ox)
            );
          }
        });
      });
    }
    // Fetch recipe summary
    async fetchRecipeSummary(recipeId) {
      try {
        return await this.recipeManager.getRecipe(recipeId, true);
      } catch (error) {
        console.error("Error fetching recipe summary:", error);
        return null;
      }
    }
    // Filter recipes
    filterRecipes(searchTerm) {
      const filtered = this.recipeManager.filterRecipes(searchTerm);
      this.renderRecipeList(filtered);
    }
    // Select recipe
    selectRecipe(recipeId) {
      RecipeRenderer.markAsSelected(recipeId);
      this.recipeManager.selectRecipe(recipeId);
      setButtonsDisabled(["editRecipeBtn", "deleteRecipeBtn"], false);
    }
    // Show recipe details
    async showRecipeDetails(recipeId) {
      const summaryCheckbox = document.getElementById("summaryCheckbox");
      const summary = summaryCheckbox ? summaryCheckbox.checked : true;
      try {
        const data = await this.recipeManager.getRecipe(recipeId, summary);
        RecipeRenderer.renderDetails(data, {
          dailyRequirements: this.dailyRequirements,
          userSettings: this.userSettings,
          showAllNutrients: this.showAllNutrients,
          currentNutrientPage: this.currentNutrientPage,
          calculateOxalateRisk: (ox) => this.recipeManager.calculateOxalateRisk(ox),
          calculateContributions: (d) => this.recipeManager.calculateContributions(d),
          INGREDIENT_PROPS: _Client.INGREDIENT_PROPS,
          NUTRIENTS_PER_PAGE: this.NUTRIENTS_PER_PAGE
        });
      } catch (error) {
        console.error("Error loading recipe details:", error);
        RecipeRenderer.showError("Failed to load recipe details");
      }
    }
    // Nutrient view navigation
    toggleNutrientView() {
      this.recipeManager.toggleNutrientView();
      if (this.selectedRecipeId) {
        this.showRecipeDetails(this.selectedRecipeId);
      }
    }
    prevNutrientPage() {
      this.recipeManager.prevNutrientPage();
      if (this.selectedRecipeId) {
        this.showRecipeDetails(this.selectedRecipeId);
      }
    }
    nextNutrientPage() {
      this.recipeManager.nextNutrientPage();
      if (this.selectedRecipeId) {
        this.showRecipeDetails(this.selectedRecipeId);
      }
    }
    // Settings
    loadSettingsForm() {
      const caloriesPerDayInput = document.getElementById("caloriesPerDayInput");
      const useAgeCheckbox = document.getElementById("useAgeCheckbox");
      const ageInput = document.getElementById("ageInput");
      const kidneyRiskSelect = document.getElementById("kidneyRiskSelect");
      if (caloriesPerDayInput) caloriesPerDayInput.value = this.userSettings.caloriesPerDay;
      if (useAgeCheckbox) useAgeCheckbox.checked = this.userSettings.useAge;
      if (ageInput) {
        ageInput.value = this.userSettings.age || "";
        ageInput.disabled = !this.userSettings.useAge;
      }
      if (kidneyRiskSelect) kidneyRiskSelect.value = this.userSettings.kidneyStoneRisk;
      this.updateKidneyRiskInfo();
    }
    updateKidneyRiskInfo() {
      const select = document.getElementById("kidneyRiskSelect");
      const info = document.getElementById("kidneyRiskInfo");
      if (!select || !info) return;
      const riskLevel = select.value;
      const data = this.settingsManager.getKidneyRiskInfo(riskLevel);
      if (data) {
        info.textContent = `Maximum ${data.maxOxalatesPerDay}mg oxalates per day - ${data.description}`;
      }
    }
    applySettings(e) {
      e.preventDefault();
      const updates = {
        caloriesPerDay: parseInt(document.getElementById("caloriesPerDayInput").value),
        useAge: document.getElementById("useAgeCheckbox").checked,
        age: document.getElementById("useAgeCheckbox").checked ? parseInt(document.getElementById("ageInput").value) : null,
        kidneyStoneRisk: document.getElementById("kidneyRiskSelect").value
      };
      this.settingsManager.updateSettings(updates);
      this.recipeManager.loadRecipes();
      this.navigateTo("home");
    }
    cancelSettings() {
      this.navigateTo("home");
    }
    // Ingredients
    filterIngredients(searchTerm) {
      const filtered = this.ingredientManager.filterIngredients(searchTerm);
      this.renderIngredientList(filtered);
    }
    renderIngredientList(ingredientsToShow) {
      IngredientRenderer.renderList(ingredientsToShow, (ingredientId) => {
        this.selectIngredient(ingredientId);
        this.showIngredientDetails(ingredientId);
      });
    }
    selectIngredient(ingredientId) {
      IngredientRenderer.markAsSelected(ingredientId, this.ingredients);
      this.ingredientManager.selectIngredient(ingredientId);
      setButtonsDisabled(["editIngredientBtn", "deleteIngredientBtn"], false);
    }
    async showIngredientDetails(brandId) {
      try {
        const data = await this.ingredientManager.getIngredient(brandId);
        IngredientRenderer.renderDetails(data);
      } catch (error) {
        console.error("Error loading ingredient details:", error);
      }
    }
    // Recipe editor
    createRecipe() {
      this.recipeManager.startEdit(null);
      FormRenderer.setRecipeEditorTitle("Create New Recipe");
      FormRenderer.clearRecipeForm();
      FormRenderer.renderSelectedIngredients([]);
      FormRenderer.openRecipeEditor();
    }
    async editRecipe() {
      if (!this.selectedRecipeId) return;
      this.recipeManager.startEdit(this.selectedRecipeId);
      try {
        const recipe = await this.recipeManager.getRecipeFull(this.selectedRecipeId);
        FormRenderer.setRecipeEditorTitle("Edit Recipe");
        document.getElementById("recipeNameInput").value = recipe.name;
        document.getElementById("ingredientSearchBox").value = "";
        const ingredients = recipe.ingredients.map((ing) => ({
          brandId: ing.brandId,
          name: ing.brandName,
          amount: ing.amount,
          unit: ing.unit
        }));
        State.set("selectedIngredientsForRecipe", ingredients);
        FormRenderer.openRecipeEditor();
      } catch (error) {
        console.error("Error loading recipe for editing:", error);
        alert("Failed to load recipe details");
      }
    }
    async deleteRecipe() {
      if (!this.selectedRecipeId) return;
      const recipe = this.recipes.find((r) => r.id == this.selectedRecipeId);
      if (!recipe) return;
      if (!confirm(`Delete recipe "${recipe.name}"? This cannot be undone.`)) {
        return;
      }
      try {
        await this.recipeManager.deleteRecipe(this.selectedRecipeId);
        this.renderRecipeList(this.recipes);
        this.recipeManager.deselectRecipe();
        setButtonsDisabled(["editRecipeBtn", "deleteRecipeBtn"], true);
        hideElement("recipeDetailsSection");
        alert("Recipe deleted successfully");
      } catch (error) {
        console.error("Error deleting recipe:", error);
        alert("Failed to delete recipe");
      }
    }
    closeRecipeEditor() {
      FormRenderer.closeRecipeEditor();
      this.recipeManager.cancelEdit();
      FormRenderer.clearRecipeForm();
      FormRenderer.hideSearchResults();
      FormRenderer.clearErrors();
    }
    async saveRecipe(event) {
      event.preventDefault();
      const recipeName = document.getElementById("recipeNameInput").value.trim();
      const validation = validateRecipe(recipeName, this.selectedIngredientsForRecipe);
      if (!validation.valid) {
        validation.errors.forEach((error) => {
          FormRenderer.showError(error.field, error.message);
        });
        return;
      }
      FormRenderer.clearErrors();
      const payload = {
        name: recipeName,
        ingredients: this.selectedIngredientsForRecipe.map((ing) => ({
          brandId: ing.brandId,
          amount: parseFloat(ing.amount),
          unit: ing.unit
        }))
      };
      try {
        if (this.editingRecipeId) {
          await this.recipeManager.updateRecipe(this.editingRecipeId, payload);
          alert("Recipe updated successfully");
          this.recipeManager.selectRecipe(this.editingRecipeId);
          await this.showRecipeDetails(this.editingRecipeId);
        } else {
          await this.recipeManager.createRecipe(payload);
          alert("Recipe created successfully");
          const newRecipe = this.recipes.find((r) => r.name == recipeName);
          if (newRecipe) {
            this.recipeManager.selectRecipe(newRecipe.id);
            await this.showRecipeDetails(newRecipe.id);
          }
        }
        this.renderRecipeList(this.recipes);
        this.closeRecipeEditor();
      } catch (error) {
        console.error("Error saving recipe:", error);
        FormRenderer.showError("ingredientsError", error.message || "Failed to save recipe");
      }
    }
    // Ingredient search for recipe editor
    handleIngredientSearch(searchTerm) {
      clearTimeout(this.ingredientSearchTimeout);
      if (!searchTerm || searchTerm.trim().length < 2) {
        FormRenderer.hideSearchResults();
        return;
      }
      this.ingredientSearchTimeout = setTimeout(() => {
        this.performIngredientSearch(searchTerm.trim());
      }, 300);
    }
    async performIngredientSearch(searchTerm) {
      try {
        const results = await this.ingredientManager.searchIngredients(searchTerm);
        FormRenderer.renderSearchResults(
          results,
          this.selectedIngredientsForRecipe,
          (ingredient) => this.addIngredientToRecipe(ingredient)
        );
      } catch (error) {
        console.error("Error searching ingredients:", error);
      }
    }
    addIngredientToRecipe(ingredient) {
      const added = this.recipeManager.addIngredientToRecipe(ingredient);
      if (added) {
        FormRenderer.hideSearchResults();
        document.getElementById("ingredientSearchBox").value = "";
      }
    }
    // Ingredient editor
    createIngredient() {
      this.ingredientManager.startEdit(null);
      FormRenderer.setIngredientEditorTitle("Create New Ingredient");
      FormRenderer.clearIngredientForm();
      FormRenderer.clearErrors();
      FormRenderer.openIngredientEditor();
    }
    async editIngredient() {
      if (!this.selectedIngredientId) return;
      this.ingredientManager.startEdit(this.selectedIngredientId);
      try {
        const ingredient = await this.ingredientManager.getIngredientFull(this.selectedIngredientId);
        FormRenderer.setIngredientEditorTitle("Edit Ingredient");
        FormRenderer.populateIngredientForm(ingredient);
        FormRenderer.clearErrors();
        FormRenderer.openIngredientEditor();
      } catch (error) {
        console.error("Error loading ingredient for editing:", error);
        alert("Failed to load ingredient details");
      }
    }
    async deleteIngredient() {
      if (!this.selectedIngredientId) return;
      const ingredient = this.ingredients.find((i) => i.id == this.selectedIngredientId);
      if (!ingredient) return;
      if (!confirm(`Delete ingredient "${ingredient.name}"? This cannot be undone.`)) {
        return;
      }
      try {
        await this.ingredientManager.deleteIngredient(this.selectedIngredientId);
        this.renderIngredientList(this.ingredients);
        this.ingredientManager.deselectIngredient();
        setButtonsDisabled(["editIngredientBtn", "deleteIngredientBtn"], true);
        hideElement("ingredientDetailsSection");
        alert("Ingredient deleted successfully");
      } catch (error) {
        console.error("Error deleting ingredient:", error);
        alert("Failed to delete ingredient");
      }
    }
    closeIngredientEditor() {
      FormRenderer.closeIngredientEditor();
      this.ingredientManager.cancelEdit();
      FormRenderer.clearErrors();
    }
    async saveIngredient(event) {
      event.preventDefault();
      const name = document.getElementById("ingredientNameInput").value.trim();
      const serving = parseFloat(document.getElementById("servingSizeInput").value);
      const servingUnit = document.getElementById("servingUnitSelect").value;
      const density = parseFloat(document.getElementById("densityInput").value) || null;
      const oxalatePerGram = parseFloat(document.getElementById("oxalateInput").value) || 0;
      const validation = validateIngredient(name, serving);
      if (!validation.valid) {
        validation.errors.forEach((error) => {
          FormRenderer.showError(error.field, error.message);
        });
        return;
      }
      FormRenderer.clearErrors();
      const data = {};
      const addIfPresent = (id, field) => {
        const element = document.getElementById(id);
        if (!element) return;
        const value = element.value;
        if (value !== null && value !== void 0 && value !== "") {
          const numValue = parseFloat(value);
          if (!isNaN(numValue)) {
            const unit = _Client.INGREDIENT_PROPS[field]?.unit;
            if (!unit) {
              FormRenderer.showError("ingredientNameError", `No standard unit found for ${field}`);
            }
            data[field] = unit === "none" ? numValue : `${numValue} ${unit}`;
          }
        }
      };
      addIfPresent("caloriesInput", "calories");
      addIfPresent("sodiumInput", "sodium");
      addIfPresent("cholesterolInput", "cholesterol");
      addIfPresent("sugarsInput", "sugars");
      addIfPresent("proteinInput", "protein");
      addIfPresent("dietaryFiberInput", "dietary_fiber");
      addIfPresent("carbohydratesInput", "carbohydrates");
      addIfPresent("calciumInput", "calcium");
      addIfPresent("potassiumInput", "potassium");
      addIfPresent("magnesiumInput", "magnesium");
      addIfPresent("seleniumInput", "selenium");
      addIfPresent("manganeseInput", "manganese");
      addIfPresent("zincInput", "zinc");
      addIfPresent("ironInput", "iron");
      addIfPresent("fatInput", "fat");
      addIfPresent("saturatedFatInput", "saturated_fat");
      addIfPresent("polysaturatedFatInput", "polysaturated_fat");
      addIfPresent("monosaturatedFatInput", "monosaturated_fat");
      addIfPresent("thiaminInput", "thiamin");
      addIfPresent("riboflavinInput", "riboflavin");
      addIfPresent("niacinInput", "niacin");
      addIfPresent("folicAcidInput", "folic_acid");
      addIfPresent("phosphorusInput", "phosphorus");
      addIfPresent("vitaminAInput", "vitamin_a");
      addIfPresent("vitaminB6Input", "vitamin_b6");
      addIfPresent("vitaminCInput", "vitamin_c");
      addIfPresent("vitaminDInput", "vitamin_d");
      addIfPresent("vitaminEInput", "vitamin_e");
      addIfPresent("vitaminKInput", "vitamin_k");
      const payload = {
        name,
        serving,
        servingUnit,
        density,
        oxalatePerGram,
        data
      };
      try {
        if (this.editingIngredientId) {
          await this.ingredientManager.updateIngredient(this.editingIngredientId, payload);
          alert("Ingredient updated successfully");
          await this.showIngredientDetails(this.editingIngredientId);
          this.ingredientManager.selectIngredient(this.editingIngredientId);
        } else {
          await this.ingredientManager.createIngredient(payload);
          alert("Ingredient created successfully");
          const newIngredient = this.ingredients.find((i) => i.name == name);
          if (newIngredient) {
            await this.showIngredientDetails(newIngredient.id);
            this.ingredientManager.selectIngredient(newIngredient.id);
          }
        }
        this.renderIngredientList(this.ingredients);
        this.closeIngredientEditor();
      } catch (error) {
        console.error("Error saving ingredient:", error);
        FormRenderer.showError("ingredientNameError", error.message || "Failed to save ingredient");
      }
    }
    // Menu List & Selection
    renderMenuList(menusToShow) {
      MenuRenderer.renderList(menusToShow, (menuId) => {
        this.selectMenu(menuId);
        this.showMenuDetails(menuId);
      });
      menusToShow.forEach((menu) => {
        this.fetchMenuSummary(menu.id).then((data) => {
          if (data) {
            MenuRenderer.updateMenuItemWithSummary(
              menu.id,
              data,
              (ox) => this.menuManager.calculateOxalateRisk(ox)
            );
          }
        });
      });
    }
    async fetchMenuSummary(menuId) {
      try {
        const menu = await this.menuManager.getMenu(menuId);
        return await this.menuManager.getMenuNutritionalData(menu);
      } catch (error) {
        console.error("Error fetching menu summary:", error);
        return null;
      }
    }
    filterMenus(searchTerm) {
      const filtered = this.menuManager.filterMenus(searchTerm);
      this.renderMenuList(filtered);
    }
    selectMenu(menuId) {
      MenuRenderer.markAsSelected(menuId);
      this.menuManager.selectMenu(menuId);
      setButtonsDisabled(["editMenuBtn", "deleteMenuBtn"], false);
    }
    async showMenuDetails(menuId) {
      try {
        const menu = await this.menuManager.getMenu(menuId);
        const nutritionalData = await this.menuManager.getMenuNutritionalData(menu);
        MenuRenderer.renderDetails(nutritionalData, {
          dailyRequirements: this.dailyRequirements,
          userSettings: this.userSettings,
          calculateOxalateRisk: (ox) => this.menuManager.calculateOxalateRisk(ox),
          INGREDIENT_PROPS: _Client.INGREDIENT_PROPS
        });
      } catch (error) {
        console.error("Error loading menu details:", error);
        MenuRenderer.showError("Failed to load menu details");
      }
    }
    // Menu CRUD Operations
    createMenu() {
      this.menuManager.startEdit(null);
      FormRenderer.setMenuEditorTitle("Create New Menu");
      FormRenderer.clearMenuForm();
      MenuRenderer.renderSelectedRecipes([]);
      FormRenderer.openMenuEditor();
    }
    async editMenu() {
      if (!this.selectedMenuId) return;
      this.menuManager.startEdit(this.selectedMenuId);
      try {
        const menu = await this.menuManager.getMenu(this.selectedMenuId);
        FormRenderer.setMenuEditorTitle("Edit Menu");
        document.getElementById("menuNameInput").value = menu.name;
        document.getElementById("recipeSearchBox").value = "";
        const recipePromises = menu.recipeIds.map(
          (id) => this.recipes.find((r) => r.id === id)
        );
        const recipes = recipePromises.filter((r) => r !== void 0).map((r) => ({ id: r.id, name: r.name }));
        State.set("selectedRecipesForMenu", recipes);
        FormRenderer.openMenuEditor();
      } catch (error) {
        console.error("Error loading menu for editing:", error);
        alert("Failed to load menu details");
      }
    }
    async deleteMenu() {
      const menu = this.menus.find((m) => m.id == this.selectedMenuId);
      if (!menu) return;
      if (!confirm(`Delete menu "${menu.name}"? This cannot be undone.`)) {
        return;
      }
      try {
        await this.menuManager.deleteMenu(this.selectedMenuId);
        this.renderMenuList(this.menus);
        this.menuManager.deselectMenu();
        setButtonsDisabled(["editMenuBtn", "deleteMenuBtn"], true);
        hideElement("menuDetailsSection");
        alert("Menu deleted successfully");
      } catch (error) {
        console.error("Error deleting menu:", error);
        alert("Failed to delete menu");
      }
    }
    closeMenuEditor() {
      FormRenderer.closeMenuEditor();
      this.menuManager.cancelEdit();
      FormRenderer.clearMenuForm();
      MenuRenderer.hideRecipeSearchResults();
      FormRenderer.clearErrors();
    }
    async saveMenu(event) {
      event.preventDefault();
      const menuName = document.getElementById("menuNameInput").value.trim();
      const validation = this.validateMenu(menuName, this.selectedRecipesForMenu);
      if (!validation.valid) {
        validation.errors.forEach((error) => {
          FormRenderer.showError(error.field, error.message);
        });
        return;
      }
      FormRenderer.clearErrors();
      const payload = {
        name: menuName,
        recipeIds: this.selectedRecipesForMenu.map((r) => r.id)
      };
      try {
        if (this.editingMenuId) {
          await this.menuManager.updateMenu(this.editingMenuId, payload);
          alert("Menu updated successfully");
          this.menuManager.selectMenu(this.editingMenuId);
          await this.showMenuDetails(this.editingMenuId);
        } else {
          await this.menuManager.createMenu(payload);
          alert("Menu created successfully");
          const newMenu = this.menus.find((m) => m.name === menuName);
          if (newMenu) {
            this.menuManager.selectMenu(newMenu.id);
            await this.showMenuDetails(newMenu.id);
          }
        }
        this.renderMenuList(this.menus);
        this.closeMenuEditor();
      } catch (error) {
        console.error("Error saving menu:", error);
        FormRenderer.showError("recipesError", error.message || "Failed to save menu");
      }
    }
    // Menu Validation
    validateMenu(menuName, recipes) {
      const errors = [];
      if (!menuName || menuName.trim().length === 0) {
        errors.push({ field: "menuNameError", message: "Menu name is required" });
      }
      if (menuName && menuName.length > 64) {
        errors.push({ field: "menuNameError", message: "Menu name cannot exceed 64 characters" });
      }
      if (!recipes || recipes.length === 0) {
        errors.push({ field: "recipesError", message: "At least one recipe is required" });
      }
      if (recipes && recipes.length > 30) {
        errors.push({ field: "recipesError", message: "Maximum 30 recipes allowed" });
      }
      return {
        valid: errors.length === 0,
        errors
      };
    }
    // Recipe Search for Menu Editor
    handleRecipeSearch(searchTerm) {
      clearTimeout(this.recipeSearchTimeout);
      if (!searchTerm || searchTerm.trim().length < 2) {
        MenuRenderer.hideRecipeSearchResults();
        return;
      }
      this.recipeSearchTimeout = setTimeout(() => {
        this.performRecipeSearch(searchTerm.trim());
      }, 300);
    }
    performRecipeSearch(searchTerm) {
      const term = searchTerm.toLowerCase();
      const results = this.recipes.filter(
        (recipe) => recipe.name.toLowerCase().includes(term)
      );
      MenuRenderer.renderRecipeSearchResults(
        results,
        this.selectedRecipesForMenu,
        (recipe) => this.addRecipeToMenu(recipe)
      );
    }
    addRecipeToMenu(recipe) {
      const added = this.menuManager.addRecipeToMenu(recipe);
      if (added) {
        MenuRenderer.hideRecipeSearchResults();
        document.getElementById("recipeSearchBox").value = "";
      } else {
        alert("This recipe is already in the menu");
      }
    }
    // Daily Plan List & Selection
    renderDailyPlanList(dailyPlansToShow) {
      DailyPlanRenderer.renderList(dailyPlansToShow, (dailyPlanId2) => {
        this.selectDailyPlan(dailyPlanId2);
        this.showDailyPlanDetails(dailyPlanId2);
      });
      dailyPlansToShow.forEach((plan) => {
        this.fetchDailyPlanSummary(plan.id).then((data) => {
          if (data && Object.keys(data).length) {
            DailyPlanRenderer.updateDailyPlanItemWithSummary(
              plan.id,
              data,
              (ox) => this.dailyPlanManager.calculateOxalateRisk(ox)
            );
          }
        });
      });
    }
    async fetchDailyPlanSummary(dailyPlanId2) {
      try {
        return await this.dailyPlanManager.getDailyPlan(dailyPlanId2);
      } catch (error) {
        console.error("Error fetching daily plan summary:", error);
        return null;
      }
    }
    filterDailyPlans(searchTerm) {
      const filtered = this.dailyPlanManager.filterDailyPlans(searchTerm);
      this.renderDailyPlanList(filtered);
    }
    selectDailyPlan(dailyPlanId2) {
      DailyPlanRenderer.markAsSelected(dailyPlanId2);
      this.dailyPlanManager.selectDailyPlan(dailyPlanId2);
      setButtonsDisabled(["editDailyPlanBtn", "deleteDailyPlanBtn"], false);
    }
    async showDailyPlanDetails(dailyPlanId2) {
      try {
        const data = await this.dailyPlanManager.getDailyPlan(dailyPlanId2);
        DailyPlanRenderer.renderDetails(data, {
          dailyRequirements: this.dailyRequirements,
          userSettings: this.userSettings,
          showAllNutrients: this.showAllDailyNutrients,
          currentNutrientPage: this.currentDailyNutrientPage,
          calculateOxalateRisk: (ox) => this.dailyPlanManager.calculateOxalateRisk(ox),
          INGREDIENT_PROPS: _Client.INGREDIENT_PROPS,
          NUTRIENTS_PER_PAGE: this.NUTRIENTS_PER_PAGE
        });
      } catch (error) {
        console.error("Error loading daily plan details:", error);
        DailyPlanRenderer.showError("Failed to load daily plan details");
      }
    }
    // Daily Plan CRUD Operations
    createDailyPlan() {
      this.dailyPlanManager.startEdit(null);
      FormRenderer.setDailyPlanEditorTitle("Create New Daily Plan");
      FormRenderer.clearDailyPlanForm();
      DailyPlanRenderer.renderSelectedMenus(
        [],
        (index) => this.dailyPlanManager.removeMenuFromDailyPlan(index),
        (index, type) => this.dailyPlanManager.updateMenuType(index, type)
      );
      FormRenderer.openDailyPlanEditor();
    }
    async editDailyPlan() {
      if (!this.selectedDailyPlanId) return;
      this.dailyPlanManager.startEdit(this.selectedDailyPlanId);
      try {
        const dailyPlan = await this.dailyPlanManager.getDailyPlan(this.selectedDailyPlanId);
        FormRenderer.setDailyPlanEditorTitle("Edit Daily Plan");
        document.getElementById("dailyPlanNameInput").value = dailyPlan.dailyPlanName;
        document.getElementById("menuSearchBoxForDailyPlan").value = "";
        const menus = dailyPlan.menus.map((menu) => ({
          menuId: menu.menuId,
          name: menu.name,
          type: menu.type
        }));
        State.set("selectedMenusForDailyPlan", menus);
        FormRenderer.openDailyPlanEditor();
      } catch (error) {
        console.error("Error loading daily plan for editing:", error);
        alert("Failed to load daily plan details");
      }
    }
    async deleteDailyPlan() {
      if (!this.selectedDailyPlanId) return;
      const dailyPlan = this.dailyPlans.find((dp) => dp.id == this.selectedDailyPlanId);
      if (!dailyPlan) return;
      if (!confirm(`Delete daily plan "${dailyPlan.name}"? This cannot be undone.`)) {
        return;
      }
      try {
        await this.dailyPlanManager.deleteDailyPlan(this.selectedDailyPlanId);
        this.renderDailyPlanList(this.dailyPlans);
        this.dailyPlanManager.deselectDailyPlan();
        setButtonsDisabled(["editDailyPlanBtn", "deleteDailyPlanBtn"], true);
        hideElement("dailyPlanDetailsSection");
        alert("Daily plan deleted successfully");
      } catch (error) {
        console.error("Error deleting daily plan:", error);
        alert("Failed to delete daily plan");
      }
    }
    closeDailyPlanEditor() {
      FormRenderer.closeDailyPlanEditor();
      this.dailyPlanManager.cancelEdit();
      FormRenderer.clearDailyPlanForm();
      DailyPlanRenderer.hideMenuSearchResults();
      FormRenderer.clearErrors();
    }
    async saveDailyPlan(event) {
      event.preventDefault();
      const dailyPlanName = document.getElementById("dailyPlanNameInput").value.trim();
      const validation = this.validateDailyPlan(dailyPlanName, this.selectedMenusForDailyPlan);
      if (!validation.valid) {
        validation.errors.forEach((error) => {
          FormRenderer.showError(error.field, error.message);
        });
        return;
      }
      FormRenderer.clearErrors();
      const payload = {
        name: dailyPlanName,
        dailyPlanMenus: this.selectedMenusForDailyPlan.map((menu) => ({
          menuId: menu.menuId,
          type: menu.type
        }))
      };
      try {
        if (this.editingDailyPlanId) {
          await this.dailyPlanManager.updateDailyPlan(this.editingDailyPlanId, payload);
          alert("Daily plan updated successfully");
          this.dailyPlanManager.selectDailyPlan(this.editingDailyPlanId);
          await this.showDailyPlanDetails(this.editingDailyPlanId);
        } else {
          await this.dailyPlanManager.createDailyPlan(payload);
          alert("Daily plan created successfully");
          const newDailyPlan = this.dailyPlans.find((dp) => dp.name === dailyPlanName);
          if (newDailyPlan) {
            this.dailyPlanManager.selectDailyPlan(newDailyPlan.id);
            await this.showDailyPlanDetails(newDailyPlan.id);
          }
        }
        this.renderDailyPlanList(this.dailyPlans);
        this.closeDailyPlanEditor();
      } catch (error) {
        console.error("Error saving daily plan:", error);
        FormRenderer.showError("menusError", error.message || "Failed to save daily plan");
      }
    }
    // Daily Plan Validation
    validateDailyPlan(dailyPlanName, menus) {
      const errors = [];
      if (!dailyPlanName || dailyPlanName.trim().length === 0) {
        errors.push({ field: "dailyPlanNameError", message: "Daily plan name is required" });
      }
      if (dailyPlanName && dailyPlanName.length > 64) {
        errors.push({ field: "dailyPlanNameError", message: "Daily plan name cannot exceed 64 characters" });
      }
      if (!menus || menus.length === 0) {
        errors.push({ field: "menusError", message: "At least one menu is required" });
      }
      return {
        valid: errors.length === 0,
        errors
      };
    }
    // Menu Search for Daily Plan Editor
    handleMenuSearchForDailyPlan(searchTerm) {
      clearTimeout(this.menuSearchTimeout);
      if (!searchTerm || searchTerm.trim().length < 2) {
        DailyPlanRenderer.hideMenuSearchResults();
        return;
      }
      this.menuSearchTimeout = setTimeout(() => {
        this.performMenuSearchForDailyPlan(searchTerm.trim());
      }, 300);
    }
    performMenuSearchForDailyPlan(searchTerm) {
      const term = searchTerm.toLowerCase();
      const results = this.menus.filter(
        (menu) => menu.name.toLowerCase().includes(term)
      );
      DailyPlanRenderer.renderMenuSearchResults(
        results,
        (menu) => this.addMenuToDailyPlan(menu)
      );
    }
    addMenuToDailyPlan(menu) {
      const added = this.dailyPlanManager.addMenuToDailyPlan(menu);
      if (added) {
        DailyPlanRenderer.hideMenuSearchResults();
        document.getElementById("menuSearchBoxForDailyPlan").value = "";
      }
    }
    // Daily Plan Nutrient View Navigation
    toggleDailyNutrientView() {
      const current = State.get("showAllDailyNutrients");
      State.set("showAllDailyNutrients", !current);
      State.set("currentDailyNutrientPage", 0);
      if (this.selectedDailyPlanId) {
        this.showDailyPlanDetails(this.selectedDailyPlanId);
      }
    }
    prevDailyNutrientPage() {
      const current = State.get("currentDailyNutrientPage");
      if (current > 0) {
        State.set("currentDailyNutrientPage", current - 1);
        if (this.selectedDailyPlanId) {
          this.showDailyPlanDetails(this.selectedDailyPlanId);
        }
      }
    }
    nextDailyNutrientPage() {
      State.set("currentDailyNutrientPage", State.get("currentDailyNutrientPage") + 1);
      if (this.selectedDailyPlanId) {
        this.showDailyPlanDetails(this.selectedDailyPlanId);
      }
    }
  };
  document.addEventListener("DOMContentLoaded", () => {
    window._client = new Client();
    window._client.init();
  });
})();
//# sourceMappingURL=bundle.js.map
