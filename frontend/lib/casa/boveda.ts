/**
 * Bóveda del dispositivo: guarda el refresh token de Supabase cifrado, desbloqueable con
 * PIN de 6 dígitos o biometría. No existe pin_hash: el PIN no se compara con nada, solo abre (o no)
 * el sobre cifrado.
 */
import {
  aB64, aleatorios, claveDePin, claveDeSecreto, cifrarTexto, deB64, descifrarTexto, desenvolverClave,
  envolverClave, ITERACIONES_PIN, nuevaClaveDeDatos, type Sobre,
} from './cifrado';
import { registrarBiometria, verificarBiometria } from './biometria';

export const MAX_FALLOS_PIN = 5;

export type RegistroBoveda = {
  v: 1;
  personaId: string;
  nombre: string;
  sal: string;
  iteraciones: number;
  clavePin: Sobre;
  token: Sobre;
  fallos: number;
  bio?: {
    modo: 'prf' | 'dispositivo';
    credId: string;
    saltPrf: string;
    clave: Sobre;
    /** Solo en modo 'dispositivo': clave no extraíble que se usa después de verificar la biometría. */
    claveDispositivo?: CryptoKey;
  };
};

export type AlmacenBoveda = {
  leer(): Promise<RegistroBoveda | null>;
  escribir(r: RegistroBoveda): Promise<void>;
  borrar(): Promise<void>;
};

export type CodigoErrorBoveda = 'SIN_BOVEDA' | 'PIN_INCORRECTO' | 'BOVEDA_BORRADA' | 'SIN_BIOMETRIA';

export class ErrorBoveda extends Error {
  constructor(public codigo: CodigoErrorBoveda, public restantes?: number) {
    super(codigo);
  }
}

// ---- Almacenamiento real: IndexedDB (guarda CryptoKey sin poder extraerla) ----
const BD = 'ej-casa';
const TIENDA = 'kv';
const CLAVE = 'boveda';

function abrirBd(): Promise<IDBDatabase> {
  return new Promise((ok, mal) => {
    const req = indexedDB.open(BD, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(TIENDA);
    req.onsuccess = () => ok(req.result);
    req.onerror = () => mal(req.error);
  });
}

async function operar<T>(modo: IDBTransactionMode, f: (t: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const bd = await abrirBd();
  try {
    return await new Promise<T>((ok, mal) => {
      const req = f(bd.transaction(TIENDA, modo).objectStore(TIENDA));
      req.onsuccess = () => ok(req.result);
      req.onerror = () => mal(req.error);
    });
  } finally {
    bd.close();
  }
}

export const almacenIndexedDb: AlmacenBoveda = {
  async leer() {
    return ((await operar('readonly', (t) => t.get(CLAVE))) as RegistroBoveda | undefined) ?? null;
  },
  async escribir(r) {
    await operar('readwrite', (t) => t.put(r, CLAVE));
  },
  async borrar() {
    await operar('readwrite', (t) => t.delete(CLAVE));
  },
};

// ---- Operaciones ----
export type BovedaAbierta = { claveDatos: CryptoKey; refreshToken: string; registro: RegistroBoveda };

export async function crearBoveda(
  datos: { personaId: string; nombre: string; refreshToken: string; pin: string },
  almacen: AlmacenBoveda = almacenIndexedDb,
  iteraciones = ITERACIONES_PIN,
): Promise<{ claveDatos: CryptoKey; registro: RegistroBoveda }> {
  const sal = aleatorios(16);
  const claveDatos = await nuevaClaveDeDatos();
  const registro: RegistroBoveda = {
    v: 1,
    personaId: datos.personaId,
    nombre: datos.nombre,
    sal: aB64(sal),
    iteraciones,
    clavePin: await envolverClave(await claveDePin(datos.pin, sal, iteraciones), claveDatos),
    token: await cifrarTexto(claveDatos, datos.refreshToken),
    fallos: 0,
  };
  await almacen.escribir(registro);
  return { claveDatos, registro };
}

export async function desbloquearConPin(pin: string, almacen: AlmacenBoveda = almacenIndexedDb): Promise<BovedaAbierta> {
  const reg = await almacen.leer();
  if (!reg) throw new ErrorBoveda('SIN_BOVEDA');

  // El intento se cuenta ANTES de probar: cerrar la app a mitad de camino no regala intentos.
  const fallos = reg.fallos + 1;
  if (fallos > MAX_FALLOS_PIN) {
    await almacen.borrar();
    throw new ErrorBoveda('BOVEDA_BORRADA');
  }
  await almacen.escribir({ ...reg, fallos });

  let claveDatos: CryptoKey;
  try {
    claveDatos = await desenvolverClave(await claveDePin(pin, deB64(reg.sal), reg.iteraciones), reg.clavePin);
  } catch {
    if (fallos >= MAX_FALLOS_PIN) {
      await almacen.borrar();
      throw new ErrorBoveda('BOVEDA_BORRADA');
    }
    throw new ErrorBoveda('PIN_INCORRECTO', MAX_FALLOS_PIN - fallos);
  }
  const refreshToken = await descifrarTexto(claveDatos, reg.token);
  const limpio = { ...reg, fallos: 0 };
  await almacen.escribir(limpio);
  return { claveDatos, refreshToken, registro: limpio };
}

export async function desbloquearConBiometria(almacen: AlmacenBoveda = almacenIndexedDb): Promise<BovedaAbierta> {
  const reg = await almacen.leer();
  if (!reg) throw new ErrorBoveda('SIN_BOVEDA');
  if (!reg.bio) throw new ErrorBoveda('SIN_BIOMETRIA');
  const secreto = await verificarBiometria(reg.bio.credId, reg.bio.saltPrf);
  let envoltura: CryptoKey;
  if (reg.bio.modo === 'prf') {
    if (!secreto) throw new ErrorBoveda('SIN_BIOMETRIA');
    envoltura = await claveDeSecreto(secreto);
  } else {
    if (!reg.bio.claveDispositivo) throw new ErrorBoveda('SIN_BIOMETRIA');
    envoltura = reg.bio.claveDispositivo;
  }
  const claveDatos = await desenvolverClave(envoltura, reg.bio.clave);
  const refreshToken = await descifrarTexto(claveDatos, reg.token);
  const limpio = { ...reg, fallos: 0 };
  await almacen.escribir(limpio);
  return { claveDatos, refreshToken, registro: limpio };
}

/** El refresh token rota en cada renovación: se vuelve a cifrar con la misma clave de datos. */
export async function guardarToken(claveDatos: CryptoKey, refreshToken: string, almacen: AlmacenBoveda = almacenIndexedDb) {
  const reg = await almacen.leer();
  if (!reg) return;
  await almacen.escribir({ ...reg, token: await cifrarTexto(claveDatos, refreshToken) });
}

export async function activarBiometria(claveDatos: CryptoKey, almacen: AlmacenBoveda = almacenIndexedDb) {
  const reg = await almacen.leer();
  if (!reg) throw new ErrorBoveda('SIN_BOVEDA');
  const r = await registrarBiometria(reg.personaId, reg.nombre);
  let envoltura: CryptoKey;
  let claveDispositivo: CryptoKey | undefined;
  if (r.modo === 'prf' && r.secreto) {
    envoltura = await claveDeSecreto(r.secreto);
  } else {
    claveDispositivo = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    envoltura = claveDispositivo;
  }
  await almacen.escribir({
    ...reg,
    bio: { modo: r.modo, credId: r.credId, saltPrf: r.saltPrf, clave: await envolverClave(envoltura, claveDatos), claveDispositivo },
  });
  return r.modo;
}

export async function quitarBiometria(almacen: AlmacenBoveda = almacenIndexedDb) {
  const reg = await almacen.leer();
  if (!reg) return;
  const { bio: _quitada, ...sinBio } = reg;
  void _quitada;
  await almacen.escribir(sinBio);
}

export async function cambiarPin(
  claveDatos: CryptoKey,
  pinNuevo: string,
  almacen: AlmacenBoveda = almacenIndexedDb,
  iteraciones = ITERACIONES_PIN,
) {
  const reg = await almacen.leer();
  if (!reg) throw new ErrorBoveda('SIN_BOVEDA');
  const sal = aleatorios(16);
  await almacen.escribir({
    ...reg,
    sal: aB64(sal),
    iteraciones,
    clavePin: await envolverClave(await claveDePin(pinNuevo, sal, iteraciones), claveDatos),
    fallos: 0,
  });
}

export const leerBoveda = (almacen: AlmacenBoveda = almacenIndexedDb) => almacen.leer();
export const borrarBoveda = (almacen: AlmacenBoveda = almacenIndexedDb) => almacen.borrar();
