/**
 * Daily Plan Manager
 * Handles all daily plan-related operations
 */

import { State } from '../core/State.js';
import { APIClient } from '../core/APIClient.js';

export class DailyPlanManager {

  /**
   * Load all daily plans from API
   */
  async loadDailyPlans() {
    try {
      const result = await APIClient.getDailyPlans();

      if (APIClient.isSuccess(result)) {
        State.set('dailyPlans', result.data);
        return result.data;
      } else {
        console.error('Error loading daily plans:', APIClient.getError(result));
        throw new Error(APIClient.getError(result));
      }
    } catch (error) {
      console.error('Error loading daily plans:', error);
      throw error;
    }
  }

  /**
   * Get daily plan by ID
   */
  async getDailyPlan(id) {
    try {
      const result = await APIClient.getDailyPlan(id);

      if (APIClient.isSuccess(result)) {
        return result.data;
      } else {
        throw new Error(APIClient.getError(result));
      }
    } catch (error) {
      console.error('Error loading daily plan:', error);
      throw error;
    }
  }

  /**
   * Create a new daily plan
   */
  async createDailyPlan(dailyPlanData) {
    try {
      const result = await APIClient.createDailyPlan(dailyPlanData);

      if (APIClient.isSuccess(result)) {
        await this.loadDailyPlans(); // Refresh list
        return result.data;
      } else {
        throw new Error(APIClient.getError(result));
      }
    } catch (error) {
      console.error('Error creating daily plan:', error);
      throw error;
    }
  }

  /**
   * Update an existing daily plan
   */
  async updateDailyPlan(id, dailyPlanData) {
    try {
      const result = await APIClient.updateDailyPlan(id, dailyPlanData);

      if (APIClient.isSuccess(result)) {
        // ✅ Update the specific item in the existing list
        const currentList = State.get('dailyPlans');
        const updatedList = currentList.map(plan =>
          plan.id === id ? { ...plan, name: dailyPlanData.name, dailyPlanMenus: dailyPlanData.dailyPlanMenus } : plan
        );
        State.set('dailyPlans', updatedList);
        return result.data;
      } else {
        throw new Error(APIClient.getError(result));
      }
    } catch (error) {
      console.error('Error updating daily plan:', error);
      throw error;
    }
  }

  /**
   * Delete a daily plan
   */
  async deleteDailyPlan(id) {
    try {
      const result = await APIClient.deleteDailyPlan(id);

      if (APIClient.isSuccess(result)) {
        await this.loadDailyPlans(); // Refresh list
        return true;
      } else {
        throw new Error(APIClient.getError(result));
      }
    } catch (error) {
      console.error('Error deleting daily plan:', error);
      throw error;
    }
  }

  /**
   * Select a daily plan
   */
  selectDailyPlan(dailyPlanId) {
    State.set('selectedDailyPlanId', dailyPlanId);
  }

  /**
   * Deselect daily plan
   */
  deselectDailyPlan() {
    State.set('selectedDailyPlanId', null);
  }

  /**
   * Filter daily plans by search term
   */
  filterDailyPlans(searchTerm) {
    const dailyPlans = State.get('dailyPlans');
    const term = searchTerm.toLowerCase().trim();

    if (!term) {
      return dailyPlans;
    }

    return dailyPlans.filter(plan =>
      plan.name.toLowerCase().includes(term)
    );
  }

  /**
   * Start editing a daily plan
   */
  startEdit(dailyPlanId = null) {
    State.set('editingDailyPlanId', dailyPlanId);

    if (dailyPlanId === null) {
      // Creating new daily plan
      State.set('selectedMenusForDailyPlan', []);
    }
  }

  /**
   * Cancel editing
   */
  cancelEdit() {
    State.set('editingDailyPlanId', null);
    State.set('selectedMenusForDailyPlan', []);
  }

  /**
   * Add menu to daily plan being edited
   */
  addMenuToDailyPlan(menu) {
    const selected = State.get('selectedMenusForDailyPlan');

    // Allow multiple instances of same menu
    selected.push({
      menuId: menu.id,
      name: menu.name,
      type: 'Other' // Default type
    });

    State.set('selectedMenusForDailyPlan', [...selected]);
    return true;
  }

  /**
   * Remove menu from daily plan being edited
   */
  removeMenuFromDailyPlan(index) {
    const selected = State.get('selectedMenusForDailyPlan');
    selected.splice(index, 1);
    State.set('selectedMenusForDailyPlan', [...selected]);
  }

  /**
   * Update menu type in daily plan being edited
   */
  updateMenuType(index, type) {
    const selected = State.get('selectedMenusForDailyPlan');
    selected[index].type = type;
    State.set('selectedMenusForDailyPlan', [...selected]);
  }

  /**
   * Calculate oxalate risk for daily plan
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
        message: `Exceeds your daily oxalate limit (${maxOxalates}mg). This daily plan contains ${oxalateMg.toFixed(1)}mg oxalates, which is ${(percent - 100).toFixed(0)}% over your ${userSettings.kidneyStoneRisk.toLowerCase()} risk limit.`
      };
    }
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

  /**
   * Calculate DASH adherence for daily plan based on aggregated totals
   */
  calculateDashAdherence(totals, userSettings) {
    const reasons = [];
    let goodCount = 0;
    let poorCount = 0;

    // Get daily calorie target
    const dailyCalories = totals.calories || 0;

    // 1. Sodium (should be < 2300mg per day, ideally < 1500mg)
    const sodium = totals.sodium || 0;
    if (sodium < 1500) {
      reasons.push('excellent sodium ✓✓');
      goodCount += 2;
    } else if (sodium < 2300) {
      reasons.push('low sodium ✓');
      goodCount++;
    } else if (sodium < 3000) {
      reasons.push('moderate sodium ⚠');
    } else {
      reasons.push('high sodium ✗');
      poorCount++;
    }

    // 2. Saturated Fat (should be < 6% of calories)
    const saturatedFat = totals.saturated_fat || 0;
    const saturatedFatCalories = saturatedFat * 9; // 9 cal per gram
    const saturatedFatPercent = dailyCalories > 0 ? (saturatedFatCalories / dailyCalories * 100) : 0;
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
    const sugarPercent = dailyCalories > 0 ? (sugarCalories / dailyCalories * 100) : 0;
    if (sugarPercent < 5) {
      reasons.push('low sugar ✓');
      goodCount++;
    } else if (sugarPercent <= 10) {
      reasons.push(`moderate sugar (${sugarPercent.toFixed(0)}% of calories) ⚠`);
    } else {
      reasons.push(`high sugar (${sugarPercent.toFixed(0)}% > 10% calories WHO) ⚠`);
      poorCount++;
    }

    // 4. Potassium (should be > 3500mg per day for DASH)
    const potassium = totals.potassium || 0;
    if (potassium >= 3500) {
      reasons.push('excellent potassium ✓✓');
      goodCount += 2;
    } else if (potassium >= 2500) {
      reasons.push('good potassium ✓');
      goodCount++;
    } else if (potassium >= 1500) {
      reasons.push('moderate potassium');
    } else {
      reasons.push('low potassium ⚠');
    }

    // 5. Fiber (should be > 25g per day)
    const fiber = totals.dietary_fiber || 0;
    if (fiber >= 25) {
      reasons.push('excellent fiber ✓✓');
      goodCount += 2;
    } else if (fiber >= 15) {
      reasons.push('good fiber ✓');
      goodCount++;
    } else if (fiber >= 10) {
      reasons.push('moderate fiber');
    } else {
      reasons.push('low fiber ⚠');
    }

    // 6. Protein (should be adequate but not excessive)
    const protein = totals.protein || 0;
    const proteinCalories = protein * 4; // 4 cal per gram
    const proteinPercent = dailyCalories > 0 ? (proteinCalories / dailyCalories * 100) : 0;
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
}
