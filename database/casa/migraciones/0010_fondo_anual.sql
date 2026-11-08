-- EJ Casa · 0010 · fondo de gastos anuales (privado de cada persona)
-- Patente, seguro, matrícula, útiles, uniformes, cuota anual del club: se cargan una vez con su monto y su mes,
-- y la app calcula cuánto apartar por mes, cuánto hay apartado y cuánto falta. Nivel Privado: solo su dueño.
-- (Las obligaciones anuales de la CASA, compartidas, siguen siendo obligaciones con recurrencia 'anual'.)

create table public.fondo_anual (
  id            uuid primary key default gen_random_uuid(),
  persona_id    uuid not null references public.personas (id) on delete cascade,
  concepto      text not null,
  monto         bigint not null check (monto > 0),                 -- centavos
  mes           smallint not null check (mes between 1 and 12),    -- mes en que vence cada año
  apartado      bigint not null default 0 check (apartado >= 0),   -- centavos apartados para el próximo vencimiento
  pagado_anio   smallint                                           -- año del vencimiento ya pagado (el ciclo pasa al año siguiente)
);
create index on public.fondo_anual (persona_id);

alter table public.fondo_anual enable row level security;
alter table public.fondo_anual force row level security;
grant select, insert, update, delete on public.fondo_anual to authenticated;
grant all on public.fondo_anual to service_role;

create policy fondo_anual_solo_dueno on public.fondo_anual
  for all to authenticated
  using (persona_id = (select auth.uid()))
  with check (persona_id = (select auth.uid()));
