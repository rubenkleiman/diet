import database from "../db/Database.js";
import UserRepository from "../repositories/UserRepository.js";

class UserServices {

    constructor() {
        this.userRepository = UserRepository;
    }

    async getSettings(userId) {
        return await this.userRepository.getSettings(userId);
    }

    async createSettings(userId, settings) {
        this._validateSettings(userId, settings);
        return await this.userRepository.createSettings(userId, settings);
    }

    async updateSettings(userId, settings) {
        this._validateSettings(userId, settings);
        const existingSettings = await this.userRepository.getSettingsFromDb(userId);
        if (!existingSettings) {
            return await this.userRepository.createSettings(userId, settings);
        }
        return await this.userRepository.updateSettings(userId, settings);
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