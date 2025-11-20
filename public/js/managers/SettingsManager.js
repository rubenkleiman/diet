/**
 * Settings Manager
 * Handles user settings and configuration
 */

import { State } from '../core/State.js';
import { APIClient } from '../core/APIClient.js';

export class SettingsManager {
  constructor() {
    // Hardcoded user ID (will be replaced with auth system later)
    this.userId = 'a70ff520-1125-4098-90b3-144e22ebe84a';
  }
  
  /**
   * Load user settings from backend API
   */
  async loadUserSettings() {
    try {
      const result = await APIClient.getUserSettings(this.userId);
      
      if (APIClient.isSuccess(result)) {
        State.set('userSettings', result.data);
        return result.data;
      } else {
        console.error('Error loading user settings:', APIClient.getError(result));
        // Fall back to default settings
        const defaultSettings = {
          caloriesPerDay: 2000,
          age: null,
          useAge: false,
          kidneyStoneRisk: 'Normal'
        };
        State.set('userSettings', defaultSettings);
        return defaultSettings;
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
      // Fall back to default settings
      const defaultSettings = {
        caloriesPerDay: 2000,
        age: null,
        useAge: false,
        kidneyStoneRisk: 'Normal'
      };
      State.set('userSettings', defaultSettings);
      return defaultSettings;
    }
  }

  /**
   * Save user settings to backend API
   */
  async saveUserSettings(settings = null) {
    const toSave = settings || State.get('userSettings');
    
    try {
      // Use PUT which creates if doesn't exist
      const result = await APIClient.updateUserSettings(this.userId, toSave);
      
      if (APIClient.isSuccess(result)) {
        State.set('userSettings', result.data);
        return result.data;
      } else {
        throw new Error(APIClient.getError(result));
      }
    } catch (error) {
      console.error('Error saving user settings:', error);
      throw error;
    }
  }

  /**
   * Update user settings
   */
  async updateSettings(updates) {
    const current = State.get('userSettings');
    const updated = { ...current, ...updates };
    
    try {
      await this.saveUserSettings(updated);
      return updated;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
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