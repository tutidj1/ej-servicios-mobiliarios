-- Vuelta atrás de 0012_locador_en_configuracion.sql (borra los datos del locador cargados; el contrato saldrá con esas líneas en blanco)
ALTER TABLE configuracion DROP COLUMN IF EXISTS locador_nombre;
ALTER TABLE configuracion DROP COLUMN IF EXISTS locador_dni;
ALTER TABLE configuracion DROP COLUMN IF EXISTS locador_telefono;
