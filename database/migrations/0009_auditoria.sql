-- =========================================================================
-- 0009 — Auditoría: quién cambió qué y cuándo (eventos, líneas, costos, pagos, clientes)
-- Ejecutar en Supabase > SQL Editor (idempotente). Requiere la 0007.
-- Solo agrega una tabla y triggers; no toca datos. Vuelta atrás: rollback/0009_auditoria_down.sql
-- =========================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  tabla       TEXT NOT NULL,
  registro_id UUID,
  accion      TEXT NOT NULL CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE')),
  usuario     UUID DEFAULT auth.uid(),
  antes       JSONB,
  despues     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_registro ON audit_log (tabla, registro_id);
CREATE INDEX IF NOT EXISTS idx_audit_fecha ON audit_log (created_at DESC);

-- SECURITY DEFINER: escribe aunque el usuario no tenga permiso de INSERT sobre audit_log
CREATE OR REPLACE FUNCTION public.auditar()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_log (tabla, registro_id, accion, usuario, antes, despues)
  VALUES (
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END
  );
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.auditar() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['eventos', 'evento_lineas', 'evento_costos', 'pagos', 'clientes'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_audit ON %I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_audit AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION public.auditar()', t, t);
  END LOOP;
END $$;

-- Solo el admin lee el registro; nadie lo edita ni lo borra desde la web.
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin lee auditoria" ON audit_log;
CREATE POLICY "Admin lee auditoria" ON audit_log FOR SELECT TO authenticated USING (public.es_admin());
