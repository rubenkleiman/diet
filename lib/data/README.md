# TODO

- allow ml in recipes.json as long as there is a density for it in brands.json; else error
- oz to g conversions
- except for oxalates and the compact.display, omit displaying nutrition data when there's zero content

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