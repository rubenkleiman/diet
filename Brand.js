
export default class Brand {
    constructor(name, serving, density, properties) {
        this.name = name
        this.serving = serving
        this.density = density
        this.data = {}
        for (const [name, measure] of Object.entries(properties)) {
            this.data[name] = measure
        }
    }
}