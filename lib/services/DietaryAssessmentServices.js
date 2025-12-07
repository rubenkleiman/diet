/**
 * Dietary Assessment Calculator
 * Calculates DASH adherence and nutritional assessment for recipes, menus, and daily plans
 */

class DietaryAssessmentServices {
  constructor() {
    // DASH Guidelines Configuration
    // Single set of guidelines used for all assessment types (daily plans, menus, recipes)
    this.DASH_GUIDELINES = {
      sodium: { excellent: 1500, good: 2300, max: 3000 },
      saturated_fat_percent: { max: 6 }, // ≤ 6% of total calories (≤13g for 2000 cal diet)
      fat_percent: { max: 27 }, // ≤ 27% of total calories (≤60g for 2000 cal diet)
      sugar_percent: { excellent: 5, good: 10 }, // ≤5% excellent, ≤10% good
      potassium: { excellent: 4700, good: 4000, moderate: 3500 },
      fiber: { min: 25 }, // minimum 25g/day
      protein_percent: { min: 15, max: 35 }, // 15-35% of calories
      cholesterol: { max: 150 }, // ≤150 mg/day
      calcium: { min: 1250 }, // minimum 1250 mg/day
      magnesium: { min: 500 }, // minimum 500 mg/day
      carbohydrates_percent: { excellent: 55, good: 60, moderate: 65 } // ≤55% excellent
    };

    // Calories per gram for macronutrients
    this.CALORIES_PER_GRAM = {
      carbohydrates: 4,
      protein: 4,
      sugar: 4,
      fat: 9
    };

    this.OXALATE_THRESHOLDS = {
      'Low': 50,
      'Moderate': 100,
      'High': 200
    };
  }

  /**
   * Main calculation method
   * 
   * @param {Object} totals - Nutritional totals { calories, sodium, saturated_fat, sugars, potassium, dietary_fiber, protein, ... }
   * @param {number} oxalateMg - Total oxalate content in mg
   * @param {string} assessmentType - 'daily_plan', 'menu', or 'recipe'
   * @param {Object} userSettings - { caloriesPerDay, kidneyStoneRisk }
   * @param {Object} kidneyStoneRiskData - { Normal: { maxOxalatesPerDay: 200, ... }, High: {...}, ... }
   * @returns {Object} Complete dietary assessment
   */
  get(totals, oxalateMg, assessmentType, userSettings, kidneyStoneRiskData) {
    // Validate inputs
    if (!totals || typeof totals !== 'object') {
      throw new Error('totals must be an object');
    }
    if (typeof oxalateMg !== 'number' || oxalateMg < 0) {
      throw new Error('oxalateMg must be a non-negative number');
    }
    if (!['daily_plan', 'menu', 'recipe'].includes(assessmentType)) {
      throw new Error('assessmentType must be daily_plan, menu, or recipe');
    }
    if (!userSettings || !userSettings.caloriesPerDay || !userSettings.kidneyStoneRisk) {
      throw new Error('userSettings must include caloriesPerDay and kidneyStoneRisk');
    }
    if (!kidneyStoneRiskData || !kidneyStoneRiskData[userSettings.kidneyStoneRisk]) {
      throw new Error('kidneyStoneRiskData must include the user\'s kidney stone risk level');
    }

    // Calculate DASH adherence
    const dashAssessment = this.calculateDashAdherence(
      totals,
      assessmentType,
      userSettings
    );

    // Calculate oxalate level
    const oxalateLevel = this.calculateOxalateLevel(oxalateMg);

    // Calculate oxalate risk
    const kidneyRiskData = kidneyStoneRiskData[userSettings.kidneyStoneRisk];
    const oxalateRisk = this.calculateOxalateRisk(
      oxalateMg,
      kidneyRiskData.maxOxalatesPerDay
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      totals,
      oxalateMg,
      assessmentType,
      userSettings,
      dashAssessment,
      oxalateRisk
    );

    // Calculate nutrition score (0-100)
    const nutritionScore = this.calculateNutritionScore(
      dashAssessment,
      oxalateRisk
    );

    return {
      dashAdherence: dashAssessment.adherence,
      dashReasons: dashAssessment.reasons,
      oxalateLevel: oxalateLevel,
      oxalateRisk: oxalateRisk,
      recommendations: recommendations,
      nutritionScore: nutritionScore,
      breakdown: dashAssessment.breakdown
    };
  }

  /**
   * Calculate DASH adherence
   * 
   * @param {Object} totals - Nutritional totals
   * @param {string} assessmentType - Type of assessment
   * @param {Object} userSettings - User settings
   * @returns {Object} { adherence, reasons, breakdown }
   */
  calculateDashAdherence(totals, assessmentType, userSettings) {
    const guidelines = this.DASH_GUIDELINES;
    const reasons = [];
    let goodCount = 0;
    let excellentCount = 0;
    let poorCount = 0;
    const breakdown = {};

    const totalCalories = totals.calories || 0;

    // 1. Sodium (KEY NUTRIENT - weighted 2x)
    const sodium = totals.sodium || 0;
    if (sodium < guidelines.sodium.excellent) {
      reasons.push('excellent sodium ✓✓');
      excellentCount++;
      goodCount += 2; // Weighted
      breakdown.sodium = { value: sodium, assessment: 'excellent', target: guidelines.sodium.excellent };
    } else if (sodium < guidelines.sodium.good) {
      reasons.push('low sodium ✓');
      goodCount++;
      breakdown.sodium = { value: sodium, assessment: 'good', target: guidelines.sodium.good };
    } else if (sodium < guidelines.sodium.max) {
      reasons.push('moderate sodium ⚠');
      breakdown.sodium = { value: sodium, assessment: 'moderate', target: guidelines.sodium.good };
    } else {
      reasons.push('high sodium ✗');
      poorCount += 2; // Weighted
      breakdown.sodium = { value: sodium, assessment: 'poor', target: guidelines.sodium.good };
    }

    // 2. Saturated Fat (KEY NUTRIENT - weighted 2x)
    const saturatedFat = totals.saturated_fat || 0;
    const saturatedFatCalories = saturatedFat * this.CALORIES_PER_GRAM.fat;
    const saturatedFatPercent = totalCalories > 0 ? (saturatedFatCalories / totalCalories * 100) : 0;

    if (saturatedFatPercent <= guidelines.saturated_fat_percent.max) {
      reasons.push('low saturated fat ✓');
      goodCount += 2; // Weighted
      breakdown.saturatedFat = { value: saturatedFat, caloriePercent: saturatedFatPercent, assessment: 'good', target: guidelines.saturated_fat_percent.max };
    } else {
      reasons.push(`high saturated fat (${saturatedFatPercent.toFixed(1)}% > ${guidelines.saturated_fat_percent.max}%) ✗`);
      poorCount += 2; // Weighted
      breakdown.saturatedFat = { value: saturatedFat, caloriePercent: saturatedFatPercent, assessment: 'poor', target: guidelines.saturated_fat_percent.max };
    }

    // 3. Total Fat (KEY NUTRIENT - weighted 2x)
    const totalFat = totals.fat || 0;
    const totalFatCalories = totalFat * this.CALORIES_PER_GRAM.fat;
    const totalFatPercent = totalCalories > 0 ? (totalFatCalories / totalCalories * 100) : 0;

    if (totalFatPercent <= guidelines.fat_percent.max) {
      reasons.push('good total fat ✓');
      goodCount += 2; // Weighted
      breakdown.totalFat = { value: totalFat, caloriePercent: totalFatPercent, assessment: 'good', target: guidelines.fat_percent.max };
    } else {
      reasons.push(`high total fat (${totalFatPercent.toFixed(1)}% > ${guidelines.fat_percent.max}%) ✗`);
      poorCount += 2; // Weighted
      breakdown.totalFat = { value: totalFat, caloriePercent: totalFatPercent, assessment: 'poor', target: guidelines.fat_percent.max };
    }

    // 4. Added Sugars (KEY NUTRIENT - weighted 2x)
    const sugars = totals.sugars || 0;
    const sugarCalories = sugars * this.CALORIES_PER_GRAM.sugar;
    const sugarPercent = totalCalories > 0 ? (sugarCalories / totalCalories * 100) : 0;

    if (sugarPercent <= guidelines.sugar_percent.excellent) {
      reasons.push('excellent sugar ✓✓');
      excellentCount++;
      goodCount += 2; // Weighted
      breakdown.sugar = { value: sugars, caloriePercent: sugarPercent, assessment: 'excellent', target: guidelines.sugar_percent.excellent };
    } else if (sugarPercent <= guidelines.sugar_percent.good) {
      reasons.push('low sugar ✓');
      goodCount += 2; // Weighted
      breakdown.sugar = { value: sugars, caloriePercent: sugarPercent, assessment: 'good', target: guidelines.sugar_percent.good };
    } else {
      reasons.push(`high sugar (${sugarPercent.toFixed(0)}% > ${guidelines.sugar_percent.good}% WHO) ⚠`);
      poorCount += 2; // Weighted
      breakdown.sugar = { value: sugars, caloriePercent: sugarPercent, assessment: 'poor', target: guidelines.sugar_percent.good };
    }

    // 5. Potassium (KEY NUTRIENT - weighted 2x)
    const potassium = totals.potassium || 0;
    if (potassium >= guidelines.potassium.excellent) {
      reasons.push('excellent potassium ✓✓');
      excellentCount++;
      goodCount += 2; // Weighted
      breakdown.potassium = { value: potassium, assessment: 'excellent', target: guidelines.potassium.excellent };
    } else if (potassium >= guidelines.potassium.good) {
      reasons.push('good potassium ✓');
      goodCount += 2; // Weighted
      breakdown.potassium = { value: potassium, assessment: 'good', target: guidelines.potassium.good };
    } else if (potassium >= guidelines.potassium.moderate) {
      reasons.push('moderate potassium');
      breakdown.potassium = { value: potassium, assessment: 'moderate', target: guidelines.potassium.good };
    } else {
      reasons.push('low potassium ⚠');
      poorCount++; // Less critical than being too high
      breakdown.potassium = { value: potassium, assessment: 'low', target: guidelines.potassium.moderate };
    }

    // 6. Fiber (KEY NUTRIENT - weighted 2x)
    const fiber = totals.dietary_fiber || 0;
    if (fiber >= guidelines.fiber.min) {
      reasons.push('good fiber ✓');
      goodCount += 2; // Weighted
      breakdown.fiber = { value: fiber, assessment: 'good', target: guidelines.fiber.min };
    } else {
      reasons.push(`low fiber (${fiber.toFixed(1)}g < ${guidelines.fiber.min}g) ⚠`);
      poorCount++; // Less critical
      breakdown.fiber = { value: fiber, assessment: 'low', target: guidelines.fiber.min };
    }

    // 7. Protein (KEY NUTRIENT - weighted 2x)
    const protein = totals.protein || 0;
    const proteinCalories = protein * this.CALORIES_PER_GRAM.protein;
    const proteinPercent = totalCalories > 0 ? (proteinCalories / totalCalories * 100) : 0;

    if (proteinPercent >= guidelines.protein_percent.min &&
      proteinPercent <= guidelines.protein_percent.max) {
      reasons.push('good protein ✓');
      goodCount += 2; // Weighted
      breakdown.protein = { value: protein, caloriePercent: proteinPercent, assessment: 'good', target: `${guidelines.protein_percent.min}-${guidelines.protein_percent.max}%` };
    } else if (proteinPercent < guidelines.protein_percent.min) {
      reasons.push(`low protein (${proteinPercent.toFixed(1)}% < ${guidelines.protein_percent.min}%) ⚠`);
      poorCount++;
      breakdown.protein = { value: protein, caloriePercent: proteinPercent, assessment: 'low', target: `${guidelines.protein_percent.min}%+` };
    } else {
      reasons.push(`high protein (${proteinPercent.toFixed(1)}% > ${guidelines.protein_percent.max}%) ⚠`);
      breakdown.protein = { value: protein, caloriePercent: proteinPercent, assessment: 'high', target: `<${guidelines.protein_percent.max}%` };
    }

    // 8. Calcium (KEY NUTRIENT - weighted 2x)
    const calcium = totals.calcium || 0;
    if (calcium >= guidelines.calcium.min) {
      reasons.push('good calcium ✓');
      goodCount += 2; // Weighted
      breakdown.calcium = { value: calcium, assessment: 'good', target: guidelines.calcium.min };
    } else {
      reasons.push(`low calcium (${calcium.toFixed(0)}mg < ${guidelines.calcium.min}mg) ⚠`);
      poorCount++;
      breakdown.calcium = { value: calcium, assessment: 'low', target: guidelines.calcium.min };
    }

    // 9. Magnesium (KEY NUTRIENT - weighted 2x)
    const magnesium = totals.magnesium || 0;
    if (magnesium >= guidelines.magnesium.min) {
      reasons.push('good magnesium ✓');
      goodCount += 2; // Weighted
      breakdown.magnesium = { value: magnesium, assessment: 'good', target: guidelines.magnesium.min };
    } else {
      reasons.push(`low magnesium (${magnesium.toFixed(0)}mg < ${guidelines.magnesium.min}mg) ⚠`);
      poorCount++;
      breakdown.magnesium = { value: magnesium, assessment: 'low', target: guidelines.magnesium.min };
    }

    // 10. Cholesterol
    const cholesterol = totals.cholesterol || 0;
    if (cholesterol <= guidelines.cholesterol.max) {
      reasons.push('good cholesterol ✓');
      goodCount++;
      breakdown.cholesterol = { value: cholesterol, assessment: 'good', target: guidelines.cholesterol.max };
    } else {
      reasons.push(`high cholesterol (${cholesterol.toFixed(0)}mg > ${guidelines.cholesterol.max}mg) ⚠`);
      poorCount++;
      breakdown.cholesterol = { value: cholesterol, assessment: 'high', target: guidelines.cholesterol.max };
    }

    // 11. Carbohydrates
    const carbohydrates = totals.carbohydrates || 0;
    const carbCalories = carbohydrates * this.CALORIES_PER_GRAM.carbohydrates;
    const carbPercent = totalCalories > 0 ? (carbCalories / totalCalories * 100) : 0;

    if (carbPercent <= guidelines.carbohydrates_percent.excellent) {
      reasons.push('excellent carbohydrates ✓✓');
      excellentCount++;
      goodCount++;
      breakdown.carbohydrates = { value: carbohydrates, caloriePercent: carbPercent, assessment: 'excellent', target: guidelines.carbohydrates_percent.excellent };
    } else if (carbPercent <= guidelines.carbohydrates_percent.good) {
      reasons.push('good carbohydrates ✓');
      goodCount++;
      breakdown.carbohydrates = { value: carbohydrates, caloriePercent: carbPercent, assessment: 'good', target: guidelines.carbohydrates_percent.good };
    } else if (carbPercent <= guidelines.carbohydrates_percent.moderate) {
      reasons.push('moderate carbohydrates');
      breakdown.carbohydrates = { value: carbohydrates, caloriePercent: carbPercent, assessment: 'moderate', target: guidelines.carbohydrates_percent.good };
    } else {
      reasons.push(`high carbohydrates (${carbPercent.toFixed(1)}% > ${guidelines.carbohydrates_percent.moderate}%) ⚠`);
      breakdown.carbohydrates = { value: carbohydrates, caloriePercent: carbPercent, assessment: 'high', target: guidelines.carbohydrates_percent.moderate };
    }

    // Determine overall adherence based on weighted scoring
    let adherence;
    if (poorCount >= 4) {
      adherence = 'Poor';
    } else if (poorCount >= 2 || goodCount < 8) {
      adherence = 'Fair';
    } else if (excellentCount >= 3 && goodCount >= 12) {
      adherence = 'Excellent';
    } else if (goodCount >= 10) {
      adherence = 'Good';
    } else {
      adherence = 'Fair';
    }

    return {
      adherence,
      reasons: reasons.join(',<br/>'),
      goodCount,
      excellentCount,
      poorCount,
      breakdown
    };
  }

  /**
   * Calculate oxalate level category
   * 
   * @param {number} oxalateMg - Total oxalate in mg
   * @returns {string} 'Low', 'Moderate', 'High', or 'Very High'
   */
  calculateOxalateLevel(oxalateMg) {
    if (oxalateMg < this.OXALATE_THRESHOLDS.Low) {
      return 'Low';
    } else if (oxalateMg < this.OXALATE_THRESHOLDS.Moderate) {
      return 'Moderate';
    } else if (oxalateMg < this.OXALATE_THRESHOLDS.High) {
      return 'High';
    } else {
      return 'Very High';
    }
  }

  /**
   * Calculate oxalate risk assessment
   * 
   * @param {number} oxalateMg - Total oxalate in mg
   * @param {number} maxOxalatesPerDay - User's max oxalate limit
   * @returns {Object} { status, percent, color, message }
   */
  calculateOxalateRisk(oxalateMg, maxOxalatesPerDay) {
    const percent = (oxalateMg / maxOxalatesPerDay) * 100;

    if (percent < 50) {
      return {
        status: 'safe',
        percent: percent,
        color: '#27ae60',
        message: ''
      };
    } else if (percent < 100) {
      return {
        status: 'warning',
        percent: percent,
        color: '#b8860b',
        message: `Approaching your daily oxalate limit (${maxOxalatesPerDay}mg)`
      };
    } else {
      return {
        status: 'danger',
        percent: percent,
        color: '#e74c3c',
        message: `Exceeds your daily oxalate limit (${maxOxalatesPerDay}mg). This contains ${oxalateMg.toFixed(1)}mg oxalates, which is ${(percent - 100).toFixed(0)}% over your limit.`
      };
    }
  }

  /**
   * Generate personalized recommendations
   * 
   * @param {Object} totals - Nutritional totals
   * @param {number} oxalateMg - Total oxalate
   * @param {string} assessmentType - Type of assessment
   * @param {Object} userSettings - User settings
   * @param {Object} dashAssessment - DASH assessment results
   * @param {Object} oxalateRisk - Oxalate risk assessment
   * @returns {Array} Array of recommendation strings
   */
  generateRecommendations(totals, oxalateMg, assessmentType, userSettings, dashAssessment, oxalateRisk) {
    const recommendations = [];
    const guidelines = this.DASH_GUIDELINES;
    const breakdown = dashAssessment.breakdown;

    // Sodium recommendations
    if (breakdown.sodium && breakdown.sodium.assessment === 'excellent') {
      recommendations.push('Your sodium levels are excellent - keep it up!');
    } else if (breakdown.sodium && (breakdown.sodium.assessment === 'poor' || breakdown.sodium.assessment === 'moderate')) {
      recommendations.push(`Consider reducing sodium. Current: ${breakdown.sodium.value.toFixed(0)}mg, Target: <${breakdown.sodium.target}mg`);
    }

    // Potassium recommendations
    if (breakdown.potassium && breakdown.potassium.assessment === 'excellent') {
      recommendations.push('Your potassium levels are excellent - keep it up!');
    } else if (breakdown.potassium && breakdown.potassium.assessment === 'low') {
      recommendations.push(`Consider adding potassium-rich foods like bananas, potatoes, or spinach. Current: ${breakdown.potassium.value.toFixed(0)}mg, Target: >${breakdown.potassium.target}mg`);
    }

    // Fiber recommendations
    if (breakdown.fiber && breakdown.fiber.assessment === 'low') {
      recommendations.push(`Consider adding more fiber-rich foods to reach the daily goal of ${guidelines.fiber.min}g. Current: ${breakdown.fiber.value.toFixed(1)}g`);
    }

    // Saturated fat recommendations
    if (breakdown.saturatedFat && breakdown.saturatedFat.assessment === 'poor') {
      recommendations.push(`Try reducing saturated fat. Current: ${breakdown.saturatedFat.caloriePercent.toFixed(1)}% of calories, Target: ≤${breakdown.saturatedFat.target}%`);
    }

    // Total fat recommendations
    if (breakdown.totalFat && breakdown.totalFat.assessment === 'poor') {
      recommendations.push(`Consider reducing total fat intake. Current: ${breakdown.totalFat.caloriePercent.toFixed(1)}% of calories, Target: ≤${breakdown.totalFat.target}%`);
    }

    // Sugar recommendations
    if (breakdown.sugar && breakdown.sugar.assessment === 'poor') {
      recommendations.push(`Consider reducing added sugars. Current: ${breakdown.sugar.caloriePercent.toFixed(1)}% of calories, Target: ≤${guidelines.sugar_percent.good}%`);
    }

    // Calcium recommendations
    if (breakdown.calcium && breakdown.calcium.assessment === 'low') {
      recommendations.push(`Increase calcium intake through dairy, fortified foods, or leafy greens. Current: ${breakdown.calcium.value.toFixed(0)}mg, Target: ≥${breakdown.calcium.target}mg`);
    }

    // Magnesium recommendations
    if (breakdown.magnesium && breakdown.magnesium.assessment === 'low') {
      recommendations.push(`Add magnesium-rich foods like nuts, seeds, and whole grains. Current: ${breakdown.magnesium.value.toFixed(0)}mg, Target: ≥${breakdown.magnesium.target}mg`);
    }

    // Cholesterol recommendations
    if (breakdown.cholesterol && breakdown.cholesterol.assessment === 'high') {
      recommendations.push(`Consider reducing cholesterol intake. Current: ${breakdown.cholesterol.value.toFixed(0)}mg, Target: ≤${breakdown.cholesterol.target}mg`);
    }

    // Oxalate recommendations
    if (oxalateRisk.status === 'warning') {
      recommendations.push('Consider substituting high-oxalate ingredients with lower-oxalate alternatives');
    } else if (oxalateRisk.status === 'danger') {
      recommendations.push('⚠️ This exceeds your oxalate limit. Consider choosing different ingredients or reducing portion sizes');
    }

    // Overall positive feedback
    if (dashAssessment.adherence === 'Excellent' && oxalateRisk.status === 'safe') {
      recommendations.unshift('🌟 Excellent nutritional balance! This is a great choice for your dietary goals.');
    }

    return recommendations;
  }

  /**
   * Calculate overall nutrition score (0-100)
   * 
   * @param {Object} dashAssessment - DASH assessment results
   * @param {Object} oxalateRisk - Oxalate risk assessment
   * @returns {number} Score from 0-100
   */
  calculateNutritionScore(dashAssessment, oxalateRisk) {
    let score = 50; // Base score

    // DASH adherence contribution (0-40 points)
    const adherenceScores = {
      'Excellent': 40,
      'Good': 30,
      'Fair': 20,
      'Poor': 10
    };
    score += adherenceScores[dashAssessment.adherence] || 0;

    // Good markers (up to +20 points) - weighted scores count more
    score += Math.min(dashAssessment.goodCount * 1.5, 20);

    // Excellent markers bonus
    score += Math.min(dashAssessment.excellentCount * 2, 10);

    // Poor markers (down to -25 points) - weighted penalties
    score -= Math.min(dashAssessment.poorCount * 8, 25);

    // Oxalate risk contribution (0-10 points)
    if (oxalateRisk.status === 'safe') {
      score += 10;
    } else if (oxalateRisk.status === 'warning') {
      score += 5;
    } else {
      score -= 10;
    }

    // Ensure score is within 0-100
    return Math.max(0, Math.min(100, Math.round(score)));
  }
}

export const DietaryAssessmentService = new DietaryAssessmentServices();