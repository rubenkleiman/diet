import { Brands } from './Brands.js'

class OxalatesClass {
    constructor() {
        // Oxalate data now comes from brands.json via Brands class
        // No need to load separate file
    }

    /**
     * Get oxalate content per gram for a brand
     * @param {string} brandName 
     * @returns {number} Oxalate in mg per gram
     */
    getPerGram(brandName) {
        const brand = Brands.find(brandName)
        if (!brand) {
            return 0
        }

        // Read from brand.oxalatePerGram field
        if (brand.oxalatePerGram) {
            // Parse "0.15 mg/g" format
            const value = parseFloat(brand.oxalatePerGram)
            return isNaN(value) ? 0 : value
        }

        return 0
    }
}

export const Oxalates = new OxalatesClass()