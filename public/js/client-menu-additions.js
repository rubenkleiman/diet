// ===== ADDITIONS TO CLIENT.JS =====
// Add these imports at the top of client.js

import { MenuManager } from '@managers/MenuManager.js';
import { MenuRenderer } from '@renderers/MenuRenderer.js';

// ===== ADD TO CONSTRUCTOR =====
// Add to the constructor after ingredientManager initialization:

this.menuManager = new MenuManager();

// Add to legacy properties:
this.menus = [];
this.selectedMenuId = null;

// Add to editor state:
this.editingMenuId = null;
this.selectedRecipesForMenu = [];
this.recipeSearchTimeout = null;

// ===== ADD TO setupStateSync() METHOD =====
// Add these subscriptions:

State.subscribe('menus', (newValue) => {
    this.menus = newValue;
    this.updateHomeCounts();
});

State.subscribe('selectedMenuId', (newValue) => {
    this.selectedMenuId = newValue;
});

State.subscribe('editingMenuId', (newValue) => {
    this.editingMenuId = newValue;
});

State.subscribe('selectedRecipesForMenu', (newValue) => {
    this.selectedRecipesForMenu = newValue;
    MenuRenderer.renderSelectedRecipes(newValue, (index) => {
        this.menuManager.removeRecipeFromMenu(index);
    });
});

// ===== ADD TO init() METHOD =====
// Add after ingredientManager.loadIngredients():

await this.menuManager.loadMenus();

// ===== ADD TO updateHomeCounts() METHOD =====
// Add this line:

const menuCountEl = document.getElementById('menuCount');
if (menuCountEl) menuCountEl.textContent = this.menus.length;

// ===== ADD TO navigateTo() METHOD =====
// Add to the page-specific logic (after ingredients):

else if (page === 'menus') {
    this.renderMenuList(this.menus);
}

// ===== ADD TO handleAction() METHOD =====
// Add these cases to the switch statement:

case 'create-menu':
    this.createMenu();
    break;
case 'edit-menu':
    this.editMenu();
    break;
case 'delete-menu':
    this.deleteMenu();
    break;
case 'close-menu-editor':
    this.closeMenuEditor();
    break;

// ===== ADD TO setupEventListeners() METHOD =====
// Add these event listeners:

const menuSearchInput = document.getElementById('menuSearchInput');
if (menuSearchInput) {
    menuSearchInput.addEventListener('input', (e) => {
        this.filterMenus(e.target.value);
    });
}

const menuEditForm = document.getElementById('menuEditForm');
if (menuEditForm) {
    menuEditForm.addEventListener('submit', (e) => this.saveMenu(e));
}

const recipeSearchBox = document.getElementById('recipeSearchBox');
if (recipeSearchBox) {
    recipeSearchBox.addEventListener('input', (e) => {
        this.handleRecipeSearch(e.target.value);
    });
}

// ===== ADD TO setupEventDelegation() METHOD =====
// Add this section:

// Recipe rows in menu editor
const recipeRows = document.getElementById('recipeRows');
if (recipeRows) {
    setupEventDelegation(recipeRows, {
        'remove-recipe': (target) => {
            const index = parseInt(target.dataset.index);
            this.menuManager.removeRecipeFromMenu(index);
        }
    });
}

// Recipe search results for menu editor
const recipeSearchResults = document.getElementById('recipeSearchResults');
if (recipeSearchResults) {
    setupEventDelegation(recipeSearchResults, {
        'add-recipe-to-menu': (target) => {
            this.addRecipeToMenu({
                id: target.dataset.recipeId,
                name: target.dataset.recipeName
            });
        }
    });
}

// ===== NEW METHODS TO ADD TO CLIENT CLASS =====

// Menu List & Selection
renderMenuList(menusToShow) {
    MenuRenderer.renderList(menusToShow, (menuId) => {
        this.selectMenu(menuId);
        this.showMenuDetails(menuId);
    });

    // Load summaries asynchronously
    menusToShow.forEach(menu => {
        this.fetchMenuSummary(menu.id).then(data => {
            if (data) {
                MenuRenderer.updateMenuItemWithSummary(
                    menu.id,
                    data,
                    (ox) => this.menuManager.calculateOxalateRisk(ox)
                );
            }
        });
    });
}

async fetchMenuSummary(menuId) {
    try {
        const menu = await this.menuManager.getMenu(menuId);
        return await this.menuManager.getMenuNutritionalData(menu);
    } catch (error) {
        console.error('Error fetching menu summary:', error);
        return null;
    }
}

filterMenus(searchTerm) {
    const filtered = this.menuManager.filterMenus(searchTerm);
    this.renderMenuList(filtered);
}

selectMenu(menuId) {
    MenuRenderer.markAsSelected(menuId);
    this.menuManager.selectMenu(menuId);
    setButtonsDisabled(['editMenuBtn', 'deleteMenuBtn'], false);
}

async showMenuDetails(menuId) {
    try {
        const menu = await this.menuManager.getMenu(menuId);
        const nutritionalData = await this.menuManager.getMenuNutritionalData(menu);
        
        MenuRenderer.renderDetails(nutritionalData, {
            dailyRequirements: this.dailyRequirements,
            userSettings: this.userSettings,
            calculateOxalateRisk: (ox) => this.menuManager.calculateOxalateRisk(ox),
            INGREDIENT_PROPS: Client.INGREDIENT_PROPS
        });
    } catch (error) {
        console.error('Error loading menu details:', error);
        MenuRenderer.showError('Failed to load menu details');
    }
}

// Menu CRUD Operations
createMenu() {
    this.menuManager.startEdit(null);
    FormRenderer.setMenuEditorTitle('Create New Menu');
    FormRenderer.clearMenuForm();
    MenuRenderer.renderSelectedRecipes([]);
    FormRenderer.openMenuEditor();
}

async editMenu() {
    if (!this.selectedMenuId) return;

    this.menuManager.startEdit(this.selectedMenuId);

    try {
        const menu = await this.menuManager.getMenu(this.selectedMenuId);

        FormRenderer.setMenuEditorTitle('Edit Menu');
        document.getElementById('menuNameInput').value = menu.name;
        document.getElementById('recipeSearchBox').value = '';

        // Fetch recipe names for display
        const recipePromises = menu.recipeIds.map(id => 
            this.recipes.find(r => r.id === id)
        );
        
        const recipes = recipePromises
            .filter(r => r !== undefined)
            .map(r => ({ id: r.id, name: r.name }));

        State.set('selectedRecipesForMenu', recipes);
        FormRenderer.openMenuEditor();
    } catch (error) {
        console.error('Error loading menu for editing:', error);
        alert('Failed to load menu details');
    }
}

async deleteMenu() {
    if (!this.selectedMenuId) return;

    const menu = this.menus.find(m => m.id === this.selectedMenuId);
    if (!menu) return;

    if (!confirm(`Delete menu "${menu.name}"? This cannot be undone.`)) {
        return;
    }

    try {
        await this.menuManager.deleteMenu(this.selectedMenuId);
        this.renderMenuList(this.menus);

        this.menuManager.deselectMenu();
        setButtonsDisabled(['editMenuBtn', 'deleteMenuBtn'], true);
        hideElement('menuDetailsSection');

        alert('Menu deleted successfully');
    } catch (error) {
        console.error('Error deleting menu:', error);
        alert('Failed to delete menu');
    }
}

closeMenuEditor() {
    FormRenderer.closeMenuEditor();
    this.menuManager.cancelEdit();
    FormRenderer.clearMenuForm();
    MenuRenderer.hideRecipeSearchResults();
    FormRenderer.clearErrors();
}

async saveMenu(event) {
    event.preventDefault();

    const menuName = document.getElementById('menuNameInput').value.trim();
    const validation = this.validateMenu(menuName, this.selectedRecipesForMenu);

    if (!validation.valid) {
        validation.errors.forEach(error => {
            FormRenderer.showError(error.field, error.message);
        });
        return;
    }

    FormRenderer.clearErrors();

    const payload = {
        name: menuName,
        recipeIds: this.selectedRecipesForMenu.map(r => r.id)
    };

    try {
        if (this.editingMenuId) {
            await this.menuManager.updateMenu(this.editingMenuId, payload);
            alert('Menu updated successfully');
            this.menuManager.selectMenu(this.editingMenuId);
            await this.showMenuDetails(this.editingMenuId);
        } else {
            await this.menuManager.createMenu(payload);
            alert('Menu created successfully');
            const newMenu = this.menus.find(m => m.name === menuName);
            if (newMenu) {
                this.menuManager.selectMenu(newMenu.id);
                await this.showMenuDetails(newMenu.id);
            }
        }

        this.renderMenuList(this.menus);
        this.closeMenuEditor();
    } catch (error) {
        console.error('Error saving menu:', error);
        FormRenderer.showError('recipesError', error.message || 'Failed to save menu');
    }
}

// Menu Validation
validateMenu(menuName, recipes) {
    const errors = [];

    if (!menuName || menuName.trim().length === 0) {
        errors.push({ field: 'menuNameError', message: 'Menu name is required' });
    }

    if (menuName && menuName.length > 64) {
        errors.push({ field: 'menuNameError', message: 'Menu name cannot exceed 64 characters' });
    }

    if (!recipes || recipes.length === 0) {
        errors.push({ field: 'recipesError', message: 'At least one recipe is required' });
    }

    if (recipes && recipes.length > 30) {
        errors.push({ field: 'recipesError', message: 'Maximum 30 recipes allowed' });
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

// Recipe Search for Menu Editor
handleRecipeSearch(searchTerm) {
    clearTimeout(this.recipeSearchTimeout);

    if (!searchTerm || searchTerm.trim().length < 2) {
        MenuRenderer.hideRecipeSearchResults();
        return;
    }

    this.recipeSearchTimeout = setTimeout(() => {
        this.performRecipeSearch(searchTerm.trim());
    }, 300);
}

performRecipeSearch(searchTerm) {
    const term = searchTerm.toLowerCase();
    const results = this.recipes.filter(recipe =>
        recipe.name.toLowerCase().includes(term)
    );

    MenuRenderer.renderRecipeSearchResults(
        results,
        this.selectedRecipesForMenu,
        (recipe) => this.addRecipeToMenu(recipe)
    );
}

addRecipeToMenu(recipe) {
    const added = this.menuManager.addRecipeToMenu(recipe);

    if (added) {
        MenuRenderer.hideRecipeSearchResults();
        document.getElementById('recipeSearchBox').value = '';
    } else {
        alert('This recipe is already in the menu');
    }
}
