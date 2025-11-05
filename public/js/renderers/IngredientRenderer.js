/**
 * Ingredient Renderer
 * Handles all ingredient-related UI rendering
 */

export class IngredientRenderer {
  
  /**
   * Render ingredient list
   */
  static renderList(ingredients, onSelect) {
    const listElement = document.getElementById('ingredientList');
    if (!listElement) return;

    listElement.innerHTML = '';

    if (ingredients.length === 0) {
      listElement.innerHTML = '<li class="no-results">No ingredients found</li>';
      return;
    }

    ingredients.forEach(ingredient => {
      const li = document.createElement('li');
      li.className = 'ingredient-item';
      li.dataset.ingredientId = ingredient.id;
      li.dataset.action = 'select-ingredient';
      li.innerHTML = `
        <span class="ingredient-name">${ingredient.name}</span>
        <span class="ingredient-compact">${ingredient.compact.display}</span>
      `;

      listElement.appendChild(li);
    });

    // Add click handler using event delegation
    listElement.addEventListener('click', (e) => {
      const item = e.target.closest('[data-action="select-ingredient"]');
      if (item && onSelect) {
        onSelect(item.dataset.ingredientId);
      }
    });
  }

  /**
   * Mark ingredient as selected
   */
  static markAsSelected(ingredientId, ingredients) {
    document.querySelectorAll('.ingredient-item').forEach(item => {
      item.classList.remove('selected');
    });

    const index = ingredients.findIndex(i => i.id === ingredientId);
    const selectedItem = document.querySelector(`.ingredient-item:nth-child(${index + 1})`);
    if (selectedItem) {
      selectedItem.classList.add('selected');
    }
  }

  /**
   * Render ingredient details
   */
  static renderDetails(data) {
    const section = document.getElementById('ingredientDetailsSection');
    const title = document.getElementById('ingredientDetailsTitle');
    const content = document.getElementById('ingredientDetailsContent');

    if (!section || !title || !content) return;

    title.textContent = data.name;

    let html = '<div class="details-content">';

    // Basic info
    html += '<div class="details-section">';
    html += `<p><strong>Serving Size:</strong> ${data.serving} (${data.gramsPerServing.toFixed(1)}g)</p>`;
    if (data.density) {
      html += `<p><strong>Density:</strong> ${data.density} g/ml</p>`;
    }
    html += '</div>';

    // Nutritional information
    html += '<div class="details-section">';
    html += '<h3>Nutritional Information (per serving)</h3>';
    html += '<table class="nutrition-table">';

    for (const [key, value] of Object.entries(data.data)) {
      if (value === null || value === undefined) continue;

      let displayValue = value;
      if (key === 'calories') {
        displayValue = value;
      } else if (typeof value === 'string') {
        displayValue = value;
      } else {
        displayValue = `${value} mg`;
      }

      html += `<tr><td class="nutrient-name">${key.replace(/_/g, ' ')}</td><td class="nutrient-value">${displayValue}</td></tr>`;
    }

    html += `<tr><td class="nutrient-name">oxalate (per gram)</td><td class="nutrient-value">${data.oxalatePerGram.toFixed(3)} mg/g</td></tr>`;
    html += `<tr><td class="nutrient-name">oxalate (per serving)</td><td class="nutrient-value">${data.oxalatePerServing.toFixed(2)} mg</td></tr>`;
    html += '</table>';
    html += '</div>';

    html += '</div>';
    content.innerHTML = html;
    section.style.display = 'block';
  }
}
