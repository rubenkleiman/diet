/**
 * Conversions
 * Converts between liquid and weight measures
 * Uses generic conversions for a food type
 * unless brand-specific information is available.
 */
export default class Converter {

    constructor() {
    }

    /**
     * Converts a liquid or solid measure to grams.
     * @param {string} measure A measure is a 
     * space-separated string with the amount
     * (a number) and the unit (e.g., g for grams).
     * @param {number} density Necessary only for liquid measures.
     */
    static toGrams(measure, density) {
        const { amount, unit } = this.toCanonicalAmount(measure)
        if (unit == "g") {
            return amount
        } else if (unit == "ml") {
            if (!density) {
                throw Error(`Liquid density required.`)
            }
            return amount * density
        } else {
            throw Error(`Conversion not supported.`)
        }
    }

    /**
     * Converts measure to grams.
     * @param {string} measure Comma-separated
     * string of the form "<amount number> <unit string>".
     * @returns {number} Returns the amount in grams.
     */
    static toGrams(measure, density) {
        const { amount, unit } = this.getMeasureComponents(measure)
        if (unit == "g") {
            return amount
        } else if (unit == "mg") {
            return amount / 1000
        } else if (unit == "mcg") {
            return amount / 1000000
        } else if (unit == "ml") {
            return amount * density
        } else {
            throw Error(`Measure "${measure} "not supported.`)
        }
    }

    static getMeasureComponents(measure) {
        let [amount, unit] = measure.split(" ").map(_ => _.trim())
        amount = Number(amount)
        return { amount, unit }
    }
}