/**
 * Ingredient Manager
 * Handles all ingredient-related operations
 */

import { State } from '@core/State.js';
import { APIClient } from '@core/APIClient.js';

export class IngredientManager {
  
  /**
   * Load all ingredients from API
   */
  async loadIngredients() {
    try {
      const result = await APIClient.getIngredients();
      
      if (APIClient.isSuccess(result)) {
        State.set('ingredients', result.data);
        return result.data;
      } else {
        console.error('Error loading ingredients:', APIClient.getError(result));
        throw new Error(APIClient.getError(result));
      }
    } catch (error) {
      console.error('Error loading ingredients:', error);
      throw error;
    }
  }

  /**
   * Get ingredient by ID
   */
  async getIngredient(id) {
    try {
      const result = await APIClient.getIngredient(id);
      
      if (APIClient.isSuccess(result)) {
        return result.data;
      } else {
        throw new Error(APIClient.getError(result));
      }
    } catch (error) {
      console.error('Error loading ingredient:', error);
      throw error;
    }
  }

  /**
   * Get full ingredient details for editing
   */
  async getIngredientFull(id) {
    try {
      const result = await APIClient.getIngredientFull(id);
      
      if (APIClient.isSuccess(result)) {
        return result.data;
      } else {
        throw new Error(APIClient.getError(result));
      }
    } catch (error) {
      console.error('Error loading ingredient for editing:', error);
      throw error;
    }
  }

  /**
   * Create a new ingredient
   */
  async createIngredient(ingredientData) {
    try {
      const result = await APIClient.createIngredient(ingredientData);
      
      if (APIClient.isSuccess(result)) {
        await this.loadIngredients(); // Refresh list
        return result.data;
      } else {
        throw new Error(APIClient.getError(result));
      }
    } catch (error) {
      console.error('Error creating ingredient:', error);
      throw error;
    }
  }

  /**
   * Update an existing ingredient
   */
  async updateIngredient(id, ingredientData) {
    try {
      const result = await APIClient.updateIngredient(id, ingredientData);
      
      if (APIClient.isSuccess(result)) {
        await this.loadIngredients(); // Refresh list
        return result.data;
      } else {
        throw new Error(APIClient.getError(result));
      }
    } catch (error) {
      console.error('Error updating ingredient:', error);
      throw error;
    }
  }

  /**
   * Delete an ingredient
   */
  async deleteIngredient(id) {
    try {
      const result = await APIClient.deleteIngredient(id);
      
      if (APIClient.isSuccess(result)) {
        await this.loadIngredients(); // Refresh list
        return true;
      } else {
        throw new Error(APIClient.getError(result));
      }
    } catch (error) {
      console.error('Error deleting ingredient:', error);
      throw error;
    }
  }

  /**
   * Search ingredients
   */
  async searchIngredients(searchTerm) {
    try {
      const result = await APIClient.getIngredients(searchTerm);
      
      if (APIClient.isSuccess(result)) {
        return result.data;
      } else {
        throw new Error(APIClient.getError(result));
      }
    } catch (error) {
      console.error('Error searching ingredients:', error);
      throw error;
    }
  }

  /**
   * Select an ingredient
   */
  selectIngredient(ingredientId) {
    State.set('selectedIngredientId', ingredientId);
  }

  /**
   * Deselect ingredient
   */
  deselectIngredient() {
    State.set('selectedIngredientId', null);
  }

  /**
   * Filter ingredients by search term
   */
  filterIngredients(searchTerm) {
    const ingredients = State.get('ingredients');
    const term = searchTerm.toLowerCase().trim();

    if (!term) {
      return ingredients;
    }

    return ingredients.filter(ing =>
      ing.name.toLowerCase().includes(term)
    );
  }

  /**
   * Start editing an ingredient
   */
  startEdit(ingredientId = null) {
    State.set('editingIngredientId', ingredientId);
  }

  /**
   * Cancel editing
   */
  cancelEdit() {
    State.set('editingIngredientId', null);
  }
}
