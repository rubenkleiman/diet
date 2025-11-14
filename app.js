import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import services from './services.js';
import { report } from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;




// Middleware
// Set a less restrictive CSP
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from dist (production) or public (development)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
} else {
  // In development, webpack-dev-server handles the frontend
  // app.use('/css', express.static(path.join(__dirname, 'public/css')));
}

function reportError(msg, error, res) {
  console.error(msg, error);
  res.status(500).json({ success: false, error: error.message });
}

// TODO hardwired for now (single-user)
const SYSTEM_USER_ID = 'a70ff520-1125-4098-90b3-144e22ebe84a'

// API routes - Config and system data
app.get('/api/config', async (req, res) => {
  try {
    // Return configuration data - modify as needed
    res.json({
      success: true,
      data: {
        ui: {
          recipeListMaxHeight: '600px',
          recipeDetailsMaxHeight: '800px'
        }
      }
    });
  } catch (error) {
    reportError('Error in /api/config:', error, res);
  }
});

app.get('/api/kidney-stone-risk', async (req, res) => {
  try {
    const data = services.getKidneyStoneRiskData();
    res.json({ success: true, data });
  } catch (error) {
    reportError('Error in /api/kidney-stone-risk:', error, res);
  }
});

app.get('/api/daily-requirements', async (req, res) => {
  try {
    const data = await services.getDailyRequirements(SYSTEM_USER_ID);
    res.json({ success: true, data });
  } catch (error) {
    reportError('Error in /api/daily-requirements:', error, res);
  }
});

// Daily plans routes
app.get('/api/daily-plans', async (req, res) => {
  try {
    const searchTerm = req.query.search;
    const data = await services.getAllDailyPlans(searchTerm, SYSTEM_USER_ID);
    res.json({ success: true, data });
  } catch (error) {
    reportError('Error in GET /api/daily-plans:', error, res);
  }
});

app.get('/api/daily-plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await services.getDailyPlanDetails(id, SYSTEM_USER_ID);
    res.json({ success: true, data });
    // res.send(JSON.stringify({ success: true, data }, null, 2));
  } catch (error) {
    reportError('Error GET /api/daily-plans/:id', error, res);
  }
});

app.post('/api/daily-plans', async (req, res) => {
  try {
    const request = req.body;
    const data = await services.createDailyPlan(request, SYSTEM_USER_ID);
    res.json({ success: true, data });
  } catch (error) {
    reportError('Error POST /api/daily-plans', error, res);
  }
});

app.put('/api/daily-plans/:id', async (req, res) => {
  try {
    const { id } = body.params;
    const request = req.body;
    const data = await services.updateDailyPlan(id, request, SYSTEM_USER_ID);
    res.json({ success: true, data });
  } catch (error) {
    reportError('Error PUT /api/daily-plans/:id', error, res);
  }
});

app.delete('/api/daily-plans/:id', async (req, res) => {
  try {
    const { id } = body.params;
    await services.deleteDailyPlan(id, SYSTEM_USER_ID);
    res.json({
      "success": true,
      "data": {
        "message": "Daily plan deleted successfully"
      }
    });
  } catch (error) {
    reportError('Error DELETE /api/daily-plans', error, res);
  }
});

// Menu routes
app.get('/api/menus', async (req, res) => {
  try {
    const menus = await services.getAllMenus(SYSTEM_USER_ID);
    res.json({ success: true, data: menus });
  } catch (error) {
    reportError('Error in /api/menus:', error, res);
  }
});

app.get('/api/menus/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const summary = req.query.summary === 'true';
    const data = await services.getMenuDetails(id, summary);

    if (!data) {
      return res.status(404).json({ success: false, error: 'Menu not found' });
    }

    res.json({ success: true, data });
  } catch (error) {
    reportError('Error in /api/menus/:id:', error, res);
  }
});

app.post('/api/menus', async (req, res) => {
  try {
    const { name, recipeIds } = req.body
    const menu = await services.createMenu(name, recipeIds, SYSTEM_USER_ID);
    return { success: true, data: menu };
  } catch (error) {
    reportError('Error in POST /api/menus', error, res);
  }
});

app.put('/api/menus/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, recipeIds } = req.body;
    const data = await services.updateMenu(id, name, recipeIds, SYSTEM_USER_ID);
    return { success: true, data };
  } catch (error) {
    reportError('Error in PUT /api/menus/:id', error, res);
  }
});

app.delete('/api/menus/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await services.deleteMenu(id, SYSTEM_USER_ID);
    res.json({ success: true, data: { id: id } });
  } catch (error) {
    reportError('Error in DELETE /api/menus/:id', error, res);
  }
});

// Recipe routes
app.get('/api/recipes', async (req, res) => {
  try {
    const recipes = await services.getAllRecipes(SYSTEM_USER_ID);
    res.json({ success: true, data: recipes });
  } catch (error) {
    reportError('Error in /api/recipes:', error, res);
  }
});

app.get('/api/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const summary = req.query.summary === 'true';
    const recipe = await services.getRecipeDetails(id, summary);

    if (!recipe) {
      return res.status(404).json({ success: false, error: 'Recipe not found' });
    }

    res.json({ success: true, data: recipe });
  } catch (error) {
    reportError('Error in /api/recipes/:id:', error, res);
  }
});

app.get('/api/recipes/:id/full', async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await services.getRecipeFullDetails(id, SYSTEM_USER_ID);

    if (!recipe) {
      return res.status(404).json({ success: false, error: 'Recipe not found' });
    }

    res.json({ success: true, data: recipe });
  } catch (error) {
    reportError('Error in /api/recipes/:id/full:', error, res);
  }
});

app.post('/api/recipes', async (req, res) => {
  try {
    const { name, ingredients } = req.body;

    if (!name || !ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({
        success: false,
        error: 'Name and ingredients array are required'
      });
    }

    const recipeId = await services.createRecipe(name, ingredients, SYSTEM_USER_ID);
    res.json({ success: true, data: { id: recipeId, name } });
  } catch (error) {
    reportError('Error in POST /api/recipes:', error, res);
  }
});

app.put('/api/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, ingredients } = req.body;

    if (!name || !ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({
        success: false,
        error: 'Name and ingredients array are required'
      });
    }

    await services.updateRecipe(id, name, ingredients, SYSTEM_USER_ID);
    res.json({ success: true, data: { id, name } });
  } catch (error) {
    reportError('Error in PUT /api/recipes/:id:', error, res);
  }
});

app.delete('/api/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await services.deleteRecipe(id, SYSTEM_USER_ID);
    res.json({ success: true, message: 'Recipe deleted successfully' });
  } catch (error) {
    reportError('Error in DELETE /api/recipes/:id:', error, res);
  }
});

// Ingredient routes
app.get('/api/ingredients', async (req, res) => {
  try {
    const searchTerm = req.query.search;
    let ingredients;

    if (searchTerm) {
      ingredients = await services.searchIngredients(searchTerm, SYSTEM_USER_ID);
    } else {
      ingredients = await services.getAllIngredients(SYSTEM_USER_ID);
    }

    res.json({ success: true, data: ingredients });
  } catch (error) {
    reportError('Error in /api/ingredients:', error, res);
  }
});

app.get('/api/ingredients/:id', async (req, res) => {
  try {
    const brandId = parseInt(req.params.id);
    const ingredient = await services.getIngredientDetails(brandId, SYSTEM_USER_ID);

    if (!ingredient) {
      return res.status(404).json({ success: false, error: 'Ingredient not found' });
    }

    res.json({ success: true, data: ingredient });
  } catch (error) {
    reportError('Error in /api/ingredients/:id:', error, res);
  }
});

app.get('/api/ingredients/:id/full', async (req, res) => {
  try {
    const brandId = parseInt(req.params.id);
    const ingredient = await services.getIngredientFullDetails(brandId, SYSTEM_USER_ID);

    if (!ingredient) {
      return res.status(404).json({ success: false, error: 'Ingredient not found' });
    }

    res.json({ success: true, data: ingredient });
  } catch (error) {
    reportError('Error in /api/ingredients/:id/full:', error, res);
  }
});

app.post('/api/ingredients', async (req, res) => {
  try {
    const ingredientData = req.body;

    if (!ingredientData.name || !ingredientData.serving) {
      return res.status(400).json({
        success: false,
        error: 'Name and serving are required'
      });
    }

    const brandId = await services.createIngredient(ingredientData, SYSTEM_USER_ID);
    res.json({ success: true, data: { id: brandId } });
  } catch (error) {
    reportError('Error in POST /api/ingredients:', error, res);
  }
});

app.put('/api/ingredients/:id', async (req, res) => {
  try {
    const brandId = parseInt(req.params.id);
    const ingredientData = req.body;

    if (!ingredientData.name || !ingredientData.serving) {
      return res.status(400).json({
        success: false,
        error: 'Name and serving are required'
      });
    }

    await services.updateIngredient(brandId, ingredientData, SYSTEM_USER_ID);
    res.json({ success: true, data: { id: brandId } });
  } catch (error) {
    reportError('Error in PUT /api/ingredients/:id:', error, res);
  }
});

app.delete('/api/ingredients/:id', async (req, res) => {
  try {
    const brandId = parseInt(req.params.id);
    await services.deleteIngredient(brandId, SYSTEM_USER_ID);
    res.json({ success: true, message: 'Ingredient deleted successfully' });
  } catch (error) {
    reportError('Error in DELETE /api/ingredients/:id:', error, res);
  }
});

// Serve index.html for all other routes (SPA)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");
  next();
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ✅ GOOD - Only runs when executed directly
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Frontend dev server: http://localhost:3001`);
  }
});

export default app;
