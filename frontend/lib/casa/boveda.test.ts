import { describe, expect, it } from 'vitest';
import { cambiarPin, crearBoveda, desbloquearConPin, ErrorBoveda, guardarToken, leerBoveda, MAX_FALLOS_PIN, type AlmacenBoveda, type RegistroBoveda } from './boveda';

const RAPIDO = 1000;

function almacenEnMemoria(): AlmacenBoveda & { crudo(): string } {
  let r: RegistroBoveda | null = null;
  return {
    async leer() { return r ? structuredClone(r) : null; },
    async escribir(x) { r = structuredClone(x); },
    async borrar() { r = null; },
    crudo: () => JSON.stringify(r),
  };
}

async function nueva(a: AlmacenBoveda, pin = '482916') {
  return crearBoveda({ personaId: 'persona-1', nombre: 'Prueba', refreshToken: 'rt-1', pin }, a, RAPIDO);
}

describe('bóveda del dispositivo', () => {
  it('guarda el token cifrado: ni el PIN ni el token aparecen en claro', async () => {
    const a = almacenEnMemoria();
    await nueva(a);
    expect(a.crudo()).not.toContain('rt-1');
    expect(a.crudo()).not.toContain('482916');
    expect(a.crudo()).not.toContain('pin_hash');
  });

  it('el PIN correcto devuelve el token y reinicia los fallos', async () => {
    const a = almacenEnMemoria();
    await nueva(a);
    await expect(desbloquearConPin('000001', a)).rejects.toMatchObject({ codigo: 'PIN_INCORRECTO', restantes: MAX_FALLOS_PIN - 1 });
    const abierta = await desbloquearConPin('482916', a);
    expect(abierta.refreshToken).toBe('rt-1');
    expect((await leerBoveda(a))?.fallos).toBe(0);
  });

  it('tras 5 PIN erróneos se borra la bóveda', async () => {
    const a = almacenEnMemoria();
    await nueva(a);
    for (let i = 1; i < MAX_FALLOS_PIN; i++) {
      await expect(desbloquearConPin('111112', a)).rejects.toMatchObject({ codigo: 'PIN_INCORRECTO' });
    }
    await expect(desbloquearConPin('111112', a)).rejects.toMatchObject({ codigo: 'BOVEDA_BORRADA' });
    expect(await leerBoveda(a)).toBeNull();
    await expect(desbloquearConPin('482916', a)).rejects.toBeInstanceOf(ErrorBoveda); // ni con el PIN bueno
  });

  it('el token rotado se vuelve a guardar y se recupera con el mismo PIN', async () => {
    const a = almacenEnMemoria();
    const { claveDatos } = await nueva(a);
    await guardarToken(claveDatos, 'rt-2', a);
    expect((await desbloquearConPin('482916', a)).refreshToken).toBe('rt-2');
  });

  it('cambiar el PIN deja de aceptar el viejo', async () => {
    const a = almacenEnMemoria();
    const { claveDatos } = await nueva(a);
    await cambiarPin(claveDatos, '739204', a, RAPIDO);
    await expect(desbloquearConPin('482916', a)).rejects.toMatchObject({ codigo: 'PIN_INCORRECTO' });
    expect((await desbloquearConPin('739204', a)).refreshToken).toBe('rt-1');
  });
});
