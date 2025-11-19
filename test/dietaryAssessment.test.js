// test/dietaryAssessment.test.js

import { DietaryAssessmentService } from '../lib/services/DietaryAssessmentServices.js';

describe('Dietary Assessment Calculator', () => {
  let calculator;

  beforeEach(() => {
    calculator = new DietaryAssessmentCalculator();
  });

  test('should calculate Good DASH adherence', () => {
    const totals = {
      calories: 850,
      sodium: 400,
      saturated_fat: 10,
      sugars: 20,
      potassium: 1500,
      dietary_fiber: 10,
      protein: 40
    };

    const userSettings = {
      caloriesPerDay: 2000,
      kidneyStoneRisk: 'Normal'
    };

    const kidneyStoneRiskData = {
      Normal: { maxOxalatesPerDay: 200 }
    };

    const result = calculator.calculate(
      totals,
      67.3,
      'menu',
      userSettings,
      kidneyStoneRiskData
    );

    expect(result.dashAdherence).toBe('Good');
    expect(result.oxalateLevel).toBe('Moderate');
    expect(result.oxalateRisk.status).toBe('safe');
    expect(result.nutritionScore).toBeGreaterThan(70);
  });

  test('should handle oxalate warning', () => {
    const totals = { calories: 850, sodium: 200, saturated_fat: 5 };
    const userSettings = { caloriesPerDay: 2000, kidneyStoneRisk: 'Normal' };
    const kidneyStoneRiskData = { Normal: { maxOxalatesPerDay: 200 } };

    const result = calculator.calculate(totals, 150, 'menu', userSettings, kidneyStoneRiskData);

    expect(result.oxalateRisk.status).toBe('warning');
    expect(result.recommendations).toContain(
      'Consider substituting high-oxalate ingredients with lower-oxalate alternatives'
    );
  });
});