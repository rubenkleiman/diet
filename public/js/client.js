// Diet Guidelines Client - Refactored as Class

class Client {

    // Maps ingredient name to its properties
    static INGREDIENT_PROPS = {
        calories: { unit: "none" },
        sodium: { unit: "mg" },
        cholesterol: { unit: "mg" },
        sugars: { unit: "g" },
        protein: { unit: "g" },
        dietary_fiber: { unit: "g" },
        carbohydrates: { unit: "g" },
        calcium: { unit: "mg" },
        potassium: { unit: "mg" },
        magnesium: { unit: "mg" },
        selenium: { unit: "mcg" },
        manganese: { unit: "mg" },
        zinc: { unit: "mg" },
        iron: { unit: "mg" },
        fat: { unit: "g" },
        saturated_fat: { unit: "g" },
        polysaturated_fat: { unit: "g" },
        monosaturated_fat: { unit: "g" },
        thiamin: { unit: "mg" },
        riboflavin: { unit: "mg" },
        niacin: { unit: "mg" },
        folic_acid: { unit: "mcg" },
        phosphorus: { unit: "mg" },
        vitamin_a: { unit: "mcg" },
        vitamin_b6: { unit: "mg" },
        vitamin_c: { unit: "mg" },
        vitamin_d: { unit: "mcg" },
        vitamin_e: { unit: "mg" },
        vitamin_k: { unit: "mcg" },
    };
    constructor() {
        // State management
        this.recipes = [];
        this.ingredients = [];
        this.selectedRecipeId = null;
        this.selectedIngredientId = null;
        this.config = {};
        this.kidneyStoneRiskData = {};
        this.dailyRequirements = {};
        this.userSettings = {
            caloriesPerDay: 2000,
            age: null,
            useAge: false,
            kidneyStoneRisk: 'Normal'
        };

        // Recipe editor state
        this.editingRecipeId = null;
        this.selectedIngredientsForRecipe = [];
        this.ingredientSearchTimeout = null;

        // Ingredient editor state
        this.editingIngredientId = null;

        // Contribution table state
        this.showAllNutrients = false;
        this.currentNutrientPage = 0;
        this.NUTRIENTS_PER_PAGE = 5;
    }

    // Initialize app
    async init() {
        this.loadUserSettings();
        await this.loadConfig();
        await this.loadKidneyStoneRiskData();
        await this.loadDailyRequirements();
        await this.loadRecipes();
        await this.loadIngredients();
        this.setupEventListeners();

        // Update home page counts
        this.updateHomeCounts();

        // Handle initial page from URL or default to home
        const page = window.location.hash.slice(1) || 'home';
        this.navigateTo(page, false);
    }

    // Load user settings from localStorage
    loadUserSettings() {
        const saved = localStorage.getItem('userSettings');
        if (saved) {
            this.userSettings = JSON.parse(saved);
        }
    }

    // Save user settings to localStorage
    saveUserSettings() {
        localStorage.setItem('userSettings', JSON.stringify(this.userSettings));
    }

    // Load configuration
    async loadConfig() {
        try {
            const response = await fetch('/api/config');
            const result = await response.json();
            if (result.success) {
                this.config = result.data;
                this.applyConfig();
            }
        } catch (error) {
            console.error('Error loading config:', error);
        }
    }

    // Load kidney stone risk data
    async loadKidneyStoneRiskData() {
        try {
            const response = await fetch('/api/kidney-stone-risk');
            const result = await response.json();
            if (result.success) {
                this.kidneyStoneRiskData = result.data;
            }
        } catch (error) {
            console.error('Error loading kidney stone risk data:', error);
        }
    }

    // Load daily requirements
    async loadDailyRequirements() {
        try {
            const response = await fetch('/api/daily-requirements');
            const result = await response.json();
            if (result.success) {
                this.dailyRequirements = result.data;
            }
        } catch (error) {
            console.error('Error loading daily requirements:', error);
        }
    }

    // Apply configuration to UI
    applyConfig() {
        if (this.config.ui?.recipeListMaxHeight) {
            const container = document.getElementById('recipeListContainer');
            if (container) container.style.maxHeight = this.config.ui.recipeListMaxHeight;
        }
        if (this.config.ui?.recipeDetailsMaxHeight) {
            const content = document.getElementById('recipeDetailsContent');
            if (content) content.style.maxHeight = this.config.ui.recipeDetailsMaxHeight;
        }
    }

    // Update home page counts
    updateHomeCounts() {
        const recipeCountEl = document.getElementById('recipeCount');
        const ingredientCountEl = document.getElementById('ingredientCount');

        if (recipeCountEl) recipeCountEl.textContent = this.recipes.length;
        if (ingredientCountEl) ingredientCountEl.textContent = this.ingredients.length;
    }

    // Navigation
    navigateTo(page, pushState = true) {
        // Close dropdowns
        this.closeAccountDropdown();
        this.closeMobileMenu();

        // Scroll to top immediately
        window.scrollTo(0, 0);

        // Remove active class from all pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });

        // Add active class to target page
        const pageElement = document.getElementById(`${page}Page`);
        if (pageElement) {
            pageElement.classList.add('active');

            // Update URL without reloading
            if (pushState) {
                history.pushState({ page }, '', `#${page}`);
            }

            // Page-specific initialization
            if (page === 'settings') {
                this.loadSettingsForm();
            } else if (page === 'ingredients') {
                this.renderIngredientList(this.ingredients);
            } else if (page === 'recipes') {
                this.renderRecipeList(this.recipes);
            }
        }
    }

    // Account dropdown
    toggleAccountDropdown() {
        const dropdown = document.getElementById('accountDropdown');
        dropdown.classList.toggle('show');
    }

    closeAccountDropdown() {
        const dropdown = document.getElementById('accountDropdown');
        if (dropdown) dropdown.classList.remove('show');
    }

    // Mobile menu
    toggleMobileMenu() {
        const mobileMenu = document.getElementById('mobileMenu');
        mobileMenu.classList.toggle('show');
    }

    closeMobileMenu() {
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileMenu) mobileMenu.classList.remove('show');
    }

    // Setup event listeners
    setupEventListeners() {
        // Handle browser back/forward
        window.addEventListener('popstate', (event) => {
            const page = event.state?.page || 'home';
            this.navigateTo(page, false);
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.account-dropdown')) {
                this.closeAccountDropdown();
            }
        });

        // Recipe search
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterRecipes(e.target.value);
            });
        }

        // Summary checkbox
        const summaryCheckbox = document.getElementById('summaryCheckbox');
        if (summaryCheckbox) {
            summaryCheckbox.addEventListener('change', () => {
                if (this.selectedRecipeId) {
                    this.showRecipeDetails(this.selectedRecipeId);
                }
            });
        }

        // Settings form
        const settingsForm = document.getElementById('settingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => this.applySettings(e));
        }

        const useAgeCheckbox = document.getElementById('useAgeCheckbox');
        if (useAgeCheckbox) {
            useAgeCheckbox.addEventListener('change', (e) => {
                document.getElementById('ageInput').disabled = !e.target.checked;
            });
        }

        const kidneyRiskSelect = document.getElementById('kidneyRiskSelect');
        if (kidneyRiskSelect) {
            kidneyRiskSelect.addEventListener('change', () => this.updateKidneyRiskInfo());
        }

        // Ingredient search
        const ingredientSearchInput = document.getElementById('ingredientSearchInput');
        if (ingredientSearchInput) {
            ingredientSearchInput.addEventListener('input', (e) => {
                this.filterIngredients(e.target.value);
            });
        }

        // Recipe editor ingredient search
        const ingredientSearchBox = document.getElementById('ingredientSearchBox');
        if (ingredientSearchBox) {
            ingredientSearchBox.addEventListener('input', (e) => {
                this.handleIngredientSearch(e.target.value);
            });

            // Close search results when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.ingredient-search')) {
                    this.hideIngredientSearchResults();
                }
            });
        }

        // Escape key handler for closing edit panels
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const recipePanel = document.getElementById('recipeEditPanel');
                const ingredientPanel = document.getElementById('ingredientEditPanel');

                if (recipePanel && recipePanel.classList.contains('active')) {
                    this.closeRecipeEditor();
                } else if (ingredientPanel && ingredientPanel.classList.contains('active')) {
                    this.closeIngredientEditor();
                }
            }
        });
    }

    // Load all recipes
    async loadRecipes() {
        try {
            const response = await fetch('/api/recipes');
            const result = await response.json();

            if (result.success) {
                this.recipes = result.data;
                this.updateHomeCounts();
            }
        } catch (error) {
            console.error('Error loading recipes:', error);
            this.showError('Failed to load recipes');
        }
    }

    // Render recipe list with calories and oxalates
    renderRecipeList(recipesToShow) {
        const listElement = document.getElementById('recipeList');
        if (!listElement) return;

        listElement.innerHTML = '';

        if (recipesToShow.length === 0) {
            listElement.innerHTML = '<li class="no-results">No recipes found</li>';
            return;
        }

        recipesToShow.forEach(recipe => {
            const li = document.createElement('li');
            li.className = 'recipe-item';
            li.dataset.recipeId = recipe.id;
            li.textContent = recipe.name;

            // Add click handler
            li.addEventListener('click', () => {
                this.selectRecipe(recipe.id);
                this.showRecipeDetails(recipe.id);
            });

            listElement.appendChild(li);

            // Fetch summary data to show calories and oxalates (async)
            this.fetchRecipeSummary(recipe.id).then(data => {
                if (data) {
                    const calories = data.totals.calories || 0;
                    const caloriesPercent = ((calories / this.userSettings.caloriesPerDay) * 100).toFixed(0);
                    const oxalates = data.oxalateMg || 0;
                    const oxalateRisk = this.calculateOxalateRisk(oxalates);

                    li.innerHTML = `
                        <span class="recipe-name">${recipe.name}</span>
                        <span class="recipe-meta">
                            <span class="recipe-calories">${calories.toFixed(0)} cal (${caloriesPercent}%)</span>
                            <span class="recipe-oxalates" style="color: ${oxalateRisk.color}">${oxalates.toFixed(1)}mg ox</span>
                        </span>
                    `;

                    // Re-select if this is the selected recipe
                    if (recipe.id === this.selectedRecipeId) {
                        li.classList.add('selected');
                    }
                }
            });
        });
    }

    // Fetch recipe summary for list display
    async fetchRecipeSummary(recipeId) {
        try {
            const response = await fetch(`/api/recipes/${recipeId}?summary=true`);
            const result = await response.json();
            return result.success ? result.data : null;
        } catch (error) {
            console.error('Error fetching recipe summary:', error);
            return null;
        }
    }

    // Calculate oxalate risk
    calculateOxalateRisk(oxalateMg) {
        const maxOxalates = this.kidneyStoneRiskData[this.userSettings.kidneyStoneRisk]?.maxOxalatesPerDay || 200;
        const percent = (oxalateMg / maxOxalates) * 100;

        if (percent < 50) {
            return { status: 'safe', percent, color: '#27ae60', message: '' };
        } else if (percent < 100) {
            return {
                status: 'warning',
                percent,
                color: '#b8860b',
                message: `Approaching your daily oxalate limit (${maxOxalates}mg)`
            };
        } else {
            return {
                status: 'danger',
                percent,
                color: '#e74c3c',
                message: `Exceeds your daily oxalate limit (${maxOxalates}mg). This recipe contains ${oxalateMg.toFixed(1)}mg oxalates, which is ${(percent - 100).toFixed(0)}% over your ${this.userSettings.kidneyStoneRisk.toLowerCase()} risk limit.`
            };
        }
    }

    // Filter recipes based on search
    filterRecipes(searchTerm) {
        const term = searchTerm.toLowerCase().trim();

        if (!term) {
            this.renderRecipeList(this.recipes);
            return;
        }

        const filtered = this.recipes.filter(recipe =>
            recipe.name.toLowerCase().includes(term)
        );

        this.renderRecipeList(filtered);
    }

    // Select a recipe
    selectRecipe(recipeId) {
        document.querySelectorAll('.recipe-item').forEach(item => {
            item.classList.remove('selected');
        });

        const selectedItem = document.querySelector(`[data-recipe-id="${recipeId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }

        this.selectedRecipeId = recipeId;

        // Enable/disable edit and delete buttons
        const editBtn = document.getElementById('editRecipeBtn');
        const deleteBtn = document.getElementById('deleteRecipeBtn');
        if (editBtn) editBtn.disabled = false;
        if (deleteBtn) deleteBtn.disabled = false;
    }

    // Show recipe details with % daily values
    async showRecipeDetails(recipeId) {
        const summaryCheckbox = document.getElementById('summaryCheckbox');
        const summary = summaryCheckbox ? !summaryCheckbox.checked : true;

        try {
            const response = await fetch(`/api/recipes/${recipeId}?summary=${summary}`);
            const result = await response.json();

            if (result.success) {
                this.renderRecipeDetails(result.data);
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            console.error('Error loading recipe details:', error);
            this.showError('Failed to load recipe details');
        }
    }

    // Render recipe details with % daily values
    renderRecipeDetails(data) {
        const section = document.getElementById('recipeDetailsSection');
        const title = document.getElementById('recipeDetailsTitle');
        const content = document.getElementById('recipeDetailsContent');

        if (!section || !title || !content) return;

        title.textContent = `Recipe: ${data.name}`;

        let html = '<div class="details-content">';

        // Ingredient Contributions
        if (data.ingredients && data.ingredients.length > 0) {
            html += this.renderIngredientContributions(data);
        }

        // Nutritional Totals with % daily values
        html += '<div class="details-section">';
        html += '<h3>Nutritional Totals</h3>';
        html += '<table class="nutrition-table">';

        for (const [key, value] of Object.entries(data.totals)) {
            if (value === 0 && key !== 'oxalates') continue;

            const formattedValue = typeof value === 'number' ? value.toFixed(2) : value;
            let percentDaily = '';

            if (key === 'calories') {
                const percent = ((value / this.userSettings.caloriesPerDay) * 100).toFixed(1);
                percentDaily = ` (${percent}%)`;
            } else if (this.dailyRequirements[key]) {
                const req = this.dailyRequirements[key];
                let dailyValue = null;

                if (req.recommended) {
                    dailyValue = parseFloat(req.recommended);
                } else if (req.maximum) {
                    dailyValue = parseFloat(req.maximum);
                }

                if (dailyValue) {
                    const percent = ((value / dailyValue) * 100).toFixed(1);
                    percentDaily = ` (${percent}%)`;
                }
            }

            html += `<tr><td class="nutrient-name">${key}</td><td class="nutrient-value">${formattedValue}${percentDaily}</td></tr>`;
        }
        html += '</table>';
        html += '</div>';

        // Dietary Assessment with oxalate warning
        const oxalateRisk = this.calculateOxalateRisk(data.oxalateMg);

        html += '<div class="details-section">';
        html += '<h3>Dietary Assessment</h3>';
        html += `<p><strong>DASH Adherence:</strong> ${data.dashAdherence}</p>`;
        html += `<p><strong>Reasons:</strong> ${data.dashReasons}</p>`;
        html += `<p><strong>Oxalate Level:</strong> <span style="color: ${oxalateRisk.color}; font-weight: bold;">${data.oxalateLevel}</span> (${data.oxalateMg.toFixed(2)} mg)</p>`;

        if (oxalateRisk.message) {
            html += `<div class="oxalate-warning" style="border-left-color: ${oxalateRisk.color};">${oxalateRisk.message}</div>`;
        }
        html += '</div>';

        // Ingredient Details
        if (data.ingredients) {
            html += '<div class="details-section">';
            html += '<h3>Ingredient Details</h3>';
            for (const ingredient of data.ingredients) {
                html += `<div class="ingredient-detail">`;
                html += `<h4>${ingredient.name} (${ingredient.amount.toFixed(1)}g)</h4>`;
                html += '<table class="nutrition-table">';
                for (const [key, value] of Object.entries(ingredient.nutritionScaled)) {
                    if (value === 0 && key !== 'oxalates') continue;

                    const formattedValue = typeof value === 'number' ? value.toFixed(2) : value;
                    html += `<tr><td class="nutrient-name">${key}</td><td class="nutrient-value">${formattedValue}</td></tr>`;
                }
                html += '</table>';
                html += '</div>';
            }
            html += '</div>';
        }

        html += '</div>';
        content.innerHTML = html;
        section.style.display = 'block';
    }

    // Render ingredient contributions table
    renderIngredientContributions(data) {
        let html = '<div class="details-section contribution-section">';
        html += '<div class="contribution-header">';
        html += '<h3>Ingredient Contributions</h3>';
        html += '<button class="btn btn-secondary btn-small" onclick="window._client.toggleNutrientView()">';
        html += this.showAllNutrients ? 'Show Key Nutrients' : 'Show All Nutrients';
        html += '</button>';
        html += '</div>';

        const contributions = this.calculateContributions(data);

        if (this.showAllNutrients) {
            html += this.renderAllNutrientsTable(contributions, data);
        } else {
            html += this.renderKeyNutrientsTable(contributions, data);
        }

        html += '</div>';
        return html;
    }

    // Calculate percentage contributions for each ingredient
    calculateContributions(data) {
        const contributions = {};

        data.ingredients.forEach(ingredient => {
            contributions[ingredient.name] = {
                amount: ingredient.amount,
                nutrients: {}
            };

            for (const [nutrient, value] of Object.entries(ingredient.nutritionScaled)) {
                const total = data.totals[nutrient] || 0;
                const percent = total > 0 ? (value / total * 100) : 0;
                contributions[ingredient.name].nutrients[nutrient] = {
                    value: value,
                    percent: percent
                };
            }
        });

        return contributions;
    }

    // Render key nutrients table
    renderKeyNutrientsTable(contributions, data) {
        let html = '<table class="contribution-table">';
        html += '<thead><tr>';
        html += '<th>Ingredient</th>';
        html += '<th>Amount</th>';
        html += '<th>Calories</th>';
        html += '<th>Sodium</th>';
        html += '<th>Oxalates</th>';
        html += '</tr></thead>';
        html += '<tbody>';

        data.ingredients.forEach(ingredient => {
            const contrib = contributions[ingredient.name];
            html += '<tr>';
            html += `<td class="ing-name">${ingredient.name}</td>`;
            html += `<td class="ing-amount">${ingredient.amount.toFixed(1)}g</td>`;

            const cal = contrib.nutrients.calories || { value: 0, percent: 0 };
            html += `<td>${cal.value.toFixed(0)} (${cal.percent.toFixed(0)}%)</td>`;

            const sodium = contrib.nutrients.sodium || { value: 0, percent: 0 };
            html += `<td>${sodium.value.toFixed(1)}mg (${sodium.percent.toFixed(0)}%)</td>`;

            const ox = contrib.nutrients.oxalates || { value: 0, percent: 0 };
            html += `<td>${ox.value.toFixed(2)}mg (${ox.percent.toFixed(0)}%)</td>`;

            html += '</tr>';
        });

        html += '<tr class="totals-row">';
        html += '<td colspan="2"><strong>Total:</strong></td>';
        html += `<td><strong>${(data.totals.calories || 0).toFixed(0)}</strong></td>`;
        html += `<td><strong>${(data.totals.sodium || 0).toFixed(1)}mg</strong></td>`;
        html += `<td><strong>${data.oxalateMg.toFixed(2)}mg</strong></td>`;
        html += '</tr>';

        html += '</tbody></table>';
        return html;
    }

    // Render all nutrients table with pagination
    renderAllNutrientsTable(contributions, data) {
        const allNutrients = new Set();
        Object.values(contributions).forEach(contrib => {
            Object.keys(contrib.nutrients).forEach(nutrient => {
                allNutrients.add(nutrient);
            });
        });

        const activeNutrients = Array.from(allNutrients).filter(nutrient => {
            return Object.values(contributions).some(contrib => {
                const val = contrib.nutrients[nutrient];
                return val && val.value > 0;
            });
        });

        const startIdx = this.currentNutrientPage * this.NUTRIENTS_PER_PAGE;
        const endIdx = Math.min(startIdx + this.NUTRIENTS_PER_PAGE, activeNutrients.length);
        const pageNutrients = activeNutrients.slice(startIdx, endIdx);
        const totalPages = Math.ceil(activeNutrients.length / this.NUTRIENTS_PER_PAGE);

        let html = '';

        if (totalPages > 1) {
            html += '<div class="pagination-controls">';
            html += `<button class="btn btn-secondary btn-small" onclick="window._client.prevNutrientPage()" ${this.currentNutrientPage === 0 ? 'disabled' : ''}>← Prev</button>`;
            html += `<span class="page-info">Page ${this.currentNutrientPage + 1} of ${totalPages}</span>`;
            html += `<button class="btn btn-secondary btn-small" onclick="window._client.nextNutrientPage()" ${this.currentNutrientPage >= totalPages - 1 ? 'disabled' : ''}>Next →</button>`;
            html += '</div>';
        }

        html += '<div class="table-scroll">';
        html += '<table class="contribution-table">';
        html += '<thead><tr>';
        html += '<th>Ingredient</th>';
        html += '<th>Amount</th>';

        pageNutrients.forEach(nutrient => {
            html += `<th>${nutrient.replace(/_/g, ' ')}</th>`;
        });

        html += '</tr></thead>';
        html += '<tbody>';

        data.ingredients.forEach(ingredient => {
            const contrib = contributions[ingredient.name];
            html += '<tr>';
            html += `<td class="ing-name">${ingredient.name}</td>`;
            html += `<td class="ing-amount">${ingredient.amount.toFixed(1)}g</td>`;

            pageNutrients.forEach(nutrient => {
                const n = contrib.nutrients[nutrient] || { value: 0, percent: 0 };
                if (nutrient === 'calories') {
                    html += `<td>${n.value.toFixed(0)} (${n.percent.toFixed(0)}%)</td>`;
                } else {
                    html += `<td>${n.value.toFixed(1)} (${n.percent.toFixed(0)}%)</td>`;
                }
            });

            html += '</tr>';
        });

        html += '<tr class="totals-row">';
        html += '<td colspan="2"><strong>Total:</strong></td>';

        pageNutrients.forEach(nutrient => {
            const total = data.totals[nutrient] || 0;
            if (nutrient === 'calories') {
                html += `<td><strong>${total.toFixed(0)}</strong></td>`;
            } else {
                html += `<td><strong>${total.toFixed(1)}</strong></td>`;
            }
        });

        html += '</tr>';
        html += '</tbody></table>';
        html += '</div>';

        return html;
    }

    // Navigation functions
    toggleNutrientView() {
        this.showAllNutrients = !this.showAllNutrients;
        this.currentNutrientPage = 0;
        if (this.selectedRecipeId) {
            this.showRecipeDetails(this.selectedRecipeId);
        }
    }

    prevNutrientPage() {
        if (this.currentNutrientPage > 0) {
            this.currentNutrientPage--;
            if (this.selectedRecipeId) {
                this.showRecipeDetails(this.selectedRecipeId);
            }
        }
    }

    nextNutrientPage() {
        this.currentNutrientPage++;
        if (this.selectedRecipeId) {
            this.showRecipeDetails(this.selectedRecipeId);
        }
    }

    // Settings page functions
    loadSettingsForm() {
        const caloriesPerDayInput = document.getElementById('caloriesPerDayInput');
        const useAgeCheckbox = document.getElementById('useAgeCheckbox');
        const ageInput = document.getElementById('ageInput');
        const kidneyRiskSelect = document.getElementById('kidneyRiskSelect');

        if (caloriesPerDayInput) caloriesPerDayInput.value = this.userSettings.caloriesPerDay;
        if (useAgeCheckbox) useAgeCheckbox.checked = this.userSettings.useAge;
        if (ageInput) {
            ageInput.value = this.userSettings.age || '';
            ageInput.disabled = !this.userSettings.useAge;
        }
        if (kidneyRiskSelect) kidneyRiskSelect.value = this.userSettings.kidneyStoneRisk;

        this.updateKidneyRiskInfo();
    }

    updateKidneyRiskInfo() {
        const select = document.getElementById('kidneyRiskSelect');
        const info = document.getElementById('kidneyRiskInfo');

        if (!select || !info) return;

        const riskLevel = select.value;
        const data = this.kidneyStoneRiskData[riskLevel];

        if (data) {
            info.textContent = `Maximum ${data.maxOxalatesPerDay}mg oxalates per day - ${data.description}`;
        }
    }

    applySettings(e) {
        e.preventDefault();

        this.userSettings.caloriesPerDay = parseInt(document.getElementById('caloriesPerDayInput').value);
        this.userSettings.useAge = document.getElementById('useAgeCheckbox').checked;
        this.userSettings.age = this.userSettings.useAge ? parseInt(document.getElementById('ageInput').value) : null;
        this.userSettings.kidneyStoneRisk = document.getElementById('kidneyRiskSelect').value;

        this.saveUserSettings();
        this.loadRecipes();
        this.navigateTo('home');
    }

    cancelSettings() {
        this.navigateTo('home');
    }

    // Ingredients page functions
    async loadIngredients() {
        try {
            const response = await fetch('/api/ingredients');
            const result = await response.json();

            if (result.success) {
                this.ingredients = result.data;
                this.updateHomeCounts();
            }
        } catch (error) {
            console.error('Error loading ingredients:', error);
        }
    }

    filterIngredients(searchTerm) {
        const term = searchTerm.toLowerCase().trim();

        if (!term) {
            this.renderIngredientList(this.ingredients);
            return;
        }

        const filtered = this.ingredients.filter(ing =>
            ing.name.toLowerCase().includes(term)
        );

        this.renderIngredientList(filtered);
    }

    renderIngredientList(ingredientsToShow) {
        const listElement = document.getElementById('ingredientList');
        if (!listElement) return;

        listElement.innerHTML = '';

        if (ingredientsToShow.length === 0) {
            listElement.innerHTML = '<li class="no-results">No ingredients found</li>';
            return;
        }

        ingredientsToShow.forEach(ingredient => {
            const li = document.createElement('li');
            li.className = 'ingredient-item';
            li.innerHTML = `
                <span class="ingredient-name">${ingredient.name}</span>
                <span class="ingredient-compact">${ingredient.compact.display}</span>
            `;

            li.addEventListener('click', () => {
                this.selectIngredient(ingredient.id);
                this.showIngredientDetails(ingredient.id);
            });

            listElement.appendChild(li);
        });
    }

    selectIngredient(ingredientId) {
        document.querySelectorAll('.ingredient-item').forEach(item => {
            item.classList.remove('selected');
        });

        const selectedItem = document.querySelector(`.ingredient-item:nth-child(${this.ingredients.findIndex(i => i.id === ingredientId) + 1})`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }

        this.selectedIngredientId = ingredientId;

        const editBtn = document.getElementById('editIngredientBtn');
        const deleteBtn = document.getElementById('deleteIngredientBtn');
        if (editBtn) editBtn.disabled = false;
        if (deleteBtn) deleteBtn.disabled = false;
    }

    async showIngredientDetails(brandId) {
        try {
            const response = await fetch(`/api/ingredients/${brandId}`);
            const result = await response.json();

            if (result.success) {
                this.renderIngredientDetails(result.data);
            }
        } catch (error) {
            console.error('Error loading ingredient details:', error);
        }
    }

    renderIngredientDetails(data) {
        const section = document.getElementById('ingredientDetailsSection');
        const title = document.getElementById('ingredientDetailsTitle');
        const content = document.getElementById('ingredientDetailsContent');

        if (!section || !title || !content) return;

        title.textContent = data.name;

        let html = '<div class="details-content">';

        html += '<div class="details-section">';
        html += `<p><strong>Serving Size:</strong> ${data.serving} (${data.gramsPerServing.toFixed(1)}g)</p>`;
        if (data.density) {
            html += `<p><strong>Density:</strong> ${data.density} g/ml</p>`;
        }
        html += '</div>';

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

    // Error display
    showError(message) {
        const content = document.getElementById('recipeDetailsContent');
        if (content) {
            content.innerHTML = `<div class="error-message">${message}</div>`;
            const section = document.getElementById('recipeDetailsSection');
            if (section) section.style.display = 'block';
        }
    }

    // ===== RECIPE EDITOR FUNCTIONS =====

    createRecipe() {
        this.editingRecipeId = null;
        this.selectedIngredientsForRecipe = [];

        document.getElementById('editPanelTitle').textContent = 'Create New Recipe';
        document.getElementById('recipeNameInput').value = '';
        document.getElementById('ingredientSearchBox').value = '';

        this.renderSelectedIngredients();
        this.openRecipeEditor();
    }

    async editRecipe() {
        if (!this.selectedRecipeId) return;

        this.editingRecipeId = this.selectedRecipeId;

        try {
            const response = await fetch(`/api/recipes/${this.selectedRecipeId}/full`);
            const result = await response.json();

            if (result.success) {
                const recipe = result.data;

                document.getElementById('editPanelTitle').textContent = 'Edit Recipe';
                document.getElementById('recipeNameInput').value = recipe.name;
                document.getElementById('ingredientSearchBox').value = '';

                this.selectedIngredientsForRecipe = recipe.ingredients.map(ing => ({
                    brandId: ing.brandId,
                    name: ing.brandName,
                    amount: ing.amount,
                    unit: ing.unit
                }));

                this.renderSelectedIngredients();
                this.openRecipeEditor();
            }
        } catch (error) {
            console.error('Error loading recipe for editing:', error);
            alert('Failed to load recipe details');
        }
    }

    async deleteRecipe() {
        if (!this.selectedRecipeId) return;

        const recipe = this.recipes.find(r => r.id === this.selectedRecipeId);
        if (!recipe) return;

        if (!confirm(`Delete recipe "${recipe.name}"? This cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/recipes/${this.selectedRecipeId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                await this.loadRecipes();
                this.renderRecipeList(this.recipes);

                this.selectedRecipeId = null;
                document.getElementById('editRecipeBtn').disabled = true;
                document.getElementById('deleteRecipeBtn').disabled = true;
                document.getElementById('recipeDetailsSection').style.display = 'none';

                alert('Recipe deleted successfully');
            } else {
                alert('Failed to delete recipe: ' + result.error);
            }
        } catch (error) {
            console.error('Error deleting recipe:', error);
            alert('Failed to delete recipe');
        }
    }

    openRecipeEditor() {
        const panel = document.getElementById('recipeEditPanel');
        if (panel) {
            panel.classList.add('active');
        }
    }

    closeRecipeEditor() {
        const panel = document.getElementById('recipeEditPanel');
        if (panel) {
            panel.classList.remove('active');
        }

        this.editingRecipeId = null;
        this.selectedIngredientsForRecipe = [];
        document.getElementById('recipeNameInput').value = '';
        document.getElementById('ingredientSearchBox').value = '';
        this.hideIngredientSearchResults();
        this.clearErrors();
    }

    async saveRecipe(event) {
        event.preventDefault();

        const recipeName = document.getElementById('recipeNameInput').value.trim();
        if (!recipeName) {
            this.showErrorMessage('recipeNameError', 'Recipe name is required');
            return;
        }

        if (this.selectedIngredientsForRecipe.length === 0) {
            this.showErrorMessage('ingredientsError', 'At least one ingredient is required');
            return;
        }

        for (const ing of this.selectedIngredientsForRecipe) {
            if (!ing.amount || ing.amount <= 0) {
                this.showErrorMessage('ingredientsError', 'All ingredients must have valid amounts');
                return;
            }
        }

        this.clearErrors();

        const payload = {
            name: recipeName,
            ingredients: this.selectedIngredientsForRecipe.map(ing => ({
                brandId: ing.brandId,
                amount: parseFloat(ing.amount),
                unit: ing.unit
            }))
        };

        try {
            const url = this.editingRecipeId
                ? `/api/recipes/${this.editingRecipeId}`
                : '/api/recipes';
            const method = this.editingRecipeId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.success) {
                await this.loadRecipes();
                this.renderRecipeList(this.recipes);

                if (this.editingRecipeId) {
                    alert('Recipe updated successfully');
                    this.selectRecipe(this.editingRecipeId);
                    await this.showRecipeDetails(this.editingRecipeId);
                } else {
                    alert('Recipe created successfully');
                    const newRecipe = this.recipes.find(r => r.name === recipeName);
                    if (newRecipe) {
                        this.selectRecipe(newRecipe.id);
                        await this.showRecipeDetails(newRecipe.id);
                    }
                }

                this.closeRecipeEditor();
            } else {
                this.showErrorMessage('ingredientsError', result.error || 'Failed to save recipe');
            }
        } catch (error) {
            console.error('Error saving recipe:', error);
            this.showErrorMessage('ingredientsError', 'Failed to save recipe');
        }
    }

    // Ingredient search for recipe editor
    handleIngredientSearch(searchTerm) {
        clearTimeout(this.ingredientSearchTimeout);

        if (!searchTerm || searchTerm.trim().length < 2) {
            this.hideIngredientSearchResults();
            return;
        }

        this.ingredientSearchTimeout = setTimeout(() => {
            this.performIngredientSearch(searchTerm.trim());
        }, 300);
    }

    async performIngredientSearch(searchTerm) {
        try {
            const response = await fetch(`/api/ingredients?search=${encodeURIComponent(searchTerm)}`);
            const result = await response.json();

            if (result.success) {
                this.displayIngredientSearchResults(result.data);
            }
        } catch (error) {
            console.error('Error searching ingredients:', error);
        }
    }

    displayIngredientSearchResults(results) {
        const resultsContainer = document.getElementById('ingredientSearchResults');
        if (!resultsContainer) return;

        if (results.length === 0) {
            resultsContainer.innerHTML = '<div class="search-result-item">No ingredients found</div>';
            resultsContainer.classList.add('show');
            return;
        }

        resultsContainer.innerHTML = '';

        results.forEach(ingredient => {
            const alreadyAdded = this.selectedIngredientsForRecipe.some(ing => ing.brandId === ingredient.id);

            const item = document.createElement('div');
            item.className = 'search-result-item';
            if (alreadyAdded) item.classList.add('selected');
            item.textContent = ingredient.name;

            if (!alreadyAdded) {
                item.style.cursor = 'pointer';
                item.addEventListener('click', () => {
                    this.addIngredientToRecipe(ingredient);
                });
            } else {
                item.style.opacity = '0.5';
                item.style.cursor = 'not-allowed';
                item.title = 'Already added';
            }

            resultsContainer.appendChild(item);
        });

        resultsContainer.classList.add('show');
    }

    hideIngredientSearchResults() {
        const resultsContainer = document.getElementById('ingredientSearchResults');
        if (resultsContainer) {
            resultsContainer.classList.remove('show');
        }
    }

    addIngredientToRecipe(ingredient) {
        if (this.selectedIngredientsForRecipe.some(ing => ing.brandId === ingredient.id)) {
            return;
        }

        this.selectedIngredientsForRecipe.push({
            brandId: ingredient.id,
            name: ingredient.name,
            amount: 100,
            unit: 'g'
        });

        this.renderSelectedIngredients();
        this.hideIngredientSearchResults();

        document.getElementById('ingredientSearchBox').value = '';
    }

    removeIngredientFromRecipe(index) {
        this.selectedIngredientsForRecipe.splice(index, 1);
        this.renderSelectedIngredients();
    }

    updateIngredientAmount(index, amount) {
        this.selectedIngredientsForRecipe[index].amount = amount;
    }

    updateIngredientUnit(index, unit) {
        this.selectedIngredientsForRecipe[index].unit = unit;
    }

    renderSelectedIngredients() {
        const container = document.getElementById('ingredientRows');
        if (!container) return;

        if (this.selectedIngredientsForRecipe.length === 0) {
            container.innerHTML = '<div class="no-ingredients-message">No ingredients added yet</div>';
            return;
        }

        container.innerHTML = '';

        this.selectedIngredientsForRecipe.forEach((ingredient, index) => {
            const row = document.createElement('div');
            row.className = 'ingredient-row';

            row.innerHTML = `
                <span class="ingredient-name" title="${ingredient.name}">${ingredient.name}</span>
                <input 
                    type="number" 
                    class="amount-input" 
                    value="${ingredient.amount}" 
                    min="0.01" 
                    step="0.01"
                    onchange="window._client.updateIngredientAmount(${index}, this.value)"
                >
                <select 
                    class="unit-select"
                    onchange="window._client.updateIngredientUnit(${index}, this.value)"
                >
                    <option value="g" ${ingredient.unit === 'g' ? 'selected' : ''}>g</option>
                    <option value="ml" ${ingredient.unit === 'ml' ? 'selected' : ''}>ml</option>
                    <option value="mg" ${ingredient.unit === 'mg' ? 'selected' : ''}>mg</option>
                    <option value="mcg" ${ingredient.unit === 'mcg' ? 'selected' : ''}>mcg</option>
                </select>
                <button 
                    type="button"
                    class="remove-btn" 
                    onclick="window._client.removeIngredientFromRecipe(${index})"
                    title="Remove ingredient"
                >&times;</button>
            `;

            container.appendChild(row);
        });
    }

    showErrorMessage(elementId, message) {
        const errorEl = document.getElementById(elementId);
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.add('show');
        }
    }

    clearErrors() {
        document.querySelectorAll('.error-text').forEach(el => {
            el.textContent = '';
            el.classList.remove('show');
        });
    }

    // ===== INGREDIENT EDITOR FUNCTIONS =====

    createIngredient() {
        this.editingIngredientId = null;

        document.getElementById('ingredientEditPanelTitle').textContent = 'Create New Ingredient';

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

        this.clearErrors();
        this.openIngredientEditor();
    }

    async editIngredient() {
        if (!this.selectedIngredientId) return;

        this.editingIngredientId = this.selectedIngredientId;

        try {
            const response = await fetch(`/api/ingredients/${this.selectedIngredientId}/full`);
            const result = await response.json();

            if (result.success) {
                const ingredient = result.data;

                document.getElementById('ingredientEditPanelTitle').textContent = 'Edit Ingredient';
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

                this.clearErrors();
                this.openIngredientEditor();
            }
        } catch (error) {
            console.error('Error loading ingredient for editing:', error);
            alert('Failed to load ingredient details');
        }
    }

    async deleteIngredient() {
        if (!this.selectedIngredientId) return;

        const ingredient = this.ingredients.find(i => i.id === this.selectedIngredientId);
        if (!ingredient) return;

        if (!confirm(`Delete ingredient "${ingredient.name}"? This cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/ingredients/${this.selectedIngredientId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                await this.loadIngredients();
                this.renderIngredientList(this.ingredients);

                this.selectedIngredientId = null;
                document.getElementById('editIngredientBtn').disabled = true;
                document.getElementById('deleteIngredientBtn').disabled = true;
                document.getElementById('ingredientDetailsSection').style.display = 'none';

                alert('Ingredient deleted successfully');
            } else {
                alert('Failed to delete ingredient: ' + result.error);
            }
        } catch (error) {
            console.error('Error deleting ingredient:', error);
            alert('Failed to delete ingredient');
        }
    }

    openIngredientEditor() {
        const panel = document.getElementById('ingredientEditPanel');
        if (panel) {
            panel.classList.add('active');
        }
    }

    closeIngredientEditor() {
        const panel = document.getElementById('ingredientEditPanel');
        if (panel) {
            panel.classList.remove('active');
        }

        this.editingIngredientId = null;
        this.clearErrors();
    }

    async saveIngredient(event) {
        event.preventDefault();

        const name = document.getElementById('ingredientNameInput').value.trim();
        const serving = parseFloat(document.getElementById('servingSizeInput').value);
        const servingUnit = document.getElementById('servingUnitSelect').value;
        const density = parseFloat(document.getElementById('densityInput').value) || null;
        const oxalatePerGram = parseFloat(document.getElementById('oxalateInput').value) || 0;

        if (!name) {
            this.showErrorMessage('ingredientNameError', 'Ingredient name is required');
            return;
        }

        if (!serving || serving <= 0) {
            this.showErrorMessage('ingredientNameError', 'Valid serving size is required');
            return;
        }

        this.clearErrors();

        const data = {};

        const addIfPresent = (id, field) => {
            const element = document.getElementById(id);
            if (!element) return;

            const value = element.value;
            if (value !== null && value !== undefined && value !== '') {
                const numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                    const unit = Client.INGREDIENT_PROPS[field]?.unit
                    if (!unit) {
                        this.showErrorMessage('ingredientNameError', `No standard unit found for ${field}`)
                    }
                    data[field] = (unit == "none" ? numValue :`${numValue} ${unit}`);
                }
            }
        };

        addIfPresent('caloriesInput', 'calories');
        addIfPresent('sodiumInput', 'sodium');
        addIfPresent('cholesterolInput', 'cholesterol');
        addIfPresent('sugarsInput', 'sugars');
        addIfPresent('proteinInput', 'protein');
        addIfPresent('dietaryFiberInput', 'dietary_fiber');
        addIfPresent('carbohydratesInput', 'carbohydrates');
        addIfPresent('calciumInput', 'calcium');
        addIfPresent('potassiumInput', 'potassium');
        addIfPresent('magnesiumInput', 'magnesium');
        addIfPresent('seleniumInput', 'selenium');
        addIfPresent('manganeseInput', 'manganese');
        addIfPresent('zincInput', 'zinc');
        addIfPresent('ironInput', 'iron');
        addIfPresent('fatInput', 'fat');
        addIfPresent('saturatedFatInput', 'saturated_fat');
        addIfPresent('polysaturatedFatInput', 'polysaturated_fat');
        addIfPresent('monosaturatedFatInput', 'monosaturated_fat');
        addIfPresent('thiaminInput', 'thiamin');
        addIfPresent('riboflavinInput', 'riboflavin');
        addIfPresent('niacinInput', 'niacin');
        addIfPresent('folicAcidInput', 'folic_acid');
        addIfPresent('phosphorusInput', 'phosphorus');
        addIfPresent('vitaminAInput', 'vitamin_a');
        addIfPresent('vitaminB6Input', 'vitamin_b6');
        addIfPresent('vitaminCInput', 'vitamin_c');
        addIfPresent('vitaminDInput', 'vitamin_d');
        addIfPresent('vitaminEInput', 'vitamin_e');
        addIfPresent('vitaminKInput', 'vitamin_k');

        const payload = {
            name,
            serving,
            servingUnit,
            density,
            oxalatePerGram,
            data
        };

        try {
            const url = this.editingIngredientId
                ? `/api/ingredients/${this.editingIngredientId}`
                : '/api/ingredients';
            const method = this.editingIngredientId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.success) {
                await this.loadIngredients();
                this.renderIngredientList(this.ingredients);

                if (this.editingIngredientId) {
                    alert('Ingredient updated successfully');
                    await this.showIngredientDetails(this.editingIngredientId);
                    this.selectIngredient(this.editingIngredientId);
                } else {
                    alert('Ingredient created successfully');
                    const newIngredient = this.ingredients.find(i => i.name === name);
                    if (newIngredient) {
                        await this.showIngredientDetails(newIngredient.id);
                        this.selectIngredient(newIngredient.id);
                    }
                }

                this.closeIngredientEditor();
            } else {
                this.showErrorMessage('ingredientNameError', result.error || 'Failed to save ingredient');
            }
        } catch (error) {
            console.error('Error saving ingredient:', error);
            this.showErrorMessage('ingredientNameError', 'Failed to save ingredient');
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window._client = new Client();
    window._client.init();
});
