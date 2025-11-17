// Diet Guidelines Client - Refactored
// Simplified with EntityController pattern and backend preview endpoints

// Import core modules
import { State } from './core/State.js';
import { Router } from './core/Router.js';
import { APIClient as API } from './core/APIClient.js';

// Import managers
import { DailyPlanManager } from './managers/DailyPlanManager.js';
import { MenuManager } from './managers/MenuManager.js';
import { RecipeManager } from './managers/RecipeManager.js';
import { IngredientManager } from './managers/IngredientManager.js';
import { NutrientPreviewManager } from './managers/NutrientPreviewManager.js';
import { NutrientMetadataManager } from './managers/NutrientMetadataManager.js';
import { SettingsManager } from './managers/SettingsManager.js';

// Import controllers
import { EntityController } from './controllers/EntityController.js';
import { EditorController } from './controllers/EditorController.js';

// Import renderers
import { DailyPlanRenderer } from './renderers/DailyPlanRenderer.js';
import { MenuRenderer } from './renderers/MenuRenderer.js';
import { RecipeRenderer } from './renderers/RecipeRenderer.js';
import { IngredientRenderer } from './renderers/IngredientRenderer.js';
import { FormRenderer } from './renderers/FormRenderer.js';

// Import utilities
import { validateRecipe, validateIngredient } from './utils/Validation.js';
import { setButtonsDisabled, toggleDropdown, closeDropdown, toggleMobileMenu, closeMobileMenu, setupEventDelegation, hideElement } from './utils/dom.js';

class Client {
  constructor() {
    // Initialize managers
    this.dailyPlanManager = new DailyPlanManager();
    this.menuManager = new MenuManager();
    this.recipeManager = new RecipeManager();
    this.ingredientManager = new IngredientManager();
    this.settingsManager = new SettingsManager();
    this.nutrientPreviewManager = new NutrientPreviewManager();
    this.nutrientMetadataManager = new NutrientMetadataManager();

    // Initialize entity controllers
    this.initializeControllers();

    // Preview state
    this.showRecipePreviewAllNutrients = false;
    this.recipePreviewNutrientPage = 0;
    this.showMenuPreviewAllNutrients = false;
    this.menuPreviewNutrientPage = 0;
    this.showDailyPlanPreviewAllNutrients = false;
    this.dailyPlanPreviewNutrientPage = 0;

    // Legacy properties for compatibility
    this.menus = [];
    this.recipes = [];
    this.ingredients = [];
    this.dailyPlans = [];
    this.selectedRecipeId = null;
    this.selectedIngredientId = null;
    this.selectedMenuId = null;
    this.selectedDailyPlanId = null;
    this.userSettings = { caloriesPerDay: 2000, age: null, useAge: false, kidneyStoneRisk: 'Normal' };
    this.config = {};
    this.kidneyStoneRiskData = {};
    this.dailyRequirements = {};

    // Editor state
    this.editingMenuId = null;
    this.selectedRecipesForMenu = [];
    this.editingRecipeId = null;
    this.selectedIngredientsForRecipe = [];
    this.editingIngredientId = null;
    this.editingDailyPlanId = null;
    this.selectedMenusForDailyPlan = [];
    this.showAllNutrients = false;
    this.currentNutrientPage = 0;
    this.showAllDailyNutrients = false;
    this.currentDailyNutrientPage = 0;
    this.NUTRIENTS_PER_PAGE = 5;

    // Setup state synchronization
    this.setupStateSync();
  }

  initializeControllers() {
    // Recipe controller
    this.recipeController = new EntityController({
      entityName: 'recipe',
      entityNamePlural: 'recipes',
      manager: this.recipeManager,
      renderer: RecipeRenderer,
      state: State,
      editButtonId: 'editRecipeBtn',
      deleteButtonId: 'deleteRecipeBtn',
      detailsSectionId: 'recipeDetailsSection'
    });
    this.recipeController.showDetails = async (id) => this.showRecipeDetails(id);

    // Ingredient controller
    this.ingredientController = new EntityController({
      entityName: 'ingredient',
      entityNamePlural: 'ingredients',
      manager: this.ingredientManager,
      renderer: IngredientRenderer,
      state: State,
      editButtonId: 'editIngredientBtn',
      deleteButtonId: 'deleteIngredientBtn',
      detailsSectionId: 'ingredientDetailsSection'
    });
    this.ingredientController.showDetails = async (id) => this.showIngredientDetails(id);

    // Menu controller
    this.menuController = new EntityController({
      entityName: 'menu',
      entityNamePlural: 'menus',
      manager: this.menuManager,
      renderer: MenuRenderer,
      state: State,
      editButtonId: 'editMenuBtn',
      deleteButtonId: 'deleteMenuBtn',
      detailsSectionId: 'menuDetailsSection'
    });
    this.menuController.showDetails = async (id) => this.showMenuDetails(id);

    // Daily Plan controller
    this.dailyPlanController = new EntityController({
      entityName: 'dailyPlan',
      entityNamePlural: 'dailyPlans',
      manager: this.dailyPlanManager,
      renderer: DailyPlanRenderer,
      state: State,
      editButtonId: 'editDailyPlanBtn',
      deleteButtonId: 'deleteDailyPlanBtn',
      detailsSectionId: 'dailyPlanDetailsSection'
    });
    this.dailyPlanController.showDetails = async (id) => this.showDailyPlanDetails(id);

    // Editor controllers
    this.recipeEditor = new EditorController({
      panelId: 'recipeEditPanel',
      formId: 'recipeEditForm',
      titleId: 'editPanelTitle',
      nameInputId: 'recipeNameInput',
      manager: this.recipeManager,
      renderer: FormRenderer,
      onClearForm: () => {
        document.getElementById('ingredientSearchBox').value = '';
      }
    });

    this.ingredientEditor = new EditorController({
      panelId: 'ingredientEditPanel',
      formId: 'ingredientEditForm',
      titleId: 'ingredientEditPanelTitle',
      nameInputId: 'ingredientNameInput',
      manager: this.ingredientManager,
      renderer: FormRenderer
    });

    this.menuEditor = new EditorController({
      panelId: 'menuEditPanel',
      formId: 'menuEditForm',
      titleId: 'menuEditPanelTitle',
      nameInputId: 'menuNameInput',
      manager: this.menuManager,
      renderer: FormRenderer,
      onClearForm: () => {
        document.getElementById('recipeSearchBox').value = '';
      }
    });

    this.dailyPlanEditor = new EditorController({
      panelId: 'dailyPlanEditPanel',
      formId: 'dailyPlanEditForm',
      titleId: 'dailyPlanEditPanelTitle',
      nameInputId: 'dailyPlanNameInput',
      manager: this.dailyPlanManager,
      renderer: FormRenderer,
      onClearForm: () => {
        document.getElementById('menuSearchBoxForDailyPlan').value = '';
      }
    });
  }

  // Sync legacy properties with State
  setupStateSync() {
    State.subscribe('dailyPlans', (newValue) => {
      this.dailyPlans = newValue;
      this.updateHomeCounts();
    });

    State.subscribe('menus', (newValue) => {
      this.menus = newValue;
      this.updateHomeCounts();
    });

    State.subscribe('recipes', (newValue) => {
      this.recipes = newValue;
      this.updateHomeCounts();
    });

    State.subscribe('ingredients', (newValue) => {
      this.ingredients = newValue;
      this.updateHomeCounts();
    });

    State.subscribe('selectedRecipeId', (newValue) => {
      this.selectedRecipeId = newValue;
    });

    State.subscribe('selectedIngredientId', (newValue) => {
      this.selectedIngredientId = newValue;
    });

    State.subscribe('selectedMenuId', (newValue) => {
      this.selectedMenuId = newValue;
    });

    State.subscribe('selectedDailyPlanId', (newValue) => {
      this.selectedDailyPlanId = newValue;
    });

    // ... other subscriptions (keeping existing for compatibility)
    State.subscribe('editingRecipeId', (newValue) => {
      this.editingRecipeId = newValue;
    });

    State.subscribe('selectedIngredientsForRecipe', (newValue) => {
      this.selectedIngredientsForRecipe = newValue;
      FormRenderer.renderSelectedIngredients(newValue, {
        amount: (index, value) => this.recipeManager.updateIngredientAmount(index, value),
        unit: (index, value) => this.recipeManager.updateIngredientUnit(index, value)
      });
      this.updateRecipeNutrientPreview();
    });

    State.subscribe('editingMenuId', (newValue) => {
      this.editingMenuId = newValue;
    });

    State.subscribe('selectedRecipesForMenu', (newValue) => {
      this.selectedRecipesForMenu = newValue;
      MenuRenderer.renderSelectedRecipes(newValue, (index) => {
        this.menuManager.removeRecipeFromMenu(index);
      });
      this.updateMenuNutrientPreview();
    });

    State.subscribe('editingDailyPlanId', (newValue) => {
      this.editingDailyPlanId = newValue;
    });

    State.subscribe('selectedMenusForDailyPlan', (newValue) => {
      this.selectedMenusForDailyPlan = newValue;
      DailyPlanRenderer.renderSelectedMenus(
        newValue,
        (index) => this.dailyPlanManager.removeMenuFromDailyPlan(index),
        (index, type) => this.dailyPlanManager.updateMenuType(index, type)
      );
      this.updateDailyPlanNutrientPreview();
    });

    State.subscribe('config', (newValue) => {
      this.config = newValue;
    });

    State.subscribe('kidneyStoneRiskData', (newValue) => {
      this.kidneyStoneRiskData = newValue;
    });

    State.subscribe('dailyRequirements', (newValue) => {
      this.dailyRequirements = newValue;
    });

    State.subscribe('userSettings', (newValue) => {
      this.userSettings = newValue;
    });

    State.subscribe('showAllNutrients', (newValue) => {
      this.showAllNutrients = newValue;
    });

    State.subscribe('currentNutrientPage', (newValue) => {
      this.currentNutrientPage = newValue;
    });

    State.subscribe('showAllDailyNutrients', (newValue) => {
      this.showAllDailyNutrients = newValue;
    });

    State.subscribe('currentDailyNutrientPage', (newValue) => {
      this.currentDailyNutrientPage = newValue;
    });
  }

  // This continues in Part 2...
}

export { Client };
