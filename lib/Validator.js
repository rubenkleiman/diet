// FIXED 2025-10-29 3pm
// Updated to allow ml in recipes and validate oxalatePerGram field
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
        console.log(`Data valid.`)
    }

    validateRecipes() {
        for (const [name, ingredients] of Object.entries(this.recipes)) {
            this.validateRecipe(name, ingredients)
        }
    }

    validateRecipe(name, ingredients) {
        if ((typeof ingredients != "object") || Array.isArray(ingredients)) {
            throw Error(`Recipe "${name}" ingredients must be an object (is ${ingredients})`)
        }
        for (const [ingredientName, measure] of Object.entries(ingredients)) {
            if (!ingredientName) {
                throw Error(`Recipe "${name}" ingredient name is invalid (is ${ingredientName})`)
            }
            if (!this.brands[ingredientName]) {
                throw Error(`Recipe "${name}" ingredient "${ingredientName}" has no brand.json data.`)
            }
            this.validateMeasure(measure)
            
            // If ingredient uses ml, ensure brand has density
            const { unit } = this.getMeasureComponents(measure)
            if (Validator.liquidUnits.includes(unit)) {
                const brand = this.brands[ingredientName]
                if (typeof brand.density !== "number") {
                    throw Error(`Recipe "${name}" ingredient "${ingredientName}" uses ${unit} but brand has no density`)
                }
            }
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
        
        const { unit } = this.validateMeasure(brand.serving)
        if (Validator.liquidUnits.includes(unit) && (typeof brand.density != "number")) {
            throw Error(`Brand "${brandName}" uses liquid serving (${unit}) but density is not a number (is ${brand.density})`)
        }
        
        // Validate oxalatePerGram field if present
        if (brand.oxalatePerGram !== undefined) {
            if (typeof brand.oxalatePerGram !== "string") {
                throw Error(`Brand "${brandName}" oxalatePerGram must be a string (is ${typeof brand.oxalatePerGram})`)
            }
            // Should be in format "0.15 mg/g"
            const oxParts = brand.oxalatePerGram.split(" ")
            if (oxParts.length !== 2 || oxParts[1] !== "mg/g") {
                throw Error(`Brand "${brandName}" oxalatePerGram must be in format "X.XX mg/g" (is "${brand.oxalatePerGram}")`)
            }
            const oxValue = parseFloat(oxParts[0])
            if (isNaN(oxValue)) {
                throw Error(`Brand "${brandName}" oxalatePerGram value must be a number (is "${oxParts[0]}")`)
            }
        } else {
            console.warn(`Warning: Brand "${brandName}" has no oxalatePerGram field`)
        }
        
        this.validateData(brandName, brand.data)
    }

    validateMeasure(measure) {
        if (typeof measure != "string") {
            throw Error(`Measure "${measure}" is not a string`)
        }
        const comp = measure.split(" ").map(_ => _.trim())
        if (comp.length != 2) {
            throw Error(`Measure "${measure}" is invalid. Must be "<number> <unit string>"`)
        }
        const unit = comp[1]
        if (!Validator.supportedUnits.includes(unit)) {
            throw Error(`Unit is not supported (is "${unit}")`)
        }
        const amount = Number(comp[0])
        if (isNaN(amount)) {
            throw Error(`Amount must be a number (is "${comp[0]}")`)
        }
        return { amount, unit }
    }

    getMeasureComponents(measure) {
        const parts = measure.split(" ").map(_ => _.trim())
        return {
            amount: parseFloat(parts[0]),
            unit: parts[1]
        }
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
                throw Error(`Brand "${brandName}" data "${fieldName}" value must be a number (is "${measure}" type: ${typeof measure})`)
            }
        } else if (typeof measure != "string") {
            throw Error(`Brand "${brandName}" data "${fieldName}" value must be a string (is "${measure}" type: ${typeof measure})`)
        } else {
            this.validateMeasure(measure)
        }
    }

    static supportedUnits = ["g", "mg", "mcg", "ml"]
    static liquidUnits = ["ml"]
}