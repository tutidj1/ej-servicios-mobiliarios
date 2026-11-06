-- Vuelta atrás de 0008_gestion_nucleo.sql
-- ATENCIÓN: borra las tablas de gestión y TODO lo que se haya cargado en ellas
-- (eventos, clientes, pagos, costos, inventario). Exportá antes un CSV si ya hay datos reales.
-- Correr antes la vuelta atrás de 0010 y 0009 si se aplicaron.
-- No toca "productos" ni "cotizaciones".

DROP TABLE IF EXISTS pagos;
DROP TABLE IF EXISTS evento_costos;
DROP TABLE IF EXISTS evento_lineas;
DROP TABLE IF EXISTS eventos;
DROP TABLE IF EXISTS clientes;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS configuracion;
DROP FUNCTION IF EXISTS public.eventos_reglas();
DROP FUNCTION IF EXISTS public.detalle_evento_reglas();
