/**
 * Daily Plan Manager
 * Handles all daily plan-related operations
 */

import { State } from '@core/State.js';
import { APIClient } from '@core/APIClient.js';

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
        await this.loadDailyPlans(); // Refresh list
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
}
