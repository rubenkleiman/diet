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
    async calculateMenuNutrition(request, userId) { // TODO should be in RecipeRepository
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
            menu_recipes.recipe_id, recipe_items.amount as recipe_amount,
            recipe_items.unit as recipe_unit, brands.density
            from menus
            inner join menu_recipes
            on menus.id = menu_recipes.menu_id
            inner join recipe_items
            on recipe_items.recipe_id = menu_recipes.recipe_id
            inner join brands
            on brands.id = recipe_items.brand_id
        `
        const params = []

        if (userId) {
            sql += ' and menus.user_id = ?'
            params.push(userId)
        }

        if (menuId) {
            sql += ' and menus.id = ?'
            params.push(menuId)
        }

        if (searchTerm) {
            sql += ' AND name LIKE ?'
            params.push(`%${searchTerm}%`)
        }

        sql += ' ORDER BY menus.name'

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

    async createMenu(name, recipeIds, userId) {
        await database.beginTransaction()
        try {
            const menuResult = await database.run(`
                INSERT INTO menus (user_id, name)
                VALUES (?, ?)
            `, [userId, name])
            const id = menuResult.lastID

            let itemOrder = 1
            for (const recipeId of recipeIds) {
                await database.run(`
                    INSERT INTO menu_recipes (menu_id, recipe_id, item_order)
                    VALUES (?, ?, ?)
                `, [id, recipeId, itemOrder++])
            }

            await database.commit()
            return { id, name, recipeIds }
        } catch (error) {
            await database.rollback()
            throw error
        }
    }

    async updateMenu(menuId, name, recipeIds, userId) {
        await database.beginTransaction()

        try {
            // Update menu name
            await database.run(`
                UPDATE menus 
                SET name = ?
                WHERE id = ? AND user_id = ?
            `, [name, menuId, userId])

            // Delete existing recipes
            await database.run('DELETE FROM menu_recipes WHERE menu_id = ?', [menuId])

            // Insert new items
            let itemOrder = 1
            for (const recipeId of recipeIds) {

                await database.run(`
                    INSERT INTO menu_recipes (menu_id, recipe_id, item_order)
                    VALUES (?, ?, ?)
                `, [menuId, recipeId, itemOrder++])
            }

            await database.commit()

            return { menuId }

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

    /*
    {
    id: 1
    name: "MENU NAME",
    recipes: [{id: 5, amount: '10', unit: 'g'},{id: 6, amount: '21', unit: 'ml'}]
    } */
    _resolveMenusToData(results) {
        const menus = this._groupById(results)
        const data = []
        for (const menu /** array of menu recipes */ of menus) {
            const menuId = menu[0].id
            const menuName = menu[0].name
            const entry = { id: menuId, name: menuName, recipes: [] }
            for (const item of menu) {
                let amount = (item.menu_amount || item.recipe_amount)
                let unit = (item.menu_unit || item.recipe_unit)
                if (unit == 'ml') {
                    if (item.density) {
                        amount *= item.density
                        unit = 'g'
                    } else {
                        throw Error(`Missing density for menu id ${menuId} recipe id ${item.recipe_id}`)
                    }
                }
                const recipe = entry.recipes.find(_ => _.id == item.recipe_id)
                if (recipe) {
                    recipe.amount += amount
                } else {
                    entry.recipes.push({ id: item.recipe_id, amount, unit })
                }
            }
            data.push(entry)
        }
        return data
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