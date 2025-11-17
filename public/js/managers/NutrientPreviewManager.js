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
   */
  async calculateMenuTotals(selectedRecipes) {
    if (!selectedRecipes || selectedRecipes.length === 0) {
      return null;
    }

    try {
      const recipeIds = selectedRecipes.map(r => r.id);
      const result = await APIClient.previewMenu(recipeIds);
      
      if (APIClient.isSuccess(result)) {
        return result.data;
      }
      
      console.error('Error calculating menu totals:', APIClient.getError(result));
      return null;
    } catch (error) {
      console.error('Error calculating menu totals:', error);
      return null;
    }
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
