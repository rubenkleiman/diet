// FIXED 2025-10-30 5:15pm PDT
// Recipe data repository - lazy loading from database - KEEP THIS FILE
import database from './Database.js'

class RecipeRepository {
    /**
     * Get lightweight list of recipes for UI display
     * @param {string} userId - Filter by user (null = all users)
     * @param {string} searchTerm - Optional search filter
     * @returns {Array} Array of {id, name}
     */
    async getList(userId = null, searchTerm = null) {
        let sql = `
            SELECT 
                id,
                name
            FROM recipes
            WHERE 1=1
        `
        const params = []

        if (userId) {
            sql += ' AND user_id = ?'
            params.push(userId)
        }

        if (searchTerm) {
            sql += ' AND name LIKE ?'
            params.push(`%${searchTerm}%`)
        }

        sql += ' ORDER BY name'

        return database.all(sql, params)
    }

    /**
     * Get full recipe details with ingredients
     * @param {number} id - Recipe ID
     * @param {string} userId - User ID for permission check
     * @returns {Object|null} Full recipe data with ingredients
     */
    async getById(id, userId = null) {
        // Get recipe
        let sql = 'SELECT * FROM recipes WHERE id = ?'
        const params = [id]

        if (userId) {
            sql += ' AND user_id = ?'
            params.push(userId)
        }

        const recipe = await database.get(sql, params)
        if (!recipe) return null

        // Get recipe items (ingredients)
        const items = await database.all(`
            SELECT 
                ri.brand_id,
                ri.amount,
                ri.unit,
                b.name as brand_name
            FROM recipe_items ri
            JOIN brands b ON ri.brand_id = b.id
            WHERE ri.recipe_id = ?
            ORDER BY ri.item_order
        `, [id])

        // Build ingredients object
        const ingredients = {}
        for (const item of items) {
            ingredients[item.brand_name] = `${item.amount} ${item.unit}`
        }

        return {
            id: recipe.id,
            name: recipe.name,
            ingredients
        }
    }

    /**
     * Get recipe by name
     * @param {string} name - Recipe name
     * @param {string} userId - User ID
     * @returns {Object|null} Recipe data
     */
    async getByName(name, userId = null) {
        let sql = 'SELECT id FROM recipes WHERE name = ?'
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
     * Get all recipe names (for MakeMenu compatibility)
     * @param {string} userId - User ID
     * @returns {Array<string>} Array of recipe names
     */
    async getAllNames(userId = null) {
        const recipes = await this.getList(userId)
        return recipes.map(r => r.name)
    }

    /**
     * Create new recipe
     * @param {string} name - Recipe name
     * @param {Object} ingredients - Ingredients object {brandName: "amount unit"}
     * @param {string} userId - User ID
     * @returns {number} New recipe ID
     */
    async create(name, ingredients, userId) {
        await database.beginTransaction()

        try {
            // Insert recipe
            const recipeResult = await database.run(`
                INSERT INTO recipes (user_id, name)
                VALUES (?, ?)
            `, [userId, name])

            const recipeId = recipeResult.lastID

            // Insert recipe items
            let itemOrder = 1
            for (const [brandName, measure] of Object.entries(ingredients)) {
                // Get brand ID
                const brand = await database.get(
                    'SELECT id FROM brands WHERE name = ?',
                    [brandName]
                )

                if (!brand) {
                    throw new Error(`Brand not found: ${brandName}`)
                }

                const measureParts = measure.split(' ')
                const amount = parseFloat(measureParts[0])
                const unit = measureParts[1]

                await database.run(`
                    INSERT INTO recipe_items (recipe_id, brand_id, item_order, amount, unit)
                    VALUES (?, ?, ?, ?, ?)
                `, [recipeId, brand.id, itemOrder, amount, unit])

                itemOrder++
            }

            await database.commit()
            return recipeId

        } catch (error) {
            await database.rollback()
            throw error
        }
    }

    /**
     * Update recipe
     * @param {number} id - Recipe ID
     * @param {string} name - Recipe name
     * @param {Object} ingredients - Ingredients object
     * @param {string} userId - User ID
     */
    async update(id, name, ingredients, userId) {
        await database.beginTransaction()

        try {
            // Update recipe name
            await database.run(`
                UPDATE recipes 
                SET name = ?
                WHERE id = ? AND user_id = ?
            `, [name, id, userId])

            // Delete existing items
            await database.run('DELETE FROM recipe_items WHERE recipe_id = ?', [id])

            // Insert new items
            let itemOrder = 1
            for (const [brandName, measure] of Object.entries(ingredients)) {
                const brand = await database.get(
                    'SELECT id FROM brands WHERE name = ?',
                    [brandName]
                )

                if (!brand) {
                    throw new Error(`Brand not found: ${brandName}`)
                }

                const measureParts = measure.split(' ')
                const amount = parseFloat(measureParts[0])
                const unit = measureParts[1]

                await database.run(`
                    INSERT INTO recipe_items (recipe_id, brand_id, item_order, amount, unit)
                    VALUES (?, ?, ?, ?, ?)
                `, [id, brand.id, itemOrder, amount, unit])

                itemOrder++
            }

            await database.commit()

        } catch (error) {
            await database.rollback()
            throw error
        }
    }

    /**
     * Delete recipe
     * @param {number} id - Recipe ID
     * @param {string} userId - User ID
     */
    async delete(id, userId) {
        // CASCADE will delete recipe_items automatically
        await database.run(
            'DELETE FROM recipes WHERE id = ? AND user_id = ?',
            [id, userId]
        )
    }
}

export default new RecipeRepository()