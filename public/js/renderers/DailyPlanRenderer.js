/**
 * Daily Plan Renderer
 * Handles all daily plan-related UI rendering
 */

import { State } from '../core/State.js';
import { dietaryAssessmentHelper } from '../utils/DietaryAssessmentHelper.js';
import { ListRenderer } from '../utils/ListRenderer.js';

export class DailyPlanRenderer {

  /**
   * Render daily plan list (using ListRenderer helper)
   */
  static renderList(dailyPlans, onSelect) {
    ListRenderer.render({
      items: dailyPlans,
      containerId: 'dailyPlanList',
      itemClass: 'daily-plan-item',
      dataAttribute: 'dailyPlanId',
      action: 'select-daily-plan',
      renderItem: (plan) => `
        <span class="daily-plan-name">${plan.name}</span>
        <span class="daily-plan-meta">
          <span class="daily-plan-menu-count">${plan.dailyPlanMenus?.length || 0} menus</span>
        </span>
      `,
      emptyMessage: 'No daily plans found',
      sortItems: ListRenderer.sortByName
    });
  }

  /**
   * Mark daily plan as selected (using ListRenderer helper)
   */
  static markAsSelected(dailyPlanId) {
    ListRenderer.markAsSelected('daily-plan-item', 'dailyPlanId', dailyPlanId);
  }

  /**
   * Update daily plan item with summary data
   */
  static updateDailyPlanItemWithSummary(dailyPlanId, data, calculateOxalateRisk) {
    const item = document.querySelector(`[data-daily-plan-id="${dailyPlanId}"]`);
    if (!item || !data) return;

    const userSettings = State.get('userSettings');
    const dailyRequirements = State.get('dailyRequirements');
    const summaryData = data;

    const calories = summaryData.totals.calories || 0;
    const caloriesPercent = ((calories / userSettings.caloriesPerDay) * 100).toFixed(0);

    const sodium = summaryData.totals.sodium || 0;
    const sodiumReq = parseFloat(dailyRequirements['sodium']?.maximum) || 2300;
    const sodiumPercent = ((sodium / sodiumReq) * 100).toFixed(0);

    const oxalates = summaryData.oxalateMg || 0;
    const oxalateRisk = calculateOxalateRisk(oxalates);
    const kidneyStoneRiskData = State.get('kidneyStoneRiskData');
    const maxOxalates = kidneyStoneRiskData[userSettings.kidneyStoneRisk]?.maxOxalatesPerDay || 200;
    const oxalatesPercent = ((oxalates / maxOxalates) * 100).toFixed(0);

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

    // Re-apply selected class if needed
    const selectedDailyPlanId = State.get('selectedDailyPlanId');
    if (dailyPlanId == selectedDailyPlanId) {
      item.classList.add('selected');
    }
  }

  /**
   * Render daily plan details (async - fetches dietary assessment)
   */
  static async renderDetails(data, options = {}) {
    const {
      dailyRequirements,
      userSettings,
      showAllNutrients,
      currentNutrientPage,
      calculateOxalateRisk,
      INGREDIENT_PROPS,
      NUTRIENTS_PER_PAGE
    } = options;

    const section = document.getElementById('dailyPlanDetailsSection');
    const title = document.getElementById('dailyPlanDetailsTitle');
    const content = document.getElementById('dailyPlanDetailsContent');

    if (!section || !title || !content) return;

    title.textContent = `Daily Plan: ${data.dailyPlanName}`;

    // Show loading state
    content.innerHTML = '<div class="details-content"><p>Loading dietary assessment...</p></div>';
    section.style.display = 'block';

    try {
      // Fetch dietary assessment from backend
      const assessment = await dietaryAssessmentHelper.getAssessment(
        data.totals,
        data.oxalateMg,
        'daily_plan'
      );

      // Now render with assessment data
      let html = '<div class="details-content">';

      // 1. Menus Grouped by Type (AT TOP)
      html += this.renderMenusByType(data);

      // 2. Dietary Assessment
      html += this.renderDietaryAssessment(assessment);

      // 3. Daily Totals Section (AT BOTTOM)
      html += this.renderDailyTotals(data, {
        dailyRequirements,
        userSettings,
        showAllNutrients,
        currentNutrientPage,
        calculateOxalateRisk,
        INGREDIENT_PROPS,
        NUTRIENTS_PER_PAGE
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

    let html = '<div class="details-section contribution-section">';
    html += '<div class="contribution-header">';
    html += '<h3>Daily Totals</h3>';
    html += '<button class="btn btn-secondary btn-small" data-action="toggle-daily-nutrient-view">';
    html += showAllNutrients ? 'Show Key Nutrients' : 'Show All Nutrients';
    html += '</button>';
    html += '</div>';
    html += '<div><i>Aggregated nutrition from all menus (% of Daily Requirement)</i></div><br/>';

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

    html += '</div>';

    return html;
  }

  /**
   * Render key nutrients totals (calories, sodium, oxalates)
   */
  static renderKeyNutrientsTotals(data, options) {
    const { dailyRequirements, userSettings, calculateOxalateRisk } = options;

    const calories = data.totals.calories || 0;
    const caloriesPercent = ((calories / userSettings.caloriesPerDay) * 100).toFixed(1);

    const sodium = data.totals.sodium || 0;
    const sodiumReq = parseFloat(dailyRequirements['sodium']?.maximum) || 2300;
    const sodiumPercent = ((sodium / sodiumReq) * 100).toFixed(1);

    const oxalates = data.oxalateMg || 0;
    const oxalateRisk = calculateOxalateRisk(oxalates);
    const oxalatesPercent = oxalateRisk.percent.toFixed(1);

    let html = '<div class="table-scroll">';
    html += '<table class="contribution-table">';
    html += '<thead><tr>';
    html += '<th>Nutrient</th>';
    html += '<th>Amount</th>';
    html += '<th>% Daily</th>';
    html += '</tr></thead>';
    html += '<tbody>';
    html += `<tr><td class="nutrient-name">Calories</td><td class="ing-amount">${calories.toFixed(0)}</td><td class="ing-amount">${caloriesPercent}%</td></tr>`;
    html += `<tr><td class="nutrient-name">Sodium</td><td class="ing-amount">${sodium.toFixed(0)} mg</td><td class="ing-amount">${sodiumPercent}%</td></tr>`;
    html += `<tr><td class="nutrient-name">Oxalates</td><td class="ing-amount" style="color: ${oxalateRisk.color}">${oxalates.toFixed(1)} mg</td><td class="ing-amount" style="color: ${oxalateRisk.color}">${oxalatesPercent}%</td></tr>`;
    html += '</tbody></table>';
    html += '</div>';

    return html;
  }

  /**
   * Render all nutrients totals with pagination
   */
  static renderAllNutrientsTotals(data, options) {
    const { dailyRequirements, userSettings, currentNutrientPage, INGREDIENT_PROPS, NUTRIENTS_PER_PAGE } = options;

    const allNutrients = Object.keys(data.totals).filter(key => data.totals[key] > 0);

    const startIdx = currentNutrientPage * NUTRIENTS_PER_PAGE;
    const endIdx = Math.min(startIdx + NUTRIENTS_PER_PAGE, allNutrients.length);
    const pageNutrients = allNutrients.slice(startIdx, endIdx);
    const totalPages = Math.ceil(allNutrients.length / NUTRIENTS_PER_PAGE);

    let html = '';

    if (totalPages > 1) {
      html += '<div class="pagination-controls">';
      html += `<button class="btn btn-secondary btn-small" data-action="prev-daily-nutrient-page" ${currentNutrientPage === 0 ? 'disabled' : ''}>← Prev</button>`;
      html += `<span class="page-info">Page ${currentNutrientPage + 1} of ${totalPages}</span>`;
      html += `<button class="btn btn-secondary btn-small" data-action="next-daily-nutrient-page" ${currentNutrientPage >= totalPages - 1 ? 'disabled' : ''}>Next →</button>`;
      html += '</div>';
    }

    html += '<div class="table-scroll">';
    html += '<table class="contribution-table">';
    html += '<thead><tr>';
    html += '<th>Nutrient</th>';
    html += '<th>Amount</th>';
    html += '<th>% Daily</th>';
    html += '</tr></thead>';
    html += '<tbody>';

    pageNutrients.forEach(nutrient => {
      const value = data.totals[nutrient];
      let formattedValue = typeof value === 'number' ? value.toFixed(2) : value;
      let percentDaily = '';

      if (nutrient === 'calories') {
        const percent = ((value / userSettings.caloriesPerDay) * 100).toFixed(1);
        percentDaily = `${percent}%`;
      } else if (dailyRequirements[nutrient]) {
        const req = dailyRequirements[nutrient];
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

      if (nutrient !== 'calories') {
        const unit = INGREDIENT_PROPS[nutrient]?.unit;
        if (unit && unit !== 'none') {
          formattedValue = `${formattedValue} ${unit}`;
        }
      }

      html += '<tr>';
      html += `<td class="nutrient-name">${nutrient}</td>`;
      html += `<td class="ing-amount">${formattedValue}</td>`;
      html += `<td class="ing-amount">${percentDaily}</td>`;
      html += '</tr>';
    });

    html += '</tbody></table>';
    html += '</div>';

    return html;
  }

  /**
   * Render menus grouped by type
   */
  static renderMenusByType(data) {
    const typeOrder = ['Breakfast', 'Lunch', 'Brunch', 'Snack', 'Dinner', 'Other'];

    // Group menus by type
    const menusByType = {};
    typeOrder.forEach(type => {
      menusByType[type] = [];
    });

    data.menus.forEach(menu => {
      const type = menu.type || 'Other';
      if (menusByType[type]) {
        menusByType[type].push(menu);
      } else {
        menusByType['Other'].push(menu);
      }
    });

    let html = '';

    // Render each type section
    typeOrder.forEach(type => {
      if (menusByType[type].length === 0) return;

      html += '<div class="details-section">';
      html += `<h3>${type}</h3>`;
      html += '<ul class="menu-recipe-list">';

      menusByType[type].forEach(menu => {
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

      html += '</ul>';
      html += '</div>';
    });

    return html;
  }

  /**
   * Show error message in daily plan details
   */
  static showError(message) {
    const content = document.getElementById('dailyPlanDetailsContent');
    if (content) {
      content.innerHTML = `<div class="error-message">${message}</div>`;
      const section = document.getElementById('dailyPlanDetailsSection');
      if (section) section.style.display = 'block';
    }
  }

  /**
   * Render selected menus for daily plan editor
   */
  static renderSelectedMenus(menus, onRemove, onTypeChange) {
    const container = document.getElementById('menuRowsForDailyPlan');
    if (!container) return;

    if (menus.length === 0) {
      container.innerHTML = '<div class="no-menus-message">No menus added yet</div>';
      return;
    }

    container.innerHTML = '';

    menus.forEach((menu, index) => {
      const row = document.createElement('div');
      row.className = 'menu-row-daily-plan';
      row.dataset.index = index;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'menu-name';
      nameSpan.title = menu.name;
      nameSpan.textContent = menu.name;

      const typeSelect = document.createElement('select');
      typeSelect.className = 'type-select';
      typeSelect.dataset.index = index;
      typeSelect.innerHTML = `
        <option value="Breakfast" ${menu.type === 'Breakfast' ? 'selected' : ''}>Breakfast</option>
        <option value="Lunch" ${menu.type === 'Lunch' ? 'selected' : ''}>Lunch</option>
        <option value="Brunch" ${menu.type === 'Brunch' ? 'selected' : ''}>Brunch</option>
        <option value="Snack" ${menu.type === 'Snack' ? 'selected' : ''}>Snack</option>
        <option value="Dinner" ${menu.type === 'Dinner' ? 'selected' : ''}>Dinner</option>
        <option value="Other" ${menu.type === 'Other' ? 'selected' : ''}>Other</option>
      `;

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'remove-btn';
      removeBtn.dataset.action = 'remove-menu-from-daily-plan';
      removeBtn.dataset.index = index;
      removeBtn.title = 'Remove menu';
      removeBtn.innerHTML = '&times;';

      row.appendChild(nameSpan);
      row.appendChild(typeSelect);
      row.appendChild(removeBtn);

      // Add direct event listener for type change
      if (onTypeChange) {
        typeSelect.addEventListener('change', () => {
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
    const resultsContainer = document.getElementById('menuSearchResultsForDailyPlan');
    if (!resultsContainer) return;

    if (results.length === 0) {
      resultsContainer.innerHTML = '<div class="search-result-item">No menus found</div>';
      resultsContainer.classList.add('show');
      return;
    }

    resultsContainer.innerHTML = '';

    results.forEach(menu => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.textContent = menu.name;
      item.dataset.menuId = menu.id;
      item.dataset.menuName = menu.name;
      item.style.cursor = 'pointer';
      item.dataset.action = 'add-menu-to-daily-plan';

      resultsContainer.appendChild(item);
    });

    resultsContainer.classList.add('show');
  }

  /**
   * Hide menu search results
   */
  static hideMenuSearchResults() {
    const resultsContainer = document.getElementById('menuSearchResultsForDailyPlan');
    if (resultsContainer) {
      resultsContainer.classList.remove('show');
    }
  }
}
