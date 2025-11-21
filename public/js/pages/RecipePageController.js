/**
 * Recipe Page Controller
 * Handles all recipe page logic
 */

import { RecipeManager } from '../managers/RecipeManager.js';
import { IngredientManager } from '../managers/IngredientManager.js';
import { RecipeRenderer } from '../renderers/RecipeRenderer.js';
import { FormRenderer } from '../renderers/FormRenderer.js';
import { EntityController } from '../controllers/EntityController.js';
import { EditorController } from '../controllers/EditorController.js';
import { State } from '../core/State.js';
import { validateRecipe } from '../utils/Validation.js';

export class RecipePageController {
    constructor(client) {
        this.client = client;
        this.recipeManager = new RecipeManager();
        this.ingredientManager = new IngredientManager();

        // Entity controller
        this.entityController = new EntityController({
            entityName: 'recipe',
            entityNamePlural: 'recipes',
            manager: this.recipeManager,
            renderer: RecipeRenderer,
            state: State,
            editButtonId: 'editRecipeBtn',
            deleteButtonId: 'deleteRecipeBtn',
            detailsSectionId: 'recipeDetailsSection'
        });
        this.entityController.showDetails = (id) => this.showDetails(id);

        // Editor controller
        this.editorController = new EditorController({
            panelId: 'recipeEditPanel',
            formId: 'recipeEditForm',
            titleId: 'editPanelTitle',
            nameInputId: 'recipeNameInput',
            manager: this.recipeManager,
            renderer: FormRenderer,
            onClearForm: () => {
                document.getElementById('ingredientSearchBox').value = '';
            }
        });

        // Preview state
        this.showPreviewAllNutrients = false;
        this.previewNutrientPage = 0;

        // Search timeout
        this.ingredientSearchTimeout = null;

        State.subscribe('selectedIngredientsForRecipe', (newValue) => {
            FormRenderer.renderSelectedIngredients(newValue, {
                amount: (index, value) => this.recipeManager.updateIngredientAmount(index, value),
                unit: (index, value) => this.recipeManager.updateIngredientUnit(index, value)
            });
            this.updateNutrientPreview();
        });

        this._dataLoaded = false;
    }

    /**
     * Initialize page (called when navigating to recipes page)
     * Lazy load data only when page is visited
     */
    async init() {
        if (!this._dataLoaded) {
            try {
                await this.recipeManager.loadRecipes();
                this._dataLoaded = true;
            } catch (error) {
                console.error('Failed to load recipes:', error);
                // Show user-friendly error
                const list = document.getElementById('recipeList');
                if (list) {
                    list.innerHTML = '<li class="error-message">Failed to load recipes. Please refresh.</li>';
                }
                return;
            }
        }

        const recipes = State.get('recipes');
        this.renderList(recipes);
    }

    /**
     * Render recipe list
     */
    renderList(recipes) {
        RecipeRenderer.renderList(recipes, (recipeId) => {
            this.entityController.select(recipeId);
        });
    }

    /**
     * Filter recipes
     */
    filter(searchTerm) {
        this.entityController.filter(searchTerm);
    }

    /**
     * Select recipe
     */
    async select(recipeId) {
        await this.entityController.select(recipeId);
    }

    /**
     * Show recipe details
     */
    async showDetails(recipeId) {
        const summaryCheckbox = document.getElementById('summaryCheckbox');
        const summary = summaryCheckbox ? summaryCheckbox.checked : true;

        try {
            const data = await this.recipeManager.getRecipe(recipeId, summary);
            RecipeRenderer.renderDetails(data, {
                dailyRequirements: State.get('dailyRequirements'),
                userSettings: State.get('userSettings'),
                showAllNutrients: State.get('showAllNutrients'),
                currentNutrientPage: State.get('currentNutrientPage'),
                calculateOxalateRisk: (ox) => this.recipeManager.calculateOxalateRisk(ox),
                calculateContributions: (d) => this.recipeManager.calculateContributions(d),
                INGREDIENT_PROPS: State.get('nutrientMap') || {},
                NUTRIENTS_PER_PAGE: 5
            });
        } catch (error) {
            console.error('Error loading recipe details:', error);
            RecipeRenderer.showError('Failed to load recipe details');
        }
    }

    /**
     * Create new recipe
     */
    create() {
        this.recipeManager.startEdit(null);
        this.editorController.open('Create New Recipe');
        FormRenderer.renderSelectedIngredients([]);
        this.updateNutrientPreview();
    }

    /**
     * Edit existing recipe
     */
    async edit() {
        const selectedId = State.get('selectedRecipeId');
        if (!selectedId) return;

        this.recipeManager.startEdit(selectedId);

        try {
            const recipe = await this.recipeManager.getRecipeFull(selectedId);

            this.editorController.setTitle('Edit Recipe');
            this.editorController.setName(recipe.name);
            document.getElementById('ingredientSearchBox').value = '';

            const ingredients = recipe.ingredients.map(ing => ({
                brandId: ing.brandId,
                name: ing.brandName,
                amount: ing.amount,
                unit: ing.unit
            }));

            State.set('selectedIngredientsForRecipe', ingredients);
            this.editorController.show();
            this.updateNutrientPreview();
        } catch (error) {
            console.error('Error loading recipe for editing:', error);
            alert('Failed to load recipe details');
        }
    }

    /**
     * Delete recipe
     */
    delete() {
        const selectedId = State.get('selectedRecipeId');
        this.entityController.delete(selectedId);
    }

    /**
     * Close editor
     */
    closeEditor() {
        this.editorController.close();
        FormRenderer.hideSearchResults();
    }

    /**
     * Save recipe
     */
    async save(event) {
        event.preventDefault();

        const recipeName = this.editorController.getName();
        const selectedIngredients = State.get('selectedIngredientsForRecipe');
        const validation = validateRecipe(recipeName, selectedIngredients);

        if (!validation.valid) {
            validation.errors.forEach(error => {
                FormRenderer.showError(error.field, error.message);
            });
            return;
        }

        FormRenderer.clearErrors();

        const payload = {
            name: recipeName,
            ingredients: selectedIngredients.map(ing => ({
                brandId: ing.brandId,
                amount: parseFloat(ing.amount),
                unit: ing.unit
            }))
        };

        try {
            const editingId = State.get('editingRecipeId');

            if (editingId) {
                await this.recipeManager.updateRecipe(editingId, payload);
                alert('Recipe updated successfully');
                this.recipeManager.selectRecipe(editingId);
                await this.showDetails(editingId);
            } else {
                await this.recipeManager.createRecipe(payload);
                alert('Recipe created successfully');
                const recipes = State.get('recipes');
                const newRecipe = recipes.find(r => r.name == recipeName);
                if (newRecipe) {
                    this.recipeManager.selectRecipe(newRecipe.id);
                    await this.showDetails(newRecipe.id);
                }
            }

            this.renderList(State.get('recipes'));
            this.closeEditor();
        } catch (error) {
            console.error('Error saving recipe:', error);
            FormRenderer.showError('ingredientsError', error.message || 'Failed to save recipe');
        }
    }

    /**
     * Toggle nutrient view (key vs all)
     */
    toggleNutrientView() {
        this.recipeManager.toggleNutrientView();
        const selectedId = State.get('selectedRecipeId');
        if (selectedId) {
            this.showDetails(selectedId);
        }
    }

    prevNutrientPage() {
        this.recipeManager.prevNutrientPage();
        const selectedId = State.get('selectedRecipeId');
        if (selectedId) {
            this.showDetails(selectedId);
        }
    }

    nextNutrientPage() {
        this.recipeManager.nextNutrientPage();
        const selectedId = State.get('selectedRecipeId');
        if (selectedId) {
            this.showDetails(selectedId);
        }
    }

    /**
     * Handle ingredient search
     */
    handleIngredientSearch(searchTerm) {
        clearTimeout(this.ingredientSearchTimeout);

        if (!searchTerm || searchTerm.trim().length < 2) {
            FormRenderer.hideSearchResults();
            return;
        }

        this.ingredientSearchTimeout = setTimeout(() => {
            this.performIngredientSearch(searchTerm.trim());
        }, 300);
    }

    async performIngredientSearch(searchTerm) {
        try {
            const results = await this.ingredientManager.searchIngredients(searchTerm);
            const selectedIngredients = State.get('selectedIngredientsForRecipe');
            FormRenderer.renderSearchResults(
                results,
                selectedIngredients,
                (ingredient) => this.addIngredient(ingredient)
            );
        } catch (error) {
            console.error('Error searching ingredients:', error);
        }
    }

    /**
     * Add ingredient to recipe
     */
    addIngredient(ingredient) {
        const added = this.recipeManager.addIngredientToRecipe(ingredient);

        if (added) {
            FormRenderer.hideSearchResults();
            document.getElementById('ingredientSearchBox').value = '';
            this.updateNutrientPreview();
        }
    }

    /**
     * Update nutrient preview
     */
    async updateNutrientPreview() {
        const container = document.getElementById('recipeNutrientPreview');
        const toggleBtn = document.getElementById('toggleRecipePreviewBtn');

        if (!container) return;

        if (toggleBtn) {
            toggleBtn.textContent = this.showPreviewAllNutrients
                ? 'Show Key Nutrients'
                : 'Show All Nutrients';
        }

        const selectedIngredients = State.get('selectedIngredientsForRecipe');
        const data = await this.client.nutrientPreviewManager.calculateRecipeTotals(selectedIngredients);

        if (!data) {
            container.innerHTML = '<p class="preview-empty">Add ingredients to see nutritional preview</p>';
            return;
        }

        const html = this.showPreviewAllNutrients
            ? this.client.nutrientPreviewManager.renderAllNutrients(
                data,
                State.get('userSettings'),
                State.get('dailyRequirements'),
                this.previewNutrientPage,
                this.client.nutrientMetadataManager
            )
            : this.client.nutrientPreviewManager.renderKeyNutrients(
                data,
                State.get('userSettings'),
                State.get('dailyRequirements'),
                (ox) => this.recipeManager.calculateOxalateRisk(ox),
                this.client.nutrientMetadataManager
            );

        container.innerHTML = html;
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
}