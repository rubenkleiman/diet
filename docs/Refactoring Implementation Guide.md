# Frontend Refactoring Implementation Guide

## Overview
This refactoring reduces `client.js` from ~1600 lines to ~800 lines (50% reduction) while offloading complexity to the backend and introducing reusable patterns.

---

## Backend Changes Required

### 1. Nutrient Metadata Endpoint
**Endpoint**: `GET /api/nutrients`

**Response**:
```json
{
  "success": true,
  "data": {
    "nutrients": [
      {
        "key": "calories",
        "displayName": "Calories",
        "unit": "none",
        "category": "macronutrient",
        "dashRelevant": true
      },
      {
        "key": "sodium",
        "displayName": "Sodium",
        "unit": "mg",
        "category": "mineral",
        "dashRelevant": true
      },
      {
        "key": "oxalates",
        "displayName": "Oxalates",
        "unit": "mg",
        "category": "other",
        "dashRelevant": false
      },
      // ... include ALL nutrients from your system
    ]
  }
}
```

**Purpose**: Eliminates hardcoded `INGREDIENT_PROPS` in frontend. Adding new nutrients now only requires backend changes.

---

### 2. Recipe Preview Endpoint
**Endpoint**: `POST /api/preview/recipe`

**Request**:
```json
{
  "ingredients": [
    { "brandId": "123", "amount": 100, "unit": "g" },
    { "brandId": "456", "amount": 50, "unit": "ml" }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "totals": {
      "calories": 450,
      "sodium": 230,
      "protein": 12,
      // ... all nutrients
    },
    "oxalateMg": 43.2
  }
}
```

**Purpose**: Backend calculates recipe nutrition preview (eliminates complex frontend logic).

---

### 3. Menu Preview Endpoint
**Endpoint**: `POST /api/preview/menu`

**Request**:
```json
{
  "recipeIds": [1, 2, 3]
}
```

**Response**: Same format as recipe preview

**Purpose**: Backend aggregates menu nutrition from multiple recipes.

---

### 4. Daily Plan Preview Endpoint
**Endpoint**: `POST /api/preview/daily-plan`

**Request**:
```json
{
  "menuIds": [1, 2, 3]
}
```

**Response**: Same format as recipe preview

**Purpose**: Backend aggregates daily plan nutrition from multiple menus.

---

## Frontend Changes

### New Files to Create

#### 1. `controllers/EntityController.js`
- Generic CRUD controller for all entities
- Handles common patterns: select, delete, filter
- Reduces code duplication across recipes, menus, ingredients, daily plans

#### 2. `controllers/EditorController.js`
- Generic editor panel controller
- Handles: open, close, clear, set/get name
- Reduces editor-related code duplication

#### 3. `managers/NutrientMetadataManager.js`
- Manages nutrient definitions from backend
- Provides: getNutrient(), getDisplayName(), getUnit(), formatValue()
- Eliminates hardcoded nutrient properties

#### 4. `managers/NutrientPreviewManager.js` (Simplified)
- Replace entire file with simplified version
- Uses backend preview endpoints instead of complex calculations
- Reduces from ~300 lines to ~150 lines

### Files to Update

#### 1. `APIClient.js`
Add these methods:
```javascript
// Nutrient metadata
async getNutrients() {
  return await this.request('/nutrients');
}

// Preview endpoints
async previewRecipe(ingredients) {
  return await this.request('/preview/recipe', {
    method: 'POST',
    body: JSON.stringify({ ingredients }),
  });
}

async previewMenu(recipeIds) {
  return await this.request('/preview/menu', {
    method: 'POST',
    body: JSON.stringify({ recipeIds }),
  });
}

async previewDailyPlan(menuIds) {
  return await this.request('/preview/daily-plan', {
    method: 'POST',
    body: JSON.stringify({ menuIds }),
  });
}
```

#### 2. `State.js`
Add to initial state:
```javascript
nutrientMetadata: [],
nutrientMap: {},
```

#### 3. `client.js`
Replace with refactored version (Parts 1-4 provided above)

Key changes:
- Initializes `EntityController` and `EditorController` for each entity type
- Uses `nutrientMetadataManager` instead of hardcoded `INGREDIENT_PROPS`
- Simplified preview methods using backend endpoints
- Reduced from ~1600 lines to ~800 lines

---

## Migration Steps

### Phase 1: Backend Implementation
1. Implement `/api/nutrients` endpoint
2. Implement `/api/preview/recipe` endpoint
3. Implement `/api/preview/menu` endpoint
4. Implement `/api/preview/daily-plan` endpoint
5. Test all endpoints thoroughly

### Phase 2: Frontend Setup
1. Create `controllers/` directory
2. Add `EntityController.js`
3. Add `EditorController.js`
4. Add `NutrientMetadataManager.js`
5. Update `APIClient.js` with new methods
6. Update `State.js` with new state properties

### Phase 3: Simplification
1. Replace `NutrientPreviewManager.js` with simplified version
2. Replace `client.js` with refactored version (Parts 1-4)
3. Test thoroughly in development

### Phase 4: Verification
1. Test all CRUD operations (create, read, update, delete)
2. Test all editor panels
3. Test nutrient previews in all editors
4. Test dietary assessments
5. Verify no hardcoded nutrients remain

---

## Benefits

### Code Quality
- **50% reduction** in client.js size (1600 → 800 lines)
- **DRY principle** applied throughout
- **Separation of concerns** - business logic moved to backend
- **Reusable patterns** via controllers

### Maintainability
- **No hardcoded nutrients** - all come from backend API
- **Easy to add nutrients** - update backend only, no frontend changes
- **Consistent patterns** - all entities use same controller structure
- **Less duplication** - common code extracted to base classes

### Performance
- **Backend calculations** are faster and more reliable
- **Single source of truth** for nutrient definitions
- **Cached nutrient metadata** loaded once at startup

### Developer Experience
- **Easier to understand** - smaller, focused files
- **Easier to test** - isolated controllers
- **Easier to extend** - consistent patterns
- **Better organization** - logical file structure

---

## Testing Checklist

- [ ] All backend endpoints return correct data
- [ ] Nutrient metadata loads on app init
- [ ] Recipe CRUD operations work
- [ ] Recipe editor shows nutrition preview
- [ ] Menu CRUD operations work
- [ ] Menu editor shows nutrition preview
- [ ] Daily plan CRUD operations work
- [ ] Daily plan editor shows nutrition preview
- [ ] Ingredient CRUD operations work
- [ ] Dietary assessments calculate correctly
- [ ] All entity lists display with summaries
- [ ] Navigation works between all pages
- [ ] Settings page functions correctly
- [ ] No console errors
- [ ] No hardcoded nutrient references in frontend

---

## Rollback Plan

If issues arise:
1. Keep original `client.js` as `client.js.backup`
2. Keep original `NutrientPreviewManager.js` as backup
3. Backend endpoints are additive (won't break existing code)
4. Can switch back by reverting frontend files only

---

## Future Enhancements

### Potential Further Improvements
1. **PageController classes** - Extract page-specific logic
2. **Dietary Assessment endpoint** - Move DASH calculation to backend
3. **Bulk summary endpoint** - Fetch multiple summaries at once
4. **WebSocket updates** - Real-time nutrient metadata updates
5. **Caching layer** - Cache preview calculations

### Architecture Evolution
- Continue extracting to controllers/managers
- Move more business logic to backend
- Consider state management library if app grows
- Add TypeScript for type safety
