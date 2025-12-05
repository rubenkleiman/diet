/**
 * Menu Page Controller
 * Handles all menu page logic
 */

import { MenuManager } from '../managers/MenuManager.js';
import { MenuRenderer } from '../renderers/MenuRenderer.js';
import { FormRenderer } from '../renderers/FormRenderer.js';
import { EntityController } from '../controllers/EntityController.js';
import { EditorController } from '../controllers/EditorController.js';
import { State } from '../core/State.js';
import { APIClient } from '../core/APIClient.js';

export class MenuPageController {
  constructor(client) {
    this.client = client;
    this.menuManager = new MenuManager();

    // Entity controller
    this.entityController = new EntityController({
      entityName: 'menu',
      entityNamePlural: 'menus',
      manager: this.menuManager,
      renderer: MenuRenderer,
      state: State,
      editButtonId: 'editMenuBtn',
      deleteButtonId: 'deleteMenuBtn',
      detailsSectionId: 'menuDetailsSection'
    });
    this.entityController.showDetails = (id) => this.showDetails(id);

    // Editor controller
    this.editorController = new EditorController({
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

    // Preview state
    this.showPreviewAllNutrients = false;
    this.previewNutrientPage = 0;

    // Search timeout
    this.recipeSearchTimeout = null;

    State.subscribe('selectedRecipesForMenu', (newValue) => {
      MenuRenderer.renderSelectedRecipes(
        newValue,
        {
          amount: (index, value) => this.menuManager.updateRecipeAmount(index, value),
          unit: (index, value) => this.menuManager.updateRecipeUnit(index, value)
        },
        (index) => this.menuManager.removeRecipeFromMenu(index)
      );
      this.updateNutrientPreview();
    });

    // Setup event delegation for reset buttons
    this.setupResetButtonHandlers();

    this._dataLoaded = false;
  }

  /**
   * Setup event delegation for reset amount buttons
   */
  setupResetButtonHandlers() {
    document.addEventListener('click', async (e) => {
      if (e.target.classList.contains('reset-amount-btn')) {
        const index = parseInt(e.target.dataset.index);
        await this.handleResetAmount(index);
      }
    });
  }

  /**
 * Handle amount change with validation
 */
  handleAmountChange(index, value) {
    // Round to 1 decimal place
    const rounded = Math.round(parseFloat(value) * 10) / 10;

    if (!isNaN(rounded) && rounded >= 0.1) {
      this.menuManager.updateRecipeAmount(index, rounded.toFixed(1));
      this.updateNutrientPreview();
    }
  }

  /**
   * Handle reset amount to default
   */
  async handleResetAmount(index) {
    await this.menuManager.resetRecipeAmount(index);
    this.updateNutrientPreview();
  }

  /**
   * Initialize page
   * Lazy load data only when page is visited
   */
  async init() {
    if (!this._dataLoaded) {
      try {
        // Only load menus - recipes loaded on demand
        await this.menuManager.loadMenus();
        this._dataLoaded = true;
      } catch (error) {
        console.error('Failed to load menus:', error);
        const list = document.getElementById('menuList');
        if (list) {
          list.innerHTML = '<li class="error-message">Failed to load menus. Please refresh.</li>';
        }
        return;
      }
    }

    const menus = State.get('menus');
    this.renderList(menus);
  }

  /**
   * Render menu list
   */
  renderList(menus) {
    MenuRenderer.renderList(menus, (menuId) => {
      this.entityController.select(menuId);
    });
  }

  /**
   * Filter menus
   */
  filter(searchTerm) {
    this.entityController.filter(searchTerm);
  }

  /**
   * Select menu
   */
  async select(menuId) {
    await this.entityController.select(menuId);
  }

  /**
   * Show menu details
   */
  async showDetails(menuId) {
    try {
      const menu = await this.menuManager.getMenu(menuId);
      const nutritionalData = await this.menuManager.getMenuNutritionalData(menu);

      MenuRenderer.renderDetails(nutritionalData, {
        dailyRequirements: State.get('dailyRequirements'),
        userSettings: State.get('userSettings'),
        calculateOxalateRisk: (ox) => this.menuManager.calculateOxalateRisk(ox),
        INGREDIENT_PROPS: State.get('nutrientMap') || {},
        menuManager: this.menuManager
      });
    } catch (error) {
      console.error('Error loading menu details:', error);
      MenuRenderer.showError('Failed to load menu details');
    }
  }

  /**
   * Create new menu
   */
  create() {
    this.menuManager.startEdit(null);
    this.editorController.open('Create New Menu');
    MenuRenderer.renderSelectedRecipes([], {
      amount: (index, value) => this.menuManager.updateRecipeAmount(index, value),
      unit: (index, value) => this.menuManager.updateRecipeUnit(index, value)
    });
    this.updateNutrientPreview();
  }

  /**
   * Edit existing menu
   * Lazy loads recipe names from API
   */
  async edit() {
    const selectedId = State.get('selectedMenuId');
    if (!selectedId) return;

    this.menuManager.startEdit(selectedId);

    try {
      const menu = await this.menuManager.getMenu(selectedId);

      this.editorController.setTitle('Edit Menu');
      this.editorController.setName(menu.name);
      document.getElementById('recipeSearchBox').value = '';

      // 🎯 Lazy load recipe names in parallel
      const recipePromises = menu.recipes.map(async (recipeEntry) => {
        try {
          const result = await APIClient.getRecipe(recipeEntry.id, true); // summary=true for performance
          const recipeName = APIClient.isSuccess(result) ? result.data.name : `Recipe ${recipeEntry.id}`;

          return {
            id: recipeEntry.id,
            name: recipeName,
            amount: recipeEntry.amount,
            unit: recipeEntry.unit
          };
        } catch (error) {
          console.error(`Error loading recipe ${recipeEntry.id}:`, error);
          return {
            id: recipeEntry.id,
            name: `Recipe ${recipeEntry.id}`,
            amount: recipeEntry.amount,
            unit: recipeEntry.unit
          };
        }
      });

      const selectedRecipes = await Promise.all(recipePromises);

      State.set('selectedRecipesForMenu', selectedRecipes);
      this.editorController.show();
      this.updateNutrientPreview();
    } catch (error) {
      console.error('Error loading menu for editing:', error);
      alert('Failed to load menu details');
    }
  }

  /**
   * Delete menu
   */
  delete() {
    const selectedId = State.get('selectedMenuId');
    this.entityController.delete(selectedId);
  }

  /**
   * Close editor
   */
  closeEditor() {
    this.editorController.close();
    MenuRenderer.hideRecipeSearchResults();
  }

  /**
   * Save menu
   */
  async save(event) {
    event.preventDefault();

    const menuName = this.editorController.getName();
    const selectedRecipes = State.get('selectedRecipesForMenu');
    const validation = this.validateMenu(menuName, selectedRecipes);

    if (!validation.valid) {
      validation.errors.forEach(error => {
        FormRenderer.showError(error.field, error.message);
      });
      return;
    }

    FormRenderer.clearErrors();

    // 🎯 NEW PAYLOAD FORMAT
    const payload = {
      name: menuName,
      recipes: selectedRecipes.map(r => ({
        id: r.id,
        amount: r.amount,
        unit: r.unit
      }))
    };

    try {
      const editingId = State.get('editingMenuId');

      if (editingId) {
        await this.menuManager.updateMenu(editingId, payload);
        alert('Menu updated successfully');
        this.menuManager.selectMenu(editingId);
        await this.showDetails(editingId);
      } else {
        await this.menuManager.createMenu(payload);
        alert('Menu created successfully');
        const menus = State.get('menus');
        const newMenu = menus.find(m => m.name === menuName);
        if (newMenu) {
          this.menuManager.selectMenu(newMenu.id);
          await this.showDetails(newMenu.id);
        }
      }

      this.renderList(State.get('menus'));
      this.closeEditor();
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

  /**
   * Handle recipe search
   */
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

  /**
   * Perform recipe search via API
   */
  async performRecipeSearch(searchTerm) {
    try {
      // 🎯 Use API search instead of State.get('recipes')
      const result = await APIClient.getRecipes(searchTerm);

      if (APIClient.isSuccess(result)) {
        const results = result.data;
        const selectedRecipes = State.get('selectedRecipesForMenu');

        MenuRenderer.renderRecipeSearchResults(
          results,
          selectedRecipes,
          (recipe) => this.addRecipe(recipe)
        );
      }
    } catch (error) {
      console.error('Error searching recipes:', error);
      MenuRenderer.hideRecipeSearchResults();
    }
  }

  /**
   * Add recipe to menu
   */
  async addRecipe(recipe) {
    const added = await this.menuManager.addRecipeToMenu(recipe);

    if (added) {
      MenuRenderer.hideRecipeSearchResults();
      document.getElementById('recipeSearchBox').value = '';
      this.updateNutrientPreview();
    } else {
      alert('This recipe is already in the menu');
    }
  }

  /**
   * Update nutrient preview
   * 🎯 Now passes recipe amounts to preview manager
   */
  async updateNutrientPreview() {
    const container = document.getElementById('menuNutrientPreview');
    const toggleBtn = document.getElementById('toggleMenuPreviewBtn');

    if (!container) return;

    if (toggleBtn) {
      toggleBtn.textContent = this.showPreviewAllNutrients
        ? 'Show Key Nutrients'
        : 'Show All Nutrients';
    }

    const selectedRecipes = State.get('selectedRecipesForMenu');
    const data = await this.client.nutrientPreviewManager.calculateMenuTotals(selectedRecipes);

    if (!data) {
      container.innerHTML = '<p class="preview-empty">Add recipes to see nutritional preview</p>';
      return;
    }

    const html = this.showPreviewAllNutrients
      ? this.client.nutrientPreviewManager.renderAllNutrients(
        data,
        State.get('userSettings'),
        State.get('dailyRequirements'),
        this.previewNutrientPage,
        this.client.nutrientMetadataManager
      )
      : this.client.nutrientPreviewManager.renderKeyNutrients(
        data,
        State.get('userSettings'),
        State.get('dailyRequirements'),
        (ox) => this.menuManager.calculateOxalateRisk(ox),
        this.client.nutrientMetadataManager
      );

    container.innerHTML = html;
  }

  togglePreviewNutrients() {
    this.showPreviewAllNutrients = !this.showPreviewAllNutrients;
    this.previewNutrientPage = 0;
    this.updateNutrientPreview();
  }

  prevPreviewNutrientPage() {
    if (this.previewNutrientPage > 0) {
      this.previewNutrientPage--;
      this.updateNutrientPreview();
    }
  }

  nextPreviewNutrientPage() {
    this.previewNutrientPage++;
    this.updateNutrientPreview();
  }
}