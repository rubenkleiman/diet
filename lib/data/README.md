# BUGS
## polyunsaturated fats not saving in ingredients edit
## remove dead nutrition score code

# Can you give me a javascript function that for a set of nutritional amounts will return some measure of adherence to DASH guidelines? 
## The input argument is "totals" (it looks like this):
{
  calories: 1032.8,
  sodium: 111.9,
  cholesterol: 196.5,
  sugars: 27.2,
  protein: 16.3,
  dietary_fiber: 16.1,
  carbohydrates: 92,
  calcium: 305.9,
  potassium: 864.9,
  magnesium: 25.6,
  selenium: 0.8,
  manganese: 0.3,
  zinc: 0.3,
  iron: 4.7,
  fat: 68.6,
  saturated_fat: 33.1,
  polyunsaturated_fat: 1.4,
  monosaturated_fat: 9.2,
  thiamin: 0.5,
  riboflavin: 0.3,
  niacin: 4,
  folic_acid: 118.1,
  phosphorous: 0,
  vitamin_a: 396.1,
  vitamin_b6: 0.3,
  vitamin_c: 13.1,
  vitamin_d: 1.3,
  vitamin_e: 3.1,
  vitamin_k: 11.9,
}
## The function returns an object like this:
{
      adherence,
      reasons: reasons.join(', '),
      breakdown
}
### adherence is a string providing a qualitative estimate of adherence (e.g., Poor to Excellent)
### reasons is an array of strings providing detailed reasons for the assessment per nutrient.
###  breakdown is an object whose keys are nutrition names (same as keys in totals) and whose values are an object like this: {value, assessment, target, caloriePercent}
####  value is the nutrition amount (from totals)
####  assessment is a string with some qualitative assessment (e.g., "low", "good", "excellent", "high") for the nutrient
####  target is a string or number specifying the target for the nutritient
#### caloriePercent is only provided when the nutrition is calculated as a percent of the total.calories (that is, for saturatedFat, totalFat, sugars, protein, or carbohydrates). 
Makes sense?

# I have a nodejs/express web app that helps me plan my meals using nutritional information.
# I'd like you to play the role of backend engineer.
# I'm uploading the relevant backend files for your first feature.
DO YOU HAVE ANY CLARIFYING QUESTIONS?

# Study DietaryAssessmentServices.js deeply. We'll improve the DASH assessment.
## DASH_GUIDELINES instance variable: there should be only one set of guidelines whether the assessment type is for menus, daily plans or recipes. Use only the daily plan guidelines for all assessment types.
## Add the following to the DASH guidelines:
### Fat: maximum <= 27% of total calories (approx. 60 g/day for a 2,000-cal diet)
### cholesterol: maximum is <= 150 mg/day
### calcium: minimum is 1,250 mg/day
### magnesium: minimum 500 mg/day
### carbohydrates: excellent is <= 55% of total calories (≈ 275 g/day for a 2,000-cal diet)
## Update the following:
### fiber: minimum 25 g
### saturated_fat_percent: maximum is ≤ 6% of total calories (For a 2,000-calorie diet: ≤ 13 g/day)
### sugar_percent: excellent is <= 5% of daily calories; good: <= 10% of daily calories
## Each macronutrient has a known calories-per-gram value:
### The general formula for carbohydrates, protein, sugar, and fats is: grams = (<nutrient percent> / 100) × <total calories> ÷ (<calories per gram>)
### Note that the formula is based on nutrient PERCENT
#### Carbohydrates: 4 kcal per gram
#### Protein: 4 kcal per gram
#### Sugars: 4 kcal per gram
#### Fat: 9 kcal per gram
DO YOU HAVE ANY CLARIFYING QUESTIONS?
