[
  {
    id: 9,
    name: "Farfalle (Plain)",
    recipe_id: 13,
    amount: 50,
    unit: "g",
    density: null,
  },
  {
    id: 9,
    name: "Farfalle (Plain)",
    recipe_id: 13,
    amount: 118,
    unit: "ml",
    density: 0.99,
  },
  {
    id: 9,
    name: "Farfalle (Plain)",
    recipe_id: 13,
    amount: 80,
    unit: "g",
    density: null,
  },
  {
    id: 9,
    name: "Farfalle (Plain)",
    recipe_id: 16,
    amount: 100,
    unit: "g",
    density: null,
  },
  {
    id: 7,
    name: "Granola with Milk",
    recipe_id: 1,
    amount: 20,
    unit: "g",
    density: null,
  },
  {
    id: 7,
    name: "Granola with Milk",
    recipe_id: 1,
    amount: 20,
    unit: "g",
    density: 0.92,
  },
  {
    id: 7,
    name: "Granola with Milk",
    recipe_id: 1,
    amount: 20,
    unit: "g",
    density: 1.37,
  },
  {
    id: 7,
    name: "Granola with Milk",
    recipe_id: 1,
    amount: 200,
    unit: "g",
    density: 1.033,
  },
  {
    id: 7,
    name: "Granola with Milk",
    recipe_id: 1,
    amount: 10,
    unit: "g",
    density: null,
  },
  {
    id: 7,
    name: "Granola with Milk",
    recipe_id: 1,
    amount: 30,
    unit: "g",
    density: null,
  },
  {
    id: 6,
    name: "Hot Oatmeal",
    recipe_id: 12,
    amount: 56,
    unit: "g",
    density: null,
  },
  {
    id: 6,
    name: "Hot Oatmeal",
    recipe_id: 12,
    amount: 10,
    unit: "g",
    density: 1.37,
  },
  {
    id: 6,
    name: "Hot Oatmeal",
    recipe_id: 12,
    amount: 125,
    unit: "g",
    density: 1.033,
  },
  {
    id: 31,
    name: "MENU NAME",
    recipe_id: 5,
    amount: 100,
    unit: "g",
    density: null,
  },
  {
    id: 31,
    name: "MENU NAME",
    recipe_id: 5,
    amount: 44,
    unit: "ml",
    density: 0.92,
  },
  {
    id: 31,
    name: "MENU NAME",
    recipe_id: 5,
    amount: 113,
    unit: "g",
    density: null,
  },
  {
    id: 31,
    name: "MENU NAME",
    recipe_id: 5,
    amount: 80,
    unit: "g",
    density: null,
  },
  {
    id: 31,
    name: "MENU NAME",
    recipe_id: 16,
    amount: 100,
    unit: "g",
    density: null,
  },
  {
    id: 30,
    name: "Red Apple Snack",
    recipe_id: 16,
    amount: 100,
    unit: "g",
    density: null,
  },
  {
    id: 29,
    name: "Risotto",
    recipe_id: 5,
    amount: 100,
    unit: "g",
    density: null,
  },
  {
    id: 29,
    name: "Risotto",
    recipe_id: 5,
    amount: 44,
    unit: "ml",
    density: 0.92,
  },
  {
    id: 29,
    name: "Risotto",
    recipe_id: 5,
    amount: 113,
    unit: "g",
    density: null,
  },
  {
    id: 29,
    name: "Risotto",
    recipe_id: 5,
    amount: 80,
    unit: "g",
    density: null,
  },
]

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
  id: 11,
  name: "MENU NAME",
  recipes: [{id: 5, amount: '10', unit: 'g'},{id: 6, amount: '21', unit: 'ml'}]
}

### response:
{
    success: true,
    data: {
        id: 31,
        name: "MENU NAME",
        recipeIds: [{id: 5, amount: '10 g'},{id: 6, amount: '21 ml'}]
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