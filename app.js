import process from "node:process";
import path from 'path';
import { fileURLToPath } from 'url';
import livereload from 'livereload';
import express, { request } from 'express';
import connectLivereload from 'connect-livereload';
import services from './lib/services/services.js';
import { UserService } from "./lib/services/UserService.js";
// import { patchExpress } from "./tracer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------- Enable tracing ----------------
// patchExpress(app); // Wraps all endpoints automatically
// ------------------------------------------------

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from dist (production) or public (development)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
} else {
  const liveReloadServer = livereload.createServer();
  liveReloadServer.watch(path.join(__dirname, 'public'));
  app.use(connectLivereload());

  // Notify browser after initial connection
  liveReloadServer.server.once("connection", () => {
    setTimeout(() => liveReloadServer.refresh("/"), 100);
  });
  app.use(express.static(path.join(__dirname, 'public')));
  console.log(`Serving static dev files from ${path.join(__dirname, 'public')}`);
}

// TODO hardwired for now (single-user)
const SYSTEM_USER_ID = 'a70ff520-1125-4098-90b3-144e22ebe84a'


function reportError(msg, req, error, res, status = 500) {
  msg = `ERROR: ${msg} - req.params: ${JSON.stringify(req.params)}; req.query: ${JSON.stringify(req.query)} - ${error ? error.message : ""} ${status ? `STATUS: ${status}` : ""}`;
  console.error(msg)
  res.status(status).json({ success: false, error: msg })
}

// API routes - Config and system data

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// routes/userSettings.js
app.get('/api/user-settings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    // Returns user settings or default settings
    const settings = await services.getUserSettings(userId);
    res.json({
      success: true,
      data: {
        caloriesPerDay: settings.caloriesPerDay,
        age: settings.age,
        useAge: settings.useAge === 1,
        kidneyStoneRisk: settings.kidneyStoneRisk
      }
    });
  } catch (error) {
    reportError('GET /api/user-settings/:userId', req, error, res);
  }
});

app.post('/api/user-settings', async (req, res) => {
  try {
    const { userId, caloriesPerDay, age, useAge, kidneyStoneRisk } = req.body;
    await services.createUserSettings(userId, { caloriesPerDay, age, useAge, kidneyStoneRisk })
    res.json({
      success: true,
      data: {
        caloriesPerDay,
        age,
        useAge,
        kidneyStoneRisk
      }
    });
  } catch (error) {
    reportError('POST /api/user-settings', req, error, res);
  }
});

app.put('/api/user-settings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { caloriesPerDay, age, useAge, kidneyStoneRisk } = req.body;
    await services.updateUserSettings(userId, { caloriesPerDay, age, useAge, kidneyStoneRisk });
    res.json({
      success: true,
      data: {
        caloriesPerDay,
        age,
        useAge,
        kidneyStoneRisk
      }
    });
  } catch (error) {
    reportError('PUT /api/user-settings/:userId', req, error, res)
  }
});

app.post('/api/dietary-assessment', async (req, res) => {
  try {
    const { userId, type, oxalateMg, totals } = req.body;
    const data = await services.getDietaryAssessment(userId, type, oxalateMg, totals);
    res.json({ success: true, data });
  } catch (error) {
    reportError('POST /api/dietary-assessment', req, error, res);
  }
})

app.get('/api/config', async (req, res) => {
  try {
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
    reportError('GET /api/config', req, error, res);
  }
});

app.get('/api/kidney-stone-risk', async (req, res) => {
  try {
    const data = services.getKidneyStoneRiskData();
    res.json({ success: true, data });
  } catch (error) {
    reportError('GET /api/kidney-stone-risk', req, error, res);
  }
});

app.get('/api/daily-requirements', async (req, res) => {
  try {
    const data = await services.getDailyRequirements(SYSTEM_USER_ID);
    res.json({ success: true, data });
  } catch (error) {
    reportError('GET /api/daily-requirements', req, error, res);
  }
});

// Daily plans routes

app.get('/api/daily-plans', async (req, res) => {
  try {
    const searchTerm = req.query.search;
    const data = await services.getAllDailyPlans({ searchTerm, summary: true, userId: SYSTEM_USER_ID });
    res.json({ success: true, data });
  } catch (error) {
    reportError('GET /api/daily-plans', req, error, res);
  }
});

app.get('/api/daily-plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await services.getDailyPlanDetails(id, SYSTEM_USER_ID);
    res.json({ success: true, data });
    // res.send(JSON.stringify({ success: true, data }, null, 2));
  } catch (error) {
    reportError(`GET /api/daily-plans/:id`, req, error, res);
  }
});

app.post('/api/daily-plans', async (req, res) => {
  try {
    const request = req.body;
    console.log(JSON.stringify(request, null, 2));
    const data = await services.createDailyPlan(request, SYSTEM_USER_ID);
    res.json({ success: true, data });
  } catch (error) {
    reportError(`POST /api/daily-plans`, req, error, res);
  }
});

app.put('/api/daily-plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const request = req.body;
    console.log(JSON.stringify(request, null, 2));
    const data = await services.updateDailyPlan(id, request, SYSTEM_USER_ID);
    res.json({ success: true, data });
  } catch (error) {
    reportError(`PUT /api/daily-plans/:id`, req, error, res);
  }
});

app.delete('/api/daily-plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await services.deleteDailyPlan(id, SYSTEM_USER_ID);
    if (result.ok) {
      res.json({
        "success": true,
        "data": {
          "message": "Daily plan deleted successfully"
        }
      });
    } else {
      reportError(`DELETE /api/daily-plans:id`, req, error, res, 404);
    }
  } catch (error) {
    reportError(`DELETE /api/daily-plans:id`, req, error, res);
  }
});

// Menu routes


// Backend: GET /api/menus
// Current: Returns { id, name, recipeIds }
// Needed: Returns { id, name, recipes: [{id: 5, amount: '10', unit: 'g'},{id: 6, amount: '21', unit: 'ml'}] }
app.get('/api/menus', async (req, res) => {
  try {
    const menus = await services.getAllMenus({ userId: SYSTEM_USER_ID, summary: true });
    res.json({ success: true, data: menus });
  } catch (error) {
    reportError('GET /api/menus', req, error, res);
  }
});

app.get('/api/menus/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const summary = req.query.summary === 'true';
    const data = await services.getMenu({ menuId: id, userId: SYSTEM_USER_ID, summary });
    if (!data) {
      res.status(404).json({ success: false, error: 'Menu not found' });
    } else {
      console.log(JSON.stringify({ success: true, data },null,2))
      res.json({ success: true, data });
    }
  } catch (error) {
    reportError(`GET /api/menus/:id`, req, error, res);
  }
});

app.post('/api/menus', async (req, res) => {
  try {
    const { name, recipes } = req.body
    const data = await services.createMenu({name, recipes, userId: SYSTEM_USER_ID});
    res.json({ success: true, data });
  } catch (error) {
    reportError(`POST /api/menus`, req, error, res);
  }
});

app.put('/api/menus/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, recipes } = req.body;
    const data = await services.updateMenu({ id, name, recipes, userId: SYSTEM_USER_ID });
    res.json({ success: true, data });
  } catch (error) {
    reportError(`PUT /api/menus/:id`, req, error, res);
  }
});

app.delete('/api/menus/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await services.deleteMenu(id, SYSTEM_USER_ID);
    res.json({ success: true, data: { id: id } });
  } catch (error) {
    reportError(`DELETE /api/menus/:id`, req, error, res);
  }
});

// Recipe routes
app.get('/api/recipes', async (req, res) => {
  try {
    const recipes = await services.getAllRecipes(SYSTEM_USER_ID);
    res.json({ success: true, data: recipes });
  } catch (error) {
    reportError('GET /api/recipes', req, error, res);
  }
});

app.get('/api/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const summary = req.query.summary === 'true';
    const recipe = await services.getRecipeDetails(id, summary);
    if (!recipe) {
      res.status(404).json({ success: false, error: `Recipe not found. id: ${id}; summary: ${summary}` });
    } else {
      res.json({ success: true, data: recipe });
    }
  } catch (error) {
    reportError(`GET /api/recipes/:id`, req, error, res);
  }
});

app.get('/api/recipes/:id/full', async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await services.getRecipeFullDetails(id, SYSTEM_USER_ID);
    if (!recipe) {
      res.status(404).json({ success: false, error: `Recipe id ${id} not found` });
    } else {
      res.json({ success: true, data: recipe });
    }
  } catch (error) {
    reportError(`GET /api/recipes/:id/full`, req, error, res);
  }
});

app.post('/api/recipes', async (req, res) => {
  try {
    const { name, ingredients } = req.body;
    if (!name || !ingredients || !Array.isArray(ingredients)) {
      res.status(400).json({
        success: false,
        error: 'Name and ingredients array are required'
      });
    } else {
      const recipeId = await services.createRecipe(name, ingredients, SYSTEM_USER_ID);
      res.json({ success: true, data: { id: recipeId, name } });
    }
  } catch (error) {
    reportError(`POST /api/recipes`, req, error, res);
  }
});

app.put('/api/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, ingredients } = req.body;
    if (!name || !ingredients || !Array.isArray(ingredients)) {
      res.status(400).json({
        success: false,
        error: 'Name and ingredients array are required'
      });
    } else {
      await services.updateRecipe(id, name, ingredients, SYSTEM_USER_ID);
      res.json({ success: true, data: { id, name } });
    }
  } catch (error) {
    reportError(`PUT /api/recipes/:id`, req, error, res);
  }
});

app.delete('/api/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await services.deleteRecipe(id, SYSTEM_USER_ID);
    res.json({ success: true, message: 'Recipe deleted successfully' });
  } catch (error) {
    reportError(`DELETE /api/recipes/:id`, req, error, res);
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
    reportError(`GET /api/ingredients`, req, error, res);
  }
});

app.get('/api/ingredients/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const ingredient = await services.getIngredientDetails(id, SYSTEM_USER_ID);
    if (!ingredient) {
      res.status(404).json({ success: false, error: 'Ingredient not found' });
    } else {
      res.json({ success: true, data: ingredient });
    }
  } catch (error) {
    reportError(`GET /api/ingredients/:id`, req, error, res);
  }
});

app.get('/api/ingredients/:id/full', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const ingredient = await services.getIngredientFullDetails(id, SYSTEM_USER_ID);
    if (!ingredient) {
      res.status(404).json({ success: false, error: 'Ingredient not found' });
    } else {
      res.json({ success: true, data: ingredient });
    }
  } catch (error) {
    reportError(`GET /api/ingredients/:id/full`, req, error, res);
  }
});

app.post('/api/ingredients', async (req, res) => {
  try {
    const ingredientData = req.body;
    if (!ingredientData.name || !ingredientData.serving) {
      res.status(400).json({
        success: false,
        error: 'Name and serving are required'
      });
    } else {
      const brandId = await services.createIngredient(ingredientData, SYSTEM_USER_ID);
      res.json({ success: true, data: { id: brandId } });
    }
  } catch (error) {
    reportError(`POST /api/ingredients`, req, error, res);
  }
});

app.put('/api/ingredients/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const ingredientData = req.body;
    if (!ingredientData.name || !ingredientData.serving) {
      res.status(400).json({
        success: false,
        error: 'Name and serving are required'
      });
    } else {
      await services.updateIngredient(id, ingredientData, SYSTEM_USER_ID);
      res.json({ success: true, data: { id } });
    }
  } catch (error) {
    reportError(`Error in PUT /api/ingredients/:id`, req, error, res);
  }
});

app.delete('/api/ingredients/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await services.deleteIngredient(id, SYSTEM_USER_ID);
    res.json({ success: true, message: 'Ingredient deleted successfully' });
  } catch (error) {
    reportError(`DELETE /api/ingredients/:id`, req, error, res);
  }
});

app.get('/api/nutrients', async (req, res) => {
  try {
    const data = await services.getNutrients();
    if (data) {
      res.json({ success: true, data }, null, 2);
    } else {
      reportError(`GET /api/nutrients`, req, error, res, 404);
    }
  } catch (err) {
    reportError("GET /api/nutrients", req, err, res);
  }
});

app.post('/api/preview/recipe', async (req, res) => {
  try {
    const request = req.body;
    const data = await services.calculateRecipeNutrition(request, SYSTEM_USER_ID);
    if (data) {
      res.json({ success: true, data });
    } else {
      reportError(`POST /api/preview/recipe`, req, error, res, 404);
    }
  } catch (error) {
    reportError("POST /api/preview/recipe", req, error, res);
  }
});

app.post('/api/preview/menu', async (req, res) => {
  try {
    const request = req.body;
    const data = await services.calculateMenuNutrition(request, SYSTEM_USER_ID);
    if (data) {
      res.json({ success: true, data });
    } else {
      reportError(`POST /api/preview/menu`, req, null, res, 404);
    }
  } catch (error) {
    reportError("POST /api/preview/menu", req, error, res);
  }
});

app.post('/api/preview/daily-plan', async (req, res) => {
  try {
    const request = req.body;
    const data = await services.calculateDailyPlanNutrition(request, SYSTEM_USER_ID);
    if (data) {
      res.send(JSON.stringify({ success: true, data }, null, 2));
      // res.json({ success: true, data });
    } else {
      reportError(`POST /api/preview/daily-plan`, req, null, res, 404);
    }
  } catch (error) {
    reportError("POST /api/preview/daily-plan", req, error, res);
  }
});


// Serve index.html for all other routes (SPA)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
