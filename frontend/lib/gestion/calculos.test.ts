import { describe, expect, it } from 'vitest';
import {
  aCentavos,
  aporteLinea,
  diasDelRango,
  faltantesParaDocumento,
  rangosSeCruzan,
  repartirCantidad,
  resultadoEvento,
  sugerirCantidad,
} from './calculos';

describe('ejemplo de la especificación: 150 personas, 100 sillas propias', () => {
  const reparto = repartirCantidad(150, 100);
  const linea = {
    cantidad_total: 150,
    cantidad_subalquilada: reparto.subalquilada,
    precio_unitario: 1000,
    costo_subalquiler_unitario: 1000,
  };

  it('usa 100 propias y subalquila 50', () => {
    expect(reparto).toEqual({ propia: 100, subalquilada: 50 });
  });

  it('cobra $150.000, paga $50.000 y aporta $100.000', () => {
    const a = aporteLinea(linea);
    expect(a.ingreso).toBe(aCentavos(150000));
    expect(a.costoSubalquiler).toBe(aCentavos(50000));
    expect(a.aporte).toBe(aCentavos(100000));
  });

  it('la ganancia del evento es $100.000 si no hay otros costos', () => {
    const r = resultadoEvento({ lineas: [linea], fleteCobrado: 0, costos: [], pagos: [] });
    expect(r.ganancia).toBe(aCentavos(100000));
    expect(r.margen).toBeCloseTo(100000 / 150000);
  });
});

describe('resultadoEvento', () => {
  it('suma flete cobrado y resta flete pagado y otros costos', () => {
    const r = resultadoEvento({
      lineas: [{ cantidad_total: 10, cantidad_subalquilada: 0, precio_unitario: '500.50', costo_subalquiler_unitario: null }],
      fleteCobrado: '20000',
      costos: [
        { tipo: 'flete', monto: 15000 },
        { tipo: 'flete', monto: 15000 },
        { tipo: 'lavado', monto: '3000.25' },
      ],
      pagos: [{ monto: 10000 }],
    });
    expect(r.ingresos).toBe(500500 + 2000000);
    expect(r.fletePagado).toBe(3000000);
    expect(r.otrosCostos).toBe(300025);
    expect(r.ganancia).toBe(2500500 - 3000000 - 300025);
    expect(r.saldo).toBe(2500500 - 1000000);
    expect(r.estadoCobro).toBe('señado');
  });

  it('no arrastra errores de coma flotante', () => {
    const r = resultadoEvento({
      lineas: [{ cantidad_total: 3, cantidad_subalquilada: 0, precio_unitario: 0.1, costo_subalquiler_unitario: null }],
      fleteCobrado: 0.2,
      costos: [],
      pagos: [{ monto: 0.5 }],
    });
    expect(r.ingresos).toBe(50);
    expect(r.saldo).toBe(0);
    expect(r.estadoCobro).toBe('pagado');
  });

  it('sin ingresos el margen es null', () => {
    expect(resultadoEvento({ lineas: [], fleteCobrado: null, costos: [], pagos: [] }).margen).toBeNull();
  });
});

describe('repartirCantidad', () => {
  it('si alcanza el stock no subalquila', () => {
    expect(repartirCantidad(80, 100)).toEqual({ propia: 80, subalquilada: 0 });
  });
  it('con stock negativo (sobreventa) subalquila todo', () => {
    expect(repartirCantidad(30, -10)).toEqual({ propia: 0, subalquilada: 30 });
  });
});

describe('faltantesParaDocumento', () => {
  it('bloquea si una línea con cantidad no tiene precio', () => {
    const f = faltantesParaDocumento({
      nombreLocatario: 'Ana',
      fechaEvento: '2026-11-21',
      fechaDevolucion: '2026-11-22',
      lineas: [
        { nombre: 'Sillas', cantidad_total: 10, cantidad_subalquilada: 0, precio_unitario: null, costo_subalquiler_unitario: null },
        { nombre: 'Frapera', cantidad_total: 0, cantidad_subalquilada: 0, precio_unitario: null, costo_subalquiler_unitario: null },
      ],
    });
    expect(f).toEqual(['Falta el precio de Sillas.']);
  });
  it('pide nombre y fechas', () => {
    expect(faltantesParaDocumento({ nombreLocatario: ' ', fechaEvento: '', fechaDevolucion: null, lineas: [] })).toHaveLength(3);
  });
});

describe('fechas de alquiler', () => {
  it('el rango incluye entrega y devolución', () => {
    expect(diasDelRango('2026-11-20', '2026-11-22')).toEqual(['2026-11-20', '2026-11-21', '2026-11-22']);
  });
  it('cruza bien el fin de mes', () => {
    expect(diasDelRango('2026-11-30', '2026-12-01')).toEqual(['2026-11-30', '2026-12-01']);
  });
  it('detecta eventos que se pisan aunque sea un día', () => {
    expect(rangosSeCruzan({ desde: '2026-11-20', hasta: '2026-11-22' }, { desde: '2026-11-22', hasta: '2026-11-23' })).toBe(true);
    expect(rangosSeCruzan({ desde: '2026-11-20', hasta: '2026-11-21' }, { desde: '2026-11-22', hasta: '2026-11-23' })).toBe(false);
  });
});

describe('asistente de cantidades', () => {
  it('sillas = personas, tablones = ceil(personas / 10)', () => {
    expect(sugerirCantidad('personas', 150, 10)).toBe(150);
    expect(sugerirCantidad('mesas', 151, 10)).toBe(16);
    expect(sugerirCantidad('ninguna', 150, 10)).toBeNull();
  });
});
