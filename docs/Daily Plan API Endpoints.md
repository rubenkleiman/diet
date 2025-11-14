# Daily Plan API Endpoints Documentation

## Base URL
All endpoints are prefixed with `/api`

---

## Endpoints

### 1. GET /api/daily-plans
Get all daily plans for the current user (summary view)

**Query Parameters:**
- `search` (optional): String to filter daily plans by name

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": "user-uuid-here",
      "name": "Monday Plan",
      "dailyPlanMenus": [
        {
          "menuId": 5,
          "type": "Breakfast"
        },
        {
          "menuId": 12,
          "type": "Lunch"
        },
        {
          "menuId": 8,
          "type": "Dinner"
        }
      ]
    }
  ]
}
```

---

### 2. GET /api/daily-plans/:id
Get a single daily plan with full details including menu data and aggregated nutrition

**URL Parameters:**
- `id`: Daily plan ID (integer)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": "user-uuid-here",
    "dailyPlanName": "Monday Plan",
    "menus": [
      {
        "menuId": 5,
        "type": "Breakfast",
        "name": "Light Breakfast Menu",
        "totals": {
          "calories": 450,
          "sodium": 520,
          "protein": 25,
          "carbohydrates": 55,
          "fat": 15
          // ... other nutrients
        },
        "oxalateMg": 35.5
      },
      {
        "menuId": 12,
        "type": "Lunch",
        "name": "Healthy Lunch Menu",
        "totals": {
          "calories": 650,
          "sodium": 780,
          // ... other nutrients
        },
        "oxalateMg": 48.2
      },
      {
        "menuId": 8,
        "type": "Dinner",
        "name": "Evening Dinner",
        "totals": {
          "calories": 700,
          "sodium": 820,
          // ... other nutrients
        },
        "oxalateMg": 61.3
      }
    ],
    "totals": {
      "calories": 1800,
      "sodium": 2120,
      "protein": 85,
      "carbohydrates": 210,
      "fat": 55,
      "cholesterol": 180,
      "sugars": 45,
      "dietary_fiber": 28,
      "calcium": 950,
      "potassium": 3200,
      "magnesium": 380
      // ... all other nutrients aggregated
    },
    "oxalateMg": 145.0
  }
}
```

**Notes:**
- The `menus` array contains full menu objects with their nutritional data
- The `totals` object contains aggregated nutrition from all menus
- The `oxalateMg` at root level is the sum of all menu oxalates

---

### 3. POST /api/daily-plans
Create a new daily plan

**Request Body:**
```json
{
  "name": "Monday Plan",
  "dailyPlanMenus": [
    {
      "menuId": 5,
      "type": "Breakfast"
    },
    {
      "menuId": 12,
      "type": "Lunch"
    },
    {
      "menuId": 5,
      "type": "Snack"
    },
    {
      "menuId": 8,
      "type": "Dinner"
    }
  ]
}
```

**Validation Rules:**
- `name`: Required, string, max 64 characters
- `dailyPlanMenus`: Required, array, minimum 1 item
- `dailyPlanMenus[].menuId`: Required, integer, must reference existing menu
- `dailyPlanMenus[].type`: Required, enum: ['Breakfast', 'Lunch', 'Brunch', 'Snack', 'Dinner', 'Other']
- Same menu can appear multiple times (e.g., same snack twice)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 15,
    "userId": "user-uuid-here",
    "name": "Monday Plan",
    "dailyPlanMenus": [
      {
        "menuId": 5,
        "type": "Breakfast"
      },
      {
        "menuId": 12,
        "type": "Lunch"
      },
      {
        "menuId": 5,
        "type": "Snack"
      },
      {
        "menuId": 8,
        "type": "Dinner"
      }
    ]
  }
}
```

---

### 4. PUT /api/daily-plans/:id
Update an existing daily plan

**URL Parameters:**
- `id`: Daily plan ID (integer)

**Request Body:**
```json
{
  "name": "Updated Monday Plan",
  "dailyPlanMenus": [
    {
      "menuId": 5,
      "type": "Breakfast"
    },
    {
      "menuId": 14,
      "type": "Lunch"
    },
    {
      "menuId": 8,
      "type": "Dinner"
    }
  ]
}
```

**Validation Rules:**
- Same as POST endpoint
- Must verify the daily plan belongs to the current user

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 15,
    "userId": "user-uuid-here",
    "name": "Updated Monday Plan",
    "dailyPlanMenus": [
      {
        "menuId": 5,
        "type": "Breakfast"
      },
      {
        "menuId": 14,
        "type": "Lunch"
      },
      {
        "menuId": 8,
        "type": "Dinner"
      }
    ]
  }
}
```

---

### 5. DELETE /api/daily-plans/:id
Delete a daily plan

**URL Parameters:**
- `id`: Daily plan ID (integer)

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Daily plan deleted successfully"
  }
}
```

**Error Response (if not found or doesn't belong to user):**
```json
{
  "success": false,
  "error": "Daily plan not found"
}
```

---

## Error Responses

All endpoints follow this error format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad request (validation error)
- `404`: Not found
- `500`: Server error

---

## Important Notes

1. **Menu ID References**: All `menuId` values must reference existing menus that belong to the current user
2. **Duplicate Menus**: The same menu can appear multiple times in a daily plan with different types (e.g., "Light Snack" menu as both morning and afternoon snack)
3. **Type Enum**: Valid types are exactly: `Breakfast`, `Lunch`, `Brunch`, `Snack`, `Dinner`, `Other` (case-sensitive)
4. **Aggregated Nutrition**: The GET /:id endpoint must calculate aggregated nutrition by fetching all referenced menus and summing their nutritional values
5. **User Isolation**: All operations must be scoped to the current authenticated user's data

---

## Example Frontend Flow

1. **Load daily plans list**: `GET /api/daily-plans` → Display in left sidebar
2. **Select daily plan**: `GET /api/daily-plans/1` → Display full details with menus grouped by type
3. **Create new plan**: 
   - User enters name
   - Searches and adds menus
   - Selects type for each menu
   - `POST /api/daily-plans` with payload
4. **Edit plan**: 
   - `GET /api/daily-plans/1` → Load current data
   - User modifies name/menus/types
   - `PUT /api/daily-plans/1` with updated payload
5. **Delete plan**: `DELETE /api/daily-plans/1` → Confirm and remove

---

## Database Schema Suggestion

```sql
-- Daily Plans table
CREATE TABLE daily_plans (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily Plan Menus junction table
CREATE TABLE daily_plan_menus (
  id SERIAL PRIMARY KEY,
  daily_plan_id INTEGER NOT NULL REFERENCES daily_plans(id) ON DELETE CASCADE,
  menu_id INTEGER NOT NULL REFERENCES menus(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('Breakfast', 'Lunch', 'Brunch', 'Snack', 'Dinner', 'Other')),
  sort_order INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX idx_daily_plans_user_id ON daily_plans(user_id);
CREATE INDEX idx_daily_plan_menus_daily_plan_id ON daily_plan_menus(daily_plan_id);
```
