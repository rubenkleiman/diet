/**
 * Ingredient Page Controller
 * Handles all ingredient page logic
 */

import { IngredientManager } from '../managers/IngredientManager.js';
import { IngredientRenderer } from '../renderers/IngredientRenderer.js';
import { FormRenderer } from '../renderers/FormRenderer.js';
import { EntityController } from '../controllers/EntityController.js';
import { EditorController } from '../controllers/EditorController.js';
import { State, showModal } from '../core/State.js';
import { validateIngredient } from '../utils/Validation.js';

export class IngredientPageController {
  constructor(client) {
    this.client = client;
    this.ingredientManager = new IngredientManager();

    // Entity controller
    this.entityController = new EntityController({
      entityName: 'ingredient',
      entityNamePlural: 'ingredients',
      manager: this.ingredientManager,
      renderer: IngredientRenderer,
      state: State,
      editButtonId: 'editIngredientBtn',
      deleteButtonId: 'deleteIngredientBtn',
      detailsSectionId: 'ingredientDetailsSection'
    });
    this.entityController.showDetails = (id) => this.showDetails(id);

    // Editor controller
    this.editorController = new EditorController({
      panelId: 'ingredientEditPanel',
      formId: 'ingredientEditForm',
      titleId: 'ingredientEditPanelTitle',
      nameInputId: 'ingredientNameInput',
      manager: this.ingredientManager,
      renderer: FormRenderer
    });

    this._dataLoaded = false;
  }

  /**
   * Initialize page
   * Lazy load data only when page is visited
   */
  async init() {
    if (!this._dataLoaded) {
      try {
        await this.ingredientManager.loadIngredients();
        this._dataLoaded = true;
      } catch (error) {
        console.error('Failed to load ingredients:', error);
        const list = document.getElementById('ingredientList');
        if (list) {
          list.innerHTML = '<li class="error-message">Failed to load ingredients. Please refresh.</li>';
        }
        return;
      }
    }

    const ingredients = State.get('ingredients');
    this.renderList(ingredients);
  }

  /**
   * Render ingredient list
   */
  renderList(ingredients) {
    IngredientRenderer.renderList(ingredients, (ingredientId) => {
      this.entityController.select(ingredientId);
    });
  }

  /**
   * Filter ingredients
   */
  filter(searchTerm) {
    this.entityController.filter(searchTerm);
  }

  /**
   * Select ingredient
   */
  async select(ingredientId) {
    await this.entityController.select(ingredientId);
  }

  /**
   * Show ingredient details
   */
  async showDetails(brandId) {
    try {
      const data = await this.ingredientManager.getIngredient(brandId);
      IngredientRenderer.renderDetails(data);
    } catch (error) {
      console.error('Error loading ingredient details:', error);
    }
  }

  /**
   * Create new ingredient
   */
  create() {
    this.ingredientManager.startEdit(null);
    this.editorController.open('Create New Ingredient');
    FormRenderer.clearIngredientForm();
  }

  /**
   * Edit existing ingredient
   */
  async edit() {
    const selectedId = State.get('selectedIngredientId');
    if (!selectedId) return;

    this.ingredientManager.startEdit(selectedId);

    try {
      const ingredient = await this.ingredientManager.getIngredientFull(selectedId);

      this.editorController.setTitle('Edit Ingredient');
      FormRenderer.populateIngredientForm(ingredient);
      this.editorController.show();
    } catch (error) {
      console.error('Error loading ingredient for editing:', error);
      await showModal(`Ingredient Details`, "Failed to load ingredient details", [{ OK: "blue" }])
    }
  }

  /**
   * Delete ingredient
   */
  delete() {
    const selectedId = State.get('selectedIngredientId');
    this.entityController.delete(selectedId);
  }

  /**
   * Close editor
   */
  closeEditor() {
    this.editorController.close();
  }

  /**
   * Save ingredient
   */
  async save(event) {
    event.preventDefault();

    const name = this.editorController.getName();
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
      const editingId = State.get('editingIngredientId');

      if (editingId) {
        await this.ingredientManager.updateIngredient(editingId, payload);
        await showModal(`Ingredient ${name}`, "Ingredient updated successfully", [{ OK: "blue" }])
        await this.showDetails(editingId);
        this.ingredientManager.selectIngredient(editingId);
      } else {
        await this.ingredientManager.createIngredient(payload);
        await showModal(`Ingredient ${name}`, "Ingredient created successfully", [{ OK: "blue" }])
        const ingredients = State.get('ingredients');
        const newIngredient = ingredients.find(i => i.name == name);
        if (newIngredient) {
          await this.showDetails(newIngredient.id);
          this.ingredientManager.selectIngredient(newIngredient.id);
        }
      }

      this.renderList(State.get('ingredients'));
      this.closeEditor();
    } catch (error) {
      console.error('Error saving ingredient:', error);
      FormRenderer.showError('ingredientNameError', error.message || 'Failed to save ingredient');
    }
  }

  /**
   * Helper to get input ID for a nutrient
   */
  getNutrientInputId(nutrientKey) {
    // Convert nutrient key to input ID format
    // e.g., 'saturated_fat' -> 'saturatedFatInput'
    let key = nutrientKey;
    if (/poly/.test(key)) { // KLUDGE 
      key = 'polysaturated_fat';
    }
    const camelCase = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    const id = camelCase + 'Input';
    return id;
  }
}
