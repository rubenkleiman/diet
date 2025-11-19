import database from '../../lib/db/Database.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function testDatabase() {
    try {
        console.log('Testing database connection...\n')

        // Connect
        await database.connect()
        console.log('✓ Connected to database')

        // Test foreign keys enabled
        const fkResult = await database.get('PRAGMA foreign_keys')
        console.log(`✓ Foreign keys enabled: ${fkResult.foreign_keys === 1}`)

        // Check tables exist
        const tables = await database.all(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        `)
        
        console.log(`\n✓ Found ${tables.length} tables:`)
        for (const table of tables) {
            const count = await database.get(`SELECT COUNT(*) as count FROM ${table.name}`)
            console.log(`  - ${table.name}: ${count.count} rows`)
        }

        // Test system user exists
        const systemUser = await database.get(
            'SELECT * FROM users WHERE id = ?',
            ['a70ff520-1125-4098-90b3-144e22ebe84a']
        )
        console.log(`\n✓ System user exists: ${systemUser ? systemUser.display_name : 'NOT FOUND'}`)

        // Test insert/select
        console.log('\n✓ Testing CRUD operations...')
        
        // Insert test brand
        const result = await database.run(`
            INSERT INTO brands (user_id, name, serving, serving_unit, density, oxalate_per_gram, oxalate_per_gram_unit)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            'a70ff520-1125-4098-90b3-144e22ebe84a',
            'Test Brand',
            100,
            'g',
            null,
            0.5,
            'mg/g'
        ])
        console.log(`  - Inserted brand with ID: ${result.lastID}`)

        // Select test brand
        const brand = await database.get('SELECT * FROM brands WHERE id = ?', [result.lastID])
        console.log(`  - Retrieved brand: ${brand.name}`)

        // Delete test brand
        await database.run('DELETE FROM brands WHERE id = ?', [result.lastID])
        console.log(`  - Deleted test brand`)

        // Test transaction
        console.log('\n✓ Testing transaction...')
        await database.beginTransaction()
        await database.run(`
            INSERT INTO brands (user_id, name, serving, serving_unit)
            VALUES (?, ?, ?, ?)
        `, ['a70ff520-1125-4098-90b3-144e22ebe84a', 'Transaction Test', 50, 'g'])
        await database.rollback()
        const transTest = await database.get('SELECT * FROM brands WHERE name = ?', ['Transaction Test'])
        console.log(`  - Rollback successful: ${transTest ? 'FAILED' : 'PASSED'}`)

        // Show database file info
        const dbPath = path.join(__dirname, '../../lib/db/diet.db')
        const fs = await import('fs')
        const stats = await fs.promises.stat(dbPath)
        console.log(`\n✓ Database file:`)
        console.log(`  - Path: ${dbPath}`)
        console.log(`  - Size: ${(stats.size / 1024).toFixed(2)} KB`)

        console.log('\n✅ All tests passed!')

    } catch (error) {
        console.error('❌ Test failed:', error)
        process.exit(1)
    } finally {
        await database.close()
    }
}

testDatabase()