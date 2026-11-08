import { describe, expect, it } from 'vitest';
import {
  aleatorios, claveDePin, claveDeSecreto, cifrarTexto, descifrarTexto, desenvolverClave, envolverClave,
  nuevaClaveDeDatos, pinDebil, pinValido,
} from './cifrado';

const RAPIDO = 1000; // vueltas de PBKDF2 solo para que el test sea veloz

describe('bóveda: cifrado', () => {
  it('con el PIN correcto se recupera el token; con otro PIN no', async () => {
    const sal = aleatorios(16);
    const k = await nuevaClaveDeDatos();
    const token = await cifrarTexto(k, 'refresh-token-de-prueba');
    const envuelta = await envolverClave(await claveDePin('482916', sal, RAPIDO), k);

    const k2 = await desenvolverClave(await claveDePin('482916', sal, RAPIDO), envuelta);
    expect(await descifrarTexto(k2, token)).toBe('refresh-token-de-prueba');

    await expect(desenvolverClave(await claveDePin('482917', sal, RAPIDO), envuelta)).rejects.toBeTruthy();
  });

  it('el sobre cambia cada vez (IV aleatorio) y no contiene el texto plano', async () => {
    const k = await nuevaClaveDeDatos();
    const a = await cifrarTexto(k, 'secreto');
    const b = await cifrarTexto(k, 'secreto');
    expect(a.ct).not.toBe(b.ct);
    expect(JSON.stringify(a)).not.toContain('secreto');
  });

  it('un sobre alterado no se descifra', async () => {
    const k = await nuevaClaveDeDatos();
    const s = await cifrarTexto(k, 'secreto');
    const roto = { ...s, ct: s.ct.slice(0, -4) + 'AAAA' };
    await expect(descifrarTexto(k, roto)).rejects.toBeTruthy();
  });

  it('la clave de biometría también envuelve la misma clave de datos', async () => {
    const k = await nuevaClaveDeDatos();
    const token = await cifrarTexto(k, 'otro-token');
    const secreto = aleatorios(32);
    const envuelta = await envolverClave(await claveDeSecreto(secreto), k);
    const k2 = await desenvolverClave(await claveDeSecreto(secreto), envuelta);
    expect(await descifrarTexto(k2, token)).toBe('otro-token');
    await expect(desenvolverClave(await claveDeSecreto(aleatorios(32)), envuelta)).rejects.toBeTruthy();
  });

  it('valida el PIN de seis dígitos y rechaza los obvios', () => {
    expect(pinValido('123456')).toBe(true);
    expect(pinValido('12345')).toBe(false);
    expect(pinValido('1234567')).toBe(false);
    expect(pinValido('12345a')).toBe(false);
    expect(pinDebil('111111')).toBe(true);
    expect(pinDebil('123456')).toBe(true);
    expect(pinDebil('654321')).toBe(true);
    expect(pinDebil('482916')).toBe(false);
  });
});
