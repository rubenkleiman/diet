/**
 * Menu Renderer
 * Handles all menu-related UI rendering
 */

import { State } from '@core/State.js';

export class MenuRenderer {
  
  /**
   * Render menu list
   */
  static renderList(menus, onSelect) {
    const listElement = document.getElementById('menuList');
    if (!listElement) return;

    listElement.innerHTML = '';

    if (menus.length === 0) {
      listElement.innerHTML = '<li class="no-results">No menus found</li>';
      return;
    }

    menus.forEach(menu => {
      const li = document.createElement('li');
      li.className = 'menu-item';
      li.dataset.menuId = menu.id;
      li.dataset.action = 'select-menu';
      li.innerHTML = `
        <span class="menu-name">${menu.name}</span>
        <span class="menu-meta">
          <span class="menu-recipe-count">${menu.recipeIds.length} recipes</span>
        </span>
      `;

      listElement.appendChild(li);
    });

    // Add click handler using event delegation
    listElement.addEventListener('click', (e) => {
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
   * Mark menu as selected
   */
  static markAsSelected(menuId) {
    document.querySelectorAll('.menu-item').forEach(item => {
      item.classList.remove('selected');
    });

    const selectedItem = document.querySelector(`[data-menu-id="${menuId}"]`);
    if (selectedItem) {
      selectedItem.classList.add('selected');
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

    const section = document.getElementById('menuDetailsSection');
    const title = document.getElementById('menuDetailsTitle');
    const content = document.getElementById('menuDetailsContent');

    if (!section || !title || !content) return;

    title.textContent = `Menu: ${data.menuName}`;

    let html = '<div class="details-content">';

    // Dietary Assessment
    html += this.renderDietaryAssessment(data, calculateOxalateRisk);

    // Recipe List
    html += this.renderRecipeList(data);

    // Nutritional Totals
    html += this.renderNutritionalTotals(data, {
      dailyRequirements,
      userSettings,
      INGREDIENT_PROPS
    });

    html += '</div>';
    content.innerHTML = html;
    section.style.display = 'block';
  }

  /**
   * Render dietary assessment section
   */
  static renderDietaryAssessment(data, calculateOxalateRisk) {
    const oxalateRisk = calculateOxalateRisk(data.oxalateMg);

    let html = '<div class="details-section">';
    html += '<h3>Dietary Assessment</h3>';
    html += `<p><strong>DASH Adherence:</strong> ${data.dashAdherence}</p>`;
    html += `<p><strong>Reasons:</strong> ${data.dashReasons || 'N/A'}</p>`;
    html += `<p><strong>Oxalate Level:</strong> <span style="color: ${oxalateRisk.color}; font-weight: bold;">${data.oxalateLevel}</span> (${data.oxalateMg.toFixed(2)} mg)</p>`;

    if (oxalateRisk.message) {
      html += `<div class="oxalate-warning" style="border-left-color: ${oxalateRisk.color};">${oxalateRisk.message}</div>`;
    }

    html += '</div>';

    return html;
  }

  /**
   * Render recipe list section
   */
  static renderRecipeList(data) {
    let html = '<div class="details-section">';
    html += '<h3>Recipes in this Menu</h3>';
    html += '<ul class="menu-recipe-list">';

    data.recipes.forEach(recipe => {
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

    html += '</ul>';
    html += '</div>';

    return html;
  }

  /**
   * Render nutritional totals section
   */
  static renderNutritionalTotals(data, options) {
    const { dailyRequirements, userSettings, INGREDIENT_PROPS } = options;

    let html = '<div class="details-section">';
    html += '<h3>Nutritional Totals</h3>';
    html += '<div><i>Combined nutrition from all recipes (% of Daily Requirement)</i></div>';
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
   * Render selected recipes for menu editor
   */
  static renderSelectedRecipes(recipes, onRemove) {
    const container = document.getElementById('recipeRows');
    if (!container) return;

    if (recipes.length === 0) {
      container.innerHTML = '<div class="no-recipes-message">No recipes added yet</div>';
      return;
    }

    container.innerHTML = '';

    recipes.forEach((recipe, index) => {
      const row = document.createElement('div');
      row.className = 'recipe-row';
      row.dataset.index = index;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'recipe-name';
      nameSpan.title = recipe.name;
      nameSpan.textContent = recipe.name;

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'remove-btn';
      removeBtn.dataset.action = 'remove-recipe';
      removeBtn.dataset.index = index;
      removeBtn.title = 'Remove recipe';
      removeBtn.innerHTML = '&times;';

      row.appendChild(nameSpan);
      row.appendChild(removeBtn);

      container.appendChild(row);
    });
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

    resultsContainer.innerHTML = '';

    results.forEach(recipe => {
      const alreadyAdded = selectedRecipes.some(r => r.id === recipe.id);

      const item = document.createElement('div');
      item.className = 'search-result-item';
      if (alreadyAdded) item.classList.add('selected');
      item.textContent = recipe.name;
      item.dataset.recipeId = recipe.id;
      item.dataset.recipeName = recipe.name;

      if (!alreadyAdded) {
        item.style.cursor = 'pointer';
        item.dataset.action = 'add-recipe-to-menu';
      } else {
        item.style.opacity = '0.5';
        item.style.cursor = 'not-allowed';
        item.title = 'Already added';
      }

      resultsContainer.appendChild(item);
    });

    // Add click handler
    resultsContainer.addEventListener('click', (e) => {
      const item = e.target.closest('[data-action="add-recipe-to-menu"]');
      if (item && onAdd) {
        onAdd({
          id: item.dataset.recipeId,
          name: item.dataset.recipeName
        });
      }
    });

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
