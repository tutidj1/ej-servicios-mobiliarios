import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { cotizacionSchema } from '@/lib/validators/cotizacionValidator';
import { generarUrlWhatsapp } from '@/lib/services/whatsappService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar datos recibidos con Zod
    const validation = cotizacionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Datos inválidos', 
          details: validation.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }
    
    const data = validation.data;
    
    let cotizacionId = undefined;
    let dbSaved = false;

    // Intentar guardar en Supabase si las credenciales están presentes
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && adminKey && !supabaseUrl.includes('xxxx')) {
      try {
        const supabaseAdmin = getSupabaseAdmin();
        const { data: cotizacion, error } = await supabaseAdmin
          .from('cotizaciones')
          .insert({
            nombre: data.nombre,
            whatsapp: data.whatsapp,
            fecha_evento: data.fechaEvento,
            tipo_evento: data.tipoEvento,
            cantidad_invitados: data.cantidadInvitados,
            ubicacion: data.ubicacion || null,
            mobiliario_solicitado: data.mobiliarioSolicitado,
            mensaje: data.mensaje || null,
            estado: 'pendiente'
          })
          .select()
          .single();

        if (error) {
          console.error('Error al insertar en Supabase:', error);
        } else if (cotizacion) {
          cotizacionId = cotizacion.id;
          dbSaved = true;
        }
      } catch (dbError) {
        console.error('Excepción al conectar con Supabase:', dbError);
      }
    } else {
      console.warn('⚠️ Base de datos omitida: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurada.');
    }

    // Generar la URL de redirección a WhatsApp (con ID corto o placeholder)
    const urlWhatsapp = generarUrlWhatsapp({
      ...data,
      cotizacionId: cotizacionId
    });

    return NextResponse.json({
      success: true,
      dbSaved,
      cotizacionId: cotizacionId || 'LOCAL-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
      urlWhatsapp
    });
  } catch (error) {
    console.error('Error del servidor:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor al procesar la cotización' },
      { status: 500 }
    );
  }
}
