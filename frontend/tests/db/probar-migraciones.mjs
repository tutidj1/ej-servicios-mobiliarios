// Prueba las migraciones 0007-0010 y sus vueltas atrás en un Postgres local (PGlite), con datos ficticios.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

// Uso (desde frontend/): npm run test:db
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

// ---------- Estado previo mínimo que imita a Supabase + migraciones 0001-0005
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
  INSERT INTO cotizaciones (nombre) VALUES ('Lead de prueba');
`);

for (const f of ['0007_roles.sql', '0008_gestion_nucleo.sql', '0009_disponibilidad.sql', '0010_auditoria.sql', '0011_fix_costos.sql']) {
  await db.exec(leer(f));
  ok(true, `aplica ${f}`);
}
// Idempotencia: se pueden volver a correr
for (const f of ['0007_roles.sql', '0008_gestion_nucleo.sql', '0009_disponibilidad.sql', '0010_auditoria.sql']) {
  await db.exec(leer(f));
}
ok(true, 'las cuatro se pueden re-ejecutar sin error');

await db.exec(`INSERT INTO perfiles (user_id, rol, nombre) SELECT id, 'operadora', 'María Eugenia' FROM auth.users WHERE email = 'maru@x'`);
const q1 = async (sql) => (await db.query(sql)).rows[0];

// ---------- Roles
await db.exec(como(TOMAS));
ok((await q1(`SELECT public.es_admin() a, public.mi_rol() r`)).a === true, 'Tomás sigue siendo admin');
await db.exec(como(MARU));
let r = await q1(`SELECT public.es_admin() a, public.es_staff() s, public.mi_rol() r`);
ok(r.a === false && r.s === true && r.r === 'operadora', 'María Eugenia es operadora (no admin)');
ok((await db.query(`SELECT * FROM cotizaciones`)).rows.length === 1, 'la operadora ve las cotizaciones');
await db.exec(`DELETE FROM cotizaciones`); // con RLS no da error: simplemente no borra nada
await db.exec(como(TOMAS));
ok((await db.query(`SELECT * FROM cotizaciones`)).rows.length === 1, 'la operadora no pudo borrar cotizaciones');

// ---------- Inventario precargado
await db.exec(como(MARU));
const sillas = await q1(`SELECT id, stock_total FROM items WHERE nombre = 'Sillas'`);
ok(sillas.stock_total === 100, 'inventario: 100 sillas');
ok((await q1(`SELECT count(*)::int n FROM items`)).n === 25, 'inventario: 25 artículos de la plantilla');
ok((await q1(`SELECT stock_total FROM items WHERE nombre = 'Tablones de madera'`)).stock_total === 16, 'inventario: 16 tablones');
ok((await q1(`SELECT count(*)::int n FROM items WHERE stock_total IS NULL`)).n === 23, 'inventario: el resto sin límite');

// Artículo sin límite: nunca marca subalquiler
const platos = await q1(`SELECT id FROM items WHERE nombre = 'Plato principal'`);
const cli0 = await q1(`INSERT INTO clientes (nombre_apellido) VALUES ('Sin límite') RETURNING id`);
const ev0 = await q1(`INSERT INTO eventos (cliente_id, fecha_evento, fecha_entrega, fecha_devolucion) VALUES ('${cli0.id}', '2026-12-05', '2026-12-05', '2026-12-05') RETURNING id`);
await db.exec(`INSERT INTO evento_lineas (evento_id, item_id, cantidad_total, cantidad_propia, precio_unitario) VALUES ('${ev0.id}', '${platos.id}', 5000, 5000, 10)`);
ok((await db.query(`SELECT * FROM cambiar_estado_evento('${ev0.id}', 'confirmado')`)).rows.length === 0, 'sin límite: confirma 5000 platos sin ajustar nada');
ok((await q1(`SELECT stock_disponible('${platos.id}', '2026-12-05') v`)).v === null, 'sin límite: la disponibilidad vuelve vacía (no se controla)');
await db.exec(`DELETE FROM eventos WHERE id = '${ev0.id}'`);

// ---------- Ejemplo de la especificación: 150 personas, 100 sillas propias
const cli = await q1(`INSERT INTO clientes (nombre_apellido, canal_origen) VALUES ('Ana Prueba', 'instagram') RETURNING id`);
const ev1 = await q1(`INSERT INTO eventos (cliente_id, fecha_evento, fecha_entrega, fecha_devolucion, cantidad_personas)
  VALUES ('${cli.id}', '2026-11-21', '2026-11-20', '2026-11-22', 150) RETURNING id`);
await db.exec(`INSERT INTO evento_lineas (evento_id, item_id, cantidad_total, cantidad_propia, cantidad_subalquilada, precio_unitario, costo_subalquiler_unitario)
  VALUES ('${ev1.id}', '${sillas.id}', 150, 100, 50, 1000, 1000)`);
await db.query(`SELECT * FROM cambiar_estado_evento('${ev1.id}', 'confirmado')`);
r = await q1(`SELECT SUM(cantidad_total * precio_unitario) - SUM(cantidad_subalquilada * costo_subalquiler_unitario) AS aporte FROM evento_lineas WHERE evento_id = '${ev1.id}'`);
ok(Number(r.aporte) === 100000, `aporte neto de sillas = $100.000 (dio ${r.aporte})`);

// Stock descontado de entrega a devolución, inclusive
const d = async (dia) => (await q1(`SELECT stock_disponible('${sillas.id}', '${dia}') v`)).v;
ok((await d('2026-11-19')) === 100 && (await d('2026-11-20')) === 0 && (await d('2026-11-22')) === 0 && (await d('2026-11-23')) === 100,
  'stock ocupado del 20 al 22 inclusive, libre el 19 y el 23');

// ---------- Evento que cruza: avisa y subalquila
const ev2 = await q1(`INSERT INTO eventos (cliente_id, fecha_evento, fecha_entrega, fecha_devolucion)
  VALUES ('${cli.id}', '2026-11-22', '2026-11-22', '2026-11-23') RETURNING id`);
await db.exec(`INSERT INTO evento_lineas (evento_id, item_id, cantidad_total, cantidad_propia, cantidad_subalquilada, precio_unitario)
  VALUES ('${ev2.id}', '${sillas.id}', 30, 30, 0, 900)`);
ok((await q1(`SELECT stock_disponible_rango('${sillas.id}', '2026-11-22', '2026-11-23', '${ev2.id}') v`)).v === 0, 'el rango del segundo evento tiene 0 sillas libres');
const ajustes = (await db.query(`SELECT * FROM cambiar_estado_evento('${ev2.id}', 'confirmado')`)).rows;
ok(ajustes.length === 1 && ajustes[0].cantidad_propia === 0 && ajustes[0].cantidad_subalquilada === 30, 'al confirmar el que cruza: 0 propias, 30 subalquiladas');
r = (await db.query(`SELECT * FROM disponibilidad(ARRAY['${sillas.id}']::uuid[], '2026-11-21', '2026-11-23')`)).rows;
ok(r.map((x) => x.disponible).join(',') === '0,0,100', `disponibilidad día a día: ${r.map((x) => x.disponible).join(',')}`);

// Presupuestos no reservan pero se informan como tentativos
const ev3 = await q1(`INSERT INTO eventos (cliente_id, fecha_evento, fecha_entrega, fecha_devolucion)
  VALUES ('${cli.id}', '2026-11-23', '2026-11-23', '2026-11-23') RETURNING id`);
await db.exec(`INSERT INTO evento_lineas (evento_id, item_id, cantidad_total, cantidad_propia) VALUES ('${ev3.id}', '${sillas.id}', 80, 80)`);
r = await q1(`SELECT * FROM disponibilidad(ARRAY['${sillas.id}']::uuid[], '2026-11-23', '2026-11-23')`);
ok(r.disponible === 100 && r.tentativo === 80, 'un presupuesto no reserva, figura como tentativo');

// ---------- Costos y pagos (camino feliz)
await db.exec(`INSERT INTO evento_costos (evento_id, tipo, monto, descripcion) VALUES ('${ev1.id}', 'flete', 30000, NULL)`);
await db.exec(`INSERT INTO pagos (evento_id, tipo, monto, medio) VALUES ('${ev1.id}', 'seña', 50000, 'efectivo')`);
r = await q1(`SELECT (SELECT sum(monto) FROM evento_costos WHERE evento_id = '${ev1.id}') AS c, (SELECT sum(monto) FROM pagos WHERE evento_id = '${ev1.id}') AS p`);
ok(Number(r.c) === 30000 && Number(r.p) === 50000, 'se guardan un costo (flete) y un pago en un evento abierto');
await db.exec(`DELETE FROM evento_costos WHERE evento_id = '${ev1.id}'; DELETE FROM pagos WHERE evento_id = '${ev1.id}'`);

// ---------- Reglas
await espera(`SELECT * FROM cambiar_estado_evento('${ev3.id}', 'confirmado')`, /sin precio/, 'no confirma con artículos sin precio');
await espera(`UPDATE evento_lineas SET precio_unitario = NULL WHERE evento_id = '${ev1.id}'`, /necesita precio/, 'no deja borrar el precio de un evento confirmado');
await espera(`UPDATE evento_lineas SET cantidad_propia = 10 WHERE evento_id = '${ev1.id}'`, /evento_lineas_suma/, 'total = propias + subalquiladas');
await espera(`UPDATE eventos SET fecha_devolucion = '2026-11-19' WHERE id = '${ev1.id}'`, /eventos_rango_fechas/, 'devolución antes del evento no se acepta');
await espera(`UPDATE eventos SET cerrado_en = now() WHERE id = '${ev1.id}'`, /devuelto o cancelado/, 'no se cierra un evento confirmado');
await db.exec(`UPDATE eventos SET estado = 'devuelto' WHERE id = '${ev1.id}'; UPDATE eventos SET cerrado_en = now() WHERE id = '${ev1.id}';`);
ok(true, 'la operadora cierra un evento devuelto');
await espera(`UPDATE evento_lineas SET precio_unitario = 1 WHERE evento_id = '${ev1.id}'`, /cerrado/, 'evento cerrado: la operadora no cambia precios');
await espera(`INSERT INTO evento_costos (evento_id, tipo, monto) VALUES ('${ev1.id}', 'flete', 100)`, /cerrado/, 'evento cerrado: la operadora no agrega costos');
await espera(`UPDATE eventos SET cerrado_en = NULL WHERE id = '${ev1.id}'`, /Solo el administrador/, 'la operadora no puede reabrir');
await db.exec(como(TOMAS));
await db.exec(`UPDATE eventos SET cerrado_en = NULL WHERE id = '${ev1.id}'`);
ok(true, 'el admin reabre');

// ---------- Seguridad
await db.exec(como(null));
ok((await db.query(`SELECT * FROM clientes`)).rows.length === 0, 'anónimo (la web pública) no ve clientes');
await espera(`SELECT * FROM disponibilidad(NULL, '2026-11-20', '2026-11-21')`, /permission denied/, 'anónimo no puede consultar disponibilidad');
await db.exec(como(OTRO));
ok((await db.query(`SELECT * FROM eventos`)).rows.length === 0, 'una cuenta sin rol no ve eventos');
await espera(`INSERT INTO clientes (nombre_apellido) VALUES ('x')`, /row-level security/, 'una cuenta sin rol no puede crear clientes');

// ---------- Auditoría
await db.exec(como(MARU));
ok((await db.query(`SELECT * FROM audit_log`)).rows.length === 0, 'la operadora no lee la auditoría');
await db.exec(como(TOMAS));
r = await q1(`SELECT count(*)::int n, count(DISTINCT usuario)::int u FROM audit_log`);
ok(r.n > 5 && r.u === 2, `la auditoría registró ${r.n} cambios de 2 personas`);

// ---------- Vueltas atrás (en orden inverso)
await db.exec('RESET ROLE');
for (const f of ['0011_fix_costos_down.sql', '0010_auditoria_down.sql', '0009_disponibilidad_down.sql', '0008_gestion_nucleo_down.sql', '0007_roles_down.sql']) {
  await db.exec(leer(`rollback/${f}`));
  ok(true, `vuelta atrás ${f}`);
}
r = await q1(`SELECT count(*)::int n FROM information_schema.tables WHERE table_schema = 'public'`);
ok(r.n === 2, `quedan solo las tablas originales (productos, cotizaciones): ${r.n}`);
await db.exec(como(TOMAS));
ok((await q1(`SELECT public.es_admin() a`)).a === true, 'es_admin() vuelve a funcionar como antes');
ok((await db.query(`SELECT * FROM cotizaciones`)).rows.length === 1, 'la cotización existente sigue intacta');

console.log(fallas === 0 ? '\nTODO OK' : `\n${fallas} FALLAS`);
process.exit(fallas ? 1 : 0);
