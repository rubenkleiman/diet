// Diet Guidelines Client - Complete Rewrite
// State management
let recipes = [];
let ingredients = [];
let selectedRecipeId = null;
let selectedIngredientId = null;
let config = {};
let kidneyStoneRiskData = {};
let dailyRequirements = {};
let userSettings = {
    caloriesPerDay: 2000,
    age: null,
    useAge: false,
    kidneyStoneRisk: 'Normal'
};

// Recipe editor state
let editingRecipeId = null;
let selectedIngredientsForRecipe = []; // Array of {brandId, name, amount, unit}
let ingredientSearchTimeout = null;

// Initialize app
async function init() {
    loadUserSettings();
    await loadConfig();
    await loadKidneyStoneRiskData();
    await loadDailyRequirements();
    await loadRecipes();
    await loadIngredients();
    setupEventListeners();
    
    // Update home page counts
    updateHomeCounts();
    
    // Handle initial page from URL or default to home
    const page = window.location.hash.slice(1) || 'home';
    navigateTo(page, false);
}

// Load user settings from localStorage
function loadUserSettings() {
    const saved = localStorage.getItem('userSettings');
    if (saved) {
        userSettings = JSON.parse(saved);
    }
}

// Save user settings to localStorage
function saveUserSettings() {
    localStorage.setItem('userSettings', JSON.stringify(userSettings));
}

// Load configuration
async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        const result = await response.json();
        if (result.success) {
            config = result.data;
            applyConfig();
        }
    } catch (error) {
        console.error('Error loading config:', error);
    }
}

// Load kidney stone risk data
async function loadKidneyStoneRiskData() {
    try {
        const response = await fetch('/api/kidney-stone-risk');
        const result = await response.json();
        if (result.success) {
            kidneyStoneRiskData = result.data;
        }
    } catch (error) {
        console.error('Error loading kidney stone risk data:', error);
    }
}

// Load daily requirements
async function loadDailyRequirements() {
    try {
        const response = await fetch('/api/daily-requirements');
        const result = await response.json();
        if (result.success) {
            dailyRequirements = result.data;
        }
    } catch (error) {
        console.error('Error loading daily requirements:', error);
    }
}

// Apply configuration to UI
function applyConfig() {
    if (config.ui?.recipeListMaxHeight) {
        const container = document.getElementById('recipeListContainer');
        if (container) container.style.maxHeight = config.ui.recipeListMaxHeight;
    }
    if (config.ui?.recipeDetailsMaxHeight) {
        const content = document.getElementById('recipeDetailsContent');
        if (content) content.style.maxHeight = config.ui.recipeDetailsMaxHeight;
    }
}

// Update home page counts
function updateHomeCounts() {
    const recipeCountEl = document.getElementById('recipeCount');
    const ingredientCountEl = document.getElementById('ingredientCount');
    
    if (recipeCountEl) recipeCountEl.textContent = recipes.length;
    if (ingredientCountEl) ingredientCountEl.textContent = ingredients.length;
}

// Navigation - FIXED: Properly switch pages using class toggle
function navigateTo(page, pushState = true) {
    // Close dropdowns
    closeAccountDropdown();
    closeMobileMenu();
    
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
            loadSettingsForm();
        } else if (page === 'ingredients') {
            renderIngredientList(ingredients);
        } else if (page === 'recipes') {
            renderRecipeList(recipes);
        }
    }
}

// Handle browser back/forward
window.addEventListener('popstate', (event) => {
    const page = event.state?.page || 'home';
    navigateTo(page, false);
});

// Account dropdown
function toggleAccountDropdown() {
    const dropdown = document.getElementById('accountDropdown');
    dropdown.classList.toggle('show');
}

function closeAccountDropdown() {
    const dropdown = document.getElementById('accountDropdown');
    if (dropdown) dropdown.classList.remove('show');
}

// Mobile menu
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    mobileMenu.classList.toggle('show');
}

function closeMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu) mobileMenu.classList.remove('show');
}

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.account-dropdown')) {
        closeAccountDropdown();
    }
});

// Setup event listeners
function setupEventListeners() {
    // Recipe search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterRecipes(e.target.value);
        });
    }

    // Summary checkbox
    const summaryCheckbox = document.getElementById('summaryCheckbox');
    if (summaryCheckbox) {
        summaryCheckbox.addEventListener('change', () => {
            if (selectedRecipeId) {
                showRecipeDetails(selectedRecipeId);
            }
        });
    }

    // Settings form
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', applySettings);
    }
    
    const useAgeCheckbox = document.getElementById('useAgeCheckbox');
    if (useAgeCheckbox) {
        useAgeCheckbox.addEventListener('change', (e) => {
            document.getElementById('ageInput').disabled = !e.target.checked;
        });
    }

    const kidneyRiskSelect = document.getElementById('kidneyRiskSelect');
    if (kidneyRiskSelect) {
        kidneyRiskSelect.addEventListener('change', updateKidneyRiskInfo);
    }

    // Ingredient search
    const ingredientSearchInput = document.getElementById('ingredientSearchInput');
    if (ingredientSearchInput) {
        ingredientSearchInput.addEventListener('input', (e) => {
            filterIngredients(e.target.value);
        });
    }

    // Recipe editor ingredient search
    const ingredientSearchBox = document.getElementById('ingredientSearchBox');
    if (ingredientSearchBox) {
        ingredientSearchBox.addEventListener('input', (e) => {
            handleIngredientSearch(e.target.value);
        });
        
        // Close search results when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.ingredient-search')) {
                hideIngredientSearchResults();
            }
        });
    }
}

// Load all recipes
async function loadRecipes() {
    try {
        const response = await fetch('/api/recipes');
        const result = await response.json();
        
        if (result.success) {
            recipes = result.data;
            updateHomeCounts();
        }
    } catch (error) {
        console.error('Error loading recipes:', error);
        showError('Failed to load recipes');
    }
}

// Render recipe list with calories and oxalates
function renderRecipeList(recipesToShow) {
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
        li.textContent = recipe.name; // Set initial text immediately
        
        // Add click handler
        li.addEventListener('click', () => {
            selectRecipe(recipe.id);
            showRecipeDetails(recipe.id);
        });
        
        listElement.appendChild(li);
        
        // Fetch summary data to show calories and oxalates (async)
        fetchRecipeSummary(recipe.id).then(data => {
            if (data) {
                const calories = data.totals.calories || 0;
                const caloriesPercent = ((calories / userSettings.caloriesPerDay) * 100).toFixed(0);
                const oxalates = data.oxalateMg || 0;
                const oxalateRisk = calculateOxalateRisk(oxalates);
                
                li.innerHTML = `
                    <span class="recipe-name">${recipe.name}</span>
                    <span class="recipe-meta">
                        <span class="recipe-calories">${calories.toFixed(0)} cal (${caloriesPercent}%)</span>
                        <span class="recipe-oxalates" style="color: ${oxalateRisk.color}">${oxalates.toFixed(1)}mg ox</span>
                    </span>
                `;
                
                // Re-select if this is the selected recipe
                if (recipe.id === selectedRecipeId) {
                    li.classList.add('selected');
                }
            }
        });
    });
}

// Fetch recipe summary for list display
async function fetchRecipeSummary(recipeId) {
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
function calculateOxalateRisk(oxalateMg) {
    const maxOxalates = kidneyStoneRiskData[userSettings.kidneyStoneRisk]?.maxOxalatesPerDay || 200;
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
            message: `Exceeds your daily oxalate limit (${maxOxalates}mg). This recipe contains ${oxalateMg.toFixed(1)}mg oxalates, which is ${(percent - 100).toFixed(0)}% over your ${userSettings.kidneyStoneRisk.toLowerCase()} risk limit.`
        };
    }
}

// Filter recipes based on search
function filterRecipes(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    
    if (!term) {
        renderRecipeList(recipes);
        return;
    }

    const filtered = recipes.filter(recipe => 
        recipe.name.toLowerCase().includes(term)
    );
    
    renderRecipeList(filtered);
}

// Select a recipe
function selectRecipe(recipeId) {
    document.querySelectorAll('.recipe-item').forEach(item => {
        item.classList.remove('selected');
    });

    const selectedItem = document.querySelector(`[data-recipe-id="${recipeId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }

    selectedRecipeId = recipeId;
    
    // Enable/disable edit and delete buttons
    const editBtn = document.getElementById('editRecipeBtn');
    const deleteBtn = document.getElementById('deleteRecipeBtn');
    if (editBtn) editBtn.disabled = false;
    if (deleteBtn) deleteBtn.disabled = false;
}

// Show recipe details with % daily values
async function showRecipeDetails(recipeId) {
    const summaryCheckbox = document.getElementById('summaryCheckbox');
    const summary = summaryCheckbox ? summaryCheckbox.checked : false;
    
    try {
        const response = await fetch(`/api/recipes/${recipeId}?summary=${summary}`);
        const result = await response.json();
        
        if (result.success) {
            renderRecipeDetails(result.data);
        } else {
            showError(result.error);
        }
    } catch (error) {
        console.error('Error loading recipe details:', error);
        showError('Failed to load recipe details');
    }
}

// Render recipe details with % daily values
function renderRecipeDetails(data) {
    const section = document.getElementById('recipeDetailsSection');
    const title = document.getElementById('recipeDetailsTitle');
    const content = document.getElementById('recipeDetailsContent');

    if (!section || !title || !content) return;

    title.textContent = `Recipe: ${data.name}`;
    
    let html = '<div class="details-content">';
    
    // Nutritional Totals with % daily values
    html += '<div class="details-section">';
    html += '<h3>Nutritional Totals</h3>';
    html += '<table class="nutrition-table">';
    
    for (const [key, value] of Object.entries(data.totals)) {
        // Skip zero values except for oxalates
        if (value === 0 && key !== 'oxalates') continue;
        
        const formattedValue = typeof value === 'number' ? value.toFixed(2) : value;
        let percentDaily = '';
        
        // Calculate % daily value
        if (key === 'calories') {
            const percent = ((value / userSettings.caloriesPerDay) * 100).toFixed(1);
            percentDaily = ` (${percent}%)`;
        } else if (dailyRequirements[key]) {
            const req = dailyRequirements[key];
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
    const oxalateRisk = calculateOxalateRisk(data.oxalateMg);
    
    html += '<div class="details-section">';
    html += '<h3>Dietary Assessment</h3>';
    html += `<p><strong>DASH Adherence:</strong> ${data.dashAdherence}</p>`;
    html += `<p><strong>Reasons:</strong> ${data.dashReasons}</p>`;
    html += `<p><strong>Oxalate Level:</strong> <span style="color: ${oxalateRisk.color}; font-weight: bold;">${data.oxalateLevel}</span> (${data.oxalateMg.toFixed(2)} mg)</p>`;
    
    if (oxalateRisk.message) {
        html += `<div class="oxalate-warning" style="border-left-color: ${oxalateRisk.color};">${oxalateRisk.message}</div>`;
    }
    html += '</div>';

    // Ingredient Details (if not summary)
    if (data.ingredients) {
        html += '<div class="details-section">';
        html += '<h3>Ingredient Details</h3>';
        for (const ingredient of data.ingredients) {
            html += `<div class="ingredient-detail">`;
            html += `<h4>${ingredient.name} (${ingredient.amount.toFixed(1)}g)</h4>`;
            html += '<table class="nutrition-table">';
            for (const [key, value] of Object.entries(ingredient.nutritionScaled)) {
                // Skip zero values except for oxalates
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

// Settings page functions
function loadSettingsForm() {
    const caloriesInput = document.getElementById('caloriesInput');
    const useAgeCheckbox = document.getElementById('useAgeCheckbox');
    const ageInput = document.getElementById('ageInput');
    const kidneyRiskSelect = document.getElementById('kidneyRiskSelect');
    
    if (caloriesInput) caloriesInput.value = userSettings.caloriesPerDay;
    if (useAgeCheckbox) useAgeCheckbox.checked = userSettings.useAge;
    if (ageInput) {
        ageInput.value = userSettings.age || '';
        ageInput.disabled = !userSettings.useAge;
    }
    if (kidneyRiskSelect) kidneyRiskSelect.value = userSettings.kidneyStoneRisk;
    
    updateKidneyRiskInfo();
}

function updateKidneyRiskInfo() {
    const select = document.getElementById('kidneyRiskSelect');
    const info = document.getElementById('kidneyRiskInfo');
    
    if (!select || !info) return;
    
    const riskLevel = select.value;
    const data = kidneyStoneRiskData[riskLevel];
    
    if (data) {
        info.textContent = `Maximum ${data.maxOxalatesPerDay}mg oxalates per day - ${data.description}`;
    }
}

function applySettings(e) {
    e.preventDefault();
    
    userSettings.caloriesPerDay = parseInt(document.getElementById('caloriesInput').value);
    userSettings.useAge = document.getElementById('useAgeCheckbox').checked;
    userSettings.age = userSettings.useAge ? parseInt(document.getElementById('ageInput').value) : null;
    userSettings.kidneyStoneRisk = document.getElementById('kidneyRiskSelect').value;
    
    saveUserSettings();
    loadRecipes(); // Reload to update percentages
    navigateTo('home');
}

function cancelSettings() {
    navigateTo('home');
}

// Ingredients page functions
async function loadIngredients() {
    try {
        const response = await fetch('/api/ingredients');
        const result = await response.json();
        
        if (result.success) {
            ingredients = result.data;
            updateHomeCounts();
        }
    } catch (error) {
        console.error('Error loading ingredients:', error);
    }
}

function filterIngredients(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    
    if (!term) {
        renderIngredientList(ingredients);
        return;
    }

    const filtered = ingredients.filter(ing => 
        ing.name.toLowerCase().includes(term)
    );
    
    renderIngredientList(filtered);
}

function renderIngredientList(ingredientsToShow) {
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
            selectIngredient(ingredient.id);
            showIngredientDetails(ingredient.id);
        });
        
        listElement.appendChild(li);
    });
}

function selectIngredient(ingredientId) {
    document.querySelectorAll('.ingredient-item').forEach(item => {
        item.classList.remove('selected');
    });

    const selectedItem = document.querySelector(`.ingredient-item:nth-child(${ingredients.findIndex(i => i.id === ingredientId) + 1})`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }

    selectedIngredientId = ingredientId;
    
    // Enable/disable edit and delete buttons
    const editBtn = document.getElementById('editIngredientBtn');
    const deleteBtn = document.getElementById('deleteIngredientBtn');
    if (editBtn) editBtn.disabled = false;
    if (deleteBtn) deleteBtn.disabled = false;
}

async function showIngredientDetails(brandId) {
    try {
        const response = await fetch(`/api/ingredients/${brandId}`);
        const result = await response.json();
        
        if (result.success) {
            renderIngredientDetails(result.data);
        }
    } catch (error) {
        console.error('Error loading ingredient details:', error);
    }
}

function renderIngredientDetails(data) {
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
        // Skip zero values
        if ((typeof value === 'number' && value === 0) || (typeof value === 'string' && parseFloat(value) === 0)) {
            continue;
        }
        
        let displayValue = value;
        if (key === 'calories') {
            displayValue = value;
        }
        html += `<tr><td class="nutrient-name">${key}</td><td class="nutrient-value">${displayValue}</td></tr>`;
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
function showError(message) {
    const content = document.getElementById('recipeDetailsContent');
    if (content) {
        content.innerHTML = `<div class="error-message">${message}</div>`;
        const section = document.getElementById('recipeDetailsSection');
        if (section) section.style.display = 'block';
    }
}

// Make functions globally available
window.navigateTo = navigateTo;
window.toggleAccountDropdown = toggleAccountDropdown;
window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu = closeMobileMenu;
window.applySettings = applySettings;
window.cancelSettings = cancelSettings;

// Recipe editor functions
window.createRecipe = createRecipe;
window.editRecipe = editRecipe;
window.deleteRecipe = deleteRecipe;
window.closeRecipeEditor = closeRecipeEditor;
window.saveRecipe = saveRecipe;

// Ingredient editor functions
window.createIngredient = createIngredient;
window.editIngredient = editIngredient;
window.deleteIngredient = deleteIngredient;
window.closeIngredientEditor = closeIngredientEditor;
window.saveIngredient = saveIngredient;

// Initialize on load
init();

// ===== RECIPE EDITOR FUNCTIONS =====

function createRecipe() {
    editingRecipeId = null;
    selectedIngredientsForRecipe = [];
    
    document.getElementById('editPanelTitle').textContent = 'Create New Recipe';
    document.getElementById('recipeNameInput').value = '';
    document.getElementById('ingredientSearchBox').value = '';
    
    renderSelectedIngredients();
    openRecipeEditor();
}

async function editRecipe() {
    if (!selectedRecipeId) return;
    
    editingRecipeId = selectedRecipeId;
    
    // Fetch full recipe details from database
    try {
        const response = await fetch(`/api/recipes/${selectedRecipeId}/full`);
        const result = await response.json();
        
        if (result.success) {
            const recipe = result.data;
            
            document.getElementById('editPanelTitle').textContent = 'Edit Recipe';
            document.getElementById('recipeNameInput').value = recipe.name;
            document.getElementById('ingredientSearchBox').value = '';
            
            // Load ingredients with proper brandId, amount, and unit
            selectedIngredientsForRecipe = recipe.ingredients.map(ing => ({
                brandId: ing.brandId,
                name: ing.brandName,
                amount: ing.amount,
                unit: ing.unit
            }));
            
            renderSelectedIngredients();
            openRecipeEditor();
        }
    } catch (error) {
        console.error('Error loading recipe for editing:', error);
        alert('Failed to load recipe details');
    }
}

async function deleteRecipe() {
    if (!selectedRecipeId) return;
    
    const recipe = recipes.find(r => r.id === selectedRecipeId);
    if (!recipe) return;
    
    if (!confirm(`Delete recipe "${recipe.name}"? This cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/recipes/${selectedRecipeId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Reload recipes
            await loadRecipes();
            renderRecipeList(recipes);
            
            // Clear selection
            selectedRecipeId = null;
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

function openRecipeEditor() {
    const panel = document.getElementById('recipeEditPanel');
    if (panel) {
        panel.classList.add('active');
    }
}

function closeRecipeEditor() {
    const panel = document.getElementById('recipeEditPanel');
    if (panel) {
        panel.classList.remove('active');
    }
    
    // Clear form
    editingRecipeId = null;
    selectedIngredientsForRecipe = [];
    document.getElementById('recipeNameInput').value = '';
    document.getElementById('ingredientSearchBox').value = '';
    hideIngredientSearchResults();
    clearErrors();
}

async function saveRecipe(event) {
    event.preventDefault();
    
    // Validate
    const recipeName = document.getElementById('recipeNameInput').value.trim();
    if (!recipeName) {
        showError('recipeNameError', 'Recipe name is required');
        return;
    }
    
    if (selectedIngredientsForRecipe.length === 0) {
        showError('ingredientsError', 'At least one ingredient is required');
        return;
    }
    
    // Validate all ingredients have amounts
    for (const ing of selectedIngredientsForRecipe) {
        if (!ing.amount || ing.amount <= 0) {
            showError('ingredientsError', 'All ingredients must have valid amounts');
            return;
        }
    }
    
    clearErrors();
    
    // Prepare payload
    const payload = {
        name: recipeName,
        ingredients: selectedIngredientsForRecipe.map(ing => ({
            brandId: ing.brandId,
            amount: parseFloat(ing.amount),
            unit: ing.unit
        }))
    };
    
    try {
        const url = editingRecipeId 
            ? `/api/recipes/${editingRecipeId}` 
            : '/api/recipes';
        const method = editingRecipeId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Reload recipes
            await loadRecipes();
            renderRecipeList(recipes);
            closeRecipeEditor();
            
            const successMessage = editingRecipeId ? 'Recipe updated successfully' : 'Recipe created successfully';
            alert(successMessage);
        } else {
            showError('ingredientsError', result.error || 'Failed to save recipe');
        }
    } catch (error) {
        console.error('Error saving recipe:', error);
        showError('ingredientsError', 'Failed to save recipe');
    }
}

// Ingredient search for recipe editor
function handleIngredientSearch(searchTerm) {
    clearTimeout(ingredientSearchTimeout);
    
    if (!searchTerm || searchTerm.trim().length < 2) {
        hideIngredientSearchResults();
        return;
    }
    
    ingredientSearchTimeout = setTimeout(() => {
        performIngredientSearch(searchTerm.trim());
    }, 300);
}

async function performIngredientSearch(searchTerm) {
    try {
        const response = await fetch(`/api/ingredients?search=${encodeURIComponent(searchTerm)}`);
        const result = await response.json();
        
        if (result.success) {
            displayIngredientSearchResults(result.data);
        }
    } catch (error) {
        console.error('Error searching ingredients:', error);
    }
}

function displayIngredientSearchResults(results) {
    const resultsContainer = document.getElementById('ingredientSearchResults');
    if (!resultsContainer) return;
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="search-result-item">No ingredients found</div>';
        resultsContainer.classList.add('show');
        return;
    }
    
    resultsContainer.innerHTML = '';
    
    results.forEach(ingredient => {
        // Check if already added
        const alreadyAdded = selectedIngredientsForRecipe.some(ing => ing.brandId === ingredient.id);
        
        const item = document.createElement('div');
        item.className = 'search-result-item';
        if (alreadyAdded) item.classList.add('selected');
        item.textContent = ingredient.name;
        
        if (!alreadyAdded) {
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => {
                addIngredientToRecipe(ingredient);
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

function hideIngredientSearchResults() {
    const resultsContainer = document.getElementById('ingredientSearchResults');
    if (resultsContainer) {
        resultsContainer.classList.remove('show');
    }
}

function addIngredientToRecipe(ingredient) {
    // Check if already added
    if (selectedIngredientsForRecipe.some(ing => ing.brandId === ingredient.id)) {
        return;
    }
    
    selectedIngredientsForRecipe.push({
        brandId: ingredient.id,
        name: ingredient.name,
        amount: 100,
        unit: 'g'
    });
    
    renderSelectedIngredients();
    hideIngredientSearchResults();
    
    // Clear search box
    document.getElementById('ingredientSearchBox').value = '';
}

function removeIngredientFromRecipe(index) {
    selectedIngredientsForRecipe.splice(index, 1);
    renderSelectedIngredients();
}

function updateIngredientAmount(index, amount) {
    selectedIngredientsForRecipe[index].amount = amount;
}

function updateIngredientUnit(index, unit) {
    selectedIngredientsForRecipe[index].unit = unit;
}

function renderSelectedIngredients() {
    const container = document.getElementById('ingredientRows');
    if (!container) return;
    
    if (selectedIngredientsForRecipe.length === 0) {
        container.innerHTML = '<div class="no-ingredients-message">No ingredients added yet</div>';
        return;
    }
    
    container.innerHTML = '';
    
    selectedIngredientsForRecipe.forEach((ingredient, index) => {
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
                onchange="updateIngredientAmount(${index}, this.value)"
            >
            <select 
                class="unit-select"
                onchange="updateIngredientUnit(${index}, this.value)"
            >
                <option value="g" ${ingredient.unit === 'g' ? 'selected' : ''}>g</option>
                <option value="ml" ${ingredient.unit === 'ml' ? 'selected' : ''}>ml</option>
                <option value="mg" ${ingredient.unit === 'mg' ? 'selected' : ''}>mg</option>
                <option value="mcg" ${ingredient.unit === 'mcg' ? 'selected' : ''}>mcg</option>
            </select>
            <button 
                type="button"
                class="remove-btn" 
                onclick="removeIngredientFromRecipe(${index})"
                title="Remove ingredient"
            >&times;</button>
        `;
        
        container.appendChild(row);
    });
}

function showError(elementId, message) {
    const errorEl = document.getElementById(elementId);
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add('show');
    }
}

function clearErrors() {
    document.querySelectorAll('.error-text').forEach(el => {
        el.textContent = '';
        el.classList.remove('show');
    });
}

// Make ingredient functions globally available
window.updateIngredientAmount = updateIngredientAmount;
window.updateIngredientUnit = updateIngredientUnit;
window.removeIngredientFromRecipe = removeIngredientFromRecipe;

// ===== INGREDIENT EDITOR FUNCTIONS =====

let editingIngredientId = null;

function createIngredient() {
    editingIngredientId = null;
    
    document.getElementById('ingredientEditPanelTitle').textContent = 'Create New Ingredient';
    
    // Clear form
    document.getElementById('ingredientNameInput').value = '';
    document.getElementById('servingSizeInput').value = '';
    document.getElementById('servingUnitSelect').value = 'g';
    document.getElementById('densityInput').value = '';
    document.getElementById('oxalateInput').value = '';
    document.getElementById('caloriesInput').value = '';
    document.getElementById('sodiumInput').value = '';
    document.getElementById('proteinInput').value = '';
    document.getElementById('calciumInput').value = '';
    document.getElementById('potassiumInput').value = '';
    document.getElementById('magnesiumInput').value = '';
    
    clearErrors();
    openIngredientEditor();
}

async function editIngredient() {
    if (!selectedIngredientId) return;
    
    editingIngredientId = selectedIngredientId;
    
    try {
        const response = await fetch(`/api/ingredients/${selectedIngredientId}/full`);
        const result = await response.json();
        
        if (result.success) {
            const ingredient = result.data;
            
            document.getElementById('ingredientEditPanelTitle').textContent = 'Edit Ingredient';
            document.getElementById('ingredientNameInput').value = ingredient.name;
            document.getElementById('servingSizeInput').value = ingredient.serving;
            document.getElementById('servingUnitSelect').value = ingredient.servingUnit;
            document.getElementById('densityInput').value = ingredient.density || '';
            document.getElementById('oxalateInput').value = ingredient.oxalatePerGram || '';
            
            // Fill nutrition data
            document.getElementById('caloriesInput').value = ingredient.data.calories || '';
            document.getElementById('sodiumInput').value = parseFloat(ingredient.data.sodium) || '';
            document.getElementById('proteinInput').value = parseFloat(ingredient.data.protein) || '';
            document.getElementById('calciumInput').value = parseFloat(ingredient.data.calcium) || '';
            document.getElementById('potassiumInput').value = parseFloat(ingredient.data.potassium) || '';
            document.getElementById('magnesiumInput').value = parseFloat(ingredient.data.magnesium) || '';
            
            clearErrors();
            openIngredientEditor();
        }
    } catch (error) {
        console.error('Error loading ingredient for editing:', error);
        alert('Failed to load ingredient details');
    }
}

async function deleteIngredient() {
    if (!selectedIngredientId) return;
    
    const ingredient = ingredients.find(i => i.id === selectedIngredientId);
    if (!ingredient) return;
    
    if (!confirm(`Delete ingredient "${ingredient.name}"? This cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/ingredients/${selectedIngredientId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Reload ingredients
            await loadIngredients();
            renderIngredientList(ingredients);
            
            // Clear selection
            selectedIngredientId = null;
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

function openIngredientEditor() {
    const panel = document.getElementById('ingredientEditPanel');
    if (panel) {
        panel.classList.add('active');
    }
}

function closeIngredientEditor() {
    const panel = document.getElementById('ingredientEditPanel');
    if (panel) {
        panel.classList.remove('active');
    }
    
    editingIngredientId = null;
    clearErrors();
}

async function saveIngredient(event) {
    event.preventDefault();
    
    // Validate
    const name = document.getElementById('ingredientNameInput').value.trim();
    const serving = parseFloat(document.getElementById('servingSizeInput').value);
    const servingUnit = document.getElementById('servingUnitSelect').value;
    const density = parseFloat(document.getElementById('densityInput').value) || null;
    const oxalatePerGram = parseFloat(document.getElementById('oxalateInput').value);
    
    if (!name) {
        showError('ingredientNameError', 'Ingredient name is required');
        return;
    }
    
    if (!serving || serving <= 0) {
        showError('ingredientNameError', 'Valid serving size is required');
        return;
    }
    
    if (isNaN(oxalatePerGram) || oxalatePerGram < 0) {
        showError('oxalateError', 'Valid oxalate value is required');
        return;
    }
    
    clearErrors();
    
    // Build nutrition data object
    const data = {};
    
    const addIfPresent = (id, field) => {
        const value = document.getElementById(id).value;
        if (value && value.trim() !== '') {
            data[field] = parseFloat(value);
        }
    };
    
    addIfPresent('caloriesInput', 'calories');
    addIfPresent('sodiumInput', 'sodium');
    addIfPresent('proteinInput', 'protein');
    addIfPresent('calciumInput', 'calcium');
    addIfPresent('potassiumInput', 'potassium');
    addIfPresent('magnesiumInput', 'magnesium');
    
    // Prepare payload
    const payload = {
        name,
        serving,
        servingUnit,
        density,
        oxalatePerGram,
        data
    };
    
    try {
        const url = editingIngredientId 
            ? `/api/ingredients/${editingIngredientId}` 
            : '/api/ingredients';
        const method = editingIngredientId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Reload ingredients
            await loadIngredients();
            renderIngredientList(ingredients);
            closeIngredientEditor();
            
            const successMessage = editingIngredientId ? 'Ingredient updated successfully' : 'Ingredient created successfully';
            alert(successMessage);
        } else {
            showError('ingredientNameError', result.error || 'Failed to save ingredient');
        }
    } catch (error) {
        console.error('Error saving ingredient:', error);
        showError('ingredientNameError', 'Failed to save ingredient');
    }
}