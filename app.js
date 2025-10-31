// FIXED 2025-10-30 5:15pm PDT
// Updated: async routes, ingredients use brandId instead of brandName
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import services from './services.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 8080

// Middleware
app.use(express.json())
app.use(express.static('public'))

// Load configuration from lib/data
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'lib', 'data', 'conf.json'), 'utf8'))

// Serve main SPA page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// REST API Routes

/**
 * GET /api/recipes
 * Returns list of all recipes with their canonical IDs
 */
app.get('/api/recipes', async (req, res) => {
    try {
        const recipes = await services.getAllRecipes()
        res.json({
            success: true,
            data: recipes
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        })
    }
})

/**
 * GET /api/recipes/:recipeId
 * Returns detailed nutrition information for a specific recipe
 * Query params:
 *   - summary: boolean (default: false)
 */
app.get('/api/recipes/:recipeId', async (req, res) => {
    try {
        const { recipeId } = req.params
        const summary = req.query.summary === 'true'
        
        const recipeData = await services.getRecipeDetails(recipeId, summary)
        
        if (!recipeData) {
            return res.status(404).json({
                success: false,
                error: 'Recipe not found'
            })
        }
        
        res.json({
            success: true,
            data: recipeData
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        })
    }
})

/**
 * GET /api/config
 * Returns UI configuration settings
 */
app.get('/api/config', (req, res) => {
    try {
        res.json({
            success: true,
            data: config
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        })
    }
})

/**
 * GET /api/ingredients
 * Returns list of all ingredients with compact info
 */
app.get('/api/ingredients', async (req, res) => {
    try {
        const searchTerm = req.query.search || ''
        const ingredients = searchTerm 
            ? await services.searchIngredients(searchTerm)
            : await services.getAllIngredients()
        
        res.json({
            success: true,
            data: ingredients
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        })
    }
})

/**
 * GET /api/ingredients/:brandId
 * Returns detailed information for a specific ingredient
 */
app.get('/api/ingredients/:brandId', async (req, res) => {
    try {
        const brandId = parseInt(req.params.brandId)
        if (isNaN(brandId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid brand ID'
            })
        }
        
        const ingredient = await services.getIngredientDetails(brandId)
        
        if (!ingredient) {
            return res.status(404).json({
                success: false,
                error: 'Ingredient not found'
            })
        }
        
        res.json({
            success: true,
            data: ingredient
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        })
    }
})

/**
 * GET /api/kidney-stone-risk
 * Returns kidney stone risk levels and oxalate limits
 */
app.get('/api/kidney-stone-risk', (req, res) => {
    try {
        res.json({
            success: true,
            data: services.getKidneyStoneRiskData()
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        })
    }
})

/**
 * GET /api/daily-requirements
 * Returns daily nutritional requirements
 */
app.get('/api/daily-requirements', (req, res) => {
    try {
        res.json({
            success: true,
            data: services.getDailyRequirements()
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        })
    }
})

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    })
})

// Start server
app.listen(PORT, () => {
    console.log(`Diet Guidelines server running at http://localhost:${PORT}`)
    console.log(`API endpoints:`)
    console.log(`  GET /api/recipes - List all recipes`)
    console.log(`  GET /api/recipes/:recipeId - Get recipe details`)
    console.log(`  GET /api/ingredients - List all ingredients`)
    console.log(`  GET /api/ingredients?search=term - Search ingredients`)
    console.log(`  GET /api/ingredients/:brandName - Get ingredient details`)
    console.log(`  GET /api/kidney-stone-risk - Get kidney stone risk data`)
    console.log(`  GET /api/daily-requirements - Get daily nutritional requirements`)
    console.log(`  GET /api/config - Get UI configuration`)
})

export default app