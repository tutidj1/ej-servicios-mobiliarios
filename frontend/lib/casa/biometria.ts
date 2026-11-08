/**
 * Biometría con WebAuthn (huella / Face ID / desbloqueo del dispositivo).
 *
 * Se usa la extensión PRF cuando el dispositivo la soporta: la biometría entrega un secreto que
 * envuelve la clave de la bóveda (nadie puede abrirla sin el autenticador). Si no hay PRF
 * (p. ej. iOS anterior a 18), la biometría actúa como compuerta de la app y la clave del
 * dispositivo se libera solo después de una verificación exitosa.
 */
import { aB64, aleatorios, deB64 } from './cifrado';

export type RegistroBiometria = {
  credId: string;
  /** 'prf': el autenticador aporta el secreto. 'dispositivo': compuerta + clave guardada en el dispositivo. */
  modo: 'prf' | 'dispositivo';
  saltPrf: string;
  secreto: Uint8Array | null;
};

type Extensiones = AuthenticationExtensionsClientInputs & { prf?: { eval?: { first: BufferSource } } };

export async function biometriaDisponible(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function secretoPrf(cred: PublicKeyCredential): Uint8Array | null {
  const ext = cred.getClientExtensionResults() as { prf?: { results?: { first?: ArrayBuffer } } };
  const primero = ext.prf?.results?.first;
  return primero ? new Uint8Array(primero) : null;
}

export async function registrarBiometria(personaId: string, nombre: string): Promise<RegistroBiometria> {
  const saltPrf = aleatorios(32);
  const creada = (await navigator.credentials.create({
    publicKey: {
      challenge: aleatorios(32) as BufferSource,
      rp: { name: 'EJ Casa' },
      user: { id: new TextEncoder().encode(personaId) as BufferSource, name: nombre, displayName: nombre },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      timeout: 60_000,
      attestation: 'none',
      extensions: { prf: {} } as Extensiones,
    },
  })) as PublicKeyCredential | null;
  if (!creada) throw new Error('No se pudo registrar la biometría.');

  const credId = aB64(creada.rawId);
  // Segunda verificación: es la que devuelve el secreto PRF (si existe).
  const secreto = await verificarBiometria(credId, aB64(saltPrf));
  return { credId, modo: secreto ? 'prf' : 'dispositivo', saltPrf: aB64(saltPrf), secreto };
}

/** Pide la biometría. Devuelve el secreto PRF si hay; si no, null (la verificación igual fue exitosa). */
export async function verificarBiometria(credId: string, saltPrf: string): Promise<Uint8Array | null> {
  const ext: Extensiones = { prf: { eval: { first: deB64(saltPrf) as BufferSource } } };
  const resp = (await navigator.credentials.get({
    publicKey: {
      challenge: aleatorios(32) as BufferSource,
      allowCredentials: [{ type: 'public-key', id: deB64(credId) as BufferSource }],
      userVerification: 'required',
      timeout: 60_000,
      extensions: ext,
    },
  })) as PublicKeyCredential | null;
  if (!resp) throw new Error('Biometría cancelada.');
  return secretoPrf(resp);
}
