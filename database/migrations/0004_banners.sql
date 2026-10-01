-- =========================================================================
-- 0004 — Banners editables desde el panel /admin
-- Ejecutar en Supabase > SQL Editor (idempotente). Requiere haber corrido la 0003.
-- =========================================================================
CREATE TABLE IF NOT EXISTS banners (
  clave VARCHAR(40) PRIMARY KEY,           -- 'hero' | 'nosotros'
  etiqueta VARCHAR(80) NOT NULL,           -- nombre que se ve en el panel
  titulo VARCHAR(120),
  subtitulo VARCHAR(300),
  imagen_url VARCHAR(600),
  alt VARCHAR(200),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO banners (clave, etiqueta, titulo, subtitulo, imagen_url, alt) VALUES
  ('hero', 'Banner principal (inicio)', 'Exclusivo para vos',
   'Llevamos, traemos y lavamos la vajilla. Vos solo disfrutá tu evento.',
   '/hero-banner.png', 'EJ Servicios Mobiliarios Banner'),
  ('nosotros', 'Imagen de "Nuestra historia"', NULL, NULL,
   '/images/emprendimiento-familiar.jpg', 'Vajilla EJ Servicios Mobiliarios')
ON CONFLICT (clave) DO NOTHING;

DROP TRIGGER IF EXISTS trg_banners_updated ON banners;
CREATE TRIGGER trg_banners_updated BEFORE UPDATE ON banners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura pública de banners" ON banners;
CREATE POLICY "Lectura pública de banners"
ON banners FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Banners solo administrador" ON banners;
CREATE POLICY "Banners solo administrador"
ON banners FOR ALL TO authenticated
USING (public.es_admin()) WITH CHECK (public.es_admin());
