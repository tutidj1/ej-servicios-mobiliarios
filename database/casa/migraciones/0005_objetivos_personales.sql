-- EJ Casa · 0005 · objetivos personales (privados por persona)
-- Son DISTINTOS de los objetivos de la empresa, que viven en el proyecto de EJ.
-- Nivel Privado: solo su dueño (ni la pareja ni la administración técnica).

create table public.objetivos_personales (
  id               uuid primary key default gen_random_uuid(),
  persona_id       uuid not null references public.personas (id) on delete cascade,
  nombre           text not null,
  meta             bigint not null check (meta > 0),                 -- centavos de la moneda del objetivo
  moneda           text not null check (moneda in ('ARS', 'USD')),
  fecha_objetivo   date,
  multiplo_piso    numeric(5, 2) check (multiplo_piso > 0)           -- meta = piso × este número (más adelante)
);

create table public.objetivo_personal_movimientos (
  id           uuid primary key default gen_random_uuid(),
  objetivo_id  uuid not null references public.objetivos_personales (id) on delete cascade,
  monto        bigint not null check (monto > 0),                    -- centavos de "moneda"; el signo lo da "tipo"
  moneda       text not null check (moneda in ('ARS', 'USD')),
  tc_del_dia   bigint check (tc_del_dia > 0),                        -- centavos de peso por dólar, del día del movimiento
  tipo         text not null check (tipo in ('aporte', 'retiro')),
  motivo       text not null default '',
  fecha        date not null
);

create index on public.objetivos_personales (persona_id);
create index on public.objetivo_personal_movimientos (objetivo_id, fecha);

-- Una inversión puede atarse a un objetivo personal
alter table public.inversiones
  add constraint inversiones_objetivo_fk foreign key (objetivo_id) references public.objetivos_personales (id) on delete set null;

create or replace function casa_aux.objetivo_personal_es_mio(o uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.objetivos_personales where id = o and persona_id = (select auth.uid()))
$$;
revoke all on function casa_aux.objetivo_personal_es_mio(uuid) from public, anon;
grant execute on function casa_aux.objetivo_personal_es_mio(uuid) to authenticated;

alter table public.objetivos_personales            enable row level security;
alter table public.objetivo_personal_movimientos   enable row level security;
alter table public.objetivos_personales            force row level security;
alter table public.objetivo_personal_movimientos   force row level security;

grant select, insert, update, delete on public.objetivos_personales, public.objetivo_personal_movimientos to authenticated;
grant all on public.objetivos_personales, public.objetivo_personal_movimientos to service_role;

create policy objetivos_personales_solo_dueno on public.objetivos_personales
  for all to authenticated
  using (persona_id = (select auth.uid()))
  with check (persona_id = (select auth.uid()));

create policy objetivo_personal_movimientos_solo_dueno on public.objetivo_personal_movimientos
  for all to authenticated
  using (casa_aux.objetivo_personal_es_mio(objetivo_id))
  with check (casa_aux.objetivo_personal_es_mio(objetivo_id));
