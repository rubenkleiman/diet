import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import services from './services.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from dist (production) or public (development)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
} else {
  // In development, webpack-dev-server handles the frontend
  app.use('/css', express.static(path.join(__dirname, 'public/css')));
}

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
    console.error('Error in /api/config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/kidney-stone-risk', async (req, res) => {
  try {
    const data = services.getKidneyStoneRiskData();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in /api/kidney-stone-risk:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/daily-requirements', async (req, res) => {
  try {
    const data = await services.getDailyRequirements(services.currentUserId);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in /api/daily-requirements:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Menu routes


// Recipe routes
app.get('/api/menus', async (req, res) => {
  try {
    const menus = await services.getAllMenus(services.currentUserId);
    res.json({ success: true, data: menus });
  } catch (error) {
    console.error('Error in /api/menus:', error);
    res.status(500).json({ success: false, error: error.message });
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
    console.error('Error in /api/menus/:id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/menus', async (req, res) => {
  try {
    const { name, recipeIds } = req.body
    const menu = await services.createMenu(name, recipeIds, services.currentUserId);
    return { success: true, data: menu };
  } catch (error) {
    console.error('Error in POST /api/menus', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/menus/:id', async (req, res) => {
  try {

    const { id } = req.params;
    const { name, recipeIds } = req.body;
    const data = await services.updateMenu(id, name, recipeIds, services.currentUserId);
    return { success: true, data };
  } catch (error) {
    console.error('Error in PUT /api/menus/:id', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/menus/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await services.deleteMenu(id, services.currentUserId);
    res.json({ success: true, data: { id: id } });
  } catch (error) {
    console.error('Error in DELETE /api/menus/:id', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Recipe routes
app.get('/api/recipes', async (req, res) => {
  try {
    const recipes = await services.getAllRecipes(services.currentUserId);
    res.json({ success: true, data: recipes });
  } catch (error) {
    console.error('Error in /api/recipes:', error);
    res.status(500).json({ success: false, error: error.message });
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
    console.error('Error in /api/recipes/:id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/recipes/:id/full', async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await services.getRecipeFullDetails(id, services.currentUserId);

    if (!recipe) {
      return res.status(404).json({ success: false, error: 'Recipe not found' });
    }

    res.json({ success: true, data: recipe });
  } catch (error) {
    console.error('Error in /api/recipes/:id/full:', error);
    res.status(500).json({ success: false, error: error.message });
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

    const recipeId = await services.createRecipe(name, ingredients, services.currentUserId);
    res.json({ success: true, data: { id: recipeId, name } });
  } catch (error) {
    console.error('Error in POST /api/recipes:', error);
    res.status(500).json({ success: false, error: error.message });
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

    await services.updateRecipe(id, name, ingredients, services.currentUserId);
    res.json({ success: true, data: { id, name } });
  } catch (error) {
    console.error('Error in PUT /api/recipes/:id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await services.deleteRecipe(id, services.currentUserId);
    res.json({ success: true, message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/recipes/:id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ingredient routes
app.get('/api/ingredients', async (req, res) => {
  try {
    const searchTerm = req.query.search;
    let ingredients;

    if (searchTerm) {
      ingredients = await services.searchIngredients(searchTerm);
    } else {
      ingredients = await services.getAllIngredients();
    }

    res.json({ success: true, data: ingredients });
  } catch (error) {
    console.error('Error in /api/ingredients:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/ingredients/:id', async (req, res) => {
  try {
    const brandId = parseInt(req.params.id);
    const ingredient = await services.getIngredientDetails(brandId);

    if (!ingredient) {
      return res.status(404).json({ success: false, error: 'Ingredient not found' });
    }

    res.json({ success: true, data: ingredient });
  } catch (error) {
    console.error('Error in /api/ingredients/:id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/ingredients/:id/full', async (req, res) => {
  try {
    const brandId = parseInt(req.params.id);
    const ingredient = await services.getIngredientFullDetails(brandId, services.currentUserId);

    if (!ingredient) {
      return res.status(404).json({ success: false, error: 'Ingredient not found' });
    }

    res.json({ success: true, data: ingredient });
  } catch (error) {
    console.error('Error in /api/ingredients/:id/full:', error);
    res.status(500).json({ success: false, error: error.message });
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

    const brandId = await services.createIngredient(ingredientData, services.currentUserId);
    res.json({ success: true, data: { id: brandId } });
  } catch (error) {
    console.error('Error in POST /api/ingredients:', error);
    res.status(500).json({ success: false, error: error.message });
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

    await services.updateIngredient(brandId, ingredientData, services.currentUserId);
    res.json({ success: true, data: { id: brandId } });
  } catch (error) {
    console.error('Error in PUT /api/ingredients/:id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/ingredients/:id', async (req, res) => {
  try {
    const brandId = parseInt(req.params.id);
    await services.deleteIngredient(brandId, services.currentUserId);
    res.json({ success: true, message: 'Ingredient deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/ingredients/:id:', error);
    res.status(500).json({ success: false, error: error.message });
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
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Frontend dev server: http://localhost:3001`);
  }
});

export default app;
