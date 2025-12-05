import database from '../db/Database.js';
import MenuRepository from './MenuRepository.js';

class DailyPlanRepository {

    /**
     * Aggregates plan nutrition from multiple menus
     * @param {object} request {menuIds: <array of menu ids>}
     * @param {*} userId The user id
     * @return {object} {totals, oxalateMg} where totals
     * is an array of ingredient totals (e.g., {sodium: <amt>})
     * and oxalateMg is the total oxalates.
     */
    async calculateDailyPlanNutrition(request, userId) {
        const menuIds = request?.menuIds;
        if (!menuIds
            || !Array.isArray(menuIds)
            || !menuIds.length
            || menuIds.some(el =>
                !Number.isInteger(el) &&
                (typeof el === "string" && !/^-?\d+$/.test(el))
            )) {
            throw Error(`Request menuIds is missing, malformed, has non-numeric ids, or is empty: ${JSON.stringify(request)}`);
        }
        let recipeIds = []
        for (const menuId of menuIds) {
            recipeIds = [...recipeIds, ...await MenuRepository.getRecipeIds(menuId)]
        }
        const nutrientData = await MenuRepository.calculateMenuNutrition({ recipeIds }, userId)
        const totals = {}
        let oxalateMg = 0
        for (const [nutrient, nutrientAmt] of Object.entries(nutrientData.totals)) {
            if (totals[nutrient]) {
                totals[nutrient] += nutrientAmt;
            } else {
                totals[nutrient] = nutrientAmt
            }
        }
        oxalateMg += nutrientData.oxalateMg

        return { totals, oxalateMg }
    }


    /**
     * Returns all daily plans for the user.
     * @param {object} options {searchTerm, summary, userId}
     *  userId {string}: The user id
     *  searchTerm {string}: A search term
     *  summary {boolean}: If true, return a nutritional summary of key ingredients.
     * @return {object} // Example response format
     * {
     *   id: "daily-plan-123",
     *   name: "Today's Plan",
     *   menuIds: ["menu-1", "menu-2"],
     *   summary: { 
     *     calories: 450,
     *     sodium: 320,
     *     oxalates: 12.5,
     *     menuCount: 2
     *   }
     * }
     */
    async get(options) {
        const {
            searchTerm = null,
            planId = null,
            summary = false,
            userId
        } = options

        let sql = `
        select plans.id, plans.user_id, plans.name, menus.menu_id, menus.type 
        from daily_plans as plans
        inner join daily_plan_menus as menus
        on plans.id = menus.daily_plan_id
        `;
        const params = [];
        if (userId) {
            sql += " and plans.user_id = ?";
            params.push(userId);
        }
        if (planId) {
            sql += " and plans.id = ?";
            params.push(planId);
        }
        if (searchTerm) { // optional
            sql += ' AND name LIKE ?';
            params.push(`%${searchTerm}%`);
        }
        sql += " order by name"

        const results = await database.all(sql, params)

        if (!results.length) {
            return [];
        }

        return this._formatPlans(results);
    }

    async getDetails(planId, userId) {
        const data = await this._getDetails1(planId, userId);
        await this._getDetails2(data);
        return data
    }

    async update(id, request, userId) {
        await database.beginTransaction()
        try {
            let result = await database.run("UPDATE daily_plans SET name = ? WHERE user_id = ? and id = ?",
                [request.name, userId, id])

            result = await database.run("DELETE from daily_plan_menus WHERE daily_plan_id = ?",
                [id]
            )

            let itemOrder = 1
            for (const menu of request.dailyPlanMenus) {
                await database.run(`
                    INSERT INTO daily_plan_menus (daily_plan_id, menu_id, type, item_order)
                    VALUES (?, ?, ?, ?)
                `, [id, menu.menuId, menu.type, itemOrder++])
            }

            await database.commit()
            return this.get({ planId: id, userId });
        } catch (error) {
            await database.rollback()
            throw error
        }
    }

    async delete(id, userId) {
        // CASCADE will delete daily_plan_menus automatically
        const result = await database.run(
            'DELETE FROM daily_plans WHERE id = ? AND user_id = ?',
            [id, userId]
        )
        return { ok: result.changes > 0 };
    }

    // Private methods

    /**
     * Fills-in the aggregate nutritional values
     * for the daily plan.
     * See "Daily Plan API Endpoints.md".
     * @param {object} data The plan details data.
     */
    async _getDetails2(data) {

        function aggregate(totals, values) {
            for (const name in totals) {
                const amt = values[name];
                if (!amt) { continue; }
                const curr = totals[name];
                if (curr) {
                    totals[name] += amt;
                } else {
                    totals[name] = amt;
                }
            }
        }

        const menuIds = data.menus.map(m => m.menuId);
        let sql = `
            select menus.id as menuId, menus.name
                ,mr.recipe_id
                ,mr.serving_amount as menuRecipeAmount
                ,mr.unit as menuRecipeUnit
                ,recipe_items.amount as ingredientRecipeAmount
                ,recipe_items.unit as ingredientRecipeUnit
                ,brands.serving as brandServingAmount
                ,brands.serving_unit as brandServingUnit
                ,brands.density
                ,brands.oxalate_per_gram
                ,data.*
                from menus 
                inner join menu_recipes mr
                on mr.menu_id = menus.id
                inner join recipe_items 
                on recipe_items.recipe_id = mr.recipe_id
                inner join brands
                on recipe_items.brand_id = brands.id
                inner join brand_data data
                on data.brand_id = brands.id
                where menus.id in (${menuIds.map(() => '?').join(',')})
    `
        const results = await database.all(sql, menuIds);

        if (!results.length) {
            return data;
        }

        // Validate that all menu recipes have serving amounts
        results.forEach(row => {
            if (!row.menuRecipeAmount || !row.menuRecipeUnit) {
                throw Error(`Menu ${row.menuId} recipe ${row.recipe_id} has NULL serving_amount or unit. Menu needs to be recreated.`)
            }
        });

        // Group by menu and recipe to calculate recipe totals
        const recipeData = new Map(); // recipeId -> { totalAmount, ingredients: [] }
        
        results.forEach(row => {
            const key = `${row.menuId}-${row.recipe_id}`;
            
            if (!recipeData.has(key)) {
                recipeData.set(key, {
                    menuId: row.menuId,
                    recipeId: row.recipe_id,
                    menuRecipeAmount: row.menuRecipeAmount,
                    menuRecipeUnit: row.menuRecipeUnit,
                    totalRecipeAmount: 0,
                    ingredients: []
                });
            }
            
            const recipe = recipeData.get(key);
            
            // Convert ingredient amount to grams and add to total
            const ingredientGrams = this._toGrams(
                row.ingredientRecipeAmount, 
                row.ingredientRecipeUnit, 
                row.density
            );
            recipe.totalRecipeAmount += ingredientGrams;
            recipe.ingredients.push(row);
        });

        // Now calculate nutrition for each ingredient with proper scaling
        const menus = data.menus;
        
        recipeData.forEach(recipe => {
            const menu = menus.find(m => m.menuId == recipe.menuId);
            menu.name = recipe.ingredients[0].name;
            
            // Calculate menu scaling factor
            const menuRecipeGrams = this._toGrams(
                recipe.menuRecipeAmount,
                recipe.menuRecipeUnit,
                recipe.ingredients[0].density // Use first ingredient's density if needed
            );
            const menuScalingFactor = menuRecipeGrams / recipe.totalRecipeAmount;
            
            // Process each ingredient
            recipe.ingredients.forEach(nutrition => {
                const vals = this._nutritionalValues(nutrition, menuScalingFactor);
                if (menu.totals) {
                    aggregate(menu.totals, vals);
                } else {
                    menu.totals = vals;
                }
            });
        });

        menus.forEach(m => { 
            m.oxalateMg = m.totals.oxalateMg; 
            delete m.totals.oxalateMg; 
        });

        this._summarizeData(data);
    }

    _summarizeData(data) {
        data.totals = data.menus.reduce((acc, menu) => {
            for (const [key, value] of Object.entries(menu.totals)) {
                acc[key] = (acc[key] || 0) + value;
            }
            return acc;
        }, {});
        data.oxalateMg = data.menus.map(m => m.oxalateMg).reduce((a, b) => a ? (a + b) : b);
    }

    /**
     * Calculate nutritional values for an ingredient with menu scaling
     * @param {object} nutrition - Row from database with ingredient and brand data
     * @param {number} menuScalingFactor - Factor to scale recipe to menu serving size
     */
    _nutritionalValues(nutrition, menuScalingFactor) {
        function safeVal(value, servingFactor) {
            if (value) {
                if (typeof value == "string") {
                    let [amt, unit] = value.split(" ");
                    if (!unit) {
                        throw Error(`Invalid nutrition value ${value}. Expected "<amt> g".`)
                    }
                    amt = parseFloat(amt);
                    if (isNaN(amt)) {
                        throw Error(`Invalid nutrition value ${amt}. Should have been a number.`)
                    }
                    return Math.round((parseFloat(amt) * servingFactor * 10)) / 10;
                } else if (typeof value == "number") {
                    return Math.round(value * servingFactor * 10) / 10;
                } else {
                    throw Error(`Invalid nutrition value ${value}`)
                }
            } else {
                return null;
            }
        }
        
        // Calculate how much of this ingredient is in the recipe
        const ingredientRecipeGrams = this._toGrams(
            nutrition.ingredientRecipeAmount, 
            nutrition.ingredientRecipeUnit, 
            nutrition.density
        );
        
        // Calculate brand serving size in grams
        const brandServingGrams = this._toGrams(
            nutrition.brandServingAmount,
            nutrition.brandServingUnit,
            nutrition.density
        );
        
        // Ingredient scaling: how many brand servings are in this ingredient amount
        const ingredientServingFactor = ingredientRecipeGrams / brandServingGrams;
        
        // Total scaling: ingredient serving factor * menu scaling factor
        const totalServingFactor = ingredientServingFactor * menuScalingFactor;
        
        const data = {
            oxalateMg: (nutrition.oxalate_per_gram ? nutrition.oxalate_per_gram * ingredientRecipeGrams * menuScalingFactor : 0),
            calories: safeVal(nutrition.calories, totalServingFactor),
            sodium: safeVal(nutrition.sodium, totalServingFactor),
            cholesterol: safeVal(nutrition.cholesterol, totalServingFactor),
            sugars: safeVal(nutrition.sugars, totalServingFactor),
            protein: safeVal(nutrition.protein, totalServingFactor),
            dietary_fiber: safeVal(nutrition.dietary_fiber, totalServingFactor),
            carbohydrates: safeVal(nutrition.carbohydrates, totalServingFactor),
            calcium: safeVal(nutrition.calcium, totalServingFactor),
            potassium: safeVal(nutrition.potassium, totalServingFactor),
            magnesium: safeVal(nutrition.magnesium, totalServingFactor),
            selenium: safeVal(nutrition.selenium, totalServingFactor),
            manganese: safeVal(nutrition.manganese, totalServingFactor),
            zinc: safeVal(nutrition.zinc, totalServingFactor),
            iron: safeVal(nutrition.iron, totalServingFactor),
            fat: safeVal(nutrition.fat, totalServingFactor),
            saturated_fat: safeVal(nutrition.saturated_fat, totalServingFactor),
            polyunsaturated_fat: safeVal(nutrition.polyunsaturated_fat, totalServingFactor),
            monosaturated_fat: safeVal(nutrition.monosaturated_fat, totalServingFactor),
            thiamin: safeVal(nutrition.thiamin, totalServingFactor),
            riboflavin: safeVal(nutrition.riboflavin, totalServingFactor),
            niacin: safeVal(nutrition.niacin, totalServingFactor),
            folic_acid: safeVal(nutrition.folic_acid, totalServingFactor),
            phosphorous: safeVal(nutrition.phosphorous, totalServingFactor),
            vitamin_a: safeVal(nutrition.vitamin_a, totalServingFactor),
            vitamin_b6: safeVal(nutrition.vitamin_b6, totalServingFactor),
            vitamin_c: safeVal(nutrition.vitamin_c, totalServingFactor),
            vitamin_d: safeVal(nutrition.vitamin_d, totalServingFactor),
            vitamin_e: safeVal(nutrition.vitamin_e, totalServingFactor),
            vitamin_k: safeVal(nutrition.vitamin_k, totalServingFactor),
        };
        return data;
    }

    /**
     * Converts liquid to grams.
     * @param {number} amount The amount
     * @param {string} unit Either g or ml
     * @param {number} density Required if unit is in ml
     * @returns {number} Number of grams
     */
    _toGrams(amount, unit, density) {
        if (unit == "g") {
            return amount
        } else if (unit == "ml") {
            if (!density) {
                throw Error(`Liquid density required for unit ml`)
            }
            return amount * density
        } else {
            throw Error(`Conversion not supported for unit: ${unit}`)
        }
    }

    /**
     * Returns the menus for the plan.
     * See "Daily Plan API Endpoints.md".
     * @param {number} planId The plan id
     * @param {string} userId The user id
     * @returns {object} The data structure
     */
    async _getDetails1(planId, userId) {
        let sql = `
        select plan.id as id, plan.user_id as userId, plan.name as dailyPlanName,
        dpmenus.menu_id as menuId, dpmenus.type
        FROM daily_plans plan
        inner join daily_plan_menus dpmenus
        on dpMenus.daily_plan_id = plan.id
        and plan.user_id = ?
        and plan.id = ?
        order by dpmenus.item_order;
        `
        let params = [];

        if (userId) {
            params.push(userId)
        } else {
            // throw Error(`Missing userId`)
        }
        if (planId) {
            params.push(planId)
        } else {
            throw Error("Missing planId")
        }
        const results = await database.all(sql, params)

        if (!results.length) {
            throw Error(`No such planId ${planId}`)
        }

        const data = {
            id: planId,
            userId,
            dailyPlanName: results[0].dailyPlanName,
            menus: results.map(i => {
                return {
                    menuId: i.menuId,
                    type: i.type
                }
            })
        };

        return data
    }

    async create(request, userId) {
        await database.beginTransaction()
        try {
            const result = await database.run(`
                INSERT INTO daily_plans (user_id, name)
                VALUES (?, ?)
            `, [userId, request.name])
            const planId = result.lastID

            let itemOrder = 1
            for (const menu of request.dailyPlanMenus) {
                await database.run(`
                    INSERT INTO daily_plan_menus (daily_plan_id, menu_id, type, item_order)
                    VALUES (?, ?, ?, ?)
                `, [planId, menu.menuId, menu.type, itemOrder++])
            }

            await database.commit()
            return this.get({ planId, userId });
        } catch (error) {
            await database.rollback()
            throw error
        }
    }

    _formatPlans(results) {
        const plans = {}
        for (const item of results) {
            if (plans[item.id]) {
                plans[item.id].dailyPlanMenus.push({ menuId: item.menu_id, type: item.type })
            } else {
                plans[item.id] = { id: item.id, userId: item.user_id, name: item.name, dailyPlanMenus: [{ menuId: item.menu_id, type: item.type }] };
            }
        }
        return Object.values(plans)
    }


}

export default new DailyPlanRepository()