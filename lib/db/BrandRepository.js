// FIXED 2025-10-31 - Complete CRUD operations with all nutrition fields
// Brand data repository - lazy loading from database
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
            id: brand.id,
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
     * Create new brand with all nutrition fields
     * @param {Object} brandData - Brand data
     * @param {string} userId - User ID
     * @returns {number} New brand ID
     */
    async create(brandData, userId) {
        await database.beginTransaction()
        
        try {
            // Insert brand
            const brandResult = await database.run(`
                INSERT INTO brands (user_id, name, serving, serving_unit, density, oxalate_per_gram, oxalate_per_gram_unit)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [userId, brandData.name, brandData.serving, brandData.servingUnit, brandData.density || null, brandData.oxalatePerGram || 0, 'mg/g'])

            const brandId = brandResult.lastID

            // Insert brand_data with all fields
            const data = brandData.data || {}
            
            // Format nutrition values - add unit suffix if value exists (except calories which is stored as raw number)
            const formatValue = (val) => { 
                if (val === null || val === undefined || val === '') return null
                const split = val.split(" ")
                // Discriminate between unit-less quantities and ones with units
                return ( split.length == 1 ? parseFloat(val) : `${parseFloat(split[0])} ${split[1]}`)
            }
            
            // Calories is stored as a plain number, not a string with units
            const calories = data.calories !== null && data.calories !== undefined && data.calories !== '' 
                ? parseFloat(data.calories) 
                : null
            
            console.log('Creating brand_data with calories:', calories, 'from:', data.calories); // Debug
            
            await database.run(`
                INSERT INTO brand_data (
                    brand_id, user_id, 
                    calories, sodium, cholesterol, sugars, protein,
                    dietary_fiber, carbohydrates, calcium, potassium, magnesium,
                    selenium, manganese, zinc, iron, fat, saturated_fat,
                    polysaturated_fat, monosaturated_fat, thiamin, riboflavin,
                    niacin, folic_acid, phosphorus, vitamin_a, vitamin_b6,
                    vitamin_c, vitamin_d, vitamin_e, vitamin_k
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                brandId, userId,
                calories,  // Calories as plain number
                formatValue(data.sodium),
                formatValue(data.cholesterol),
                formatValue(data.sugars),
                formatValue(data.protein),
                formatValue(data.dietary_fiber),
                formatValue(data.carbohydrates),
                formatValue(data.calcium),
                formatValue(data.potassium),
                formatValue(data.magnesium),
                formatValue(data.selenium),
                formatValue(data.manganese),
                formatValue(data.zinc),
                formatValue(data.iron),
                formatValue(data.fat),
                formatValue(data.saturated_fat),
                formatValue(data.polysaturated_fat),
                formatValue(data.monosaturated_fat),
                formatValue(data.thiamin),
                formatValue(data.riboflavin),
                formatValue(data.niacin),
                formatValue(data.folic_acid),
                formatValue(data.phosphorus),
                formatValue(data.vitamin_a),
                formatValue(data.vitamin_b6),
                formatValue(data.vitamin_c),
                formatValue(data.vitamin_d),
                formatValue(data.vitamin_e),
                formatValue(data.vitamin_k)
            ])

            await database.commit()
            return brandId

        } catch (error) {
            await database.rollback()
            console.error('Error creating brand:', error); // Debug
            throw error
        }
    }

    /**
     * Update existing brand with all nutrition fields
     * @param {number} brandId - Brand ID
     * @param {Object} brandData - Brand data
     * @param {string} userId - User ID
     */
    async update(brandId, brandData, userId) {
        await database.beginTransaction()
        
        try {
            // Update brand
            await database.run(`
                UPDATE brands 
                SET name = ?, serving = ?, serving_unit = ?, density = ?, oxalate_per_gram = ?
                WHERE id = ? AND user_id = ?
            `, [brandData.name, brandData.serving, brandData.servingUnit, brandData.density || null, brandData.oxalatePerGram || 0, brandId, userId])

            // Update or insert brand_data
            const existingData = await database.get('SELECT id FROM brand_data WHERE brand_id = ?', [brandId])
            
            const data = brandData.data || {}
            const formatValue = (val) => {
                if (val === null || val === undefined || val === '') return null
                const split = val.split(" ")
                // Discriminate between unit-less quantities and ones with units
                return ( split.length == 1 ? parseFloat(val) : `${parseFloat(split[0])} ${split[1]}`)
            }
            
            // Calories is stored as a plain number
            const calories = data.calories !== null && data.calories !== undefined && data.calories !== '' 
                ? parseFloat(data.calories) 
                : null
            
            console.log('Updating brand_data with calories:', calories, 'from:', data.calories); // Debug
            
            if (existingData) {
                await database.run(`
                    UPDATE brand_data 
                    SET calories = ?, sodium = ?, cholesterol = ?, sugars = ?, protein = ?,
                        dietary_fiber = ?, carbohydrates = ?, calcium = ?, potassium = ?, magnesium = ?,
                        selenium = ?, manganese = ?, zinc = ?, iron = ?, fat = ?, saturated_fat = ?,
                        polysaturated_fat = ?, monosaturated_fat = ?, thiamin = ?, riboflavin = ?,
                        niacin = ?, folic_acid = ?, phosphorus = ?, vitamin_a = ?, vitamin_b6 = ?,
                        vitamin_c = ?, vitamin_d = ?, vitamin_e = ?, vitamin_k = ?
                    WHERE brand_id = ?
                `, [
                    calories,  // Calories as plain number
                    formatValue(data.sodium),
                    formatValue(data.cholesterol),
                    formatValue(data.sugars),
                    formatValue(data.protein),
                    formatValue(data.dietary_fiber),
                    formatValue(data.carbohydrates),
                    formatValue(data.calcium),
                    formatValue(data.potassium),
                    formatValue(data.magnesium),
                    formatValue(data.selenium),
                    formatValue(data.manganese),
                    formatValue(data.zinc),
                    formatValue(data.iron),
                    formatValue(data.fat),
                    formatValue(data.saturated_fat),
                    formatValue(data.polysaturated_fat),
                    formatValue(data.monosaturated_fat),
                    formatValue(data.thiamin),
                    formatValue(data.riboflavin),
                    formatValue(data.niacin),
                    formatValue(data.folic_acid),
                    formatValue(data.phosphorus),
                    formatValue(data.vitamin_a),
                    formatValue(data.vitamin_b6),
                    formatValue(data.vitamin_c),
                    formatValue(data.vitamin_d),
                    formatValue(data.vitamin_e),
                    formatValue(data.vitamin_k),
                    brandId
                ])
            } else {
                await database.run(`
                    INSERT INTO brand_data (
                        brand_id, user_id,
                        calories, sodium, cholesterol, sugars, protein,
                        dietary_fiber, carbohydrates, calcium, potassium, magnesium,
                        selenium, manganese, zinc, iron, fat, saturated_fat,
                        polysaturated_fat, monosaturated_fat, thiamin, riboflavin,
                        niacin, folic_acid, phosphorus, vitamin_a, vitamin_b6,
                        vitamin_c, vitamin_d, vitamin_e, vitamin_k
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    brandId, userId,
                    calories,  // Calories as plain number
                    formatValue(data.sodium),
                    formatValue(data.cholesterol),
                    formatValue(data.sugars),
                    formatValue(data.protein),
                    formatValue(data.dietary_fiber),
                    formatValue(data.carbohydrates),
                    formatValue(data.calcium),
                    formatValue(data.potassium),
                    formatValue(data.magnesium),
                    formatValue(data.selenium),
                    formatValue(data.manganese),
                    formatValue(data.zinc),
                    formatValue(data.iron),
                    formatValue(data.fat),
                    formatValue(data.saturated_fat),
                    formatValue(data.polysaturated_fat),
                    formatValue(data.monosaturated_fat),
                    formatValue(data.thiamin),
                    formatValue(data.riboflavin),
                    formatValue(data.niacin),
                    formatValue(data.folic_acid),
                    formatValue(data.phosphorus),
                    formatValue(data.vitamin_a),
                    formatValue(data.vitamin_b6),
                    formatValue(data.vitamin_c),
                    formatValue(data.vitamin_d),
                    formatValue(data.vitamin_e),
                    formatValue(data.vitamin_k)
                ])
            }

            await database.commit()

        } catch (error) {
            await database.rollback()
            console.error('Error updating brand:', error); // Debug
            throw error
        }
    }

    /**
     * Delete brand
     * @param {number} brandId - Brand ID
     * @param {string} userId - User ID
     */
    async delete(brandId, userId) {
        // CASCADE will delete brand_data automatically
        await database.run(
            'DELETE FROM brands WHERE id = ? AND user_id = ?',
            [brandId, userId]
        )
    }
}

export default new BrandRepository()