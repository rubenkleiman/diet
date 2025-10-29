export default class DashCalculator {
    /**
     * Calculate DASH adherence based on nutritional content
     * @param {Object} totals - Nutritional totals for recipe
     * @param {number} servings - Number of servings
     * @returns {string} - "Excellent", "Good", "Fair", or "Poor"
     */
    static calculateAdherence(totals, servings = 1) {
        const perServing = {}
        for (const [key, value] of Object.entries(totals)) {
            perServing[key] = value / servings
        }

        let score = 0
        const reasons = []

        // Sodium (per serving) - DASH targets <2300mg/day
        // For a meal, <600mg is excellent, <800 good, <1000 fair
        const sodium = perServing.sodium || 0
        if (sodium < 600) {
            score += 2
            reasons.push("low sodium ✓")
        } else if (sodium < 800) {
            score += 1
            reasons.push("moderate sodium")
        } else if (sodium < 1000) {
            score += 0
            reasons.push("high sodium ⚠")
        } else {
            score -= 1
            reasons.push("very high sodium ✗")
        }

        // Saturated fat - DASH recommends <7% of calories
        // For ~600 cal meal, <5g excellent, <8g good, <12g fair
        const satFat = perServing.saturatedFat || 0
        const calories = perServing.calories || 1
        const satFatPercent = (satFat * 9 / calories) * 100
        if (satFatPercent < 7) {
            score += 2
            reasons.push("low saturated fat ✓")
        } else if (satFatPercent < 10) {
            score += 1
            reasons.push("moderate saturated fat")
        } else {
            score -= 1
            reasons.push("high saturated fat ✗")
        }

        // Protein - DASH emphasizes lean protein
        const protein = perServing.protein || 0
        if (protein >= 15) {
            score += 1
            reasons.push("good protein ✓")
        } else if (protein >= 8) {
            score += 0
        } else {
            score -= 1
            reasons.push("low protein")
        }

        // Calcium - DASH emphasizes calcium-rich foods
        const calcium = perServing.calcium || 0
        if (calcium >= 300) {
            score += 1
            reasons.push("good calcium ✓")
        } else if (calcium >= 150) {
            score += 0
        }

        // Potassium - DASH emphasizes potassium
        const potassium = perServing.potassium || 0
        if (potassium >= 400) {
            score += 1
            reasons.push("good potassium ✓")
        }

        // Added sugars - prefer <10% of calories
        const sugars = perServing.sugars || 0
        const sugarCalories = sugars * 4
        const sugarPercent = (sugarCalories / calories) * 100
        if (sugarPercent > 15) {
            score -= 1
            reasons.push("high sugar ⚠")
        }

        // Fiber - DASH emphasizes fiber
        const fiber = perServing["dietary fiber"] || 0
        if (fiber >= 5) {
            score += 1
            reasons.push("good fiber ✓")
        }

        // Determine rating based on score
        let rating
        if (score >= 5) {
            rating = "Excellent"
        } else if (score >= 3) {
            rating = "Good"
        } else if (score >= 1) {
            rating = "Fair"
        } else {
            rating = "Poor"
        }

        return {
            rating,
            reasons: reasons.join(", ")
        }
    }
}
