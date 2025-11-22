import DailyPlanRepository from "../repositories/DailyPlanRepository.js";

class DailyPlanService {

    constructor() {
        this.dailyPlanRepository = DailyPlanRepository;
    }

    async getAllDailyPlans(options) {
        return await this.dailyPlanRepository.get(options);
    }
}

export const dailyPlanService = new DailyPlanService();