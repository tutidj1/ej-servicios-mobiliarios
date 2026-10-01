-- =========================================================================
-- 0003 — Panel admin, promo automática, cotizaciones completas
-- Ejecutar UNA vez en Supabase > SQL Editor. Es idempotente (se puede re-ejecutar).
-- Admin UUID: 42a4f12c-f891-42e4-ae35-2aa889711e4a
-- =========================================================================

-- 0. Función de ayuda: ¿el usuario logueado es el administrador?
CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid() = '42a4f12c-f891-42e4-ae35-2aa889711e4a'::uuid
$$;
GRANT EXECUTE ON FUNCTION public.es_admin() TO anon, authenticated;

-- =========================================================================
-- 1. PRODUCTOS: campos nuevos y corrección de datos
-- =========================================================================
-- Nombre con el que sale en el mensaje de WhatsApp (si está vacío se usa "nombre")
ALTER TABLE productos ADD COLUMN IF NOT EXISTS etiqueta_whatsapp VARCHAR(120);
-- Si es TRUE, en el WhatsApp aparece con la cantidad de invitados. Ej: "Sillas (80)"
ALTER TABLE productos ADD COLUMN IF NOT EXISTS cantidad_segun_invitados BOOLEAN NOT NULL DEFAULT FALSE;

-- La categoría ya no está limitada: podés crear categorías nuevas escribiéndolas.
ALTER TABLE productos ALTER COLUMN categoria TYPE VARCHAR(60);

-- Error del seed original: "Cuchillo de mesa" quedó en la categoría 'Cuchillo'
UPDATE productos SET categoria = 'Cubiertos' WHERE categoria = 'Cuchillo';

UPDATE productos SET cantidad_segun_invitados = TRUE WHERE nombre ILIKE 'Silla%';

-- Ya no hay límite de invitados: se quita la leyenda "hasta 100 personas"
UPDATE productos
SET descripcion = REPLACE(descripcion, ' Capacidad hasta 100 personas.', '')
WHERE descripcion LIKE '%Capacidad hasta 100 personas.%';

-- =========================================================================
-- 2. COTIZACIONES: guardar todo lo que pide el cliente
-- =========================================================================
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS telefono VARCHAR(30);
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS codigo VARCHAR(8);
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS items JSONB;          -- { "Vajilla": ["Plato principal", ...], ... }
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS ip_hash VARCHAR(64);  -- hash de la IP (anti-spam, no es la IP real)
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS notas_admin TEXT;
ALTER TABLE cotizaciones ALTER COLUMN whatsapp DROP NOT NULL;
ALTER TABLE cotizaciones ALTER COLUMN tipo_evento TYPE VARCHAR(80);

CREATE INDEX IF NOT EXISTS idx_cotizaciones_ip_created ON cotizaciones(ip_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_created ON cotizaciones(created_at DESC);

-- Sin límite de invitados (solo se evita un valor absurdo)
ALTER TABLE cotizaciones DROP CONSTRAINT IF EXISTS cotizaciones_invitados_check;
ALTER TABLE cotizaciones ADD CONSTRAINT cotizaciones_invitados_check
  CHECK (cantidad_invitados BETWEEN 1 AND 1000000);

-- Mantener updated_at al día
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_cotizaciones_updated ON cotizaciones;
CREATE TRIGGER trg_cotizaciones_updated BEFORE UPDATE ON cotizaciones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- 3. PROMO: un único registro editable (el mes se calcula solo en la web)
-- =========================================================================
CREATE TABLE IF NOT EXISTS promo_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  motivo VARCHAR(80) NOT NULL DEFAULT 'Promo especial',          -- "Día de la Madre", "Mes del Mundial", etc.
  descuento_texto VARCHAR(40) NOT NULL DEFAULT '30% OFF',
  beneficio_texto VARCHAR(120) NOT NULL DEFAULT 'En el total de tu alquiler',
  meses_vigencia INTEGER NOT NULL DEFAULT 3 CHECK (meses_vigencia BETWEEN 1 AND 12),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO promo_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS trg_promo_updated ON promo_config;
CREATE TRIGGER trg_promo_updated BEFORE UPDATE ON promo_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- 4. POLÍTICAS RLS
-- =========================================================================
ALTER TABLE promo_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura pública de promo" ON promo_config;
CREATE POLICY "Lectura pública de promo"
ON promo_config FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Escritura promo solo administrador" ON promo_config;
CREATE POLICY "Escritura promo solo administrador"
ON promo_config FOR ALL TO authenticated
USING (public.es_admin()) WITH CHECK (public.es_admin());

-- cotizaciones: solo el admin puede leer/editar desde el navegador.
-- (La web inserta con la clave service_role desde el servidor, que se salta RLS.)
DROP POLICY IF EXISTS "Restringir lectura/escritura directa en cliente para cotizaciones" ON cotizaciones;
DROP POLICY IF EXISTS "Cotizaciones solo administrador" ON cotizaciones;
CREATE POLICY "Cotizaciones solo administrador"
ON cotizaciones FOR ALL TO authenticated
USING (public.es_admin()) WITH CHECK (public.es_admin());

-- productos: lectura pública, escritura solo admin
DROP POLICY IF EXISTS "Permitir escritura solo a cuenta Administrador" ON productos;
DROP POLICY IF EXISTS "Productos escritura solo administrador" ON productos;
CREATE POLICY "Productos escritura solo administrador"
ON productos FOR ALL TO authenticated
USING (public.es_admin()) WITH CHECK (public.es_admin());

-- =========================================================================
-- 5. STORAGE: bucket público "productos" para subir fotos desde el panel
-- =========================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('productos', 'productos', TRUE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admin sube imagenes de productos" ON storage.objects;
CREATE POLICY "Admin sube imagenes de productos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'productos' AND public.es_admin());

DROP POLICY IF EXISTS "Admin modifica imagenes de productos" ON storage.objects;
CREATE POLICY "Admin modifica imagenes de productos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'productos' AND public.es_admin());

DROP POLICY IF EXISTS "Admin borra imagenes de productos" ON storage.objects;
CREATE POLICY "Admin borra imagenes de productos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'productos' AND public.es_admin());
