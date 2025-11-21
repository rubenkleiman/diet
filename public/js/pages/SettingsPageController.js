/**
 * Settings Page Controller
 * Handles all settings page logic
 */

import { State } from '../core/State.js';

export class SettingsPageController {
  constructor(client) {
    this.client = client;
    this.settingsManager = client.settingsManager; // Reuse shared instance
  }

  /**
   * Initialize page
   */
  init() {
    this.loadForm();
  }

  /**
   * Load settings form with current values
   */
  loadForm() {
    const userSettings = State.get('userSettings');
    
    const caloriesPerDayInput = document.getElementById('caloriesPerDayInput');
    const useAgeCheckbox = document.getElementById('useAgeCheckbox');
    const ageInput = document.getElementById('ageInput');
    const kidneyRiskSelect = document.getElementById('kidneyRiskSelect');

    if (caloriesPerDayInput) caloriesPerDayInput.value = userSettings.caloriesPerDay;
    if (useAgeCheckbox) useAgeCheckbox.checked = userSettings.useAge;
    if (ageInput) {
      ageInput.value = userSettings.age || '';
      ageInput.disabled = !userSettings.useAge;
    }
    if (kidneyRiskSelect) kidneyRiskSelect.value = userSettings.kidneyStoneRisk;

    this.updateKidneyRiskInfo();
  }

  /**
   * Update kidney risk info display
   */
  updateKidneyRiskInfo() {
    const select = document.getElementById('kidneyRiskSelect');
    const info = document.getElementById('kidneyRiskInfo');

    if (!select || !info) return;

    const riskLevel = select.value;
    const data = this.settingsManager.getKidneyRiskInfo(riskLevel);

    if (data) {
      info.textContent = `Maximum ${data.maxOxalatesPerDay}mg oxalates per day - ${data.description}`;
    }
  }

  /**
   * Save settings
   */
  save(e) {
    e.preventDefault();

    const updates = {
      caloriesPerDay: parseInt(document.getElementById('caloriesPerDayInput').value),
      useAge: document.getElementById('useAgeCheckbox').checked,
      age: document.getElementById('useAgeCheckbox').checked 
        ? parseInt(document.getElementById('ageInput').value) 
        : null,
      kidneyStoneRisk: document.getElementById('kidneyRiskSelect').value
    };

    this.settingsManager.updateSettings(updates);
    
    // Reload recipes since they depend on user settings
    this.client.recipePageController.recipeManager.loadRecipes();
    
    this.client.navigateTo('home');
  }
}
