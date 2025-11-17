import database from './Database.js'

class DailyPlanRepository {

    async get(searchTerm, planId, userId) {
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
        } else {
            throw Error("Missing userId");
        }
        if (planId) {
            sql += " and plans.id = ?";
            params.push(planId);
        }
        if (searchTerm) {
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
            return this.get(null, id, userId);
        } catch (error) {
            await database.rollback()
            throw error
        }
    }

    async delete(id, userId) {
        // CASCADE will delete brand_data automatically
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
                ,mr.recipe_id, recipe_items.amount as recipeAmount, recipe_items.unit as recipeUnit
                ,brands.serving as ingredientAmount, brands.serving_unit as ingredientUnit, 
                brands.density, brands.oxalate_per_gram
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
                and menus.id in (${menuIds.map(() => '?').join(',')})
    `
        const results = await database.all(sql, menuIds);

        if (!results.length) {
            return data;
        }

        const menus = data.menus;
        results.forEach(nutrition => {
            const menu = menus.find(m => m.menuId == nutrition.menuId);
            menu.name = nutrition.name;
            const vals = this._nutritionalValues(nutrition)
            if (menu.totals) {
                aggregate(menu.totals, vals);
            } else {
                menu.totals = vals;
            }
        })

        menus.forEach(m => { m.oxalateMg = m.totals.oxalateMg; delete m.totals.oxalateMg; })

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

    _nutritionalValues(nutrition) {
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
                    // return (parseFloat(amt) * servingFactor);
                } else if (typeof value == "number") {
                    return Math.round(value * servingFactor * 10) / 10;
                } else {
                    throw Error(`Invalid nutrition value ${value}`)
                }
            } else {
                return null;
            }
        }
        const recipeAmtInGrams = this._toGrams(nutrition.recipeAmount, nutrition.recipeUnit, nutrition.density);
        const ingredientAmtInGrams = this._toGrams(nutrition.ingredientAmount, nutrition.ingredientUnit, nutrition.density);
        const servingFactor = (recipeAmtInGrams / ingredientAmtInGrams);
        const data = {
            oxalateMg: (nutrition.oxalate_per_gram ? nutrition.oxalate_per_gram * recipeAmtInGrams : 0),
            calories: safeVal(nutrition.calories, servingFactor),
            sodium: safeVal(nutrition.sodium, servingFactor),
            cholesterol: safeVal(nutrition.cholesterol, servingFactor),
            sugars: safeVal(nutrition.sugars, servingFactor),
            protein: safeVal(nutrition.protein, servingFactor),
            dietary_fiber: safeVal(nutrition.dietary_fiber, servingFactor),
            carbohydrates: safeVal(nutrition.carbohydrates, servingFactor),
            calcium: safeVal(nutrition.calcium, servingFactor),
            potassium: safeVal(nutrition.potassium, servingFactor),
            magnesium: safeVal(nutrition.magnesium, servingFactor),
            selenium: safeVal(nutrition.selenium, servingFactor),
            manganese: safeVal(nutrition.manganese, servingFactor),
            zinc: safeVal(nutrition.zinc, servingFactor),
            iron: safeVal(nutrition.iron, servingFactor),
            fat: safeVal(nutrition.fat, servingFactor),
            saturated_fat: safeVal(nutrition.saturated_fat, servingFactor),
            polyunsaturated_fat: safeVal(nutrition.polyunsaturated_fat, servingFactor),
            monosaturated_fat: safeVal(nutrition.monosaturated_fat, servingFactor),
            thiamin: safeVal(nutrition.thiamin, servingFactor),
            riboflavin: safeVal(nutrition.riboflavin, servingFactor),
            niacin: safeVal(nutrition.niacin, servingFactor),
            folic_acid: safeVal(nutrition.folic_acid, servingFactor),
            phosphorous: safeVal(nutrition.phosphorous, servingFactor),
            vitamin_a: safeVal(nutrition.vitamin_a, servingFactor),
            vitamin_b6: safeVal(nutrition.vitamin_b6, servingFactor),
            vitamin_c: safeVal(nutrition.vitamin_c, servingFactor),
            vitamin_d: safeVal(nutrition.vitamin_d, servingFactor),
            vitamin_e: safeVal(nutrition.vitamin_e, servingFactor),
            vitamin_k: safeVal(nutrition.vitamin_k, servingFactor),
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
                throw Error(`Liquid density required. measure: ${measure}`)
            }
            return amount * density
        } else {
            throw Error(`Conversion not supported.`)
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
            throw Error(`Missing userId`)
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
            return this.get(null, planId, userId);
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