/**
 * Daily Plan Page Controller
 * Handles all daily plan page logic
 */

import { DailyPlanManager } from '../managers/DailyPlanManager.js';
import { DailyPlanRenderer } from '../renderers/DailyPlanRenderer.js';
import { FormRenderer } from '../renderers/FormRenderer.js';
import { EntityController } from '../controllers/EntityController.js';
import { EditorController } from '../controllers/EditorController.js';
import { State } from '../core/State.js';
import { dietaryAssessmentHelper } from '../utils/DietaryAssessmentHelper.js';

export class DailyPlanPageController {
  constructor(client) {
    this.client = client;
    this.dailyPlanManager = new DailyPlanManager();

    // Entity controller
    this.entityController = new EntityController({
      entityName: 'dailyPlan',
      entityNamePlural: 'dailyPlans',
      manager: this.dailyPlanManager,
      renderer: DailyPlanRenderer,
      state: State,
      editButtonId: 'editDailyPlanBtn',
      deleteButtonId: 'deleteDailyPlanBtn',
      detailsSectionId: 'dailyPlanDetailsSection'
    });
    this.entityController.showDetails = (id) => this.showDetails(id);

    // Editor controller
    this.editorController = new EditorController({
      panelId: 'dailyPlanEditPanel',
      formId: 'dailyPlanEditForm',
      titleId: 'dailyPlanEditPanelTitle',
      nameInputId: 'dailyPlanNameInput',
      manager: this.dailyPlanManager,
      renderer: FormRenderer,
      onClearForm: () => {
        document.getElementById('menuSearchBoxForDailyPlan').value = '';
      }
    });

    // Preview state
    this.showPreviewAllNutrients = false;
    this.previewNutrientPage = 0;

    // Search timeout
    this.menuSearchTimeout = null;

    State.subscribe('selectedMenusForDailyPlan', (newValue) => {
      DailyPlanRenderer.renderSelectedMenus(
        newValue,
        (index) => this.dailyPlanManager.removeMenuFromDailyPlan(index),
        (index, type) => this.dailyPlanManager.updateMenuType(index, type)
      );
      this.updateNutrientPreview();
    });
  }

  /**
   * Initialize page
   */
  init() {
    const dailyPlans = State.get('dailyPlans');
    this.renderList(dailyPlans);
  }

  /**
   * Render daily plan list
   */
  renderList(dailyPlans) {
    DailyPlanRenderer.renderList(dailyPlans, (dailyPlanId) => {
      this.entityController.select(dailyPlanId);
    });

    // Load summaries asynchronously
    dailyPlans.forEach(plan => {
      this.fetchSummary(plan.id).then(data => {
        if (data && Object.keys(data).length) {
          DailyPlanRenderer.updateDailyPlanItemWithSummary(
            plan.id,
            data,
            (ox) => this.dailyPlanManager.calculateOxalateRisk(ox)
          );
        }
      });
    });
  }

  async fetchSummary(dailyPlanId) {
    try {
      return await this.dailyPlanManager.getDailyPlan(dailyPlanId);
    } catch (error) {
      console.error('Error fetching daily plan summary:', error);
      return null;
    }
  }

  /**
   * Filter daily plans
   */
  filter(searchTerm) {
    this.entityController.filter(searchTerm);
  }

  /**
   * Select daily plan
   */
  async select(dailyPlanId) {
    await this.entityController.select(dailyPlanId);
  }

  /**
   * Show daily plan details (async - waits for dietary assessment)
   */
  async showDetails(dailyPlanId) {
    try {
      const data = await this.dailyPlanManager.getDailyPlan(dailyPlanId);

      // Now await the async renderDetails
      await DailyPlanRenderer.renderDetails(data, {
        dailyRequirements: State.get('dailyRequirements'),
        userSettings: State.get('userSettings'),
        showAllNutrients: State.get('showAllDailyNutrients'),
        currentNutrientPage: State.get('currentDailyNutrientPage'),
        calculateOxalateRisk: (ox) => this.dailyPlanManager.calculateOxalateRisk(ox),
        INGREDIENT_PROPS: State.get('nutrientMap') || {},
        NUTRIENTS_PER_PAGE: 5
      });
    } catch (error) {
      console.error('Error loading daily plan details:', error);
      DailyPlanRenderer.showError('Failed to load daily plan details');
    }
  }

  /**
   * Create new daily plan
   */
  create() {
    this.dailyPlanManager.startEdit(null);
    this.editorController.open('Create New Daily Plan');
    DailyPlanRenderer.renderSelectedMenus([],
      (index) => this.dailyPlanManager.removeMenuFromDailyPlan(index),
      (index, type) => this.dailyPlanManager.updateMenuType(index, type)
    );
    this.updateNutrientPreview();
  }

  /**
   * Edit existing daily plan
   */
  async edit() {
    const selectedId = State.get('selectedDailyPlanId');
    if (!selectedId) return;

    this.dailyPlanManager.startEdit(selectedId);

    try {
      const dailyPlan = await this.dailyPlanManager.getDailyPlan(selectedId);

      this.editorController.setName(dailyPlan.dailyPlanName);
      document.getElementById('menuSearchBoxForDailyPlan').value = '';

      const menus = dailyPlan.menus.map(menu => ({
        menuId: menu.menuId,
        name: menu.name,
        type: menu.type
      }));

      State.set('selectedMenusForDailyPlan', menus);
      this.editorController.show();
    } catch (error) {
      console.error('Error loading daily plan for editing:', error);
      alert('Failed to load daily plan details');
    }
  }

  /**
   * Delete daily plan
   */
  delete() {
    const selectedId = State.get('selectedDailyPlanId');
    this.entityController.delete(selectedId);
  }

  /**
   * Close editor
   */
  closeEditor() {
    this.editorController.close();
    DailyPlanRenderer.hideMenuSearchResults();
  }

  /**
   * Save daily plan
   */
  async save(event) {
    event.preventDefault();

    const dailyPlanName = this.editorController.getName();
    const selectedMenus = State.get('selectedMenusForDailyPlan');
    const validation = this.validateDailyPlan(dailyPlanName, selectedMenus);

    if (!validation.valid) {
      validation.errors.forEach(error => {
        FormRenderer.showError(error.field, error.message);
      });
      return;
    }

    FormRenderer.clearErrors();

    const payload = {
      name: dailyPlanName,
      dailyPlanMenus: selectedMenus.map(menu => ({
        menuId: menu.menuId,
        type: menu.type
      }))
    };

    try {
      const editingId = State.get('editingDailyPlanId');

      if (editingId) {
        await this.dailyPlanManager.updateDailyPlan(editingId, payload);
        alert('Daily plan updated successfully');
        this.dailyPlanManager.selectDailyPlan(editingId);
        await this.showDetails(editingId);
      } else {
        await this.dailyPlanManager.createDailyPlan(payload);
        alert('Daily plan created successfully');
        const dailyPlans = State.get('dailyPlans');
        const newDailyPlan = dailyPlans.find(dp => dp.name === dailyPlanName);
        if (newDailyPlan) {
          this.dailyPlanManager.selectDailyPlan(newDailyPlan.id);
          await this.showDetails(newDailyPlan.id);
        }
      }

      this.renderList(State.get('dailyPlans'));
      this.closeEditor();
    } catch (error) {
      console.error('Error saving daily plan:', error);
      FormRenderer.showError('menusError', error.message || 'Failed to save daily plan');
    }
  }

  validateDailyPlan(dailyPlanName, menus) {
    const errors = [];

    if (!dailyPlanName || dailyPlanName.trim().length === 0) {
      errors.push({ field: 'dailyPlanNameError', message: 'Daily plan name is required' });
    }

    if (dailyPlanName && dailyPlanName.length > 64) {
      errors.push({ field: 'dailyPlanNameError', message: 'Daily plan name cannot exceed 64 characters' });
    }

    if (!menus || menus.length === 0) {
      errors.push({ field: 'menusError', message: 'At least one menu is required' });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Handle menu search
   */
  handleMenuSearch(searchTerm) {
    clearTimeout(this.menuSearchTimeout);

    if (!searchTerm || searchTerm.trim().length < 2) {
      DailyPlanRenderer.hideMenuSearchResults();
      return;
    }

    this.menuSearchTimeout = setTimeout(() => {
      this.performMenuSearch(searchTerm.trim());
    }, 300);
  }

  performMenuSearch(searchTerm) {
    const menus = State.get('menus');
    const term = searchTerm.toLowerCase();
    const results = menus.filter(menu =>
      menu.name.toLowerCase().includes(term)
    );

    DailyPlanRenderer.renderMenuSearchResults(
      results,
      (menu) => this.addMenu(menu)
    );
  }

  /**
   * Add menu to daily plan
   */
  addMenu(menu) {
    const added = this.dailyPlanManager.addMenuToDailyPlan(menu);

    if (added) {
      DailyPlanRenderer.hideMenuSearchResults();
      document.getElementById('menuSearchBoxForDailyPlan').value = '';
    }
  }

  /**
   * Update nutrient preview with debounced dietary assessment
   */
  async updateNutrientPreview() {
    const container = document.getElementById('dailyPlanNutrientPreview');
    const toggleBtn = document.getElementById('toggleDailyPlanPreviewBtn');

    if (!container) return;

    if (toggleBtn) {
      toggleBtn.textContent = this.showPreviewAllNutrients
        ? 'Show Key Nutrients'
        : 'Show All Nutrients';
    }

    const selectedMenus = State.get('selectedMenusForDailyPlan');
    const data = await this.client.nutrientPreviewManager.calculateDailyPlanTotals(selectedMenus);

    if (!data) {
      container.innerHTML = '<p class="preview-empty">Add menus to see nutritional preview</p>';
      return;
    }

    // Show loading state
    container.innerHTML = '<p class="preview-empty">Loading assessment...</p>';

    // Use debounced assessment (500ms delay)
    dietaryAssessmentHelper.getAssessmentDebounced(
      'daily-plan-preview',
      data.totals,
      data.oxalateMg,
      'daily_plan',
      (error, assessment) => {
        if (error) {
          container.innerHTML = dietaryAssessmentHelper.renderError(error);
        } else {
          const html = dietaryAssessmentHelper.renderAssessment(assessment, { showProgressBar: true });
          container.innerHTML = html;
        }
      }
    );
  }

  togglePreviewNutrients() {
    this.showPreviewAllNutrients = !this.showPreviewAllNutrients;
    this.previewNutrientPage = 0;
    this.updateNutrientPreview();
  }

  prevPreviewNutrientPage() {
    if (this.previewNutrientPage > 0) {
      this.previewNutrientPage--;
      this.updateNutrientPreview();
    }
  }

  nextPreviewNutrientPage() {
    this.previewNutrientPage++;
    this.updateNutrientPreview();
  }

  /**
   * Toggle daily nutrient view
   */
  toggleDailyNutrientView() {
    const current = State.get('showAllDailyNutrients');
    State.set('showAllDailyNutrients', !current);
    State.set('currentDailyNutrientPage', 0);
    const selectedId = State.get('selectedDailyPlanId');
    if (selectedId) {
      this.showDetails(selectedId);
    }
  }

  prevDailyNutrientPage() {
    const current = State.get('currentDailyNutrientPage');
    if (current > 0) {
      State.set('currentDailyNutrientPage', current - 1);
      const selectedId = State.get('selectedDailyPlanId');
      if (selectedId) {
        this.showDetails(selectedId);
      }
    }
  }

  nextDailyNutrientPage() {
    State.set('currentDailyNutrientPage', State.get('currentDailyNutrientPage') + 1);
    const selectedId = State.get('selectedDailyPlanId');
    if (selectedId) {
      this.showDetails(selectedId);
    }
  }
}