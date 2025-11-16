import database from './Database.js'

class MenuRepository {
    /**
        * Get lightweight list of menus for UI display
        * @param {string} userId - Filter by user (null = all users)
        * @param {string} searchTerm - Optional search filter
        * @returns {Array} Array of {id, name, array-of-recipe-ids}
        */
    async getList(userId = null, searchTerm = null) {

        let sql = `
            select menus.name, menus.id, menu_recipes.recipe_id
            from menus
            INNER JOIN menu_recipes 
            on menu_recipes.menu_id = menus.id
            where menus.user_id = ?
        `
        const params = []

        userId = userId || 'a70ff520-1125-4098-90b3-144e22ebe84a';

        if (userId) {
            params.push(userId)
        } else {
            throw Error(`Missing userId`);
        }

        if (searchTerm) {
            sql += ' AND name LIKE ?'
            params.push(`%${searchTerm}%`)
        }

        sql += ' ORDER BY name'

        const results = await database.all(sql, params)

        if (!results.length) {
            return [];
        }

        const menusWithRecipeIds = this._getMenusWithRecipeIds(results);

        return menusWithRecipeIds
    }

    async getMenu(id, summary) {
        let sql = `
            select menus.name, menus.id, menu_recipes.recipe_id
            from menus
            INNER JOIN menu_recipes 
            on menu_recipes.menu_id = menus.id
            where menus.id = ?
        `
        const params = [];
        if (id) {
            params.push(id)
        } else {
            throw Error(`Missing menu id`);
        }

        const results = await database.all(sql, params)

        if (!results.length) {
            return {};
        }

        const menusWithRecipeIds = this._getMenusWithRecipeIds(results);

        return (menusWithRecipeIds?.length ? menusWithRecipeIds[0] : {});
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

    _getMenusWithRecipeIds(results) {
        const menus = {}
        for (const item of results) {
            if (menus[item.id]) {
                menus[item.id].recipeIds.push(item.recipe_id);
            } else {
                menus[item.id] = { id: item.id, name: item.name, recipeIds: [item.recipe_id] };
            }
        }
        return Object.values(menus)
    }
}

export default new MenuRepository()