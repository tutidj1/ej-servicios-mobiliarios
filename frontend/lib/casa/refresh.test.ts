import { describe, expect, it } from 'vitest';
import { AuthApiError, AuthRetryableFetchError, AuthUnknownError } from '@supabase/supabase-js';
import { clasificarErrorRefresh } from './refresh';
import { borrarSiTokenIgual, crearBoveda, leerBoveda, type AlmacenBoveda, type RegistroBoveda } from './boveda';

describe('refresh token: cuándo se puede borrar la bóveda', () => {
  it('SÍ ante respuesta explícita de token inválido, ya usado, vencido o sesión inexistente', () => {
    for (const code of ['refresh_token_not_found', 'refresh_token_already_used', 'session_not_found', 'session_expired']) {
      expect(clasificarErrorRefresh(new AuthApiError('x', 400, code as never)), code).toBe('invalido');
      expect(clasificarErrorRefresh(new AuthApiError('x', 401, code as never)), code).toBe('invalido');
    }
    // servidor sin `code`: mensaje exacto de GoTrue
    expect(clasificarErrorRefresh(new AuthApiError('Invalid Refresh Token: Refresh Token Not Found', 400, undefined))).toBe('invalido');
  });

  it('NUNCA ante errores de red', () => {
    expect(clasificarErrorRefresh(new AuthRetryableFetchError('Failed to fetch', 0))).toBe('transitorio');
    expect(clasificarErrorRefresh(new AuthRetryableFetchError('Failed to fetch', 503))).toBe('transitorio');
    expect(clasificarErrorRefresh(new TypeError('Failed to fetch'))).toBe('transitorio');
    expect(clasificarErrorRefresh(new AuthUnknownError('raro', new Error('x')))).toBe('transitorio');
  });

  it('NUNCA ante 5xx, 429, timeouts ni códigos de status raros, aunque traigan un código de token', () => {
    for (const status of [0, 408, 429, 500, 502, 503, 504, 522]) {
      expect(clasificarErrorRefresh(new AuthApiError('x', status, 'refresh_token_not_found' as never)), String(status)).toBe('transitorio');
      expect(clasificarErrorRefresh(new AuthApiError('Invalid Refresh Token', status, undefined)), String(status)).toBe('transitorio');
    }
  });

  it('NUNCA ante otros errores del servidor (rate limit, hooks, usuario baneado, etc.)', () => {
    for (const code of ['over_request_rate_limit', 'request_timeout', 'unexpected_failure', 'user_banned', 'hook_timeout']) {
      expect(clasificarErrorRefresh(new AuthApiError('x', 400, code as never)), code).toBe('transitorio');
    }
    expect(clasificarErrorRefresh(new AuthApiError('Invalid login credentials', 400, undefined))).toBe('transitorio');
  });

  it('ante la duda (sin error, undefined, objetos raros) no se borra', () => {
    for (const x of [null, undefined, 'error', 42, {}, { status: 400 }, { name: 'AuthApiError' }, { name: 'AuthApiError', status: 400 }]) {
      expect(clasificarErrorRefresh(x)).toBe('transitorio');
    }
  });
});

function almacen(): AlmacenBoveda {
  let r: RegistroBoveda | null = null;
  return {
    async leer() { return r ? structuredClone(r) : null; },
    async escribir(x) { r = structuredClone(x); },
    async borrar() { r = null; },
  };
}

describe('borrado de la bóveda: solo si sigue siendo la misma que falló', () => {
  it('no borra una bóveda que otra pestaña ya renovó con un token nuevo', async () => {
    const a = almacen();
    const { registro } = await crearBoveda({ personaId: 'p', nombre: 'n', refreshToken: 'viejo', pin: '482916' }, a, 1000);
    const usado = registro.token.ct;

    // otra pestaña rotó el token y lo guardó
    const actual = (await leerBoveda(a))!;
    await a.escribir({ ...actual, token: { iv: 'x', ct: 'otro-token-cifrado' } });

    expect(await borrarSiTokenIgual(usado, a)).toBe(false);
    expect(await leerBoveda(a)).not.toBeNull();
  });

  it('borra cuando sigue siendo la que falló', async () => {
    const a = almacen();
    const { registro } = await crearBoveda({ personaId: 'p', nombre: 'n', refreshToken: 'viejo', pin: '482916' }, a, 1000);
    expect(await borrarSiTokenIgual(registro.token.ct, a)).toBe(true);
    expect(await leerBoveda(a)).toBeNull();
  });
});
