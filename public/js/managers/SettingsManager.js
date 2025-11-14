/**
 * Settings Manager
 * Handles user settings and configuration
 */

import { State } from '../core/State.js';
import { APIClient } from '../core/APIClient.js';

export class SettingsManager {
  
  /**
   * Load user settings from localStorage
   */
  loadUserSettings() {
    const saved = localStorage.getItem('userSettings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        State.set('userSettings', settings);
        return settings;
      } catch (error) {
        console.error('Error parsing saved settings:', error);
      }
    }
    
    // Return default settings
    return State.get('userSettings');
  }

  /**
   * Save user settings to localStorage
   */
  saveUserSettings(settings = null) {
    const toSave = settings || State.get('userSettings');
    localStorage.setItem('userSettings', JSON.stringify(toSave));
    
    if (settings) {
      State.set('userSettings', settings);
    }
  }

  /**
   * Update user settings
   */
  updateSettings(updates) {
    const current = State.get('userSettings');
    const updated = { ...current, ...updates };
    this.saveUserSettings(updated);
    return updated;
  }

  /**
   * Load configuration from API
   */
  async loadConfig() {
    try {
      const result = await APIClient.getConfig();
      
      if (APIClient.isSuccess(result)) {
        State.set('config', result.data);
        return result.data;
      } else {
        console.error('Error loading config:', APIClient.getError(result));
        throw new Error(APIClient.getError(result));
      }
    } catch (error) {
      console.error('Error loading config:', error);
      throw error;
    }
  }

  /**
   * Load kidney stone risk data from API
   */
  async loadKidneyStoneRiskData() {
    try {
      const result = await APIClient.getKidneyStoneRisk();
      
      if (APIClient.isSuccess(result)) {
        State.set('kidneyStoneRiskData', result.data);
        return result.data;
      } else {
        console.error('Error loading kidney stone risk data:', APIClient.getError(result));
        throw new Error(APIClient.getError(result));
      }
    } catch (error) {
      console.error('Error loading kidney stone risk data:', error);
      throw error;
    }
  }

  /**
   * Load daily requirements from API
   */
  async loadDailyRequirements() {
    try {
      const result = await APIClient.getDailyRequirements();
      
      if (APIClient.isSuccess(result)) {
        State.set('dailyRequirements', result.data);
        return result.data;
      } else {
        console.error('Error loading daily requirements:', APIClient.getError(result));
        throw new Error(APIClient.getError(result));
      }
    } catch (error) {
      console.error('Error loading daily requirements:', error);
      throw error;
    }
  }

  /**
   * Get kidney stone risk info for a specific risk level
   */
  getKidneyRiskInfo(riskLevel) {
    const kidneyStoneRiskData = State.get('kidneyStoneRiskData');
    return kidneyStoneRiskData[riskLevel] || null;
  }

  /**
   * Apply UI configuration
   */
  applyUIConfig() {
    const config = State.get('config');
    
    if (config.ui?.recipeListMaxHeight) {
      const container = document.getElementById('recipeListContainer');
      if (container) {
        container.style.maxHeight = config.ui.recipeListMaxHeight;
      }
    }
    
    if (config.ui?.recipeDetailsMaxHeight) {
      const content = document.getElementById('recipeDetailsContent');
      if (content) {
        content.style.maxHeight = config.ui.recipeDetailsMaxHeight;
      }
    }
  }
}
