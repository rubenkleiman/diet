// FIXED 2025-10-29 3pm
// Updated to allow ml for liquid ingredients

export default class Recipe {
    constructor(name, ingredients) {
        this.name = name
        this.ingredients = []
        for (const [ingredientName, measure] of Object.entries(ingredients)) {
            const measureComponents = measure.split(" ")
            const unit = measureComponents[1]
            
            // Allow g, grams, ml, milliliters
            if (!["g", "grams", "ml", "milliliters"].includes(unit)) {
                throw Error(`Recipe ${name} ingredient ${ingredientName} must be in grams or milliliters (is ${unit})`)
            }
            
            const amount = Number(measureComponents[0])
            if (isNaN(amount)) {
                throw Error(`Recipe ${name} ingredient ${ingredientName} amount must be a number (is ${measureComponents[0]})`)
            }
            this.ingredients.push({ name: ingredientName, amount, unit })
        }
    }

    /**
     * @returns {Array} Array of ingredients with {name, amount, unit}
     */
    getIngredients() {
        return [...this.ingredients]
    }

    /**
     * Returns the ingredient amount in the specified units.
     * @param {string} ingredientName 
     * @returns {Object} Returns the ingredient's amount and unit
     */
    findAmount(ingredientName) {
        return this.ingredients.find(ing => ing.name === ingredientName)
    }
}