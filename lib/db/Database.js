// FIXED 2025-10-30 5pm
// Database connection manager - KEEP THIS FILE
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class Database {
    constructor() {
        this.db = null
    }

    /**
     * Open database connection
     * @returns {Promise<sqlite.Database>}
     */
    async connect() {
        if (this.db) {
            return this.db
        }

        const dbPath = path.join(__dirname, 'diet.db')  // lib/db/diet.db
        
        this.db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        })

        // Enable foreign keys
        await this.db.run('PRAGMA foreign_keys = ON')
        
        console.log(`Connected to SQLite database at ${dbPath}`)
        return this.db
    }

    /**
     * Close database connection
     */
    async close() {
        if (this.db) {
            await this.db.close()
            this.db = null
            console.log('Database connection closed')
        }
    }

    /**
     * Get database instance (connect if needed)
     */
    async getDb() {
        if (!this.db) {
            await this.connect()
        }
        return this.db
    }

    /**
     * Execute a query
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     */
    async run(sql, params = []) {
        const db = await this.getDb()
        return db.run(sql, params)
    }

    /**
     * Get single row
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     */
    async get(sql, params = []) {
        const db = await this.getDb()
        return db.get(sql, params)
    }

    /**
     * Get all rows
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     */
    async all(sql, params = []) {
        const db = await this.getDb()
        return db.all(sql, params)
    }

    /**
     * Begin transaction
     */
    async beginTransaction() {
        await this.run('BEGIN TRANSACTION')
    }

    /**
     * Commit transaction
     */
    async commit() {
        await this.run('COMMIT')
    }

    /**
     * Rollback transaction
     */
    async rollback() {
        await this.run('ROLLBACK')
    }
}

// Singleton instance
const database = new Database()

export default database