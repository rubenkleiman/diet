import fs from 'fs'

class OxalatesClass {
    constructor() {
        const oxalates = JSON.parse(fs.readFileSync(`${import.meta.dirname}/data/oxalates.json`, "utf8"))
        this.data = {}
        for (const [brandName, measure] of Object.entries(oxalates)) {
            // Parse "0.15 mg/g" format
            const parts = measure.split(" ")
            const amount = parseFloat(parts[0])
            const unit = parts[1] // should be "mg/g"
            if (unit !== "mg/g") {
                throw Error(`Oxalate measure for "${brandName}" must be in mg/g format (is "${measure}")`)
            }
            this.data[brandName] = amount
        }
    }

    /**
     * Get oxalate content per gram for a brand
     * @param {string} brandName 
     * @returns {number} Oxalate in mg per gram
     */
    getPerGram(brandName) {
        if (!(brandName in this.data)) {
            console.warn(`Warning: No oxalate data for "${brandName}", assuming 0 mg/g`)
            return 0
        }
        return this.data[brandName]
    }
}

export const Oxalates = new OxalatesClass()

