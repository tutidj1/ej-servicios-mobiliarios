import { NextRequest, NextResponse } from 'next/server';
import { cotizacionSchema } from '@/lib/validators/cotizacionValidator';
import { generarUrlWhatsapp, CotizacionData } from '@/lib/services/whatsappService';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // VALIDAR con Zod
    const parsed = cotizacionSchema.parse(body);

    // Mapear a CotizacionData
    const cotizacionData: CotizacionData = {
      nombre: parsed.nombre,
      whatsapp: parsed.whatsapp,
      fechaEvento: parsed.fechaEvento,
      tipoEvento: parsed.tipoEvento,
      cantidadInvitados: parsed.cantidadInvitados,
      ubicacion: parsed.ubicacion,
      mobiliarioSolicitado: body.mobiliarioSolicitado || [],
      mensaje: parsed.mensaje,
    };

    // GUARDAR EN SUPABASE (si está configurado, si no continuar igual)
    let cotizacionId = '';
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('cotizaciones')
        .insert([
          {
            nombre: cotizacionData.nombre,
            whatsapp: cotizacionData.whatsapp,
            fecha_evento: cotizacionData.fechaEvento,
            tipo_evento: cotizacionData.tipoEvento,
            cantidad_invitados: cotizacionData.cantidadInvitados,
            ubicacion: cotizacionData.ubicacion,
            mobiliario_solicitado: cotizacionData.mobiliarioSolicitado,
            mensaje: cotizacionData.mensaje,
            creado_en: new Date().toISOString(),
          },
        ])
        .select();

      if (error) {
        console.warn('⚠️ No se guardó en Supabase:', error.message);
      } else if (data && data.length > 0) {
        cotizacionId = data[0].id;
        console.log('✅ Cotización guardada:', cotizacionId);
      }
    } catch (dbError) {
      console.warn('⚠️ Error conectando Supabase:', dbError);
    }

    // GENERAR URL WHATSAPP
    const cotizacionDataConId: CotizacionData = {
      ...cotizacionData,
      cotizacionId,
    };
    const urlWhatsapp = generarUrlWhatsapp(cotizacionDataConId);

    // RESPONDER al cliente
    return NextResponse.json(
      {
        success: true,
        urlWhatsapp,
        cotizacionId,
        message: '✅ Cotización generada. Abriendo WhatsApp...',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ Error en POST /api/cotizacion:', error);

    // Error de validación Zod
    if (error.errors) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validación fallida',
          details: error.errors,
        },
        { status: 422 }
      );
    }

    // Error genérico
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error interno',
      },
      { status: 500 }
    );
  }
}
