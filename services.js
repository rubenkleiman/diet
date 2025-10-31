// FIXED 2025-10-30 5:20pm PDT
// Updated: async methods, database repositories, brandId instead of brandName
import MakeMenu from './lib/MakeMenu.js'
import IngredientsManager from './lib/IngredientsManager.js'
import RecipeRepository from './lib/db/RecipeRepository.js'
import database from './lib/db/Database.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// System user ID (auto-logged in for now)
const SYSTEM_USER_ID = 'a70ff520-1125-4098-90b3-144e22ebe84a'

class ServicesClass {
    constructor() {
        this.menu = new MakeMenu()
        this.ingredientsManager = IngredientsManager
        this.recipeRepository = RecipeRepository
        this.currentUserId = SYSTEM_USER_ID // Hardcoded for now
        
        // Load kidney stone risk data from lib/data
        const kidneyRiskPath = path.join(__dirname, 'lib', 'data', 'kidneyStoneRisk.json')
        this.kidneyStoneRiskData = JSON.parse(fs.readFileSync(kidneyRiskPath, 'utf8'))
        
        // Daily requirements will be loaded from database
        this.dailyRequirements = null
        
        // Recipe ID map (lazy loaded)
        this.recipeIdMap = null
    }

    /**
     * Load daily requirements from database
     */
    async loadDailyRequirements() {
        if (this.dailyRequirements) return

        const requirements = await database.all('SELECT * FROM daily_requirements')
        this.dailyRequirements = {}
        
        for (const req of requirements) {
            this.dailyRequirements[req.name] = {
                recommended: req.recommended,
                dashRecommendation: req.dash_recommendation,
                minimum: req.minimum,
                maximum: req.maximum,
                note: req.note,
                source: req.source
            }
        }
    }

    /**
     * Initialize recipe ID map from database
     */
    async initRecipeIdMap() {
        if (this.recipeIdMap) return

        const recipes = await this.recipeRepository.getList(this.currentUserId)
        this.recipeIdMap = {
            toName: {},
            toId: {}
        }

        for (const recipe of recipes) {
            const id = this.canonicalizeRecipeId(recipe.name)
            this.recipeIdMap.toName[id] = recipe.name
            this.recipeIdMap.toId[recipe.name] = id
        }
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
        return this.recipeIdMap?.toName[recipeId] || null
    }

    /**
     * Gets all recipes with their IDs
     * @returns {Promise<Array>} Array of {id, name} objects
     */
    async getAllRecipes() {
        await this.initRecipeIdMap()
        const recipes = await this.recipeRepository.getList(this.currentUserId)
        return recipes.map(recipe => ({
            id: this.recipeIdMap.toId[recipe.name],
            name: recipe.name
        }))
    }

    /**
     * Gets detailed nutrition information for a recipe
     * @param {string} recipeId - Canonical recipe ID
     * @param {boolean} summary - If true, return summary fields only
     * @returns {Promise<Object|null>} Recipe details or null if not found
     */
    async getRecipeDetails(recipeId, summary = false) {
        await this.initRecipeIdMap()
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
     * @returns {Promise<Object|null>} Comparison data or null if not found
     */
    async compareRecipeVariations(recipeId, variations = {}, addedIngredients = {}, removedIngredients = [], summary = false, explained = []) {
        await this.initRecipeIdMap()
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
     * @returns {Promise<Array>} Array of ingredients
     */
    async getAllIngredients() {
        return await this.ingredientsManager.getAllIngredients(this.currentUserId)
    }

    /**
     * Searches ingredients by term
     * @param {string} searchTerm 
     * @returns {Promise<Array>} Filtered ingredients
     */
    async searchIngredients(searchTerm) {
        return await this.ingredientsManager.searchIngredients(searchTerm, this.currentUserId)
    }

    /**
     * Gets detailed info for a specific ingredient
     * @param {number} brandId - Brand ID
     * @returns {Promise<Object|null>} Ingredient details
     */
    async getIngredientDetails(brandId) {
        return await this.ingredientsManager.getIngredientDetails(brandId, this.currentUserId)
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
     * @returns {Promise<Object>} Daily requirements data
     */
    async getDailyRequirements() {
        await this.loadDailyRequirements()
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