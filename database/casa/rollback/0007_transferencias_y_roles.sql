alter table public.gastos drop column if exists transferencia_id;
drop table if exists public.transferencias_hijos cascade;

drop policy if exists hijos_adultos on public.hijos;
drop policy if exists hijos_propio on public.hijos;
create policy hijos_del_hogar on public.hijos
  for all to authenticated
  using (hogar_id = casa_aux.mi_hogar())
  with check (hogar_id = casa_aux.mi_hogar());

drop policy if exists obligaciones_del_hogar on public.obligaciones;
create policy obligaciones_del_hogar on public.obligaciones
  for all to authenticated
  using (hogar_id = casa_aux.mi_hogar())
  with check (hogar_id = casa_aux.mi_hogar() and casa_aux.persona_es_de_mi_hogar(responsable_id));

drop policy if exists liquidaciones_del_hogar on public.liquidaciones;
create policy liquidaciones_del_hogar on public.liquidaciones
  for all to authenticated
  using (hogar_id = casa_aux.mi_hogar())
  with check (hogar_id = casa_aux.mi_hogar() and casa_aux.persona_es_de_mi_hogar(pagador_id) and casa_aux.persona_es_de_mi_hogar(receptor_id));

create or replace function casa_aux.obligacion_es_de_mi_hogar(o uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.obligaciones where id = o and hogar_id = casa_aux.mi_hogar())
$$;

drop function if exists casa_aux.hijo_es_de_mi_hogar(uuid);
drop function if exists casa_aux.soy_el_hijo(uuid);
drop function if exists casa_aux.mi_hogar_adulto();
