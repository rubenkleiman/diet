/**
 * List Renderer Helper
 * Unified list rendering for all entities
 * Removes duplicate code from RecipeRenderer, MenuRenderer, DailyPlanRenderer, IngredientRenderer
 */

export class ListRenderer {
  /**
   * Render a list of items
   * @param {Object} config - Configuration object
   * @param {Array} config.items - Array of items to render
   * @param {string} config.containerId - ID of container element
   * @param {string} config.itemClass - CSS class for list items
   * @param {string} config.dataAttribute - Data attribute name (e.g., 'recipeId')
   * @param {string} config.action - Data action value (e.g., 'select-recipe')
   * @param {Function} config.renderItem - Function that returns HTML for each item
   * @param {string} config.emptyMessage - Message when list is empty
   * @param {Function} config.sortItems - Optional sort function
   */
  static render(config) {
    const {
      items,
      containerId,
      itemClass,
      dataAttribute,
      action,
      renderItem,
      emptyMessage = 'No items found',
      sortItems = null
    } = config;

    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`Container ${containerId} not found`);
      return;
    }

    container.innerHTML = '';

    if (!items || items.length === 0) {
      container.innerHTML = `<li class="no-results">${emptyMessage}</li>`;
      return;
    }

    // Sort if sort function provided
    const sortedItems = sortItems ? [...items].sort(sortItems) : items;

    sortedItems.forEach(item => {
      const li = document.createElement('li');
      li.className = itemClass;
      li.dataset[dataAttribute] = item.id;
      li.dataset.action = action;
      li.innerHTML = renderItem(item);

      container.appendChild(li);
    });
  }

  /**
   * Mark an item as selected
   * @param {string} itemClass - CSS class of list items
   * @param {string} dataAttribute - Data attribute name
   * @param {string} selectedId - ID of item to select
   */
  static markAsSelected(itemClass, dataAttribute, selectedId) {
    // Remove selected class from all items
    document.querySelectorAll(`.${itemClass}`).forEach(item => {
      item.classList.remove('selected');
    });

    // Add selected class to target item
    const selectedItem = document.querySelector(`[data-${this.kebabCase(dataAttribute)}="${selectedId}"]`);
    if (selectedItem) {
      selectedItem.classList.add('selected');
    }
  }

  /**
   * Convert camelCase to kebab-case for data attributes
   * @param {string} str - camelCase string
   * @returns {string} - kebab-case string
   */
  static kebabCase(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }

  /**
   * Common sort function: alphabetical by name
   * @param {Object} a - First item
   * @param {Object} b - Second item
   * @returns {number} - Sort order
   */
  static sortByName(a, b) {
    return a.name.localeCompare(b.name);
  }
}
