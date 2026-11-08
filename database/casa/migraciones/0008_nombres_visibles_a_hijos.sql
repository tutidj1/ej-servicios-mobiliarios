-- EJ Casa · 0008 · los hijos pueden ver los NOMBRES de las personas de su hogar
-- Para que "te transfirió Javier" no diga "un adulto". Solo nombre y rol (tabla personas): ningún dato financiero.
-- Lo compartido sigue siendo solo de los adultos (mi_hogar_adulto); esta función solo gobierna personas y hogar.
create or replace function casa_aux.mi_hogar() returns uuid
language sql stable security definer set search_path = '' as $$
  select hogar_id from public.personas where id = (select auth.uid())
$$;
