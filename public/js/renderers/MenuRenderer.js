/**
 * Menu Renderer
 * Handles all menu-related UI rendering
 */

import { State } from '../core/State.js';
import { dietaryAssessmentHelper } from '../utils/DietaryAssessmentHelper.js';
import { ListRenderer } from '../utils/ListRenderer.js';

export class MenuRenderer {

  /**
   * Render menu list (using ListRenderer helper)
   */
  static renderList(menus, onSelect) {
    ListRenderer.render({
      items: menus,
      containerId: 'menuList',
      itemClass: 'menu-item',
      dataAttribute: 'menuId',
      action: 'select-menu',
      renderItem: (menu) => {
        const recipeCount = menu.recipes?.length || menu.recipeIds?.length || 0;
        return `
          <span class="menu-name">${menu.name}</span>
          <span class="menu-meta">
            <span class="menu-recipe-count">${recipeCount} recipes</span>
          </span>
        `;
      },
      emptyMessage: 'No menus found'
    });
  }

  /**
   * Mark menu as selected (using ListRenderer helper)
   */
  static markAsSelected(menuId) {
    ListRenderer.markAsSelected('menu-item', 'menuId', menuId);
  }

  /**
   * Update menu item with summary data
   */
  static updateMenuItemWithSummary(menuId, summaryData, calculateOxalateRisk) {
    const item = document.querySelector(`[data-menu-id="${menuId}"]`);
    if (!item || !summaryData) return;

    const userSettings = State.get('userSettings');
    const calories = summaryData.totals.calories || 0;
    const caloriesPercent = ((calories / userSettings.caloriesPerDay) * 100).toFixed(0);
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

    // Re-apply selected class if needed
    const selectedMenuId = State.get('selectedMenuId');
    if (menuId === selectedMenuId) {
      item.classList.add('selected');
    }
  }

  /**
   * Render menu details (async - fetches dietary assessment)
   */
  static async renderDetails(data, options = {}) {
    const {
      dailyRequirements,
      userSettings,
      calculateOxalateRisk,
      INGREDIENT_PROPS
    } = options;

    const section = document.getElementById('menuDetailsSection');
    const title = document.getElementById('menuDetailsTitle');
    const content = document.getElementById('menuDetailsContent');

    if (!section || !title || !content) return;

    title.textContent = `Menu: ${data.menuName}`;

    // Show loading state
    content.innerHTML = '<div class="details-content"><p>Loading dietary assessment...</p></div>';
    section.style.display = 'block';

    try {
      // Fetch dietary assessment from backend
      const assessment = await dietaryAssessmentHelper.getAssessment(
        data.totals,
        data.oxalateMg,
        'menu'
      );

      // Now render with assessment data
      let html = '<div class="details-content">';

      // 1. Recipe List (AT TOP) - NOW WITH AMOUNTS
      html += this.renderRecipeList(data);

      // 2. Dietary Assessment
      html += this.renderDietaryAssessment(assessment);

      // 3. Nutritional Totals (AT BOTTOM)
      html += this.renderNutritionalTotals(data, {
        dailyRequirements,
        userSettings,
        INGREDIENT_PROPS
      });

      html += '</div>';
      content.innerHTML = html;

    } catch (error) {
      console.error('Error loading dietary assessment:', error);
      // Show error prominently
      content.innerHTML = `
        <div class="details-content">
          ${dietaryAssessmentHelper.renderError(error)}
        </div>
      `;
    }
  }

  /**
   * Render dietary assessment section (from backend)
   */
  static renderDietaryAssessment(assessment) {
    let html = '<div class="details-section">';
    html += '<h3>Dietary Assessment</h3>';
    html += dietaryAssessmentHelper.renderAssessment(assessment, { showProgressBar: true });
    html += '</div>';
    return html;
  }

  /**
   * Render recipe list section - NOW WITH AMOUNTS
   */
  static renderRecipeList(data) {
    let html = '<div class="details-section">';
    html += '<h3>Recipes in this Menu</h3>';
    html += '<ul class="menu-recipe-list">';

    data.recipes.forEach(recipe => {
      const calories = recipe.totals?.calories || 0;
      const oxalates = recipe.oxalateMg || 0;

      // Display the amount from menu
      const amount = recipe.menuAmount || '100';
      const unit = recipe.menuUnit || 'g';

      html += `
        <li class="menu-recipe-item">
          <span class="recipe-name">${recipe.name}</span>
          <span class="recipe-stats">
            <span class="recipe-amount">${amount}${unit}</span>
            <span>${calories.toFixed(0)} cal</span>
            <span>${oxalates.toFixed(1)}mg ox</span>
          </span>
        </li>
      `;
    });

    html += '</ul>';
    html += '</div>';

    return html;
  }

  /**
   * Render nutritional totals section
   */
  static renderNutritionalTotals(data, options) {
    const { dailyRequirements, userSettings, INGREDIENT_PROPS } = options;

    let html = '<div class="details-section contribution-section">';
    html += '<h3>Nutritional Totals</h3>';
    html += '<div><i>Combined nutrition from all recipes (% of Daily Requirement)</i></div><br/>';
    html += '<div class="table-scroll">';
    html += '<table class="contribution-table">';
    html += '<thead><tr>';
    html += '<th>Nutrient</th>';
    html += '<th>Amount</th>';
    html += '<th>% Daily</th>';
    html += '</tr></thead>';
    html += '<tbody>';

    for (const [key, value] of Object.entries(data.totals)) {
      if (value === 0 && key !== 'oxalates') continue;

      let formattedValue = typeof value === 'number' ? value.toFixed(2) : value;
      let percentDaily = '';

      if (key === 'calories') {
        const percent = ((value / userSettings.caloriesPerDay) * 100).toFixed(1);
        percentDaily = `${percent}%`;
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
          percentDaily = `${percent}%`;
        }
      }

      if (key !== 'calories') {
        const unit = INGREDIENT_PROPS[key]?.unit;
        if (unit && unit !== 'none') {
          formattedValue = `${formattedValue} ${unit}`;
        }
      }

      html += '<tr>';
      html += `<td class="nutrient-name">${key}</td>`;
      html += `<td class="ing-amount">${formattedValue}</td>`;
      html += `<td class="ing-amount">${percentDaily}</td>`;
      html += '</tr>';
    }

    html += '</tbody></table>';
    html += '</div>';
    html += '</div>';

    return html;
  }

  /**
   * Show error message in menu details
   */
  static showError(message) {
    const content = document.getElementById('menuDetailsContent');
    if (content) {
      content.innerHTML = `<div class="error-message">${message}</div>`;
      const section = document.getElementById('menuDetailsSection');
      if (section) section.style.display = 'block';
    }
  }
  /**
   * Render selected recipes for menu editor - NOW WITH AMOUNTS
   */
  static renderSelectedRecipes(recipes, onUpdate, onRemove) {
    const container = document.getElementById('recipeRows');
    if (!container) return;

    if (recipes.length === 0) {
      container.innerHTML = '<div class="no-recipes-message">No recipes added yet</div>';
      return;
    }

    const fragment = document.createDocumentFragment();

    recipes.forEach((recipe, index) => {
      const row = document.createElement('div');
      row.className = 'recipe-row';
      row.dataset.index = index;

      // Recipe name
      const nameSpan = document.createElement('span');
      nameSpan.className = 'recipe-name';
      nameSpan.title = recipe.name;
      nameSpan.textContent = recipe.name;

      // Amount input - 🎯 FIXED: Up to 1 decimal, no required decimal point
      const amountInput = document.createElement('input');
      amountInput.type = 'number';
      amountInput.className = 'amount-input';
      amountInput.value = recipe.amount;
      amountInput.min = '0.1';
      amountInput.step = '0.1'; // ✅ Changed from 0.01 to 0.1
      amountInput.dataset.index = index;
      amountInput.placeholder = '100';
      // Remove the default decimal formatting requirement
      amountInput.setAttribute('lang', 'en');

      // Unit select
      const unitSelect = document.createElement('select');
      unitSelect.className = 'unit-select';
      unitSelect.dataset.index = index;
      unitSelect.innerHTML = `
      <option value="g" ${recipe.unit === 'g' ? 'selected' : ''}>g</option>
      <option value="ml" ${recipe.unit === 'ml' ? 'selected' : ''}>ml</option>
    `;

      // Reset button
      const resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'btn btn-secondary btn-small reset-amount-btn';
      resetBtn.dataset.index = index;
      resetBtn.title = 'Reset to default amount';
      resetBtn.textContent = '↻';

      // Remove button
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'remove-btn';
      removeBtn.dataset.action = 'remove-recipe';
      removeBtn.dataset.index = index;
      removeBtn.title = 'Remove recipe';
      removeBtn.innerHTML = '&times;';

      row.appendChild(nameSpan);
      row.appendChild(amountInput);
      row.appendChild(unitSelect);
      row.appendChild(resetBtn);
      row.appendChild(removeBtn);

      if (onUpdate) {
        amountInput.addEventListener('change', () => {
          onUpdate.amount(index, amountInput.value);
        });

        unitSelect.addEventListener('change', () => {
          onUpdate.unit(index, unitSelect.value);
        });
      }

      fragment.appendChild(row);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
  }

  /**
   * Render recipe search results
   */
  static renderRecipeSearchResults(results, selectedRecipes, onAdd) {
    const resultsContainer = document.getElementById('recipeSearchResults');
    if (!resultsContainer) return;

    if (results.length === 0) {
      resultsContainer.innerHTML = '<div class="search-result-item">No recipes found</div>';
      resultsContainer.classList.add('show');
      return;
    }

    const html = results.map(recipe => {
      const alreadyAdded = selectedRecipes.some(r => r.id == recipe.id);
      const classes = `search-result-item${alreadyAdded ? ' selected' : ''}`;
      const cursor = alreadyAdded ? 'not-allowed' : 'pointer';
      const opacity = alreadyAdded ? '0.5' : '1';
      const action = alreadyAdded ? '' : 'data-action="add-recipe-to-menu"';
      const title = alreadyAdded ? 'Already added' : '';

      return `
        <div class="${classes}"
             data-recipe-id="${recipe.id}"
             data-recipe-name="${recipe.name}"
             style="cursor: ${cursor}; opacity: ${opacity}"
             title="${title}"
             ${action}>
          ${recipe.name}
        </div>
      `;
    }).join('');

    resultsContainer.innerHTML = html;
    resultsContainer.classList.add('show');
  }

  /**
   * Hide recipe search results
   */
  static hideRecipeSearchResults() {
    const resultsContainer = document.getElementById('recipeSearchResults');
    if (resultsContainer) {
      resultsContainer.classList.remove('show');
    }
  }
}