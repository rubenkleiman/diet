// FIXED 2025-10-29 1pm
// No changes needed - client.js only accesses data through API calls

// State management
let recipes = [];
let ingredients = [];
let selectedRecipeId = null;
let selectedIngredientName = null;
let config = {};
let kidneyStoneRiskData = {};
let dailyRequirements = {};
let userSettings = {
    caloriesPerDay: 2000,
    age: null,
    useAge: false,
    kidneyStoneRisk: 'Normal'
};

// Initialize app
async function init() {
    loadUserSettings();
    await loadConfig();
    await loadKidneyStoneRiskData();
    await loadDailyRequirements();
    await loadRecipes();
    setupEventListeners();
    
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

// Navigation
function navigateTo(page, pushState = true) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    
    // Show requested page
    const pageElement = document.getElementById(`${page}Page`);
    if (pageElement) {
        pageElement.style.display = 'block';
        
        // Update URL without reloading
        if (pushState) {
            history.pushState({ page }, '', `#${page}`);
        }
        
        // Page-specific initialization
        if (page === 'settings') {
            loadSettingsForm();
        } else if (page === 'ingredients') {
            loadIngredients();
        }
    }
}

// Handle browser back/forward
window.addEventListener('popstate', (event) => {
    const page = event.state?.page || 'home';
    navigateTo(page, false);
});

// Setup event listeners
function setupEventListeners() {
    // Recipe search
    document.getElementById('searchInput').addEventListener('input', (e) => {
        filterRecipes(e.target.value);
    });

    // Info button
    document.getElementById('infoButton').addEventListener('click', () => {
        if (selectedRecipeId) {
            showRecipeDetails(selectedRecipeId);
        }
    });

    // Summary checkbox
    document.getElementById('summaryCheckbox').addEventListener('change', () => {
        if (selectedRecipeId) {
            showRecipeDetails(selectedRecipeId);
        }
    });

    // Settings form
    document.getElementById('settingsForm').addEventListener('submit', applySettings);
    
    document.getElementById('useAgeCheckbox').addEventListener('change', (e) => {
        document.getElementById('ageInput').disabled = !e.target.checked;
    });

    document.getElementById('kidneyRiskSelect').addEventListener('change', updateKidneyRiskInfo);

    // Ingredient search
    document.getElementById('ingredientSearchInput').addEventListener('input', (e) => {
        searchIngredients(e.target.value);
    });
}

// Load all recipes
async function loadRecipes() {
    try {
        const response = await fetch('/api/recipes');
        const result = await response.json();
        
        if (result.success) {
            recipes = result.data;
            renderRecipeList(recipes);
        }
    } catch (error) {
        console.error('Error loading recipes:', error);
        showError('Failed to load recipes');
    }
}

// Render recipe list with calories and oxalates
function renderRecipeList(recipesToShow) {
    const listElement = document.getElementById('recipeList');
    listElement.innerHTML = '';

    if (recipesToShow.length === 0) {
        listElement.innerHTML = '<li class="no-results">No recipes found</li>';
        return;
    }

    recipesToShow.forEach(recipe => {
        const li = document.createElement('li');
        li.className = 'recipe-item';
        li.dataset.recipeId = recipe.id;
        
        // We'll fetch summary data to show calories and oxalates
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
            } else {
                li.textContent = recipe.name;
            }
        });
        
        li.addEventListener('click', () => selectRecipe(recipe.id));
        li.addEventListener('dblclick', () => showRecipeDetails(recipe.id));
        
        listElement.appendChild(li);
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
    document.getElementById('infoButton').disabled = false;
}

// Show recipe details with % daily values
async function showRecipeDetails(recipeId) {
    const summary = document.getElementById('summaryCheckbox').checked;
    
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

    title.textContent = `Recipe: ${data.name}`;
    
    let html = '<div class="details-content">';
    
    // Nutritional Totals with % daily values
    html += '<div class="details-section">';
    html += '<h3>Nutritional Totals</h3>';
    html += '<table class="nutrition-table">';
    
    for (const [key, value] of Object.entries(data.totals)) {
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
    document.getElementById('caloriesInput').value = userSettings.caloriesPerDay;
    document.getElementById('useAgeCheckbox').checked = userSettings.useAge;
    document.getElementById('ageInput').value = userSettings.age || '';
    document.getElementById('ageInput').disabled = !userSettings.useAge;
    document.getElementById('kidneyRiskSelect').value = userSettings.kidneyStoneRisk;
    updateKidneyRiskInfo();
}

function updateKidneyRiskInfo() {
    const select = document.getElementById('kidneyRiskSelect');
    const info = document.getElementById('kidneyRiskInfo');
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
            renderIngredientList(ingredients);
        }
    } catch (error) {
        console.error('Error loading ingredients:', error);
    }
}

async function searchIngredients(searchTerm) {
    try {
        const response = await fetch(`/api/ingredients?search=${encodeURIComponent(searchTerm)}`);
        const result = await response.json();
        
        if (result.success) {
            renderIngredientList(result.data);
        }
    } catch (error) {
        console.error('Error searching ingredients:', error);
    }
}

function renderIngredientList(ingredientsToShow) {
    const listElement = document.getElementById('ingredientList');
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
        
        li.addEventListener('click', () => showIngredientDetails(ingredient.name));
        
        listElement.appendChild(li);
    });
}

async function showIngredientDetails(brandName) {
    try {
        const response = await fetch(`/api/ingredients/${encodeURIComponent(brandName)}`);
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
        document.getElementById('recipeDetailsSection').style.display = 'block';
    }
}

// Initialize on load
init();