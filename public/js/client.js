// Diet Guidelines Client - Phase 3: Renderers & Utilities Integration
// UI rendering extracted to dedicated modules, event delegation introduced

// Import core modules
import { State } from './core/State.js';
import { Router } from './core/Router.js';
import { APIClient as API } from './core/APIClient.js';

// Import managers
import { DailyPlanManager } from './managers/DailyPlanManager.js';
import { MenuManager } from './managers/MenuManager.js';
import { RecipeManager } from './managers/RecipeManager.js';
import { IngredientManager } from './managers/IngredientManager.js';
import { SettingsManager } from './managers/SettingsManager.js';

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

    // Maps ingredient name to its properties
    static INGREDIENT_PROPS = {
        oxalates: { unit: "mg" },
        calories: { unit: "none" },
        sodium: { unit: "mg" },
        cholesterol: { unit: "mg" },
        sugars: { unit: "g" },
        protein: { unit: "g" },
        dietary_fiber: { unit: "g" },
        carbohydrates: { unit: "g" },
        calcium: { unit: "mg" },
        potassium: { unit: "mg" },
        magnesium: { unit: "mg" },
        selenium: { unit: "mcg" },
        manganese: { unit: "mg" },
        zinc: { unit: "mg" },
        iron: { unit: "mg" },
        fat: { unit: "g" },
        saturated_fat: { unit: "g" },
        polysaturated_fat: { unit: "g" },
        monosaturated_fat: { unit: "g" },
        thiamin: { unit: "mg" },
        riboflavin: { unit: "mg" },
        niacin: { unit: "mg" },
        folic_acid: { unit: "mcg" },
        phosphorus: { unit: "mg" },
        vitamin_a: { unit: "mcg" },
        vitamin_b6: { unit: "mg" },
        vitamin_c: { unit: "mg" },
        vitamin_d: { unit: "mcg" },
        vitamin_e: { unit: "mg" },
        vitamin_k: { unit: "mcg" },
    };

    constructor() {
        // Initialize managers
        this.dailyPlanManager = new DailyPlanManager();
        this.menuManager = new MenuManager();
        this.recipeManager = new RecipeManager();
        this.ingredientManager = new IngredientManager();
        this.settingsManager = new SettingsManager();

        // Legacy properties - kept for compatibility
        this.menus = [];
        this.selectedMenuId = null;
        this.recipes = [];
        this.ingredients = [];
        this.selectedRecipeId = null;
        this.selectedIngredientId = null;
        this.config = {};
        this.kidneyStoneRiskData = {};
        this.dailyRequirements = {};
        this.userSettings = {
            caloriesPerDay: 2000,
            age: null,
            useAge: false,
            kidneyStoneRisk: 'Normal'
        };
        this.dailyPlans = [];
        this.selectedDailyPlanId = null;
        this.editingDailyPlanId = null;
        this.selectedMenusForDailyPlan = [];
        this.menuSearchTimeout = null;
        this.showAllDailyNutrients = false;
        this.currentDailyNutrientPage = 0;

        // Editor state
        this.editingMenuId = null;
        this.selectedRecipesForMenu = [];
        this.recipeSearchTimeout = null;
        this.editingRecipeId = null;
        this.selectedIngredientsForRecipe = [];
        this.ingredientSearchTimeout = null;
        this.editingIngredientId = null;

        // Nutrient view state
        this.showAllNutrients = false;
        this.currentNutrientPage = 0;
        this.NUTRIENTS_PER_PAGE = 5;

        // Setup state synchronization
        this.setupStateSync();
    }

    // Sync legacy properties with State
    setupStateSync() {
        State.subscribe('dailyPlans', (newValue) => {
            this.dailyPlans = newValue;
            this.updateHomeCounts();
        });

        State.subscribe('selectedDailyPlanId', (newValue) => {
            this.selectedDailyPlanId = newValue;
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
        });

        State.subscribe('showAllDailyNutrients', (newValue) => {
            this.showAllDailyNutrients = newValue;
        });

        State.subscribe('currentDailyNutrientPage', (newValue) => {
            this.currentDailyNutrientPage = newValue;
        });
        State.subscribe('menus', (newValue) => {
            this.menus = newValue;
            this.updateHomeCounts();
        });

        State.subscribe('selectedMenuId', (newValue) => {
            this.selectedMenuId = newValue;
        });

        State.subscribe('editingMenuId', (newValue) => {
            this.editingMenuId = newValue;
        });

        State.subscribe('selectedRecipesForMenu', (newValue) => {
            this.selectedRecipesForMenu = newValue;
            MenuRenderer.renderSelectedRecipes(newValue, (index) => {
                this.menuManager.removeRecipeFromMenu(index);
            });
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

        State.subscribe('editingRecipeId', (newValue) => {
            this.editingRecipeId = newValue;
        });

        State.subscribe('selectedIngredientsForRecipe', (newValue) => {
            this.selectedIngredientsForRecipe = newValue;
            FormRenderer.renderSelectedIngredients(newValue, {
                amount: (index, value) => this.recipeManager.updateIngredientAmount(index, value),
                unit: (index, value) => this.recipeManager.updateIngredientUnit(index, value)
            });
        });

        State.subscribe('editingIngredientId', (newValue) => {
            this.editingIngredientId = newValue;
        });

        State.subscribe('showAllNutrients', (newValue) => {
            this.showAllNutrients = newValue;
        });

        State.subscribe('currentNutrientPage', (newValue) => {
            this.currentNutrientPage = newValue;
        });
    }

    // Initialize app
    // Replace your init() method with this version:

    async init() {
        console.log('🟢 Client init started');

        try {
            // Load user settings (synchronous)
            this.settingsManager.loadUserSettings();

            // Load configuration data
            await this.settingsManager.loadConfig();
            await this.settingsManager.loadKidneyStoneRiskData();
            await this.settingsManager.loadDailyRequirements();

            // Load core data
            await this.recipeManager.loadRecipes();
            await this.ingredientManager.loadIngredients();
            await this.menuManager.loadMenus();

            // Load daily plans (optional - may not have backend yet)
            try {
                await this.dailyPlanManager.loadDailyPlans();
            } catch (error) {
                console.warn('⚠️ Daily plans not available yet:', error.message);
                // Set empty array so the UI doesn't break
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

            // Still try to setup event listeners so the app isn't completely broken
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
    // Replace your navigateTo method with this version:

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
            if (page === 'settings') {
                this.loadSettingsForm();
            } else if (page === 'ingredients') {
                this.renderIngredientList(this.ingredients);
            } else if (page === 'recipes') {
                this.renderRecipeList(this.recipes);
            } else if (page === 'menus') {
                this.renderMenuList(this.menus);
            } else if (page === 'dailyPlans') {
                this.renderDailyPlanList(this.dailyPlans);
            }
        } else {
            console.warn(`Page not found: ${page}Page`);
            // Fallback to home if page doesn't exist
            const homePage = document.getElementById('homePage');
            if (homePage) {
                homePage.classList.add('active');
                if (pushState) {
                    history.pushState({ page: 'home' }, '', '#home');
                }
            }
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

    closeAccountDropdown() {
        closeDropdown('accountDropdown');
    }

    // Mobile menu
    toggleMobileMenu() {
        toggleMobileMenu();
    }

    closeMobileMenu() {
        closeMobileMenu();
    }

    // Setup event listeners (non-delegated)
    setupEventListeners() {
        // console.warn('setupEventListeners called')
        window.addEventListener('popstate', (event) => {
            const page = event.state?.page || 'home';
            this.navigateTo(page, false);
        });

        const dailyPlanSearchInput = document.getElementById('dailyPlanSearchInput');
        if (dailyPlanSearchInput) {
            dailyPlanSearchInput.addEventListener('input', (e) => {
                this.filterDailyPlans(e.target.value);
            });
        }

        const dailyPlanEditForm = document.getElementById('dailyPlanEditForm');
        if (dailyPlanEditForm) {
            dailyPlanEditForm.addEventListener('submit', (e) => this.saveDailyPlan(e));
        }

        const menuSearchBoxForDailyPlan = document.getElementById('menuSearchBoxForDailyPlan');
        if (menuSearchBoxForDailyPlan) {
            menuSearchBoxForDailyPlan.addEventListener('input', (e) => {
                this.handleMenuSearchForDailyPlan(e.target.value);
            });
        }

        // Global click handler for data-action elements
        document.addEventListener('click', (e) => {
            const actionElement = e.target.closest('[data-action]');

            if (actionElement) {
                e.preventDefault();
                this.handleAction(actionElement);
            }

            // Close dropdowns when clicking outside
            if (!e.target.closest('.account-dropdown')) {
                this.closeAccountDropdown();
            }
            if (!e.target.closest('.ingredient-search')) {
                FormRenderer.hideSearchResults();
            }
        });

        // Keyboard navigation for feature cards
        document.addEventListener('keydown', (e) => {
            const actionElement = e.target.closest('[data-action]');

            if (actionElement && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                this.handleAction(actionElement);
            }

            // Escape key for closing panels
            if (e.key === 'Escape') {
                const recipePanel = document.getElementById('recipeEditPanel');
                const ingredientPanel = document.getElementById('ingredientEditPanel');

                if (recipePanel && recipePanel.classList.contains('active')) {
                    this.closeRecipeEditor();
                } else if (ingredientPanel && ingredientPanel.classList.contains('active')) {
                    this.closeIngredientEditor();
                }
            }
        });

        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterRecipes(e.target.value);
            });
        }

        const summaryCheckbox = document.getElementById('summaryCheckbox');
        if (summaryCheckbox) {
            summaryCheckbox.addEventListener('change', () => {
                if (this.selectedRecipeId) {
                    this.showRecipeDetails(this.selectedRecipeId);
                }
            });
        }

        const settingsForm = document.getElementById('settingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => this.applySettings(e));
        }

        const recipeEditForm = document.getElementById('recipeEditForm');
        if (recipeEditForm) {
            recipeEditForm.addEventListener('submit', (e) => this.saveRecipe(e));
        }

        const ingredientEditForm = document.getElementById('ingredientEditForm');
        if (ingredientEditForm) {
            ingredientEditForm.addEventListener('submit', (e) => this.saveIngredient(e));
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

        const ingredientSearchInput = document.getElementById('ingredientSearchInput');
        if (ingredientSearchInput) {
            ingredientSearchInput.addEventListener('input', (e) => {
                this.filterIngredients(e.target.value);
            });
        }

        const ingredientSearchBox = document.getElementById('ingredientSearchBox');
        if (ingredientSearchBox) {
            ingredientSearchBox.addEventListener('input', (e) => {
                this.handleIngredientSearch(e.target.value);
            });
        }
        const menuSearchInput = document.getElementById('menuSearchInput');
        if (menuSearchInput) {
            menuSearchInput.addEventListener('input', (e) => {
                this.filterMenus(e.target.value);
            });
        }

        const menuEditForm = document.getElementById('menuEditForm');
        if (menuEditForm) {
            menuEditForm.addEventListener('submit', (e) => this.saveMenu(e));
        }

        const recipeSearchBox = document.getElementById('recipeSearchBox');
        if (recipeSearchBox) {
            recipeSearchBox.addEventListener('input', (e) => {
                this.handleRecipeSearch(e.target.value);
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

        switch (action) {
            case 'navigate':
                if (page) this.navigateTo(page);
                break;
            case 'toggle-account-dropdown':
                this.toggleAccountDropdown();
                break;
            case 'toggle-mobile-menu':
                this.toggleMobileMenu();
                break; case 'toggle-nutrient-view':
                this.toggleNutrientView();
                break;
            case 'prev-nutrient-page':
                this.prevNutrientPage();
                break;
            case 'next-nutrient-page':
                this.nextNutrientPage();
                break;
            case 'select-recipe':
                if (recipeId) {
                    this.selectRecipe(recipeId);
                    await this.showRecipeDetails(recipeId);
                }
                break;
            case 'select-ingredient':
                if (ingredientId) {
                    this.selectIngredient(ingredientId);
                    await this.showIngredientDetails(ingredientId);
                }
                break;
            case 'select-menu':
                if (menuId) {
                    this.selectMenu(menuId);
                    await this.showMenuDetails(menuId);
                }
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
            case 'cancel-settings':
                this.cancelSettings();
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
            case 'select-daily-plan':
                if (dailyPlanId) {
                    this.selectDailyPlan(dailyPlanId);
                    await this.showDailyPlanDetails(dailyPlanId);
                }
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
            default:
                console.warn('Unknown action:', action);
        }
    }

    // Setup event delegation for dynamically created content
    setupEventDelegation() {

        const menuRowsForDailyPlan = document.getElementById('menuRowsForDailyPlan');
        if (menuRowsForDailyPlan) {
            setupEventDelegation(menuRowsForDailyPlan, {
                'remove-menu-from-daily-plan': (target) => {
                    const index = parseInt(target.dataset.index);
                    this.dailyPlanManager.removeMenuFromDailyPlan(index);
                }
            });
        }

        // const menuSearchResultsForDailyPlan = document.getElementById('menuSearchResultsForDailyPlan');
        // if (menuSearchResultsForDailyPlan) {
        //     setupEventDelegation(menuSearchResultsForDailyPlan, {
        //         'add-menu-to-daily-plan': (target) => {
        //             this.addMenuToDailyPlan({
        //                 id: target.dataset.menuId,
        //                 name: target.dataset.menuName
        //             });
        //         }
        //     });
        // }

        // const dailyPlanDetails = document.getElementById('dailyPlanDetailsContent');
        // if (dailyPlanDetails) {
        //     setupEventDelegation(dailyPlanDetails, {
        //         'toggle-daily-nutrient-view': () => this.toggleDailyNutrientView(),
        //         'prev-daily-nutrient-page': () => this.prevDailyNutrientPage(),
        //         'next-daily-nutrient-page': () => this.nextDailyNutrientPage()
        //     });
        // }

        // Recipe rows in menu editor
        const recipeRows = document.getElementById('recipeRows');
        if (recipeRows) {
            setupEventDelegation(recipeRows, {
                'remove-recipe': (target) => {
                    const index = parseInt(target.dataset.index);
                    this.menuManager.removeRecipeFromMenu(index);
                }
            });
        }

        // Recipe search results for menu editor
        // const recipeSearchResults = document.getElementById('recipeSearchResults');
        // if (recipeSearchResults) {
        //     setupEventDelegation(recipeSearchResults, {
        //         'add-recipe-to-menu': (target) => {
        //             this.addRecipeToMenu({
        //                 id: target.dataset.recipeId,
        //                 name: target.dataset.recipeName
        //             });
        //         }
        //     });
        // }
        // Recipe details section
        // const recipeDetails = document.getElementById('recipeDetailsContent');
        // if (recipeDetails) {
        //     setupEventDelegation(recipeDetails, {
        //         'toggle-nutrient-view': () => this.toggleNutrientView(),
        //         'prev-nutrient-page': () => this.prevNutrientPage(),
        //         'next-nutrient-page': () => this.nextNutrientPage()
        //     });
        // }

        // Ingredient rows in recipe editor - only handle remove button
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
    }

    // Render recipe list
    renderRecipeList(recipesToShow) {
        RecipeRenderer.renderList(recipesToShow, (recipeId) => {
            this.selectRecipe(recipeId);
            this.showRecipeDetails(recipeId);
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

    // Fetch recipe summary
    async fetchRecipeSummary(recipeId) {
        try {
            return await this.recipeManager.getRecipe(recipeId, true);
        } catch (error) {
            console.error('Error fetching recipe summary:', error);
            return null;
        }
    }

    // Filter recipes
    filterRecipes(searchTerm) {
        const filtered = this.recipeManager.filterRecipes(searchTerm);
        this.renderRecipeList(filtered);
    }

    // Select recipe
    selectRecipe(recipeId) {
        RecipeRenderer.markAsSelected(recipeId);
        this.recipeManager.selectRecipe(recipeId);
        setButtonsDisabled(['editRecipeBtn', 'deleteRecipeBtn'], false);
    }

    // Show recipe details
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
                INGREDIENT_PROPS: Client.INGREDIENT_PROPS,
                NUTRIENTS_PER_PAGE: this.NUTRIENTS_PER_PAGE
            });
        } catch (error) {
            console.error('Error loading recipe details:', error);
            RecipeRenderer.showError('Failed to load recipe details');
        }
    }

    // Nutrient view navigation
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

    // Settings
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

    // Ingredients
    filterIngredients(searchTerm) {
        const filtered = this.ingredientManager.filterIngredients(searchTerm);
        this.renderIngredientList(filtered);
    }

    renderIngredientList(ingredientsToShow) {
        IngredientRenderer.renderList(ingredientsToShow, (ingredientId) => {
            this.selectIngredient(ingredientId);
            this.showIngredientDetails(ingredientId);
        });
    }

    selectIngredient(ingredientId) {
        IngredientRenderer.markAsSelected(ingredientId, this.ingredients);
        this.ingredientManager.selectIngredient(ingredientId);
        setButtonsDisabled(['editIngredientBtn', 'deleteIngredientBtn'], false);
    }

    async showIngredientDetails(brandId) {
        try {
            const data = await this.ingredientManager.getIngredient(brandId);
            IngredientRenderer.renderDetails(data);
        } catch (error) {
            console.error('Error loading ingredient details:', error);
        }
    }

    // Recipe editor
    createRecipe() {
        this.recipeManager.startEdit(null);
        FormRenderer.setRecipeEditorTitle('Create New Recipe');
        FormRenderer.clearRecipeForm();
        FormRenderer.renderSelectedIngredients([]);
        FormRenderer.openRecipeEditor();
    }

    async editRecipe() {
        if (!this.selectedRecipeId) return;

        this.recipeManager.startEdit(this.selectedRecipeId);

        try {
            const recipe = await this.recipeManager.getRecipeFull(this.selectedRecipeId);

            FormRenderer.setRecipeEditorTitle('Edit Recipe');
            document.getElementById('recipeNameInput').value = recipe.name;
            document.getElementById('ingredientSearchBox').value = '';

            const ingredients = recipe.ingredients.map(ing => ({
                brandId: ing.brandId,
                name: ing.brandName,
                amount: ing.amount,
                unit: ing.unit
            }));

            State.set('selectedIngredientsForRecipe', ingredients);
            FormRenderer.openRecipeEditor();
        } catch (error) {
            console.error('Error loading recipe for editing:', error);
            alert('Failed to load recipe details');
        }
    }

    async deleteRecipe() {
        if (!this.selectedRecipeId) return;

        const recipe = this.recipes.find(r => r.id == this.selectedRecipeId);
        if (!recipe) return;

        if (!confirm(`Delete recipe "${recipe.name}"? This cannot be undone.`)) {
            return;
        }

        try {
            await this.recipeManager.deleteRecipe(this.selectedRecipeId);
            this.renderRecipeList(this.recipes);

            this.recipeManager.deselectRecipe();
            setButtonsDisabled(['editRecipeBtn', 'deleteRecipeBtn'], true);
            hideElement('recipeDetailsSection');

            alert('Recipe deleted successfully');
        } catch (error) {
            console.error('Error deleting recipe:', error);
            alert('Failed to delete recipe');
        }
    }

    closeRecipeEditor() {
        FormRenderer.closeRecipeEditor();
        this.recipeManager.cancelEdit();
        FormRenderer.clearRecipeForm();
        FormRenderer.hideSearchResults();
        FormRenderer.clearErrors();
    }

    async saveRecipe(event) {
        event.preventDefault();

        const recipeName = document.getElementById('recipeNameInput').value.trim();
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
        }
    }

    // Ingredient editor
    createIngredient() {
        this.ingredientManager.startEdit(null);
        FormRenderer.setIngredientEditorTitle('Create New Ingredient');
        FormRenderer.clearIngredientForm();
        FormRenderer.clearErrors();
        FormRenderer.openIngredientEditor();
    }

    async editIngredient() {
        if (!this.selectedIngredientId) return;

        this.ingredientManager.startEdit(this.selectedIngredientId);

        try {
            const ingredient = await this.ingredientManager.getIngredientFull(this.selectedIngredientId);
            FormRenderer.setIngredientEditorTitle('Edit Ingredient');
            FormRenderer.populateIngredientForm(ingredient);
            FormRenderer.clearErrors();
            FormRenderer.openIngredientEditor();
        } catch (error) {
            console.error('Error loading ingredient for editing:', error);
            alert('Failed to load ingredient details');
        }
    }

    async deleteIngredient() {
        if (!this.selectedIngredientId) return;

        const ingredient = this.ingredients.find(i => i.id == this.selectedIngredientId);
        if (!ingredient) return;

        if (!confirm(`Delete ingredient "${ingredient.name}"? This cannot be undone.`)) {
            return;
        }

        try {
            await this.ingredientManager.deleteIngredient(this.selectedIngredientId);
            this.renderIngredientList(this.ingredients);

            this.ingredientManager.deselectIngredient();
            setButtonsDisabled(['editIngredientBtn', 'deleteIngredientBtn'], true);
            hideElement('ingredientDetailsSection');

            alert('Ingredient deleted successfully');
        } catch (error) {
            console.error('Error deleting ingredient:', error);
            alert('Failed to delete ingredient');
        }
    }

    closeIngredientEditor() {
        FormRenderer.closeIngredientEditor();
        this.ingredientManager.cancelEdit();
        FormRenderer.clearErrors();
    }

    async saveIngredient(event) {
        event.preventDefault();

        const name = document.getElementById('ingredientNameInput').value.trim();
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

        const addIfPresent = (id, field) => {
            const element = document.getElementById(id);
            if (!element) return;

            const value = element.value;
            if (value !== null && value !== undefined && value !== '') {
                const numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                    const unit = Client.INGREDIENT_PROPS[field]?.unit;
                    if (!unit) {
                        FormRenderer.showError('ingredientNameError', `No standard unit found for ${field}`);
                    }
                    data[field] = (unit === "none" ? numValue : `${numValue} ${unit}`);
                }
            }
        };

        addIfPresent('caloriesInput', 'calories');
        addIfPresent('sodiumInput', 'sodium');
        addIfPresent('cholesterolInput', 'cholesterol');
        addIfPresent('sugarsInput', 'sugars');
        addIfPresent('proteinInput', 'protein');
        addIfPresent('dietaryFiberInput', 'dietary_fiber');
        addIfPresent('carbohydratesInput', 'carbohydrates');
        addIfPresent('calciumInput', 'calcium');
        addIfPresent('potassiumInput', 'potassium');
        addIfPresent('magnesiumInput', 'magnesium');
        addIfPresent('seleniumInput', 'selenium');
        addIfPresent('manganeseInput', 'manganese');
        addIfPresent('zincInput', 'zinc');
        addIfPresent('ironInput', 'iron');
        addIfPresent('fatInput', 'fat');
        addIfPresent('saturatedFatInput', 'saturated_fat');
        addIfPresent('polysaturatedFatInput', 'polysaturated_fat');
        addIfPresent('monosaturatedFatInput', 'monosaturated_fat');
        addIfPresent('thiaminInput', 'thiamin');
        addIfPresent('riboflavinInput', 'riboflavin');
        addIfPresent('niacinInput', 'niacin');
        addIfPresent('folicAcidInput', 'folic_acid');
        addIfPresent('phosphorusInput', 'phosphorus');
        addIfPresent('vitaminAInput', 'vitamin_a');
        addIfPresent('vitaminB6Input', 'vitamin_b6');
        addIfPresent('vitaminCInput', 'vitamin_c');
        addIfPresent('vitaminDInput', 'vitamin_d');
        addIfPresent('vitaminEInput', 'vitamin_e');
        addIfPresent('vitaminKInput', 'vitamin_k');

        const payload = {
            name,
            serving,
            servingUnit,
            density,
            oxalatePerGram,
            data
        };

        try {
            if (this.editingIngredientId) {
                await this.ingredientManager.updateIngredient(this.editingIngredientId, payload);
                alert('Ingredient updated successfully');
                await this.showIngredientDetails(this.editingIngredientId);
                this.ingredientManager.selectIngredient(this.editingIngredientId);
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

    // Menu List & Selection
    renderMenuList(menusToShow) {
        MenuRenderer.renderList(menusToShow, (menuId) => {
            this.selectMenu(menuId);
            this.showMenuDetails(menuId);
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
        const filtered = this.menuManager.filterMenus(searchTerm);
        this.renderMenuList(filtered);
    }

    selectMenu(menuId) {
        MenuRenderer.markAsSelected(menuId);
        this.menuManager.selectMenu(menuId);
        setButtonsDisabled(['editMenuBtn', 'deleteMenuBtn'], false);
    }

    async showMenuDetails(menuId) {
        try {
            const menu = await this.menuManager.getMenu(menuId);
            const nutritionalData = await this.menuManager.getMenuNutritionalData(menu);

            MenuRenderer.renderDetails(nutritionalData, {
                dailyRequirements: this.dailyRequirements,
                userSettings: this.userSettings,
                calculateOxalateRisk: (ox) => this.menuManager.calculateOxalateRisk(ox),
                INGREDIENT_PROPS: Client.INGREDIENT_PROPS
            });
        } catch (error) {
            console.error('Error loading menu details:', error);
            MenuRenderer.showError('Failed to load menu details');
        }
    }

    // Menu CRUD Operations
    createMenu() {
        this.menuManager.startEdit(null);
        FormRenderer.setMenuEditorTitle('Create New Menu');
        FormRenderer.clearMenuForm();
        MenuRenderer.renderSelectedRecipes([]);
        FormRenderer.openMenuEditor();
    }

    async editMenu() {
        if (!this.selectedMenuId) return;

        this.menuManager.startEdit(this.selectedMenuId);

        try {
            const menu = await this.menuManager.getMenu(this.selectedMenuId);

            FormRenderer.setMenuEditorTitle('Edit Menu');
            document.getElementById('menuNameInput').value = menu.name;
            document.getElementById('recipeSearchBox').value = '';

            // Fetch recipe names for display
            const recipePromises = menu.recipeIds.map(id =>
                this.recipes.find(r => r.id === id)
            );

            const recipes = recipePromises
                .filter(r => r !== undefined)
                .map(r => ({ id: r.id, name: r.name }));

            State.set('selectedRecipesForMenu', recipes);
            FormRenderer.openMenuEditor();
        } catch (error) {
            console.error('Error loading menu for editing:', error);
            alert('Failed to load menu details');
        }
    }

    async deleteMenu() {
        // if (!this.selectedMenuId) return;

        const menu = this.menus.find(m => m.id == this.selectedMenuId);
        if (!menu) return;

        if (!confirm(`Delete menu "${menu.name}"? This cannot be undone.`)) {
            return;
        }

        try {
            await this.menuManager.deleteMenu(this.selectedMenuId);
            this.renderMenuList(this.menus);

            this.menuManager.deselectMenu();
            setButtonsDisabled(['editMenuBtn', 'deleteMenuBtn'], true);
            hideElement('menuDetailsSection');

            alert('Menu deleted successfully');
        } catch (error) {
            console.error('Error deleting menu:', error);
            alert('Failed to delete menu');
        }
    }

    closeMenuEditor() {
        FormRenderer.closeMenuEditor();
        this.menuManager.cancelEdit();
        FormRenderer.clearMenuForm();
        MenuRenderer.hideRecipeSearchResults();
        FormRenderer.clearErrors();
    }

    async saveMenu(event) {
        event.preventDefault();

        const menuName = document.getElementById('menuNameInput').value.trim();
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

    // Menu Validation
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

    // Recipe Search for Menu Editor
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
        } else {
            alert('This recipe is already in the menu');
        }
    }

    // Daily Plan List & Selection
    renderDailyPlanList(dailyPlansToShow) {
        DailyPlanRenderer.renderList(dailyPlansToShow, (dailyPlanId) => {
            this.selectDailyPlan(dailyPlanId);
            this.showDailyPlanDetails(dailyPlanId);
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
        const filtered = this.dailyPlanManager.filterDailyPlans(searchTerm);
        this.renderDailyPlanList(filtered);
    }

    selectDailyPlan(dailyPlanId) {
        DailyPlanRenderer.markAsSelected(dailyPlanId);
        this.dailyPlanManager.selectDailyPlan(dailyPlanId);
        setButtonsDisabled(['editDailyPlanBtn', 'deleteDailyPlanBtn'], false);
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
                INGREDIENT_PROPS: Client.INGREDIENT_PROPS,
                NUTRIENTS_PER_PAGE: this.NUTRIENTS_PER_PAGE
            });
        } catch (error) {
            console.error('Error loading daily plan details:', error);
            DailyPlanRenderer.showError('Failed to load daily plan details');
        }
    }

    // Daily Plan CRUD Operations
    createDailyPlan() {
        this.dailyPlanManager.startEdit(null);
        FormRenderer.setDailyPlanEditorTitle('Create New Daily Plan');
        FormRenderer.clearDailyPlanForm();
        DailyPlanRenderer.renderSelectedMenus([],
            (index) => this.dailyPlanManager.removeMenuFromDailyPlan(index),
            (index, type) => this.dailyPlanManager.updateMenuType(index, type)
        );
        FormRenderer.openDailyPlanEditor();
    }

    async editDailyPlan() {
        if (!this.selectedDailyPlanId) return;

        this.dailyPlanManager.startEdit(this.selectedDailyPlanId);

        try {
            const dailyPlan = await this.dailyPlanManager.getDailyPlan(this.selectedDailyPlanId);

            FormRenderer.setDailyPlanEditorTitle('Edit Daily Plan');
            document.getElementById('dailyPlanNameInput').value = dailyPlan.dailyPlanName;
            document.getElementById('menuSearchBoxForDailyPlan').value = '';

            // Convert dailyPlanMenus to the format needed for rendering
            const menus = dailyPlan.menus.map(menu => ({
                menuId: menu.menuId,
                name: menu.name,
                type: menu.type
            }));

            State.set('selectedMenusForDailyPlan', menus);
            FormRenderer.openDailyPlanEditor();
        } catch (error) {
            console.error('Error loading daily plan for editing:', error);
            alert('Failed to load daily plan details');
        }
    }

    async deleteDailyPlan() {
        if (!this.selectedDailyPlanId) return;

        const dailyPlan = this.dailyPlans.find(dp => dp.id == this.selectedDailyPlanId);
        if (!dailyPlan) return;

        if (!confirm(`Delete daily plan "${dailyPlan.name}"? This cannot be undone.`)) {
            return;
        }

        try {
            await this.dailyPlanManager.deleteDailyPlan(this.selectedDailyPlanId);
            this.renderDailyPlanList(this.dailyPlans);

            this.dailyPlanManager.deselectDailyPlan();
            setButtonsDisabled(['editDailyPlanBtn', 'deleteDailyPlanBtn'], true);
            hideElement('dailyPlanDetailsSection');

            alert('Daily plan deleted successfully');
        } catch (error) {
            console.error('Error deleting daily plan:', error);
            alert('Failed to delete daily plan');
        }
    }

    closeDailyPlanEditor() {
        FormRenderer.closeDailyPlanEditor();
        this.dailyPlanManager.cancelEdit();
        FormRenderer.clearDailyPlanForm();
        DailyPlanRenderer.hideMenuSearchResults();
        FormRenderer.clearErrors();
    }

    async saveDailyPlan(event) {
        event.preventDefault();

        const dailyPlanName = document.getElementById('dailyPlanNameInput').value.trim();
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

    // Daily Plan Validation
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

    // Menu Search for Daily Plan Editor
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

    // Daily Plan Nutrient View Navigation
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

}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window._client = new Client();
    window._client.init();
});