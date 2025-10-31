// FIXED 2025-10-30 5:15pm PDT
// Updated to use BrandRepository (database) instead of Brands (JSON)
// Now uses brand IDs instead of names for API safety
import BrandRepository from './db/BrandRepository.js'

class IngredientsManager {
    constructor() {
        this.brandRepository = BrandRepository
    }

    /**
     * Gets all ingredient brands with compact DASH + oxalate info
     * @param {string} userId - User ID filter
     * @returns {Promise<Array>} Array of ingredient objects
     */
    async getAllIngredients(userId = null) {
        const brands = await this.brandRepository.getList(userId)
        
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
        const brands = await this.brandRepository.getList(userId, searchTerm)
        
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
        return await this.brandRepository.getById(brandId, userId)
    }
}

export default new IngredientsManager()