import database from '../../lib/db/Database.js'
import { nutrients } from '../data/nutrients.js'


async function populateDatabase(userId) {
    try {
        await database.connect()
        await database.beginTransaction()
        for (const nutrient of nutrients) {
            console.log(nutrient.name)
            const result = await database.get('select id from nutrients where key = ?', [nutrient.name]);
            if (!result) {
                console.error(`Nutrient ${nutrient.name} not found`)
            } else {
                const nutrientId = result.id;
                console.log(`id ${nutrientId}`)
                for (const entry of nutrient.data) {
                    console.log(JSON.stringify(entry))
                }
            }
        }

    } finally {
        await database.close()
    }

}

const userId = 'a70ff520-1125-4098-90b3-144e22ebe84a'
populateDatabase(userId)