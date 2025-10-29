import { Brands } from './Brands.js'
import { Oxalates } from './Oxalates.js'
import Converter from './Converter.js'

class IngredientsManager {
    constructor() {
        this.brands = Brands
        this.oxalates = Oxalates
    }

    /**
     * Gets all ingredient brands with compact DASH + oxalate info
     * @returns {Array} Array of ingredient objects
     */
    getAllIngredients() {
        return this.brands.list.map(brand => {
            const compact = this.getCompactInfo(brand)
            return {
                name: brand.name,
                compact,
                ...compact.values
            }
        })
    }

    /**
     * Gets compact DASH nutrients and oxalate info for display
     * @param {Brand} brand 
     * @returns {Object} Compact display string and raw values
     */
    getCompactInfo(brand) {
        const values = {}
        
        // Get key DASH nutrients (per serving)
        if (brand.data.calcium) {
            const { amount } = Converter.getMeasureComponents(brand.data.calcium)
            values.calcium = amount
        }
        
        if (brand.data.potassium) {
            const { amount } = Converter.getMeasureComponents(brand.data.potassium)
            values.potassium = amount
        }
        
        if (brand.data.magnesium) {
            const { amount } = Converter.getMeasureComponents(brand.data.magnesium)
            values.magnesium = amount
        }
        
        // Get oxalate content (per gram)
        const oxalatePerGram = this.oxalates.getPerGram(brand.name)
        values.oxalate = oxalatePerGram
        
        // Build compact string: Ca:380 K:473 Mg:20 Ox:0.01
        const parts = []
        if (values.calcium) parts.push(`Ca:${values.calcium}`)
        if (values.potassium) parts.push(`K:${values.potassium}`)
        if (values.magnesium) parts.push(`Mg:${values.magnesium}`)
        parts.push(`Ox:${values.oxalate.toFixed(3)}`)
        
        return {
            display: parts.join(' '),
            values
        }
    }

    /**
     * Gets full detailed information for an ingredient
     * @param {string} brandName 
     * @returns {Object|null} Full ingredient details
     */
    getIngredientDetails(brandName) {
        const brand = this.brands.find(brandName)
        if (!brand) return null

        const gramsPerServing = Converter.toGrams(brand.serving, brand.density)
        const oxalatePerGram = this.oxalates.getPerGram(brand.name)

        return {
            name: brand.name,
            serving: brand.serving,
            gramsPerServing,
            density: brand.density,
            data: brand.data,
            oxalatePerGram,
            oxalatePerServing: oxalatePerGram * gramsPerServing
        }
    }

    /**
     * Filters ingredients by search term
     * @param {string} searchTerm 
     * @returns {Array} Filtered ingredients
     */
    searchIngredients(searchTerm) {
        const term = searchTerm.toLowerCase().trim()
        if (!term) {
            return this.getAllIngredients()
        }

        return this.getAllIngredients().filter(ingredient => 
            ingredient.name.toLowerCase().includes(term)
        )
    }
}

export default new IngredientsManager()