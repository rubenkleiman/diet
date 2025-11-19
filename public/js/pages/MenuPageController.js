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
      MenuRenderer.renderSelectedRecipes(newValue, (index) => {
        this.menuManager.removeRecipeFromMenu(index);
      });
      this.updateNutrientPreview();
    });
  }

  /**
   * Initialize page
   */
  init() {
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

    // Load summaries asynchronously
    menus.forEach(menu => {
      this.fetchSummary(menu.id).then(data => {
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

  async fetchSummary(menuId) {
    try {
      const menu = await this.menuManager.getMenu(menuId);
      return await this.menuManager.getMenuNutritionalData(menu);
    } catch (error) {
      console.error('Error fetching menu summary:', error);
      return null;
    }
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
    MenuRenderer.renderSelectedRecipes([]);
    this.updateNutrientPreview();
  }

  /**
   * Edit existing menu
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

      const recipes = State.get('recipes');
      const recipePromises = menu.recipeIds.map(id =>
        recipes.find(r => r.id === id)
      );

      const selectedRecipes = recipePromises
        .filter(r => r !== undefined)
        .map(r => ({ id: r.id, name: r.name }));

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

    const payload = {
      name: menuName,
      recipeIds: selectedRecipes.map(r => r.id)
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

  performRecipeSearch(searchTerm) {
    const recipes = State.get('recipes');
    const term = searchTerm.toLowerCase();
    const results = recipes.filter(recipe =>
      recipe.name.toLowerCase().includes(term)
    );

    const selectedRecipes = State.get('selectedRecipesForMenu');
    MenuRenderer.renderRecipeSearchResults(
      results,
      selectedRecipes,
      (recipe) => this.addRecipe(recipe)
    );
  }

  /**
   * Add recipe to menu
   */
  addRecipe(recipe) {
    const added = this.menuManager.addRecipeToMenu(recipe);

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
