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
    // client.js - Part 2: Initialization and Core Methods

    // Initialize app
    async init() {
        if (this._initialized) {
            console.warn('⚠️ init() called twice! Ignoring second call.');
            return;
        }
        this._initialized = true;

        console.log('🟢 Client init started');

        try {
            // Load user settings (synchronous)
            this.settingsManager.loadUserSettings();

            // Load configuration data and nutrient metadata
            await Promise.all([
                this.settingsManager.loadConfig(),
                this.settingsManager.loadKidneyStoneRiskData(),
                this.settingsManager.loadDailyRequirements(),
                this.nutrientMetadataManager.loadNutrients()  // ✅ NEW
            ]);

            // Load core data
            await Promise.all([
                this.recipeManager.loadRecipes(),
                this.ingredientManager.loadIngredients(),
                this.menuManager.loadMenus()
            ]);

            // Load daily plans (optional - may not have backend yet)
            try {
                await this.dailyPlanManager.loadDailyPlans();
            } catch (error) {
                console.warn('⚠️ Daily plans not available yet:', error.message);
                State.set('dailyPlans', []);
            }

            // Setup UI
            this.settingsManager.applyUIConfig();
            this.setupEventListeners();
            this.setupEventDelegation();
            this.updateHomeCounts();

            // Navigate to initial page
            const page = window.location.hash.slice(1) || 'home';
            this.navigateTo(page, false);

            console.log('✅ Client init completed successfully');

        } catch (error) {
            console.error('❌ Client init failed:', error);
            console.error('Stack trace:', error.stack);

            try {
                this.setupEventListeners();
                this.setupEventDelegation();
                this.navigateTo('home', false);
                console.log('⚠️ App running in degraded mode');
            } catch (e) {
                console.error('❌ Cannot recover from init failure');
            }
        }
    }

    // Update home page counts
    updateHomeCounts() {
        const recipeCountEl = document.getElementById('recipeCount');
        const ingredientCountEl = document.getElementById('ingredientCount');
        const menuCountEl = document.getElementById('menuCount');
        const dailyPlanCountEl = document.getElementById('dailyPlanCount');

        if (menuCountEl) menuCountEl.textContent = this.menus.length;
        if (recipeCountEl) recipeCountEl.textContent = this.recipes.length;
        if (ingredientCountEl) ingredientCountEl.textContent = this.ingredients.length;
        if (dailyPlanCountEl) dailyPlanCountEl.textContent = this.dailyPlans.length;
    }

    // Navigation
    navigateTo(page, pushState = true) {
        closeDropdown('accountDropdown');
        closeMobileMenu();

        window.scrollTo(0, 0);

        // Remove active class from all pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });

        // Add active class to target page
        const pageElement = document.getElementById(`${page}Page`);

        if (pageElement) {
            pageElement.classList.add('active');

            // Update ARIA attributes
            const accountBtn = document.querySelector('[data-action="toggle-account-dropdown"]');
            if (accountBtn) {
                accountBtn.setAttribute('aria-expanded', 'false');
            }

            const mobileBtn = document.querySelector('[data-action="toggle-mobile-menu"]');
            if (mobileBtn) {
                mobileBtn.setAttribute('aria-expanded', 'false');
            }

            if (pushState) {
                history.pushState({ page }, '', `#${page}`);
            }

            // Call page-specific initialization
            this.initializePage(page);
        } else {
            console.warn(`Page not found: ${page}Page`);
            const homePage = document.getElementById('homePage');
            if (homePage) {
                homePage.classList.add('active');
                if (pushState) {
                    history.pushState({ page: 'home' }, '', '#home');
                }
            }
        }
    }

    // Page-specific initialization
    initializePage(page) {
        switch (page) {
            case 'settings':
                this.loadSettingsForm();
                break;
            case 'ingredients':
                this.renderIngredientList(this.ingredients);
                break;
            case 'recipes':
                this.renderRecipeList(this.recipes);
                break;
            case 'menus':
                this.renderMenuList(this.menus);
                break;
            case 'dailyPlans':
                this.renderDailyPlanList(this.dailyPlans);
                break;
        }
    }

    // Account dropdown
    toggleAccountDropdown() {
        const btn = document.querySelector('[data-action="toggle-account-dropdown"]');
        const dropdown = document.getElementById('accountDropdown');

        if (dropdown && btn) {
            const isExpanded = dropdown.classList.toggle('show');
            btn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
        }
    }

    // ===== RECIPE METHODS =====

    renderRecipeList(recipesToShow) {
        RecipeRenderer.renderList(recipesToShow, (recipeId) => {
            this.recipeController.select(recipeId);
        });

        // Load summaries asynchronously
        recipesToShow.forEach(recipe => {
            this.fetchRecipeSummary(recipe.id).then(data => {
                if (data) {
                    RecipeRenderer.updateRecipeItemWithSummary(
                        recipe.id,
                        data,
                        (ox) => this.recipeManager.calculateOxalateRisk(ox)
                    );
                }
            });
        });
    }

    async fetchRecipeSummary(recipeId) {
        try {
            return await this.recipeManager.getRecipe(recipeId, true);
        } catch (error) {
            console.error('Error fetching recipe summary:', error);
            return null;
        }
    }

    filterRecipes(searchTerm) {
        this.recipeController.filter(searchTerm);
    }

    selectRecipe(recipeId) {
        this.recipeController.select(recipeId);
    }

    async showRecipeDetails(recipeId) {
        const summaryCheckbox = document.getElementById('summaryCheckbox');
        const summary = summaryCheckbox ? summaryCheckbox.checked : true;

        try {
            const data = await this.recipeManager.getRecipe(recipeId, summary);
            RecipeRenderer.renderDetails(data, {
                dailyRequirements: this.dailyRequirements,
                userSettings: this.userSettings,
                showAllNutrients: this.showAllNutrients,
                currentNutrientPage: this.currentNutrientPage,
                calculateOxalateRisk: (ox) => this.recipeManager.calculateOxalateRisk(ox),
                calculateContributions: (d) => this.recipeManager.calculateContributions(d),
                INGREDIENT_PROPS: State.get('nutrientMap') || {},  // ✅ USE DYNAMIC NUTRIENTS
                NUTRIENTS_PER_PAGE: this.NUTRIENTS_PER_PAGE
            });
        } catch (error) {
            console.error('Error loading recipe details:', error);
            RecipeRenderer.showError('Failed to load recipe details');
        }
    }

    createRecipe() {
        this.recipeManager.startEdit(null);
        this.recipeEditor.open('Create New Recipe');
        FormRenderer.renderSelectedIngredients([]);
        this.updateRecipeNutrientPreview();
    }

    async editRecipe() {
        if (!this.selectedRecipeId) return;

        this.recipeManager.startEdit(this.selectedRecipeId);

        try {
            const recipe = await this.recipeManager.getRecipeFull(this.selectedRecipeId);

            this.recipeEditor.setName(recipe.name);
            document.getElementById('ingredientSearchBox').value = '';

            const ingredients = recipe.ingredients.map(ing => ({
                brandId: ing.brandId,
                name: ing.brandName,
                amount: ing.amount,
                unit: ing.unit
            }));

            State.set('selectedIngredientsForRecipe', ingredients);
            this.recipeEditor.show();
            this.updateRecipeNutrientPreview();
        } catch (error) {
            console.error('Error loading recipe for editing:', error);
            alert('Failed to load recipe details');
        }
    }

    deleteRecipe() {
        this.recipeController.delete(this.selectedRecipeId);
    }

    closeRecipeEditor() {
        this.recipeEditor.close();
        FormRenderer.hideSearchResults();
    }

    async saveRecipe(event) {
        event.preventDefault();

        const recipeName = this.recipeEditor.getName();
        const validation = validateRecipe(recipeName, this.selectedIngredientsForRecipe);

        if (!validation.valid) {
            validation.errors.forEach(error => {
                FormRenderer.showError(error.field, error.message);
            });
            return;
        }

        FormRenderer.clearErrors();

        const payload = {
            name: recipeName,
            ingredients: this.selectedIngredientsForRecipe.map(ing => ({
                brandId: ing.brandId,
                amount: parseFloat(ing.amount),
                unit: ing.unit
            }))
        };

        try {
            if (this.editingRecipeId) {
                await this.recipeManager.updateRecipe(this.editingRecipeId, payload);
                alert('Recipe updated successfully');
                this.recipeManager.selectRecipe(this.editingRecipeId);
                await this.showRecipeDetails(this.editingRecipeId);
            } else {
                await this.recipeManager.createRecipe(payload);
                alert('Recipe created successfully');
                const newRecipe = this.recipes.find(r => r.name == recipeName);
                if (newRecipe) {
                    this.recipeManager.selectRecipe(newRecipe.id);
                    await this.showRecipeDetails(newRecipe.id);
                }
            }

            this.renderRecipeList(this.recipes);
            this.closeRecipeEditor();
        } catch (error) {
            console.error('Error saving recipe:', error);
            FormRenderer.showError('ingredientsError', error.message || 'Failed to save recipe');
        }
    }

    // Nutrient view navigation for recipe details
    toggleNutrientView() {
        this.recipeManager.toggleNutrientView();
        if (this.selectedRecipeId) {
            this.showRecipeDetails(this.selectedRecipeId);
        }
    }

    prevNutrientPage() {
        this.recipeManager.prevNutrientPage();
        if (this.selectedRecipeId) {
            this.showRecipeDetails(this.selectedRecipeId);
        }
    }

    nextNutrientPage() {
        this.recipeManager.nextNutrientPage();
        if (this.selectedRecipeId) {
            this.showRecipeDetails(this.selectedRecipeId);
        }
    }

    // Ingredient search for recipe editor
    handleIngredientSearch(searchTerm) {
        clearTimeout(this.ingredientSearchTimeout);

        if (!searchTerm || searchTerm.trim().length < 2) {
            FormRenderer.hideSearchResults();
            return;
        }

        this.ingredientSearchTimeout = setTimeout(() => {
            this.performIngredientSearch(searchTerm.trim());
        }, 300);
    }

    async performIngredientSearch(searchTerm) {
        try {
            const results = await this.ingredientManager.searchIngredients(searchTerm);
            FormRenderer.renderSearchResults(
                results,
                this.selectedIngredientsForRecipe,
                (ingredient) => this.addIngredientToRecipe(ingredient)
            );
        } catch (error) {
            console.error('Error searching ingredients:', error);
        }
    }

    addIngredientToRecipe(ingredient) {
        const added = this.recipeManager.addIngredientToRecipe(ingredient);

        if (added) {
            FormRenderer.hideSearchResults();
            document.getElementById('ingredientSearchBox').value = '';
            this.updateRecipeNutrientPreview();
        }
    }

    // Recipe nutrient preview (uses backend now)
    async updateRecipeNutrientPreview() {
        const container = document.getElementById('recipeNutrientPreview');
        const toggleBtn = document.getElementById('toggleRecipePreviewBtn');

        if (!container) return;

        if (toggleBtn) {
            toggleBtn.textContent = this.showRecipePreviewAllNutrients
                ? 'Show Key Nutrients'
                : 'Show All Nutrients';
        }

        const data = await this.nutrientPreviewManager.calculateRecipeTotals(this.selectedIngredientsForRecipe);

        if (!data) {
            container.innerHTML = '<p class="preview-empty">Add ingredients to see nutritional preview</p>';
            return;
        }

        const html = this.showRecipePreviewAllNutrients
            ? this.nutrientPreviewManager.renderAllNutrients(
                data,
                this.userSettings,
                this.dailyRequirements,
                this.recipePreviewNutrientPage,
                this.nutrientMetadataManager
            )
            : this.nutrientPreviewManager.renderKeyNutrients(
                data,
                this.userSettings,
                this.dailyRequirements,
                (ox) => this.recipeManager.calculateOxalateRisk(ox),
                this.nutrientMetadataManager
            );

        container.innerHTML = html;
    }

    toggleRecipePreviewNutrients() {
        this.showRecipePreviewAllNutrients = !this.showRecipePreviewAllNutrients;
        this.recipePreviewNutrientPage = 0;
        this.updateRecipeNutrientPreview();
    }

    prevRecipePreviewNutrientPage() {
        if (this.recipePreviewNutrientPage > 0) {
            this.recipePreviewNutrientPage--;
            this.updateRecipeNutrientPreview();
        }
    }

    nextRecipePreviewNutrientPage() {
        this.recipePreviewNutrientPage++;
        this.updateRecipeNutrientPreview();
    }

    // This continues in Part 3...
    // client.js - Part 3: Menu and Daily Plan Methods

    // ===== INGREDIENT METHODS =====

    renderIngredientList(ingredientsToShow) {
        IngredientRenderer.renderList(ingredientsToShow, (ingredientId) => {
            this.ingredientController.select(ingredientId);
        });
    }

    filterIngredients(searchTerm) {
        this.ingredientController.filter(searchTerm);
    }

    selectIngredient(ingredientId) {
        this.ingredientController.select(ingredientId);
    }

    async showIngredientDetails(brandId) {
        try {
            const data = await this.ingredientManager.getIngredient(brandId);
            IngredientRenderer.renderDetails(data);
        } catch (error) {
            console.error('Error loading ingredient details:', error);
        }
    }

    createIngredient() {
        this.ingredientManager.startEdit(null);
        this.ingredientEditor.open('Create New Ingredient');
        FormRenderer.clearIngredientForm();
    }

    async editIngredient() {
        if (!this.selectedIngredientId) return;

        this.ingredientManager.startEdit(this.selectedIngredientId);

        try {
            const ingredient = await this.ingredientManager.getIngredientFull(this.selectedIngredientId);
            this.ingredientEditor.open('Edit Ingredient');
            FormRenderer.populateIngredientForm(ingredient);
        } catch (error) {
            console.error('Error loading ingredient for editing:', error);
            alert('Failed to load ingredient details');
        }
    }

    deleteIngredient() {
        this.ingredientController.delete(this.selectedIngredientId);
    }

    closeIngredientEditor() {
        this.ingredientEditor.close();
    }

    async saveIngredient(event) {
        event.preventDefault();

        const name = this.ingredientEditor.getName();
        const serving = parseFloat(document.getElementById('servingSizeInput').value);
        const servingUnit = document.getElementById('servingUnitSelect').value;
        const density = parseFloat(document.getElementById('densityInput').value) || null;
        const oxalatePerGram = parseFloat(document.getElementById('oxalateInput').value) || 0;

        const validation = validateIngredient(name, serving);

        if (!validation.valid) {
            validation.errors.forEach(error => {
                FormRenderer.showError(error.field, error.message);
            });
            return;
        }

        FormRenderer.clearErrors();

        const data = {};
        const nutrientMap = State.get('nutrientMap') || {};

        // Dynamically add nutrients based on nutrient metadata
        Object.keys(nutrientMap).forEach(nutrientKey => {
            const nutrient = nutrientMap[nutrientKey];
            const inputId = this.getNutrientInputId(nutrientKey);
            const element = document.getElementById(inputId);

            if (element && element.value) {
                const numValue = parseFloat(element.value);
                if (!isNaN(numValue)) {
                    data[nutrientKey] = nutrient.unit === "none"
                        ? numValue
                        : `${numValue} ${nutrient.unit}`;
                }
            }
        });

        const payload = {
            name,
            serving,
            servingUnit,
            density,
            oxalatePerGram,
            data
        };

        try {
            // ✅ FIX: Get editingIngredientId from State instead of this.editingIngredientId
            const editingId = State.get('editingIngredientId');

            if (editingId) {  // ✅ CHANGED
                await this.ingredientManager.updateIngredient(editingId, payload);  // ✅ CHANGED
                alert('Ingredient updated successfully');
                await this.showIngredientDetails(editingId);  // ✅ CHANGED
                this.ingredientManager.selectIngredient(editingId);  // ✅ CHANGED
            } else {
                await this.ingredientManager.createIngredient(payload);
                alert('Ingredient created successfully');
                const newIngredient = this.ingredients.find(i => i.name == name);
                if (newIngredient) {
                    await this.showIngredientDetails(newIngredient.id);
                    this.ingredientManager.selectIngredient(newIngredient.id);
                }
            }

            this.renderIngredientList(this.ingredients);
            this.closeIngredientEditor();
        } catch (error) {
            console.error('Error saving ingredient:', error);
            FormRenderer.showError('ingredientNameError', error.message || 'Failed to save ingredient');
        }
    }

    // Helper to get input ID for a nutrient
    getNutrientInputId(nutrientKey) {
        // Convert nutrient key to input ID format
        // e.g., 'saturated_fat' -> 'saturatedFatInput'
        const camelCase = nutrientKey.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        return camelCase + 'Input';
    }

    // ===== MENU METHODS =====

    renderMenuList(menusToShow) {
        MenuRenderer.renderList(menusToShow, (menuId) => {
            this.menuController.select(menuId);
        });

        // Load summaries asynchronously
        menusToShow.forEach(menu => {
            this.fetchMenuSummary(menu.id).then(data => {
                if (data) {
                    MenuRenderer.updateMenuItemWithSummary(
                        menu.id,
                        data,
                        (ox) => this.menuManager.calculateOxalateRisk(ox)
                    );
                }
            });
        });
    }

    async fetchMenuSummary(menuId) {
        try {
            const menu = await this.menuManager.getMenu(menuId);
            return await this.menuManager.getMenuNutritionalData(menu);
        } catch (error) {
            console.error('Error fetching menu summary:', error);
            return null;
        }
    }

    filterMenus(searchTerm) {
        this.menuController.filter(searchTerm);
    }

    selectMenu(menuId) {
        this.menuController.select(menuId);
    }

    async showMenuDetails(menuId) {
        try {
            const menu = await this.menuManager.getMenu(menuId);
            const nutritionalData = await this.menuManager.getMenuNutritionalData(menu);

            MenuRenderer.renderDetails(nutritionalData, {
                dailyRequirements: this.dailyRequirements,
                userSettings: this.userSettings,
                calculateOxalateRisk: (ox) => this.menuManager.calculateOxalateRisk(ox),
                INGREDIENT_PROPS: State.get('nutrientMap') || {},
                menuManager: this.menuManager
            });
        } catch (error) {
            console.error('Error loading menu details:', error);
            MenuRenderer.showError('Failed to load menu details');
        }
    }

    createMenu() {
        this.menuManager.startEdit(null);
        this.menuEditor.open('Create New Menu');
        MenuRenderer.renderSelectedRecipes([]);
        this.updateMenuNutrientPreview();
    }

    async editMenu() {
        if (!this.selectedMenuId) return;

        this.menuManager.startEdit(this.selectedMenuId);

        try {
            const menu = await this.menuManager.getMenu(this.selectedMenuId);

            this.menuEditor.setName(menu.name);
            document.getElementById('recipeSearchBox').value = '';

            const recipePromises = menu.recipeIds.map(id =>
                this.recipes.find(r => r.id === id)
            );

            const recipes = recipePromises
                .filter(r => r !== undefined)
                .map(r => ({ id: r.id, name: r.name }));

            State.set('selectedRecipesForMenu', recipes);
            this.menuEditor.show();
            this.updateMenuNutrientPreview();
        } catch (error) {
            console.error('Error loading menu for editing:', error);
            alert('Failed to load menu details');
        }
    }

    deleteMenu() {
        this.menuController.delete(this.selectedMenuId);
    }

    closeMenuEditor() {
        this.menuEditor.close();
        MenuRenderer.hideRecipeSearchResults();
    }

    async saveMenu(event) {
        event.preventDefault();

        const menuName = this.menuEditor.getName();
        const validation = this.validateMenu(menuName, this.selectedRecipesForMenu);

        if (!validation.valid) {
            validation.errors.forEach(error => {
                FormRenderer.showError(error.field, error.message);
            });
            return;
        }

        FormRenderer.clearErrors();

        const payload = {
            name: menuName,
            recipeIds: this.selectedRecipesForMenu.map(r => r.id)
        };

        try {
            if (this.editingMenuId) {
                await this.menuManager.updateMenu(this.editingMenuId, payload);
                alert('Menu updated successfully');
                this.menuManager.selectMenu(this.editingMenuId);
                await this.showMenuDetails(this.editingMenuId);
            } else {
                await this.menuManager.createMenu(payload);
                alert('Menu created successfully');
                const newMenu = this.menus.find(m => m.name === menuName);
                if (newMenu) {
                    this.menuManager.selectMenu(newMenu.id);
                    await this.showMenuDetails(newMenu.id);
                }
            }

            this.renderMenuList(this.menus);
            this.closeMenuEditor();
        } catch (error) {
            console.error('Error saving menu:', error);
            FormRenderer.showError('recipesError', error.message || 'Failed to save menu');
        }
    }

    validateMenu(menuName, recipes) {
        const errors = [];

        if (!menuName || menuName.trim().length === 0) {
            errors.push({ field: 'menuNameError', message: 'Menu name is required' });
        }

        if (menuName && menuName.length > 64) {
            errors.push({ field: 'menuNameError', message: 'Menu name cannot exceed 64 characters' });
        }

        if (!recipes || recipes.length === 0) {
            errors.push({ field: 'recipesError', message: 'At least one recipe is required' });
        }

        if (recipes && recipes.length > 30) {
            errors.push({ field: 'recipesError', message: 'Maximum 30 recipes allowed' });
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Recipe search for menu editor
    handleRecipeSearch(searchTerm) {
        clearTimeout(this.recipeSearchTimeout);

        if (!searchTerm || searchTerm.trim().length < 2) {
            MenuRenderer.hideRecipeSearchResults();
            return;
        }

        this.recipeSearchTimeout = setTimeout(() => {
            this.performRecipeSearch(searchTerm.trim());
        }, 300);
    }

    performRecipeSearch(searchTerm) {
        const term = searchTerm.toLowerCase();
        const results = this.recipes.filter(recipe =>
            recipe.name.toLowerCase().includes(term)
        );

        MenuRenderer.renderRecipeSearchResults(
            results,
            this.selectedRecipesForMenu,
            (recipe) => this.addRecipeToMenu(recipe)
        );
    }

    addRecipeToMenu(recipe) {
        const added = this.menuManager.addRecipeToMenu(recipe);

        if (added) {
            MenuRenderer.hideRecipeSearchResults();
            document.getElementById('recipeSearchBox').value = '';
            this.updateMenuNutrientPreview();
        } else {
            alert('This recipe is already in the menu');
        }
    }

    // Menu nutrient preview (uses backend now)
    async updateMenuNutrientPreview() {
        const container = document.getElementById('menuNutrientPreview');
        const toggleBtn = document.getElementById('toggleMenuPreviewBtn');

        if (!container) return;

        if (toggleBtn) {
            toggleBtn.textContent = this.showMenuPreviewAllNutrients
                ? 'Show Key Nutrients'
                : 'Show All Nutrients';
        }

        const data = await this.nutrientPreviewManager.calculateMenuTotals(this.selectedRecipesForMenu);

        if (!data) {
            container.innerHTML = '<p class="preview-empty">Add recipes to see nutritional preview</p>';
            return;
        }

        const html = this.showMenuPreviewAllNutrients
            ? this.nutrientPreviewManager.renderAllNutrients(
                data,
                this.userSettings,
                this.dailyRequirements,
                this.menuPreviewNutrientPage,
                this.nutrientMetadataManager
            )
            : this.nutrientPreviewManager.renderKeyNutrients(
                data,
                this.userSettings,
                this.dailyRequirements,
                (ox) => this.menuManager.calculateOxalateRisk(ox),
                this.nutrientMetadataManager
            );

        container.innerHTML = html;
    }

    toggleMenuPreviewNutrients() {
        this.showMenuPreviewAllNutrients = !this.showMenuPreviewAllNutrients;
        this.menuPreviewNutrientPage = 0;
        this.updateMenuNutrientPreview();
    }

    prevMenuPreviewNutrientPage() {
        if (this.menuPreviewNutrientPage > 0) {
            this.menuPreviewNutrientPage--;
            this.updateMenuNutrientPreview();
        }
    }

    nextMenuPreviewNutrientPage() {
        this.menuPreviewNutrientPage++;
        this.updateMenuNutrientPreview();
    }

    // This continues in Part 4...
    // client.js - Part 4: Daily Plan Methods, Settings, and Event Handlers

    // ===== DAILY PLAN METHODS =====

    renderDailyPlanList(dailyPlansToShow) {
        DailyPlanRenderer.renderList(dailyPlansToShow, (dailyPlanId) => {
            this.dailyPlanController.select(dailyPlanId);
        });

        // Load summaries asynchronously
        dailyPlansToShow.forEach(plan => {
            this.fetchDailyPlanSummary(plan.id).then(data => {
                if (data && Object.keys(data).length) {
                    DailyPlanRenderer.updateDailyPlanItemWithSummary(
                        plan.id,
                        data,
                        (ox) => this.dailyPlanManager.calculateOxalateRisk(ox)
                    );
                }
            });
        });
    }

    async fetchDailyPlanSummary(dailyPlanId) {
        try {
            return await this.dailyPlanManager.getDailyPlan(dailyPlanId);
        } catch (error) {
            console.error('Error fetching daily plan summary:', error);
            return null;
        }
    }

    filterDailyPlans(searchTerm) {
        this.dailyPlanController.filter(searchTerm);
    }

    selectDailyPlan(dailyPlanId) {
        this.dailyPlanController.select(dailyPlanId);
    }

    async showDailyPlanDetails(dailyPlanId) {
        try {
            const data = await this.dailyPlanManager.getDailyPlan(dailyPlanId);

            DailyPlanRenderer.renderDetails(data, {
                dailyRequirements: this.dailyRequirements,
                userSettings: this.userSettings,
                showAllNutrients: this.showAllDailyNutrients,
                currentNutrientPage: this.currentDailyNutrientPage,
                calculateOxalateRisk: (ox) => this.dailyPlanManager.calculateOxalateRisk(ox),
                INGREDIENT_PROPS: State.get('nutrientMap') || {},
                NUTRIENTS_PER_PAGE: this.NUTRIENTS_PER_PAGE,
                dailyPlanManager: this.dailyPlanManager
            });
        } catch (error) {
            console.error('Error loading daily plan details:', error);
            DailyPlanRenderer.showError('Failed to load daily plan details');
        }
    }

    createDailyPlan() {
        this.dailyPlanManager.startEdit(null);
        this.dailyPlanEditor.open('Create New Daily Plan');
        DailyPlanRenderer.renderSelectedMenus([],
            (index) => this.dailyPlanManager.removeMenuFromDailyPlan(index),
            (index, type) => this.dailyPlanManager.updateMenuType(index, type)
        );
        this.updateDailyPlanNutrientPreview();
    }

    async editDailyPlan() {
        if (!this.selectedDailyPlanId) return;

        this.dailyPlanManager.startEdit(this.selectedDailyPlanId);

        try {
            const dailyPlan = await this.dailyPlanManager.getDailyPlan(this.selectedDailyPlanId);

            this.dailyPlanEditor.setName(dailyPlan.dailyPlanName);
            document.getElementById('menuSearchBoxForDailyPlan').value = '';

            const menus = dailyPlan.menus.map(menu => ({
                menuId: menu.menuId,
                name: menu.name,
                type: menu.type
            }));

            State.set('selectedMenusForDailyPlan', menus);
            this.dailyPlanEditor.show();
        } catch (error) {
            console.error('Error loading daily plan for editing:', error);
            alert('Failed to load daily plan details');
        }
    }

    deleteDailyPlan() {
        this.dailyPlanController.delete(this.selectedDailyPlanId);
    }

    closeDailyPlanEditor() {
        this.dailyPlanEditor.close();
        DailyPlanRenderer.hideMenuSearchResults();
    }

    async saveDailyPlan(event) {
        event.preventDefault();

        const dailyPlanName = this.dailyPlanEditor.getName();
        const validation = this.validateDailyPlan(dailyPlanName, this.selectedMenusForDailyPlan);

        if (!validation.valid) {
            validation.errors.forEach(error => {
                FormRenderer.showError(error.field, error.message);
            });
            return;
        }

        FormRenderer.clearErrors();

        const payload = {
            name: dailyPlanName,
            dailyPlanMenus: this.selectedMenusForDailyPlan.map(menu => ({
                menuId: menu.menuId,
                type: menu.type
            }))
        };

        try {
            if (this.editingDailyPlanId) {
                await this.dailyPlanManager.updateDailyPlan(this.editingDailyPlanId, payload);
                alert('Daily plan updated successfully');
                this.dailyPlanManager.selectDailyPlan(this.editingDailyPlanId);
                await this.showDailyPlanDetails(this.editingDailyPlanId);
            } else {
                await this.dailyPlanManager.createDailyPlan(payload);
                alert('Daily plan created successfully');
                const newDailyPlan = this.dailyPlans.find(dp => dp.name === dailyPlanName);
                if (newDailyPlan) {
                    this.dailyPlanManager.selectDailyPlan(newDailyPlan.id);
                    await this.showDailyPlanDetails(newDailyPlan.id);
                }
            }

            this.renderDailyPlanList(this.dailyPlans);
            this.closeDailyPlanEditor();
        } catch (error) {
            console.error('Error saving daily plan:', error);
            FormRenderer.showError('menusError', error.message || 'Failed to save daily plan');
        }
    }

    validateDailyPlan(dailyPlanName, menus) {
        const errors = [];

        if (!dailyPlanName || dailyPlanName.trim().length === 0) {
            errors.push({ field: 'dailyPlanNameError', message: 'Daily plan name is required' });
        }

        if (dailyPlanName && dailyPlanName.length > 64) {
            errors.push({ field: 'dailyPlanNameError', message: 'Daily plan name cannot exceed 64 characters' });
        }

        if (!menus || menus.length === 0) {
            errors.push({ field: 'menusError', message: 'At least one menu is required' });
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Menu search for daily plan editor
    handleMenuSearchForDailyPlan(searchTerm) {
        clearTimeout(this.menuSearchTimeout);

        if (!searchTerm || searchTerm.trim().length < 2) {
            DailyPlanRenderer.hideMenuSearchResults();
            return;
        }

        this.menuSearchTimeout = setTimeout(() => {
            this.performMenuSearchForDailyPlan(searchTerm.trim());
        }, 300);
    }

    performMenuSearchForDailyPlan(searchTerm) {
        const term = searchTerm.toLowerCase();
        const results = this.menus.filter(menu =>
            menu.name.toLowerCase().includes(term)
        );

        DailyPlanRenderer.renderMenuSearchResults(
            results,
            (menu) => this.addMenuToDailyPlan(menu)
        );
    }

    addMenuToDailyPlan(menu) {
        const added = this.dailyPlanManager.addMenuToDailyPlan(menu);

        if (added) {
            DailyPlanRenderer.hideMenuSearchResults();
            document.getElementById('menuSearchBoxForDailyPlan').value = '';
        }
    }

    // Daily plan nutrient preview (uses backend now)
    async updateDailyPlanNutrientPreview() {
        const container = document.getElementById('dailyPlanNutrientPreview');
        const toggleBtn = document.getElementById('toggleDailyPlanPreviewBtn');

        if (!container) return;

        if (toggleBtn) {
            toggleBtn.textContent = this.showDailyPlanPreviewAllNutrients
                ? 'Show Key Nutrients'
                : 'Show All Nutrients';
        }

        const data = await this.nutrientPreviewManager.calculateDailyPlanTotals(this.selectedMenusForDailyPlan);

        if (!data) {
            container.innerHTML = '<p class="preview-empty">Add menus to see nutritional preview</p>';
            return;
        }

        const html = this.showDailyPlanPreviewAllNutrients
            ? this.nutrientPreviewManager.renderAllNutrients(
                data,
                this.userSettings,
                this.dailyRequirements,
                this.dailyPlanPreviewNutrientPage,
                this.nutrientMetadataManager
            )
            : this.nutrientPreviewManager.renderKeyNutrients(
                data,
                this.userSettings,
                this.dailyRequirements,
                (ox) => this.dailyPlanManager.calculateOxalateRisk(ox),
                this.nutrientMetadataManager
            );

        container.innerHTML = html;
    }

    toggleDailyPlanPreviewNutrients() {
        this.showDailyPlanPreviewAllNutrients = !this.showDailyPlanPreviewAllNutrients;
        this.dailyPlanPreviewNutrientPage = 0;
        this.updateDailyPlanNutrientPreview();
    }

    prevDailyPlanPreviewNutrientPage() {
        if (this.dailyPlanPreviewNutrientPage > 0) {
            this.dailyPlanPreviewNutrientPage--;
            this.updateDailyPlanNutrientPreview();
        }
    }

    nextDailyPlanPreviewNutrientPage() {
        this.dailyPlanPreviewNutrientPage++;
        this.updateDailyPlanNutrientPreview();
    }

    // Daily plan nutrient view navigation
    toggleDailyNutrientView() {
        const current = State.get('showAllDailyNutrients');
        State.set('showAllDailyNutrients', !current);
        State.set('currentDailyNutrientPage', 0);
        if (this.selectedDailyPlanId) {
            this.showDailyPlanDetails(this.selectedDailyPlanId);
        }
    }

    prevDailyNutrientPage() {
        const current = State.get('currentDailyNutrientPage');
        if (current > 0) {
            State.set('currentDailyNutrientPage', current - 1);
            if (this.selectedDailyPlanId) {
                this.showDailyPlanDetails(this.selectedDailyPlanId);
            }
        }
    }

    nextDailyNutrientPage() {
        State.set('currentDailyNutrientPage', State.get('currentDailyNutrientPage') + 1);
        if (this.selectedDailyPlanId) {
            this.showDailyPlanDetails(this.selectedDailyPlanId);
        }
    }

    // ===== SETTINGS METHODS =====

    loadSettingsForm() {
        const caloriesPerDayInput = document.getElementById('caloriesPerDayInput');
        const useAgeCheckbox = document.getElementById('useAgeCheckbox');
        const ageInput = document.getElementById('ageInput');
        const kidneyRiskSelect = document.getElementById('kidneyRiskSelect');

        if (caloriesPerDayInput) caloriesPerDayInput.value = this.userSettings.caloriesPerDay;
        if (useAgeCheckbox) useAgeCheckbox.checked = this.userSettings.useAge;
        if (ageInput) {
            ageInput.value = this.userSettings.age || '';
            ageInput.disabled = !this.userSettings.useAge;
        }
        if (kidneyRiskSelect) kidneyRiskSelect.value = this.userSettings.kidneyStoneRisk;

        this.updateKidneyRiskInfo();
    }

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

    applySettings(e) {
        e.preventDefault();

        const updates = {
            caloriesPerDay: parseInt(document.getElementById('caloriesPerDayInput').value),
            useAge: document.getElementById('useAgeCheckbox').checked,
            age: document.getElementById('useAgeCheckbox').checked ? parseInt(document.getElementById('ageInput').value) : null,
            kidneyStoneRisk: document.getElementById('kidneyRiskSelect').value
        };

        this.settingsManager.updateSettings(updates);
        this.recipeManager.loadRecipes();
        this.navigateTo('home');
    }

    cancelSettings() {
        this.navigateTo('home');
    }

    // ===== EVENT LISTENERS =====

    setupEventListeners() {
        // Popstate for browser navigation
        window.addEventListener('popstate', (event) => {
            const page = event.state?.page || 'home';
            this.navigateTo(page, false);
        });

        // Search inputs
        const searchInputs = [
            { id: 'searchInput', handler: (e) => this.filterRecipes(e.target.value) },
            { id: 'ingredientSearchInput', handler: (e) => this.filterIngredients(e.target.value) },
            { id: 'menuSearchInput', handler: (e) => this.filterMenus(e.target.value) },
            { id: 'dailyPlanSearchInput', handler: (e) => this.filterDailyPlans(e.target.value) },
            { id: 'ingredientSearchBox', handler: (e) => this.handleIngredientSearch(e.target.value) },
            { id: 'recipeSearchBox', handler: (e) => this.handleRecipeSearch(e.target.value) },
            { id: 'menuSearchBoxForDailyPlan', handler: (e) => this.handleMenuSearchForDailyPlan(e.target.value) }
        ];

        searchInputs.forEach(({ id, handler }) => {
            const input = document.getElementById(id);
            if (input) input.addEventListener('input', handler);
        });

        // Forms
        const forms = [
            { id: 'settingsForm', handler: (e) => this.applySettings(e) },
            { id: 'recipeEditForm', handler: (e) => this.saveRecipe(e) },
            { id: 'ingredientEditForm', handler: (e) => this.saveIngredient(e) },
            { id: 'menuEditForm', handler: (e) => this.saveMenu(e) },
            { id: 'dailyPlanEditForm', handler: (e) => this.saveDailyPlan(e) }
        ];

        forms.forEach(({ id, handler }) => {
            const form = document.getElementById(id);
            if (form) form.addEventListener('submit', handler);
        });

        // Checkboxes
        const summaryCheckbox = document.getElementById('summaryCheckbox');
        if (summaryCheckbox) {
            summaryCheckbox.addEventListener('change', () => {
                if (this.selectedRecipeId) {
                    this.showRecipeDetails(this.selectedRecipeId);
                }
            });
        }

        const useAgeCheckbox = document.getElementById('useAgeCheckbox');
        if (useAgeCheckbox) {
            useAgeCheckbox.addEventListener('change', (e) => {
                document.getElementById('ageInput').disabled = !e.target.checked;
            });
        }

        const kidneyRiskSelect = document.getElementById('kidneyRiskSelect');
        if (kidneyRiskSelect) {
            kidneyRiskSelect.addEventListener('change', () => this.updateKidneyRiskInfo());
        }

        // Global click handler for data-action elements
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
            if (!e.target.closest('.ingredient-search')) {
                FormRenderer.hideSearchResults();
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
                if (document.getElementById('recipeEditPanel')?.classList.contains('active')) {
                    this.closeRecipeEditor();
                } else if (document.getElementById('ingredientEditPanel')?.classList.contains('active')) {
                    this.closeIngredientEditor();
                } else if (document.getElementById('menuEditPanel')?.classList.contains('active')) {
                    this.closeMenuEditor();
                } else if (document.getElementById('dailyPlanEditPanel')?.classList.contains('active')) {
                    this.closeDailyPlanEditor();
                }
            }
        });
    }

    setupEventDelegation() {
        // Recipe details
        // const recipeDetails = document.getElementById('recipeDetailsContent');
        // if (recipeDetails) {
        //     setupEventDelegation(recipeDetails, {
        //         'toggle-nutrient-view': () => this.toggleNutrientView(),
        //         'prev-nutrient-page': () => this.prevNutrientPage(),
        //         'next-nutrient-page': () => this.nextNutrientPage()
        //     });
        // }

        // Daily plan details
        // const dailyPlanDetails = document.getElementById('dailyPlanDetailsContent');
        // if (dailyPlanDetails) {
        //     setupEventDelegation(dailyPlanDetails, {
        //         'toggle-daily-nutrient-view': () => this.toggleDailyNutrientView(),
        //         'prev-daily-nutrient-page': () => this.prevDailyNutrientPage(),
        //         'next-daily-nutrient-page': () => this.nextDailyNutrientPage()
        //     });
        // }

        // Ingredient rows
        const ingredientRows = document.getElementById('ingredientRows');
        if (ingredientRows) {
            setupEventDelegation(ingredientRows, {
                'remove-ingredient': (target) => {
                    const index = parseInt(target.dataset.index);
                    this.recipeManager.removeIngredientFromRecipe(index);
                }
            });
        }

        // Ingredient search results
        const searchResults = document.getElementById('ingredientSearchResults');
        if (searchResults) {
            setupEventDelegation(searchResults, {
                'add-ingredient-to-recipe': (target) => {
                    this.addIngredientToRecipe({
                        id: target.dataset.ingredientId,
                        name: target.dataset.ingredientName
                    });
                }
            });
        }

        // Recipe rows for menu
        const recipeRows = document.getElementById('recipeRows');
        if (recipeRows) {
            setupEventDelegation(recipeRows, {
                'remove-recipe': (target) => {
                    const index = parseInt(target.dataset.index);
                    this.menuManager.removeRecipeFromMenu(index);
                }
            });
        }

        // Recipe search results for menu
        const recipeSearchResults = document.getElementById('recipeSearchResults');
        if (recipeSearchResults) {
            setupEventDelegation(recipeSearchResults, {
                'add-recipe-to-menu': (target) => {
                    this.addRecipeToMenu({
                        id: target.dataset.recipeId,
                        name: target.dataset.recipeName
                    });
                }
            });
        }

        // Menu rows for daily plan
        const menuRowsForDailyPlan = document.getElementById('menuRowsForDailyPlan');
        if (menuRowsForDailyPlan) {
            setupEventDelegation(menuRowsForDailyPlan, {
                'remove-menu-from-daily-plan': (target) => {
                    const index = parseInt(target.dataset.index);
                    this.dailyPlanManager.removeMenuFromDailyPlan(index);
                }
            });
        }

        // Menu search results for daily plan
        const menuSearchResultsForDailyPlan = document.getElementById('menuSearchResultsForDailyPlan');
        if (menuSearchResultsForDailyPlan) {
            setupEventDelegation(menuSearchResultsForDailyPlan, {
                'add-menu-to-daily-plan': (target) => {
                    this.addMenuToDailyPlan({
                        id: target.dataset.menuId,
                        name: target.dataset.menuName
                    });
                }
            });
        }
    }

    // Handle data-action clicks
    async handleAction(element) {
        const action = element.dataset.action;
        const page = element.dataset.page;
        const recipeId = element.dataset.recipeId;
        const ingredientId = element.dataset.ingredientId;
        const menuId = element.dataset.menuId;
        const dailyPlanId = element.dataset.dailyPlanId;

        switch (action) {
            case 'navigate':
                if (page) this.navigateTo(page);
                break;
            case 'toggle-account-dropdown':
                this.toggleAccountDropdown();
                break;
            case 'toggle-mobile-menu':
                toggleMobileMenu();
                break;
            case 'select-recipe':
                if (recipeId) await this.selectRecipe(recipeId);
                break;
            case 'select-ingredient':
                if (ingredientId) await this.selectIngredient(ingredientId);
                break;
            case 'select-menu':
                if (menuId) await this.selectMenu(menuId);
                break;
            case 'select-daily-plan':
                if (dailyPlanId) await this.selectDailyPlan(dailyPlanId);
                break;
            case 'create-recipe':
                this.createRecipe();
                break;
            case 'edit-recipe':
                this.editRecipe();
                break;
            case 'delete-recipe':
                this.deleteRecipe();
                break;
            case 'close-recipe-editor':
                this.closeRecipeEditor();
                break;
            case 'toggle-recipe-preview-nutrients':
                this.toggleRecipePreviewNutrients();
                break;
            case 'prev-recipe-preview-nutrient-page':
                this.prevRecipePreviewNutrientPage();
                break;
            case 'next-recipe-preview-nutrient-page':
                this.nextRecipePreviewNutrientPage();
                break;
            case 'create-ingredient':
                this.createIngredient();
                break;
            case 'edit-ingredient':
                this.editIngredient();
                break;
            case 'delete-ingredient':
                this.deleteIngredient();
                break;
            case 'close-ingredient-editor':
                this.closeIngredientEditor();
                break;
            case 'create-menu':
                this.createMenu();
                break;
            case 'edit-menu':
                this.editMenu();
                break;
            case 'delete-menu':
                this.deleteMenu();
                break;
            case 'close-menu-editor':
                this.closeMenuEditor();
                break;
            case 'toggle-menu-preview-nutrients':
                this.toggleMenuPreviewNutrients();
                break;
            case 'prev-menu-preview-nutrient-page':
                this.prevMenuPreviewNutrientPage();
                break;
            case 'next-menu-preview-nutrient-page':
                this.nextMenuPreviewNutrientPage();
                break;
            case 'create-daily-plan':
                this.createDailyPlan();
                break;
            case 'edit-daily-plan':
                this.editDailyPlan();
                break;
            case 'delete-daily-plan':
                this.deleteDailyPlan();
                break;
            case 'close-daily-plan-editor':
                this.closeDailyPlanEditor();
                break;
            case 'toggle-daily-plan-preview-nutrients':
                this.toggleDailyPlanPreviewNutrients();
                break;
            case 'prev-daily-plan-preview-nutrient-page':
                this.prevDailyPlanPreviewNutrientPage();
                break;
            case 'next-daily-plan-preview-nutrient-page':
                this.nextDailyPlanPreviewNutrientPage();
                break;
            case 'cancel-settings':
                this.cancelSettings();
                break;
            case 'toggle-nutrient-view':
                this.toggleNutrientView();
                break;
            case 'toggle-daily-nutrient-view':
                this.toggleDailyNutrientView();
                break;
            case 'prev-nutrient-page':
                this.prevNutrientPage();
                break;
            case 'next-nutrient-page':
                this.nextNutrientPage();
                break;
            default:
                console.warn('Unknown action:', action);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window._client = new Client();
    window._client.init();
});

export { Client };