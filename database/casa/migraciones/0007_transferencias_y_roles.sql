-- EJ Casa · 0007 · transferencias a los hijos + lo compartido es solo de los adultos
--
-- 1) Lo "Compartido" (obligaciones, instancias, liquidaciones, hijos y transferencias) lo ven y editan solo los
--    ADULTOS del hogar (rol 'adulto'). La administración técnica (Tomás) y los hijos no: cada uno ve únicamente
--    lo que le transfirieron y sus propios gastos. Antes, el admin técnico alcanzaba a leer lo compartido: se corrige.
-- 2) transferencias_hijos: cada transferencia a un hijo es un registro compartido entre los adultos, con quién la hizo.
--    El hijo ve solo las que le hicieron a él.
-- 3) gastos.transferencia_id: la transferencia también es un gasto personal de quien la hizo (sin cargarla dos veces).

create or replace function casa_aux.mi_hogar_adulto() returns uuid
language sql stable security definer set search_path = '' as $$
  select hogar_id from public.personas where id = (select auth.uid()) and rol = 'adulto'
$$;

create or replace function casa_aux.soy_el_hijo(h uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.hijos where id = h and persona_id = (select auth.uid()))
$$;

create or replace function casa_aux.hijo_es_de_mi_hogar(h uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.hijos where id = h and hogar_id = casa_aux.mi_hogar_adulto())
$$;

-- La instancia es de mi hogar solo si soy adulto
create or replace function casa_aux.obligacion_es_de_mi_hogar(o uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.obligaciones where id = o and hogar_id = casa_aux.mi_hogar_adulto())
$$;

revoke all on function casa_aux.mi_hogar_adulto(), casa_aux.soy_el_hijo(uuid), casa_aux.hijo_es_de_mi_hogar(uuid) from public, anon;
grant execute on function casa_aux.mi_hogar_adulto(), casa_aux.soy_el_hijo(uuid), casa_aux.hijo_es_de_mi_hogar(uuid) to authenticated;

-- ---- Políticas compartidas: solo adultos ----
drop policy obligaciones_del_hogar on public.obligaciones;
create policy obligaciones_del_hogar on public.obligaciones
  for all to authenticated
  using (hogar_id = casa_aux.mi_hogar_adulto())
  with check (hogar_id = casa_aux.mi_hogar_adulto() and casa_aux.persona_es_de_mi_hogar(responsable_id));

drop policy liquidaciones_del_hogar on public.liquidaciones;
create policy liquidaciones_del_hogar on public.liquidaciones
  for all to authenticated
  using (hogar_id = casa_aux.mi_hogar_adulto())
  with check (
    hogar_id = casa_aux.mi_hogar_adulto()
    and casa_aux.persona_es_de_mi_hogar(pagador_id)
    and casa_aux.persona_es_de_mi_hogar(receptor_id)
  );

-- hijos: los adultos ven y editan todos; cada hijo ve únicamente su propia fila
drop policy hijos_del_hogar on public.hijos;
create policy hijos_adultos on public.hijos
  for all to authenticated
  using (hogar_id = casa_aux.mi_hogar_adulto())
  with check (hogar_id = casa_aux.mi_hogar_adulto());
create policy hijos_propio on public.hijos
  for select to authenticated
  using (persona_id = (select auth.uid()));

-- ---- Transferencias a los hijos ----
create table public.transferencias_hijos (
  id          uuid primary key default gen_random_uuid(),
  hogar_id    uuid not null references public.hogar (id),
  hijo_id     uuid not null references public.hijos (id) on delete cascade,
  pagador_id  uuid not null references public.personas (id) on delete cascade,   -- el adulto que transfirió
  monto       bigint not null check (monto > 0),                                  -- centavos
  fecha       date not null,
  nota        text not null default ''
);
create index on public.transferencias_hijos (hogar_id, fecha);
create index on public.transferencias_hijos (hijo_id, fecha);

alter table public.transferencias_hijos enable row level security;
alter table public.transferencias_hijos force row level security;
grant select, insert, update, delete on public.transferencias_hijos to authenticated;
grant all on public.transferencias_hijos to service_role;

-- Leen: los adultos (todas) y el hijo (solo las que le hicieron a él)
create policy transferencias_lectura on public.transferencias_hijos
  for select to authenticated
  using (hogar_id = casa_aux.mi_hogar_adulto() or casa_aux.soy_el_hijo(hijo_id));

-- Escriben: un adulto, solo a su nombre (no se carga una transferencia "en nombre del otro")
create policy transferencias_escritura on public.transferencias_hijos
  for all to authenticated
  using (hogar_id = casa_aux.mi_hogar_adulto() and pagador_id = (select auth.uid()))
  with check (
    hogar_id = casa_aux.mi_hogar_adulto()
    and pagador_id = (select auth.uid())
    and casa_aux.hijo_es_de_mi_hogar(hijo_id)
  );

-- La transferencia es también un gasto personal de quien la hizo; si se borra la transferencia, se borra ese gasto
alter table public.gastos
  add column transferencia_id uuid references public.transferencias_hijos (id) on delete cascade;
