/**
 * Tests del mensaje de WhatsApp y de las reglas de validación (usa el código real, no una copia).
 * Ejecutar: npx tsx test-whatsapp-suite.ts
 */
import assert from 'node:assert/strict';
import { generarMensajeWhatsapp, formatearFecha } from './lib/services/whatsappService';
import { cotizacionApiSchema, hoyArgentina } from './lib/validators/cotizacionValidator';
import { calcularMesesPromo, listaEnEspanol } from './lib/promo';
import { telefonoParaWhatsapp, linkWhatsappCliente } from './lib/phone';

let ok = 0;
function test(nombre: string, fn: () => void) {
  try {
    fn();
    ok++;
    console.log(`✅ ${nombre}`);
  } catch (e) {
    console.error(`❌ ${nombre}\n   ${(e as Error).message}`);
    process.exitCode = 1;
  }
}

const base = {
  nombre: 'Juan Pérez',
  telefono: '3425068365',
  fechaEvento: '2026-11-14',
  tipoEvento: 'Cumpleaños de 15',
  cantidadInvitados: 250,
  ubicacion: 'Calle 123, Santa Fe',
  items: [
    { nombre: 'Sillas de plástico reforzado', categoria: 'Mobiliario', cantidadSegunInvitados: true },
    { nombre: 'Tablones de madera', categoria: 'Mobiliario' },
    { nombre: 'Plato principal', categoria: 'Vajilla' },
    { nombre: 'Copa de champagne', categoria: 'Cristalería', etiqueta: 'Copa flauta' },
  ],
  mensaje: 'Es en un *salón* con _jardín_',
  codigo: 'A1B2C3',
};

test('el mensaje agrupa por categoría y muestra todos los datos', () => {
  const m = generarMensajeWhatsapp(base);
  assert.match(m, /🪑 \*Mobiliario\*\n• Sillas de plástico reforzado \(250\)\n• Tablones de madera/);
  assert.match(m, /🍽️ \*Vajilla\*\n• Plato principal/);
  assert.match(m, /• Copa flauta/);
  assert.match(m, /👥 250 invitados/);
  assert.match(m, /📞 3425068365/);
  assert.match(m, /Cotización #A1B2C3/);
});

test('no hay límite de invitados: 5000 se muestra completo', () => {
  assert.match(generarMensajeWhatsapp({ ...base, cantidadInvitados: 5000 }), /👥 5000 invitados/);
});

test('los caracteres de formato del cliente no rompen el mensaje', () => {
  const m = generarMensajeWhatsapp(base);
  assert.match(m, /Es en un salón con jardín/);
});

test('sin comentarios no aparece la sección', () => {
  assert.doesNotMatch(generarMensajeWhatsapp({ ...base, mensaje: '' }), /COMENTARIOS/);
});

test('la fecha incluye el día de la semana', () => {
  assert.equal(formatearFecha('2026-11-14'), 'sábado 14/11/2026');
});

test('el mensaje se puede codificar para la URL sin perder letras', () => {
  const m = generarMensajeWhatsapp(base);
  assert.equal(decodeURIComponent(encodeURIComponent(m)), m);
});

test('validación: acepta una cotización correcta sin tope de invitados', () => {
  const r = cotizacionApiSchema.safeParse({
    nombre: 'Ana', fechaEvento: hoyArgentina(), tipoEvento: 'Casamiento', cantidadInvitados: 800,
    direccion: 'Calle 1', numero: '+54 342 506-8365', items: ['Sillas de plástico reforzado'],
  });
  assert.equal(r.success, true);
});

test('validación: rechaza teléfono corto, fecha pasada e items vacíos', () => {
  const r = cotizacionApiSchema.safeParse({
    nombre: 'Ana', fechaEvento: '2020-01-01', tipoEvento: 'Casamiento', cantidadInvitados: 10,
    direccion: 'Calle 1', numero: '123', items: [],
  });
  assert.equal(r.success, false);
  if (!r.success) {
    const campos = r.error.issues.map((i) => i.path[0]);
    assert.ok(campos.includes('fechaEvento') && campos.includes('numero') && campos.includes('items'));
  }
});

test('promo: calcula mes actual y meses vigentes solos (incluye cambio de año)', () => {
  const p = calcularMesesPromo(3, new Date('2026-11-15T12:00:00Z'));
  assert.equal(p.mesActual, 'noviembre');
  assert.deepEqual(p.mesesVigentes, ['noviembre', 'diciembre', 'enero']);
  assert.equal(listaEnEspanol(p.mesesVigentes), 'noviembre, diciembre y enero');
});

test('promo: usa la hora de Argentina en el cambio de mes', () => {
  // 1/10 02:00 UTC todavía es 30/9 en Argentina
  assert.equal(calcularMesesPromo(1, new Date('2026-10-01T02:00:00Z')).mesActual, 'septiembre');
});

test('teléfono: arma el número internacional para wa.me', () => {
  assert.equal(telefonoParaWhatsapp('342 506 8365'), '5493425068365');
  assert.equal(telefonoParaWhatsapp('+54 9 342 506 8365'), '5493425068365');
});

console.log(`\n${ok} tests OK`);

test('teléfono: acepta 0, 15, +54 y paréntesis (WhatsApp al cliente)', () => {
  for (const n of ['3425068365', '0342 506 8365', '342 15 506 8365', '(0342) 15-5068365', '+54 9 342 506 8365', '543425068365', '5493425068365']) {
    assert.equal(telefonoParaWhatsapp(n), '5493425068365', n);
  }
});

test('link al cliente: saluda por nombre y trae el código', () => {
  const url = linkWhatsappCliente('342 506 8365', 'Ana Pérez', 'AB12CD');
  assert.ok(url.startsWith('https://wa.me/5493425068365?text='));
  assert.match(decodeURIComponent(url), /Hola Ana Pérez! .*#AB12CD/);
});
