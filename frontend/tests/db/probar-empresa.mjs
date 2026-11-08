// Prueba la migración 0014 (obligaciones recurrentes y objetivos de la EMPRESA) y su vuelta atrás en un Postgres local (PGlite),
// con datos ficticios. No toca ninguna base real. Uso (desde frontend/): npm run test:db:empresa
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const MIG = process.argv[2] ?? '../database/migrations';
const leer = (f) => readFileSync(`${MIG}/${f}`, 'utf8');
const db = new PGlite();
let fallas = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'OK  ' : 'FALLA'} ${msg}`);
  if (!cond) fallas++;
};
const espera = async (sql, patron, msg) => {
  try {
    await db.exec(sql);
    ok(false, `${msg} (no dio error)`);
  } catch (e) {
    ok(patron.test(e.message), `${msg} → "${e.message}"`);
  }
};

const TOMAS = '42a4f12c-f891-42e4-ae35-2aa889711e4a';
const MARU = '11111111-1111-1111-1111-111111111111';
const OTRO = '22222222-2222-2222-2222-222222222222';
const como = (uid) => `RESET ROLE; SELECT set_config('request.jwt.claim.sub', '${uid ?? ''}', false); SET ROLE ${uid ? 'authenticated' : 'anon'};`;
const q1 = async (sql) => (await db.query(sql)).rows[0];

// ---------- Estado previo mínimo que imita a Supabase (igual que probar-migraciones.mjs)
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (id uuid primary key, email text);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated;
  GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
  GRANT USAGE ON SCHEMA public TO anon, authenticated;
  INSERT INTO auth.users VALUES ('${TOMAS}', 'tomas@x'), ('${MARU}', 'maru@x'), ('${OTRO}', 'otro@x');
  CREATE TABLE productos (id uuid primary key default gen_random_uuid(), nombre text);
  CREATE TABLE cotizaciones (id uuid primary key default gen_random_uuid(), nombre text, estado text default 'pendiente');
  ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;
  CREATE FUNCTION public.es_admin() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT auth.uid() = '${TOMAS}'::uuid $$;
  CREATE POLICY "Cotizaciones solo administrador" ON cotizaciones FOR ALL TO authenticated USING (public.es_admin()) WITH CHECK (public.es_admin());
  CREATE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;
`);
for (const f of ['0007_roles.sql', '0008_gestion_nucleo.sql', '0009_disponibilidad.sql', '0010_auditoria.sql', '0011_fix_costos.sql', '0012_locador_en_configuracion.sql', '0013_proteger_eventos_cerrados.sql']) {
  await db.exec(leer(f));
}
await db.exec(`INSERT INTO perfiles (user_id, rol, nombre) SELECT id, 'operadora', 'María Eugenia' FROM auth.users WHERE email = 'maru@x'`);

// ---------- Aplica la 0014 y se puede re-ejecutar
await db.exec(leer('0014_empresa_obligaciones_y_objetivos.sql'));
ok(true, 'aplica 0014');
await db.exec(leer('0014_empresa_obligaciones_y_objetivos.sql'));
ok(true, 'la 0014 se puede re-ejecutar sin error (idempotente)');

const tablas = ['empresa_obligaciones', 'empresa_obligacion_pagos', 'empresa_objetivos', 'empresa_objetivo_movimientos'];
const montos = (await db.query(`SELECT table_name, column_name, data_type FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = ANY($1) AND column_name IN ('monto_estimado', 'monto_real', 'meta', 'monto', 'tc_del_dia')`, [tablas])).rows;
ok(montos.length === 5 && montos.every((m) => m.data_type === 'bigint'), `los montos son enteros de centavos (bigint): ${montos.map((m) => m.column_name).join(', ')}`);
ok((await q1(`SELECT count(*)::int n FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ANY($1) AND data_type IN ('real','double precision','money')`.replace('$1', `ARRAY['${tablas.join("','")}']`))).n === 0, 'ninguna columna es de punto flotante');
ok((await q1(`SELECT count(*)::int n FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY(ARRAY['${tablas.join("','")}']) AND rowsecurity`)).n === 4, 'las cuatro tablas tienen RLS activado');

// ---------- El negocio (admin y operadora) puede usarlas
for (const [quien, uid] of [['Tomás (admin)', TOMAS], ['María Eugenia (operadora)', MARU]]) {
  await db.exec(como(uid));
  const o = await q1(`INSERT INTO empresa_obligaciones (concepto, monto_estimado, dia_vencimiento) VALUES ('Anuncios ${quien}', 15000000, 5) RETURNING id`);
  await db.exec(`INSERT INTO empresa_obligacion_pagos (obligacion_id, periodo, monto_real, fecha_pago, estado) VALUES ('${o.id}', '2026-11-01', 15500000, '2026-11-05', 'pagado')`);
  const g = await q1(`INSERT INTO empresa_objetivos (nombre, meta, moneda) VALUES ('Mobiliario ${quien}', 300000, 'USD') RETURNING id`);
  await db.exec(`INSERT INTO empresa_objetivo_movimientos (objetivo_id, monto, moneda, tc_del_dia, tipo, fecha) VALUES ('${g.id}', 10000, 'USD', 140000, 'aporte', '2026-11-03')`);
  ok(true, `${quien} carga obligaciones, pagos, objetivos y movimientos`);
}
await db.exec(como(TOMAS));
ok((await q1(`SELECT count(*)::int n FROM empresa_obligaciones`)).n === 2 && (await q1(`SELECT count(*)::int n FROM empresa_objetivos`)).n === 2, 'los dos ven lo que cargó el otro (cuenta del negocio)');

// ---------- Nadie más
await db.exec(como(OTRO));
for (const t of tablas) ok((await db.query(`SELECT * FROM ${t}`)).rows.length === 0, `una cuenta sin rol no ve ${t}`);
await espera(`INSERT INTO empresa_objetivos (nombre, meta, moneda) VALUES ('x', 1, 'ARS')`, /row-level security/, 'una cuenta sin rol no puede crear objetivos');
await espera(`INSERT INTO empresa_obligaciones (concepto, monto_estimado, dia_vencimiento) VALUES ('x', 1, 1)`, /row-level security/, 'una cuenta sin rol no puede crear obligaciones');
await db.exec(como(null));
for (const t of tablas) await espera(`SELECT * FROM ${t}`, /permission denied/, `anónimo (la web pública) no puede leer ${t}`);

// ---------- Reglas de datos
await db.exec(como(MARU));
const obj = await q1(`SELECT id FROM empresa_objetivos LIMIT 1`);
await espera(`INSERT INTO empresa_objetivo_movimientos (objetivo_id, monto, moneda, tipo, fecha) VALUES ('${obj.id}', 0, 'ARS', 'aporte', '2026-11-03')`, /monto/, 'un movimiento de monto cero no se acepta');
await espera(`INSERT INTO empresa_objetivo_movimientos (objetivo_id, monto, moneda, tipo, destino, fecha) VALUES ('${obj.id}', 1000, 'ARS', 'aporte', 'personal', '2026-11-03')`, /empresa_objetivo_movimientos_check/, 'el destino (inversión para EJ o gasto personal) solo se marca en los retiros');
await db.exec(`INSERT INTO empresa_objetivo_movimientos (objetivo_id, monto, moneda, tipo, destino, motivo, fecha) VALUES ('${obj.id}', 2000, 'USD', 'retiro', 'inversion_ej', 'Sillas nuevas', '2026-11-04')`);
ok(true, 'un retiro lleva su destino: inversión para EJ');
await espera(`INSERT INTO empresa_objetivo_movimientos (objetivo_id, monto, moneda, tipo, destino, fecha) VALUES ('${obj.id}', 2000, 'USD', 'retiro', 'otra_cosa', '2026-11-04')`, /destino/, 'el destino solo puede ser inversion_ej o personal');
await espera(`INSERT INTO empresa_objetivos (nombre, meta, moneda) VALUES ('x', -5, 'ARS')`, /meta/, 'la meta debe ser mayor que cero');
await espera(`INSERT INTO empresa_objetivos (nombre, meta, moneda) VALUES ('x', 5, 'EUR')`, /moneda/, 'solo pesos o dólares');
await espera(`INSERT INTO empresa_obligaciones (concepto, monto_estimado, dia_vencimiento) VALUES ('x', 5, 32)`, /dia_vencimiento/, 'el día de vencimiento va de 1 a 31');
const ob = await q1(`SELECT id FROM empresa_obligaciones LIMIT 1`);
await espera(`INSERT INTO empresa_obligacion_pagos (obligacion_id, periodo, estado) VALUES ('${ob.id}', '2026-11-01', 'pendiente')`, /unique|duplicate/, 'un solo registro por obligación y mes');
await espera(`INSERT INTO empresa_obligacion_pagos (obligacion_id, periodo) VALUES ('${ob.id}', '2026-12-15')`, /periodo/, 'el período es siempre el día 1 del mes');

// ---------- Auditoría
await db.exec(como(TOMAS));
const aud = await q1(`SELECT count(*)::int n FROM audit_log WHERE tabla LIKE 'empresa_%'`);
ok(aud.n >= 8, `la auditoría registró ${aud.n} cambios de las tablas de la empresa`);
await db.exec(como(MARU));
ok((await db.query(`SELECT * FROM audit_log`)).rows.length === 0, 'la operadora no lee la auditoría');

// ---------- Borrar un objetivo borra sus movimientos
await db.exec(como(TOMAS));
await db.exec(`DELETE FROM empresa_objetivos WHERE id = '${obj.id}'`);
ok((await q1(`SELECT count(*)::int n FROM empresa_objetivo_movimientos WHERE objetivo_id = '${obj.id}'`)).n === 0, 'al borrar un objetivo se borran sus movimientos');

// ---------- Vuelta atrás: solo se van las tablas de la empresa
await db.exec('RESET ROLE');
await db.exec(leer('rollback/0014_empresa_obligaciones_y_objetivos_down.sql'));
ok((await q1(`SELECT count(*)::int n FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'empresa_%'`)).n === 0, 'vuelta atrás: no queda ninguna tabla empresa_*');
ok((await q1(`SELECT count(*)::int n FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'eventos'`)).n === 1, 'las tablas del negocio siguen intactas');
await db.exec(leer('0014_empresa_obligaciones_y_objetivos.sql'));
ok(true, 'se puede volver a aplicar después de la vuelta atrás');

console.log(fallas === 0 ? '\nTODO OK' : `\n${fallas} FALLAS`);
process.exit(fallas ? 1 : 0);
