import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { ZodError } from 'zod';
import { cotizacionApiSchema, soloDigitos } from '@/lib/validators/cotizacionValidator';
import { generarUrlWhatsapp, ItemCotizacion } from '@/lib/services/whatsappService';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getProductos } from '@/lib/data';
import { excedeLimite } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 20_000;
const TIEMPO_MINIMO_MS = 2_500; // un humano no completa 3 pasos en menos de esto
const LIMITE_MEMORIA = { maximo: 5, ventanaMs: 10 * 60 * 1000 };
const LIMITE_DB_POR_HORA = 8;

function respuestaError(mensaje: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: mensaje, ...extra }, { status });
}

function obtenerIp(request: NextRequest): string {
  const reenviada = request.headers.get('x-forwarded-for');
  if (reenviada) return reenviada.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'desconocida';
}

// Solo se aceptan pedidos que vengan del propio sitio
function origenPermitido(request: NextRequest): boolean {
  const origen = request.headers.get('origin');
  if (!origen) return true; // llamadas del mismo origen sin cabecera (algunos navegadores)
  try {
    const host = new URL(origen).host;
    const propios = [request.headers.get('host'), request.headers.get('x-forwarded-host')];
    const sitio = process.env.NEXT_PUBLIC_SITE_URL;
    if (sitio) propios.push(new URL(sitio).host);
    return propios.some((h) => h && h === host);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!origenPermitido(request)) {
      return respuestaError('Solicitud no permitida.', 403);
    }

    const ip = obtenerIp(request);
    if (excedeLimite(`cotizacion:${ip}`, LIMITE_MEMORIA.maximo, LIMITE_MEMORIA.ventanaMs)) {
      return respuestaError('Enviaste muchas consultas seguidas. Probá de nuevo en unos minutos.', 429);
    }

    // Leer el cuerpo con tope de tamaño
    const texto = await request.text();
    if (texto.length > MAX_BODY_BYTES) {
      return respuestaError('La solicitud es demasiado grande.', 413);
    }
    let body: unknown;
    try {
      body = JSON.parse(texto);
    } catch {
      return respuestaError('Solicitud inválida.', 400);
    }

    const parsed = cotizacionApiSchema.parse(body);

    // Anti-bots: campo trampa lleno → se simula éxito sin guardar nada
    if (parsed.website && parsed.website.trim() !== '') {
      return NextResponse.json({ success: true, urlWhatsapp: '', codigo: '' }, { status: 201 });
    }
    if (parsed.tiempoMs !== undefined && parsed.tiempoMs < TIEMPO_MINIMO_MS) {
      return respuestaError('Revisá los datos e intentá de nuevo.', 400);
    }

    // Validar los artículos contra el catálogo real (no se confía en lo que manda el navegador)
    const catalogo = await getProductos();
    const pedidos = new Set(parsed.items.map((n) => n.toLowerCase()));
    const items: ItemCotizacion[] = catalogo
      .filter((p) => pedidos.has(p.nombre.toLowerCase()))
      .map((p) => ({
        nombre: p.nombre,
        categoria: p.categoria,
        etiqueta: p.etiqueta_whatsapp,
        cantidadSegunInvitados: p.cantidad_segun_invitados,
      }));

    if (items.length === 0) {
      return respuestaError('Elegí al menos un artículo del catálogo.', 422);
    }

    const id = randomUUID();
    const codigo = id.slice(0, 6).toUpperCase();
    const telefono = soloDigitos(parsed.numero);
    const mensaje = parsed.mensaje?.trim() || '';

    // Guardar en Supabase. Si falla, el cliente igual puede enviar su consulta por WhatsApp.
    let guardado = false;
    try {
      const supabase = getSupabaseAdmin();
      const ipHash = createHash('sha256')
        .update(`${ip}|${process.env.IP_HASH_SALT || 'ej-servicios'}`)
        .digest('hex');

      // Límite persistente por IP (sobrevive entre instancias y reinicios)
      const desde = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('cotizaciones')
        .select('id', { count: 'exact', head: true })
        .eq('ip_hash', ipHash)
        .gte('created_at', desde);
      if ((count ?? 0) >= LIMITE_DB_POR_HORA) {
        return respuestaError('Enviaste muchas consultas seguidas. Probá de nuevo más tarde.', 429);
      }

      const porCategoria: Record<string, string[]> = {};
      items.forEach((i) => {
        (porCategoria[i.categoria] ??= []).push(i.nombre);
      });

      const base = {
        id,
        nombre: parsed.nombre,
        whatsapp: telefono,
        fecha_evento: parsed.fechaEvento,
        tipo_evento: parsed.tipoEvento,
        cantidad_invitados: parsed.cantidadInvitados,
        ubicacion: parsed.direccion,
        mobiliario_solicitado: items.map((i) => i.nombre),
        mensaje: mensaje || null,
      };

      let { error } = await supabase.from('cotizaciones').insert({
        ...base,
        telefono,
        codigo,
        items: porCategoria,
        ip_hash: ipHash,
      });

      // Si todavía no se ejecutó la migración 0003 (faltan columnas), se guarda lo básico
      if (error && /column|schema cache/i.test(error.message)) {
        console.error('⚠️ Falta ejecutar database/migrations/0003 en Supabase:', error.message);
        ({ error } = await supabase.from('cotizaciones').insert(base));
      }

      if (error) {
        console.error('❌ No se guardó la cotización en Supabase:', error.message);
      } else {
        guardado = true;
      }
    } catch (dbError) {
      console.error('❌ Error conectando con Supabase:', dbError);
    }

    const urlWhatsapp = generarUrlWhatsapp({
      nombre: parsed.nombre,
      telefono,
      fechaEvento: parsed.fechaEvento,
      tipoEvento: parsed.tipoEvento,
      cantidadInvitados: parsed.cantidadInvitados,
      ubicacion: parsed.direccion,
      items,
      mensaje,
      codigo,
    });

    return NextResponse.json({ success: true, urlWhatsapp, codigo, guardado }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      const primero = error.issues[0]?.message || 'Revisá los datos ingresados.';
      return respuestaError(primero, 422, { detalles: error.flatten().fieldErrors });
    }
    console.error('❌ Error en POST /api/cotizacion:', error);
    return respuestaError('No pudimos procesar tu consulta. Intentá de nuevo.', 500);
  }
}
