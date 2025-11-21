import IngredientRepository from '../repositories/IngredientRepository.js'

class IngredientsManager {
    constructor() {
        this.ingredientRepository = IngredientRepository
    }

    /**
     * Gets all ingredient brands with compact DASH + oxalate info
     * @param {string} userId - User ID filter
     * @returns {Promise<Array>} Array of ingredient objects
     */
    async getAllIngredients(userId = null) {
        const brands = await this.ingredientRepository.getList(userId)
        
        return brands.map(brand => ({
            id: brand.id,
            name: brand.name,
            compact: {
                display: brand.compact_display,
                values: {
                    oxalate: brand.oxalate_per_gram ? parseFloat(brand.oxalate_per_gram) : 0
                }
            }
        }))
    }

    /**
     * Searches ingredients by term
     * @param {string} searchTerm 
     * @param {string} userId 
     * @returns {Promise<Array>} Filtered ingredients
     */
    async searchIngredients(searchTerm, userId = null) {
        const brands = await this.ingredientRepository.getList(userId, searchTerm)
        
        return brands.map(brand => ({
            id: brand.id,
            name: brand.name,
            compact: {
                display: brand.compact_display,
                values: {
                    oxalate: brand.oxalate_per_gram ? parseFloat(brand.oxalate_per_gram) : 0
                }
            }
        }))
    }

    /**
     * Gets full detailed information for an ingredient
     * @param {number} brandId - Brand ID
     * @param {string} userId 
     * @returns {Promise<Object|null>} Full ingredient details
     */
    async getIngredientDetails(brandId, userId = null) {
        return await this.ingredientRepository.getById(brandId, userId)
    }
}

export default new IngredientsManager()