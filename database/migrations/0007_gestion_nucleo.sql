-- =========================================================================
-- 0007 — Gestión de alquileres: núcleo (inventario, clientes, eventos, líneas, costos, pagos)
-- Ejecutar en Supabase > SQL Editor (idempotente). Requiere la 0006.
--
-- Solo CREA tablas nuevas. No modifica "productos", "cotizaciones" ni ningún dato existente.
-- Vuelta atrás: rollback/0007_gestion_nucleo_down.sql
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. INVENTARIO (items). Separado de "productos" (que es el catálogo público de la web):
--    acá hay stock real y costo de compra, que no deben ser públicos.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                VARCHAR(120) NOT NULL UNIQUE,
  categoria             TEXT NOT NULL CHECK (categoria IN ('mobiliario', 'vajilla', 'mantelería', 'otros')),
  stock_total           INTEGER NOT NULL DEFAULT 0 CHECK (stock_total >= 0),
  orden_contrato        INTEGER,                         -- posición en la grilla del contrato
  costo_compra_unitario NUMERIC(12,2) CHECK (costo_compra_unitario >= 0),
  activo                BOOLEAN NOT NULL DEFAULT TRUE,
  alias                 TEXT[] NOT NULL DEFAULT '{}',    -- otros nombres (para voz): "caballete", "tablón"
  -- Asistente de cantidades: 'personas' = 1 por invitado, 'mesas' = 1 por mesa, 'ninguna' = no sugiere
  sugerencia            TEXT NOT NULL DEFAULT 'ninguna' CHECK (sugerencia IN ('personas', 'mesas', 'ninguna')),
  producto_id           UUID REFERENCES productos(id) ON DELETE SET NULL,  -- vínculo opcional con la web
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID DEFAULT auth.uid()
);

-- -------------------------------------------------------------------------
-- 2. CLIENTES
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_apellido VARCHAR(160) NOT NULL,
  dni             VARCHAR(20),
  telefono        VARCHAR(30),
  email           VARCHAR(160),
  canal_origen    TEXT NOT NULL DEFAULT 'otro'
                  CHECK (canal_origen IN ('web', 'instagram', 'facebook', 'whatsapp', 'recomendación', 'otro')),
  lead_id         UUID REFERENCES cotizaciones(id) ON DELETE SET NULL,  -- cotización de la web de la que vino
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID DEFAULT auth.uid()
);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes (lower(nombre_apellido));
CREATE INDEX IF NOT EXISTS idx_clientes_lead ON clientes (lead_id);

-- -------------------------------------------------------------------------
-- 3. EVENTOS. Ocupan stock de fecha_entrega a fecha_devolucion (ambas inclusive).
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS eventos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id        UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  lugar             VARCHAR(250),
  tipo_evento       VARCHAR(80),
  cantidad_personas INTEGER CHECK (cantidad_personas > 0),
  fecha_evento      DATE NOT NULL,
  fecha_entrega     DATE NOT NULL,
  fecha_devolucion  DATE NOT NULL,
  estado            TEXT NOT NULL DEFAULT 'presupuesto'
                    CHECK (estado IN ('presupuesto', 'confirmado', 'entregado', 'devuelto', 'cancelado')),
  flete_cobrado     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (flete_cobrado >= 0),
  notas             TEXT,
  cerrado_en        TIMESTAMPTZ,      -- "Cerrar evento": desde acá precios y costos quedan congelados
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID DEFAULT auth.uid(),
  CONSTRAINT eventos_rango_fechas CHECK (fecha_entrega <= fecha_evento AND fecha_evento <= fecha_devolucion)
);
CREATE INDEX IF NOT EXISTS idx_eventos_rango ON eventos (fecha_entrega, fecha_devolucion);
CREATE INDEX IF NOT EXISTS idx_eventos_estado ON eventos (estado);
CREATE INDEX IF NOT EXISTS idx_eventos_cliente ON eventos (cliente_id);

-- -------------------------------------------------------------------------
-- 4. LÍNEAS del evento. Al cliente se le cobra cantidad_total; el subalquiler es interno.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evento_lineas (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id                  UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  item_id                    UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  cantidad_total             INTEGER NOT NULL DEFAULT 0 CHECK (cantidad_total >= 0),
  cantidad_propia            INTEGER NOT NULL DEFAULT 0 CHECK (cantidad_propia >= 0),
  cantidad_subalquilada      INTEGER NOT NULL DEFAULT 0 CHECK (cantidad_subalquilada >= 0),
  precio_unitario            NUMERIC(12,2) CHECK (precio_unitario >= 0),            -- obligatorio al confirmar
  costo_subalquiler_unitario NUMERIC(12,2) CHECK (costo_subalquiler_unitario >= 0),
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by                 UUID DEFAULT auth.uid(),
  CONSTRAINT evento_lineas_suma CHECK (cantidad_total = cantidad_propia + cantidad_subalquilada),
  CONSTRAINT evento_lineas_unica UNIQUE (evento_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_lineas_item ON evento_lineas (item_id);

-- -------------------------------------------------------------------------
-- 5. COSTOS del evento (flete pagado, lavado, roturas, ayudante...)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evento_costos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id   UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL CHECK (tipo IN ('flete', 'lavado', 'rotura', 'ayudante', 'otro')),
  monto       NUMERIC(12,2) NOT NULL CHECK (monto >= 0),
  descripcion VARCHAR(250),
  fecha       DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID DEFAULT auth.uid()
);
CREATE INDEX IF NOT EXISTS idx_costos_evento ON evento_costos (evento_id);

-- -------------------------------------------------------------------------
-- 6. PAGOS del cliente
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pagos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id  UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  tipo       TEXT NOT NULL CHECK (tipo IN ('seña', 'saldo', 'otro')),
  monto      NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  fecha      DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,
  medio      TEXT NOT NULL DEFAULT 'efectivo' CHECK (medio IN ('efectivo', 'transferencia', 'otro')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID DEFAULT auth.uid()
);
CREATE INDEX IF NOT EXISTS idx_pagos_evento ON pagos (evento_id);

-- -------------------------------------------------------------------------
-- 7. CONFIGURACIÓN (una sola fila). Los datos del locador y cláusulas llegan en la Fase 2.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS configuracion (
  id                    INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  personas_por_mesa     INTEGER NOT NULL DEFAULT 10 CHECK (personas_por_mesa > 0),
  mostrar_ultimo_precio BOOLEAN NOT NULL DEFAULT FALSE,  -- sugerencia en gris, nunca aplicada sola
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO configuracion (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------------------------
-- 8. updated_at automático
-- -------------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['items', 'clientes', 'eventos', 'evento_lineas', 'evento_costos', 'pagos', 'configuracion'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON %I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t, t);
  END LOOP;
END $$;

-- -------------------------------------------------------------------------
-- 9. REGLAS en la base (aunque falle la pantalla, no se rompen)
--    a) No se confirma un evento con artículos sin precio.
--    b) Un evento cerrado no se modifica (solo el admin puede reabrirlo).
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.eventos_reglas()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.cerrado_en IS NOT NULL AND NOT public.es_admin() THEN
    RAISE EXCEPTION 'El evento está cerrado. Solo el administrador puede reabrirlo.';
  END IF;
  IF NEW.cerrado_en IS NOT NULL AND NEW.estado NOT IN ('devuelto', 'cancelado') THEN
    RAISE EXCEPTION 'Solo se puede cerrar un evento devuelto o cancelado.';
  END IF;
  IF NEW.estado IN ('confirmado', 'entregado', 'devuelto') AND EXISTS (
    SELECT 1 FROM evento_lineas
    WHERE evento_id = NEW.id AND cantidad_total > 0 AND precio_unitario IS NULL
  ) THEN
    RAISE EXCEPTION 'Hay artículos sin precio. Completalos antes de confirmar.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_eventos_reglas ON eventos;
CREATE TRIGGER trg_eventos_reglas BEFORE INSERT OR UPDATE ON eventos
  FOR EACH ROW EXECUTE FUNCTION public.eventos_reglas();

CREATE OR REPLACE FUNCTION public.detalle_evento_reglas()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  ev RECORD;
  fila RECORD;
BEGIN
  IF TG_OP = 'DELETE' THEN fila := OLD; ELSE fila := NEW; END IF;
  SELECT estado, cerrado_en INTO ev FROM eventos WHERE id = fila.evento_id;
  IF ev.cerrado_en IS NOT NULL AND NOT public.es_admin() THEN
    RAISE EXCEPTION 'El evento está cerrado: sus precios y costos quedan congelados.';
  END IF;
  IF TG_TABLE_NAME = 'evento_lineas' AND TG_OP <> 'DELETE'
     AND ev.estado IN ('confirmado', 'entregado', 'devuelto')
     AND NEW.cantidad_total > 0 AND NEW.precio_unitario IS NULL THEN
    RAISE EXCEPTION 'El evento está confirmado: cada artículo necesita precio.';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_lineas_reglas ON evento_lineas;
CREATE TRIGGER trg_lineas_reglas BEFORE INSERT OR UPDATE OR DELETE ON evento_lineas
  FOR EACH ROW EXECUTE FUNCTION public.detalle_evento_reglas();
DROP TRIGGER IF EXISTS trg_costos_reglas ON evento_costos;
CREATE TRIGGER trg_costos_reglas BEFORE INSERT OR UPDATE OR DELETE ON evento_costos
  FOR EACH ROW EXECUTE FUNCTION public.detalle_evento_reglas();

-- -------------------------------------------------------------------------
-- 10. RLS: solo admin y operadora. Nada de esto es público (DNI, teléfonos, montos).
-- -------------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['items', 'clientes', 'eventos', 'evento_lineas', 'evento_costos', 'pagos'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Staff gestiona %s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "Staff gestiona %s" ON %I FOR ALL TO authenticated USING (public.es_staff()) WITH CHECK (public.es_staff())', t, t);
  END LOOP;
END $$;

ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff lee configuracion" ON configuracion;
CREATE POLICY "Staff lee configuracion" ON configuracion FOR SELECT TO authenticated USING (public.es_staff());
DROP POLICY IF EXISTS "Admin modifica configuracion" ON configuracion;
CREATE POLICY "Admin modifica configuracion" ON configuracion FOR UPDATE TO authenticated
  USING (public.es_admin()) WITH CHECK (public.es_admin());

-- -------------------------------------------------------------------------
-- 11. INVENTARIO INICIAL: los artículos de la plantilla del contrato, en su orden.
--     Stock confirmado: 100 sillas, 16 tablones, 100 de cada pieza del set de vajilla.
--     El resto queda en 0 para que la operadora cargue los números reales.
--     No pisa nada si el artículo ya existe.
-- -------------------------------------------------------------------------
INSERT INTO items (nombre, categoria, stock_total, orden_contrato, sugerencia, alias) VALUES
  ('Sillas',                     'mobiliario', 100,  1, 'personas', '{silla}'),
  ('Mesa redonda',               'mobiliario',   0,  2, 'ninguna',  '{"mesas redondas","mesa"}'),
  ('Caballetes',                 'mobiliario',   0,  3, 'ninguna',  '{caballete}'),
  ('Plato principal',            'vajilla',    100,  4, 'personas', '{"platos principales","plato playo","plato"}'),
  ('Cuchillos',                  'vajilla',    100,  5, 'personas', '{cuchillo}'),
  ('Platos de postre',           'vajilla',    100,  6, 'personas', '{"plato de postre"}'),
  ('Cuchara de postre',          'vajilla',    100,  7, 'personas', '{"cucharas de postre"}'),
  ('Copa de champagne',          'vajilla',    100,  8, 'personas', '{"copas de champagne","copa de champán"}'),
  ('Frasco dispensador',         'vajilla',      0,  9, 'ninguna',  '{"dispensador","frasco para jugo"}'),
  ('Cubre sillas',               'mantelería',   0, 10, 'ninguna',  '{"cubre silla","cubresillas","fundas de sillas"}'),
  ('Ensaladera',                 'vajilla',      0, 11, 'ninguna',  '{ensaladeras}'),
  ('Bandeja de mozo',            'vajilla',      0, 12, 'ninguna',  '{"bandejas de mozo","bandeja"}'),
  ('Mantelería blanca',          'mantelería',   0, 13, 'mesas',    '{"manteles blancos","mantel blanco","manteles"}'),
  ('Servilletas',                'mantelería',   0, 14, 'ninguna',  '{servilleta}'),
  ('Caminos celeste pastel',     'mantelería',   0, 15, 'ninguna',  '{"camino de mesa","caminos"}'),
  ('Platos cuadrados',           'vajilla',      0, 16, 'ninguna',  '{"plato cuadrado"}'),
  ('Tenedores',                  'vajilla',    100, 17, 'personas', '{tenedor}'),
  ('Tenedores de postre',        'vajilla',    100, 18, 'personas', '{"tenedor de postre"}'),
  ('Copas de vino / agua',       'vajilla',    100, 19, 'personas', '{"copas de vino","copas de agua","copa"}'),
  ('Estaca para asado',          'otros',        0, 20, 'ninguna',  '{estacas,"estaca"}'),
  ('Taza de té',                 'vajilla',    100, 21, 'personas', '{"tazas de té","tazas","taza"}'),
  ('Cucharas de té',             'vajilla',    100, 22, 'personas', '{"cucharita de té","cucharitas"}'),
  ('Frapera',                    'otros',        0, 23, 'ninguna',  '{fraperas}'),
  ('Hielera con pinza',          'otros',        0, 24, 'ninguna',  '{hielera,hieleras}'),
  ('Tablones de madera',         'mobiliario',  16, 25, 'mesas',    '{"tablón","tablones","mesa de tablón"}')
ON CONFLICT (nombre) DO NOTHING;
