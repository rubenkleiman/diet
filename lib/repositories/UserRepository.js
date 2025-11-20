import database from "../db/Database.js";

class UserRepository {
    constructor() {
        this.defaultSettings = {
            caloriesPerDay: 2000,
            age: null,
            useAge: false,
            kidneyStoneRisk: 'Normal'
        }
    }

    async getSettingsFromDb(userId) {
        const settings = await database.get(
            `SELECT calories_per_day as caloriesPerDay, age, use_age as useAge, kidney_stone_risk as kidneyStoneRisk
               FROM user_settings 
               WHERE user_id = ?`,
            [userId]
        );
        return settings;

    }

     async getSettings(userId) {
        const settings = this.getSettingsFromDb(userId);
        return (settings || this.defaultSettings);
    }

    async createSettings(userId, settings) {
        await database.run(
            `INSERT INTO user_settings (user_id, calories_per_day, age, use_age, kidney_stone_risk)
       VALUES (?, ?, ?, ?, ?)`,
            [userId, settings.caloriesPerDay, settings.age, settings.useAge ? 1 : 0, settings.kidneyStoneRisk]
        );
    }

    async updateSettings(userId, settings) {
        await database.run(
            `UPDATE user_settings 
       SET calories_per_day = ?, age = ?, use_age = ?, kidney_stone_risk = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
            [settings.caloriesPerDay, settings.age, settings.useAge ? 1 : 0, settings.kidneyStoneRisk, userId]
        );
    }

}

export default new UserRepository();