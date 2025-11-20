/**
 * Dietary Assessment Helper
 * Centralized helper for fetching dietary assessments from backend
 */

import { APIClient } from '../core/APIClient.js';
import { State } from '../core/State.js';

export class DietaryAssessmentHelper {
  constructor() {
    this.userId = 'a70ff520-1125-4098-90b3-144e22ebe84a';
    this.debounceTimers = {};
  }

  /**
   * Get dietary assessment from backend
   * @param {Object} totals - Nutritional totals
   * @param {number} oxalateMg - Oxalate amount in mg
   * @param {string} type - 'recipe', 'menu', or 'daily_plan'
   * @returns {Promise<Object>} Assessment data
   */
  async getAssessment(totals, oxalateMg, type) {
    try {
      const result = await APIClient.getDietaryAssessment({
        totals,
        oxalateMg,
        type,
        userId: this.userId
      });

      if (APIClient.isSuccess(result)) {
        return result.data;
      } else {
        throw new Error(APIClient.getError(result));
      }
    } catch (error) {
      console.error('Error fetching dietary assessment:', error);
      throw error;
    }
  }

  /**
   * Get dietary assessment with debounce (for editor previews)
   * @param {string} key - Unique key for this debounce timer
   * @param {Object} totals - Nutritional totals
   * @param {number} oxalateMg - Oxalate amount in mg
   * @param {string} type - 'recipe', 'menu', or 'daily_plan'
   * @param {Function} callback - Callback with assessment data or error
   * @param {number} delay - Debounce delay in ms (default 500)
   */
  getAssessmentDebounced(key, totals, oxalateMg, type, callback, delay = 500) {
    // Clear existing timer for this key
    if (this.debounceTimers[key]) {
      clearTimeout(this.debounceTimers[key]);
    }

    // Set new timer
    this.debounceTimers[key] = setTimeout(async () => {
      try {
        const assessment = await this.getAssessment(totals, oxalateMg, type);
        callback(null, assessment);
      } catch (error) {
        callback(error, null);
      }
    }, delay);
  }

  /**
   * Render dietary assessment HTML
   * @param {Object} assessment - Assessment data from API
   * @param {Object} options - { showProgressBar: boolean }
   * @returns {string} HTML string
   */
  renderAssessment(assessment, options = {}) {
    const { showProgressBar = true } = options;

    let html = '';

    // DASH Adherence
    const dashColor = {
      Excellent: '#27ae60',
      Good: '#27ae60',
      Fair: '#f39c12',
      Poor: '#e74c3c'
    };

    html += `<p style="color:${dashColor[assessment.dashAdherence] || '#000'}">`;
    html += `<strong>DASH Adherence:</strong> ${assessment.dashAdherence}</p>`;
    html += `<p><strong>Reasons:</strong> ${assessment.dashReasons}</p>`;

    // Oxalate Level
    const oxalateColor = assessment.oxalateRisk?.color || '#27ae60';
    html += `<p><strong>Oxalate Level:</strong> `;
    html += `<span style="color: ${oxalateColor}; font-weight: bold;">${assessment.oxalateLevel}</span>`;
    html += `</p>`;

    // Nutrition Score Progress Bar
    if (showProgressBar && assessment.nutritionScore !== undefined) {
      const score = assessment.nutritionScore;
      let barColor = '#e74c3c'; // Red
      if (score >= 80) barColor = '#27ae60'; // Green
      else if (score >= 60) barColor = '#f39c12'; // Yellow

      html += `
        <div style="margin-top: 1rem;">
          <p><strong>Nutrition Score:</strong> ${score}/100</p>
          <div style="width: 100%; background-color: #ecf0f1; border-radius: 10px; height: 20px; overflow: hidden;">
            <div style="width: ${score}%; background-color: ${barColor}; height: 100%; transition: width 0.3s ease;"></div>
          </div>
        </div>
      `;
    }

    // Recommendations Section
    if (assessment.recommendations && assessment.recommendations.length > 0) {
      html += `
        <div style="margin-top: 1.5rem; padding: 1rem; background-color: #e3f2fd; border-left: 4px solid #2196f3; border-radius: 4px;">
          <h4 style="margin: 0 0 0.75rem 0; color: #1976d2;">💡 Personalized Recommendations</h4>
          <ul style="margin: 0; padding-left: 1.5rem;">
      `;
      
      assessment.recommendations.forEach(rec => {
        html += `<li style="margin-bottom: 0.5rem;">${rec}</li>`;
      });
      
      html += `
          </ul>
        </div>
      `;
    }

    // Oxalate Warning
    if (assessment.oxalateRisk?.message) {
      html += `
        <div class="oxalate-warning" style="border-left-color: ${oxalateColor}; margin-top: 1rem;">
          ${assessment.oxalateRisk.message}
        </div>
      `;
    }

    return html;
  }

  /**
   * Render error message
   * @param {Error} error - Error object
   * @returns {string} HTML string
   */
  renderError(error) {
    return `
      <div style="padding: 1.5rem; background-color: #fadbd8; color: #c0392b; border-left: 4px solid #e74c3c; border-radius: 4px; margin-top: 1rem;">
        <h4 style="margin: 0 0 0.5rem 0;">⚠️ Dietary Assessment Error</h4>
        <p style="margin: 0;">${error.message || 'Failed to load dietary assessment. Please try again.'}</p>
      </div>
    `;
  }
}

// Export singleton instance
export const dietaryAssessmentHelper = new DietaryAssessmentHelper();
