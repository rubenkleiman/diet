// Recipe data repository - lazy loading from database
import database from './Database.js'
import BrandRepository from './BrandRepository.js';

class RecipeRepository {

    /**
     * Calculates total nutrition for ingredients.
     * @param {object} request Property ingredients
     * is a list of { brandId, amount, unit } for ingredients
     * whose nutrition will be totaled.
     * @param {string} userId The user id.
     * @return {object} {totals, oxalateMg} where totals
     * is an array of ingredient totals (e.g., {sodium: <amt>})
     * and oxalateMg is the total oxalates.
     */
    async calculateRecipeNutrition(request, userId) { // Should be in brand repository
        this._validateRecipeNutritionRequest(request);
        const items = [];
        for (const ingredientServing of request.ingredients) {
            items.push({
                brandData: await BrandRepository.getById(ingredientServing.brandId, userId),
                ingredientServing
            });
        }
        const totals = {};
        let oxalateMg = 0;
        for (const item of items) {
            let gramsServing;
            if (item.ingredientServing.unit == "ml") {
                if (!item.brandData.density) {
                    throw Error(`Ingredient id ${item.brandData.id} ${item.brandData.name} has no liquid density data. Input: ${JSON.stringify(item.ingredientServing)}`);
                }
                gramsServing = item.ingredientServing.amount * item.brandData.density;
            } else {
                gramsServing = item.ingredientServing.amount;
            }
            const servingFactor = (gramsServing / item.brandData.gramsPerServing);
            const nutrients = item.brandData.data;
            for (const [nutrient, nutrientAmt] of Object.entries(nutrients)) {
                let amount = nutrientAmt;
                if (typeof nutrientAmt == "string") {
                    const [amt, unit] = nutrientAmt.split(" ");
                    if (!["g", "mg", "mcg"].includes(unit)) {
                        throw Error(`Nutrient unit must be "g", "mg" or "mcg" (is "${unit}" for ${nutrient})`);
                    }
                    amount = amt;
                } else {
                    amount = nutrientAmt;
                }
                if (totals[nutrient]) {
                    totals[nutrient] += (Math.round(amount * servingFactor * 10)/10);
                } else {
                    totals[nutrient] =  (Math.round(amount * servingFactor * 10)/10);
                }
            }
            oxalateMg += (item.brandData.oxalatePerServing || 0) * servingFactor;
        }
        return { totals, oxalateMg }
    }

    _validateRecipeNutritionRequest(request) {
        if (!request?.ingredients?.length) {
            throw Error(`Request missing array of ingredients. request: ${JSON.stringify(request)}`);
        }
        request.ingredients.forEach(i => {
                    if (typeof i != "object") {
                throw Error(`Item ${i} in ingredient list must be an object. ${JSON.stringify(request.ingredients)}`);
            }
            const keys = Object.keys(i);
            if (![3,4].includes(keys.length)) {
                throw Error(`Item ${JSON.stringify(i)} in ingredient list must have three or four elements. ${JSON.stringify(request.ingredients)}`);
            }
            if (!i.brandId || !i.amount || !i.unit) {
                throw Error(`Ingredient ${JSON.stringify(i)} missing brandId, amount, or unit property. ${JSON.stringify(request.ingredients)}`);
            }
            if (keys.length == 4 && !i.name) {
                throw Error(`Ingredient ${JSON.stringify(i)} missing name property. ${JSON.stringify(request.ingredients)}`);
            }
            if (!["g", "ml"].includes(i.unit)) {
                throw Error(`Ingredient unit ${JSON.stringify(i)} must be "g" or "ml". ${JSON.stringify(request.ingredients)}`);
            }
        });
    }


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

        return await database.all(sql, params)
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

        if (userId) { // TODO require for security
            sql += ' AND user_id = ?'
            params.push(userId)
        }

        const recipe = await database.get(sql, params)
        if (!recipe) {
            throw Error(`Recipe id ${id} not found.`)
        }

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
        const ingredientsByName = {} // TODO backward compatibility
        const ingredientsById = {}
        for (const item of items) {
            ingredientsByName[item.brand_name] = `${item.amount} ${item.unit}`
            ingredientsById[item.brand_id] = `${item.amount} ${item.unit}`
        }

        return {
            id: recipe.id,
            name: recipe.name,
            ingredients: ingredientsByName,
            ingredientsById
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

        return await this.getById(result.id, userId)
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
     * Gets full recipe details for editing (with brandIds, amounts, units)
     * @param {string} recipeId - Canonical recipe ID
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} Full recipe details or null if not found
     */
    async getRecipeFullDetails(recipeId, userId) {
        const recipe = await this.getById(recipeId, userId)
        if (!recipe) {
            throw Error(`Recipe id ${recipeId} not found`)
        }

        // Convert ingredients to include brandIds
        const ingredients = []
        for (const [brandName, measure] of Object.entries(recipe.ingredients)) {
            // Get brand ID from database
            const brandRecord = await database.get('SELECT id FROM brands WHERE name = ?', [brandName])
            if (brandRecord) {
                const measureParts = measure.split(' ')
                ingredients.push({
                    brandId: brandRecord.id,
                    brandName: brandName,
                    amount: parseFloat(measureParts[0]),
                    unit: measureParts[1]
                })
            }
        }

        return {
            id: recipe.id,
            name: recipe.name,
            ingredients: ingredients
        }
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