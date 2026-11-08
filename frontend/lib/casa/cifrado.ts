/**
 * Bóveda local de EJ Casa: cifrado puro con WebCrypto (sin tocar almacenamiento ni red).
 *
 * Esquema (cifrado de sobre):
 *   - K: clave AES-GCM aleatoria que cifra el refresh token de Supabase.
 *   - K se guarda "envuelta" una vez por el PIN (PBKDF2) y, si se activó, otra vez por la biometría.
 *   - Sin PIN ni biometría, el refresh token del disco no se puede leer. No hay pin_hash en ningún lado.
 *
 * Límite honesto: un PIN de 6 dígitos tiene un millón de combinaciones. PBKDF2 con muchas vueltas
 * encarece cada intento, y la app borra la bóveda tras 5 PIN erróneos, pero quien copie el
 * almacenamiento del dispositivo puede probar sin ese contador. Por eso la bóveda es una
 * defensa contra el teléfono desbloqueado sobre la mesa, no contra un atacante con el disco.
 */

export const ITERACIONES_PIN = 600_000;

export type Sobre = { iv: string; ct: string };

const enc = new TextEncoder();
const dec = new TextDecoder();

export function aB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

export function deB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function aleatorios(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

/** Clave de envoltura derivada del PIN. */
export async function claveDePin(pin: string, sal: Uint8Array, iteraciones = ITERACIONES_PIN): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: sal as BufferSource, iterations: iteraciones },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Clave de envoltura derivada del secreto de la biometría (salida PRF de WebAuthn, 32 bytes). */
export async function claveDeSecreto(secreto: ArrayBuffer | Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', secreto as BufferSource, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: enc.encode('ej-casa/biometria/v1') },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function nuevaClaveDeDatos(): Promise<CryptoKey> {
  // Extraíble solo para poder volver a envolverla (p. ej. al activar la huella más tarde).
  // Vive únicamente en memoria mientras la app está desbloqueada.
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

export async function cifrar(clave: CryptoKey, datos: Uint8Array): Promise<Sobre> {
  const iv = aleatorios(12);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, clave, datos as BufferSource);
  return { iv: aB64(iv), ct: aB64(ct) };
}

export async function descifrar(clave: CryptoKey, sobre: Sobre): Promise<Uint8Array> {
  const plano = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(sobre.iv) as BufferSource }, clave, deB64(sobre.ct) as BufferSource);
  return new Uint8Array(plano);
}

export async function envolverClave(envoltura: CryptoKey, claveDatos: CryptoKey): Promise<Sobre> {
  const cruda = new Uint8Array(await crypto.subtle.exportKey('raw', claveDatos));
  return cifrar(envoltura, cruda);
}

export async function desenvolverClave(envoltura: CryptoKey, sobre: Sobre): Promise<CryptoKey> {
  const cruda = await descifrar(envoltura, sobre);
  return crypto.subtle.importKey('raw', cruda as BufferSource, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

export async function cifrarTexto(claveDatos: CryptoKey, texto: string): Promise<Sobre> {
  return cifrar(claveDatos, enc.encode(texto));
}

export async function descifrarTexto(claveDatos: CryptoKey, sobre: Sobre): Promise<string> {
  return dec.decode(await descifrar(claveDatos, sobre));
}

/** Un PIN válido son exactamente seis dígitos. */
export function pinValido(pin: string): boolean {
  return /^[0-9]{6}$/.test(pin);
}

/** PIN demasiado obvio (todos iguales o secuencia) — se rechaza al crearlo. */
export function pinDebil(pin: string): boolean {
  if (/^(\d)\1{5}$/.test(pin)) return true;
  return '0123456789'.includes(pin) || '9876543210'.includes(pin);
}
