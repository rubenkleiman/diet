# Menu API Endpoints Specification

This document specifies the REST API endpoints required for the Menu feature in the Diet Guidelines application.

---

## Base URL
All endpoints are prefixed with `/api`

---

## Endpoints

### 1. GET /api/menus
Get all menus with optional search filtering.

**Purpose:** Retrieve list of all menus or search for menus by name

**Request:**
- **Method:** GET
- **URL:** `/api/menus`
- **Query Parameters:**
  - `search` (optional, string) - Filter menus by name (case-insensitive partial match)

**Examples:**
- `/api/menus` - Get all menus
- `/api/menus?search=weekly` - Search for menus containing "weekly"

**Success Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "menu_123",
      "name": "Weekly Meal Plan",
      "recipeIds": ["recipe_1", "recipe_2", "recipe_3"]
    },
    {
      "id": "menu_456",
      "name": "Low Oxalate Diet",
      "recipeIds": ["recipe_4", "recipe_5"]
    }
  ]
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message description"
}
```

---

### 2. GET /api/menus/:id
Get basic menu details by ID.

**Purpose:** Retrieve a single menu's information for display

**Request:**
- **Method:** GET
- **URL:** `/api/menus/:id`
- **URL Parameters:**
  - `id` (required, string) - Menu ID

**Example:**
- `/api/menus/menu_123`

**Success Response:**
```json
{
  "success": true,
  "data": {
    "id": "menu_123",
    "name": "Weekly Meal Plan",
    "recipeIds": ["recipe_1", "recipe_2", "recipe_3"]
  }
}
```

**Error Response (menu not found):**
```json
{
  "success": false,
  "error": "Menu not found"
}
```

---


---

### 4. POST /api/menus
Create a new menu.

**Purpose:** Create a new menu with name and recipe list

**Request:**
- **Method:** POST
- **URL:** `/api/menus`
- **Headers:**
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "name": "Weekly Meal Plan",
  "recipeIds": ["recipe_1", "recipe_2", "recipe_3"]
}
```

**Body Field Descriptions:**
- `name` (required, string, max 64 chars) - Menu name
- `recipeIds` (required, array of strings, min 1, max 30) - Array of recipe IDs

**Success Response:**
```json
{
  "success": true,
  "data": {
    "id": "menu_789",
    "name": "Weekly Meal Plan",
    "recipeIds": ["recipe_1", "recipe_2", "recipe_3"]
  }
}
```

**Error Responses:**

Validation failure:
```json
{
  "success": false,
  "error": "Menu name is required"
}
```

Empty recipe list:
```json
{
  "success": false,
  "error": "At least one recipe is required"
}
```

Invalid recipe ID:
```json
{
  "success": false,
  "error": "Recipe not found: recipe_999"
}
```

---

### 5. PUT /api/menus/:id
Update an existing menu.

**Purpose:** Update menu name and/or recipe list

**Request:**
- **Method:** PUT
- **URL:** `/api/menus/:id`
- **URL Parameters:**
  - `id` (required, string) - Menu ID to update
- **Headers:**
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "name": "Updated Meal Plan",
  "recipeIds": ["recipe_1", "recipe_2"]
}
```

**Body Field Descriptions:**
- `name` (required, string, max 64 chars) - Updated menu name
- `recipeIds` (required, array of strings, min 1, max 30) - Updated array of recipe IDs

**Example:**
- PUT `/api/menus/menu_123`

**Success Response:**
```json
{
  "success": true,
  "data": {
    "id": "menu_123",
    "name": "Updated Meal Plan",
    "recipeIds": ["recipe_1", "recipe_2"]
  }
}
```

**Error Responses:**

Menu not found:
```json
{
  "success": false,
  "error": "Menu not found"
}
```

Validation failure:
```json
{
  "success": false,
  "error": "Menu name cannot exceed 64 characters"
}
```

---

### 6. DELETE /api/menus/:id
Delete a menu.

**Purpose:** Permanently remove a menu from the system

**Request:**
- **Method:** DELETE
- **URL:** `/api/menus/:id`
- **URL Parameters:**
  - `id` (required, string) - Menu ID to delete

**Example:**
- DELETE `/api/menus/menu_123`

**Success Response:**
```json
{
  "success": true,
  "data": {
    "id": "menu_123"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Menu not found"
}
```

---

## Validation Rules

### Menu Name
- **Required:** Yes
- **Type:** String
- **Min Length:** 1 character
- **Max Length:** 64 characters

### Recipe IDs
- **Required:** Yes
- **Type:** Array of strings
- **Min Items:** 1 recipe
- **Max Items:** 30 recipes
- **Duplicates:** Not allowed (each recipe can appear only once)
- **Validation:** All recipe IDs must exist in the system

---

## Common Error Format

All error responses follow this format:

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

---

## Notes for Implementation

1. **Recipe Validation:** Backend should verify that all recipe IDs in `recipeIds` array exist before creating/updating a menu
2. **Duplicate Prevention:** Backend should reject requests with duplicate recipe IDs in the array
3. **Search Functionality:** The search parameter should perform case-insensitive partial matching on menu names
4. **Atomic Operations:** Create and update operations should be atomic (all-or-nothing)
5. **ID Generation:** Menu IDs should be generated by the backend upon creation
6. **Cascade Delete:** Consider whether deleting a recipe should remove it from menus or prevent deletion

---

## Testing Checklist

- [ ] GET /api/menus returns all menus
- [ ] GET /api/menus?search=term filters correctly
- [ ] GET /api/menus/:id returns specific menu
- [ ] GET /api/menus/:id returns 404 for non-existent menu
- [ ] POST /api/menus creates new menu with valid data
- [ ] POST /api/menus rejects empty name
- [ ] POST /api/menus rejects empty recipe list
- [ ] POST /api/menus rejects invalid recipe IDs
- [ ] POST /api/menus rejects duplicate recipe IDs
- [ ] POST /api/menus rejects names over 64 characters
- [ ] POST /api/menus rejects more than 30 recipes
- [ ] PUT /api/menus/:id updates existing menu
- [ ] PUT /api/menus/:id returns 404 for non-existent menu
- [ ] PUT /api/menus/:id validates same rules as POST
- [ ] DELETE /api/menus/:id removes menu
- [ ] DELETE /api/menus/:id returns 404 for non-existent menu