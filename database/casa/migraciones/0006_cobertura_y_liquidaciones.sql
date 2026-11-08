-- EJ Casa · 0006 · cobertura de obligaciones y "saldar entre ellos"
-- Nivel Compartido (los adultos del hogar, completo).
--
-- 1) obligacion_instancias.responsable_id: quién se hacía cargo EN ESE MES (foto al crear la instancia).
--    Sin esto, cambiar el responsable de una obligación reescribiría el historial y los saldos.
-- 2) liquidaciones: transferencias para saldar lo que uno pagó y le tocaba al otro.

alter table public.obligacion_instancias
  add column responsable_id uuid references public.personas (id) on delete set null;

-- Las instancias que ya existían toman el responsable actual de su obligación
update public.obligacion_instancias i
   set responsable_id = o.responsable_id
  from public.obligaciones o
 where o.id = i.obligacion_id;

-- La política de instancias ahora también exige que el responsable sea del hogar
drop policy obligacion_instancias_del_hogar on public.obligacion_instancias;
create policy obligacion_instancias_del_hogar on public.obligacion_instancias
  for all to authenticated
  using (casa_aux.obligacion_es_de_mi_hogar(obligacion_id))
  with check (
    casa_aux.obligacion_es_de_mi_hogar(obligacion_id)
    and casa_aux.persona_es_de_mi_hogar(pagado_por)
    and casa_aux.persona_es_de_mi_hogar(responsable_id)
  );

create table public.liquidaciones (
  id           uuid primary key default gen_random_uuid(),
  hogar_id     uuid not null references public.hogar (id),
  pagador_id   uuid not null references public.personas (id) on delete cascade,   -- quién transfirió
  receptor_id  uuid not null references public.personas (id) on delete cascade,   -- a quién
  monto        bigint not null check (monto > 0),                                  -- centavos
  fecha        date not null,
  check (pagador_id <> receptor_id)
);
create index on public.liquidaciones (hogar_id, fecha);

alter table public.liquidaciones enable row level security;
alter table public.liquidaciones force row level security;
grant select, insert, update, delete on public.liquidaciones to authenticated;
grant all on public.liquidaciones to service_role;

create policy liquidaciones_del_hogar on public.liquidaciones
  for all to authenticated
  using (hogar_id = casa_aux.mi_hogar())
  with check (
    hogar_id = casa_aux.mi_hogar()
    and casa_aux.persona_es_de_mi_hogar(pagador_id)
    and casa_aux.persona_es_de_mi_hogar(receptor_id)
  );
