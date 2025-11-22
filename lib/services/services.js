import path from 'path'
import { fileURLToPath } from 'url'
import database from '../db/Database.js'
import MakeMenu from './MakeMenu.js'
import IngredientsManager from '../managers/IngredientsManager.js'
import MenuRepository from '../repositories/MenuRepository.js'
import DailyPlanRepository from '../repositories/DailyPlanRepository.js'
import { dailyPlanService } from './DailyPlanService.js'
import RecipeRepository from '../repositories/RecipeRepository.js'
import IngredientRepository from '../repositories/IngredientRepository.js'
import { UserService } from "../services/UserService.js";
import { DietaryAssessmentService } from './DietaryAssessmentServices.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// System user ID (auto-logged in for now)

class ServicesClass {

    constructor() {
        this.menu = new MakeMenu()
        this.ingredientsManager = IngredientsManager
        this.dailyPlanRepository = DailyPlanRepository
        this.dailyPlanService = dailyPlanService
        this.menuRepository = MenuRepository
        this.recipeRepository = RecipeRepository
        this.ingredientRepository = IngredientRepository
        this.kidneyStoneRiskData = {
            "Normal": {
                "maxOxalatesPerDay": 200,
                "description": "Standard diet with normal kidney stone risk"
            },
            "High": {
                "maxOxalatesPerDay": 50,
                "description": "Reduced oxalate intake for those with history of kidney stones"
            },
            "Extremely High": {
                "maxOxalatesPerDay": 10,
                "description": "Very strict oxalate restriction for severe kidney stone risk"
            }
        }

        // User's daily requirements will be loaded from database
        this.dailyRequirements = null
    }

    async getUserData(userId) {

    }

    async getUserSettings(userId) {
        return await UserService.getSettings(userId);
    }

    async createUserSettings(userId, settings) {
        return await UserService.createSettings(userId, settings);
    }

    async updateUserSettings(userId, settings) {
        return await UserService.updateSettings(userId, settings);
    }

    async getDietaryAssessment(userId, type, oxalateMg, totals) {
        const userSettings = await this.getUserSettings(userId);
        const kidneyStoneRiskData = await this.getKidneyStoneRiskData();
        return DietaryAssessmentService.get(totals, oxalateMg, type, userSettings, kidneyStoneRiskData);
    }

    async getNutrients() {
        return await this.ingredientRepository.getNutrients()
    }

    async calculateRecipeNutrition(request, userId) {
        return await this.recipeRepository.calculateRecipeNutrition(request, userId);
    }

    async calculateMenuNutrition(request, userId) {
        return await this.menuRepository.calculateMenuNutrition(request, userId);
    }

    async calculateDailyPlanNutrition(request, userId) {
        return await this.dailyPlanRepository.calculateDailyPlanNutrition(request, userId);
    }

    /**
     * Load daily requirements from database
     */
    async loadDailyRequirements(userId) {
        if (this.dailyRequirements) return

        const requirements = await database.all(`SELECT * FROM daily_requirements where user_id = '${userId}'`);
        this.dailyRequirements = {}

        for (const req of requirements) {
            // TODO should be user-specific LRU cache
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

    // Daily plans

    async getAllDailyPlans(options) {
        return await this.dailyPlanService.getAllDailyPlans(options);
    }

    /**
     * Returns details for a daily plan for the user
     * @param {integer} id The plan's id 
     * @param {string} userId The user id
     * @returns {object} Daily plan details
     */
    async getDailyPlanDetails(id, userId) {
        return await this.dailyPlanRepository.getDetails(id, userId);
    }

    /**
     * Creates a daily plan for the user
     * @param {object} request The requested daily plan
     * @param {string} userId The user id
     * @returns {object} The created daily plan's details
     */
    async createDailyPlan(request, userId) {
        return await this.dailyPlanRepository.create(request, userId);
    }

    /**
     * Updates a daily plan for the user
     * @param {integer} id The plan's id 
     * @param {object} request The updated daily plan
     * @param {string} userId The user id
     * @returns {object} The updated daily plan's details
     */
    async updateDailyPlan(id, request, userId) {
        return await this.dailyPlanRepository.update(id, request, userId);
    }

    /**
     * Deletes a daily plan for the user
     * @param {integer} id The plan's id 
     * @param {string} userId The user id
     */
    async deleteDailyPlan(id, userId) {
        return await this.dailyPlanRepository.delete(id, userId);
    }

    // Menus

    async getAllMenus(options) {
        return await this.menuRepository.getList(options)
    }


    /**
     * Gets detailed information for a menu
     * @param {string} id - Canonical menu ID
     * @param {boolean} summary - If true, return summary fields only
     * @returns {Promise<Object|null>} Menu details or null if not found
     */
    async getMenuDetails(id, summary) {
        return await this.menuRepository.getMenu(id, summary)
    }

    /**
     * Creates a menu
     * @param {string} name Menu's name
     * @param {Array} recipeIds Array of recipe ids
     * @param {string} userId User's id
     */
    async createMenu(name, recipeIds, userId) {
        return await this.menuRepository.createMenu(name, recipeIds, userId);
    }

    /**
     * Updates a menu
     * @param {string} id Menu id
     * @param {string} name Menu name
     * @param {Array} recipeIds Array of recipe ids
     * @param {string} userId User id
     */
    async updateMenu(id, name, recipeIds, userId) {
        return await this.menuRepository.updateMenu(id, name, recipeIds, userId);
    }

    /**
     * Deletes the menu
     * @param {string} id menu id
     * @param {string} userId user id
     */
    async deleteMenu(id, userId) {
        return await this.menuRepository.deleteMenu(id, userId);
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
     * Gets all recipes with their IDs
     * @returns {Promise<Array>} Array of {id, name} objects
     */
    async getAllRecipes(userId) {
        const recipes = await this.recipeRepository.getList(userId)
        return recipes.map(recipe => ({
            id: recipe.id,
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
        return await this.menu.getRecipeData(recipeId, summary)
    }

    /**
     * Gets full recipe details for editing (with brandIds, amounts, units)
     * @param {string} recipeId - Canonical recipe ID
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} Full recipe details or null if not found
     */
    async getRecipeFullDetails(recipeId, userId) {
        return await this.recipeRepository.getRecipeFullDetails(recipeId, userId)
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
            const brand = await this.ingredientRepository.getById(ing.brandId, userId)
            if (!brand) {
                throw new Error(`Brand with ID ${ing.brandId} not found`)
            }
            ingredientsMap[brand.name] = `${ing.amount} ${ing.unit}`
        }

        // Create recipe in database
        await this.recipeRepository.create(name, ingredientsMap, userId)

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
        // Get recipe database ID
        const recipe = await this.recipeRepository.getById(recipeId, userId)
        if (!recipe) {
            throw new Error('Recipe not found')
        }

        // Convert brandIds to brandNames for RecipeRepository
        const ingredientsMap = {}

        for (const ing of ingredients) {
            const brand = await this.ingredientRepository.getById(ing.brandId, userId)
            if (!brand) {
                throw new Error(`Brand with ID ${ing.brandId} not found`)
            }
            ingredientsMap[brand.name] = `${ing.amount} ${ing.unit}`
        }

        // Update recipe in database
        await this.recipeRepository.update(recipe.id, name, ingredientsMap, userId)
    }

    /**
     * Delete a recipe
     * @param {string} recipeId - Canonical recipe ID
     * @param {string} userId - User ID
     */
    async deleteRecipe(recipeId, userId) {
        // Get recipe database ID
        const recipe = await this.recipeRepository.getById(recipeId, userId)
        if (!recipe) {
            throw new Error('Recipe not found')
        }

        // Delete recipe from database
        await this.recipeRepository.delete(recipe.id, userId)
    }

    // /**
    //  * Compares two recipe variations
    //  * @param {string} recipeId - Base recipe canonical ID
    //  * @param {Object} variations - Ingredient variations
    //  * @param {Object} addedIngredients - New ingredients
    //  * @param {Array<string>} removedIngredients - Ingredients to remove
    //  * @param {boolean} summary - Summary mode
    //  * @param {Array<string>} explained - Nutrients to explain
    //  * @returns {Promise<Object|null>} Comparison data or null if not found
    //  */
    // async compareRecipeVariations(recipeId, variations = {}, addedIngredients = {}, removedIngredients = [], summary = false, explained = []) {
    //     await this.initRecipeIdMap()
    //     const recipeName = this.getRecipeNameFromId(recipeId)
    //     if (!recipeName) {
    //         return null
    //     }

    //     return this.menu.getRecipeComparison(
    //         recipeName,
    //         variations,
    //         addedIngredients,
    //         removedIngredients,
    //         summary,
    //         explained
    //     )
    // }

    /**
     * Gets all ingredients with compact info
     * @param {string} userId The user id
     * @returns {Promise<Array>} Array of ingredients
     */
    async getAllIngredients(userId) {
        return await this.ingredientsManager.getAllIngredients(userId)
    }

    /**
     * Searches ingredients by term
     * @param {string} searchTerm 
     * @param {string} userId The user id
     * @returns {Promise<Array>} Filtered ingredients
     */
    async searchIngredients(searchTerm, userId) {
        return await this.ingredientsManager.searchIngredients(searchTerm, userId)
    }

    /**
     * Gets detailed info for a specific ingredient
     * @param {number} brandId - Brand ID
     * @param {string} userId The user id
     * @returns {Promise<Object|null>} Ingredient details
     */
    async getIngredientDetails(brandId, userId) {
        return await this.ingredientsManager.getIngredientDetails(brandId, userId)
    }

    /**
     * Gets full ingredient details for editing
     * @param {number} brandId - Brand ID
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} Full ingredient details
     */
    async getIngredientFullDetails(brandId, userId) {
        const ingredient = await this.ingredientRepository.getById(brandId, userId)
        if (!ingredient) return null

        // Get raw data from database with ALL fields
        const brandData = await database.get(`
            SELECT 
                b.id, b.name, b.serving, b.serving_unit, b.density, 
                b.oxalate_per_gram, b.oxalate_per_gram_unit,
                bd.calories, bd.sodium, bd.cholesterol, bd.sugars, bd.protein,
                bd.dietary_fiber, bd.carbohydrates, bd.calcium, bd.potassium, bd.magnesium,
                bd.selenium, bd.manganese, bd.zinc, bd.iron, bd.fat, bd.saturated_fat,
                bd.polyunsaturated_fat, bd.monosaturated_fat, bd.thiamin, bd.riboflavin,
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
                polyunsaturated_fat: parseValue(brandData.polyunsaturated_fat),
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
        return await this.ingredientRepository.create(ingredientData, userId)
    }

    /**
     * Update an existing ingredient
     * @param {number} brandId - Brand ID
     * @param {Object} ingredientData - Ingredient data
     * @param {string} userId - User ID
     */
    async updateIngredient(brandId, ingredientData, userId) {
        await this.ingredientRepository.update(brandId, ingredientData, userId)
    }

    /**
     * Delete an ingredient
     * @param {number} brandId - Brand ID
     * @param {string} userId - User ID
     */
    async deleteIngredient(brandId, userId) {
        await this.ingredientRepository.delete(brandId, userId)
    }

    /**
     * Gets kidney stone risk levels and limits
     * @returns {Object} Risk data
     */
    async getKidneyStoneRiskData() {
        return this.kidneyStoneRiskData
    }

    /**
     * Gets daily requirements
     * @returns {Promise<Object>} Daily requirements data
     */
    async getDailyRequirements(userId) {
        await this.loadDailyRequirements(userId)
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