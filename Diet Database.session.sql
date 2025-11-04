-- pragma foreign_keys=on;
-- ALTER TABLE daily_requirements ADD COLUMN user_id varchar(36) REFERENCES users(id);
-- update daily_requirements set user_id = 'a70ff520-1125-4098-90b3-144e22ebe84a';
-- select * from daily_requirements;
PRAGMA table_info(brand_data);
-- record counts
select (
        select count(*)
        from users
    ) users,
    (
        select count(*)
        from brands
    ) brands,
    (
        select count(*)
        from recipes
    ) recipes,
    (
        select count(*)
        from menus
    ) menus,
    (
        select count(*)
        from daily_requirements
    ) daily_requirements;


select *
from users;
select *
from recipes;
select *
from recipe_items;
select r.name,
    i.*
from recipes r
    inner join recipe_items i on r.id = i.recipe_id
order by r.id,
    i.item_order;
select * from daily_requirements order by name;
update daily_requirements set maximum = '50 mg' where id = 27;
select *
from menus;
select m.name
from menus m
    INNER JOIN menu_items mi on m.id = mi.menu_id
    inner join recipes r on r.id == mi.recipe_id;
-- BRANDS
select *
from brands
where id = 32;
update brands
set oxalate_per_gram = 0.028,
    oxalate_per_gram_unit = "mg/g"
where id = 1;
select *
from brand_data
where brand_id = 32;
SELECT id,
    brand_id,
    calories
FROM brand_data
WHERE brand_id = 22;
insert into brand_data(
        brand_id,
        user_id,
        carbohydrates,
        fat,
        sodium,
        dietary_fiber,
        protein
    )
values(
        21,
        'a70ff520-1125-4098-90b3-144e22ebe84a',
        "29 g",
        "1 g",
        "320 mg",
        "1 g",
        "5 g"
    );
update brand_data
set carbohydrates = "29 g",
    fat = "1 g",
    sodium = "320 mg",
    dietary_fiber = "1 g",
    protein = "5 g"
where brand_id = 21;
INSERT INTO brands (
        user_id,
        name,
        serving,
        serving_unit,
        density,
        oxalate_per_gram,
        oxalate_per_gram_unit
    )
VALUES (
        'a70ff520-1125-4098-90b3-144e22ebe84a',
        'Semifreddi Sourdough Baghette',
        57,
        'g',
        null,
        NULL,
        NULL
    );
INSERT INTO brand_data ()