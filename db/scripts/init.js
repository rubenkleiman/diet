// Called by package.json db:init script
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import database from '../../lib/db/Database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function initDatabase(reset = false) {
    try {
        const dbPath = path.join(__dirname, 'diet.db')  // lib/db/diet.db
        const schemaPath = path.join(__dirname, 'schema.sql')  // lib/db/schema.sql

        // Check if we should reset
        if (reset && fs.existsSync(dbPath)) {
            console.log('Resetting database...')
            fs.unlinkSync(dbPath)
            console.log('Deleted existing database')
        }

        // Check if database already exists
        const dbExists = fs.existsSync(dbPath)
        if (dbExists && !reset) {
            console.log('Database already exists. Use --reset to recreate.')
            return
        }

        console.log('Initializing database...')

        // Ensure backups directory exists
        const backupsDir = path.join(__dirname, 'backups')  // lib/db/backups
        if (!fs.existsSync(backupsDir)) {
            fs.mkdirSync(backupsDir, { recursive: true })
        }

        // Read schema
        const schema = fs.readFileSync(schemaPath, 'utf8')

        // Connect to database
        const db = await database.connect()

        // Execute entire schema at once (better for SQLite)
        await db.exec(schema)

        console.log('✓ Database initialized successfully')
        console.log(`✓ Location: ${dbPath}`)
        console.log(`✓ Backups directory: ${backupsDir}`)

        // Create triggers for updated_at (SQLite doesn't support ON UPDATE)
        await createUpdateTriggers(db)
        console.log('✓ Update triggers created')

        await database.close()

    } catch (error) {
        console.error('Error initializing database:', error)
        process.exit(1)
    }
}

/**
 * Create triggers for updated_at columns (SQLite workaround)
 */
async function createUpdateTriggers(db) {
    const tables = ['users', 'brands', 'brand_data', 'recipes', 'recipe_items', 'daily_requirements', 'menus', 'menu_items']
    
    for (const table of tables) {
        const triggerSQL = `
            CREATE TRIGGER IF NOT EXISTS update_${table}_timestamp 
            AFTER UPDATE ON ${table}
            BEGIN
                UPDATE ${table} SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END;
        `
        await db.exec(triggerSQL)
    }
}

// Parse command line arguments
const args = process.argv.slice(2)
const reset = args.includes('--reset')

// Run initialization
initDatabase(reset)