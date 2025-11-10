# Menu Feature - Complete Implementation Guide

This guide shows you exactly what to add/modify in each file to implement the Menu feature.

---

## 📁 New Files to Create

### 1. `/js/managers/MenuManager.js`
✅ **Already provided as artifact** - Copy the complete MenuManager.js file

### 2. `/js/renderers/MenuRenderer.js`
✅ **Already provided as artifact** - Copy the complete MenuRenderer.js file

---

## 📝 Files to Modify

### 3. `/js/core/State.js`

**Find the constructor and UPDATE these two sections:**

#### Section 1: Add menu state to constructor
```javascript
constructor() {
    this.state = {
      // Recipe data
      recipes: [],
      selectedRecipeId: null,
      
      // Ingredient data
      ingredients: [],
      selectedIngredientId: null,
      
      // Menu data  <-- ADD THIS SECTION
      menus: [],
      selectedMenuId: null,
      
      // ... rest of state
```

#### Section 2: Add menu state to reset() method
```javascript
reset() {
    const initialState = {
      recipes: [],
      selectedRecipeId: null,
      ingredients: [],
      selectedIngredientId: null,
      menus: [],  <-- ADD THESE TWO LINES
      selectedMenuId: null,
      // ... rest of state
```

**Also add menu editor state to both locations:**
```javascript
// In constructor and reset():
      editingMenuId: null,
      selectedRecipesForMenu: [],
```

---

### 4. `/js/core/APIClient.js`

**Find the comment `// ===== UTILITY METHODS =====` and ADD before it:**

```javascript
  // ===== MENU ENDPOINTS =====

  /**
   * Get all menus
   * @param {string} search - Optional search term
   */
  async getMenus(search = '') {
    const endpoint = search ? `/menus?search=${encodeURIComponent(search)}` : '/menus';
    return await this.request(endpoint);
  }

  /**
   * Get a single menu with details
   * @param {string} id - Menu ID
   */
  async getMenu(id) {
    return await this.request(`/menus/${id}`);
  }

  /**
   * Create a new menu
   * @param {Object} menuData - { name, recipeIds: [recipeId1, recipeId2, ...] }
   */
  async createMenu(menuData) {
    return await this.request('/menus', {
      method: 'POST',
      body: JSON.stringify(menuData),
    });
  }

  /**
   * Update a menu
   * @param {string} id - Menu ID
   * @param {Object} menuData - { name, recipeIds: [recipeId1, recipeId2, ...] }
   */
  async updateMenu(id, menuData) {
    return await this.request(`/menus/${id}`, {
      method: 'PUT',
      body: JSON.stringify(menuData),
    });
  }

  /**
   * Delete a menu
   * @param {string} id - Menu ID
   */
  async deleteMenu(id) {
    return await this.request(`/menus/${id}`, {
      method: 'DELETE',
    });
  }
```

---

### 5. `/js/renderers/FormRenderer.js`

**ADD these methods at the end of the FormRenderer class (before the closing brace):**

```javascript
  /**
   * Open menu editor panel
   */
  static openMenuEditor() {
    const panel = document.getElementById('menuEditPanel');
    if (panel) {
      panel.classList.add('active');
    }
  }

  /**
   * Close menu editor panel
   */
  static closeMenuEditor() {
    const panel = document.getElementById('menuEditPanel');
    if (panel) {
      panel.classList.remove('active');
    }
  }

  /**
   * Set menu editor title
   */
  static setMenuEditorTitle(title) {
    const titleEl = document.getElementById('menuEditPanelTitle');
    if (titleEl) {
      titleEl.textContent = title;
    }
  }

  /**
   * Clear menu form
   */
  static clearMenuForm() {
    const nameInput = document.getElementById('menuNameInput');
    const searchBox = document.getElementById('recipeSearchBox');
    
    if (nameInput) nameInput.value = '';
    if (searchBox) searchBox.value = '';
  }
```

---

### 6. `/js/client.js`

This is the most extensive update. See the **client-menu-additions** artifact for all the code you need to add. Here's a summary:

#### Add imports at the top:
```javascript
import { MenuManager } from '@managers/MenuManager.js';
import { MenuRenderer } from '@renderers/MenuRenderer.js';
```

#### In constructor, add:
```javascript
this.menuManager = new MenuManager();
this.menus = [];
this.selectedMenuId = null;
this.editingMenuId = null;
this.selectedRecipesForMenu = [];
this.recipeSearchTimeout = null;
```

#### In setupStateSync(), add menu subscriptions

#### In init(), add:
```javascript
await this.menuManager.loadMenus();
```

#### In updateHomeCounts(), add:
```javascript
const menuCountEl = document.getElementById('menuCount');
if (menuCountEl) menuCountEl.textContent = this.menus.length;
```

#### In navigateTo(), add case for menus page

#### In handleAction(), add menu action cases

#### In setupEventListeners(), add menu event listeners

#### In setupEventDelegation(), add menu delegations

#### Add all new menu methods (see artifact for complete list)

---

### 7. `/index.html`

#### Update 1: Replace the Menus feature card on home page
Find this in the home page section:
```html
<div class="feature-card" data-action="navigate" data-page="menus" role="button" tabindex="0">
    <div class="card-icon" aria-hidden="true">📅</div>
    <h2>Menus</h2>
    <p>Plan your meals with customized menu collections (Coming Soon)</p>
    <span class="card-link">View Menus →</span>
</div>
```

Replace with:
```html
<div class="feature-card" data-action="navigate" data-page="menus" role="button" tabindex="0">
    <div class="card-icon" aria-hidden="true">📅</div>
    <h2>Menus</h2>
    <p>Plan your meals with <span id="menuCount">0</span> customized menu collections</p>
    <span class="card-link">View Menus →</span>
</div>
```

#### Update 2: Replace the entire menus page section
Find the stub menus page (starting with `<div id="menusPage" class="page">`) and replace it with the complete implementation from the **menus-page-html** artifact.

---

### 8. `/css/styles.css`

**ADD the menu-specific styles** from the **menu-styles-css** artifact to the end of your styles.css file.

The styles include:
- `.menu-list-section`
- `.menu-list` and `.menu-item`
- `.menu-details-section`
- `.menu-recipe-list`
- `.recipes-editor`
- `.recipe-rows`
- Responsive styles

---

## ✅ Testing Checklist

Once you've made all the updates:

1. **Load the page** - Check console for errors
2. **Navigate to Menus** - Should see menu list page (empty initially)
3. **Test the backend endpoints** using the UI:
   - Create Menu button should open editor panel
   - Try creating a menu with recipes
   - Edit existing menu
   - Delete menu
   - Search menus
4. **Check menu details** - Click on a menu to see nutritional aggregation
5. **Verify responsive design** - Test on mobile width

---

## 🐛 Common Issues

**If you see "MenuManager is not defined":**
- Check that imports are added correctly in client.js
- Verify file paths match your project structure

**If menus page doesn't show:**
- Check that you replaced the entire menus page HTML
- Verify navigateTo() includes menus case

**If search doesn't work:**
- Check that event listeners are added in setupEventListeners()
- Verify input element IDs match

**If editor panel doesn't open:**
- Check that FormRenderer menu methods are added
- Verify data-action attributes in HTML

---

## 📦 File Summary

**New Files (2):**
- `/js/managers/MenuManager.js`
- `/js/renderers/MenuRenderer.js`

**Modified Files (6):**
- `/js/core/State.js` - Add menu state
- `/js/core/APIClient.js` - Add menu endpoints  
- `/js/renderers/FormRenderer.js` - Add menu editor methods
- `/js/client.js` - Add menu handlers and methods
- `/index.html` - Add menu page UI and update home
- `/css/styles.css` - Add menu styles

---

## 🎯 Next Steps

1. Copy the 2 new files
2. Make the 6 file modifications
3. Test with your backend API
4. Let me know if you hit any issues!

Good luck! 🚀
