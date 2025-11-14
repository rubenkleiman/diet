/**
 * Form Renderer
 * Handles form rendering and selected ingredients display
 */

export class FormRenderer {

  /**
   * Render selected ingredients for recipe editor
   */
  static renderSelectedIngredients(ingredients, onUpdate) {
    const container = document.getElementById('ingredientRows');
    if (!container) return;

    if (ingredients.length === 0) {
      container.innerHTML = '<div class="no-ingredients-message">No ingredients added yet</div>';
      return;
    }

    container.innerHTML = '';

    ingredients.forEach((ingredient, index) => {
      const row = document.createElement('div');
      row.className = 'ingredient-row';
      row.dataset.index = index;

      const amountInput = document.createElement('input');
      amountInput.type = 'number';
      amountInput.className = 'amount-input';
      amountInput.value = ingredient.amount;
      amountInput.min = '0.01';
      amountInput.step = '0.01';
      amountInput.dataset.index = index;

      const unitSelect = document.createElement('select');
      unitSelect.className = 'unit-select';
      unitSelect.dataset.index = index;
      unitSelect.innerHTML = `
        <option value="g" ${ingredient.unit === 'g' ? 'selected' : ''}>g</option>
        <option value="ml" ${ingredient.unit === 'ml' ? 'selected' : ''}>ml</option>
        <option value="mg" ${ingredient.unit === 'mg' ? 'selected' : ''}>mg</option>
        <option value="mcg" ${ingredient.unit === 'mcg' ? 'selected' : ''}>mcg</option>
      `;

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'remove-btn';
      removeBtn.dataset.action = 'remove-ingredient';
      removeBtn.dataset.index = index;
      removeBtn.title = 'Remove ingredient';
      removeBtn.innerHTML = '&times;';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'ingredient-name';
      nameSpan.title = ingredient.name;
      nameSpan.textContent = ingredient.name;

      row.appendChild(nameSpan);
      row.appendChild(amountInput);
      row.appendChild(unitSelect);
      row.appendChild(removeBtn);

      // Add direct event listeners for inputs (not delegation)
      if (onUpdate) {
        amountInput.addEventListener('change', () => {
          onUpdate.amount(index, amountInput.value);
        });

        unitSelect.addEventListener('change', () => {
          onUpdate.unit(index, unitSelect.value);
        });
      }

      container.appendChild(row);
    });
  }

  /**
   * Render ingredient search results
   */
  static renderSearchResults(results, selectedIngredients, onAdd) {
    const resultsContainer = document.getElementById('ingredientSearchResults');
    if (!resultsContainer) return;

    if (results.length === 0) {
      resultsContainer.innerHTML = '<div class="search-result-item">No ingredients found</div>';
      resultsContainer.classList.add('show');
      return;
    }

    resultsContainer.innerHTML = '';

    results.forEach(ingredient => {
      const alreadyAdded = selectedIngredients.some(ing => ing.brandId === ingredient.id);

      const item = document.createElement('div');
      item.className = 'search-result-item';
      if (alreadyAdded) item.classList.add('selected');
      item.textContent = ingredient.name;
      item.dataset.ingredientId = ingredient.id;
      item.dataset.ingredientName = ingredient.name;

      if (!alreadyAdded) {
        item.style.cursor = 'pointer';
        item.dataset.action = 'add-ingredient-to-recipe';
      } else {
        item.style.opacity = '0.5';
        item.style.cursor = 'not-allowed';
        item.title = 'Already added';
      }

      resultsContainer.appendChild(item);
    });

    // Add click handler
    resultsContainer.addEventListener('click', (e) => {
      const item = e.target.closest('[data-action="add-ingredient-to-recipe"]');
      if (item && onAdd) {
        onAdd({
          id: item.dataset.ingredientId,
          name: item.dataset.ingredientName
        });
      }
    });

    resultsContainer.classList.add('show');
  }

  /**
   * Hide ingredient search results
   */
  static hideSearchResults() {
    const resultsContainer = document.getElementById('ingredientSearchResults');
    if (resultsContainer) {
      resultsContainer.classList.remove('show');
    }
  }

  /**
   * Show error message
   */
  static showError(elementId, message) {
    const errorEl = document.getElementById(elementId);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('show');
    }
  }

  /**
   * Clear all error messages
   */
  static clearErrors() {
    document.querySelectorAll('.error-text').forEach(el => {
      el.textContent = '';
      el.classList.remove('show');
    });
  }

  /**
   * Open recipe editor panel
   */
  static openRecipeEditor() {
    const panel = document.getElementById('recipeEditPanel');
    if (panel) {
      panel.classList.add('active');
    }
  }

  /**
   * Close recipe editor panel
   */
  static closeRecipeEditor() {
    const panel = document.getElementById('recipeEditPanel');
    if (panel) {
      panel.classList.remove('active');
    }
  }

  /**
   * Open ingredient editor panel
   */
  static openIngredientEditor() {
    const panel = document.getElementById('ingredientEditPanel');
    if (panel) {
      panel.classList.add('active');
    }
  }

  /**
   * Close ingredient editor panel
   */
  static closeIngredientEditor() {
    const panel = document.getElementById('ingredientEditPanel');
    if (panel) {
      panel.classList.remove('active');
    }
  }

  /**
   * Set recipe editor title
   */
  static setRecipeEditorTitle(title) {
    const titleEl = document.getElementById('editPanelTitle');
    if (titleEl) {
      titleEl.textContent = title;
    }
  }

  /**
   * Set ingredient editor title
   */
  static setIngredientEditorTitle(title) {
    const titleEl = document.getElementById('ingredientEditPanelTitle');
    if (titleEl) {
      titleEl.textContent = title;
    }
  }

  /**
   * Clear recipe form
   */
  static clearRecipeForm() {
    const nameInput = document.getElementById('recipeNameInput');
    const searchBox = document.getElementById('ingredientSearchBox');

    if (nameInput) nameInput.value = '';
    if (searchBox) searchBox.value = '';
  }

  /**
   * Clear ingredient form
   */
  static clearIngredientForm() {
    const fieldIds = [
      'ingredientNameInput', 'servingSizeInput', 'densityInput', 'oxalateInput',
      'caloriesInput', 'sodiumInput', 'cholesterolInput', 'sugarsInput',
      'proteinInput', 'dietaryFiberInput', 'carbohydratesInput', 'calciumInput',
      'potassiumInput', 'magnesiumInput', 'seleniumInput', 'manganeseInput',
      'zincInput', 'ironInput', 'fatInput', 'saturatedFatInput',
      'polysaturatedFatInput', 'monosaturatedFatInput', 'thiaminInput',
      'riboflavinInput', 'niacinInput', 'folicAcidInput', 'phosphorusInput',
      'vitaminAInput', 'vitaminB6Input', 'vitaminCInput', 'vitaminDInput',
      'vitaminEInput', 'vitaminKInput'
    ];

    fieldIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    const servingUnitSelect = document.getElementById('servingUnitSelect');
    if (servingUnitSelect) servingUnitSelect.value = 'g';
  }

  /**
   * Populate ingredient form with data
   */
  static populateIngredientForm(ingredient) {
    document.getElementById('ingredientNameInput').value = ingredient.name;
    document.getElementById('servingSizeInput').value = ingredient.serving;
    document.getElementById('servingUnitSelect').value = ingredient.servingUnit;
    document.getElementById('densityInput').value = ingredient.density || '';
    document.getElementById('oxalateInput').value = ingredient.oxalatePerGram || '';

    const fieldMapping = {
      caloriesInput: 'calories',
      sodiumInput: 'sodium',
      cholesterolInput: 'cholesterol',
      sugarsInput: 'sugars',
      proteinInput: 'protein',
      dietaryFiberInput: 'dietary_fiber',
      carbohydratesInput: 'carbohydrates',
      calciumInput: 'calcium',
      potassiumInput: 'potassium',
      magnesiumInput: 'magnesium',
      seleniumInput: 'selenium',
      manganeseInput: 'manganese',
      zincInput: 'zinc',
      ironInput: 'iron',
      fatInput: 'fat',
      saturatedFatInput: 'saturated_fat',
      polysaturatedFatInput: 'polysaturated_fat',
      monosaturatedFatInput: 'monosaturated_fat',
      thiaminInput: 'thiamin',
      riboflavinInput: 'riboflavin',
      niacinInput: 'niacin',
      folicAcidInput: 'folic_acid',
      phosphorusInput: 'phosphorus',
      vitaminAInput: 'vitamin_a',
      vitaminB6Input: 'vitamin_b6',
      vitaminCInput: 'vitamin_c',
      vitaminDInput: 'vitamin_d',
      vitaminEInput: 'vitamin_e',
      vitaminKInput: 'vitamin_k'
    };

    for (const [inputId, dataKey] of Object.entries(fieldMapping)) {
      const el = document.getElementById(inputId);
      if (el) {
        el.value = ingredient.data[dataKey] || '';
      }
    }
  }

  /**
   * Open daily plan editor panel
   */
  static openDailyPlanEditor() {
    const panel = document.getElementById('dailyPlanEditPanel');
    if (panel) {
      panel.classList.add('active');
    }
  }

  /**
   * Close daily plan editor panel
   */
  static closeDailyPlanEditor() {
    const panel = document.getElementById('dailyPlanEditPanel');
    if (panel) {
      panel.classList.remove('active');
    }
  }

  /**
   * Set daily plan editor title
   */
  static setDailyPlanEditorTitle(title) {
    const titleEl = document.getElementById('dailyPlanEditPanelTitle');
    if (titleEl) {
      titleEl.textContent = title;
    }
  }

  /**
   * Clear daily plan form
   */
  static clearDailyPlanForm() {
    const nameInput = document.getElementById('dailyPlanNameInput');
    const searchBox = document.getElementById('menuSearchBoxForDailyPlan');

    if (nameInput) nameInput.value = '';
    if (searchBox) searchBox.value = '';
  }

  /**
   * Open menu editor panel
   */
  static openMenuEditor() {
    const panel = document.getElementById('menuEditPanel');
    if (panel) {
      panel.classList.add('active');
    }
  }

  /**
   * Close menu editor panel
   */
  static closeMenuEditor() {
    const panel = document.getElementById('menuEditPanel');
    if (panel) {
      panel.classList.remove('active');
    }
  }

  /**
   * Set menu editor title
   */
  static setMenuEditorTitle(title) {
    const titleEl = document.getElementById('menuEditPanelTitle');
    if (titleEl) {
      titleEl.textContent = title;
    }
  }

  /**
   * Clear menu form
   */
  static clearMenuForm() {
    const nameInput = document.getElementById('menuNameInput');
    const searchBox = document.getElementById('recipeSearchBox');

    if (nameInput) nameInput.value = '';
    if (searchBox) searchBox.value = '';
  }
}
