drop table if exists public.liquidaciones cascade;
drop policy if exists obligacion_instancias_del_hogar on public.obligacion_instancias;
create policy obligacion_instancias_del_hogar on public.obligacion_instancias
  for all to authenticated
  using (casa_aux.obligacion_es_de_mi_hogar(obligacion_id))
  with check (casa_aux.obligacion_es_de_mi_hogar(obligacion_id) and casa_aux.persona_es_de_mi_hogar(pagado_por));
alter table public.obligacion_instancias drop column if exists responsable_id;
