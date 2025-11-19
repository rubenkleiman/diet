import database from "../db/Database.js";

class UserServices {
    constructor() {
        this.defaultSettings = {
            caloriesPerDay: 2000,
            age: null,
            useAge: false,
            kidneyStoneRisk: 'Normal'
        }
    }

    async getSettings(userId) {
        const settings = await database.get(
            `SELECT calories_per_day as caloriesPerDay, age, use_age as useAge, kidney_stone_risk as kidneyStoneRisk
               FROM user_settings 
               WHERE user_id = ?`,
            [userId]
        );
        return (settings || this.defaultSettings);
    }

    async createSettings(userId, settings) {
        this._validateSettings(userId, settings)
        await database.run(
            `INSERT INTO user_settings (user_id, calories_per_day, age, use_age, kidney_stone_risk)
       VALUES (?, ?, ?, ?, ?)`,
            [userId, settings.caloriesPerDay, settings.age, settings.useAge ? 1 : 0, settings.kidneyStoneRisk]
        );
    }

    async updateSettings(userId, settings) {
        this._validateSettings(userId, settings)
        await database.run(
            `UPDATE user_settings 
       SET calories_per_day = ?, age = ?, use_age = ?, kidney_stone_risk = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
            [settings.caloriesPerDay, settings.age, settings.useAge ? 1 : 0, settings.kidneyStoneRisk, userId]
        );
    }

    _validateSettings(userId, settings) {
        if (!userId) {
            throw Error(`Missing userId`)
        }

        if (!settings.caloriesPerDay || settings.caloriesPerDay < 300 || settings.caloriesPerDay > 5000) {
            throw Error(`caloriesPerDay must be between 300 and 5000. Value: ${settings.caloriesPerDay}`)
        }

        if (settings.useAge && (!settings.age || settings.age < 6 || settings.age > 100)) {
            throw Error(`age must be between 6 and 100 when useAge is true. Value: ${settings.age}`)
        }

        if (!['Normal', 'High', 'Extremely High'].includes(settings.kidneyStoneRisk)) {
            throw Error(`kidneyStoneRisk must be Normal, High, or Extremely High. Value: ${settings.kidneyStoneRisk}`)
        }
    }
}

export const UserService = new UserServices(); 