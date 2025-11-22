export const nutrients = [
    {
        name: "potassium",
        data: [
            {amount: 400, unit: "mg", min_age: 0, min_age_unit: "months", max_age: 6, max_age_unit: "months", gender: "Male"}
        ]
    }
]


    // user_id VARCHAR(36) NOT NULL,
    // nutrient_id VARCHAR(36) NOT NULL,
    // amount FLOAT NOT NULL,
    // unit VARCHAR(8) NOT NULL CHECK (unit in ('g','mg','mcg','ml')),
    // min_age INTEGER NOT NULL DEFAULT 0 CHECK (min_age >= 0 and min_age <= 120),
    // max_age INTEGER NOT NULL DEFAULT 120 CHECK (max_age >= 0 and max_age <= 120),
    // min_age_unit VARCHAR(12) NOT NULL DEFAULT 'years' CHECK (min_age_unit in ('years','months')),
    // max_age_unit VARCHAR(12) NOT NULL DEFAULT 'years' CHECK (max_age_unit in ('years','months')),
    // gender VARCHAR(32) NOT NULL CHECK(gender in ('Male','Female')),
    // physical_state VARCHAR(32) DEFAULT NULL CHECK(physical_state in ('Pregnancy', 'Lactation', NULL)),