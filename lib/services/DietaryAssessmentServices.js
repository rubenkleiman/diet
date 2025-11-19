/**
 * Dietary Assessment Calculator
 * Calculates DASH adherence and nutritional assessment for recipes, menus, and daily plans
 */

class DietaryAssessmentServices {
  constructor() {
    // DASH Guidelines Configuration
    // Different thresholds for daily plans vs individual menus
    this.DASH_GUIDELINES = {
      daily_plan: {
        sodium: { excellent: 1500, good: 2300, max: 3000 },
        saturated_fat_percent: { good: 6, moderate: 10 },
        sugar_percent: { good: 5, moderate: 10 },
        potassium: { excellent: 3500, good: 2500, moderate: 1500 },
        fiber: { excellent: 25, good: 15, moderate: 10 },
        protein_percent: { min: 15, max: 25, optimal_min: 15, optimal_max: 25 }
      },
      menu: {
        sodium: { excellent: 500, good: 800, max: 1200 },
        saturated_fat_percent: { good: 6, moderate: 10 },
        sugar_percent: { good: 5, moderate: 10 },
        potassium: { excellent: 1500, good: 1000, moderate: 500 },
        fiber: { excellent: 10, good: 8, moderate: 5 },
        protein_percent: { min: 15, max: 25, optimal_min: 15, optimal_max: 25 }
      },
      recipe: {
        // Recipe uses menu guidelines (one meal portion)
        sodium: { excellent: 500, good: 800, max: 1200 },
        saturated_fat_percent: { good: 6, moderate: 10 },
        sugar_percent: { good: 5, moderate: 10 },
        potassium: { excellent: 1500, good: 1000, moderate: 500 },
        fiber: { excellent: 10, good: 8, moderate: 5 },
        protein_percent: { min: 15, max: 25, optimal_min: 15, optimal_max: 25 }
      }
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
    const guidelines = this.DASH_GUIDELINES[assessmentType];
    const reasons = [];
    let goodCount = 0;
    let poorCount = 0;
    const breakdown = {};

    const totalCalories = totals.calories || 0;

    // 1. Sodium
    const sodium = totals.sodium || 0;
    if (sodium < guidelines.sodium.excellent) {
      reasons.push('excellent sodium ✓✓');
      goodCount += 2;
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
      poorCount++;
      breakdown.sodium = { value: sodium, assessment: 'poor', target: guidelines.sodium.good };
    }

    // 2. Saturated Fat
    const saturatedFat = totals.saturated_fat || 0;
    const saturatedFatCalories = saturatedFat * 9; // 9 cal per gram
    const saturatedFatPercent = totalCalories > 0 ? (saturatedFatCalories / totalCalories * 100) : 0;
    
    if (saturatedFatPercent < guidelines.saturated_fat_percent.good) {
      reasons.push('low saturated fat ✓');
      goodCount++;
      breakdown.saturatedFat = { value: saturatedFat, caloriePercent: saturatedFatPercent, assessment: 'good', target: guidelines.saturated_fat_percent.good };
    } else if (saturatedFatPercent < guidelines.saturated_fat_percent.moderate) {
      reasons.push('moderate saturated fat ⚠');
      breakdown.saturatedFat = { value: saturatedFat, caloriePercent: saturatedFatPercent, assessment: 'moderate', target: guidelines.saturated_fat_percent.good };
    } else {
      reasons.push('high saturated fat ✗');
      poorCount++;
      breakdown.saturatedFat = { value: saturatedFat, caloriePercent: saturatedFatPercent, assessment: 'poor', target: guidelines.saturated_fat_percent.good };
    }

    // 3. Sugars
    const sugars = totals.sugars || 0;
    const sugarCalories = sugars * 4; // 4 cal per gram
    const sugarPercent = totalCalories > 0 ? (sugarCalories / totalCalories * 100) : 0;
    
    if (sugarPercent < guidelines.sugar_percent.good) {
      reasons.push('low sugar ✓');
      goodCount++;
      breakdown.sugar = { value: sugars, caloriePercent: sugarPercent, assessment: 'good', target: guidelines.sugar_percent.good };
    } else if (sugarPercent <= guidelines.sugar_percent.moderate) {
      reasons.push(`moderate sugar (${sugarPercent.toFixed(0)}% of calories) ⚠`);
      breakdown.sugar = { value: sugars, caloriePercent: sugarPercent, assessment: 'moderate', target: guidelines.sugar_percent.good };
    } else {
      reasons.push(`high sugar (${sugarPercent.toFixed(0)}% > ${guidelines.sugar_percent.moderate}% calories WHO) ⚠`);
      poorCount++;
      breakdown.sugar = { value: sugars, caloriePercent: sugarPercent, assessment: 'poor', target: guidelines.sugar_percent.moderate };
    }

    // 4. Potassium
    const potassium = totals.potassium || 0;
    if (potassium >= guidelines.potassium.excellent) {
      reasons.push('excellent potassium ✓✓');
      goodCount += 2;
      breakdown.potassium = { value: potassium, assessment: 'excellent', target: guidelines.potassium.excellent };
    } else if (potassium >= guidelines.potassium.good) {
      reasons.push('good potassium ✓');
      goodCount++;
      breakdown.potassium = { value: potassium, assessment: 'good', target: guidelines.potassium.good };
    } else if (potassium >= guidelines.potassium.moderate) {
      reasons.push('moderate potassium');
      breakdown.potassium = { value: potassium, assessment: 'moderate', target: guidelines.potassium.good };
    } else {
      reasons.push('low potassium ⚠');
      breakdown.potassium = { value: potassium, assessment: 'low', target: guidelines.potassium.moderate };
    }

    // 5. Fiber
    const fiber = totals.dietary_fiber || 0;
    if (fiber >= guidelines.fiber.excellent) {
      reasons.push('excellent fiber ✓✓');
      goodCount += 2;
      breakdown.fiber = { value: fiber, assessment: 'excellent', target: guidelines.fiber.excellent };
    } else if (fiber >= guidelines.fiber.good) {
      reasons.push('good fiber ✓');
      goodCount++;
      breakdown.fiber = { value: fiber, assessment: 'good', target: guidelines.fiber.good };
    } else if (fiber >= guidelines.fiber.moderate) {
      reasons.push('moderate fiber');
      breakdown.fiber = { value: fiber, assessment: 'moderate', target: guidelines.fiber.good };
    } else {
      reasons.push('low fiber ⚠');
      breakdown.fiber = { value: fiber, assessment: 'low', target: guidelines.fiber.moderate };
    }

    // 6. Protein
    const protein = totals.protein || 0;
    const proteinCalories = protein * 4; // 4 cal per gram
    const proteinPercent = totalCalories > 0 ? (proteinCalories / totalCalories * 100) : 0;
    
    if (proteinPercent >= guidelines.protein_percent.optimal_min && 
        proteinPercent <= guidelines.protein_percent.optimal_max) {
      reasons.push('good protein ✓');
      goodCount++;
      breakdown.protein = { value: protein, caloriePercent: proteinPercent, assessment: 'good', target: `${guidelines.protein_percent.optimal_min}-${guidelines.protein_percent.optimal_max}%` };
    } else if (proteinPercent < guidelines.protein_percent.min) {
      reasons.push('low protein ⚠');
      breakdown.protein = { value: protein, caloriePercent: proteinPercent, assessment: 'low', target: `${guidelines.protein_percent.min}%+` };
    } else if (proteinPercent > guidelines.protein_percent.max) {
      reasons.push('high protein ⚠');
      breakdown.protein = { value: protein, caloriePercent: proteinPercent, assessment: 'high', target: `<${guidelines.protein_percent.max}%` };
    }

    // Determine overall adherence
    let adherence;
    if (poorCount >= 2) {
      adherence = 'Poor';
    } else if (poorCount === 1 || goodCount < 3) {
      adherence = 'Fair';
    } else if (goodCount >= 5) {
      adherence = 'Excellent';
    } else {
      adherence = 'Good';
    }

    return {
      adherence,
      reasons: reasons.join(', '),
      goodCount,
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
    const guidelines = this.DASH_GUIDELINES[assessmentType];
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
    if (breakdown.fiber && (breakdown.fiber.assessment === 'low' || breakdown.fiber.assessment === 'moderate')) {
      const target = assessmentType === 'daily_plan' ? 25 : 8;
      recommendations.push(`Consider adding more fiber-rich foods to reach the ${assessmentType === 'daily_plan' ? 'daily' : 'meal'} goal of ${target}g. Current: ${breakdown.fiber.value.toFixed(1)}g`);
    }

    // Saturated fat recommendations
    if (breakdown.saturatedFat && breakdown.saturatedFat.assessment === 'poor') {
      recommendations.push(`Try reducing saturated fat. Current: ${breakdown.saturatedFat.caloriePercent.toFixed(1)}% of calories, Target: <${breakdown.saturatedFat.target}%`);
    }

    // Sugar recommendations
    if (breakdown.sugar && breakdown.sugar.assessment === 'poor') {
      recommendations.push(`Consider reducing added sugars. Current: ${breakdown.sugar.caloriePercent.toFixed(1)}% of calories, WHO recommends <10%`);
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

    // Good markers (up to +20 points)
    score += Math.min(dashAssessment.goodCount * 2, 20);

    // Poor markers (down to -20 points)
    score -= Math.min(dashAssessment.poorCount * 10, 20);

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