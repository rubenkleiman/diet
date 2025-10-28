import fs from 'fs'
import Recipe from "./Recipe.js"

class RecipesClass {
    constructor() {
        const recipes = JSON.parse(fs.readFileSync(`${import.meta.dirname}/data/recipes.json`, "utf8"))
        this._recipes = {}
        for (const name in recipes) {
            this._recipes[name] = new Recipe(name, recipes[name])
        }
    }

    find(name) {
        return this._recipes[name]
    }
}

export const Recipes = new RecipesClass()
