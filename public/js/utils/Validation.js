/**
 * Validation Utilities
 * Form validation helpers
 */

/**
 * Validate recipe data
 */
export function validateRecipe(recipeName, ingredients) {
  const errors = [];

  if (!recipeName || recipeName.trim().length === 0) {
    errors.push({ field: 'recipeNameError', message: 'Recipe name is required' });
  }

  if (!ingredients || ingredients.length === 0) {
    errors.push({ field: 'ingredientsError', message: 'At least one ingredient is required' });
  }

  if (ingredients) {
    for (const ing of ingredients) {
      if (!ing.amount || ing.amount <= 0) {
        errors.push({ field: 'ingredientsError', message: 'All ingredients must have valid amounts' });
        break;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate ingredient data
 */
export function validateIngredient(name, serving) {
  const errors = [];

  if (!name || name.trim().length === 0) {
    errors.push({ field: 'ingredientNameError', message: 'Ingredient name is required' });
  }

  if (!serving || serving <= 0) {
    errors.push({ field: 'ingredientNameError', message: 'Valid serving size is required' });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate settings data
 */
export function validateSettings(caloriesPerDay, useAge, age) {
  const errors = [];

  if (!caloriesPerDay || caloriesPerDay < 300 || caloriesPerDay > 5000) {
    errors.push({ field: 'caloriesPerDay', message: 'Calories must be between 300 and 5000' });
  }

  if (useAge && (!age || age < 6 || age > 100)) {
    errors.push({ field: 'age', message: 'Age must be between 6 and 100' });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
