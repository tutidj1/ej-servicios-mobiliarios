-- EJ Casa · 0001 · esquema base
-- Tablas de docs/ej-casa-spec.md (sección "Stack, datos y seguridad").
-- Agregadas porque otras tablas las necesitan como clave foránea: hogar, hijos, categorias.
-- Columnas agregadas a las del spec: id (clave) y hogar_id (pertenencia al hogar).
-- objetivos y objetivo_movimientos NO están acá: viven en el proyecto de EJ (admin del negocio).
-- Se quita pin_hash: el PIN solo desbloquea un token guardado en el dispositivo.

create schema if not exists casa_aux;

create table public.hogar (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null
);

create table public.personas (
  id                uuid primary key references auth.users (id) on delete cascade,
  hogar_id          uuid not null references public.hogar (id),
  nombre            text not null,
  -- 'admin_tecnico' administra usuarios/categorías/IPC pero NO ve datos privados de nadie.
  -- Es un rol de EJ Casa, independiente del es_admin() del negocio.
  rol               text not null default 'adulto' check (rol in ('adulto', 'admin_tecnico', 'hijo'))
);

create table public.hijos (
  id          uuid primary key default gen_random_uuid(),
  hogar_id    uuid not null references public.hogar (id),
  nombre      text not null,
  persona_id  uuid references public.personas (id) on delete set null
);

create table public.categorias (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null unique,
  tipo_defecto  text not null check (tipo_defecto in ('fijo_obligatorio', 'variable_necesario', 'discrecional')),
  orden         integer not null default 0
);

create table public.gastos (
  id            uuid primary key default gen_random_uuid(),
  persona_id    uuid not null references public.personas (id) on delete cascade,
  monto         bigint not null check (monto > 0),                    -- centavos
  categoria_id  uuid not null references public.categorias (id),
  tipo          text not null check (tipo in ('fijo_obligatorio', 'variable_necesario', 'discrecional')),
  fecha         date not null,
  descripcion   text not null default '',
  origen        text not null check (origen in ('voz', 'foto', 'web', 'importado', 'manual')),
  mes_ipc       date not null check (extract(day from mes_ipc) = 1)   -- primer día del mes de IPC con que se guardó
);

create table public.ingresos (
  id               uuid primary key default gen_random_uuid(),
  persona_id       uuid not null references public.personas (id) on delete cascade,
  monto            bigint not null check (monto > 0),
  fecha            date not null,
  esperado_o_real  text not null check (esperado_o_real in ('esperado', 'real'))
);

create table public.obligaciones (
  id               uuid primary key default gen_random_uuid(),
  hogar_id         uuid not null references public.hogar (id),
  concepto         text not null,
  monto_estimado   bigint not null check (monto_estimado >= 0),
  dia_vencimiento  integer not null check (dia_vencimiento between 1 and 31),
  recurrencia      text not null check (recurrencia in ('mensual', 'bimestral', 'anual')),
  responsable_id   uuid references public.personas (id) on delete set null,  -- null = cualquiera de los dos
  hijo_id          uuid references public.hijos (id) on delete set null
);

create table public.obligacion_instancias (
  id             uuid primary key default gen_random_uuid(),
  obligacion_id  uuid not null references public.obligaciones (id) on delete cascade,
  periodo        date not null check (extract(day from periodo) = 1),
  monto_real     bigint check (monto_real >= 0),
  pagado_por     uuid references public.personas (id) on delete set null,
  fecha_pago     date,
  estado         text not null default 'pendiente' check (estado in ('pendiente', 'pagado')),
  unique (obligacion_id, periodo)
);

create table public.deudas (
  id            uuid primary key default gen_random_uuid(),
  persona_id    uuid not null references public.personas (id) on delete cascade,
  descripcion   text not null,
  tipo          text not null check (tipo in ('con_cronograma', 'sin_cronograma')),
  monto_total   bigint not null check (monto_total >= 0),
  saldo         bigint not null check (saldo >= 0),
  valor_cuota   bigint check (valor_cuota >= 0),
  cuotas_total  integer check (cuotas_total >= 0),
  cuotas_pagas  integer check (cuotas_pagas >= 0),
  tasa          numeric(9, 4) check (tasa >= 0),                      -- tasa en %, no es un monto
  mes_fin       date
);

create table public.deuda_pagos (
  id         uuid primary key default gen_random_uuid(),
  deuda_id   uuid not null references public.deudas (id) on delete cascade,
  monto      bigint not null check (monto > 0),
  fecha      date not null,
  es_minimo  boolean not null default false
);

create table public.inversiones (
  id               uuid primary key default gen_random_uuid(),
  persona_id       uuid not null references public.personas (id) on delete cascade,
  descripcion      text not null,
  clase            text not null check (clase in ('plazo_fijo', 'dolares', 'acciones', 'bien', 'prestamo', 'otro')),
  moneda           text not null check (moneda in ('ARS', 'USD')),
  modo_valuacion   text not null check (modo_valuacion in ('automatico', 'externo', 'manual')),
  valor_actual     bigint not null default 0 check (valor_actual >= 0),
  valuado_el       date,
  objetivo_id      uuid          -- objetivo del proyecto de EJ (otra base): sin clave foránea
);

create table public.inversion_movimientos (
  id             uuid primary key default gen_random_uuid(),
  inversion_id   uuid not null references public.inversiones (id) on delete cascade,
  monto          bigint not null check (monto > 0),                   -- el signo lo da "tipo"
  moneda         text not null check (moneda in ('ARS', 'USD')),
  tc_del_dia     bigint check (tc_del_dia > 0),
  tipo           text not null check (tipo in ('aporte', 'retiro')),
  motivo         text not null default '',
  fecha          date not null,
  mes_ipc        date not null check (extract(day from mes_ipc) = 1)
);

create table public.ipc (
  mes     date primary key check (extract(day from mes) = 1),
  indice  numeric(14, 4) not null check (indice > 0)
);

create table public.reglas_categoria (
  id            uuid primary key default gen_random_uuid(),
  patron        text not null,
  categoria_id  uuid not null references public.categorias (id),
  persona_id    uuid not null references public.personas (id) on delete cascade
);

create table public.auditoria (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid,                                -- sin FK: el registro sobrevive al usuario
  accion       text not null,
  tabla        text not null,
  registro_id  text,
  fecha        timestamptz not null default now()
);

create index on public.personas (hogar_id);
create index on public.gastos (persona_id, fecha);
create index on public.ingresos (persona_id, fecha);
create index on public.obligaciones (hogar_id);
create index on public.deudas (persona_id);
create index on public.inversiones (persona_id);
create index on public.auditoria (fecha desc);
