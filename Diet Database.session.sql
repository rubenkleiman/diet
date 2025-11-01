-- record counts
select (select count(*) from users) users,
    (select count(*) from brands) brands,
    (select count(*) from recipes) recipes,
    (select count(*) from menus) menus,
    (select count(*) from daily_requirements) daily_requirements;

select * from users;
select * from brands;
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