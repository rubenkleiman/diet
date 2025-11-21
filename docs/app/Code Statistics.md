# Counts

find ./lib -name "*.js" -type f -print0 | xargs -0 cat | wc -l
find ./lib -name "*.js" -type f -print0 | xargs -0 wc -l

find ./public -name "*.js" -type f -print0 | xargs -0 cat | wc -l
find ./public -type f -print0 | xargs -0 wc -l

# Concatenate files

find public -type f -name "*.js" -print0 | xargs -0 cat > frontend-classes-combined.js

Refreshing recipes page:
🟢 Client init started
APIClient.js:40 🌐 API Call: GET /config
APIClient.js:40 🌐 API Call: GET /kidney-stone-risk
APIClient.js:40 🌐 API Call: GET /daily-requirements
APIClient.js:40 🌐 API Call: GET /nutrients
APIClient.js:55 💾 Cached: /config
APIClient.js:55 💾 Cached: /kidney-stone-risk
APIClient.js:55 💾 Cached: /daily-requirements
APIClient.js:55 💾 Cached: /nutrients
APIClient.js:40 🌐 API Call: GET /recipes
client.js:82 ✅ Client init completed successfully
APIClient.js:55 💾 Cached: /recipes

Selecting a recipe:
APIClient.js:40 🌐 API Call: GET /recipes/1?summary=false
APIClient.js:55 💾 Cached: /recipes/1?summary=false
APIClient.js:40 🌐 API Call: POST /dietary-assessment
APIClient.js:63 🗑️ Cache cleared for: dietary-assessment

Selecting the same recipe:
📦 Cache HIT: /recipes/1?summary=false
APIClient.js:40 🌐 API Call: POST /dietary-assessment
APIClient.js:63 🗑️ Cache cleared for: dietary-assessment

BUG: The results of the "POST /dietary-assessment" should have been cached the first time the recipe was selected.