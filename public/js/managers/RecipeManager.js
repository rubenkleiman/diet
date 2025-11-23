/**
 * Recipe Manager
 * Handles all recipe-related operations
 */

import { State } from '../core/State.js';
import { APIClient } from '../core/APIClient.js';
import { OxalateHelper } from '../utils/OxalateHelper.js';

export class RecipeManager {
  constructor() {
    this.NUTRIENTS_PER_PAGE = 5;
  }

  /**
   * Load all recipes from API
   */
  async loadRecipes() {
    try {
      const result = await APIClient.getRecipes();
      
      if (APIClient.isSuccess(result)) {
        State.set('recipes', result.data);
        return result.data;
      } else {
        console.error('Error loading recipes:', APIClient.getError(result));
        throw new Error(APIClient.getError(result));
      }
    } catch (error) {
      console.error('Error loading recipes:', error);
      throw error;
    }
  }

  /**
   * Get recipe by ID with details
   */
  async getRecipe(id, summary = false) {
    try {
      const result = await APIClient.getRecipe(id, summary);
      
      if (APIClient.isSuccess(result)) {
        return result.data;
      } else {
        throw new Error(APIClient.getError(result));
      }
    } catch (error) {
      console.error('Error loading recipe:', error);
      throw error;
    }
  }

  /**
   * Get full recipe details for editing
   */
  async getRecipeFull(id) {
    try {
      const result = await APIClient.getRecipeFull(id);
      
      if (APIClient.isSuccess(result)) {
        return result.data;
      } else {
        throw new Error(APIClient.getError(result));
      }
    } catch (error) {
      console.error('Error loading recipe for editing:', error);
      throw error;
    }
  }

  /**
   * Create a new recipe
   */
  async createRecipe(recipeData) {
    try {
      const result = await APIClient.createRecipe(recipeData);
      
      if (APIClient.isSuccess(result)) {
        await this.loadRecipes(); // Refresh list
        return result.data;
      } else {
        throw new Error(APIClient.getError(result));
      }
    } catch (error) {
      console.error('Error creating recipe:', error);
      throw error;
    }
  }

  /**
   * Update an existing recipe
   */
  async updateRecipe(id, recipeData) {
    try {
      const result = await APIClient.updateRecipe(id, recipeData);
      
      if (APIClient.isSuccess(result)) {
        await this.loadRecipes(); // Refresh list
        return result.data;
      } else {
        throw new Error(APIClient.getError(result));
      }
    } catch (error) {
      console.error('Error updating recipe:', error);
      throw error;
    }
  }

  /**
   * Delete a recipe
   */
  async deleteRecipe(id) {
    try {
      const result = await APIClient.deleteRecipe(id);
      
      if (APIClient.isSuccess(result)) {
        await this.loadRecipes(); // Refresh list
        return true;
      } else {
        throw new Error(APIClient.getError(result));
      }
    } catch (error) {
      console.error('Error deleting recipe:', error);
      throw error;
    }
  }

  /**
   * Select a recipe
   */
  selectRecipe(recipeId) {
    State.set('selectedRecipeId', recipeId);
  }

  /**
   * Deselect recipe
   */
  deselectRecipe() {
    State.set('selectedRecipeId', null);
  }

  /**
   * Filter recipes by search term
   */
  filterRecipes(searchTerm) {
    const recipes = State.get('recipes');
    const term = searchTerm.toLowerCase().trim();

    if (!term) {
      return recipes;
    }

    return recipes.filter(recipe =>
      recipe.name.toLowerCase().includes(term)
    );
  }

  /**
   * Calculate oxalate risk (using centralized helper)
   */
  calculateOxalateRisk(oxalateMg) {
    return OxalateHelper.calculateRisk(oxalateMg);
  }

  /**
   * Calculate ingredient contributions
   */
  calculateContributions(recipeData) {
    const contributions = {};

    recipeData.ingredients.forEach(ingredient => {
      contributions[ingredient.name] = {
        amount: ingredient.amount,
        nutrients: {}
      };

      for (const [nutrient, value] of Object.entries(ingredient.nutritionScaled)) {
        const total = recipeData.totals[nutrient] || 0;
        const percent = total > 0 ? (value / total * 100) : 0;
        contributions[ingredient.name].nutrients[nutrient] = {
          value: value,
          percent: percent
        };
      }
    });

    return contributions;
  }

  /**
   * Start editing a recipe
   */
  startEdit(recipeId = null) {
    State.set('editingRecipeId', recipeId);
    
    if (recipeId === null) {
      // Creating new recipe
      State.set('selectedIngredientsForRecipe', []);
    }
  }

  /**
   * Cancel editing
   */
  cancelEdit() {
    State.set('editingRecipeId', null);
    State.set('selectedIngredientsForRecipe', []);
  }

  /**
   * Add ingredient to recipe being edited
   */
  addIngredientToRecipe(ingredient) {
    const selected = State.get('selectedIngredientsForRecipe');
    
    // Check if already added
    if (selected.some(ing => ing.brandId === ingredient.id)) {
      return false;
    }

    selected.push({
      brandId: ingredient.id,
      name: ingredient.name,
      amount: 100,
      unit: 'g'
    });

    State.set('selectedIngredientsForRecipe', [...selected]);
    return true;
  }

  /**
   * Remove ingredient from recipe being edited
   */
  removeIngredientFromRecipe(index) {
    const selected = State.get('selectedIngredientsForRecipe');
    selected.splice(index, 1);
    State.set('selectedIngredientsForRecipe', [...selected]);
  }

  /**
   * Update ingredient amount in recipe being edited
   */
  updateIngredientAmount(index, amount) {
    const selected = State.get('selectedIngredientsForRecipe');
    selected[index].amount = parseFloat(amount);
    State.set('selectedIngredientsForRecipe', [...selected]);
  }

  /**
   * Update ingredient unit in recipe being edited
   */
  updateIngredientUnit(index, unit) {
    const selected = State.get('selectedIngredientsForRecipe');
    selected[index].unit = unit;
    State.set('selectedIngredientsForRecipe', [...selected]);
  }

  /**
   * Toggle nutrient view (key vs all)
   */
  toggleNutrientView() {
    const current = State.get('showAllNutrients');
    State.set('showAllNutrients', !current);
    State.set('currentNutrientPage', 0);
  }

  /**
   * Navigate to previous nutrient page
   */
  prevNutrientPage() {
    const current = State.get('currentNutrientPage');
    if (current > 0) {
      State.set('currentNutrientPage', current - 1);
    }
  }

  /**
   * Navigate to next nutrient page
   */
  nextNutrientPage() {
    State.set('currentNutrientPage', State.get('currentNutrientPage') + 1);
  }
}