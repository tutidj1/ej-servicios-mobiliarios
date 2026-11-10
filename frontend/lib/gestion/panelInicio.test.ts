import { describe, expect, it } from 'vitest';
import { avisos, cuando, diasEntre, movimientos, resumenMes, type EventoPanel } from './panelInicio';

const HOY = '2026-11-10';

const ev = (p: Partial<EventoPanel> & { id: string }): EventoPanel => ({
  cliente: 'Ana', lugar: null, estado: 'confirmado',
  fecha_evento: '2026-11-15', fecha_entrega: '2026-11-15', fecha_devolucion: '2026-11-16',
  total: 100000, cobrado: 0, ...p,
});

describe('días entre fechas', () => {
  it('cuenta bien, también cruzando meses y años', () => {
    expect(diasEntre('2026-11-10', '2026-11-10')).toBe(0);
    expect(diasEntre('2026-11-10', '2026-11-12')).toBe(2);
    expect(diasEntre('2026-11-12', '2026-11-10')).toBe(-2);
    expect(diasEntre('2026-10-30', '2026-11-02')).toBe(3);
    expect(diasEntre('2026-12-30', '2027-01-02')).toBe(3);
  });
});

describe('entregas y devoluciones de la semana', () => {
  it('lista lo que toca, ordenado por día', () => {
    const r = movimientos([
      ev({ id: 'a', cliente: 'Ana', fecha_entrega: '2026-11-12', fecha_devolucion: '2026-11-13' }),
      ev({ id: 'b', cliente: 'Beto', fecha_entrega: '2026-11-10', fecha_devolucion: '2026-11-11' }),
    ], HOY);
    expect(r.map((m) => `${m.dia} ${m.tipo} ${m.cliente}`)).toEqual([
      '2026-11-10 entrega Beto', '2026-11-11 devolucion Beto',
      '2026-11-12 entrega Ana', '2026-11-13 devolucion Ana',
    ]);
  });

  it('un presupuesto no se mueve; un entregado ya no se vuelve a entregar', () => {
    const r = movimientos([
      ev({ id: 'p', estado: 'presupuesto', fecha_entrega: '2026-11-11', fecha_devolucion: '2026-11-12' }),
      ev({ id: 'e', estado: 'entregado', fecha_entrega: '2026-11-11', fecha_devolucion: '2026-11-12' }),
    ], HOY);
    expect(r.map((m) => `${m.eventoId}:${m.tipo}`)).toEqual(['e:devolucion']);
  });

  it('no mira más allá de los días pedidos ni hacia atrás', () => {
    const lejos = ev({ id: 'x', fecha_entrega: '2026-11-25', fecha_devolucion: '2026-11-26' });
    const pasado = ev({ id: 'y', fecha_entrega: '2026-11-01', fecha_devolucion: '2026-11-02' });
    expect(movimientos([lejos, pasado], HOY)).toHaveLength(0);
    expect(movimientos([lejos], HOY, 30)).toHaveLength(2);
  });
});

describe('avisos de lo que se está pasando', () => {
  it('devolución atrasada: el evento sigue entregado y la fecha ya pasó', () => {
    const r = avisos([ev({ id: 'a', estado: 'entregado', fecha_devolucion: '2026-11-07', total: 0 })], HOY);
    expect(r).toEqual([{ tipo: 'devolucion_atrasada', eventoId: 'a', cliente: 'Ana', dias: 3 }]);
  });

  it('por cobrar: el evento terminó y falta plata', () => {
    const r = avisos([ev({ id: 'a', estado: 'devuelto', fecha_devolucion: '2026-11-05', total: 100000, cobrado: 40000 })], HOY);
    expect(r).toEqual([{ tipo: 'por_cobrar', eventoId: 'a', cliente: 'Ana', dias: 5, monto: 60000 }]);
  });

  it('si está todo cobrado (o de más) no avisa', () => {
    const base = { id: 'a', estado: 'devuelto' as const, fecha_devolucion: '2026-11-05', total: 100000 };
    expect(avisos([ev({ ...base, cobrado: 100000 })], HOY)).toEqual([]);
    expect(avisos([ev({ ...base, cobrado: 120000 })], HOY)).toEqual([]);
  });

  it('un evento confirmado sin precio avisa; un presupuesto no', () => {
    expect(avisos([ev({ id: 'a', total: 0 })], HOY)).toEqual([{ tipo: 'sin_precio', eventoId: 'a', cliente: 'Ana', dias: 5 }]);
    expect(avisos([ev({ id: 'b', estado: 'presupuesto', total: 0 })], HOY)).toEqual([]);
  });

  it('los cancelados no avisan nada', () => {
    expect(avisos([ev({ id: 'a', estado: 'cancelado', fecha_devolucion: '2026-11-01', total: 100000, cobrado: 0 })], HOY)).toEqual([]);
  });

  it('un evento futuro todavía no se cobra', () => {
    expect(avisos([ev({ id: 'a', fecha_devolucion: '2026-11-20', total: 100000, cobrado: 0 })], HOY)).toEqual([]);
  });

  it('primero lo atrasado de devolución, después lo que falta cobrar, y lo más viejo arriba', () => {
    const r = avisos([
      ev({ id: 'c', cliente: 'Caro', estado: 'devuelto', fecha_devolucion: '2026-11-09', total: 50000, cobrado: 0 }),
      ev({ id: 'd', cliente: 'Dani', estado: 'devuelto', fecha_devolucion: '2026-11-01', total: 50000, cobrado: 0 }),
      ev({ id: 'e', cliente: 'Eli', estado: 'entregado', fecha_devolucion: '2026-11-08', total: 0 }),
    ], HOY);
    expect(r.map((a) => `${a.tipo}:${a.cliente}`)).toEqual(['devolucion_atrasada:Eli', 'por_cobrar:Dani', 'por_cobrar:Caro']);
  });

  it('un mismo evento puede estar atrasado y además deber plata', () => {
    const r = avisos([ev({ id: 'a', estado: 'entregado', fecha_devolucion: '2026-11-08', total: 100000, cobrado: 10000 })], HOY);
    expect(r.map((a) => a.tipo)).toEqual(['devolucion_atrasada', 'por_cobrar']);
  });
});

describe('cómo viene el mes', () => {
  it('suma lo del mes, lo cobrado y lo que falta', () => {
    const r = resumenMes([
      ev({ id: 'a', fecha_evento: '2026-11-05', total: 100000, cobrado: 100000 }),
      ev({ id: 'b', fecha_evento: '2026-11-20', total: 80000, cobrado: 30000 }),
      ev({ id: 'c', fecha_evento: '2026-12-02', total: 500000, cobrado: 0 }),
    ], HOY);
    expect(r).toEqual({ eventos: 2, total: 180000, cobrado: 130000, porCobrar: 50000 });
  });

  it('no cuenta cancelados ni presupuestos, y lo pagado de más no infla lo cobrado', () => {
    const r = resumenMes([
      ev({ id: 'a', fecha_evento: '2026-11-05', estado: 'cancelado', total: 100000 }),
      ev({ id: 'b', fecha_evento: '2026-11-06', estado: 'presupuesto', total: 100000 }),
      ev({ id: 'c', fecha_evento: '2026-11-07', total: 50000, cobrado: 70000 }),
    ], HOY);
    expect(r).toEqual({ eventos: 1, total: 50000, cobrado: 50000, porCobrar: 0 });
  });

  it('un mes sin eventos da todo en cero', () => {
    expect(resumenMes([], HOY)).toEqual({ eventos: 0, total: 0, cobrado: 0, porCobrar: 0 });
  });
});

describe('cómo se lee la fecha', () => {
  it('hoy, mañana y el resto con fecha', () => {
    expect(cuando('2026-11-10', HOY)).toBe('Hoy');
    expect(cuando('2026-11-11', HOY)).toBe('Mañana');
    expect(cuando('2026-11-14', HOY)).toBe('14/11/2026');
  });
});
