/**
 * Recipe Renderer
 * Handles all recipe-related UI rendering
 */

import { State } from '../core/State.js';

export class RecipeRenderer {

  /**
   * Render recipe list
   */
  static renderList(recipes, onSelect) {
    const listElement = document.getElementById('recipeList');
    if (!listElement) return;

    listElement.innerHTML = '';

    if (recipes.length === 0) {
      listElement.innerHTML = '<li class="no-results">No recipes found</li>';
      return;
    }

    recipes.forEach(recipe => {
      const li = document.createElement('li');
      li.className = 'recipe-item';
      li.dataset.recipeId = recipe.id;
      li.dataset.action = 'select-recipe';
      li.textContent = recipe.name;

      listElement.appendChild(li);
    });
  }

  /**
   * Update recipe item with summary data (calories and oxalates)
   */
  static updateRecipeItemWithSummary(recipeId, summaryData, calculateOxalateRisk) {
    const item = document.querySelector(`[data-recipe-id="${recipeId}"]`);
    if (!item || !summaryData) return;

    const userSettings = State.get('userSettings');
    const calories = summaryData.totals.calories || 0;
    const caloriesPercent = ((calories / userSettings.caloriesPerDay) * 100).toFixed(0);
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

    // Re-apply selected class if needed
    const selectedRecipeId = State.get('selectedRecipeId');
    if (recipeId === selectedRecipeId) {
      item.classList.add('selected');
    }
  }

  /**
   * Mark recipe as selected
   */
  static markAsSelected(recipeId) {
    document.querySelectorAll('.recipe-item').forEach(item => {
      item.classList.remove('selected');
    });

    const selectedItem = document.querySelector(`[data-recipe-id="${recipeId}"]`);
    if (selectedItem) {
      selectedItem.classList.add('selected');
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

    const section = document.getElementById('recipeDetailsSection');
    const title = document.getElementById('recipeDetailsTitle');
    const content = document.getElementById('recipeDetailsContent');

    if (!section || !title || !content) return;

    title.textContent = `Recipe: ${data.name}`;

    let html = '<div class="details-content">';

    // Dietary Assessment
    html += this.renderDietaryAssessment(data, calculateOxalateRisk);

    // Ingredient Contributions
    if (data.ingredients && data.ingredients.length > 0) {
      html += this.renderIngredientContributions(data, {
        showAllNutrients,
        currentNutrientPage,
        calculateContributions,
        dailyRequirements,
        NUTRIENTS_PER_PAGE
      });
    }

    // Nutritional Totals
    html += this.renderNutritionalTotals(data, {
      dailyRequirements,
      userSettings,
      INGREDIENT_PROPS
    });

    // Ingredient Details
    html += this.renderIngredientDetails(data);

    html += '</div>';
    content.innerHTML = html;
    section.style.display = 'block';
  }

  /**
   * Render nutritional totals section
   */
  static renderNutritionalTotals(data, options) {
    const { dailyRequirements, userSettings, INGREDIENT_PROPS } = options;

    let html = '<div class="details-section">';
    html += '<h3>Nutritional Totals</h3>';
    html += '<div><i>Nutrient Amount (% of Daily Requirement)</i></div>';
    html += '<table class="nutrition-table">';

    for (const [key, value] of Object.entries(data.totals)) {
      if (value === 0 && key !== 'oxalates') continue;

      let formattedValue = typeof value === 'number' ? value.toFixed(2) : value;
      let percentDaily = '';

      if (key === 'calories') {
        const percent = ((value / userSettings.caloriesPerDay) * 100).toFixed(1);
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
          const percent = ((value / dailyValue) * 100).toFixed(1);
          percentDaily = ` (${percent}%)`;
        }
      }

      if (key !== 'calories') {
        const unit = INGREDIENT_PROPS[key]?.unit;
        if (unit && unit !== 'none') {
          formattedValue = `${formattedValue} ${unit}`;
        }
      }

      html += `<tr><td class="nutrient-name">${key}</td><td class="nutrient-value">${formattedValue}${percentDaily}</td></tr>`;
    }

    html += '</table>';
    html += '</div>';

    return html;
  }

  /**
   * Render dietary assessment section
   */
  static renderDietaryAssessment(data, calculateOxalateRisk) {
    const oxalateRisk = calculateOxalateRisk(data.oxalateMg);

    let html = '<div class="details-section">';
    html += '<h3>Dietary Assessment</h3>';
    const color = {Excellent: "green", Good: "green", Fair: "brown", Poor: "red"};
    html += `<p style="color:${color[data.dashAdherence]}"><strong>DASH Adherence:</strong> ${data.dashAdherence} </p>`;
    html += `<p><strong>Reasons:</strong> ${data.dashReasons}</p>`;
    html += `<p><strong>Oxalate Level:</strong> <span style="color: ${oxalateRisk.color}; font-weight: bold;">${data.oxalateLevel}</span> (${data.oxalateMg.toFixed(2)} mg)</p>`;

    if (oxalateRisk.message) {
      html += `<div class="oxalate-warning" style="border-left-color: ${oxalateRisk.color};">${oxalateRisk.message}</div>`;
    }

    html += '</div>';

    return html;
  }

  /**
   * Render ingredient details section
   */
  static renderIngredientDetails(data) {
    if (!data.ingredients) return '';

    let html = '<div class="details-section">';
    html += '<h3>Ingredient Details</h3>';

    for (const ingredient of data.ingredients) {
      html += `<div class="ingredient-detail">`;
      html += `<h4>${ingredient.name} (${ingredient.amount.toFixed(1)}g)</h4>`;
      html += '<table class="nutrition-table">';

      for (const [key, value] of Object.entries(ingredient.nutritionScaled)) {
        if (value === 0 && key !== 'oxalates') continue;

        const formattedValue = typeof value === 'number' ? value.toFixed(2) : value;
        html += `<tr><td class="nutrient-name">${key}</td><td class="nutrient-value">${formattedValue}</td></tr>`;
      }

      html += '</table>';
      html += '</div>';
    }

    html += '</div>';

    return html;
  }

  /**
   * Render ingredient contributions table
   */
  static renderIngredientContributions(data, options) {
    const { showAllNutrients, calculateContributions } = options;

    let html = '<div class="details-section contribution-section">';
    html += '<div class="contribution-header">';
    html += '<h3>Ingredient Contribution</h3>';
    html += '<button class="btn btn-secondary btn-small" data-action="toggle-nutrient-view">';
    html += showAllNutrients ? 'Show Key Nutrients' : 'Show All Nutrients';
    html += '</button>';
    html += '</div>';
    html += "<div><i>Displays each nutrient's quantity and its percent contribution towards the recipe's content. Totals show the total nutrition quantity and the percent of the recommended daily requirements.</i></div><br/>"

    const contributions = calculateContributions(data);

    if (showAllNutrients) {
      html += this.renderAllNutrientsTable(contributions, data, options);
    } else {
      html += this.renderKeyNutrientsTable(contributions, data, options);
    }

    html += '</div>';

    return html;
  }

  /**
   * Render key nutrients table
   */
  static renderKeyNutrientsTable(contributions, data, options) {
    const { dailyRequirements } = options;

    let html = '<table class="contribution-table">';
    html += '<thead><tr>';
    html += '<th>Ingredient</th>';
    html += '<th>Amount</th>';
    html += '<th>Calories</th>';
    html += '<th>Sodium</th>';
    html += '<th>Oxalates</th>';
    html += '</tr></thead>';
    html += '<tbody>';

    data.ingredients.forEach(ingredient => {
      const contrib = contributions[ingredient.name];
      html += '<tr>';
      html += `<td class="ing-name">${ingredient.name}</td>`;
      html += `<td class="ing-amount">${ingredient.amount.toFixed(1)}g</td>`;

      const cal = contrib.nutrients.calories || { value: 0, percent: 0 };
      html += `<td>${cal.value.toFixed(0)} (${cal.percent.toFixed(0)}%)</td>`;

      const sodium = contrib.nutrients.sodium || { value: 0, percent: 0 };
      html += `<td>${sodium.value.toFixed(1)}mg (${sodium.percent.toFixed(0)}%)</td>`;

      const ox = contrib.nutrients.oxalates || { value: 0, percent: 0 };
      html += `<td>${ox.value.toFixed(2)}mg (${ox.percent.toFixed(0)}%)</td>`;

      html += '</tr>';
    });

    // Totals row
    html += '<tr class="totals-row">';
    html += '<td colspan="2"><strong>Total:</strong></td>';

    let totalCalories = Math.round(data.totals.calories || 0);
    const calReq = parseFloat(dailyRequirements['calories']?.recommended);
    if (!isNaN(calReq)) {
      totalCalories = `${totalCalories} (${Math.round((totalCalories / calReq) * 100)}%)`;
    }

    let totalSodium = Math.round(data.totals.sodium || 0);
    const sodReq = parseFloat(dailyRequirements['sodium']?.recommended);
    totalSodium = isNaN(sodReq) ? `${totalSodium} mg` : `${totalSodium} (${Math.round((totalSodium / sodReq) * 100)}%)`;

    const oxMax = parseFloat(dailyRequirements['oxalates']?.maximum);
    let totalOxalates = Math.round(data.oxalateMg || 0);
    totalOxalates = isNaN(oxMax) ? `${totalOxalates} mg` : `${totalOxalates} mg (${Math.round((totalOxalates / oxMax) * 100)}%)`;

    html += `<td><strong>${totalCalories}</strong></td>`;
    html += `<td><strong>${totalSodium}</strong></td>`;
    html += `<td><strong>${totalOxalates}</strong></td>`;
    html += '</tr>';

    html += '</tbody></table>';

    return html;
  }

  /**
   * Render all nutrients table with pagination
   */
  static renderAllNutrientsTable(contributions, data, options) {
    const { currentNutrientPage, NUTRIENTS_PER_PAGE, dailyRequirements, userSettings } = options;

    const allNutrients = new Set();
    Object.values(contributions).forEach(contrib => {
      Object.keys(contrib.nutrients).forEach(nutrient => {
        allNutrients.add(nutrient);
      });
    });

    const activeNutrients = Array.from(allNutrients).filter(nutrient => {
      return Object.values(contributions).some(contrib => {
        const val = contrib.nutrients[nutrient];
        return val && val.value > 0;
      });
    });

    const startIdx = currentNutrientPage * NUTRIENTS_PER_PAGE;
    const endIdx = Math.min(startIdx + NUTRIENTS_PER_PAGE, activeNutrients.length);
    const pageNutrients = activeNutrients.slice(startIdx, endIdx);
    const totalPages = Math.ceil(activeNutrients.length / NUTRIENTS_PER_PAGE);

    let html = '';

    if (totalPages > 1) {
      html += '<div class="pagination-controls">';
      html += `<button class="btn btn-secondary btn-small" data-action="prev-nutrient-page" ${currentNutrientPage === 0 ? 'disabled' : ''}>← Prev</button>`;
      html += `<span class="page-info">Page ${currentNutrientPage + 1} of ${totalPages}</span>`;
      html += `<button class="btn btn-secondary btn-small" data-action="next-nutrient-page" ${currentNutrientPage >= totalPages - 1 ? 'disabled' : ''}>Next →</button>`;
      html += '</div>';
    }

    html += '<div class="table-scroll">';
    html += '<table class="contribution-table">';
    html += '<thead><tr>';
    html += '<th>Ingredient</th>';
    html += '<th>Amount</th>';

    pageNutrients.forEach(nutrient => {
      html += `<th>${nutrient.replace(/_/g, ' ')}</th>`;
    });

    html += '</tr></thead>';
    html += '<tbody>';

    data.ingredients.forEach(ingredient => {
      const contrib = contributions[ingredient.name];
      html += '<tr>';
      html += `<td class="ing-name">${ingredient.name}</td>`;
      html += `<td class="ing-amount">${ingredient.amount.toFixed(1)}g</td>`;

      pageNutrients.forEach(nutrient => {
        const n = contrib.nutrients[nutrient] || { value: 0, percent: 0 };
        if (nutrient === 'calories') {
          html += `<td>${n.value.toFixed(0)} (${n.percent.toFixed(0)}%)</td>`;
        } else {
          html += `<td>${n.value.toFixed(1)} (${n.percent.toFixed(0)}%)</td>`;
        }
      });

      html += '</tr>';
    });

    html += '<tr class="totals-row">';
    html += '<td colspan="2"><strong>Total:</strong></td>';

    pageNutrients.forEach(nutrient => {
      const total = data.totals[nutrient] || 0;
      let formattedValue = '';
      let percentDaily = '';

      // Calculate percentage of daily requirement
      if (nutrient === 'calories') {
        formattedValue = total.toFixed(0);
        const userSettings = State.get('userSettings');
        const percent = ((total / userSettings.caloriesPerDay) * 100).toFixed(1);
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
          const percent = ((total / dailyValue) * 100).toFixed(1);
          percentDaily = ` (${percent}%)`;
        }
      } else {
        // No daily requirement data available
        formattedValue = total.toFixed(1);
      }

      html += `<td><strong>${formattedValue}${percentDaily}</strong></td>`;
    });

    html += '</tr>';
    html += '</tbody></table>';
    html += '</div>';

    return html;
  }

  /**
   * Show error message in recipe details
   */
  static showError(message) {
    const content = document.getElementById('recipeDetailsContent');
    if (content) {
      content.innerHTML = `<div class="error-message">${message}</div>`;
      const section = document.getElementById('recipeDetailsSection');
      if (section) section.style.display = 'block';
    }
  }
}
