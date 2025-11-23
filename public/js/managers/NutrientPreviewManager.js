/**
 * Nutrient Preview Manager (Simplified with Backend)
 * Calculates and renders nutritional previews for editors using backend API
 */

import { APIClient } from '../core/APIClient.js';

export class NutrientPreviewManager {
  constructor() {
    this.NUTRIENTS_PER_PAGE = 5;
  }

  /**
   * Calculate recipe totals from selected ingredients (using backend)
   */
  async calculateRecipeTotals(selectedIngredients) {
    if (!selectedIngredients || selectedIngredients.length === 0) {
      return null;
    }

    try {
      const result = await APIClient.previewRecipe(selectedIngredients);

      if (APIClient.isSuccess(result)) {
        return result.data; // { totals: {...}, oxalateMg: ... }
      }

      console.error('Error calculating recipe totals:', APIClient.getError(result));
      return null;
    } catch (error) {
      console.error('Error calculating recipe totals:', error);
      return null;
    }
  }

  /**
   * Calculate menu totals from selected recipes (using backend)
   * Scales nutrition based on recipe amounts
   */
  async calculateMenuTotals(selectedRecipes) {
    if (!selectedRecipes || selectedRecipes.length === 0) {
      return null;
    }

    try {
      // Fetch each recipe's full details
      const recipePromises = selectedRecipes.map(async (recipeEntry) => {
        const result = await APIClient.getRecipe(recipeEntry.id, false);
        if (APIClient.isSuccess(result)) {
          return {
            ...result.data,
            menuAmount: recipeEntry.amount,
            menuUnit: recipeEntry.unit
          };
        }
        return null;
      });

      const recipes = (await Promise.all(recipePromises)).filter(r => r !== null);

      if (recipes.length === 0) {
        return null;
      }

      // Aggregate with scaling
      const totals = {};
      let totalOxalates = 0;

      recipes.forEach(recipe => {
        // Calculate scaling factor
        const scalingFactor = this.calculateRecipeScalingFactor(recipe);

        // Scale totals
        for (const [nutrient, value] of Object.entries(recipe.totals || {})) {
          if (!totals[nutrient]) {
            totals[nutrient] = 0;
          }
          totals[nutrient] += value * scalingFactor;
        }

        // Scale oxalates
        totalOxalates += (recipe.oxalateMg || 0) * scalingFactor;
      });

      return {
        totals,
        oxalateMg: totalOxalates
      };
    } catch (error) {
      console.error('Error calculating menu totals:', error);
      return null;
    }
  }
  /**
 * Calculate scaling factor for a recipe in menu preview
 * ENCAPSULATED: Can be replaced with backend calculation
 */
  calculateRecipeScalingFactor(recipe) {
    // Calculate recipe's default total weight
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
 * Calculate total weight of recipe ingredients
 * ENCAPSULATED: Matches MenuManager logic
 */
  calculateRecipeTotalWeight(recipe) {
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      return 100; // Default fallback
    }

    const totalGrams = recipe.ingredients.reduce((sum, ingredient) => {
      let amountInGrams = parseFloat(ingredient.amount) || 0;

      if (ingredient.unit === 'ml') {
        amountInGrams = amountInGrams * 1;
      } else if (ingredient.unit === 'mg') {
        amountInGrams = amountInGrams / 1000;
      } else if (ingredient.unit === 'mcg') {
        amountInGrams = amountInGrams / 1000000;
      }

      return sum + amountInGrams;
    }, 0);

    return totalGrams;
  }

  /**
   * Calculate daily plan totals from selected menus (using backend)
   */
  async calculateDailyPlanTotals(selectedMenus) {
    if (!selectedMenus || selectedMenus.length === 0) {
      return null;
    }

    try {
      const menuIds = selectedMenus.map(m => m.menuId);
      const result = await APIClient.previewDailyPlan(menuIds);

      if (APIClient.isSuccess(result)) {
        return result.data;
      }

      console.error('Error calculating daily plan totals:', APIClient.getError(result));
      return null;
    } catch (error) {
      console.error('Error calculating daily plan totals:', error);
      return null;
    }
  }

  /**
   * Render key nutrients preview
   */
  renderKeyNutrients(data, userSettings, dailyRequirements, calculateOxalateRisk, nutrientMetadataManager) {
    const calories = data.totals.calories || 0;
    const caloriesPercent = ((calories / userSettings.caloriesPerDay) * 100).toFixed(1);

    const sodium = data.totals.sodium || 0;
    const sodiumReq = parseFloat(dailyRequirements['sodium']?.maximum) || 2300;
    const sodiumPercent = ((sodium / sodiumReq) * 100).toFixed(1);

    const oxalates = data.oxalateMg || 0;
    const oxalateRisk = calculateOxalateRisk(oxalates);
    const oxalatesPercent = oxalateRisk.percent.toFixed(1);

    let html = '<table class="preview-table">';
    html += `<tr><td class="preview-nutrient-name">Calories</td><td class="preview-nutrient-value">${calories.toFixed(0)} (${caloriesPercent}%)</td></tr>`;
    html += `<tr><td class="preview-nutrient-name">Sodium</td><td class="preview-nutrient-value">${sodium.toFixed(0)} mg (${sodiumPercent}%)</td></tr>`;
    html += `<tr><td class="preview-nutrient-name">Oxalates</td><td class="preview-nutrient-value" style="color: ${oxalateRisk.color}">${oxalates.toFixed(1)} mg (${oxalatesPercent}%)</td></tr>`;
    html += '</table>';

    if (oxalateRisk.message) {
      html += `<div class="oxalate-warning" style="margin-top: 1rem;">${oxalateRisk.message}</div>`;
    }

    return html;
  }

  /**
   * Render all nutrients preview with pagination
   */
  renderAllNutrients(data, userSettings, dailyRequirements, currentPage, nutrientMetadataManager) {
    const allNutrients = Object.keys(data.totals).filter(key => data.totals[key] > 0);

    if (allNutrients.length === 0) {
      return '<p class="preview-empty">No nutrients to display</p>';
    }

    const startIdx = currentPage * this.NUTRIENTS_PER_PAGE;
    const endIdx = Math.min(startIdx + this.NUTRIENTS_PER_PAGE, allNutrients.length);
    const pageNutrients = allNutrients.slice(startIdx, endIdx);
    const totalPages = Math.ceil(allNutrients.length / this.NUTRIENTS_PER_PAGE);

    let html = '';

    if (totalPages > 1) {
      html += '<div class="pagination-controls">';
      html += `<button type="button" class="btn btn-secondary btn-small" data-action="prev-recipe-preview-nutrient-page" ${currentPage === 0 ? 'disabled' : ''}>← Prev</button>`;
      html += `<span class="page-info">Page ${currentPage + 1} of ${totalPages}</span>`;
      html += `<button type="button" class="btn btn-secondary btn-small" data-action="next-recipe-preview-nutrient-page" ${currentPage >= totalPages - 1 ? 'disabled' : ''}>Next →</button>`;
      html += '</div>';
    }

    html += '<table class="preview-table">';

    pageNutrients.forEach(nutrient => {
      const value = data.totals[nutrient];
      const displayName = nutrientMetadataManager.getDisplayName(nutrient);
      let formattedValue = nutrientMetadataManager.formatValue(nutrient, value);
      let percentDaily = '';

      if (nutrient === 'calories') {
        const percent = ((value / userSettings.caloriesPerDay) * 100).toFixed(1);
        percentDaily = ` (${percent}%)`;
      } else if (dailyRequirements[nutrient]) {
        const req = dailyRequirements[nutrient];
        const dailyValue = parseFloat(req.recommended || req.maximum);
        if (dailyValue) {
          const percent = ((value / dailyValue) * 100).toFixed(1);
          percentDaily = ` (${percent}%)`;
        }
      }

      html += `<tr><td class="preview-nutrient-name">${displayName}</td><td class="preview-nutrient-value">${formattedValue}${percentDaily}</td></tr>`;
    });

    html += '</table>';

    return html;
  }
}
