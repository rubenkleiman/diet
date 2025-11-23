/**
 * Menu Manager
 * Handles all menu-related operations
 */

import { State } from '../core/State.js';
import { APIClient } from '../core/APIClient.js';
import { OxalateHelper } from '../utils/OxalateHelper.js';

export class MenuManager {

  /**
   * Load all menus from API
   */
  async loadMenus() {
    try {
      const result = await APIClient.getMenus();

      if (APIClient.isSuccess(result)) {
        State.set('menus', result.data);
        return result.data;
      } else {
        console.error('Error loading menus:', APIClient.getError(result));
        throw new Error(APIClient.getError(result));
      }
    } catch (error) {
      console.error('Error loading menus:', error);
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
      console.error('Error loading menu:', error);
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
        await this.loadMenus(); // Refresh list
        return result.data;
      } else {
        throw new Error(APIClient.getError(result));
      }
    } catch (error) {
      console.error('Error updating menu:', error);
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
        await this.loadMenus(); // Refresh list
        return true;
      } else {
        throw new Error(APIClient.getError(result));
      }
    } catch (error) {
      console.error('Error deleting menu:', error);
      throw error;
    }
  }

  /**
   * Select a menu
   */
  selectMenu(menuId) {
    State.set('selectedMenuId', menuId);
  }

  /**
   * Deselect menu
   */
  deselectMenu() {
    State.set('selectedMenuId', null);
  }

  /**
   * Filter menus by search term
   */
  filterMenus(searchTerm) {
    const menus = State.get('menus');
    const term = searchTerm.toLowerCase().trim();

    if (!term) {
      return menus;
    }

    return menus.filter(menu =>
      menu.name.toLowerCase().includes(term)
    );
  }

  /**
   * Start editing a menu
   */
  startEdit(menuId = null) {
    State.set('editingMenuId', menuId);

    if (menuId === null) {
      // Creating new menu
      State.set('selectedRecipesForMenu', []);
    }
  }

  /**
   * Cancel editing
   */
  cancelEdit() {
    State.set('editingMenuId', null);
    State.set('selectedRecipesForMenu', []);
  }

  /**
   * Add recipe to menu being edited
   */
  async addRecipeToMenu(recipe) {
    const selected = State.get('selectedRecipesForMenu');

    // Check if already added
    if (selected.some(r => r.id === recipe.id)) {
      return false;
    }

    // Get recipe details to calculate default amount (total weight)
    const defaultAmount = await this.getRecipeDefaultAmount(recipe.id);

    selected.push({
      id: recipe.id,
      name: recipe.name,
      amount: defaultAmount.amount,
      unit: defaultAmount.unit
    });

    State.set('selectedRecipesForMenu', [...selected]);
    return true;
  }

  /**
   * Remove recipe from menu being edited
   */
  removeRecipeFromMenu(index) {
    const selected = State.get('selectedRecipesForMenu');
    selected.splice(index, 1);
    State.set('selectedRecipesForMenu', [...selected]);
  }

  /**
   * Update recipe amount in menu being edited
   */
  updateRecipeAmount(index, amount) {
    const selected = State.get('selectedRecipesForMenu');
    selected[index].amount = amount;
    State.set('selectedRecipesForMenu', [...selected]);
  }

  /**
   * Update recipe unit in menu being edited
   */
  updateRecipeUnit(index, unit) {
    const selected = State.get('selectedRecipesForMenu');
    selected[index].unit = unit;
    State.set('selectedRecipesForMenu', [...selected]);
  }

  /**
   * Reset recipe amount to default (total weight)
   */
  async resetRecipeAmount(index) {
    const selected = State.get('selectedRecipesForMenu');
    const recipe = selected[index];
    
    const defaultAmount = await this.getRecipeDefaultAmount(recipe.id);
    
    selected[index].amount = defaultAmount.amount;
    selected[index].unit = defaultAmount.unit;
    
    State.set('selectedRecipesForMenu', [...selected]);
  }

  /**
   * Get default amount for a recipe (total weight of ingredients)
   * 🎯 ENCAPSULATED: Easy to replace with backend call
   */
  async getRecipeDefaultAmount(recipeId) {
    try {
      // Fetch full recipe details
      const result = await APIClient.getRecipeFull(recipeId);
      
      if (APIClient.isSuccess(result)) {
        const recipe = result.data;
        const totalWeight = this.calculateRecipeTotalWeight(recipe);
        
        return {
          amount: totalWeight.toFixed(1),
          unit: 'g'
        };
      }
      
      // Fallback
      return { amount: '100', unit: 'g' };
    } catch (error) {
      console.error('Error getting recipe default amount:', error);
      return { amount: '100', unit: 'g' };
    }
  }

  /**
   * Calculate total weight of all ingredients in a recipe
   * 🎯 ENCAPSULATED: This logic can be moved to backend
   */
  calculateRecipeTotalWeight(recipe) {
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      return 100; // Default fallback
    }

    // Sum all ingredient amounts (assuming all are in grams)
    const totalGrams = recipe.ingredients.reduce((sum, ingredient) => {
      // Convert to grams if needed
      let amountInGrams = parseFloat(ingredient.amount) || 0;
      
      if (ingredient.unit === 'ml') {
        // For ml, assume density of 1 (water) if not specified
        // This is a simplification - backend should handle this properly
        amountInGrams = amountInGrams * 1;
      } else if (ingredient.unit === 'mg') {
        amountInGrams = amountInGrams / 1000;
      } else if (ingredient.unit === 'mcg') {
        amountInGrams = amountInGrams / 1000000;
      }
      // else assume already in grams
      
      return sum + amountInGrams;
    }, 0);

    return totalGrams;
  }

  /**
   * Fetch recipe details and aggregate nutritional data
   * Now scales nutrition based on recipe amounts
   */
  async getMenuNutritionalData(menu) {
    try {
      // Fetch all recipe details
      const recipePromises = menu.recipes.map(recipeEntry =>
        APIClient.getRecipe(recipeEntry.id, false).then(result => ({
          ...result,
          menuAmount: recipeEntry.amount,
          menuUnit: recipeEntry.unit
        }))
      );

      const recipeResults = await Promise.all(recipePromises);

      // Extract recipe data with scaling info
      const recipes = recipeResults
        .filter(result => APIClient.isSuccess(result))
        .map(result => ({
          ...result.data,
          menuAmount: result.menuAmount,
          menuUnit: result.menuUnit
        }));

      if (recipes.length === 0) {
        throw new Error('No recipes found in menu');
      }

      // Aggregate nutritional data with scaling
      const aggregated = this.aggregateNutrition(recipes);

      return {
        menuId: menu.id,
        menuName: menu.name,
        recipes: recipes,
        totals: aggregated.totals,
        oxalateMg: aggregated.oxalateMg
      };
    } catch (error) {
      console.error('Error fetching menu nutritional data:', error);
      throw error;
    }
  }

  /**
   * Aggregate nutrition from multiple recipes
   * Now scales each recipe's nutrition based on its amount
   * 🎯 ENCAPSULATED: Scaling logic can be moved to backend
   */
  aggregateNutrition(recipes) {
    const totals = {};
    let totalOxalates = 0;

    recipes.forEach(recipe => {
      // Calculate scaling factor
      const scalingFactor = this.calculateScalingFactor(recipe);

      // Sum up totals with scaling
      for (const [nutrient, value] of Object.entries(recipe.totals || {})) {
        if (!totals[nutrient]) {
          totals[nutrient] = 0;
        }
        totals[nutrient] += value * scalingFactor;
      }

      // Sum oxalates with scaling
      totalOxalates += (recipe.oxalateMg || 0) * scalingFactor;
    });

    return {
      totals,
      oxalateMg: totalOxalates
    };
  }

  /**
   * Calculate scaling factor for a recipe based on menu amount vs recipe default
   * 🎯 ENCAPSULATED: Easy to replace with backend calculation
   */
  calculateScalingFactor(recipe) {
    // Get recipe's default total weight
    const defaultWeight = this.calculateRecipeTotalWeight(recipe);
    
    // Get menu's specified amount (convert to grams if needed)
    let menuAmountInGrams = parseFloat(recipe.menuAmount) || defaultWeight;
    
    if (recipe.menuUnit === 'ml') {
      // Assume density of 1 for ml to g conversion
      menuAmountInGrams = menuAmountInGrams * 1;
    }
    
    // Calculate scaling factor
    const scalingFactor = menuAmountInGrams / defaultWeight;
    
    return scalingFactor;
  }

  /**
   * Calculate oxalate risk for menu
   */
  calculateOxalateRisk(oxalateMg) {
    return OxalateHelper.calculateRisk(oxalateMg);
  }
}