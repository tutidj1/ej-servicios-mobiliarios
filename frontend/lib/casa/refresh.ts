/**
 * ¿Por qué falló la renovación del refresh token? Decide si la bóveda del teléfono se puede borrar.
 *
 * Regla: la bóveda se borra SOLO ante una respuesta explícita del servidor que diga que el refresh
 * token es inválido, ya usado, vencido o que su sesión no existe (HTTP 400/401 con uno de esos códigos).
 * Cualquier otra cosa —sin red, timeout, 5xx, 429, respuesta rara, error desconocido— es "transitorio":
 * la bóveda queda intacta y se reintenta después. Ante la duda, no se borra.
 */

export type ResultadoRefresh = 'invalido' | 'transitorio';

/** Códigos de GoTrue (auth-js `ErrorCode`) que significan "este token ya no sirve". */
const CODIGOS_TOKEN_INVALIDO = new Set([
  'refresh_token_not_found',
  'refresh_token_already_used',
  'session_not_found',
  'session_expired',
]);

type ErrorAuth = { name?: unknown; status?: unknown; code?: unknown; message?: unknown } | null | undefined;

export function clasificarErrorRefresh(error: unknown): ResultadoRefresh {
  const e = error as ErrorAuth;
  if (!e || typeof e !== 'object') return 'transitorio';

  // Errores de red / reintentables: nunca borran
  if (e.name === 'AuthRetryableFetchError') return 'transitorio';

  // Solo una respuesta HTTP del servidor (AuthApiError) puede invalidar
  if (e.name !== 'AuthApiError') return 'transitorio';
  const status = typeof e.status === 'number' ? e.status : 0;
  if (status !== 400 && status !== 401) return 'transitorio'; // 5xx, 429, 408, 0...

  if (typeof e.code === 'string' && CODIGOS_TOKEN_INVALIDO.has(e.code)) return 'invalido';

  // Servidores GoTrue más viejos no mandan `code`: se acepta el mensaje exacto de "token inválido"
  if (e.code == null && typeof e.message === 'string' && /^invalid refresh token\b/i.test(e.message)) return 'invalido';

  return 'transitorio';
}
