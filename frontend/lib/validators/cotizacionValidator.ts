import { z } from 'zod';

const ZONA_HORARIA = 'America/Argentina/Buenos_Aires';

/** Fecha de hoy en Argentina como YYYY-MM-DD (en-CA ya usa ese formato). */
export function hoyArgentina(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);
}

/** Deja solo los dígitos de un teléfono ("+54 342-506 8365" → "543425068365"). */
export function soloDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

// Límite técnico solo para evitar valores absurdos; no hay tope "real" de invitados.
export const MAX_INVITADOS = 1_000_000;

// Esquema compartido por el formulario (cliente) y la API (servidor)
export const cotizacionSchema = z.object({
  nombre: z
    .string({ required_error: 'Ingresá tu nombre.' })
    .trim()
    .min(2, 'El nombre debe tener al menos 2 letras.')
    .max(120, 'El nombre es demasiado largo.'),

  fechaEvento: z
    .string({ required_error: 'Elegí la fecha del evento.' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Elegí la fecha del evento.')
    .refine((val) => !isNaN(new Date(`${val}T12:00:00Z`).getTime()), 'La fecha no es válida.')
    .refine((val) => val >= hoyArgentina(), 'La fecha no puede ser anterior a hoy.')
    .refine((val) => {
      const limite = new Date();
      limite.setFullYear(limite.getFullYear() + 5);
      return val <= hoyArgentina(limite);
    }, 'La fecha es demasiado lejana.'),

  tipoEvento: z
    .string({ required_error: 'Elegí el tipo de evento.' })
    .trim()
    .min(3, 'Elegí el tipo de evento.')
    .max(60, 'El tipo de evento es demasiado largo.'),

  cantidadInvitados: z
    .number({
      required_error: 'Ingresá la cantidad de invitados.',
      invalid_type_error: 'Ingresá la cantidad de invitados.',
    })
    .int('Ingresá un número entero.')
    .min(1, 'Tiene que haber al menos 1 invitado.')
    .max(MAX_INVITADOS, 'La cantidad de invitados no es válida.'),

  direccion: z
    .string({ required_error: 'Ingresá la dirección o zona del evento.' })
    .trim()
    .min(3, 'Ingresá la dirección o zona del evento.')
    .max(150, 'La dirección no puede superar los 150 caracteres.'),

  // Teléfono: se permite escribir espacios, guiones o "+"; se valida sobre los dígitos
  numero: z
    .string({ required_error: 'Ingresá tu teléfono.' })
    .trim()
    .max(30, 'El teléfono es demasiado largo.')
    .refine((val) => {
      const digitos = soloDigitos(val);
      return digitos.length >= 8 && digitos.length <= 15;
    }, 'Ingresá un teléfono válido, con característica. Ej: 342 506 8365'),

  mensaje: z
    .string()
    .max(500, 'El mensaje no puede superar los 500 caracteres.')
    .optional()
    .or(z.literal('')),
});

export type CotizacionInput = z.infer<typeof cotizacionSchema>;

// Campos extra que solo llegan a la API (no los ve el usuario)
export const cotizacionApiSchema = cotizacionSchema.extend({
  // Nombres de productos elegidos; el servidor los valida contra la tabla productos
  items: z
    .array(z.string().trim().min(1).max(120))
    .min(1, 'Elegí al menos un artículo.')
    .max(200, 'Demasiados artículos seleccionados.'),
  // Anti-bots: campo trampa (debe venir vacío) y tiempo que tardó en completar el formulario
  website: z.string().max(200).optional(),
  tiempoMs: z.number().int().min(0).max(86_400_000).optional(),
});

export type CotizacionApiInput = z.infer<typeof cotizacionApiSchema>;
