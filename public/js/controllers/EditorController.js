/**
 * Generic Editor Controller
 * Handles common editor panel patterns
 */

export class EditorController {
  constructor(config) {
    this.panelId = config.panelId;
    this.formId = config.formId;
    this.titleId = config.titleId;
    this.nameInputId = config.nameInputId;
    this.manager = config.manager;
    this.renderer = config.renderer;
    this.onClearForm = config.onClearForm;
  }

  /**
   * Open editor with title
   */
  open(title) {
    this.setTitle(title);
    this.show();
  }

  /**
   * Close editor
   */
  close() {
    this.hide();
    this.clear();
    this.manager.cancelEdit?.();
  }

  /**
   * Set editor title
   */
  setTitle(title) {
    const titleEl = document.getElementById(this.titleId);
    if (titleEl) titleEl.textContent = title;
  }

  /**
   * Show editor panel
   */
  show() {
    const panel = document.getElementById(this.panelId);
    if (panel) panel.classList.add('active');
  }

  /**
   * Hide editor panel
   */
  hide() {
    const panel = document.getElementById(this.panelId);
    if (panel) panel.classList.remove('active');
  }

  /**
   * Clear editor form
   */
  clear() {
    const nameInput = document.getElementById(this.nameInputId);
    if (nameInput) nameInput.value = '';
    
    this.renderer?.clearErrors();
    this.onClearForm?.();
  }

  /**
   * Get name from input
   */
  getName() {
    const input = document.getElementById(this.nameInputId);
    return input ? input.value.trim() : '';
  }

  /**
   * Set name in input
   */
  setName(name) {
    const input = document.getElementById(this.nameInputId);
    if (input) input.value = name;
  }
}
