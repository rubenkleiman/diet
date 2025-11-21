# Counts

find ./lib -name "*.js" -type f -print0 | xargs -0 cat | wc -l
find ./lib -name "*.js" -type f -print0 | xargs -0 wc -l

find ./public -name "*.js" -type f -print0 | xargs -0 cat | wc -l
find ./public -type f -print0 | xargs -0 wc -l

# Concatenate files

find public -type f -name "*.js" -print0 | xargs -0 cat > concatenated-frontend-files.js
