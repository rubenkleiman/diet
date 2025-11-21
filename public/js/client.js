import { State } from './core/State.js';
import { SettingsManager } from './managers/SettingsManager.js';
import { NutrientMetadataManager } from './managers/NutrientMetadataManager.js';
import { NutrientPreviewManager } from './managers/NutrientPreviewManager.js';

// Page Controllers
import { RecipePageController } from './pages/RecipePageController.js';
import { IngredientPageController } from './pages/IngredientPageController.js';
import { MenuPageController } from './pages/MenuPageController.js';
import { DailyPlanPageController } from './pages/DailyPlanPageController.js';
import { SettingsPageController } from './pages/SettingsPageController.js';

import { closeDropdown, toggleMobileMenu, closeMobileMenu } from './utils/dom.js';

class Client {
  constructor() {
    // Core managers (shared across pages)
    this.settingsManager = new SettingsManager();
    this.nutrientMetadataManager = new NutrientMetadataManager();
    this.nutrientPreviewManager = new NutrientPreviewManager();

    // Page controllers
    this.recipePageController = new RecipePageController(this);
    this.ingredientPageController = new IngredientPageController(this);
    this.menuPageController = new MenuPageController(this);
    this.dailyPlanPageController = new DailyPlanPageController(this);
    this.settingsPageController = new SettingsPageController(this);

    // Page map for easy navigation
    this.pages = {
      recipes: this.recipePageController,
      ingredients: this.ingredientPageController,
      menus: this.menuPageController,
      dailyPlans: this.dailyPlanPageController,
      settings: this.settingsPageController
    };

    // Setup state synchronization for home counts
    this.setupHomeCountSync();
  }

  setupHomeCountSync() {
    State.subscribe('dailyPlans', () => this.updateHomeCounts());
    State.subscribe('menus', () => this.updateHomeCounts());
    State.subscribe('recipes', () => this.updateHomeCounts());
    State.subscribe('ingredients', () => this.updateHomeCounts());
  }

  async init() {
    if (this._initialized) {
      console.warn('⚠️ init() called twice! Ignoring second call.');
      return;
    }
    this._initialized = true;

    console.log('🟢 Client init started');

    try {
      // Load settings
      this.settingsManager.loadUserSettings();

      // Load all configuration in parallel (these are lightweight)
      await Promise.all([
        this.settingsManager.loadConfig(),
        this.settingsManager.loadKidneyStoneRiskData(),
        this.settingsManager.loadDailyRequirements(),
        this.nutrientMetadataManager.loadNutrients()
      ]);

      // ✅ REMOVED: No longer loading all data on startup
      // Data will be loaded lazily when each page is visited

      // Setup UI
      this.settingsManager.applyUIConfig();
      this.setupEventListeners();
      this.updateHomeCounts(); // Will show 0 until data loads

      // Navigate to initial page
      const page = window.location.hash.slice(1) || 'home';
      this.navigateTo(page, false);

      console.log('✅ Client init completed successfully');

    } catch (error) {
      console.error('❌ Client init failed:', error);
      console.error('Stack trace:', error.stack);

      try {
        this.setupEventListeners();
        this.navigateTo('home', false);
        console.log('⚠️ App running in degraded mode');
      } catch (e) {
        console.error('❌ Cannot recover from init failure');
      }
    }
  }

  async loadDailyPlans() {
    try {
      await this.dailyPlanPageController.dailyPlanManager.loadDailyPlans();
    } catch (error) {
      console.warn('⚠️ Daily plans not available yet:', error.message);
      State.set('dailyPlans', []);
    }
  }

  updateHomeCounts() {
    const updates = {
      recipeCount: State.get('recipes').length,
      ingredientCount: State.get('ingredients').length,
      menuCount: State.get('menus').length,
      dailyPlanCount: State.get('dailyPlans').length
    };

    Object.entries(updates).forEach(([id, count]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = count;
    });
  }

  navigateTo(page, pushState = true) {
    closeDropdown('accountDropdown');
    closeMobileMenu();
    window.scrollTo(0, 0);

    // Remove active class from all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // Add active class to target page
    const pageElement = document.getElementById(`${page}Page`);

    if (pageElement) {
      pageElement.classList.add('active');

      // Update ARIA
      const accountBtn = document.querySelector('[data-action="toggle-account-dropdown"]');
      if (accountBtn) accountBtn.setAttribute('aria-expanded', 'false');

      const mobileBtn = document.querySelector('[data-action="toggle-mobile-menu"]');
      if (mobileBtn) mobileBtn.setAttribute('aria-expanded', 'false');

      if (pushState) {
        history.pushState({ page }, '', `#${page}`);
      }

      // Initialize page controller
      if (this.pages[page]) {
        this.pages[page].init();
      }
    } else {
      console.warn(`Page not found: ${page}Page`);
      const homePage = document.getElementById('homePage');
      if (homePage) {
        homePage.classList.add('active');
        if (pushState) history.pushState({ page: 'home' }, '', '#home');
      }
    }
  }

  toggleAccountDropdown() {
    const btn = document.querySelector('[data-action="toggle-account-dropdown"]');
    const dropdown = document.getElementById('accountDropdown');

    if (dropdown && btn) {
      const isExpanded = dropdown.classList.toggle('show');
      btn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    }
  }

  filterNutritionInputs(searchTerm) {
    const container = document.getElementById('nutritionInputsContainer');
    const countEl = document.getElementById('nutritionSearchCount');

    if (!container) return;

    const term = searchTerm.toLowerCase().trim();
    const allGroups = container.querySelectorAll('.form-group[data-nutrient]');

    let visibleCount = 0;

    allGroups.forEach(group => {
      const nutrientName = group.dataset.nutrient.toLowerCase();
      const label = group.querySelector('label')?.textContent.toLowerCase() || '';

      if (!term || nutrientName.includes(term) || label.includes(term)) {
        group.style.display = '';
        visibleCount++;
      } else {
        group.style.display = 'none';
      }
    });

    if (countEl) {
      if (term) {
        countEl.textContent = `Showing ${visibleCount} of ${allGroups.length} fields`;
      } else {
        countEl.textContent = `Showing all ${allGroups.length} fields`;
      }
    }
  }

  setupEventListeners() {
    // Popstate for browser navigation
    window.addEventListener('popstate', (event) => {
      const page = event.state?.page || 'home';
      this.navigateTo(page, false);
    });

    // Global click handler
    document.addEventListener('click', (e) => {
      const actionElement = e.target.closest('[data-action]');

      if (actionElement) {
        e.preventDefault();
        e.stopPropagation();
        this.handleAction(actionElement);
        return;
      }

      // Close dropdowns when clicking outside
      if (!e.target.closest('.account-dropdown')) {
        closeDropdown('accountDropdown');
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      const actionElement = e.target.closest('[data-action]');

      if (actionElement && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        this.handleAction(actionElement);
      }

      // Escape key for closing panels
      if (e.key === 'Escape') {
        this.handleEscapeKey();
      }
    });

    // Setup page-specific event listeners
    this.setupPageEventListeners();
  }

  setupPageEventListeners() {
    // Recipe page
    this.setupInputListener('searchInput', (value) => this.recipePageController.filter(value));
    this.setupInputListener('ingredientSearchBox', (value) => this.recipePageController.handleIngredientSearch(value));
    this.setupFormListener('recipeEditForm', (e) => this.recipePageController.save(e));
    this.setupCheckboxListener('summaryCheckbox', () => {
      const selectedId = State.get('selectedRecipeId');
      if (selectedId) this.recipePageController.showDetails(selectedId);
    });

    // Ingredient page
    this.setupInputListener('ingredientSearchInput', (value) => this.ingredientPageController.filter(value));
    this.setupFormListener('ingredientEditForm', (e) => this.ingredientPageController.save(e));
    this.setupInputListener('nutritionSearchInput', (value) => this.filterNutritionInputs(value));

    // Menu page
    this.setupInputListener('menuSearchInput', (value) => this.menuPageController.filter(value));
    this.setupInputListener('recipeSearchBox', (value) => this.menuPageController.handleRecipeSearch(value));
    this.setupFormListener('menuEditForm', (e) => this.menuPageController.save(e));

    // Daily Plan page
    this.setupInputListener('dailyPlanSearchInput', (value) => this.dailyPlanPageController.filter(value));
    this.setupInputListener('menuSearchBoxForDailyPlan', (value) => this.dailyPlanPageController.handleMenuSearch(value));
    this.setupFormListener('dailyPlanEditForm', (e) => this.dailyPlanPageController.save(e));

    // Settings page
    this.setupFormListener('settingsForm', (e) => this.settingsPageController.save(e));
    this.setupCheckboxListener('useAgeCheckbox', (checked) => {
      const ageInput = document.getElementById('ageInput');
      if (ageInput) ageInput.disabled = !checked;
    });
    this.setupSelectListener('kidneyRiskSelect', () => this.settingsPageController.updateKidneyRiskInfo());
  }

  // Helper methods for setting up listeners
  setupInputListener(id, handler) {
    const input = document.getElementById(id);
    if (input) input.addEventListener('input', (e) => handler(e.target.value));
  }

  setupFormListener(id, handler) {
    const form = document.getElementById(id);
    if (form) form.addEventListener('submit', handler);
  }

  setupCheckboxListener(id, handler) {
    const checkbox = document.getElementById(id);
    if (checkbox) checkbox.addEventListener('change', (e) => handler(e.target.checked));
  }

  setupSelectListener(id, handler) {
    const select = document.getElementById(id);
    if (select) select.addEventListener('change', handler);
  }

  handleEscapeKey() {
    const panels = [
      { id: 'recipeEditPanel', close: () => this.recipePageController.closeEditor() },
      { id: 'ingredientEditPanel', close: () => this.ingredientPageController.closeEditor() },
      { id: 'menuEditPanel', close: () => this.menuPageController.closeEditor() },
      { id: 'dailyPlanEditPanel', close: () => this.dailyPlanPageController.closeEditor() }
    ];

    for (const panel of panels) {
      const el = document.getElementById(panel.id);
      if (el?.classList.contains('active')) {
        panel.close();
        break;
      }
    }
  }

  async handleAction(element) {
    const action = element.dataset.action;
    const page = element.dataset.page;
    const index = element.dataset.index;

    // Navigation
    if (action === 'navigate' && page) {
      this.navigateTo(page);
      return;
    }

    // Account and mobile menu
    if (action === 'toggle-account-dropdown') {
      this.toggleAccountDropdown();
      return;
    }
    if (action === 'toggle-mobile-menu') {
      toggleMobileMenu();
      return;
    }

    // ✅ IMPROVED: Route based on specific action patterns
    // Daily plan actions (check first since they may contain 'menu')
    if (action.startsWith('daily-plan-') ||
      action === 'select-daily-plan' ||
      action === 'create-daily-plan' ||
      action === 'edit-daily-plan' ||
      action === 'delete-daily-plan' ||
      action === 'close-daily-plan-editor' ||
      action === 'toggle-daily-nutrient-view' ||
      action === 'prev-daily-nutrient-page' ||
      action === 'next-daily-nutrient-page' ||
      action === 'toggle-daily-plan-preview-nutrients' ||
      action === 'prev-daily-plan-preview-nutrient-page' ||
      action === 'next-daily-plan-preview-nutrient-page' ||
      action === 'add-menu-to-daily-plan' ||  // ✅ ADD THIS
      action === 'remove-menu-from-daily-plan') {  // ✅ ADD THIS
      this.handleDailyPlanAction(action, element, index);
    }
    // Menu actions (check before recipe since 'add-recipe-to-menu' contains 'recipe')
    else if (action.startsWith('menu-') ||
      action === 'select-menu' ||
      action === 'create-menu' ||
      action === 'edit-menu' ||
      action === 'delete-menu' ||
      action === 'close-menu-editor' ||
      action === 'toggle-menu-preview-nutrients' ||
      action === 'prev-menu-preview-nutrient-page' ||
      action === 'next-menu-preview-nutrient-page' ||
      action === 'add-recipe-to-menu' ||  // ✅ ADD THIS
      action === 'remove-recipe') {  // ✅ ADD THIS
      this.handleMenuAction(action, element, index);
    }
    // Recipe actions
    else if (action.startsWith('recipe-') ||
      action === 'select-recipe' ||
      action === 'create-recipe' ||
      action === 'edit-recipe' ||
      action === 'delete-recipe' ||
      action === 'close-recipe-editor' ||
      action === 'toggle-nutrient-view' ||
      action === 'prev-nutrient-page' ||
      action === 'next-nutrient-page' ||
      action === 'toggle-recipe-preview-nutrients' ||
      action === 'prev-recipe-preview-nutrient-page' ||
      action === 'next-recipe-preview-nutrient-page' ||
      action === 'add-ingredient-to-recipe' ||  // ✅ ADD THIS
      action === 'remove-ingredient') {  // ✅ ADD THIS
      this.handleRecipeAction(action, element, index);
    }
    // Ingredient actions
    else if (action.startsWith('ingredient-') ||
      action === 'select-ingredient' ||
      action === 'create-ingredient' ||
      action === 'edit-ingredient' ||
      action === 'delete-ingredient' ||
      action === 'close-ingredient-editor') {
      this.handleIngredientAction(action, element, index);
    }
    // Settings actions
    else if (action === 'cancel-settings') {
      this.handleSettingsAction(action);
    }
    else {
      console.warn('Unhandled action:', action);
    }
  }

  async handleRecipeAction(action, element, index) {
    const ctrl = this.recipePageController;

    switch (action) {
      case 'select-recipe':
        await ctrl.select(element.dataset.recipeId);
        break;
      case 'create-recipe':
        ctrl.create();
        break;
      case 'edit-recipe':
        await ctrl.edit();
        break;
      case 'delete-recipe':
        ctrl.delete();
        break;
      case 'close-recipe-editor':
        ctrl.closeEditor();
        break;
      case 'toggle-nutrient-view':
        ctrl.toggleNutrientView();
        break;
      case 'prev-nutrient-page':
        ctrl.prevNutrientPage();
        break;
      case 'next-nutrient-page':
        ctrl.nextNutrientPage();
        break;
      case 'toggle-recipe-preview-nutrients':
        ctrl.togglePreviewNutrients();
        break;
      case 'prev-recipe-preview-nutrient-page':
        ctrl.prevPreviewNutrientPage();
        break;
      case 'next-recipe-preview-nutrient-page':
        ctrl.nextPreviewNutrientPage();
        break;
      case 'remove-ingredient':
        if (index !== undefined) {
          ctrl.recipeManager.removeIngredientFromRecipe(parseInt(index));
        }
        break;
      case 'add-ingredient-to-recipe':
        ctrl.addIngredient({
          id: element.dataset.ingredientId,
          name: element.dataset.ingredientName
        });
        break;
      default:
        console.warn('Unknown recipe action:', action);
    }
  }

  async handleIngredientAction(action, element, index) {
    const ctrl = this.ingredientPageController;

    switch (action) {
      case 'select-ingredient':
        await ctrl.select(element.dataset.ingredientId);
        break;
      case 'create-ingredient':
        ctrl.create();
        break;
      case 'edit-ingredient':
        await ctrl.edit();
        break;
      case 'delete-ingredient':
        ctrl.delete();
        break;
      case 'close-ingredient-editor':
        ctrl.closeEditor();
        break;
      default:
        console.warn('Unknown ingredient action:', action);
    }
  }

  async handleMenuAction(action, element, index) {
    const ctrl = this.menuPageController;

    switch (action) {
      case 'select-menu':
        await ctrl.select(element.dataset.menuId);
        break;
      case 'create-menu':
        ctrl.create();
        break;
      case 'edit-menu':
        await ctrl.edit();
        break;
      case 'delete-menu':
        ctrl.delete();
        break;
      case 'close-menu-editor':
        ctrl.closeEditor();
        break;
      case 'toggle-menu-preview-nutrients':
        ctrl.togglePreviewNutrients();
        break;
      case 'prev-menu-preview-nutrient-page':
        ctrl.prevPreviewNutrientPage();
        break;
      case 'next-menu-preview-nutrient-page':
        ctrl.nextPreviewNutrientPage();
        break;
      case 'remove-recipe':
        if (index !== undefined) {
          ctrl.menuManager.removeRecipeFromMenu(parseInt(index));
        }
        break;
      case 'add-recipe-to-menu':
        ctrl.addRecipe({
          id: element.dataset.recipeId,
          name: element.dataset.recipeName
        });
        break;
      default:
        console.warn('Unknown menu action:', action);
    }
  }

  async handleDailyPlanAction(action, element, index) {
    const ctrl = this.dailyPlanPageController;

    switch (action) {
      case 'select-daily-plan':
        await ctrl.select(element.dataset.dailyPlanId);
        break;
      case 'create-daily-plan':
        ctrl.create();
        break;
      case 'edit-daily-plan':
        await ctrl.edit();
        break;
      case 'delete-daily-plan':
        ctrl.delete();
        break;
      case 'close-daily-plan-editor':
        ctrl.closeEditor();
        break;
      case 'toggle-daily-nutrient-view':
        ctrl.toggleDailyNutrientView();
        break;
      case 'prev-daily-nutrient-page':
        ctrl.prevDailyNutrientPage();
        break;
      case 'next-daily-nutrient-page':
        ctrl.nextDailyNutrientPage();
        break;
      case 'toggle-daily-plan-preview-nutrients':
        ctrl.togglePreviewNutrients();
        break;
      case 'prev-daily-plan-preview-nutrient-page':
        ctrl.prevPreviewNutrientPage();
        break;
      case 'next-daily-plan-preview-nutrient-page':
        ctrl.nextPreviewNutrientPage();
        break;
      case 'remove-menu-from-daily-plan':
        if (index !== undefined) {
          ctrl.dailyPlanManager.removeMenuFromDailyPlan(parseInt(index));
        }
        break;
      case 'add-menu-to-daily-plan':
        ctrl.addMenu({
          id: element.dataset.menuId,
          name: element.dataset.menuName
        });
        break;
      default:
        console.warn('Unknown daily plan action:', action);
    }
  }

  handleSettingsAction(action) {
    const ctrl = this.settingsPageController;

    switch (action) {
      case 'cancel-settings':
        this.navigateTo('home');
        break;
      default:
        console.warn('Unknown settings action:', action);
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window._client = new Client();
  window._client.init();
});
