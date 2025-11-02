-- record counts
select (select count(*) from users) users,
    (select count(*) from brands) brands,
    (select count(*) from recipes) recipes,
    (select count(*) from menus) menus,
    (select count(*) from daily_requirements) daily_requirements;

select * from users;
select * from recipes;
select * from recipe_items;
select r.name, i.* from recipes r 
    inner join recipe_items i
    on r.id = i.recipe_id
    order by r.id, i.item_order;
select * from daily_requirements;
select * from menus;
select m.name from menus m
    INNER JOIN menu_items mi
    on m.id = mi.menu_id
    inner join recipes r
    on r.id == mi.recipe_id;

-- BRANDS
select * from brands;
select name from brand_data;
INSERT INTO brands (user_id, name, serving, serving_unit, density, oxalate_per_gram, oxalate_per_gram_unit)
VALUES ('a70ff520-1125-4098-90b3-144e22ebe84a','Bob''s Red Mill Organic Unbleached All Purpose Flour', 34, 'g', null, 0, 13, 'mg/g');
INSERT INTO brand_data ()