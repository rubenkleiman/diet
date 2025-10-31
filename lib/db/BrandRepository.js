// FIXED 2025-10-30 5:15pm PDT
// Brand data repository - lazy loading from database - KEEP THIS FILE
import database from './Database.js'

class BrandRepository {
    /**
     * Get lightweight list of brands for UI display
     * @param {string} userId - Filter by user (null = all users)
     * @param {string} searchTerm - Optional search filter
     * @returns {Array} Array of {id, name, serving, serving_unit, oxalate_per_gram, compact_display}
     */
    async getList(userId = null, searchTerm = null) {
        let sql = `
            SELECT 
                b.id,
                b.name,
                b.serving,
                b.serving_unit,
                b.oxalate_per_gram,
                bd.calcium,
                bd.potassium,
                bd.magnesium
            FROM brands b
            LEFT JOIN brand_data bd ON b.id = bd.brand_id
            WHERE 1=1
        `
        const params = []

        if (userId) {
            sql += ' AND b.user_id = ?'
            params.push(userId)
        }

        if (searchTerm) {
            sql += ' AND b.name LIKE ?'
            params.push(`%${searchTerm}%`)
        }

        sql += ' ORDER BY b.name'

        const brands = await database.all(sql, params)

        // Build compact display string for each brand
        return brands.map(brand => ({
            id: brand.id,
            name: brand.name,
            serving: brand.serving,
            serving_unit: brand.serving_unit,
            oxalate_per_gram: brand.oxalate_per_gram,
            compact_display: this.buildCompactDisplay(brand)
        }))
    }

    /**
     * Get full brand details including all nutrition data
     * @param {number} id - Brand ID
     * @param {string} userId - User ID for permission check
     * @returns {Object|null} Full brand data
     */
    async getById(id, userId = null) {
        let sql = `
            SELECT 
                b.*,
                bd.calories,
                bd.sodium,
                bd.cholesterol,
                bd.sugars,
                bd.protein,
                bd.dietary_fiber,
                bd.carbohydrates,
                bd.calcium,
                bd.potassium,
                bd.magnesium,
                bd.selenium,
                bd.manganese,
                bd.zinc,
                bd.iron,
                bd.fat,
                bd.saturated_fat,
                bd.polysaturated_fat,
                bd.monosaturated_fat,
                bd.thiamin,
                bd.riboflavin,
                bd.niacin,
                bd.folic_acid,
                bd.phosphorus,
                bd.vitamin_a,
                bd.vitamin_b6,
                bd.vitamin_c,
                bd.vitamin_d,
                bd.vitamin_e,
                bd.vitamin_k
            FROM brands b
            LEFT JOIN brand_data bd ON b.id = bd.brand_id
            WHERE b.id = ?
        `
        const params = [id]

        if (userId) {
            sql += ' AND b.user_id = ?'
            params.push(userId)
        }

        const brand = await database.get(sql, params)
        
        if (!brand) return null

        // Parse oxalate per gram
        const oxalatePerGram = brand.oxalate_per_gram 
            ? parseFloat(brand.oxalate_per_gram) 
            : 0

        // Calculate grams per serving (handle ml with density)
        const gramsPerServing = brand.serving_unit === 'ml' && brand.density
            ? brand.serving * brand.density
            : brand.serving

        // Build nutrition data object
        const data = {}
        const nutritionFields = [
            'calories', 'sodium', 'cholesterol', 'sugars', 'protein', 'dietary_fiber',
            'carbohydrates', 'calcium', 'potassium', 'magnesium', 'selenium',
            'manganese', 'zinc', 'iron', 'fat', 'saturated_fat', 'polysaturated_fat',
            'monosaturated_fat', 'thiamin', 'riboflavin', 'niacin', 'folic_acid',
            'phosphorus', 'vitamin_a', 'vitamin_b6', 'vitamin_c', 'vitamin_d',
            'vitamin_e', 'vitamin_k'
        ]

        for (const field of nutritionFields) {
            if (brand[field]) {
                data[field] = brand[field]
            }
        }

        return {
            name: brand.name,
            serving: `${brand.serving} ${brand.serving_unit}`,
            gramsPerServing,
            density: brand.density,
            oxalatePerGram,
            oxalatePerServing: oxalatePerGram * gramsPerServing,
            data
        }
    }

    /**
     * Get brand by name (for recipe lookups)
     * @param {string} name - Brand name
     * @param {string} userId - User ID
     * @returns {Object|null} Brand data
     */
    async getByName(name, userId = null) {
        let sql = 'SELECT id FROM brands WHERE name = ?'
        const params = [name]

        if (userId) {
            sql += ' AND user_id = ?'
            params.push(userId)
        }

        const result = await database.get(sql, params)
        
        if (!result) return null
        
        return this.getById(result.id, userId)
    }

    /**
     * Build compact display string (Ca:380 K:473 Mg:20 Ox:0.01)
     * @param {Object} brand - Brand data with nutrition
     * @returns {string} Compact display string
     */
    buildCompactDisplay(brand) {
        const parts = []

        // Parse nutrient values (format: "380 mg" -> 380)
        const parseValue = (str) => {
            if (!str) return null
            const parts = str.toString().split(' ')
            return parseFloat(parts[0])
        }

        const calcium = parseValue(brand.calcium)
        const potassium = parseValue(brand.potassium)
        const magnesium = parseValue(brand.magnesium)
        const oxalate = brand.oxalate_per_gram ? parseFloat(brand.oxalate_per_gram) : 0

        if (calcium) parts.push(`Ca:${calcium}`)
        if (potassium) parts.push(`K:${potassium}`)
        if (magnesium) parts.push(`Mg:${magnesium}`)
        parts.push(`Ox:${oxalate.toFixed(3)}`)

        return parts.join(' ')
    }

    /**
     * Create new brand
     * @param {Object} brandData - Brand data
     * @param {string} userId - User ID
     * @returns {number} New brand ID
     */
    async create(brandData, userId) {
        await database.beginTransaction()
        
        try {
            // Parse serving
            const servingParts = brandData.serving.split(' ')
            const serving = parseFloat(servingParts[0])
            const servingUnit = servingParts[1]

            // Parse oxalate
            let oxalatePerGram = null
            let oxalateUnit = null
            if (brandData.oxalatePerGram) {
                const oxParts = brandData.oxalatePerGram.split(' ')
                oxalatePerGram = parseFloat(oxParts[0])
                oxalateUnit = oxParts[1]
            }

            // Insert brand
            const brandResult = await database.run(`
                INSERT INTO brands (user_id, name, serving, serving_unit, density, oxalate_per_gram, oxalate_per_gram_unit)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [userId, brandData.name, serving, servingUnit, brandData.density || null, oxalatePerGram, oxalateUnit])

            const brandId = brandResult.lastID

            // Insert brand_data if provided
            if (brandData.data) {
                const data = brandData.data
                await database.run(`
                    INSERT INTO brand_data (
                        brand_id, user_id, calories, sodium, cholesterol, sugars, protein,
                        dietary_fiber, carbohydrates, calcium, potassium, magnesium,
                        selenium, manganese, zinc, iron, fat, saturated_fat,
                        polysaturated_fat, monosaturated_fat, thiamin, riboflavin,
                        niacin, folic_acid, phosphorus, vitamin_a, vitamin_b6,
                        vitamin_c, vitamin_d, vitamin_e, vitamin_k
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    brandId, userId, data.calories || null, data.sodium || null,
                    data.cholesterol || null, data.sugars || null, data.protein || null,
                    data['dietary fiber'] || null, data.carbohydrates || null,
                    data.calcium || null, data.potassium || null, data.magnesium || null,
                    data.selenium || null, data.manganese || null, data.zinc || null,
                    data.iron || null, data.fat || null, data.saturatedFat || null,
                    data.polysaturatedFat || null, data.monosaturatedFat || null,
                    data.thiamin || null, data.riboflavin || null, data.niacin || null,
                    data['folic acid'] || null, data.phosphorus || null,
                    data['vitamin A'] || null, data['vitamin B6'] || null,
                    data['vitamin C'] || null, data['vitamin D'] || null,
                    data['vitamin E'] || null, data['vitamin K'] || null
                ])
            }

            await database.commit()
            return brandId

        } catch (error) {
            await database.rollback()
            throw error
        }
    }
}

export default new BrandRepository()