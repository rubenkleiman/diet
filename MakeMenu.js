import Converter from "./Converter.js";
import { Recipes } from "./Recipes.js";
import { Brands } from "./Brands.js";
import { Oxalates } from "./Oxalates.js";
import DashCalculator from "./DashCalculator.js";
import Validator from "./Validator.js";

// TODO allow ml in recipes.json as long as there is a density for it in brands.json; else error
// TODO oz to g conversions
// constructor have kidney stone risk {high|medium|low} @ 50, 100, 250 mg/day and use it in oxalate level output

class MakeMenu {
    constructor() {
        new Validator().validate()
    }

    static summaryFields = [
        "calories", "sodium", "cholesterol", "oxalates",
        "protein", "calcium", "phosphorus", "potassium"
    ]

    /**
     * Prints recipe information to the console.
     * @param {string} recipeName Name of recipe
     * @param {boolean} summary If true, only summary information is printed 
     * @param {boolean} asJson If true, output as JSON instead of formatted text
     */
    printRecipe(recipeName, summary = false, asJson = false) {
        const recipe = Recipes.find(recipeName)
        if (!recipe) {
            console.error(`Recipe '${recipeName}' not in recipes.json`)
            return
        }

        const results = this.calculateRecipe(recipe, !summary, [])

        // Filter fields if summary requested
        const fieldsToShow = summary ? MakeMenu.summaryFields : Object.keys(results.totals)
        const filteredTotals = {}
        for (const field of fieldsToShow) {
            if (field in results.totals) {
                filteredTotals[field] = results.totals[field]
            }
        }

        // Prepare output
        const output = {
            recipe: recipeName,
            totals: filteredTotals,
            dashAdherence: results.dashAdherence,
            dashReasons: results.dashReasons,
            oxalateLevel: results.oxalateLevel,
            oxalateMg: results.oxalateMg,
            ingredients: results.details
        }

        // Remove undefined fields
        if (output.ingredients === undefined) {
            delete output.ingredients
        }

        // Output
        if (asJson) {
            console.log(JSON.stringify(output, null, 2))
        } else {
            this.printFormatted(output)
        }
    }

    /**
     * Compares original recipe with a modified version
     * @param {string} recipeName - Name of base recipe
     * @param {Object} variations - Ingredient amount overrides (e.g., {"Oats": "100 g"})
     * @param {Object} addedIngredients - New ingredients to add (e.g., {"Almonds": "20 g"})
     * @param {Array<string>} removedIngredients - Ingredients to remove
     * @param {boolean} summary - If true, show only summary fields
     * @param {Array<string>} explained - List of nutrients to show contribution breakdown (e.g., ["sodium", "sugars"])
     */
    compareRecipes(recipeName, variations = {}, addedIngredients = {}, removedIngredients = [], summary = false, explained = []) {
        const recipe = Recipes.find(recipeName)
        if (!recipe) {
            console.error(`Recipe '${recipeName}' not in recipes.json`)
            return
        }

        // Validate all ingredients exist in brands.json
        const allIngredients = {
            ...variations,
            ...(addedIngredients || {})
        }

        for (const ingredientName of Object.keys(allIngredients)) {
            const brand = Brands.find(ingredientName)
            if (!brand) {
                console.error(`Error: Ingredient "${ingredientName}" not found in brands.json`)
                return
            }
        }

        // Validate variations only reference existing recipe ingredients
        const originalIngredients = recipe.getIngredients()
        const originalNames = originalIngredients.map(ing => ing.name)

        for (const variedIngredient of Object.keys(variations)) {
            if (!originalNames.includes(variedIngredient)) {
                console.error(`Error: Variation ingredient "${variedIngredient}" not in original recipe. Use addedIngredients instead.`)
                return
            }
        }

        // Validate removed ingredients exist
        for (const removed of removedIngredients) {
            if (!originalNames.includes(removed)) {
                console.error(`Error: Cannot remove "${removed}" - not in original recipe`)
                return
            }
        }

        // Calculate original recipe
        const originalResults = this.calculateRecipe(recipe, false, explained)

        // Build modified recipe
        const modifiedIngredients = {}

        // Start with original, excluding removed ingredients
        for (const { name, amount, unit } of originalIngredients) {
            if (!removedIngredients.includes(name)) {
                modifiedIngredients[name] = `${amount} ${unit}`
            }
        }

        // Apply variations
        for (const [name, measure] of Object.entries(variations)) {
            modifiedIngredients[name] = measure
        }

        // Add new ingredients
        if (addedIngredients) {
            for (const [name, measure] of Object.entries(addedIngredients)) {
                if (modifiedIngredients[name]) {
                    console.error(`Error: Added ingredient "${name}" already exists in recipe. Use variations instead.`)
                    return
                }
                modifiedIngredients[name] = measure
            }
        }

        // Create temporary modified recipe object
        const modifiedRecipe = {
            name: `${recipeName} (Modified)`,
            ingredients: []
        }

        for (const [name, measure] of Object.entries(modifiedIngredients)) {
            const parts = measure.split(" ")
            modifiedRecipe.ingredients.push({
                name,
                amount: parseFloat(parts[0]),
                unit: parts[1]
            })
        }

        modifiedRecipe.getIngredients = function () {
            return [...this.ingredients]
        }

        // Calculate modified recipe
        const modifiedResults = this.calculateRecipe(modifiedRecipe, false, explained)

        // Print comparison
        this.printComparison(
            recipeName,
            originalResults,
            modifiedResults,
            variations,
            addedIngredients,
            removedIngredients,
            summary,
            explained
        )
    }

    /**
     * Calculate nutritional totals for a recipe
     * @param {Object} recipe - Recipe object with getIngredients() method
     * @param {boolean} includeDetails - Whether to include per-ingredient details
     * @param {Array<string>} trackContributions - List of nutrients to track per-ingredient contributions
     * @returns {Object} - Results with totals, dash, oxalate info, and optional contributions
     */
    calculateRecipe(recipe, includeDetails = false, trackContributions = []) {
        const totals = {}
        const details = []
        const contributions = {}
        let totalOxalates = 0

        // Initialize contribution tracking
        for (const nutrient of trackContributions) {
            contributions[nutrient] = {}
        }

        const ingredients = recipe.getIngredients()

        for (const { name, amount, unit } of ingredients) {
            const brand = Brands.find(name)
            if (!brand) continue

            if (amount === 0) continue

            const gramsPerServing = Converter.toGrams(brand.serving, brand.density)
            const recipeGrams = Converter.toGrams(`${amount} ${unit}`, brand.density)
            const scalingFactor = recipeGrams / gramsPerServing

            const ingredientTotals = {}

            if (brand.data.calories) {
                ingredientTotals.calories = brand.data.calories * scalingFactor
            }

            for (const [fieldName, measure] of Object.entries(brand.data)) {
                if (fieldName === "calories") continue

                if (typeof measure === "string") {
                    const { amount: fieldAmount } = Converter.getMeasureComponents(measure)
                    const scaledAmount = fieldAmount * scalingFactor
                    ingredientTotals[fieldName] = scaledAmount
                }
            }

            const oxalatePerGram = Oxalates.getPerGram(name)
            const ingredientOxalates = oxalatePerGram * recipeGrams
            ingredientTotals.oxalates = ingredientOxalates
            totalOxalates += ingredientOxalates

            if (includeDetails) {
                details.push({
                    name,
                    amount: recipeGrams,
                    nutritionScaled: ingredientTotals
                })
            }

            // Track contributions for specified nutrients
            for (const nutrient of trackContributions) {
                if (ingredientTotals[nutrient] !== undefined) {
                    contributions[nutrient][name] = ingredientTotals[nutrient]
                }
            }

            for (const [key, value] of Object.entries(ingredientTotals)) {
                totals[key] = (totals[key] || 0) + value
            }
        }

        const dashResult = DashCalculator.calculateAdherence(totals)

        let oxalateLevel
        if (totalOxalates < 10) {
            oxalateLevel = "Low"
        } else if (totalOxalates < 50) {
            oxalateLevel = "Moderate"
        } else {
            oxalateLevel = "High"
        }

        return {
            totals,
            dashAdherence: dashResult.rating,
            dashReasons: dashResult.reasons,
            oxalateLevel,
            oxalateMg: totalOxalates,
            details: includeDetails ? details : undefined,
            contributions: trackContributions.length > 0 ? contributions : undefined
        }
    }

    printFormatted(output) {
        console.log("\n" + "=".repeat(60))
        console.log(`RECIPE: ${output.recipe}`)
        console.log("=".repeat(60))

        console.log("\nNUTRITIONAL TOTALS:")
        console.log("-".repeat(60))
        for (const [key, value] of Object.entries(output.totals)) {
            const formatted = typeof value === 'number' ? value.toFixed(2) : value
            console.log(`  ${key.padEnd(25)}: ${formatted}`)
        }

        console.log("\nDIETARY ASSESSMENT:")
        console.log("-".repeat(60))
        console.log(`  DASH Adherence: ${output.dashAdherence}`)
        console.log(`  Reasons: ${output.dashReasons}`)
        console.log(`  Oxalate Level: ${output.oxalateLevel} (${output.oxalateMg.toFixed(2)} mg)`)

        if (output.ingredients) {
            console.log("\nINGREDIENT DETAILS:")
            console.log("-".repeat(60))
            for (const ingredient of output.ingredients) {
                console.log(`\n  ${ingredient.name} (${ingredient.amount.toFixed(1)}g):`)
                for (const [key, value] of Object.entries(ingredient.nutritionScaled)) {
                    const formatted = typeof value === 'number' ? value.toFixed(2) : value
                    console.log(`    ${key.padEnd(23)}: ${formatted}`)
                }
            }
        }
        console.log("\n" + "=".repeat(60) + "\n")
    }

    printComparison(recipeName, original, modified, variations, addedIngredients, removedIngredients, summary, explained) {
        console.log("\n" + "=".repeat(80))
        console.log(`RECIPE COMPARISON: ${recipeName}`)
        console.log("=".repeat(80))

        // Show modifications
        console.log("\nMODIFICATIONS:")
        console.log("-".repeat(80))
        if (removedIngredients.length > 0) {
            console.log(`  Removed: ${removedIngredients.join(", ")}`)
        }
        if (Object.keys(variations).length > 0) {
            console.log("  Variations:")
            for (const [name, amount] of Object.entries(variations)) {
                console.log(`    - ${name}: ${amount}`)
            }
        }
        if (addedIngredients && Object.keys(addedIngredients).length > 0) {
            console.log("  Added:")
            for (const [name, amount] of Object.entries(addedIngredients)) {
                console.log(`    - ${name}: ${amount}`)
            }
        }

        // Determine fields to show
        const fieldsToShow = summary
            ? MakeMenu.summaryFields.filter(f => f !== 'oxalates') // oxalates shown separately
            : [...new Set([...Object.keys(original.totals), ...Object.keys(modified.totals)])].filter(f => f !== 'oxalates')

        // Nutritional comparison table
        console.log("\nNUTRITIONAL COMPARISON:")
        console.log("-".repeat(80))
        console.log(`${"Nutrient".padEnd(25)} | ${"Original".padStart(12)} | ${"Modified".padStart(12)} | ${"Change".padStart(15)}`)
        console.log("-".repeat(80))

        for (const field of fieldsToShow) {
            const origValue = original.totals[field] || 0
            const modValue = modified.totals[field] || 0
            const diff = modValue - origValue
            const percentChange = origValue !== 0 ? (diff / origValue * 100) : 0

            // Highlight significant changes
            let changeStr = `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}`
            if (Math.abs(percentChange) > 0.1) {
                changeStr += ` (${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}%)`
            }

            // Flag significant negative changes for good nutrients or positive for bad ones
            let flag = ""
            if (field === "sodium" && diff > 100) flag = " ⚠️"
            if (field === "saturatedFat" && diff > 5) flag = " ⚠️"
            if (field === "sugars" && diff > 10) flag = " ⚠️"
            if (field === "cholesterol" && diff > 50) flag = " ⚠️"
            if ((field === "protein" || field === "calcium" || field === "potassium") && diff < -5) flag = " ⚠️"

            console.log(
                `${field.padEnd(25)} | ${origValue.toFixed(2).padStart(12)} | ${modValue.toFixed(2).padStart(12)} | ${changeStr.padStart(15)}${flag}`
            )
        }

        // DASH and Oxalate comparison
        console.log("\nDIETARY ASSESSMENT:")
        console.log("-".repeat(80))
        console.log(`${"Metric".padEnd(25)} | ${"Original".padStart(12)} | ${"Modified".padStart(12)}`)
        console.log("-".repeat(80))

        console.log(`${"DASH Adherence".padEnd(25)} | ${original.dashAdherence.padStart(12)} | ${modified.dashAdherence.padStart(12)}`)
        console.log(`${"Oxalate Level".padEnd(25)} | ${original.oxalateLevel.padStart(12)} | ${modified.oxalateLevel.padStart(12)}`)
        console.log(`${"Oxalate (mg)".padEnd(25)} | ${original.oxalateMg.toFixed(2).padStart(12)} | ${modified.oxalateMg.toFixed(2).padStart(12)}`)

        console.log("\nDASH Reasons (Original): " + original.dashReasons)
        console.log("DASH Reasons (Modified): " + modified.dashReasons)

        // Show nutrient contribution breakdown if requested
        if (explained && explained.length > 0) {
            console.log("\nNUTRIENT CONTRIBUTION BREAKDOWN:")
            console.log("-".repeat(80))

            for (const nutrient of explained) {
                // Show for both original and modified
                console.log(`\n${nutrient.toUpperCase()}:`)

                if (original.contributions && original.contributions[nutrient]) {
                    const origContrib = original.contributions[nutrient]
                    const origTotal = original.totals[nutrient] || 0

                    if (origTotal > 0) {
                        console.log(`  Original (total: ${origTotal.toFixed(2)}):`)

                        // Sort by contribution amount (descending)
                        const sortedOrig = Object.entries(origContrib)
                            .sort((a, b) => b[1] - a[1])

                        for (const [ingredientName, amount] of sortedOrig) {
                            const percentage = (amount / origTotal * 100).toFixed(1)
                            console.log(`    ${percentage.padStart(5)}% from '${ingredientName}' (${amount.toFixed(2)})`)
                        }
                    } else {
                        console.log(`  Original: None`)
                    }
                }

                if (modified.contributions && modified.contributions[nutrient]) {
                    const modContrib = modified.contributions[nutrient]
                    const modTotal = modified.totals[nutrient] || 0

                    if (modTotal > 0) {
                        console.log(`  Modified (total: ${modTotal.toFixed(2)}):`)

                        // Sort by contribution amount (descending)
                        const sortedMod = Object.entries(modContrib)
                            .sort((a, b) => b[1] - a[1])

                        for (const [ingredientName, amount] of sortedMod) {
                            const percentage = (amount / modTotal * 100).toFixed(1)
                            console.log(`    ${percentage.padStart(5)}% from '${ingredientName}' (${amount.toFixed(2)})`)
                        }
                    } else {
                        console.log(`  Modified: None`)
                    }
                }
            }
        }

        console.log("\n" + "=".repeat(80) + "\n")
    }
}

// Example usage:
const menu = new MakeMenu()

// Print single recipe - detailed view
// menu.printRecipe("Granola With Milk", false, false)
// menu.printRecipe("Spaghetti al sugo", true, false)

// Print single recipe - summary view
// menu.printRecipe("Granola With Milk", true, false)

// Print as JSON
menu.printRecipe("Granola With Milk", true, false)

// Compare recipes with nutrient contribution breakdown
menu.compareRecipes(
    "Spaghetti al sugo",
    {},//{ "Aurora Dried Cranberries": "0 g" }, // increase oats
    null, // no added ingredients
    [],//["Blueberries"], // remove blueberries
    true, // summary view
    ["sodium", "calories", "potassium", "protein"] // explain these nutrients
)

export default MakeMenu