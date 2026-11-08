drop function if exists public.confirmar_transferencia(uuid);

drop policy if exists transferencias_escritura on public.transferencias_hijos;
create policy transferencias_escritura on public.transferencias_hijos
  for all to authenticated
  using (hogar_id = casa_aux.mi_hogar_adulto() and pagador_id = (select auth.uid()))
  with check (
    hogar_id = casa_aux.mi_hogar_adulto()
    and pagador_id = (select auth.uid())
    and casa_aux.hijo_es_de_mi_hogar(hijo_id)
  );

drop policy if exists ingresos_solo_dueno on public.ingresos;
create policy ingresos_solo_dueno on public.ingresos
  for all to authenticated
  using (persona_id = (select auth.uid()))
  with check (persona_id = (select auth.uid()));

alter table public.ingresos drop column if exists transferencia_id;
alter table public.transferencias_hijos drop column if exists confirmada_el;
