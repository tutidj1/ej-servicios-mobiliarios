// Genera un enlace de invitación de un solo uso para una persona (vale ~1 hora).
// Se abre desde el teléfono de esa persona: ahí elige su PIN. No hay contraseñas ni mails de por medio.
// El enlace es un secreto: pasáselo a la persona en mano y no lo pegues en chats compartidos.
// Uso: npm run casa:invitar -- <nombre o clave> [--url https://ejserviciomobiliarios.com]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { cargarEnv, exigir } from './cargar-env.mjs';

cargarEnv();
exigir(['CASA_SUPABASE_URL', 'CASA_SUPABASE_SERVICE_ROLE_KEY']);

const args = process.argv.slice(2);
const iUrl = args.indexOf('--url');
const base = (iUrl >= 0 ? args[iUrl + 1] : 'https://ejserviciomobiliarios.com').replace(/\/$/, '');
const quien = args.filter((a, i) => !a.startsWith('--') && (iUrl < 0 || i !== iUrl + 1))[0];
if (!quien) { console.error('Uso: npm run casa:invitar -- <nombre> [--url https://...]'); process.exit(1); }

const aqui = path.dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(fs.readFileSync(path.join(aqui, 'personas.local.json'), 'utf8'));
const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const p = cfg.personas.find((x) => norm(x.nombre) === norm(quien) || norm(x.clave) === norm(quien));
if (!p) { console.error('No encontré a esa persona en personas.local.json.'); process.exit(1); }

const sb = createClient(process.env.CASA_SUPABASE_URL, process.env.CASA_SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data, error } = await sb.auth.admin.generateLink({ type: 'magiclink', email: p.email });
if (error || !data?.properties?.hashed_token) { console.error('No se pudo generar la invitación:', error?.message); process.exit(1); }
console.log(`Invitación para ${p.nombre} (vale cerca de 1 hora y se usa una sola vez):`);
console.log(`${base}/casa/entrar#t=${data.properties.hashed_token}`);
