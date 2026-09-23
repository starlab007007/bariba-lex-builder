-- Handunia Wasa — permettre une publication même lorsque le lieu exact
-- n'est pas connu ou lorsque la carte/réseau est indisponible.
--
-- Ce lieu technique n'est pas affiché comme un lieu d'exploration normal.
-- L'application l'utilise uniquement comme ancrage de secours afin que la
-- géolocalisation et la carte ne deviennent jamais bloquantes.

insert into public.handunia_lieux (
  id,
  name,
  icon,
  description,
  sort_order,
  created_by
)
values (
  'lieu-non-precise',
  'Lieu à préciser',
  '🧭',
  'Souvenir publié sans localisation précise ; le lieu pourra être précisé plus tard.',
  9999,
  null
)
on conflict (id) do update
set
  name = excluded.name,
  icon = excluded.icon,
  description = excluded.description,
  sort_order = excluded.sort_order;
