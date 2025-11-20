
# User settings

## Get settings for user or default settings if user hasn't changed them

### curl command
 curl -X GET http://localhost:3000/api/user-settings/a70ff520-1125-4098-90b3-144e22ebe84a

### returns something like:

{"success":true,"data":{"caloriesPerDay":2000,"age":null,"useAge":false,"kidneyStoneRisk":"Normal"}}

or 

{"success": false, "error": "an error message"}

## Create settings for user

IMPORTANT: the PUT /api/user-settings/:userId endpoint will create it if it doesn't exist.

### curl command
 curl -X POST http://localhost:3000/api/user-settings   -H "Content-Type: application/json" -d '{"userId": "a70ff520-1125-4098-90b3-144e22ebe84a", "caloriesPerDay": 2000, "age": null, "useAge": false, "kidneyStoneRisk": "High" }'

### returns something like:

{"success":true,"data":{"caloriesPerDay":2000,"age":null,"useAge":false,"kidneyStoneRisk":"High"}}  

or 

{"success": false, "error": "an error message"}
 
## Update settings for user (creates settings if they don't exist in db)

### curl command
 curl -X PUT http://localhost:3000/api/user-settings/a70ff520-1125-4098-90b3-144e22ebe84a   -H "Content-Type: application/json" -d '{"caloriesPerDay": 2222, "age": null, "useAge": false, "kidneyStoneRisk": "High" }'

### returns something like:

{"success":true,"data":{"caloriesPerDay":2000,"age":null,"useAge":false,"kidneyStoneRisk":"High"}}

or 

{"success": false, "error": "an error message"}

 # Dietary assessment

## Get a dietary assessment for the user

### curl command
  curl -X POST http://localhost:3000/api/dietary-assessment  -H "Content-Type: application/json" -d '{
  "totals": {
    "calories": 850,
    "sodium": 420,
    "saturated_fat": 12,
    "sugars": 25,
    "potassium": 1200,
    "dietary_fiber": 8,
    "protein": 35,
    "carbohydrates": 95
  },
  "oxalateMg": 67.3,
  "type": "menu",
  "userId": "a70ff520-1125-4098-90b3-144e22ebe84a"
}'

### returns something like:

{"success":true,"data":{"dashAdherence":"Poor","dashReasons":"excellent sodium ✓✓, high saturated fat ✗, high sugar (12% > 10% calories WHO) ⚠, good potassium ✓, good fiber ✓, good protein ✓","oxalateLevel":"Moderate","oxalateRisk":{"status":"safe","percent":33.65,"color":"#27ae60","message":""},"recommendations":["Your sodium levels are excellent - keep it up!","Try reducing saturated fat. Current: 12.7% of calories, Target: <6%","Consider reducing added sugars. Current: 11.8% of calories, WHO recommends <10%"],"nutritionScore":60,"breakdown":{"sodium":{"value":420,"assessment":"excellent","target":500},"saturatedFat":{"value":12,"caloriePercent":12.705882352941176,"assessment":"poor","target":6},"sugar":{"value":25,"caloriePercent":11.76470588235294,"assessment":"poor","target":10},"potassium":{"value":1200,"assessment":"good","target":1000},"fiber":{"value":8,"assessment":"good","target":8},"protein":{"value":35,"caloriePercent":16.470588235294116,"assessment":"good","target":"15-25%"}}}}

or 

{"success": false, "error": "an error message"}

