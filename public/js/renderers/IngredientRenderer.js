/**
 * Ingredient Renderer
 * Handles all ingredient-related UI rendering
 */

import { ListRenderer } from '../utils/ListRenderer.js';

export class IngredientRenderer {

  /**
   * Render ingredient list (using ListRenderer helper)
   */
  static renderList(ingredients, onSelect) {
    ListRenderer.render({
      items: ingredients,
      containerId: 'ingredientList',
      itemClass: 'ingredient-item',
      dataAttribute: 'ingredientId',
      action: 'select-ingredient',
      renderItem: (ingredient) => `
        <span class="ingredient-name">${ingredient.name}</span>
        <span class="ingredient-compact">${ingredient.compact.display}</span>
      `,
      emptyMessage: 'No ingredients found'
    });
  }
  
  /**
   * Mark ingredient as selected (using ListRenderer helper)
   */
  static markAsSelected(ingredientId) {
    ListRenderer.markAsSelected('ingredient-item', 'ingredientId', ingredientId);
    
    // Also mark the compact display
    const selectedItem = document.querySelector(`[data-ingredient-id="${ingredientId}"]`);
    if (selectedItem) {
      const compactItem = selectedItem.querySelector('.ingredient-compact');
      if (compactItem) {
        compactItem.classList.add('selected');
      }
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
