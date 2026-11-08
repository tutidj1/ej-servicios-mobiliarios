/**
 * TEST DE PRIVACIDAD DE EJ CASA — la pieza más importante del proyecto.
 *
 * Corre contra el proyecto Supabase CASA (nunca contra el de EJ). Prueba, con usuarios reales de
 * Auth y con sus propios tokens, que:
 *   - el usuario A no puede leer, cambiar, borrar ni insertar a nombre de B en gastos, ingresos,
 *     deudas, inversiones (ni en sus tablas hijas), ni por supabase-js ni por la API REST cruda;
 *   - anon no ve nada de nada;
 *   - el administrador técnico no tiene camino a los datos privados de nadie;
 *   - lo compartido se ve solo dentro del hogar, y lo administrativo lo modifica solo quien corresponde;
 *   - la estructura de la base (RLS forzado, una política por tabla, sin permisos para anon, montos
 *     en enteros) no se aflojó.
 * Si alguien afloja una política, un permiso o un tipo de columna, este test se pone en rojo.
 *
 * La clave de servicio se usa SOLO para armar y limpiar los datos de prueba.
 */
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cargarEntorno } from './entorno';

const cfg = cargarEntorno();
const MARCA = 'test-privacidad';
const DOMINIO = 'privacidad.casa.test';

const PRIVADAS = ['gastos', 'ingresos', 'deudas', 'deuda_pagos', 'inversiones', 'inversion_movimientos', 'reglas_categoria'] as const;
const TODAS = [
  'hogar', 'personas', 'hijos', 'categorias', 'gastos', 'ingresos', 'obligaciones', 'obligacion_instancias',
  'deudas', 'deuda_pagos', 'objetivos', 'objetivo_movimientos', 'inversiones', 'inversion_movimientos',
  'ipc', 'reglas_categoria', 'auditoria',
] as const;

type Persona = { id: string; email: string; password: string; cliente: SupabaseClient; token: string };

const sinSesion = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const servicio = createClient(cfg.url, cfg.servicio, sinSesion);
const anon = createClient(cfg.url, cfg.anon, sinSesion);

let hogar1 = '';
let hogar2 = '';
let A: Persona, B: Persona, C: Persona, D: Persona; // A y B adultos del hogar 1 (A con objetivos), C admin técnico, D de otro hogar
let categoria = '';
const ids: Record<string, Record<'A' | 'B', string>> = {};
const hoy = new Date().toISOString().slice(0, 10);
const mes = hoy.slice(0, 8) + '01';

async function crearPersona(nombre: string, hogar: string, rol: string, objetivos = false): Promise<Persona> {
  const email = `${MARCA}-${nombre}-${randomUUID().slice(0, 8)}@${DOMINIO}`;
  const password = randomUUID() + randomUUID();
  const { data, error } = await servicio.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error('No se pudo crear usuario de prueba: ' + error?.message);
  const ins = await servicio.from('personas').insert({ id: data.user.id, hogar_id: hogar, nombre: `${MARCA}-${nombre}`, rol, acceso_objetivos: objetivos });
  if (ins.error) throw new Error('personas: ' + ins.error.message);
  const cliente = createClient(cfg.url, cfg.anon, sinSesion);
  const s = await cliente.auth.signInWithPassword({ email, password });
  if (s.error || !s.data.session) throw new Error('No se pudo iniciar sesión de prueba: ' + s.error?.message);
  return { id: data.user.id, email, password, cliente, token: s.data.session.access_token };
}

async function limpiar() {
  // Usuarios de pruebas anteriores (borrar el usuario borra su persona y todo lo suyo en cascada)
  for (let pagina = 1; pagina < 20; pagina++) {
    const { data } = await servicio.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (!data?.users.length) break;
    for (const u of data.users) {
      if (u.email?.endsWith('@' + DOMINIO)) await servicio.auth.admin.deleteUser(u.id);
    }
    if (data.users.length < 200) break;
  }
  const { data: hogares } = await servicio.from('hogar').select('id').like('nombre', `${MARCA}%`);
  for (const h of hogares ?? []) {
    await servicio.from('obligaciones').delete().eq('hogar_id', h.id);
    await servicio.from('objetivos').delete().eq('hogar_id', h.id);
    await servicio.from('hijos').delete().eq('hogar_id', h.id);
    await servicio.from('hogar').delete().eq('id', h.id);
  }
  await servicio.from('auditoria').delete().eq('accion', MARCA);
  await servicio.from('ipc').delete().eq('mes', '1999-01-01');
}

async function ok<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>, etiqueta: string): Promise<NonNullable<T>> {
  const r = await p;
  if (r.error) throw new Error(`${etiqueta}: ${r.error.message}`);
  return r.data as NonNullable<T>;
}

/** Fila de ejemplo de cada tabla privada para una persona. `dueno` marca el contenido para detectar filtraciones. */
async function sembrarPrivados(quien: 'A' | 'B', p: Persona) {
  const m = `SECRETO-${quien}`;
  const g = await ok(servicio.from('gastos').insert({ persona_id: p.id, monto: quien === 'A' ? 123456700 : 765400, categoria_id: categoria, tipo: 'discrecional', fecha: hoy, descripcion: m, origen: 'manual', mes_ipc: mes }).select('id').single(), 'gastos');
  const i = await ok(servicio.from('ingresos').insert({ persona_id: p.id, monto: 99900000, fecha: hoy, esperado_o_real: 'real' }).select('id').single(), 'ingresos');
  const d = await ok(servicio.from('deudas').insert({ persona_id: p.id, descripcion: m, tipo: 'sin_cronograma', monto_total: 5000000, saldo: 4000000 }).select('id').single(), 'deudas');
  const dp = await ok(servicio.from('deuda_pagos').insert({ deuda_id: d.id, monto: 100000, fecha: hoy, es_minimo: true }).select('id').single(), 'deuda_pagos');
  const inv = await ok(servicio.from('inversiones').insert({ persona_id: p.id, descripcion: m, clase: 'plazo_fijo', moneda: 'ARS', modo_valuacion: 'manual', valor_actual: 7000000, valuado_el: hoy }).select('id').single(), 'inversiones');
  const im = await ok(servicio.from('inversion_movimientos').insert({ inversion_id: inv.id, monto: 1000000, moneda: 'ARS', tipo: 'aporte', motivo: m, fecha: hoy, mes_ipc: mes }).select('id').single(), 'inversion_movimientos');
  const r = await ok(servicio.from('reglas_categoria').insert({ patron: m, categoria_id: categoria, persona_id: p.id }).select('id').single(), 'reglas_categoria');
  const por: Record<string, string> = { gastos: g.id, ingresos: i.id, deudas: d.id, deuda_pagos: dp.id, inversiones: inv.id, inversion_movimientos: im.id, reglas_categoria: r.id };
  for (const t of PRIVADAS) (ids[t] ??= {} as Record<'A' | 'B', string>)[quien] = por[t];
}

let bd: pg.Client;

beforeAll(async () => {
  bd = new pg.Client({ connectionString: cfg.bd, ssl: { rejectUnauthorized: false } });
  await bd.connect();
  await limpiar();

  hogar1 = (await ok(servicio.from('hogar').insert({ nombre: `${MARCA}-1` }).select('id').single(), 'hogar1')).id;
  hogar2 = (await ok(servicio.from('hogar').insert({ nombre: `${MARCA}-2` }).select('id').single(), 'hogar2')).id;
  A = await crearPersona('a', hogar1, 'adulto', true);
  B = await crearPersona('b', hogar1, 'adulto', false);
  C = await crearPersona('c-admin', hogar1, 'admin_tecnico', false);
  D = await crearPersona('d-otro-hogar', hogar2, 'adulto', true);

  categoria = (await ok(servicio.from('categorias').select('id').limit(1).single(), 'categorias')).id;
  await sembrarPrivados('A', A);
  await sembrarPrivados('B', B);

  // Compartido y administración, en el hogar 1
  const ob = await ok(servicio.from('obligaciones').insert({ hogar_id: hogar1, concepto: `${MARCA}-luz`, monto_estimado: 8500000, dia_vencimiento: 10, recurrencia: 'mensual', responsable_id: A.id }).select('id').single(), 'obligaciones');
  ids.obligacion = { A: ob.id, B: ob.id };
  await ok(servicio.from('obligacion_instancias').insert({ obligacion_id: ob.id, periodo: mes, estado: 'pendiente' }).select('id').single(), 'instancias');
  const obj = await ok(servicio.from('objetivos').insert({ hogar_id: hogar1, nombre: `${MARCA}-colchon`, meta: 100000, moneda: 'USD', multiplo_piso: 1 }).select('id').single(), 'objetivos');
  ids.objetivo = { A: obj.id, B: obj.id };
  await ok(servicio.from('objetivo_movimientos').insert({ objetivo_id: obj.id, monto: 5000, moneda: 'USD', tc_del_dia: 140000, tipo: 'aporte', fecha: hoy }).select('id').single(), 'objetivo_movimientos');
  await ok(servicio.from('auditoria').insert({ actor_id: A.id, accion: MARCA, tabla: 'gastos' }).select('id').single(), 'auditoria');
}, 120_000);

afterAll(async () => {
  try { await limpiar(); } finally { await bd?.end().catch(() => {}); }
}, 120_000);

/** Pide la tabla por la API REST cruda con un token (o sin token) */
async function rest(tabla: string, token?: string, query = 'select=*') {
  const r = await fetch(`${cfg.url}/rest/v1/${tabla}?${query}`, {
    headers: { apikey: cfg.anon, Authorization: `Bearer ${token ?? cfg.anon}` },
  });
  const cuerpo = await r.json().catch(() => null);
  return { status: r.status, filas: Array.isArray(cuerpo) ? cuerpo : [], cuerpo };
}

describe('Control: el test está bien armado (si esto falla, los "no veo nada" de abajo no prueban nada)', () => {
  it('cada dueño ve sus propias filas privadas', async () => {
    for (const t of PRIVADAS) {
      const a = await ok(A.cliente.from(t).select('id'), `A lee ${t}`);
      const b = await ok(B.cliente.from(t).select('id'), `B lee ${t}`);
      expect(a.map((f: { id: string }) => f.id), `A debería ver lo suyo en ${t}`).toContain(ids[t].A);
      expect(b.map((f: { id: string }) => f.id), `B debería ver lo suyo en ${t}`).toContain(ids[t].B);
    }
  });

  it('A puede escribir lo suyo con su propio token', async () => {
    const r = await A.cliente.from('gastos').insert({ persona_id: A.id, monto: 1500000, categoria_id: categoria, tipo: 'variable_necesario', fecha: hoy, origen: 'manual', descripcion: 'control' }).select('id, mes_ipc').single();
    expect(r.error).toBeNull();
    expect(r.data?.mes_ipc).toBe(mes); // el mes de IPC se completa solo
  });
});

describe('Privado: B no puede leer nada de A (ni A de B)', () => {
  for (const t of PRIVADAS) {
    it(`${t}: supabase-js con el token de B no devuelve ninguna fila de A`, async () => {
      const filas = await ok(B.cliente.from(t).select('*'), t);
      expect(filas.map((f: { id: string }) => f.id)).not.toContain(ids[t].A);
      expect(JSON.stringify(filas)).not.toContain('SECRETO-A');
      const directo = await B.cliente.from(t).select('*').eq('id', ids[t].A);
      expect(directo.data ?? []).toHaveLength(0);
    });

    it(`${t}: la API REST cruda con el token de B no devuelve ninguna fila de A`, async () => {
      const r = await rest(t, B.token);
      expect(r.status).toBe(200);
      expect(r.filas.map((f: { id: string }) => f.id)).not.toContain(ids[t].A);
      expect(JSON.stringify(r.cuerpo)).not.toContain('SECRETO-A');
      const pedida = await rest(t, B.token, `select=*&id=eq.${ids[t].A}`);
      expect(pedida.filas).toHaveLength(0);
    });

    it(`${t}: A tampoco ve nada de B`, async () => {
      const filas = await ok(A.cliente.from(t).select('*'), t);
      expect(filas.map((f: { id: string }) => f.id)).not.toContain(ids[t].B);
      expect(JSON.stringify(filas)).not.toContain('SECRETO-B');
    });
  }

  it('los totales (agregados) tampoco filtran: B no cuenta filas de A', async () => {
    for (const t of PRIVADAS) {
      const { count } = await B.cliente.from(t).select('*', { count: 'exact', head: true });
      const { count: mias } = await B.cliente.from(t).select('*', { count: 'exact', head: true }).eq('id', ids[t].B);
      expect(count, `${t}: B solo debe contar lo suyo`).toBe(mias);
    }
  });
});

describe('Privado: B no puede modificar, borrar ni insertar a nombre de A', () => {
  it('update y delete ajenos no afectan ninguna fila', async () => {
    const cambios: Record<string, Record<string, unknown>> = {
      gastos: { descripcion: 'HACKEADO' },
      ingresos: { monto: 1 },
      deudas: { descripcion: 'HACKEADO' },
      deuda_pagos: { monto: 1 },
      inversiones: { descripcion: 'HACKEADO' },
      inversion_movimientos: { motivo: 'HACKEADO' },
      reglas_categoria: { patron: 'HACKEADO' },
    };
    for (const t of PRIVADAS) {
      const up = await B.cliente.from(t).update(cambios[t]).eq('id', ids[t].A).select();
      expect(up.data ?? [], `${t}: update ajeno`).toHaveLength(0);
      const del = await B.cliente.from(t).delete().eq('id', ids[t].A).select();
      expect(del.data ?? [], `${t}: delete ajeno`).toHaveLength(0);
      // y la fila de A sigue intacta (verificado con la clave de servicio, solo para el test)
      const queda = await ok(servicio.from(t).select('*').eq('id', ids[t].A).single(), `${t} intacta`);
      expect(JSON.stringify(queda)).not.toContain('HACKEADO');
    }
  });

  it('B no puede mover una fila propia hacia A (cambiar persona_id)', async () => {
    const r = await B.cliente.from('gastos').update({ persona_id: A.id }).eq('id', ids.gastos.B).select();
    expect(r.error ?? (r.data?.length ? null : 'sin filas')).toBeTruthy();
    const queda = await ok(servicio.from('gastos').select('persona_id').eq('id', ids.gastos.B).single(), 'gasto de B');
    expect(queda.persona_id).toBe(B.id);
  });

  it('B no puede insertar filas a nombre de A', async () => {
    const intentos: Array<[string, Record<string, unknown>]> = [
      ['gastos', { persona_id: A.id, monto: 100, categoria_id: categoria, tipo: 'discrecional', fecha: hoy, origen: 'manual' }],
      ['ingresos', { persona_id: A.id, monto: 100, fecha: hoy, esperado_o_real: 'real' }],
      ['deudas', { persona_id: A.id, descripcion: 'x', tipo: 'sin_cronograma', monto_total: 1, saldo: 1 }],
      ['deuda_pagos', { deuda_id: ids.deudas.A, monto: 100, fecha: hoy }],
      ['inversiones', { persona_id: A.id, descripcion: 'x', clase: 'otro', moneda: 'ARS', modo_valuacion: 'manual' }],
      ['inversion_movimientos', { inversion_id: ids.inversiones.A, monto: 100, moneda: 'ARS', tipo: 'aporte', fecha: hoy, mes_ipc: mes }],
      ['reglas_categoria', { persona_id: A.id, patron: 'x', categoria_id: categoria }],
    ];
    for (const [t, fila] of intentos) {
      const r = await B.cliente.from(t).insert(fila).select();
      expect(r.error, `${t}: insertar a nombre de otro debe fallar`).not.toBeNull();
      expect(r.data ?? []).toHaveLength(0);
    }
  });
});

describe('anon (sin sesión) no ve ni toca nada', () => {
  for (const t of TODAS) {
    it(`${t}: sin token no hay filas`, async () => {
      const r = await anon.from(t).select('*');
      expect(r.data ?? []).toHaveLength(0);
      const cruda = await rest(t);
      expect(cruda.filas).toHaveLength(0);
    });
  }

  it('anon no puede insertar', async () => {
    const r = await anon.from('gastos').insert({ persona_id: A.id, monto: 100, categoria_id: categoria, tipo: 'discrecional', fecha: hoy, origen: 'manual' });
    expect(r.error).not.toBeNull();
  });
});

describe('Administración: el admin técnico no tiene camino a lo privado', () => {
  for (const t of PRIVADAS) {
    it(`${t}: C (admin técnico) no ve filas de A ni de B`, async () => {
      const filas = await ok(C.cliente.from(t).select('*'), t);
      const vistos = filas.map((f: { id: string }) => f.id);
      expect(vistos).not.toContain(ids[t].A);
      expect(vistos).not.toContain(ids[t].B);
      const r = await rest(t, C.token);
      expect(r.filas.map((f: { id: string }) => f.id)).not.toContain(ids[t].A);
    });
  }

  it('C no puede cambiarse a sí mismo para leer lo de otros: no hay política que dependa del rol', async () => {
    const { rows } = await bd.query(
      `select tablename, policyname, qual, with_check from pg_policies
       where schemaname = 'public' and tablename = any($1)`, [PRIVADAS]);
    for (const p of rows) {
      expect(`${p.qual} ${p.with_check}`, `${p.tablename}.${p.policyname}`).not.toMatch(/admin|rol|acceso_objetivos/i);
    }
  });

  it('solo el admin técnico modifica categorías e IPC; los demás solo leen', async () => {
    const lecturaB = await ok(B.cliente.from('categorias').select('id'), 'B lee categorias');
    expect(lecturaB.length).toBeGreaterThanOrEqual(9);

    const del = await B.cliente.from('categorias').delete().eq('id', categoria).select();
    expect(del.data ?? []).toHaveLength(0);
    const upd = await B.cliente.from('categorias').update({ nombre: 'HACKEADO' }).eq('id', categoria).select();
    expect(upd.data ?? []).toHaveLength(0);
    const ins = await B.cliente.from('categorias').insert({ nombre: `${MARCA}-intruso`, tipo_defecto: 'discrecional' });
    expect(ins.error).not.toBeNull();
    const insIpc = await B.cliente.from('ipc').insert({ mes: '1999-01-01', indice: 100 });
    expect(insIpc.error).not.toBeNull();

    const okIpc = await C.cliente.from('ipc').insert({ mes: '1999-01-01', indice: 100 }).select();
    expect(okIpc.error).toBeNull();
    const delIpcB = await B.cliente.from('ipc').delete().eq('mes', '1999-01-01').select();
    expect(delIpcB.data ?? []).toHaveLength(0);
    const delIpcC = await C.cliente.from('ipc').delete().eq('mes', '1999-01-01').select();
    expect(delIpcC.data ?? []).toHaveLength(1);
  });

  it('un adulto no puede ascenderse a admin técnico ni darse acceso a objetivos', async () => {
    const r1 = await B.cliente.from('personas').update({ rol: 'admin_tecnico' }).eq('id', B.id).select();
    expect(r1.error ?? (r1.data?.length ? null : 'sin filas')).toBeTruthy();
    const r2 = await B.cliente.from('personas').update({ acceso_objetivos: true }).eq('id', B.id).select();
    expect(r2.error ?? (r2.data?.length ? null : 'sin filas')).toBeTruthy();
    const queda = await ok(servicio.from('personas').select('rol, acceso_objetivos').eq('id', B.id).single(), 'B');
    expect(queda).toEqual({ rol: 'adulto', acceso_objetivos: false });
  });

  it('nadie puede cambiarse de hogar ni crear/borrar personas por la API', async () => {
    const mover = await C.cliente.from('personas').update({ hogar_id: hogar2 }).eq('id', B.id).select();
    expect(mover.error ?? (mover.data?.length ? null : 'sin filas')).toBeTruthy();
    const crear = await C.cliente.from('personas').insert({ id: randomUUID(), hogar_id: hogar1, nombre: 'x' });
    expect(crear.error).not.toBeNull();
    const borrar = await C.cliente.from('personas').delete().eq('id', B.id).select();
    expect(borrar.data ?? []).toHaveLength(0);
  });

  it('el admin técnico sí puede ajustar el rol de alguien de su hogar', async () => {
    const r = await C.cliente.from('personas').update({ acceso_objetivos: true }).eq('id', B.id).select();
    expect(r.error).toBeNull();
    expect(r.data).toHaveLength(1);
    await servicio.from('personas').update({ acceso_objetivos: false }).eq('id', B.id);
  });
});

describe('Compartido: solo dentro del hogar', () => {
  it('los adultos del hogar ven las obligaciones y sus instancias', async () => {
    for (const p of [A, B, C]) {
      const o = await ok(p.cliente.from('obligaciones').select('id'), 'obligaciones');
      expect(o.map((f: { id: string }) => f.id)).toContain(ids.obligacion.A);
      const i = await ok(p.cliente.from('obligacion_instancias').select('obligacion_id'), 'instancias');
      expect(i.map((f: { obligacion_id: string }) => f.obligacion_id)).toContain(ids.obligacion.A);
    }
  });

  it('B puede marcar como pagada una instancia del hogar', async () => {
    const r = await B.cliente.from('obligacion_instancias').update({ estado: 'pagado', monto_real: 8700000, pagado_por: B.id, fecha_pago: hoy }).eq('obligacion_id', ids.obligacion.A).select();
    expect(r.error).toBeNull();
    expect(r.data).toHaveLength(1);
  });

  it('una persona de OTRO hogar no ve ni toca nada del hogar 1', async () => {
    for (const t of ['obligaciones', 'obligacion_instancias', 'objetivos', 'objetivo_movimientos', 'hijos', 'personas']) {
      const filas = await ok(D.cliente.from(t).select('*'), t);
      const texto = JSON.stringify(filas);
      expect(texto, t).not.toContain(MARCA + '-luz');
      expect(texto, t).not.toContain(MARCA + '-colchon');
      expect(texto, t).not.toContain(A.id);
      expect(texto, t).not.toContain(B.id);
    }
    const ins = await D.cliente.from('obligaciones').insert({ hogar_id: hogar1, concepto: 'x', monto_estimado: 1, dia_vencimiento: 1, recurrencia: 'mensual' });
    expect(ins.error).not.toBeNull();
    const upd = await D.cliente.from('obligaciones').update({ concepto: 'HACKEADO' }).eq('id', ids.obligacion.A).select();
    expect(upd.data ?? []).toHaveLength(0);
    const insI = await D.cliente.from('obligacion_instancias').insert({ obligacion_id: ids.obligacion.A, periodo: '1999-02-01' });
    expect(insI.error).not.toBeNull();
  });

  it('no se puede asignar como responsable a alguien de otro hogar', async () => {
    const r = await A.cliente.from('obligaciones').insert({ hogar_id: hogar1, concepto: 'x', monto_estimado: 1, dia_vencimiento: 1, recurrencia: 'mensual', responsable_id: D.id });
    expect(r.error).not.toBeNull();
  });
});

describe('Admin EJ: objetivos solo con acceso', () => {
  it('A (con acceso) los ve; B y C (sin acceso) no; D (otro hogar) no', async () => {
    const a = await ok(A.cliente.from('objetivos').select('id'), 'A objetivos');
    expect(a.map((f: { id: string }) => f.id)).toContain(ids.objetivo.A);
    const am = await ok(A.cliente.from('objetivo_movimientos').select('id'), 'A movimientos');
    expect(am.length).toBeGreaterThan(0);
    for (const p of [B, C, D]) {
      expect(await ok(p.cliente.from('objetivos').select('id'), 'objetivos')).toHaveLength(0);
      expect(await ok(p.cliente.from('objetivo_movimientos').select('id'), 'objetivo_movimientos')).toHaveLength(0);
    }
    const ins = await B.cliente.from('objetivos').insert({ hogar_id: hogar1, nombre: 'x', meta: 1, moneda: 'ARS' });
    expect(ins.error).not.toBeNull();
  });
});

describe('Auditoría: la ven todos, nadie escribe desde la API', () => {
  it('B lee el registro; B, C y anon no pueden insertar, cambiar ni borrar', async () => {
    const filas = await ok(B.cliente.from('auditoria').select('accion'), 'auditoria');
    expect(filas.some((f: { accion: string }) => f.accion === MARCA)).toBe(true);
    for (const p of [A, B, C]) {
      expect((await p.cliente.from('auditoria').insert({ actor_id: p.id, accion: 'falsa', tabla: 'gastos' })).error).not.toBeNull();
      expect((await p.cliente.from('auditoria').update({ accion: 'falsa' }).eq('accion', MARCA).select()).error ?? 'bloqueado').toBeTruthy();
      expect((await p.cliente.from('auditoria').delete().eq('accion', MARCA).select()).data ?? []).toHaveLength(0);
    }
    expect((await anon.from('auditoria').insert({ accion: 'falsa', tabla: 'gastos' })).error).not.toBeNull();
    const quedan = await ok(servicio.from('auditoria').select('id').eq('accion', MARCA), 'auditoria intacta');
    expect(quedan).toHaveLength(1);
  });
});

describe('Estructura: nadie aflojó la base', () => {
  it('toda tabla de public tiene RLS activado y forzado, y al menos una política', async () => {
    const { rows } = await bd.query(
      `select c.relname, c.relrowsecurity, c.relforcerowsecurity,
              (select count(*)::int from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as politicas
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind in ('r', 'p')`);
    const nombres = rows.map((r) => r.relname).sort();
    expect(nombres).toEqual([...TODAS].sort()); // una tabla nueva sin revisar rompe este test a propósito
    for (const r of rows) {
      expect(r.relrowsecurity, `${r.relname}: RLS activado`).toBe(true);
      expect(r.relforcerowsecurity, `${r.relname}: RLS forzado`).toBe(true);
      expect(r.politicas, `${r.relname}: tiene política`).toBeGreaterThanOrEqual(1);
    }
  });

  it('las tablas privadas filtran por dueño y ninguna política está abierta (true)', async () => {
    const { rows } = await bd.query(
      `select tablename, policyname, cmd, roles, qual, with_check from pg_policies where schemaname = 'public'`);
    for (const p of rows) {
      const abierta = (x: string | null) => x !== null && /^\(?\s*true\s*\)?$/i.test(x.trim());
      expect(abierta(p.qual), `${p.tablename}.${p.policyname} using abierto`).toBe(false);
      expect(abierta(p.with_check), `${p.tablename}.${p.policyname} with check abierto`).toBe(false);
      expect(String(p.roles).replace(/[{}]/g, ''), `${p.tablename}.${p.policyname} debe ser solo para authenticated`).toBe('authenticated');
      expect(p.qual ?? p.with_check, `${p.tablename}.${p.policyname} sin condición`).toBeTruthy();
    }
    const privadas = rows.filter((p) => (PRIVADAS as readonly string[]).includes(p.tablename));
    expect(privadas.map((p) => p.tablename).sort()).toEqual([...PRIVADAS].sort()); // exactamente una por tabla
    for (const p of privadas) {
      const cond = `${p.qual} ${p.with_check}`;
      expect(cond, `${p.tablename}: debe atarse al usuario que consulta`).toMatch(/auth\.uid\(\)|_es_mia/);
    }
  });

  it('anon no tiene ningún permiso sobre tablas ni funciones de public', async () => {
    const t = await bd.query(
      `select table_name, privilege_type from information_schema.role_table_grants
        where table_schema = 'public' and grantee in ('anon', 'PUBLIC')`);
    expect(t.rows).toEqual([]);
    // rls_auto_enable es el disparador de evento de Supabase (no se puede llamar como función): se ignora
    const f = await bd.query(
      `select rp.routine_name from information_schema.routine_privileges rp
         join pg_proc p on p.proname = rp.routine_name and p.pronamespace = 'public'::regnamespace
        where rp.routine_schema = 'public' and rp.grantee in ('anon', 'PUBLIC') and p.prorettype <> 'event_trigger'::regtype`);
    expect(f.rows).toEqual([]);
  });

  it('los usuarios no pueden escribir en auditoría, ni borrar/crear personas, ni tocar columnas sensibles', async () => {
    const g = await bd.query(
      `select table_name, privilege_type from information_schema.role_table_grants
        where table_schema = 'public' and grantee = 'authenticated'
          and ((table_name = 'auditoria' and privilege_type <> 'SELECT')
            or (table_name = 'personas' and privilege_type not in ('SELECT'))
            or (table_name = 'hogar' and privilege_type <> 'SELECT'))`);
    expect(g.rows).toEqual([]);
    const c = await bd.query(
      `select column_name from information_schema.column_privileges
        where table_schema = 'public' and table_name = 'personas' and grantee = 'authenticated' and privilege_type = 'UPDATE'`);
    expect(c.rows.map((r) => r.column_name).sort()).toEqual(['acceso_objetivos', 'nombre', 'rol']);
  });

  it('el esquema de ayudas (casa_aux) no está expuesto por la API', async () => {
    const r = await fetch(`${cfg.url}/rest/v1/`, { headers: { apikey: cfg.anon, Authorization: `Bearer ${A.token}`, 'Accept-Profile': 'casa_aux' } });
    expect(r.ok).toBe(false);
  });

  it('los montos son enteros de centavos (bigint), nunca flotantes ni decimales', async () => {
    const { rows } = await bd.query(
      `select table_name, column_name, data_type from information_schema.columns
        where table_schema = 'public'
          and (column_name in ('monto', 'monto_real', 'monto_total', 'monto_estimado', 'saldo', 'valor_cuota', 'valor_actual', 'meta', 'tc_del_dia'))`);
    expect(rows.length).toBeGreaterThan(10);
    for (const r of rows) expect(r.data_type, `${r.table_name}.${r.column_name}`).toBe('bigint');
    const flotantes = await bd.query(
      `select table_name, column_name from information_schema.columns
        where table_schema = 'public' and data_type in ('real', 'double precision', 'money')`);
    expect(flotantes.rows).toEqual([]);
  });

  it('un monto fraccionario o negativo es rechazado por la base', async () => {
    const neg = await servicio.from('gastos').insert({ persona_id: A.id, monto: -5, categoria_id: categoria, tipo: 'discrecional', fecha: hoy, origen: 'manual', mes_ipc: mes });
    expect(neg.error).not.toBeNull();
    const frac = await servicio.from('gastos').insert({ persona_id: A.id, monto: 10.5, categoria_id: categoria, tipo: 'discrecional', fecha: hoy, origen: 'manual', mes_ipc: mes });
    expect(frac.error).not.toBeNull();
  });
});
