import fs from 'node:fs';
import path from 'node:path';

/** Lee frontend/.env.local sin imprimir nada. Las variables ya definidas en el entorno mandan. */
export function cargarEntorno() {
  const archivo = path.resolve(__dirname, '../../.env.local');
  if (fs.existsSync(archivo)) {
    for (const linea of fs.readFileSync(archivo, 'utf8').split(/\r?\n/)) {
      const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  const pedir = (n: string) => {
    const v = process.env[n];
    if (!v) throw new Error(`Falta ${n} en frontend/.env.local (el test de privacidad usa SOLO el proyecto CASA).`);
    return v;
  };
  const cfg = {
    url: pedir('CASA_SUPABASE_URL'),
    anon: pedir('CASA_SUPABASE_ANON_KEY'),
    servicio: pedir('CASA_SUPABASE_SERVICE_ROLE_KEY'),
    bd: pedir('CASA_DATABASE_URL'),
  };
  // Salvaguarda: jamás correr contra el proyecto del negocio
  const ej = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (ej && new URL(ej).hostname === new URL(cfg.url).hostname) {
    throw new Error('CASA_SUPABASE_URL apunta al mismo proyecto que EJ. Abortado.');
  }
  return cfg;
}
