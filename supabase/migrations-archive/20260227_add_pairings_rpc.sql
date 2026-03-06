create or replace function get_component_pairings(target_component_id uuid, result_limit integer default 5)
returns table(
  component_id uuid,
  name text,
  brand text,
  category text,
  price_new numeric,
  price_used_min numeric,
  price_used_max numeric,
  pair_count bigint
)
language sql stable
as $$
  select
    sc2.component_id,
    c.name,
    c.brand,
    c.category,
    c.price_new,
    c.price_used_min,
    c.price_used_max,
    count(*) as pair_count
  from stack_components sc1
  join stack_components sc2 on sc1.stack_id = sc2.stack_id
    and sc1.component_id is distinct from sc2.component_id
  join components c on c.id = sc2.component_id
  where sc1.component_id = target_component_id
    and sc2.component_id is not null
  group by sc2.component_id, c.name, c.brand, c.category, c.price_new, c.price_used_min, c.price_used_max
  order by pair_count desc
  limit result_limit;
$$;
