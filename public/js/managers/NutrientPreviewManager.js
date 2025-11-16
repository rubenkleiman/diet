/**
 * Nutrient Preview Manager
 * Calculates and renders nutritional previews for editors
 */

import { APIClient } from '../core/APIClient.js';

export class NutrientPreviewManager {
  constructor() {
    this.NUTRIENTS_PER_PAGE = 5;
    this.ingredientCache = new Map(); // Cache ingredient data to avoid duplicate API calls
  }

  /**
   * Calculate recipe totals from selected ingredients
   */
  async calculateRecipeTotals(selectedIngredients) {
    if (!selectedIngredients || selectedIngredients.length === 0) {
      return null;
    }

    const totals = {};
    let totalOxalates = 0;

    // Fetch each ingredient's details and scale by amount
    for (const ing of selectedIngredients) {
      try {
        // Check cache first
        let ingredientData;
        if (this.ingredientCache.has(ing.brandId)) {
          ingredientData = this.ingredientCache.get(ing.brandId);
        } else {
          const result = await APIClient.getIngredient(ing.brandId);
          if (!APIClient.isSuccess(result)) continue;
          ingredientData = result.data;
          this.ingredientCache.set(ing.brandId, ingredientData);
        }

        const amountInGrams = this.convertToGrams(ing.amount, ing.unit, ingredientData);

        // Scale nutrients
        const scaleFactor = amountInGrams / ingredientData.gramsPerServing;
        
        for (const [key, value] of Object.entries(ingredientData.data)) {
          if (value === null || value === undefined) continue;
          
          const numValue = this.extractNumericValue(value);
          if (numValue !== null) {
            totals[key] = (totals[key] || 0) + (numValue * scaleFactor);
          }
        }

        // Add oxalates
        totalOxalates += (ingredientData.oxalatePerGram * amountInGrams);
      } catch (error) {
        console.error('Error fetching ingredient:', error);
      }
    }

    return {
      totals,
      oxalateMg: totalOxalates
    };
  }

  /**
   * Calculate menu totals from selected recipes
   */
  async calculateMenuTotals(selectedRecipes) {
    if (!selectedRecipes || selectedRecipes.length === 0) {
      return null;
    }

    const totals = {};
    let totalOxalates = 0;

    // Fetch each recipe's summary
    for (const recipe of selectedRecipes) {
      try {
        const result = await APIClient.getRecipe(recipe.id, true);
        if (!APIClient.isSuccess(result)) continue;

        const data = result.data;

        // Aggregate totals
        for (const [key, value] of Object.entries(data.totals || {})) {
          totals[key] = (totals[key] || 0) + value;
        }

        totalOxalates += (data.oxalateMg || 0);
      } catch (error) {
        console.error('Error fetching recipe:', error);
      }
    }

    return {
      totals,
      oxalateMg: totalOxalates
    };
  }

  /**
   * Helper: Convert units to grams
   */
  convertToGrams(amount, unit, ingredientData) {
    if (unit === 'g') return amount;
    if (unit === 'mg') return amount / 1000;
    if (unit === 'mcg') return amount / 1000000;
    if (unit === 'ml') {
      const density = ingredientData.density || 1;
      return amount * density;
    }
    return amount;
  }

  /**
   * Helper: Extract numeric value from string like "450 mg"
   */
  extractNumericValue(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const match = value.match(/^([\d.]+)/);
      return match ? parseFloat(match[1]) : null;
    }
    return null;
  }

  /**
   * Render key nutrients preview
   */
  renderKeyNutrients(data, userSettings, dailyRequirements, calculateOxalateRisk) {
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
  renderAllNutrients(data, userSettings, dailyRequirements, currentPage, INGREDIENT_PROPS) {
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
      let formattedValue = typeof value === 'number' ? value.toFixed(2) : value;
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

      if (nutrient !== 'calories') {
        const unit = INGREDIENT_PROPS[nutrient]?.unit;
        if (unit && unit !== 'none') {
          formattedValue = `${formattedValue} ${unit}`;
        }
      }

      html += `<tr><td class="preview-nutrient-name">${nutrient}</td><td class="preview-nutrient-value">${formattedValue}${percentDaily}</td></tr>`;
    });

    html += '</table>';

    return html;
  }

  /**
   * Clear the ingredient cache
   */
  clearCache() {
    this.ingredientCache.clear();
  }
}