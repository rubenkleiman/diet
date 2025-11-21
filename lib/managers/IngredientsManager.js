import IngredientRepository from '../repositories/IngredientRepository.js'

class IngredientsManager {
    constructor() {
        this.ingredientRepository = IngredientRepository;
    }

    /**
     * Gets all ingredient brands with compact DASH + oxalate info
     * @param {string} userId - User ID filter
     * @returns {Promise<Array>} Array of ingredient objects
     */
    async getAllIngredients(userId = null) {
        const ingredients = await this.ingredientRepository.getList(userId);
        return this._getIngredientResults(ingredients);
    }

    /**
     * Searches ingredients by term
     * @param {string} searchTerm 
     * @param {string} userId 
     * @returns {Promise<Array>} Filtered ingredients
     */
    async searchIngredients(searchTerm, userId = null) {
        const ingredients = await this.ingredientRepository.getList(userId, searchTerm);
        return this._getIngredientResults(ingredients);
    }

    _getIngredientResults(ingredients) {
        return ingredients.map(ingredient => ({
            id: ingredient.id,
            name: ingredient.name,
            compact: {
                display: ingredient.compact_display,
                values: {
                    oxalate: ingredient.oxalate_per_gram ? parseFloat(ingredient.oxalate_per_gram) : 0
                }
            }
        }));
    }

    /**
     * Gets full detailed information for an ingredient
     * @param {number} brandId - Brand ID
     * @param {string} userId 
     * @returns {Promise<Object|null>} Full ingredient details
     */
    async getIngredientDetails(brandId, userId = null) {
        return await this.ingredientRepository.getById(brandId, userId);
    }
}

export default new IngredientsManager()