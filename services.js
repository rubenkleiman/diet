// FIXED 2025-10-31 - Added CRUD methods for recipes
// Updated: async methods, database repositories, brandId instead of brandName
import MakeMenu from './lib/MakeMenu.js'
import IngredientsManager from './lib/IngredientsManager.js'
import RecipeRepository from './lib/db/RecipeRepository.js'
import BrandRepository from './lib/db/BrandRepository.js'
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
        this.brandRepository = BrandRepository
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
     * Refresh recipe ID map (call after create/update/delete)
     */
    async refreshRecipeIdMap() {
        this.recipeIdMap = null
        await this.initRecipeIdMap()
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
     * Gets full recipe details for editing (with brandIds, amounts, units)
     * @param {string} recipeId - Canonical recipe ID
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} Full recipe details or null if not found
     */
    async getRecipeFullDetails(recipeId, userId) {
        await this.initRecipeIdMap()
        const recipeName = this.getRecipeNameFromId(recipeId)
        if (!recipeName) {
            return null
        }

        // Get recipe from database
        const recipe = await this.recipeRepository.getByName(recipeName, userId)
        if (!recipe) {
            return null
        }

        // Convert ingredients to include brandIds
        const ingredients = []
        for (const [brandName, measure] of Object.entries(recipe.ingredients)) {
            // Get brand ID from database
            const brandRecord = await database.get('SELECT id FROM brands WHERE name = ?', [brandName])
            if (brandRecord) {
                const measureParts = measure.split(' ')
                ingredients.push({
                    brandId: brandRecord.id,
                    brandName: brandName,
                    amount: parseFloat(measureParts[0]),
                    unit: measureParts[1]
                })
            }
        }

        return {
            id: recipe.id,
            name: recipe.name,
            ingredients: ingredients
        }
    }

    /**
     * Create a new recipe
     * @param {string} name - Recipe name
     * @param {Array} ingredients - Array of {brandId, amount, unit}
     * @param {string} userId - User ID
     * @returns {Promise<string>} Canonical recipe ID
     */
    async createRecipe(name, ingredients, userId) {
        // Convert brandIds to brandNames for RecipeRepository
        const ingredientsMap = {}
        
        for (const ing of ingredients) {
            const brand = await this.brandRepository.getById(ing.brandId, userId)
            if (!brand) {
                throw new Error(`Brand with ID ${ing.brandId} not found`)
            }
            ingredientsMap[brand.name] = `${ing.amount} ${ing.unit}`
        }
        
        // Create recipe in database
        await this.recipeRepository.create(name, ingredientsMap, userId)
        
        // Refresh ID map
        await this.refreshRecipeIdMap()
        
        // Return canonical ID
        return this.canonicalizeRecipeId(name)
    }

    /**
     * Update an existing recipe
     * @param {string} recipeId - Canonical recipe ID
     * @param {string} name - New recipe name
     * @param {Array} ingredients - Array of {brandId, amount, unit}
     * @param {string} userId - User ID
     */
    async updateRecipe(recipeId, name, ingredients, userId) {
        await this.initRecipeIdMap()
        const recipeName = this.getRecipeNameFromId(recipeId)
        if (!recipeName) {
            throw new Error('Recipe not found')
        }
        
        // Get recipe database ID
        const recipe = await this.recipeRepository.getByName(recipeName, userId)
        if (!recipe) {
            throw new Error('Recipe not found')
        }
        
        // Convert brandIds to brandNames for RecipeRepository
        const ingredientsMap = {}
        
        for (const ing of ingredients) {
            const brand = await this.brandRepository.getById(ing.brandId, userId)
            if (!brand) {
                throw new Error(`Brand with ID ${ing.brandId} not found`)
            }
            ingredientsMap[brand.name] = `${ing.amount} ${ing.unit}`
        }
        
        // Update recipe in database
        await this.recipeRepository.update(recipe.id, name, ingredientsMap, userId)
        
        // Refresh ID map
        await this.refreshRecipeIdMap()
    }

    /**
     * Delete a recipe
     * @param {string} recipeId - Canonical recipe ID
     * @param {string} userId - User ID
     */
    async deleteRecipe(recipeId, userId) {
        await this.initRecipeIdMap()
        const recipeName = this.getRecipeNameFromId(recipeId)
        if (!recipeName) {
            throw new Error('Recipe not found')
        }
        
        // Get recipe database ID
        const recipe = await this.recipeRepository.getByName(recipeName, userId)
        if (!recipe) {
            throw new Error('Recipe not found')
        }
        
        // Delete recipe from database
        await this.recipeRepository.delete(recipe.id, userId)
        
        // Refresh ID map
        await this.refreshRecipeIdMap()
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
     * Gets full ingredient details for editing
     * @param {number} brandId - Brand ID
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} Full ingredient details
     */
    async getIngredientFullDetails(brandId, userId) {
        const ingredient = await this.brandRepository.getById(brandId, userId)
        if (!ingredient) return null
        
        // Get raw data from database with ALL fields
        const brandData = await database.get(`
            SELECT 
                b.id, b.name, b.serving, b.serving_unit, b.density, 
                b.oxalate_per_gram, b.oxalate_per_gram_unit,
                bd.calories, bd.sodium, bd.cholesterol, bd.sugars, bd.protein,
                bd.dietary_fiber, bd.carbohydrates, bd.calcium, bd.potassium, bd.magnesium,
                bd.selenium, bd.manganese, bd.zinc, bd.iron, bd.fat, bd.saturated_fat,
                bd.polysaturated_fat, bd.monosaturated_fat, bd.thiamin, bd.riboflavin,
                bd.niacin, bd.folic_acid, bd.phosphorus, bd.vitamin_a, bd.vitamin_b6,
                bd.vitamin_c, bd.vitamin_d, bd.vitamin_e, bd.vitamin_k
            FROM brands b
            LEFT JOIN brand_data bd ON b.id = bd.brand_id
            WHERE b.id = ?
        `, [brandId])
        
        if (!brandData) return null
        
        // Parse values - remove " mg" suffix for values with units, keep calories as-is
        const parseValue = (val) => {
            if (!val) return null
            const strVal = val.toString()
            if (strVal.includes(' mg')) {
                return parseFloat(strVal.split(' ')[0])
            }
            return parseFloat(strVal)
        }
        
        return {
            id: brandData.id,
            name: brandData.name,
            serving: brandData.serving,
            servingUnit: brandData.serving_unit,
            density: brandData.density,
            oxalatePerGram: brandData.oxalate_per_gram,
            data: {
                calories: parseValue(brandData.calories),
                sodium: parseValue(brandData.sodium),
                cholesterol: parseValue(brandData.cholesterol),
                sugars: parseValue(brandData.sugars),
                protein: parseValue(brandData.protein),
                dietary_fiber: parseValue(brandData.dietary_fiber),
                carbohydrates: parseValue(brandData.carbohydrates),
                calcium: parseValue(brandData.calcium),
                potassium: parseValue(brandData.potassium),
                magnesium: parseValue(brandData.magnesium),
                selenium: parseValue(brandData.selenium),
                manganese: parseValue(brandData.manganese),
                zinc: parseValue(brandData.zinc),
                iron: parseValue(brandData.iron),
                fat: parseValue(brandData.fat),
                saturated_fat: parseValue(brandData.saturated_fat),
                polysaturated_fat: parseValue(brandData.polysaturated_fat),
                monosaturated_fat: parseValue(brandData.monosaturated_fat),
                thiamin: parseValue(brandData.thiamin),
                riboflavin: parseValue(brandData.riboflavin),
                niacin: parseValue(brandData.niacin),
                folic_acid: parseValue(brandData.folic_acid),
                phosphorus: parseValue(brandData.phosphorus),
                vitamin_a: parseValue(brandData.vitamin_a),
                vitamin_b6: parseValue(brandData.vitamin_b6),
                vitamin_c: parseValue(brandData.vitamin_c),
                vitamin_d: parseValue(brandData.vitamin_d),
                vitamin_e: parseValue(brandData.vitamin_e),
                vitamin_k: parseValue(brandData.vitamin_k)
            }
        }
    }

    /**
     * Create a new ingredient
     * @param {Object} ingredientData - Ingredient data
     * @param {string} userId - User ID
     * @returns {Promise<number>} New ingredient ID
     */
    async createIngredient(ingredientData, userId) {
        return await this.brandRepository.create(ingredientData, userId)
    }

    /**
     * Update an existing ingredient
     * @param {number} brandId - Brand ID
     * @param {Object} ingredientData - Ingredient data
     * @param {string} userId - User ID
     */
    async updateIngredient(brandId, ingredientData, userId) {
        await this.brandRepository.update(brandId, ingredientData, userId)
    }

    /**
     * Delete an ingredient
     * @param {number} brandId - Brand ID
     * @param {string} userId - User ID
     */
    async deleteIngredient(brandId, userId) {
        await this.brandRepository.delete(brandId, userId)
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