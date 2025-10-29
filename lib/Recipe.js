
export default class Recipe {
    constructor(name, ingredients) {
        this.name = name
        this.ingredients = []
        for (const [ingredientName, measure] of Object.entries(ingredients)) {
            const measureComponents = measure.split(" ")
            const unit = measureComponents[1]
            if (!["g", "grams"].includes(unit)) { // TODO restrict this to grams for now; convert later from liquid
                throw Error(`Recipe ${name} ingredient ${ingredientName} must be in grams (is ${unit})`)
            }
            const amount = Number(measureComponents[0])
            if (isNaN(amount)) {
                throw Error(`Recipe ${name} ingredient ${ingredientName} amount must be a number (is ${measureComponents[0]})`)
            }
            this.ingredients.push({ name: ingredientName, amount, unit })
        }
    }

    /**
     * @returns {[[amount, unit]]} Array of array of ingredients.
     * The first element of the ingredients array is
     * the amount and the second the amount unit.
     */
    getIngredients(unit = "g") {
        this._checkUnit(unit)
        return [...this.ingredients]
    }

    /**
     * Returns the ingredient amount in the specified units.
     * @param {string} ingredientName 
     * @param {string} unit Amount units
     * @returns {amount, unit} Returns the ingredient's
     * amount in the specified units
     */
    findAmount(ingredientName, unit = "g") {
        this._checkUnit(unit)
        return this.ingredients[ingredientName].amount
    }

    _checkUnit(unit) {
        if (unit != "g") {
            // TODO convert amount to grams instead of Error
            throw Error(`Unit currently restricted to grams`)
        }
    } 

    // _toIterable(obj) {
    //     return Object.keys(obj).map(k => res.push([k, obj[k]]))
    // }
}