import Converter from "../calculators/Converter.js";
import DashCalculator from "../calculators/DashCalculator.js";
import RecipeRepository from "../repositories/RecipeRepository.js";
import IngredientRepository from "../repositories/IngredientRepository.js";

class MakeMenu {
    constructor() {
        this.recipeRepository = RecipeRepository;
        this.ingredientRepository = IngredientRepository;
    }

    static summaryFields = [
        "calories", "sodium", "cholesterol", "oxalates",
        "protein", "calcium", "phosphorus", "potassium"
    ];

    /**
     * Gets recipe data as object (not console output)
     * @param {string} recipeId - Id of recipe
     * @param {boolean} summary - If true, only summary fields
     * @param {string} userId - User ID (optional)
     * @returns {Promise<Object>} Recipe data object
     */
    async getRecipeData(recipeId, summary = false, userId = null) {
        const recipe = await this.recipeRepository.getById(recipeId, userId);
        if (!recipe) {
            return null;
        }

        const results = await this.calculateRecipe(recipe, !summary, [], userId);

        // Filter fields if summary requested
        const fieldsToShow = summary ? MakeMenu.summaryFields : Object.keys(results.totals);
        const filteredTotals = {};
        for (const field of fieldsToShow) {
            if (field in results.totals) {
                filteredTotals[field] = results.totals[field];
            }
        }

        return {
            name: recipe.name,
            totals: filteredTotals,
            dashAdherence: results.dashAdherence,
            dashReasons: results.dashReasons,
            oxalateLevel: results.oxalateLevel,
            oxalateMg: results.oxalateMg,
            ingredients: results.details
        };
    }

    /**
     * Calculate nutritional totals for a recipe
     * @param {Object} recipe - Recipe object from database
     * @param {boolean} includeDetails - Whether to include per-ingredient details
     * @param {Array<string>} trackContributions - List of nutrients to track per-ingredient contributions
     * @param {string} userId - User ID (optional)
     * @returns {Promise<Object>} - Results with totals, dash, oxalate info, and optional contributions
     */
    async calculateRecipe(recipe, includeDetails = false, trackContributions = [], userId = null) {
        const totals = {};
        const details = [];
        const contributions = {};
        let totalOxalates = 0;

        // Initialize contribution tracking
        for (const nutrient of trackContributions) {
            contributions[nutrient] = {};
        }

        // Recipe ingredients format: {brandName: "amount unit"}
        for (const [brandName, measure] of Object.entries(recipe.ingredients)) {
            const brand = await this.ingredientRepository.getByName(brandName, userId);
            if (!brand) {
                console.warn(`Brand "${brandName}" not found`);
                continue;
            }

            const measureParts = measure.split(' ');
            const amount = parseFloat(measureParts[0]);
            const unit = measureParts[1];

            if (amount === 0) continue;

            const gramsPerServing = brand.gramsPerServing;
            const recipeGrams = Converter.toGrams(`${amount} ${unit}`, brand.density);
            const scalingFactor = recipeGrams / gramsPerServing;

            const ingredientTotals = {};

            // Handle calories
            if (brand.data.calories) {
                ingredientTotals.calories = brand.data.calories * scalingFactor;
            }

            // Handle other nutrients
            for (const [fieldName, value] of Object.entries(brand.data)) {
                if (fieldName === "calories") continue;

                if (typeof value === "string") {
                    const { amount: fieldAmount } = Converter.getMeasureComponents(value);
                    const scaledAmount = fieldAmount * scalingFactor;
                    ingredientTotals[fieldName] = scaledAmount;
                }
            }

            // Calculate oxalates
            const oxalatePerGram = brand.oxalatePerGram || 0;
            const ingredientOxalates = oxalatePerGram * recipeGrams;
            ingredientTotals.oxalates = ingredientOxalates;
            totalOxalates += ingredientOxalates;

            if (includeDetails) {
                details.push({
                    name: brandName,
                    amount: recipeGrams,
                    nutritionScaled: ingredientTotals
                });
            }

            // Track contributions for specified nutrients
            for (const nutrient of trackContributions) {
                if (ingredientTotals[nutrient] !== undefined) {
                    contributions[nutrient][brandName] = ingredientTotals[nutrient];
                }
            }

            // Add to totals
            for (const [key, value] of Object.entries(ingredientTotals)) {
                totals[key] = (totals[key] || 0) + value;
            }
        }

        const dashResult = DashCalculator.calculateAdherence(totals);

        let oxalateLevel;
        if (totalOxalates < 10) {
            oxalateLevel = "Low";
        } else if (totalOxalates < 50) {
            oxalateLevel = "Moderate";
        } else {
            oxalateLevel = "High";
        }

        return {
            totals,
            dashAdherence: dashResult.rating,
            dashReasons: dashResult.reasons,
            oxalateLevel,
            oxalateMg: totalOxalates,
            details: includeDetails ? details : undefined,
            contributions: trackContributions.length > 0 ? contributions : undefined
        };
    }

    /**
     * Gets recipe comparison data as object (not console output)
     * @param {string} recipeName - Name of base recipe
     * @param {Object} variations - Ingredient variations
     * @param {Object} addedIngredients - New ingredients
     * @param {Array<string>} removedIngredients - Ingredients to remove
     * @param {boolean} summary - Summary mode
     * @param {Array<string>} explained - Nutrients to explain contributions
     * @param {string} userId - User ID (optional)
     * @returns {Promise<Object>} Comparison data object
     */
    async getRecipeComparison(recipeName, variations = {}, addedIngredients = {}, removedIngredients = [], summary = false, explained = [], userId = null) {
        const recipe = await this.recipeRepository.getByName(recipeName, userId);
        if (!recipe) {
            return null;
        }

        // Validate all ingredients exist
        const allIngredients = { ...variations, ...(addedIngredients || {}) };
        for (const ingredientName of Object.keys(allIngredients)) {
            const brand = await this.ingredientRepository.getByName(ingredientName, userId);
            if (!brand) {
                throw new Error(`Ingredient "${ingredientName}" not found in brands`);
            }
        }

        // Validate variations reference existing ingredients
        const originalNames = Object.keys(recipe.ingredients);

        for (const variedIngredient of Object.keys(variations)) {
            if (!originalNames.includes(variedIngredient)) {
                throw new Error(`Variation ingredient "${variedIngredient}" not in original recipe`);
            }
        }

        // Validate removed ingredients exist
        for (const removed of removedIngredients) {
            if (!originalNames.includes(removed)) {
                throw new Error(`Cannot remove "${removed}" - not in original recipe`);
            }
        }

        // Calculate original
        const originalResults = await this.calculateRecipe(recipe, false, explained, userId);

        // Build modified recipe
        const modifiedIngredients = {};

        for (const [name, measure] of Object.entries(recipe.ingredients)) {
            if (!removedIngredients.includes(name)) {
                modifiedIngredients[name] = measure;
            }
        }

        for (const [name, measure] of Object.entries(variations)) {
            modifiedIngredients[name] = measure;
        }

        if (addedIngredients) {
            for (const [name, measure] of Object.entries(addedIngredients)) {
                if (modifiedIngredients[name]) {
                    throw new Error(`Added ingredient "${name}" already exists in recipe`);
                }
                modifiedIngredients[name] = measure;
            }
        }

        // Create modified recipe object
        const modifiedRecipe = {
            name: `${recipeName} (Modified)`,
            ingredients: modifiedIngredients
        };

        // Calculate modified
        const modifiedResults = await this.calculateRecipe(modifiedRecipe, false, explained, userId);

        // Determine fields to show
        const fieldsToShow = summary
            ? MakeMenu.summaryFields.filter(f => f !== 'oxalates')
            : [...new Set([...Object.keys(originalResults.totals), ...Object.keys(modifiedResults.totals)])].filter(f => f !== 'oxalates');

        // Build comparison object
        const comparison = {
            recipeName,
            modifications: {
                removed: removedIngredients,
                variations,
                added: addedIngredients || {}
            },
            original: {
                totals: {},
                dashAdherence: originalResults.dashAdherence,
                dashReasons: originalResults.dashReasons,
                oxalateLevel: originalResults.oxalateLevel,
                oxalateMg: originalResults.oxalateMg
            },
            modified: {
                totals: {},
                dashAdherence: modifiedResults.dashAdherence,
                dashReasons: modifiedResults.dashReasons,
                oxalateLevel: modifiedResults.oxalateLevel,
                oxalateMg: modifiedResults.oxalateMg
            },
            changes: {}
        };

        // Populate totals and changes
        for (const field of fieldsToShow) {
            const origValue = originalResults.totals[field] || 0;
            const modValue = modifiedResults.totals[field] || 0;

            comparison.original.totals[field] = origValue;
            comparison.modified.totals[field] = modValue;
            comparison.changes[field] = {
                absolute: modValue - origValue,
                percent: origValue !== 0 ? ((modValue - origValue) / origValue * 100) : 0
            };
        }

        // Add contributions if requested
        if (explained && explained.length > 0) {
            comparison.contributions = {
                original: originalResults.contributions,
                modified: modifiedResults.contributions
            };
        }

        return comparison;
    }
}

export default MakeMenu;