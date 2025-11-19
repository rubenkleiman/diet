PRAGMA foreign_keys = OFF;

-- 1. Create the new table with ON DELETE CASCADE added
CREATE TABLE daily_plan_menus_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    daily_plan_id INTEGER NOT NULL,
    menu_id INTEGER NOT NULL,
    type VARCHAR(16) DEFAULT 'Other' CHECK(
        type IN ('Dinner', 'Lunch', 'Breakfast', 'Brunch', 'Snack', 'Other')
    ),
    item_order INTEGER DEFAULT 1,
    CONSTRAINT daily_plan_id_fk 
        FOREIGN KEY(daily_plan_id) 
        REFERENCES daily_plans(id) 
        ON DELETE CASCADE,
    CONSTRAINT daily_plan_menu_fk 
        FOREIGN KEY(menu_id) 
        REFERENCES menus(id)
);

-- 2. Copy the original data
INSERT INTO daily_plan_menus_new
SELECT * FROM daily_plan_menus;

-- 3. Drop the old table
DROP TABLE daily_plan_menus;

-- 4. Rename the new table
ALTER TABLE daily_plan_menus_new RENAME TO daily_plan_menus;

-- 5. Recreate indexes
CREATE INDEX idx_daily_plan_type ON daily_plan_menus(type);
CREATE INDEX idx_daily_plan_id ON daily_plan_menus(daily_plan_id);
CREATE INDEX idx_daily_plan_menu ON daily_plan_menus(menu_id);

PRAGMA foreign_keys = ON;
