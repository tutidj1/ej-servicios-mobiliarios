-- EJ Casa · 0002 · seguridad: RLS, permisos y helpers
-- Regla de oro: las consultas se resuelven SIEMPRE con el usuario que las hace.
-- Ningún endpoint que lea datos personales usa la clave de servicio.
--
-- Niveles (docs/ej-casa-spec.md, "Modelo de privacidad"):
--   Privado       persona_id = auth.uid()                      gastos, ingresos, deudas, deuda_pagos,
--                                                              inversiones, inversion_movimientos, reglas_categoria
--   Compartido    pertenencia al hogar (adultos / admin técnico) obligaciones, obligacion_instancias, hijos
--   Admin EJ      hogar + personas.acceso_objetivos            objetivos, objetivo_movimientos
--   Administración: el rol admin_tecnico administra personas, categorias e ipc,
--                   y NO tiene ninguna política que le abra datos privados.
--   Auditoría     lectura para todos; escritura solo desde el servidor (sin permiso de escritura para usuarios)

-- ---------------------------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER, esquema no expuesto por la API)
-- ---------------------------------------------------------------------------------------------
create or replace function casa_aux.mi_hogar() returns uuid
language sql stable security definer set search_path = '' as $$
  select hogar_id from public.personas where id = (select auth.uid()) and rol <> 'hijo'
$$;

create or replace function casa_aux.soy_persona() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.personas where id = (select auth.uid()))
$$;

create or replace function casa_aux.soy_admin_tecnico() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.personas where id = (select auth.uid()) and rol = 'admin_tecnico')
$$;

create or replace function casa_aux.tengo_objetivos() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.personas
    where id = (select auth.uid()) and rol <> 'hijo' and acceso_objetivos
  )
$$;

create or replace function casa_aux.persona_es_de_mi_hogar(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p is null or exists (
    select 1 from public.personas where id = p and hogar_id = casa_aux.mi_hogar()
  )
$$;

create or replace function casa_aux.obligacion_es_de_mi_hogar(o uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.obligaciones where id = o and hogar_id = casa_aux.mi_hogar()
  )
$$;

create or replace function casa_aux.objetivo_es_de_mi_hogar(o uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.objetivos where id = o and hogar_id = casa_aux.mi_hogar()
  )
$$;

create or replace function casa_aux.deuda_es_mia(d uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.deudas where id = d and persona_id = (select auth.uid()))
$$;

create or replace function casa_aux.inversion_es_mia(i uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.inversiones where id = i and persona_id = (select auth.uid()))
$$;

-- El mes de IPC se guarda en la fila (no se recalcula): si falta, se toma el mes de la fecha.
create or replace function casa_aux.completar_mes_ipc() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.mes_ipc is null then
    new.mes_ipc := date_trunc('month', new.fecha)::date;
  end if;
  return new;
end $$;

create trigger gastos_mes_ipc before insert on public.gastos
  for each row execute function casa_aux.completar_mes_ipc();
create trigger inversion_mov_mes_ipc before insert on public.inversion_movimientos
  for each row execute function casa_aux.completar_mes_ipc();

-- ---------------------------------------------------------------------------------------------
-- Permisos: se parte de cero. anon no recibe nada.
-- ---------------------------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

revoke all on schema casa_aux from public;
grant usage on schema casa_aux to authenticated;
revoke all on all functions in schema casa_aux from public, anon;
grant execute on all functions in schema casa_aux to authenticated;

-- ---------------------------------------------------------------------------------------------
-- RLS activado y FORZADO en todas las tablas (también vale para el dueño de la tabla)
-- ---------------------------------------------------------------------------------------------
alter table public.hogar                  enable row level security;
alter table public.personas               enable row level security;
alter table public.hijos                  enable row level security;
alter table public.categorias             enable row level security;
alter table public.gastos                 enable row level security;
alter table public.ingresos               enable row level security;
alter table public.obligaciones           enable row level security;
alter table public.obligacion_instancias  enable row level security;
alter table public.deudas                 enable row level security;
alter table public.deuda_pagos            enable row level security;
alter table public.objetivos              enable row level security;
alter table public.objetivo_movimientos   enable row level security;
alter table public.inversiones            enable row level security;
alter table public.inversion_movimientos  enable row level security;
alter table public.ipc                    enable row level security;
alter table public.reglas_categoria       enable row level security;
alter table public.auditoria              enable row level security;

alter table public.hogar                  force row level security;
alter table public.personas               force row level security;
alter table public.hijos                  force row level security;
alter table public.categorias             force row level security;
alter table public.gastos                 force row level security;
alter table public.ingresos               force row level security;
alter table public.obligaciones           force row level security;
alter table public.obligacion_instancias  force row level security;
alter table public.deudas                 force row level security;
alter table public.deuda_pagos            force row level security;
alter table public.objetivos              force row level security;
alter table public.objetivo_movimientos   force row level security;
alter table public.inversiones            force row level security;
alter table public.inversion_movimientos  force row level security;
alter table public.ipc                    force row level security;
alter table public.reglas_categoria       force row level security;
alter table public.auditoria              force row level security;

-- ---------------------------------------------------------------------------------------------
-- PRIVADO · solo su dueño. Una política por tabla.
-- ---------------------------------------------------------------------------------------------
grant select, insert, update, delete on public.gastos, public.ingresos, public.deudas,
  public.inversiones, public.reglas_categoria to authenticated;
grant select, insert, update, delete on public.deuda_pagos, public.inversion_movimientos to authenticated;

create policy gastos_solo_dueno on public.gastos
  for all to authenticated
  using (persona_id = (select auth.uid()))
  with check (persona_id = (select auth.uid()));

create policy ingresos_solo_dueno on public.ingresos
  for all to authenticated
  using (persona_id = (select auth.uid()))
  with check (persona_id = (select auth.uid()));

create policy deudas_solo_dueno on public.deudas
  for all to authenticated
  using (persona_id = (select auth.uid()))
  with check (persona_id = (select auth.uid()));

create policy deuda_pagos_solo_dueno on public.deuda_pagos
  for all to authenticated
  using (casa_aux.deuda_es_mia(deuda_id))
  with check (casa_aux.deuda_es_mia(deuda_id));

create policy inversiones_solo_dueno on public.inversiones
  for all to authenticated
  using (persona_id = (select auth.uid()))
  with check (persona_id = (select auth.uid()));

create policy inversion_movimientos_solo_dueno on public.inversion_movimientos
  for all to authenticated
  using (casa_aux.inversion_es_mia(inversion_id))
  with check (casa_aux.inversion_es_mia(inversion_id));

create policy reglas_categoria_solo_dueno on public.reglas_categoria
  for all to authenticated
  using (persona_id = (select auth.uid()))
  with check (persona_id = (select auth.uid()));

-- ---------------------------------------------------------------------------------------------
-- COMPARTIDO · los dos adultos del hogar, completo
-- ---------------------------------------------------------------------------------------------
grant select, insert, update, delete on public.obligaciones, public.obligacion_instancias, public.hijos to authenticated;

create policy obligaciones_del_hogar on public.obligaciones
  for all to authenticated
  using (hogar_id = casa_aux.mi_hogar())
  with check (hogar_id = casa_aux.mi_hogar() and casa_aux.persona_es_de_mi_hogar(responsable_id));

create policy obligacion_instancias_del_hogar on public.obligacion_instancias
  for all to authenticated
  using (casa_aux.obligacion_es_de_mi_hogar(obligacion_id))
  with check (casa_aux.obligacion_es_de_mi_hogar(obligacion_id) and casa_aux.persona_es_de_mi_hogar(pagado_por));

create policy hijos_del_hogar on public.hijos
  for all to authenticated
  using (hogar_id = casa_aux.mi_hogar())
  with check (hogar_id = casa_aux.mi_hogar());

-- ---------------------------------------------------------------------------------------------
-- ADMIN EJ · objetivos (hogar + acceso_objetivos)
-- ---------------------------------------------------------------------------------------------
grant select, insert, update, delete on public.objetivos, public.objetivo_movimientos to authenticated;

create policy objetivos_con_acceso on public.objetivos
  for all to authenticated
  using (hogar_id = casa_aux.mi_hogar() and casa_aux.tengo_objetivos())
  with check (hogar_id = casa_aux.mi_hogar() and casa_aux.tengo_objetivos());

create policy objetivo_movimientos_con_acceso on public.objetivo_movimientos
  for all to authenticated
  using (casa_aux.tengo_objetivos() and casa_aux.objetivo_es_de_mi_hogar(objetivo_id))
  with check (casa_aux.tengo_objetivos() and casa_aux.objetivo_es_de_mi_hogar(objetivo_id));

-- ---------------------------------------------------------------------------------------------
-- ADMINISTRACIÓN · usuarios, categorías, IPC
-- personas: todos ven a los de su hogar (nombre y rol); solo el admin técnico modifica, y solo
-- nombre/rol/acceso. Crear y borrar personas se hace desde el servidor al dar de alta cuentas.
-- ---------------------------------------------------------------------------------------------
grant select on public.personas to authenticated;
grant update (nombre, rol, acceso_objetivos) on public.personas to authenticated;
grant select on public.hogar to authenticated;

create policy personas_lectura on public.personas
  for select to authenticated
  using (id = (select auth.uid()) or hogar_id = casa_aux.mi_hogar());
create policy personas_admin on public.personas
  for update to authenticated
  using (casa_aux.soy_admin_tecnico() and hogar_id = casa_aux.mi_hogar())
  with check (casa_aux.soy_admin_tecnico() and hogar_id = casa_aux.mi_hogar());

create policy hogar_propio on public.hogar
  for select to authenticated
  using (id = casa_aux.mi_hogar());

grant select on public.categorias, public.ipc to authenticated;
grant insert, update, delete on public.categorias, public.ipc to authenticated;

-- Lectura para toda persona; escritura solo del admin técnico (dos políticas porque
-- leer y escribir tienen reglas distintas: un "for all" dejaría borrar a cualquiera).
create policy categorias_lectura on public.categorias
  for select to authenticated
  using (casa_aux.soy_persona());
create policy categorias_admin on public.categorias
  for all to authenticated
  using (casa_aux.soy_admin_tecnico())
  with check (casa_aux.soy_admin_tecnico());

create policy ipc_lectura on public.ipc
  for select to authenticated
  using (casa_aux.soy_persona());
create policy ipc_admin on public.ipc
  for all to authenticated
  using (casa_aux.soy_admin_tecnico())
  with check (casa_aux.soy_admin_tecnico());

-- ---------------------------------------------------------------------------------------------
-- AUDITORÍA · la ven todos; nadie escribe desde la API (solo el servidor, con la clave de servicio)
-- ---------------------------------------------------------------------------------------------
grant select on public.auditoria to authenticated;

create policy auditoria_lectura on public.auditoria
  for select to authenticated
  using (casa_aux.soy_persona());
