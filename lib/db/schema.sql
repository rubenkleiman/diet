-- FIXED 2025-10-30 4pm
-- SQLite3 and MySQL compatible schema
-- Note: Use AUTOINCREMENT for SQLite, AUTO_INCREMENT for MySQL
-- This schema uses INTEGER PRIMARY KEY which works for both
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    -- UUID v4 assigned by logic (crypto.randomUUID())
    username VARCHAR(32) NOT NULL,
    password VARCHAR(32) NOT NULL,
    display_name VARCHAR(64) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Admin user is the default owner of brands, recipes, etc.
INSERT INTO users(id, username, password, display_name)
VALUES(
        'a70ff520-1125-4098-90b3-144e22ebe84a',
        'rk',
        'rk',
        'Admin'
    );

-- Ingredient Categories table (ingredients)
CREATE TABLE IF NOT EXISTS ingredient_categories(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Use AUTO_INCREMENT for MySQL
    name VARCHAR(255) NOT NULL,
);
-- Add ingredient categories (not editable for now)
INSERT INTO ingredient_categories(name)
VALUES('Dairy');
INSERT INTO ingredient_categories(name)
VALUES('Fats');
INSERT INTO ingredient_categories(name)
VALUES('Fruits');
INSERT INTO ingredient_categories(name)
VALUES('Grains');
INSERT INTO ingredient_categories(name)
VALUES('Liquor');
INSERT INTO ingredient_categories(name)
VALUES('Meats');
INSERT INTO ingredient_categories(name)
VALUES('Starches');
INSERT INTO ingredient_categories(name)
VALUES('Sugars');
INSERT INTO ingredient_categories(name)
VALUES('Vegetables');

-- Brands table (ingredients)
CREATE TABLE IF NOT EXISTS brands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Use AUTO_INCREMENT for MySQL
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    serving FLOAT NOT NULL,
    serving_unit VARCHAR(8) NOT NULL CHECK(
        serving_unit IN ('g', 'mg', 'mcg', 'oz', 'ml', 'tsp', 'tbs', 'cup')
    ),
    density FLOAT,
    oxalate_per_gram FLOAT,
    oxalate_per_gram_unit VARCHAR(8) CHECK(oxalate_per_gram_unit IN ('mg/g')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name),
    CONSTRAINT brands_user_fk FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX idx_brands_user ON brands(user_id);
CREATE INDEX idx_brands_name ON brands(name);

-- Brand nutritional data (per serving)
-- All values stored as VARCHAR(20) in format "amount unit" (e.g., "80 mg", "2 g")
-- Calories stored as FLOAT (no unit)
CREATE TABLE IF NOT EXISTS brand_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Use AUTO_INCREMENT for MySQL
    brand_id INTEGER NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    calories FLOAT,
    sodium VARCHAR(20),
    cholesterol VARCHAR(20),
    sugars VARCHAR(20),
    protein VARCHAR(20),
    dietary_fiber VARCHAR(20),
    carbohydrates VARCHAR(20),
    calcium VARCHAR(20),
    potassium VARCHAR(20),
    magnesium VARCHAR(20),
    selenium VARCHAR(20),
    manganese VARCHAR(20),
    zinc VARCHAR(20),
    iron VARCHAR(20),
    fat VARCHAR(20),
    saturated_fat VARCHAR(20),
    polysaturated_fat VARCHAR(20),
    monosaturated_fat VARCHAR(20),
    thiamin VARCHAR(20),
    riboflavin VARCHAR(20),
    niacin VARCHAR(20),
    folic_acid VARCHAR(20),
    phosphorus VARCHAR(20),
    vitamin_a VARCHAR(20),
    vitamin_b6 VARCHAR(20),
    vitamin_c VARCHAR(20),
    vitamin_d VARCHAR(20),
    vitamin_e VARCHAR(20),
    vitamin_k VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT brand_data_brand_fk FOREIGN KEY(brand_id) REFERENCES brands(id) ON DELETE CASCADE,
    CONSTRAINT brand_data_user_fk FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX idx_brand_data_brand ON brand_data(brand_id);
CREATE INDEX idx_brand_data_user ON brand_data(user_id);
-- Recipes table
CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Use AUTO_INCREMENT for MySQL
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name),
    CONSTRAINT recipes_user_fk FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX idx_recipes_user ON recipes(user_id);
CREATE INDEX idx_recipes_name ON recipes(name);

-- Recipe items (ingredients in a recipe)
CREATE TABLE IF NOT EXISTS recipe_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Use AUTO_INCREMENT for MySQL
    recipe_id INTEGER NOT NULL,
    brand_id INTEGER NOT NULL,
    item_order INTEGER DEFAULT 1,
    amount FLOAT NOT NULL,
    unit VARCHAR(8) NOT NULL CHECK(
        unit IN ('g', 'mg', 'mcg', 'oz', 'ml', 'tsp', 'tbs', 'cup')
    ),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT recipe_items_recipe_fk FOREIGN KEY(recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    CONSTRAINT recipe_items_brand_fk FOREIGN KEY(brand_id) REFERENCES brands(id)
);
CREATE INDEX idx_recipe_items_recipe ON recipe_items(recipe_id);
CREATE INDEX idx_recipe_items_brand ON recipe_items(brand_id);
-- Daily nutritional requirements
CREATE TABLE IF NOT EXISTS daily_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Use AUTO_INCREMENT for MySQL
    name VARCHAR(255) NOT NULL UNIQUE,
    recommended VARCHAR(255),
    dash_recommendation VARCHAR(255),
    minimum VARCHAR(255),
    maximum VARCHAR(255),
    note TEXT,
    source VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_daily_requirements_name ON daily_requirements(name);

-- Menus (collections of recipes for meal planning)
CREATE TABLE IF NOT EXISTS menus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Use AUTO_INCREMENT for MySQL
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    menu_type VARCHAR(16) CHECK(
        menu_type IN ('Dinner', 'Lunch', 'Breakfast', 'Snack', 'Other')
    ),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name),
    CONSTRAINT menus_user_fk FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX idx_menus_user ON menus(user_id);
CREATE INDEX idx_menus_type ON menus(menu_type);

-- Menu recipes
CREATE TABLE IF NOT EXISTS menu_recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Use AUTO_INCREMENT for MySQL
    menu_id INTEGER NOT NULL,
    recipe_id INTEGER NOT NULL,
    item_order INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT menu_recipes_menu_fk FOREIGN KEY(menu_id) REFERENCES menus(id) ON DELETE CASCADE,
    CONSTRAINT menu_recipes_fk FOREIGN KEY(recipe_id) REFERENCES recipes(id)
);
CREATE INDEX idx_menu_recipes_menu ON menu_recipes(menu_id);
CREATE INDEX idx_menu_recipes_recipe ON menu_recipes(recipe_id);

-- Daily plans

CREATE TABLE IF NOT EXISTS daily_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Use AUTO_INCREMENT for MySQL
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name),
    CONSTRAINT daily_plan_user_fk FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX idx_daily_plan_user ON daily_plans(user_id);

CREATE TABLE IF NOT EXISTS daily_plan_menus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Use AUTO_INCREMENT for MySQL
    daily_plan_id INTEGER NOT NULL,
    menu_id INTEGER NOT NULL,
    type VARCHAR(16) DEFAULT 'Other' CHECK(
        type IN ('Dinner', 'Lunch', 'Breakfast', 'Brunch', 'Snack', 'Other')
    ),
    item_order INTEGER DEFAULT 1,
    CONSTRAINT daily_plan_id_fk FOREIGN KEY(daily_plan_id) REFERENCES daily_plans(id),
    CONSTRAINT daily_plan_menu_fk FOREIGN KEY(menu_id) REFERENCES menus(id)
);
CREATE INDEX idx_daily_plan_type ON daily_plan_menus(type);
CREATE INDEX idx_daily_plan_id ON daily_plan_menus(daily_plan_id);
CREATE INDEX idx_daily_plan_menu ON daily_plan_menus(menu_id);

-- Note: kidney_stone_risk data maintained in kidneyStoneRisk.json
-- Could optionally be moved to database:
/*
 CREATE TABLE IF NOT EXISTS kidney_stone_risk (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 risk_level VARCHAR(32) NOT NULL UNIQUE,
 max_oxalates_per_day INTEGER NOT NULL,
 description TEXT,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP
 );
 
 INSERT INTO kidney_stone_risk(risk_level, max_oxalates_per_day, description) VALUES
 ('Normal', 200, 'Standard diet with normal kidney stone risk'),
 ('High', 50, 'Reduced oxalate intake for those with history of kidney stones'),
 ('Extremely High', 10, 'Very strict oxalate restriction for severe kidney stone risk');
 */