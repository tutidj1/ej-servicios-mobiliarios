-- Vuelta atrás de 0009_auditoria.sql (borra el historial de cambios; no toca eventos ni clientes)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['eventos', 'evento_lineas', 'evento_costos', 'pagos', 'clientes'] LOOP
    IF to_regclass(t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_audit ON %I', t, t);
    END IF;
  END LOOP;
END $$;
DROP FUNCTION IF EXISTS public.auditar();
DROP TABLE IF EXISTS audit_log;
