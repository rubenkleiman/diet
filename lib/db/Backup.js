// FIXED 2025-10-30 5pm
// Database backup utilities - KEEP THIS FILE
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = path.join(__dirname, 'diet.db')  // lib/db/diet.db
const BACKUPS_DIR = path.join(__dirname, 'backups')  // lib/db/backups

/**
 * Create a backup of the database
 * @param {string} customName - Optional custom backup name
 * @returns {string} Path to backup file
 */
export function createBackup(customName = null) {
    try {
        // Ensure backups directory exists
        if (!fs.existsSync(BACKUPS_DIR)) {
            fs.mkdirSync(BACKUPS_DIR, { recursive: true })
        }

        // Check if database exists
        if (!fs.existsSync(DB_PATH)) {
            throw new Error('Database file not found')
        }

        // Generate backup filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
        const backupName = customName || `diet_${timestamp}.db`
        const backupPath = path.join(BACKUPS_DIR, backupName)

        // Copy database file
        fs.copyFileSync(DB_PATH, backupPath)

        const stats = fs.statSync(backupPath)
        console.log(`✓ Backup created: ${backupName}`)
        console.log(`  Size: ${(stats.size / 1024).toFixed(2)} KB`)
        console.log(`  Path: ${backupPath}`)

        // Cleanup old backups
        cleanupOldBackups()

        return backupPath

    } catch (error) {
        console.error('❌ Backup failed:', error.message)
        throw error
    }
}

/**
 * Restore database from a backup
 * @param {string} backupName - Name of backup file to restore
 */
export function restoreBackup(backupName) {
    try {
        const backupPath = path.join(BACKUPS_DIR, backupName)

        // Check if backup exists
        if (!fs.existsSync(backupPath)) {
            throw new Error(`Backup file not found: ${backupName}`)
        }

        // Create a backup of current database before restoring
        if (fs.existsSync(DB_PATH)) {
            const preRestoreBackup = `diet_pre-restore_${Date.now()}.db`
            fs.copyFileSync(DB_PATH, path.join(BACKUPS_DIR, preRestoreBackup))
            console.log(`✓ Created pre-restore backup: ${preRestoreBackup}`)
        }

        // Restore backup
        fs.copyFileSync(backupPath, DB_PATH)
        console.log(`✓ Database restored from: ${backupName}`)

    } catch (error) {
        console.error('❌ Restore failed:', error.message)
        throw error
    }
}

/**
 * List all available backups
 * @returns {Array} Array of backup info objects
 */
export function listBackups() {
    try {
        if (!fs.existsSync(BACKUPS_DIR)) {
            return []
        }

        const files = fs.readdirSync(BACKUPS_DIR)
            .filter(file => file.endsWith('.db'))
            .map(file => {
                const filePath = path.join(BACKUPS_DIR, file)
                const stats = fs.statSync(filePath)
                return {
                    name: file,
                    path: filePath,
                    size: stats.size,
                    sizeKB: (stats.size / 1024).toFixed(2),
                    created: stats.mtime
                }
            })
            .sort((a, b) => b.created - a.created) // Newest first

        return files

    } catch (error) {
        console.error('Error listing backups:', error)
        return []
    }
}

/**
 * Clean up old backups based on retention policy
 * Keep: 7 daily, 4 weekly, 12 monthly
 */
function cleanupOldBackups() {
    try {
        const backups = listBackups()
        if (backups.length <= 7) return // Keep all if less than 7

        const now = Date.now()
        const oneDay = 24 * 60 * 60 * 1000
        const oneWeek = 7 * oneDay
        const oneMonth = 30 * oneDay

        const toKeep = new Set()
        let dailyCount = 0
        let weeklyCount = 0
        let monthlyCount = 0

        for (const backup of backups) {
            const age = now - backup.created.getTime()

            // Keep last 7 daily backups
            if (age < 7 * oneDay && dailyCount < 7) {
                toKeep.add(backup.name)
                dailyCount++
            }
            // Keep 4 weekly backups (older than 7 days, younger than 4 weeks)
            else if (age >= 7 * oneDay && age < 4 * oneWeek && weeklyCount < 4) {
                if (backup.created.getDay() === 0) { // Sunday backups
                    toKeep.add(backup.name)
                    weeklyCount++
                }
            }
            // Keep 12 monthly backups (older than 4 weeks)
            else if (age >= 4 * oneWeek && monthlyCount < 12) {
                if (backup.created.getDate() === 1) { // First of month backups
                    toKeep.add(backup.name)
                    monthlyCount++
                }
            }
        }

        // Delete backups not in keep set
        let deletedCount = 0
        for (const backup of backups) {
            if (!toKeep.has(backup.name)) {
                fs.unlinkSync(backup.path)
                deletedCount++
            }
        }

        if (deletedCount > 0) {
            console.log(`  Cleaned up ${deletedCount} old backup(s)`)
        }

    } catch (error) {
        console.error('Warning: Cleanup failed:', error.message)
    }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
    const args = process.argv.slice(2)

    if (args.includes('--list')) {
        console.log('\nAvailable backups:')
        const backups = listBackups()
        if (backups.length === 0) {
            console.log('  No backups found')
        } else {
            backups.forEach(backup => {
                console.log(`  ${backup.name} - ${backup.sizeKB} KB - ${backup.created.toLocaleString()}`)
            })
        }
    } else if (args.includes('--restore')) {
        const backupIndex = args.indexOf('--restore')
        const backupName = args[backupIndex + 1]
        if (!backupName) {
            console.error('Error: Please specify backup name')
            console.log('Usage: node Backup.js --restore <backup-name>')
            console.log('Run with --list to see available backups')
            process.exit(1)
        }
        restoreBackup(backupName)
    } else {
        // Default: create backup
        createBackup()
    }
}