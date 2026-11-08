// Da de alta el hogar, las cuentas de Auth y las personas de EJ Casa, leyendo
// scripts/casa/personas.local.json (que NO se sube a git; formato en personas.ejemplo.json).
// Es un script de administración que corre en tu computadora: la clave de servicio no se usa en ningún endpoint.
// Las cuentas se crean sin contraseña utilizable: se entra únicamente con invitación (npm run casa:invitar).
// Uso: npm run casa:alta
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { cargarEnv, exigir } from './cargar-env.mjs';

cargarEnv();
exigir(['CASA_SUPABASE_URL', 'CASA_SUPABASE_SERVICE_ROLE_KEY']);

const aqui = path.dirname(fileURLToPath(import.meta.url));
const archivo = path.join(aqui, 'personas.local.json');
if (!fs.existsSync(archivo)) {
  console.error('Falta scripts/casa/personas.local.json (copiá personas.ejemplo.json y completalo).');
  process.exit(1);
}
const cfg = JSON.parse(fs.readFileSync(archivo, 'utf8'));
const sb = createClient(process.env.CASA_SUPABASE_URL, process.env.CASA_SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ok(p, etiqueta) {
  const r = await p;
  if (r.error) { console.error(`${etiqueta}: ${r.error.message}`); process.exit(1); }
  return r.data;
}

// Hogar
let hogar = (await ok(sb.from('hogar').select('id').eq('nombre', cfg.hogar).maybeSingle(), 'hogar'));
if (!hogar) hogar = await ok(sb.from('hogar').insert({ nombre: cfg.hogar }).select('id').single(), 'crear hogar');

// Cuentas y personas
const ids = {};
const existentes = (await sb.auth.admin.listUsers({ page: 1, perPage: 200 })).data?.users ?? [];
for (const p of cfg.personas) {
  let user = existentes.find((u) => u.email === p.email);
  if (!user) {
    const r = await sb.auth.admin.createUser({
      email: p.email,
      password: crypto.randomBytes(48).toString('base64url'), // nadie la conoce ni la usa
      email_confirm: true,
    });
    if (r.error) { console.error('crear cuenta:', r.error.message); process.exit(1); }
    user = r.data.user;
  }
  ids[p.clave] = user.id;
  await ok(sb.from('personas').upsert({ id: user.id, hogar_id: hogar.id, nombre: p.nombre, rol: p.rol }), 'persona ' + p.nombre);
  console.log('lista       ', p.nombre, '·', p.rol);
}

// Hijos (para el costo por hijo en obligaciones)
const hijosActuales = await ok(sb.from('hijos').select('nombre').eq('hogar_id', hogar.id), 'hijos');
for (const h of cfg.hijos ?? []) {
  const fila = { hogar_id: hogar.id, nombre: h.nombre, persona_id: h.persona ? ids[h.persona] ?? null : null };
  if (hijosActuales.some((x) => x.nombre === h.nombre)) {
    await ok(sb.from('hijos').update({ persona_id: fila.persona_id }).eq('hogar_id', hogar.id).eq('nombre', h.nombre), 'hijo ' + h.nombre);
  } else {
    await ok(sb.from('hijos').insert(fila), 'hijo ' + h.nombre);
  }
  console.log('hijo        ', h.nombre);
}
