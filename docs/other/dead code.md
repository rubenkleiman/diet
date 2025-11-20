diet@backend-assessment>  ./node_modules/.bin/dead-code-checker -f ./lib


 █▀▄ █▀▀ ▄▀█ █▀▄   █▀▀ █▀█ █▀▄ █▀▀   █▀▀ █ █ █▀▀ █▀▀ █▄▀ █▀▀ █▀█
 █▄▀ ██▄ █▀█ █▄▀   █▄▄ █▄█ █▄▀ ██▄   █▄▄ █▀█ ██▄ █▄▄ █ █ ██▄ █▀▄


🔍 Analyzing codebase...
 █████████████████████████ | 100% | 100/100 | 📁 Collecting files 
 █████████████████████████ | 100% | 17/17 | 📖 Reading files 📄 .../services/services.js
 █████████████████████████ | 100% | 17/17 | 🔍 Processing declarations 📄 .../services/services.js
 █████████████████████████ | 100% | 17/17 | ⚡ Analyzing usage 📄 .../services/services.js


✨ Dead Code Analysis Summary
📊 Found 66 unused declarations in 10 files

📈 Statistics:
  • Functions: 5 unused
  • Variables: 11 unused
  • External imports: 0 unused
  • Other: 50 unused
  • Files affected: 10
  • Estimated lines saved: ~528

🔍 Detailed Results:


📁 lib/calculators/Converter.js (2 items):
  🔹 other toGrams:8
  🔹 other getMeasureComponents:38

📁 lib/calculators/DashCalculator.js (13 items):
  🔹 other calculateAdherence:3
  🔹 other perServing:4
  📦 const/let/var score:9
  📦 const/let/var reasons:10
  📦 const/let/var sodium:14
  🔹 other satFat:31
  🔹 other satFatPercent:33
  🔹 other protein:46
  🔹 other sugars:74
  🔹 other sugarCalories:75
  🔹 other sugarPercent:76
  🔹 other fiber:83
  🔹 other rating:90

📁 lib/calculators/DietaryAssessmentCalculator.js (31 items):
  🔹 other calculate:43
  🔹 other dashAssessment:62
  🔹 other kidneyRiskData:72
  🔹 other oxalateRisk:73
  🔹 other recommendations:79
  🔹 other nutritionScore:89
  🔹 other calculateDashAdherence:106
  🔹 other guidelines:107
  🔹 other reasons:108
  🔹 other goodCount:109
  🔹 other poorCount:110
  🔹 other breakdown:111
  🔹 other totalCalories:113
  🔹 other sodium:116
  📦 const/let/var saturatedFat:135
  ⚡ function saturatedFatCalories:136
  🔹 other saturatedFatPercent:137
  🔹 other sugars:153
  📦 const/let/var sugarCalories:154
  📦 const/let/var sugarPercent:155
  🔹 other fiber:189
  🔹 other protein:207
  📦 const/let/var proteinCalories:208
  ⚡ function proteinPercent:209
  🔹 other adherence:225
  🔹 other calculateOxalateLevel:246
  🔹 other generateRecommendations:287
  🔹 other target:308
  🔹 other calculateNutritionScore:338
  🔹 other score:339
  ⚡ function adherenceScores:342

📁 lib/db/Database.js (10 items):
  🔹 other connect:15
  🔹 other dbPath:20
  🔹 other close:35
  🔹 other getDb:44
  ⚡ function run:52
  🔹 other db:53
  📦 const/let/var all:64
  🔹 other beginTransaction:70
  🔹 other commit:75
  🔹 other rollback:80

📁 lib/objects/Brand.js (1 items):
  🔹 other Brand:2

📁 lib/objects/Brands.js (2 items):
  📦 const/let/var info:10
  📦 const/let/var Brands:24

📁 lib/objects/Oxalates.js (2 items):
  🔹 other getPerGram:10
  🔹 other value:19

📁 lib/objects/Recipe.js (3 items):
  📦 const/let/var measureComponents:6
  🔹 other getIngredients:23
  🔹 other findAmount:28

📁 lib/services/services.js (1 items):
  🔹 other services:383

💡 Tip: Remove these unused declarations to improve code quality and reduce bundle size.


diet@backend-assessment> 