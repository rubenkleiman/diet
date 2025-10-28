import Converter from "./Converter.js";
import { Recipes } from "./Recipes.js";
import { Brands } from "./Brands.js";
import Validator from "./Validator.js";

class MakeMenu {
    constructor() {
        new Validator().validate()
    }

    static summaryFields = ["calories", "sodium", "cholesterol", "oxalates", "protein", "calcium", "phosphate", "cholesterol"]

    /**
     * Prints recipe information to the console.
     * @param {string} recipeName Name of recipe
     * @param {boolean} summary If true, only summary information is printed 
     * concerning adherence to guidelines.
     */
    printRecipe(recipeName, summary) {
        const recipe = Recipes.find(recipeName)
        if (!recipe) {
            console.error(`Recipe '${recipeName} not in recipes.json`)
        }
        console.log(recipe)
        const canonicalData = {}
        const ingredients = recipe.getIngredients();
        for (const { name, amount, unit } of ingredients) {
            const brand = Brands.find(name)
            const gramsServing = Converter.toGrams(brand.serving, brand.density)

            // console.log(brand, gramsServing)
        }
    }
}

new MakeMenu().printRecipe("Granola With Milk")