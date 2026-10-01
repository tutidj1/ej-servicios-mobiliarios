-- Todos los productos muestran la cantidad de invitados al lado del nombre en el WhatsApp
-- (los productos nuevos también). Se puede apagar producto por producto desde /admin.
ALTER TABLE productos ALTER COLUMN cantidad_segun_invitados SET DEFAULT TRUE;
UPDATE productos SET cantidad_segun_invitados = TRUE;
