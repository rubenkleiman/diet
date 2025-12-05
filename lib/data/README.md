# I have a nodejs/express web app that helps me plan my meals using nutritional information.
# I'd like you to play the role of backend engineer.
# I'm uploading the relevant backend files for your first feature.
## Study schema.sql. The new feature is that the user can now change the serving amount for any of the menu's recipes. 
## KEEP THIS IN MIND: Later in this conversation you will implement a couple of endpoints to support menu creation and updates.
# Task: Inspect the code in MenuRepository.js and DailyPlanRepository.js. 
## Wherever there is a query in these files that references either recipe_items.amount or recipe_items.unit, the correct reference is now to menu_recipes.serving_amount and menu_recipes.unit, respectively.
### Suggest changes to these queries. DON'T CHANGE THE FILES YET.
### Suggest any other changes related to this issue.
DO YOU HAVE ANY CLARIFYING QUESTIONS?

# Task 2: Menu creation and update api end points.
## The front end currently supports this new feature.
## POST /api/menus
### This creates the menu.
### Request body: 
{
  "name": "Test Menu",
  "recipes": [
    {
      "id": "6",
      "amount": "20.0",
      "unit": "g"
    },
    {
      "id": "1",
      "amount": "340.0",
      "unit": "g"
    }
  ]
}
### Expected response: 
{
    "success": true,
    "data": {
        "id": 31,
        "name": "Test Menu",
        "recipes": [
          {
            "id": "6",
            "amount": "20.0",
            "unit": "g"
          },
          {
            "id": "1",
            "amount": "340.0",
            "unit": "g"
          }
        ]
    }
}
### The endpoint is currently handled by app.js and services.js.
### Your job is to implement the createMenu method in MenuRepository.js.
#### By inspecting the code, you will see that this createMenu method returns the "data" object expected by the endpoint handler in app.js
ANY QUESTIONS TO CLARIFY ANYTHING?


# TODO

## POST '/api/menus'
## CURRENT API
### request body:
{
  name: "MENU NAME",
  recipeIds: [5, 16],
}
### response:
{
    success: true,
    data: {
        id: 31,
        name: "MENU NAME",
        recipeIds: ["5", "16"]
    }
}
## NEW API
### request body
{
  "name": "Test Menu",
  "recipes": [
    {
      "id": "6",
      "amount": "20.0",
      "unit": "g"
    },
    {
      "id": "1",
      "amount": "340.0",
      "unit": "g"
    }
  ]
}

### response:
{
    "success": true,
    "data": {
        "id": 31,
        "name": "Test Menu",
        "recipes": [
          {
            "id": "6",
            "amount": "20.0",
            "unit": "g"
          },
          {
            "id": "1",
            "amount": "340.0",
            "unit": "g"
          }
        ]
    }
}


## PUT '/api/menus/:id'
## CURRENT API
### request body:
{
  name: "MENU NAME",
  recipeIds: [5, 6],
}
### response
{menuId: "31"}

## NEW API
### request body:
{
  name: "MENU NAME",
  recipes: [{id: 5, amount: '10 g'},{id: 6, amount: '21 ml'}, {id: 10, amount: '3 g'}]
}
### response
{menuId: "31"}


## GET '/api/menus'
## CURRENT API
### response:
[
  {
    id: 30,
    name: "Red Apple Snack",
    recipeIds: [16],
  },
  {
    id: 31,
    name: "MENU NAME",
    recipeIds: [5,16,10],
  },
]
## NEW API
### response:
[
  {
    id: 30,
    name: "Red Apple Snack",
    recipes: [{id: 16, amount: '10 g'}]
  },
  {
    id: 31,
    name: "MENU NAME",
    recipes: [{id: 5, amount: '10 g'},{id: 6, amount: '21 ml'}, {id: 10, amount: '3 g'}]
  },
]

## GET '/api/menus/:id'
## CURRENT API
### response:
{
  id: 31,
  name: "MENU NAME",
  recipeIds: [5, 16]
}
## NEW API
### response:
{
  id: 31,
  name: "MENU NAME",
  recipes: [{id: 5, amount: '10 g'},{id: 6, amount: '21 ml'}, {id: 10, amount: '3 g'}]
}

#  brand.json

1. serving field
 The "serving" field is a string representing either
 the number of grams, milliliters, teaspoons, or tablespoons  per serving.
 For example: "93 g" means 93 grams, "2 tsp" means 2 teaspoons.
 Valid units are:
"g" = grams
"mg" = milligrams
"mcg" = micrograms
"ml" = milliliters
"tsp" = teaspoon
"tbs" = tablespoon

2. density field
 The "density" field specifies a float number that
 represents the density of a liquid in terms of grams per milliters.
 
3. data field
 The "data" field specifies amounts of various
 components (calories, sodium, etc) in grams or 
 milligrams per serving. For example, "8 g" = 8 grams,
 "9 mg" = 9 milligrams. Supported units are:
"g" = grams
"mg" = milligrams
"mcg" = micrograms
 Calories are expressed as an integer;
 for example: "calories": 19 => 19 calories per serving.

# recipe.json

1. Key: the recipe name

2. Value: An object whose key is the ingredient name and value is a string 
representing the amount and amount units.