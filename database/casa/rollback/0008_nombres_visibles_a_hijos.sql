create or replace function casa_aux.mi_hogar() returns uuid
language sql stable security definer set search_path = '' as $$
  select hogar_id from public.personas where id = (select auth.uid()) and rol <> 'hijo'
$$;
