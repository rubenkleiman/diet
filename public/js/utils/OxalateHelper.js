/**
 * Oxalate Helper
 * Centralized oxalate risk calculations
 * Removes duplicate code from RecipeManager, MenuManager, DailyPlanManager
 */

import { State } from '../core/State.js';

export class OxalateHelper {
  /**
   * Calculate oxalate risk based on amount
   * @param {number} oxalateMg - Oxalate amount in milligrams
   * @returns {Object} - { status, percent, color, message }
   */
  static calculateRisk(oxalateMg) {
    const userSettings = State.get('userSettings');
    const kidneyStoneRiskData = State.get('kidneyStoneRiskData');

    const maxOxalates = kidneyStoneRiskData[userSettings.kidneyStoneRisk]?.maxOxalatesPerDay || 200;
    const percent = (oxalateMg / maxOxalates) * 100;

    if (percent < 50) {
      return { 
        status: 'safe', 
        percent, 
        color: '#27ae60', 
        message: '' 
      };
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
        message: `Exceeds your daily oxalate limit (${maxOxalates}mg). This contains ${oxalateMg.toFixed(1)}mg oxalates, which is ${(percent - 100).toFixed(0)}% over your ${userSettings.kidneyStoneRisk.toLowerCase()} risk limit.`
      };
    }
  }

  /**
   * Get color for oxalate amount (for inline styling)
   * @param {number} oxalateMg - Oxalate amount in milligrams
   * @returns {string} - Hex color code
   */
  static getColor(oxalateMg) {
    return this.calculateRisk(oxalateMg).color;
  }

  /**
   * Get status for oxalate amount
   * @param {number} oxalateMg - Oxalate amount in milligrams
   * @returns {string} - 'safe', 'warning', or 'danger'
   */
  static getStatus(oxalateMg) {
    return this.calculateRisk(oxalateMg).status;
  }

  /**
   * Get warning message if over limit
   * @param {number} oxalateMg - Oxalate amount in milligrams
   * @returns {string} - Warning message or empty string
   */
  static getWarningMessage(oxalateMg) {
    return this.calculateRisk(oxalateMg).message;
  }
}
