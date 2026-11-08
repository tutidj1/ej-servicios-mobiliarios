import pg from 'pg';
import { cargarEnv, exigir } from './cargar-env.mjs';
cargarEnv();
exigir(['CASA_DATABASE_URL']);
const c = new pg.Client({ connectionString: process.env.CASA_DATABASE_URL, ssl: { rejectUnauthorized: false } });
try {
  await c.connect();
  const r = await c.query('select current_database() as db, current_user as usr, version() as v');
  console.log('Conexión OK:', r.rows[0].db, '/', r.rows[0].usr, '/', r.rows[0].v.split(' ').slice(0, 2).join(' '));
  const t = await c.query("select count(*)::int as n from information_schema.tables where table_schema='public'");
  console.log('Tablas en public:', t.rows[0].n);
  const u = await c.query("select count(*)::int as n from auth.users");
  console.log('Usuarios en auth:', u.rows[0].n);
} catch (e) {
  console.error('Falló la conexión:', e.code || e.message);
  process.exit(1);
} finally { await c.end().catch(() => {}); }
