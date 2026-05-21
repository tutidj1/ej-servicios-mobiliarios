import { z } from 'zod';

// Esquema de validación para una cotización de EJ Servicios Mobiliarios
export const cotizacionSchema = z.object({
  nombre: z
    .string({
      required_error: 'El nombre es obligatorio.',
      invalid_type_error: 'El nombre debe ser una cadena de texto.',
    })
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(120, 'El nombre es demasiado largo.'),

  whatsapp: z
    .string({
      required_error: 'El WhatsApp es obligatorio.',
    })
    .min(8, 'El número de WhatsApp debe tener al menos 8 dígitos.')
    .regex(/^[+]?[0-9\s-]{8,20}$/, 'Por favor, ingresa un número de teléfono válido.'),

  fechaEvento: z
    .string({
      required_error: 'La fecha del evento es obligatoria.',
    })
    .refine((val) => {
      const date = new Date(val);
      if (isNaN(date.getTime())) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    }, 'La fecha del evento no puede ser anterior a hoy.'),

  tipoEvento: z
    .string({
      required_error: 'El tipo de evento es obligatorio.',
    })
    .min(3, 'Por favor, selecciona un tipo de evento.'),

  cantidadInvitados: z
    .number({
      required_error: 'La cantidad de invitados es obligatoria.',
      invalid_type_error: 'La cantidad debe ser un número.',
    })
    .min(1, 'El evento debe contar con al menos 1 invitado.')
    .max(200, 'Nuestra capacidad máxima de stock cubre hasta 200 invitados.'),

  ubicacion: z
    .string()
    .max(200, 'La ubicación no puede exceder los 200 caracteres.')
    .optional()
    .or(z.literal('')),

  mobiliarioSolicitado: z
    .array(z.string())
    .min(1, 'Por favor, selecciona al menos un artículo que necesites para tu evento.'),

  mensaje: z
    .string()
    .max(500, 'El mensaje adicional no puede superar los 500 caracteres.')
    .optional()
    .or(z.literal('')),
});

export type CotizacionInput = z.infer<typeof cotizacionSchema>;
