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

select * from recipes;
select * from recipe_items where  recipe_id = 6;
select r.*, i.* from recipes r
  inner join recipe_items i on r.id = i.recipe_id
  and r.id = 6;

select * from daily_requirements where name like '%folic%' order by name;
insert into daily_requirements(name, recommended, dash_recommendation,minimum,
    maximum, note,source) values('folic_acid','400 mcg',null,null,null,null,'NIH');
update daily_requirements set maximum = '50 mg' where id = 27;

-- MENUS
select * from menus;
select * from menu_recipes;
delete from menus where user_id = 'a70ff520-1125-4098-90b3-144e22ebe84a' and id = 3;
insert into menus(user_id, name) values('a70ff520-1125-4098-90b3-144e22ebe84a', 'Test Menu3');
insert into menu_recipes(menu_id, recipe_id) values(2, 5);
insert into menu_recipes(menu_id, recipe_id) values(2, 6);
select menu_id, recipe_id from menu_recipes;
select * from recipes;
select * from menus;
select menus.name, menus.id, menu_recipes.recipe_id
        from menus
        INNER JOIN menu_recipes 
        on menu_recipes.menu_id = menus.id
        where menus.user_id = 'a70ff520-1125-4098-90b3-144e22ebe84a'
        order by item_order;

-- BRANDS
select * from brands where id = 32;
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