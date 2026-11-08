// Aplica database/casa/migraciones/*.sql al proyecto CASA (nunca al de EJ), en orden y una sola vez.
// Uso: npm run casa:migrar
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { cargarEnv, exigir } from './cargar-env.mjs';

cargarEnv();
exigir(['CASA_DATABASE_URL']);

const aqui = path.dirname(fileURLToPath(import.meta.url));
const carpeta = path.resolve(aqui, '../../../database/casa/migraciones');
const archivos = fs.readdirSync(carpeta).filter((f) => f.endsWith('.sql')).sort();

const c = new pg.Client({ connectionString: process.env.CASA_DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
try {
  await c.query('create schema if not exists casa_aux');
  await c.query('create table if not exists casa_aux.migraciones (nombre text primary key, aplicada_el timestamptz not null default now())');
  const hechas = new Set((await c.query('select nombre from casa_aux.migraciones')).rows.map((r) => r.nombre));
  for (const f of archivos) {
    if (hechas.has(f)) { console.log('ya aplicada  ', f); continue; }
    const sql = fs.readFileSync(path.join(carpeta, f), 'utf8');
    try {
      await c.query('begin');
      await c.query(sql);
      await c.query('insert into casa_aux.migraciones (nombre) values ($1)', [f]);
      await c.query('commit');
      console.log('aplicada     ', f);
    } catch (e) {
      await c.query('rollback').catch(() => {});
      console.error('FALLÓ        ', f, '-', e.message);
      process.exitCode = 1;
      break;
    }
  }
} finally {
  await c.end();
}
