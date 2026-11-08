// Carga frontend/.env.local en process.env sin imprimir valores.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));

export function cargarEnv() {
  const archivo = path.resolve(aqui, '../../.env.local');
  if (!fs.existsSync(archivo)) return;
  for (const linea of fs.readFileSync(archivo, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

export function exigir(nombres) {
  const faltan = nombres.filter((n) => !process.env[n]);
  if (faltan.length) {
    console.error('Faltan variables en frontend/.env.local: ' + faltan.join(', '));
    process.exit(1);
  }
}
