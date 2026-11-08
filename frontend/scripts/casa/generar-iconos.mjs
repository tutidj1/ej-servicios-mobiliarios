// Genera los íconos de la PWA (PNG) sin dependencias: una casa sobre fondo oscuro.
// Uso: node scripts/casa/generar-iconos.mjs
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const salida = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/casa-pwa');
fs.mkdirSync(salida, { recursive: true });

const FONDO = [0x0e, 0x1b, 0x1a];
const ACENTO = [0x2d, 0xd4, 0xbf];

function crc32(buf) {
  let c, crc = ~0;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return ~crc >>> 0;
}
function trozo(tipo, datos) {
  const len = Buffer.alloc(4); len.writeUInt32BE(datos.length);
  const cuerpo = Buffer.concat([Buffer.from(tipo), datos]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(cuerpo));
  return Buffer.concat([len, cuerpo, crc]);
}
function png(tam, pixel) {
  const filas = Buffer.alloc((tam * 3 + 1) * tam);
  for (let y = 0; y < tam; y++) {
    filas[y * (tam * 3 + 1)] = 0;
    for (let x = 0; x < tam; x++) {
      const [r, g, b] = pixel(x / tam, y / tam);
      const i = y * (tam * 3 + 1) + 1 + x * 3;
      filas[i] = r; filas[i + 1] = g; filas[i + 2] = b;
    }
  }
  const cab = Buffer.alloc(13);
  cab.writeUInt32BE(tam, 0); cab.writeUInt32BE(tam, 4); cab[8] = 8; cab[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo('IHDR', cab), trozo('IDAT', zlib.deflateSync(filas, { level: 9 })), trozo('IEND', Buffer.alloc(0)),
  ]);
}

// Casa en coordenadas 0..1 centradas; "escala" la achica para la zona segura del ícono maskable
function dentroDeCasa(u, v, escala) {
  const x = (u - 0.5) / escala, y = (v - 0.5) / escala; // -0.5..0.5 dentro de la casa
  const techo = y >= -0.40 && y <= -0.05 && Math.abs(x) <= 0.44 * ((y + 0.40) / 0.35) + 0.0;
  const cuerpo = y > -0.08 && y <= 0.38 && Math.abs(x) <= 0.30;
  const puerta = y > 0.10 && y <= 0.38 && Math.abs(x) <= 0.09;
  return (techo || cuerpo) && !puerta;
}
function dibujo(escala) {
  return (u, v) => {
    // 3x3 de supersampling para bordes suaves
    let a = 0;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (dentroDeCasa(u + (i - 1) / 1536, v + (j - 1) / 1536, escala)) a++;
    const t = a / 9;
    return FONDO.map((f, k) => Math.round(f + (ACENTO[k] - f) * t));
  };
}

const archivos = [
  ['icon-192.png', 192, 0.8],
  ['icon-512.png', 512, 0.8],
  ['icon-maskable-512.png', 512, 0.6],   // zona segura (80% del centro)
  ['apple-touch-icon.png', 180, 0.7],
];
for (const [nombre, tam, escala] of archivos) {
  fs.writeFileSync(path.join(salida, nombre), png(tam, dibujo(escala)));
  console.log('listo', nombre);
}
