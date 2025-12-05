import database from '../db/Database.js'
import RecipeRepository from '../repositories/RecipeRepository.js';

class MenuRepository {

    /**
     * Aggregates menu nutrition from multiple recipes
     * @param {object} request {recipeIds: <array of recipe ids>}
     * @param {*} userId The user id
     * @return {object} {totals, oxalateMg} where totals
     * is an array of ingredient totals (e.g., {sodium: <amt>})
     * and oxalateMg is the total oxalates.
     */
    async calculateMenuNutrition(request, userId) {
        if (!userId) {
            throw Error('Missing user id.');
        }
        if (!request?.recipeIds
            || !Array.isArray(request.recipeIds)
            || !request.recipeIds.length
            || request.recipeIds.some(el =>
                !Number.isInteger(el) &&
                (typeof el === "string" && !/^-?\d+$/.test(el))
            )) {
            throw Error(`Request recipeIds is missing, malformed, has non-numeric ids, or is empty: ${JSON.stringify(request)}`);
        }

        let oxalateMg = 0
        const totals = {}
        for (const recipeId of request.recipeIds) {
            const recipeData = await RecipeRepository.getById(recipeId, userId)
            const ingredients = []
            for (const [brandId, recipeAmount] of Object.entries(recipeData.ingredientsById)) {
                const components = recipeAmount.split(" ")
                const param = { brandId, amount: parseFloat(components[0]), unit: components[1] }
                if (isNaN(param.amount)) {
                    throw Error(`Recipe amount ${amount} for brand id ${brandId} is not a number`)
                }
                ingredients.push(param)
            }
            const nutrientData = await RecipeRepository.calculateRecipeNutrition({ ingredients }, userId)
            for (const [nutrient, nutrientAmt] of Object.entries(nutrientData.totals)) {
                if (totals[nutrient]) {
                    totals[nutrient] += nutrientAmt;
                } else {
                    totals[nutrient] = nutrientAmt
                }
            }
            oxalateMg += nutrientData.oxalateMg
        }
        return { totals, oxalateMg }
    }

    async getRecipeIds(menuId) {
        const sql = `
            select mr.recipe_id as id
            from menus
            inner join menu_recipes mr
            on menus.id = mr.menu_id
            and menus.id = ?
            order by mr.item_order
        `
        const results = await database.all(sql, [menuId])
        return results.map(i => i.id);
    }

    async getMenus(options) {
        const {
            userId,
            menuId = null,
            summary = false,
            searchTerm = null
        } = options;

        let sql = `
            select menus.id as id, menus.name as name,
            menu_recipes.recipe_id, 
            menu_recipes.serving_amount, 
            menu_recipes.unit,
            recipe_items.brand_id,
            brands.density
            from menus
            inner join menu_recipes
            on menus.id = menu_recipes.menu_id
            inner join recipe_items
            on recipe_items.recipe_id = menu_recipes.recipe_id
            inner join brands
            on brands.id = recipe_items.brand_id
            where 1=1
        `
        const params = []

        if (userId) {
            sql += ' and menus.user_id = ?'
            params.push(userId)
        }

        if (menuId) {
            sql += ' and menus.id = ?'
            params.push(parseInt(menuId))
        }

        if (searchTerm) {
            sql += ' AND menus.name LIKE ?'
            params.push(`%${searchTerm}%`)
        }

        sql += ' ORDER BY menus.name, menu_recipes.item_order'

        const results = await database.all(sql, params)

        if (!results.length) {
            return [];
        }

        const menusWithRecipeIds = this._resolveMenusToData(results);

        return (menuId ? menusWithRecipeIds[0] : menusWithRecipeIds)
    }

    async getMenu(options) {
        return await this.getMenus(options)
    }

    async createMenu(options) {
        const { name, recipes, userId } = options;

        if (!name || !recipes || !Array.isArray(recipes) || recipes.length === 0) {
            throw Error('Menu name and recipes array are required');
        }

        await database.beginTransaction()
        try {
            // Insert menu
            const menuResult = await database.run(`
                INSERT INTO menus (user_id, name)
                VALUES (?, ?)
            `, [userId, name])
            const menuId = menuResult.lastID

            // Insert menu recipes with serving amounts
            let itemOrder = 1
            for (const recipe of recipes) {
                if (!recipe.id || !recipe.amount || !recipe.unit) {
                    throw Error(`Each recipe must have id, amount, and unit. Got: ${JSON.stringify(recipe)}`);
                }

                await database.run(`
                    INSERT INTO menu_recipes (menu_id, recipe_id, serving_amount, unit, item_order)
                    VALUES (?, ?, ?, ?, ?)
                `, [menuId, recipe.id, parseFloat(recipe.amount), recipe.unit, itemOrder++])
            }

            await database.commit()

            // Return created menu with recipes
            return {
                id: menuId,
                name: name,
                recipes: recipes.map(r => ({
                    id: parseInt(r.id),
                    amount: parseFloat(r.amount),
                    unit: r.unit
                }))
            }
        } catch (error) {
            await database.rollback()
            throw error
        }
    }

    async updateMenu(options) {
        const { id, name, recipes, userId } = options;

        if (!id || !name || !recipes || !Array.isArray(recipes) || recipes.length === 0) {
            throw Error('Menu id, name, and recipes array are required');
        }

        await database.beginTransaction()

        try {
            // Update menu name
            const result = await database.run(`
                UPDATE menus 
                SET name = ?
                WHERE id = ? AND user_id = ?
            `, [name, id, userId])

            if (result.changes === 0) {
                throw Error(`Menu ${id} not found or not owned by user ${userId}`);
            }

            // Delete existing recipes
            await database.run('DELETE FROM menu_recipes WHERE menu_id = ?', [id])

            // Insert new recipes with serving amounts
            let itemOrder = 1
            for (const recipe of recipes) {
                if (!recipe.id || !recipe.amount || !recipe.unit) {
                    throw Error(`Each recipe must have id, amount, and unit. Got: ${JSON.stringify(recipe)}`);
                }

                await database.run(`
                    INSERT INTO menu_recipes (menu_id, recipe_id, serving_amount, unit, item_order)
                    VALUES (?, ?, ?, ?, ?)
                `, [id, recipe.id, parseFloat(recipe.amount), recipe.unit, itemOrder++])
            }

            await database.commit()

            // Return updated menu with recipes
            return {
                id: parseInt(id),
                name: name,
                recipes: recipes.map(r => ({
                    id: parseInt(r.id),
                    amount: parseFloat(r.amount),
                    unit: r.unit
                }))
            }

        } catch (error) {
            await database.rollback()
            throw error
        }
    }

    async deleteMenu(id, userId) {
        let sql = `
        delete from menus where user_id = ? and id = ?
        `
        const results = await database.all(sql, [userId, id])
        return
    }

    /**
     * Resolve menu data to proper format
     * Input: Array of rows from SQL join (multiple rows per menu, one per recipe ingredient)
     * Output: Array of menus with aggregated recipe data
     * Format: { id, name, recipes: [{id, amount, unit}] }
     */
    _resolveMenusToData(results) {
        // Group by menu ID first
        const menuMap = new Map()
        
        for (const row of results) {
            if (!menuMap.has(row.id)) {
                menuMap.set(row.id, {
                    id: row.id,
                    name: row.name,
                    recipesMap: new Map() // Track recipes within this menu
                })
            }
            
            const menu = menuMap.get(row.id)
            
            // Validate serving_amount and unit
            if (!row.serving_amount || !row.unit) {
                throw Error(`Menu id ${row.id} recipe id ${row.recipe_id} missing serving_amount or unit. This menu needs to be recreated.`)
            }
            
            // Add or update recipe in this menu
            if (!menu.recipesMap.has(row.recipe_id)) {
                let amount = row.serving_amount
                let unit = row.unit
                
                // Convert ml to g if needed and density is available
                if (unit === 'ml') {
                    if (row.density) {
                        amount = amount * row.density
                        unit = 'g'
                    } else {
                        throw Error(`Menu id ${row.id} recipe id ${row.recipe_id} uses ml but ingredient has no density`)
                    }
                }
                
                menu.recipesMap.set(row.recipe_id, {
                    id: row.recipe_id,
                    amount: amount,
                    unit: unit
                })
            }
        }
        
        // Convert to final format
        const menus = []
        for (const menu of menuMap.values()) {
            menus.push({
                id: menu.id,
                name: menu.name,
                recipes: Array.from(menu.recipesMap.values())
            })
        }
        
        return menus
    }

    _groupById(arr) {
        const map = new Map();
        for (const item of arr) {
            if (!map.has(item.id)) {
                map.set(item.id, []);
            }
            map.get(item.id).push(item);
        }
        return Array.from(map.values());
    }
}

export default new MenuRepository()