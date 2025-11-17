// FIXED 2025-10-30 5pm
// Populate database from JSON files - THROWAWAY (one-time migration)
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import database from './Database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SYSTEM_USER_ID = 'a70ff520-1125-4098-90b3-144e22ebe84a'

async function populateDatabase() {
    try {
        console.log('Populating database from JSON files...\n')

        await database.connect()

        // Load JSON files
        const brandsPath = path.join(__dirname, '../data/brands.json')
        const recipesPath = path.join(__dirname, '../data/recipes.json')
        const dailyReqPath = path.join(__dirname, '../data/dailyRequirements.json')

        const brandsData = JSON.parse(fs.readFileSync(brandsPath, 'utf8'))
        const recipesData = JSON.parse(fs.readFileSync(recipesPath, 'utf8'))
        const dailyReqData = JSON.parse(fs.readFileSync(dailyReqPath, 'utf8'))

        // Start transaction
        await database.beginTransaction()

        try {
            // 1. Populate brands and brand_data
            console.log('Populating brands...')
            let brandCount = 0
            const brandIdMap = {} // Map brand name to database ID

            for (const [brandName, brandInfo] of Object.entries(brandsData)) {
                // Parse serving
                const servingParts = brandInfo.serving.split(' ')
                const serving = parseFloat(servingParts[0])
                const servingUnit = servingParts[1]

                // Parse oxalate
                let oxalatePerGram = null
                let oxalateUnit = null
                if (brandInfo.oxalatePerGram) {
                    const oxParts = brandInfo.oxalatePerGram.split(' ')
                    oxalatePerGram = parseFloat(oxParts[0])
                    oxalateUnit = oxParts[1]
                }

                // Insert brand
                const brandResult = await database.run(`
                    INSERT INTO brands (user_id, name, serving, serving_unit, density, oxalate_per_gram, oxalate_per_gram_unit)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    SYSTEM_USER_ID,
                    brandName,
                    serving,
                    servingUnit,
                    brandInfo.density || null,
                    oxalatePerGram,
                    oxalateUnit
                ])

                const brandId = brandResult.lastID
                brandIdMap[brandName] = brandId

                // Insert brand_data
                const data = brandInfo.data
                await database.run(`
                    INSERT INTO brand_data (
                        brand_id, user_id, calories, sodium, cholesterol, sugars, protein,
                        dietary_fiber, carbohydrates, calcium, potassium, magnesium,
                        selenium, manganese, zinc, iron, fat, saturated_fat,
                        polyunsaturated_fat, monosaturated_fat, thiamin, riboflavin,
                        niacin, folic_acid, phosphorus, vitamin_a, vitamin_b6,
                        vitamin_c, vitamin_d, vitamin_e, vitamin_k
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    brandId,
                    SYSTEM_USER_ID,
                    data.calories || null,
                    data.sodium || null,
                    data.cholesterol || null,
                    data.sugars || null,
                    data.protein || null,
                    data['dietary fiber'] || null,
                    data.carbohydrates || null,
                    data.calcium || null,
                    data.potassium || null,
                    data.magnesium || null,
                    data.selenium || null,
                    data.manganese || null,
                    data.zinc || null,
                    data.iron || null,
                    data.fat || null,
                    data.saturatedFat || null,
                    data.polyunsaturatedFat || null,
                    data.monosaturatedFat || null,
                    data.thiamin || null,
                    data.riboflavin || null,
                    data.niacin || null,
                    data['folic acid'] || null,
                    data.phosphorus || null,
                    data['vitamin A'] || null,
                    data['vitamin B6'] || null,
                    data['vitamin C'] || null,
                    data['vitamin D'] || null,
                    data['vitamin E'] || null,
                    data['vitamin K'] || null
                ])

                brandCount++
            }
            console.log(`✓ Populated ${brandCount} brands with nutrition data`)

            // 2. Populate recipes
            console.log('\nPopulating recipes...')
            let recipeCount = 0

            for (const [recipeName, ingredients] of Object.entries(recipesData)) {
                // Insert recipe
                const recipeResult = await database.run(`
                    INSERT INTO recipes (user_id, name)
                    VALUES (?, ?)
                `, [SYSTEM_USER_ID, recipeName])

                const recipeId = recipeResult.lastID

                // Insert recipe items
                let itemOrder = 1
                for (const [ingredientName, measure] of Object.entries(ingredients)) {
                    const brandId = brandIdMap[ingredientName]
                    if (!brandId) {
                        console.warn(`  ⚠ Warning: Brand "${ingredientName}" not found for recipe "${recipeName}"`)
                        continue
                    }

                    const measureParts = measure.split(' ')
                    const amount = parseFloat(measureParts[0])
                    const unit = measureParts[1]

                    await database.run(`
                        INSERT INTO recipe_items (recipe_id, brand_id, item_order, amount, unit)
                        VALUES (?, ?, ?, ?, ?)
                    `, [recipeId, brandId, itemOrder, amount, unit])

                    itemOrder++
                }

                recipeCount++
            }
            console.log(`✓ Populated ${recipeCount} recipes`)

            // 3. Populate daily requirements
            console.log('\nPopulating daily requirements...')
            let reqCount = 0

            for (const [nutrientName, reqData] of Object.entries(dailyReqData)) {
                await database.run(`
                    INSERT INTO daily_requirements (
                        name, recommended, dash_recommendation, minimum, maximum, note, source
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    nutrientName,
                    reqData.recommended || null,
                    reqData.dashRecommendation || null,
                    reqData.minimum || null,
                    reqData.maximum || null,
                    reqData.note || null,
                    reqData.source || null
                ])

                reqCount++
            }
            console.log(`✓ Populated ${reqCount} daily requirements`)

            // Commit transaction
            await database.commit()
            console.log('\n✅ Database populated successfully!')

        } catch (error) {
            await database.rollback()
            throw error
        }

    } catch (error) {
        console.error('❌ Error populating database:', error)
        process.exit(1)
    } finally {
        await database.close()
    }
}

populateDatabase()