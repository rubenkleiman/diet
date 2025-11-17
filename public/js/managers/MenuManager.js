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
        oxalateMg: aggregated.oxalateMg,
        dashAdherence: aggregated.dashAdherence,
        dashReasons: aggregated.dashReasons,
        oxalateLevel: aggregated.oxalateLevel
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
    const oxalateLevelList = [];

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

      // Collect oxalate levels for reference
      if (recipe.oxalateLevel) {
        oxalateLevelList.push(recipe.oxalateLevel);
      }
    });

    // Calculate DASH adherence from aggregated totals (will be done in renderer)
    // Calculate overall oxalate level
    const oxalateLevel = this.calculateOverallOxalateLevel(totalOxalates);

    return {
      totals,
      oxalateMg: totalOxalates,
      dashAdherence: null,  // Will be calculated from totals in renderer
      dashReasons: null,    // Will be calculated from totals in renderer
      oxalateLevel
    };
  }

  /**
   * Calculate oxalate risk for menu
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
  /**
   * Calculate DASH adherence for menu based on aggregated totals
   */
  calculateDashAdherence(totals, userSettings) {
    const reasons = [];
    let goodCount = 0;
    let poorCount = 0;

    // Get total calories
    const totalCalories = totals.calories || 0;

    // 1. Sodium (should be < 2300mg per day, for a meal < ~800mg)
    const sodium = totals.sodium || 0;
    if (sodium < 500) {
      reasons.push('excellent sodium ✓✓');
      goodCount += 2;
    } else if (sodium < 800) {
      reasons.push('low sodium ✓');
      goodCount++;
    } else if (sodium < 1200) {
      reasons.push('moderate sodium ⚠');
    } else {
      reasons.push('high sodium ✗');
      poorCount++;
    }

    // 2. Saturated Fat (should be < 6% of calories)
    const saturatedFat = totals.saturated_fat || 0;
    const saturatedFatCalories = saturatedFat * 9; // 9 cal per gram
    const saturatedFatPercent = totalCalories > 0 ? (saturatedFatCalories / totalCalories * 100) : 0;
    if (saturatedFatPercent < 6) {
      reasons.push('low saturated fat ✓');
      goodCount++;
    } else if (saturatedFatPercent < 10) {
      reasons.push('moderate saturated fat ⚠');
    } else {
      reasons.push('high saturated fat ✗');
      poorCount++;
    }

    // 3. Sugars (WHO recommends < 10% of calories, ideally < 5%)
    const sugars = totals.sugars || 0;
    const sugarCalories = sugars * 4; // 4 cal per gram
    const sugarPercent = totalCalories > 0 ? (sugarCalories / totalCalories * 100) : 0;
    if (sugarPercent < 5) {
      reasons.push('low sugar ✓');
      goodCount++;
    } else if (sugarPercent <= 10) {
      reasons.push(`moderate sugar (${sugarPercent.toFixed(0)}% of calories) ⚠`);
    } else {
      reasons.push(`high sugar (${sugarPercent.toFixed(0)}% > 10% calories WHO) ⚠`);
      poorCount++;
    }

    // 4. Potassium (for a meal, good if > 1000mg)
    const potassium = totals.potassium || 0;
    if (potassium >= 1500) {
      reasons.push('excellent potassium ✓✓');
      goodCount += 2;
    } else if (potassium >= 1000) {
      reasons.push('good potassium ✓');
      goodCount++;
    } else if (potassium >= 500) {
      reasons.push('moderate potassium');
    } else {
      reasons.push('low potassium ⚠');
    }

    // 5. Fiber (for a meal, good if > 8g)
    const fiber = totals.dietary_fiber || 0;
    if (fiber >= 10) {
      reasons.push('excellent fiber ✓✓');
      goodCount += 2;
    } else if (fiber >= 8) {
      reasons.push('good fiber ✓');
      goodCount++;
    } else if (fiber >= 5) {
      reasons.push('moderate fiber');
    } else {
      reasons.push('low fiber ⚠');
    }

    // 6. Protein (should be adequate but not excessive)
    const protein = totals.protein || 0;
    const proteinCalories = protein * 4; // 4 cal per gram
    const proteinPercent = totalCalories > 0 ? (proteinCalories / totalCalories * 100) : 0;
    if (proteinPercent >= 15 && proteinPercent <= 25) {
      reasons.push('good protein ✓');
      goodCount++;
    } else if (proteinPercent < 10) {
      reasons.push('low protein ⚠');
    } else if (proteinPercent > 30) {
      reasons.push('high protein ⚠');
    }

    // Determine overall adherence
    let adherence;
    if (poorCount >= 2) {
      adherence = 'Poor';
    } else if (poorCount === 1 || goodCount < 3) {
      adherence = 'Fair';
    } else if (goodCount >= 5) {
      adherence = 'Excellent';
    } else {
      adherence = 'Good';
    }

    return {
      adherence,
      reasons: reasons.join(', ')
    };
  }

  /**
   * Calculate overall oxalate level based on total mg
   */
  calculateOverallOxalateLevel(totalOxalates) {
    if (totalOxalates < 50) return 'Low';
    if (totalOxalates < 100) return 'Moderate';
    if (totalOxalates < 200) return 'High';
    return 'Very High';
  }
}
