import fs from 'fs'
import Converter from './Converter.js'

/**
 * Verifies all json data
 */
export default class Validator {

    constructor() {
        this.recipes = JSON.parse(fs.readFileSync(`${import.meta.dirname}/data/recipes.json`, "utf8"))
        this.brands = JSON.parse(fs.readFileSync(`${import.meta.dirname}/data/brands.json`, "utf8"))
    }

    validate() {
        this.validateBrands()
        this.validateRecipes()
    }

    validateRecipes() {
        for (const [name, ingredients] of Object.entries(this.recipes)) {
            this.validateRecipe(name, ingredients)
        }
    }

    validateRecipe(name, ingredients) {
        if ((typeof ingredients != "object") || Array.isArray(ingredients)) {
            throw Error(`Reciple "${name}" ingredients must be an object (is ${ingredients})`)
        }
        for (const [ingredientName, measure] of Object.entries(ingredients)) {
            if (!ingredientName) {
                throw Error(`Recipe "${name}" ingredient name is invalid (is ${ingredientName})`)
            }
            if (!this.brands[ingredientName]) {
                throw Error(`Recipe "${name}" ingredient "${ingredientName}" has no brand.json data.`)
            }
            this.validateMeasure(name, ingredientName, measure)
        }
    }

    validateBrands() {
        for (const name in this.brands) {
            const brand = this.brands[name]
            this.validateBrand(name, brand)
        }
    }

    validateBrand(brandName, brand) {
        if (!brand.serving || (typeof brand.serving != "string") || !brand.data || (typeof brand.data != "object") || Array.isArray(brand.data)) {
            throw Error(`Brand "${brandName}" invalid serving ("${brand.serving}") or data fields:\n${JSON.stringify(brand.data, null, 2)}`)
        }
        const { unit } = this.validateMeasure(brandName, "", brand.serving)
        if (Validator.liquidUnits.includes(unit) && (typeof brand.density != "number")) {
            throw Error(`Density must be a number (is ${brand.density})`)
        }
        this.validateData(brandName, brand.data)
    }

    validateMeasure(brandName, fieldName, measure) {
        if (typeof measure != "string") {
            throw Error(`Measure "${measure}" in "${brandName}" "${fieldName} is not a string`)
        }
        const comp = measure.split(" ").map(_ => _.trim())
        if (comp.length != 2) {
            throw Error(`Measure "${measure}" in "${brandName}" "${fieldName} is invalid. Must be "<number> <unit string>"`)
        }
        const unit = comp[1]
        if (!Validator.supportedUnits.includes(unit)) {
            throw Error(`Unit is not supported (is "${unit}") in "${brandName}" "${fieldName}" `)
        }
        const amount = Number(comp[0])
        if (isNaN(amount)) {
            throw Error(`Amount must be a number (is "${comp[0]}") in "${brandName}" "${fieldName} `)
        }
        return { amount, unit }
    }

    validateData(brandName, data) {
        for (const fieldName in data) {
            this.ValidateDataAmount(brandName, fieldName, data[fieldName])
        }
    }

    /**
     * Validates whether the value for the given field name.
     * If valid, returns the units (e.g., "ml") 
     * and unit value (e.g., 19) parsed from the value.
     * @param {string} brandName 
     * @param {string} fieldName 
     * @param {string | Number} measure The measure string. For calories
     * and density, this must be a number.
     * @returns { amount, unit }
     */
    ValidateDataAmount(brandName, fieldName, measure) {
        if (["calories", "density"].includes(fieldName)) {
            const amount = Number(measure)
            if (isNaN(amount)) { // neither float nor integer
                throw Error(`Brand "${brandName}" data "${fieldName}"value must be a number (is "${measure}" type: ${typeof measure})`)
            }
        } else if (typeof measure != "string") {
            throw Error(`Brand "${brandName}" data "${fieldName}" value must be a string (is "${measure}" type: ${typeof measure})`)
        } else {
            this.validateMeasure(brandName, fieldName, measure)
        }
    }

    static supportedUnits = ["g", "mg", "mcg", "ml"]
    static liquidUnits = ["ml"]
}