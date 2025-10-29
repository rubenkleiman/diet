// FIXED 2025-10-29 1pm
import MakeMenu from './lib/MakeMenu.js'
import { Recipes } from './lib/Recipes.js'
import IngredientsManager from './lib/IngredientsManager.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class ServicesClass {
    constructor() {
        this.menu = new MakeMenu()
        this.recipeIdMap = this.buildRecipeIdMap()
        this.ingredientsManager = IngredientsManager
        
        // Load kidney stone risk data from lib/data
        const kidneyRiskPath = path.join(__dirname, 'lib', 'data', 'kidneyStoneRisk.json')
        this.kidneyStoneRiskData = JSON.parse(fs.readFileSync(kidneyRiskPath, 'utf8'))
        
        // Load daily requirements from lib/data
        const dailyReqPath = path.join(__dirname, 'lib', 'data', 'dailyRequirements.json')
        this.dailyRequirements = JSON.parse(fs.readFileSync(dailyReqPath, 'utf8'))
    }

    /**
     * Creates canonical recipe IDs from recipe names
     * @returns {Object} Map of recipeId -> recipeName and recipeName -> recipeId
     */
    buildRecipeIdMap() {
        const map = {
            toName: {},
            toId: {}
        }
        
        const recipeNames = this.menu.getAllRecipeNames()
        
        for (const name of recipeNames) {
            const id = this.canonicalizeRecipeId(name)
            map.toName[id] = name
            map.toId[name] = id
        }
        
        return map
    }

    /**
     * Converts recipe name to canonical ID
     * @param {string} name - Recipe name
     * @returns {string} Canonical ID (lowercase, hyphens, no special chars)
     */
    canonicalizeRecipeId(name) {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Remove duplicate hyphens
    }

    /**
     * Gets recipe name from canonical ID
     * @param {string} recipeId 
     * @returns {string|null} Recipe name or null if not found
     */
    getRecipeNameFromId(recipeId) {
        return this.recipeIdMap.toName[recipeId] || null
    }

    /**
     * Gets all recipes with their IDs
     * @returns {Array} Array of {id, name} objects
     */
    getAllRecipes() {
        const recipeNames = this.menu.getAllRecipeNames()
        return recipeNames.map(name => ({
            id: this.recipeIdMap.toId[name],
            name: name
        }))
    }

    /**
     * Gets detailed nutrition information for a recipe
     * @param {string} recipeId - Canonical recipe ID
     * @param {boolean} summary - If true, return summary fields only
     * @returns {Object|null} Recipe details or null if not found
     */
    getRecipeDetails(recipeId, summary = false) {
        const recipeName = this.getRecipeNameFromId(recipeId)
        if (!recipeName) {
            return null
        }

        return this.menu.getRecipeData(recipeName, summary)
    }

    /**
     * Compares two recipe variations
     * @param {string} recipeId - Base recipe canonical ID
     * @param {Object} variations - Ingredient variations
     * @param {Object} addedIngredients - New ingredients
     * @param {Array<string>} removedIngredients - Ingredients to remove
     * @param {boolean} summary - Summary mode
     * @param {Array<string>} explained - Nutrients to explain
     * @returns {Object|null} Comparison data or null if not found
     */
    compareRecipeVariations(recipeId, variations = {}, addedIngredients = {}, removedIngredients = [], summary = false, explained = []) {
        const recipeName = this.getRecipeNameFromId(recipeId)
        if (!recipeName) {
            return null
        }

        return this.menu.getRecipeComparison(
            recipeName,
            variations,
            addedIngredients,
            removedIngredients,
            summary,
            explained
        )
    }

    /**
     * Gets all ingredients with compact info
     * @returns {Array} Array of ingredients
     */
    getAllIngredients() {
        return this.ingredientsManager.getAllIngredients()
    }

    /**
     * Searches ingredients by term
     * @param {string} searchTerm 
     * @returns {Array} Filtered ingredients
     */
    searchIngredients(searchTerm) {
        return this.ingredientsManager.searchIngredients(searchTerm)
    }

    /**
     * Gets detailed info for a specific ingredient
     * @param {string} brandName 
     * @returns {Object|null} Ingredient details
     */
    getIngredientDetails(brandName) {
        return this.ingredientsManager.getIngredientDetails(brandName)
    }

    /**
     * Gets kidney stone risk levels and limits
     * @returns {Object} Risk data
     */
    getKidneyStoneRiskData() {
        return this.kidneyStoneRiskData
    }

    /**
     * Gets daily requirements
     * @returns {Object} Daily requirements data
     */
    getDailyRequirements() {
        return this.dailyRequirements
    }

    /**
     * Calculates oxalate risk level based on user settings
     * @param {number} oxalateMg - Oxalate amount in mg
     * @param {string} riskLevel - User's kidney stone risk level
     * @returns {Object} {status: 'safe'|'warning'|'danger', percent, message}
     */
    calculateOxalateRisk(oxalateMg, riskLevel = 'Normal') {
        const maxOxalates = this.kidneyStoneRiskData[riskLevel]?.maxOxalatesPerDay || 200
        const percent = (oxalateMg / maxOxalates) * 100

        if (percent < 50) {
            return { status: 'safe', percent, color: '#27ae60', message: '' }
        } else if (percent < 100) {
            return { 
                status: 'warning', 
                percent, 
                color: '#b8860b', 
                message: `Approaching your daily oxalate limit (${maxOxalates}mg)`
            }
        } else {
            return { 
                status: 'danger', 
                percent, 
                color: '#e74c3c', 
                message: `Exceeds your daily oxalate limit (${maxOxalates}mg). This recipe contains ${oxalateMg.toFixed(1)}mg oxalates, which is ${(percent - 100).toFixed(0)}% over your ${riskLevel.toLowerCase()} risk limit.`
            }
        }
    }
}

const services = new ServicesClass()
export default services