/**
 * Nutrient Metadata Manager
 * Manages nutrient definitions and properties from backend
 */

import { State } from '../core/State.js';
import { APIClient } from '../core/APIClient.js';

export class NutrientMetadataManager {
  
  /**
   * Load nutrient metadata from API
   */
  async loadNutrients() {
    try {
      const result = await APIClient.request('/nutrients');
      
      if (APIClient.isSuccess(result)) {
        // Store raw nutrient metadata
        State.set('nutrientMetadata', result.data.nutrients);
        
        // Create a lookup map for easy access
        const nutrientMap = {};
        result.data.nutrients.forEach(nutrient => {
          nutrientMap[nutrient.key] = nutrient;
        });
        State.set('nutrientMap', nutrientMap);
        
        return result.data.nutrients;
      } else {
        console.error('Error loading nutrients:', APIClient.getError(result));
        throw new Error(APIClient.getError(result));
      }
    } catch (error) {
      console.error('Error loading nutrients:', error);
      throw error;
    }
  }

  /**
   * Get nutrient by key
   */
  getNutrient(key) {
    const nutrientMap = State.get('nutrientMap');
    return nutrientMap?.[key] || null;
  }

  /**
   * Get all nutrients
   */
  getAllNutrients() {
    return State.get('nutrientMetadata') || [];
  }

  /**
   * Get nutrients by category
   */
  getNutrientsByCategory(category) {
    const nutrients = State.get('nutrientMetadata') || [];
    return nutrients.filter(n => n.category === category);
  }

  /**
   * Get DASH-relevant nutrients
   */
  getDashRelevantNutrients() {
    const nutrients = State.get('nutrientMetadata') || [];
    return nutrients.filter(n => n.dashRelevant === true);
  }

  /**
   * Get nutrient display name
   */
  getDisplayName(key) {
    const nutrient = this.getNutrient(key);
    return nutrient?.displayName || key;
  }

  /**
   * Get nutrient unit
   */
  getUnit(key) {
    const nutrient = this.getNutrient(key);
    return nutrient?.unit || 'none';
  }

  /**
   * Format nutrient value with unit
   */
  formatValue(key, value) {
    const unit = this.getUnit(key);
    if (unit === 'none' || key === 'calories') {
      return value.toFixed(0);
    }
    return `${value.toFixed(2)} ${unit}`;
  }
}
