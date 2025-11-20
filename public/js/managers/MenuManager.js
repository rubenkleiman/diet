/**
 * Menu Manager
 * Handles all menu-related operations
 */

import { State } from '../core/State.js';
import { APIClient } from '../core/APIClient.js';

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
  addRecipeToMenu(recipe) {
    const selected = State.get('selectedRecipesForMenu');

    // Check if already added
    if (selected.some(r => r.id === recipe.id)) {
      return false;
    }

    selected.push({
      id: recipe.id,
      name: recipe.name
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
   * Fetch recipe details and aggregate nutritional data
   */
  async getMenuNutritionalData(menu) {
    try {
      // Fetch all recipe details
      const recipePromises = menu.recipeIds.map(recipeId =>
        APIClient.getRecipe(recipeId, false)
      );

      const recipeResults = await Promise.all(recipePromises);

      // Extract recipe data
      const recipes = recipeResults
        .filter(result => APIClient.isSuccess(result))
        .map(result => result.data);

      if (recipes.length === 0) {
        throw new Error('No recipes found in menu');
      }

      // Aggregate nutritional data
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
   */
  aggregateNutrition(recipes) {
    const totals = {};
    let totalOxalates = 0;

    recipes.forEach(recipe => {
      // Sum up totals
      for (const [nutrient, value] of Object.entries(recipe.totals || {})) {
        if (!totals[nutrient]) {
          totals[nutrient] = 0;
        }
        totals[nutrient] += value;
      }

      // Sum oxalates
      totalOxalates += recipe.oxalateMg || 0;
    });

    return {
      totals,
      oxalateMg: totalOxalates
    };
  }

  /**
   * Calculate oxalate risk for menu
   * (Still needed for list item coloring)
   */
  calculateOxalateRisk(oxalateMg) {
    const userSettings = State.get('userSettings');
    const kidneyStoneRiskData = State.get('kidneyStoneRiskData');

    const maxOxalates = kidneyStoneRiskData[userSettings.kidneyStoneRisk]?.maxOxalatesPerDay || 200;
    const percent = (oxalateMg / maxOxalates) * 100;

    if (percent < 50) {
      return { status: 'safe', percent, color: '#27ae60', message: '' };
    } else if (percent < 100) {
      return {
        status: 'warning',
        percent,
        color: '#b8860b',
        message: `Approaching your daily oxalate limit (${maxOxalates}mg)`
      };
    } else {
      return {
        status: 'danger',
        percent,
        color: '#e74c3c',
        message: `Exceeds your daily oxalate limit (${maxOxalates}mg). This menu contains ${oxalateMg.toFixed(1)}mg oxalates, which is ${(percent - 100).toFixed(0)}% over your ${userSettings.kidneyStoneRisk.toLowerCase()} risk limit.`
      };
    }
  }
}