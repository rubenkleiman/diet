--pragma foreign_keys=on;
--insert into users(id, username, password,display_name) values('a70ff520-1125-4098-90b3-144e22ebe84a','rk','rk','Ruben');
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


select * from users;
insert into users(id, username, password,display_name) values('a70ff520-1125-4098-90b3-144e22ebe84a','rk','rk','Ruben');

select * from nutrients;
select * from recipes where id = '1';
select * from recipe_items where  recipe_id = 14;
select r.*, i.* from recipes r
  inner join recipe_items i on r.id = i.recipe_id
  and r.id = 6;

select * from daily_requirements where name like '%sugar%' order by name;
insert into daily_requirements(name, recommended, dash_recommendation,minimum,
    maximum, note,source) values('folic_acid','400 mcg',null,null,null,null,'NIH');
update daily_requirements set maximum = '25 mg', recommended = '25 mg' where name = "sugars";

-- PLANS
select * from daily_plans;
select * from daily_plan_menus;

-- plan details phase 1: given plan id, get menus
select plan.id as id, plan.user_id as userId, plan.name as dailyPlanName,
    dpmenus.menu_id as menuId, dpmenus.type
    FROM daily_plans plan
    inner join daily_plan_menus dpmenus
    on dpMenus.daily_plan_id = plan.id
    and plan.user_id = 'a70ff520-1125-4098-90b3-144e22ebe84a'
    and plan.id = 1
    order by dpmenus.item_order;

-- plan details phase 2: given menu ids, aggregate nutrients per menu
 select menus.id as menuId, menus.menu_type as type, menus.name
                ,mr.recipe_id, recipe_items.amount as recipeAmount, recipe_items.unit as recipeUnit
                ,brands.serving as ingredientAmount, brands.serving_unit as ingredientUnit, 
                brands.density, brands.oxalate_per_gram
                ,data.*
                from menus 
                inner join menu_recipes mr
                on mr.menu_id = menus.id
                inner join recipe_items 
                on recipe_items.recipe_id = mr.recipe_id
                inner join brands
                on recipe_items.brand_id = brands.id
                inner join brand_data data
                on data.brand_id = brands.id
                and menus.id in (7, 9);

select * from daily_plans;
select * from daily_plan_menus;
select * from menus where id in (6);
select * from menu_recipes where menu_id in (9);
select * from recipes;
SELECT * FROM recipes WHERE id = 13 AND user_id = 'a70ff520-1125-4098-90b3-144e22ebe84a';
select * from recipe_items;
select * from brand_data;
select * from brands;

insert into daily_plans(user_id,name) values('a70ff520-1125-4098-90b3-144e22ebe84a', 'Today''s Plan');
insert into daily_plan_menus(daily_plan_id,menu_id,type) values(1, 7, "Breakfast");
insert into daily_plan_menus(daily_plan_id,menu_id,type) values(1, 9, "Dinner");

-- MENUS
select * from menus;
select * from menu_recipes;
delete from menus where user_id = 'a70ff520-1125-4098-90b3-144e22ebe84a' and id = 3;
insert into menus(user_id, name) values('a70ff520-1125-4098-90b3-144e22ebe84a', 'Test Menu3');
insert into menu_recipes(menu_id, recipe_id) values(2, 5);
insert into menu_recipes(menu_id, recipe_id) values(2, 6);
select menu_id, recipe_id from menu_recipes;
select * from menus;
select menus.name, menus.id, menu_recipes.recipe_id
        from menus
        INNER JOIN menu_recipes 
        on menu_recipes.menu_id = menus.id
        where menus.user_id = 'a70ff520-1125-4098-90b3-144e22ebe84a'
        order by item_order;
update menus set menu_type = 'Breakfast' where id = 6;

-- BRANDS
select * from brands where id = 32;
select * from brand_data;
update brands set oxalate_per_gram = 0.028,
    oxalate_per_gram_unit = "mg/g"
    where id = 1;
select * from brands
    inner join brand_data d 
    on brands.id = d.brand_id
    where brand_id = 32;
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


select plans.id, plans.user_id, plans.name, menus.menu_id, menus.type 
        from daily_plans as plans
        inner join daily_plan_menus as menus
        on plans.id = menus.daily_plan_id
        and user_id = 'a70ff520-1125-4098-90b3-144e22ebe84a'
        and plans.id = 4;