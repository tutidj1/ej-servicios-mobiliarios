-- =========================================================================
-- 0007 — Roles: administrador (Tomás) y operadora (María Eugenia)
-- Ejecutar en Supabase > SQL Editor (idempotente). Requiere la 0003.
--
-- Antes, es_admin() comparaba contra un UUID fijo. Ahora lee la tabla "perfiles".
-- Todas las políticas que ya usan es_admin() siguen funcionando igual.
-- =========================================================================

CREATE TABLE IF NOT EXISTS perfiles (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rol        TEXT NOT NULL CHECK (rol IN ('admin', 'operadora')),
  nombre     VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- La cuenta administradora actual
INSERT INTO perfiles (user_id, rol, nombre)
VALUES ('42a4f12c-f891-42e4-ae35-2aa889711e4a', 'admin', 'Tomás')
ON CONFLICT (user_id) DO NOTHING;

DROP TRIGGER IF EXISTS trg_perfiles_updated ON perfiles;
CREATE TRIGGER trg_perfiles_updated BEFORE UPDATE ON perfiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SECURITY DEFINER: se usan dentro de políticas RLS; así leen "perfiles" sin recursión.
CREATE OR REPLACE FUNCTION public.mi_rol()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT rol FROM perfiles WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT rol = 'admin' FROM perfiles WHERE user_id = auth.uid()), FALSE)
$$;

CREATE OR REPLACE FUNCTION public.es_staff()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM perfiles WHERE user_id = auth.uid() AND rol IN ('admin', 'operadora'))
$$;

REVOKE ALL ON FUNCTION public.mi_rol() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.es_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mi_rol() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.es_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.es_staff() TO anon, authenticated;

ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Perfiles: cada uno ve el suyo, admin ve todos" ON perfiles;
CREATE POLICY "Perfiles: cada uno ve el suyo, admin ve todos"
ON perfiles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.es_admin());

DROP POLICY IF EXISTS "Perfiles: solo admin modifica" ON perfiles;
CREATE POLICY "Perfiles: solo admin modifica"
ON perfiles FOR ALL TO authenticated
USING (public.es_admin()) WITH CHECK (public.es_admin());

-- Cotizaciones de la web: la operadora también las ve y les cambia el estado
-- (para "Convertir en evento"). Eliminar sigue siendo solo del admin.
DROP POLICY IF EXISTS "Cotizaciones lectura staff" ON cotizaciones;
CREATE POLICY "Cotizaciones lectura staff"
ON cotizaciones FOR SELECT TO authenticated
USING (public.es_staff());

DROP POLICY IF EXISTS "Cotizaciones actualizar staff" ON cotizaciones;
CREATE POLICY "Cotizaciones actualizar staff"
ON cotizaciones FOR UPDATE TO authenticated
USING (public.es_staff()) WITH CHECK (public.es_staff());

-- -------------------------------------------------------------------------
-- Para dar acceso a María Eugenia: primero creá su usuario en
-- Authentication > Users (email y contraseña), y después corré esto
-- cambiando el email:
--
-- INSERT INTO perfiles (user_id, rol, nombre)
-- SELECT id, 'operadora', 'María Eugenia' FROM auth.users WHERE email = 'EMAIL_DE_ELLA'
-- ON CONFLICT (user_id) DO UPDATE SET rol = EXCLUDED.rol;
-- -------------------------------------------------------------------------
