/**
 * Generic Entity Controller
 * Handles common CRUD patterns for all entities (recipes, menus, daily plans, ingredients)
 */

import { showModal } from '../core/State.js';
import { setButtonsDisabled, hideElement } from '../utils/dom.js';

export class EntityController {
  constructor(config) {
    this.entityName = config.entityName; // 'recipe', 'menu', 'dailyPlan', 'ingredient'
    this.entityNamePlural = config.entityNamePlural; // 'recipes', 'menus', etc.
    this.manager = config.manager;
    this.renderer = config.renderer;
    this.state = config.state;
    this.editButtonId = config.editButtonId;
    this.deleteButtonId = config.deleteButtonId;
    this.detailsSectionId = config.detailsSectionId;
  }

  /**
   * Generic select handler
   */
  async select(id) {
    this.renderer.markAsSelected(id);
    this.manager[`select${this.capitalize(this.entityName)}`]?.(id);
    setButtonsDisabled([this.editButtonId, this.deleteButtonId], false);
    await this.showDetails(id);
  }

  /**
   * Generic delete handler
   */
  async delete(selectedId) {
    if (!selectedId) return;

    const entityList = this.state.get(this.entityNamePlural);
    const entity = entityList.find(e => e.id == selectedId);
    if (!entity) return;

    const displayName = this.getDisplayName();
    const result = await showModal(`Delete ${entity.name}`, `Delete ${displayName} "${entity.name}"? This cannot be undone.`, [{ "Cancel": "neutral" },{ Delete: "red" }])
    if (result != "Delete") {
      return;
    }
    // if (!confirm(`Delete ${displayName} "${entity.name}"? This cannot be undone.`)) {
    //   return;
    // }

    try {
      await this.manager[`delete${this.capitalize(this.entityName)}`](selectedId);

      // Refresh list
      const updatedList = this.state.get(this.entityNamePlural);
      this.renderList(updatedList);

      // Deselect and disable buttons
      this.manager[`deselect${this.capitalize(this.entityName)}`]?.();
      setButtonsDisabled([this.editButtonId, this.deleteButtonId], true);
      hideElement(this.detailsSectionId);

      await showModal(`Delete ${displayName}`, `${displayName} deleted successfully`, [{ "OK": "blue" }]);
    } catch (error) {
      console.error(`Error deleting ${this.entityName}:`, error);
      await showModal(`Delete ${displayName}`, `Failed to delete ${displayName}`, [{ "Oh no!": "red" }]);
    }
  }

  /**
   * Generic filter handler
   */
  filter(searchTerm) {
    const filtered = this.manager[`filter${this.capitalize(this.entityNamePlural)}`]?.(searchTerm);
    if (filtered) {
      this.renderList(filtered);
    }
  }

  /**
   * Render entity list
   */
  renderList(entities) {
    this.renderer.renderList(entities, (id) => {
      this.select(id);
    });
  }

  // Helper methods
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  getDisplayName() {
    // Convert camelCase to Title Case (e.g., 'dailyPlan' -> 'Daily Plan')
    return this.entityName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Show details - to be implemented by subclasses
   */
  async showDetails(id) {
    throw new Error('showDetails must be implemented by subclass');
  }
}
