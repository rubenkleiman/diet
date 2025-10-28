import fs from 'fs'
import Brand from "./Brand.js"

export class BrandsClass {
    static units = ["g", "mg", "mcg", "ml"];

    constructor() {
        const brands = JSON.parse(fs.readFileSync(`${import.meta.dirname}/data/brands.json`, "utf8"))
        this.list = Object.keys(brands).map(k => {
            const info = brands[k]
            return new Brand(k, info.serving, info.density, info.data)
        })
    }

    find(name) {
        const brand = this.list.find(b => b.name == name)
        if (!brand) {
            console.error(`Recipe ${recipeName} ingredient "${name} not in brands.json`)
        }
        return brand
    }
}

export const Brands = new BrandsClass()