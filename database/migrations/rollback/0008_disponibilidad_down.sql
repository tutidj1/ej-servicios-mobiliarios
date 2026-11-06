-- Vuelta atrás de 0008_disponibilidad.sql (solo borra funciones; no toca datos)
DROP FUNCTION IF EXISTS public.cambiar_estado_evento(UUID, TEXT);
DROP FUNCTION IF EXISTS public.reservar_stock(UUID);
DROP FUNCTION IF EXISTS public.disponibilidad(UUID[], DATE, DATE, UUID);
DROP FUNCTION IF EXISTS public.stock_disponible_rango(UUID, DATE, DATE, UUID);
DROP FUNCTION IF EXISTS public.stock_disponible(UUID, DATE, UUID);
