-- EJ Casa · 0009 · ingreso pendiente de confirmar
-- Cuando un adulto transfiere a un hijo que tiene cuenta, a él le llega como "pendiente de confirmar".
-- Al confirmar se crea SU ingreso (privado) vinculado a esa transferencia, y las dos puntas quedan conciliadas:
-- el mismo movimiento no se carga dos veces. Una transferencia confirmada ya no se edita ni se borra.
--
-- La confirmación es una función (no un permiso de UPDATE): así el hijo solo puede confirmar las que le hicieron a él
-- y no puede tocar el monto ni nada más.

alter table public.transferencias_hijos add column confirmada_el timestamptz;

alter table public.ingresos add column transferencia_id uuid unique references public.transferencias_hijos (id) on delete set null;

-- Los usuarios no pueden fijar ingresos.transferencia_id: lo hace solo la función de confirmación
drop policy ingresos_solo_dueno on public.ingresos;
create policy ingresos_solo_dueno on public.ingresos
  for all to authenticated
  using (persona_id = (select auth.uid()))
  with check (persona_id = (select auth.uid()) and transferencia_id is null);

-- Un adulto solo edita/borra sus transferencias mientras estén pendientes
drop policy transferencias_escritura on public.transferencias_hijos;
create policy transferencias_escritura on public.transferencias_hijos
  for all to authenticated
  using (hogar_id = casa_aux.mi_hogar_adulto() and pagador_id = (select auth.uid()) and confirmada_el is null)
  with check (
    hogar_id = casa_aux.mi_hogar_adulto()
    and pagador_id = (select auth.uid())
    and confirmada_el is null
    and casa_aux.hijo_es_de_mi_hogar(hijo_id)
  );

create or replace function public.confirmar_transferencia(p_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  t record;
  v_ingreso uuid;
begin
  select tr.id, tr.monto, tr.fecha, tr.confirmada_el into t
    from public.transferencias_hijos tr
    join public.hijos h on h.id = tr.hijo_id
   where tr.id = p_id and h.persona_id = (select auth.uid())
   for update of tr;
  if not found then
    raise exception 'transferencia_no_encontrada' using errcode = 'P0002';
  end if;
  if t.confirmada_el is not null then
    raise exception 'ya_confirmada' using errcode = 'P0001';
  end if;
  insert into public.ingresos (persona_id, monto, fecha, esperado_o_real, transferencia_id)
  values ((select auth.uid()), t.monto, t.fecha, 'real', t.id)
  returning id into v_ingreso;
  update public.transferencias_hijos set confirmada_el = now() where id = t.id;
  return v_ingreso;
end $$;

revoke all on function public.confirmar_transferencia(uuid) from public, anon;
grant execute on function public.confirmar_transferencia(uuid) to authenticated;
