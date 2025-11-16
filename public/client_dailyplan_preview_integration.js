// ===== 1. Add to constructor (after menu preview state) =====
this.showDailyPlanPreviewAllNutrients = false;
this.dailyPlanPreviewNutrientPage = 0;


// ===== 2. Add these new methods to the Client class =====

/**
 * Update daily plan nutrient preview
 */
async updateDailyPlanNutrientPreview() {
  const container = document.getElementById('dailyPlanNutrientPreview');
  const toggleBtn = document.getElementById('toggleDailyPlanPreviewBtn');
  
  if (!container) return;

  // Update button text
  if (toggleBtn) {
    toggleBtn.textContent = this.showDailyPlanPreviewAllNutrients 
      ? 'Show Key Nutrients' 
      : 'Show All Nutrients';
  }

  const data = await this.nutrientPreviewManager.calculateDailyPlanTotals(this.selectedMenusForDailyPlan);
  
  if (!data) {
    container.innerHTML = '<p class="preview-empty">Add menus to see nutritional preview</p>';
    return;
  }

  const html = this.showDailyPlanPreviewAllNutrients 
    ? this.nutrientPreviewManager.renderAllNutrients(
        data, 
        this.userSettings, 
        this.dailyRequirements, 
        this.dailyPlanPreviewNutrientPage, 
        Client.INGREDIENT_PROPS
      )
    : this.nutrientPreviewManager.renderKeyNutrients(
        data, 
        this.userSettings, 
        this.dailyRequirements, 
        (ox) => this.dailyPlanManager.calculateOxalateRisk(ox)
      );
  
  container.innerHTML = html;
}

/**
 * Toggle between key and all nutrients in daily plan preview
 */
toggleDailyPlanPreviewNutrients() {
  this.showDailyPlanPreviewAllNutrients = !this.showDailyPlanPreviewAllNutrients;
  this.dailyPlanPreviewNutrientPage = 0;
  this.updateDailyPlanNutrientPreview();
}

/**
 * Navigate to previous page in daily plan preview
 */
prevDailyPlanPreviewNutrientPage() {
  if (this.dailyPlanPreviewNutrientPage > 0) {
    this.dailyPlanPreviewNutrientPage--;
    this.updateDailyPlanNutrientPreview();
  }
}

/**
 * Navigate to next page in daily plan preview
 */
nextDailyPlanPreviewNutrientPage() {
  this.dailyPlanPreviewNutrientPage++;
  this.updateDailyPlanNutrientPreview();
}


// ===== 3. Add to handleAction switch statement =====
case 'toggle-daily-plan-preview-nutrients':
    this.toggleDailyPlanPreviewNutrients();
    break;
case 'prev-daily-plan-preview-nutrient-page':
    this.prevDailyPlanPreviewNutrientPage();
    break;
case 'next-daily-plan-preview-nutrient-page':
    this.nextDailyPlanPreviewNutrientPage();
    break;


// ===== 4. Update existing methods to trigger preview updates =====

// In createDailyPlan() - at the end:
createDailyPlan() {
    this.dailyPlanManager.startEdit(null);
    FormRenderer.setDailyPlanEditorTitle('Create New Daily Plan');
    FormRenderer.clearDailyPlanForm();
    DailyPlanRenderer.renderSelectedMenus([],
        (index) => this.dailyPlanManager.removeMenuFromDailyPlan(index),
        (index, type) => this.dailyPlanManager.updateMenuType(index, type)
    );
    FormRenderer.openDailyPlanEditor();
    this.updateDailyPlanNutrientPreview();  // ADD THIS LINE
}

// In editDailyPlan() - after FormRenderer.openDailyPlanEditor():
async editDailyPlan() {
    if (!this.selectedDailyPlanId) return;

    this.dailyPlanManager.startEdit(this.selectedDailyPlanId);

    try {
        const dailyPlan = await this.dailyPlanManager.getDailyPlan(this.selectedDailyPlanId);

        FormRenderer.setDailyPlanEditorTitle('Edit Daily Plan');
        document.getElementById('dailyPlanNameInput').value = dailyPlan.dailyPlanName;
        document.getElementById('menuSearchBoxForDailyPlan').value = '';

        // Convert dailyPlanMenus to the format needed for rendering
        const menus = dailyPlan.menus.map(menu => ({
            menuId: menu.menuId,
            name: menu.name,
            type: menu.type
        }));

        State.set('selectedMenusForDailyPlan', menus);
        FormRenderer.openDailyPlanEditor();
        this.updateDailyPlanNutrientPreview();  // ADD THIS LINE
    } catch (error) {
        console.error('Error loading daily plan for editing:', error);
        alert('Failed to load daily plan details');
    }
}

// In closeDailyPlanEditor() - at the end:
closeDailyPlanEditor() {
    FormRenderer.closeDailyPlanEditor();
    this.dailyPlanManager.cancelEdit();
    FormRenderer.clearDailyPlanForm();
    DailyPlanRenderer.hideMenuSearchResults();
    FormRenderer.clearErrors();
    this.nutrientPreviewManager.clearCache();  // ADD THIS LINE (if not already there)
}

// In addMenuToDailyPlan() - after the successful add:
addMenuToDailyPlan(menu) {
    const added = this.dailyPlanManager.addMenuToDailyPlan(menu);

    if (added) {
        DailyPlanRenderer.hideMenuSearchResults();
        document.getElementById('menuSearchBoxForDailyPlan').value = '';
        this.updateDailyPlanNutrientPreview();  // ADD THIS LINE
    }
}

// In setupStateSync() - in the 'selectedMenusForDailyPlan' subscriber:
State.subscribe('selectedMenusForDailyPlan', (newValue) => {
    this.selectedMenusForDailyPlan = newValue;
    DailyPlanRenderer.renderSelectedMenus(
        newValue,
        (index) => this.dailyPlanManager.removeMenuFromDailyPlan(index),
        (index, type) => this.dailyPlanManager.updateMenuType(index, type)
    );
    this.updateDailyPlanNutrientPreview();  // ADD THIS LINE
});
