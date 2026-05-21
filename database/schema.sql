-- Schema completo para Supabase (PostgreSQL)

-- Tabla de cotizaciones recibidas
CREATE TABLE IF NOT EXISTS cotizaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(120) NOT NULL,
  whatsapp VARCHAR(30) NOT NULL,
  fecha_evento DATE NOT NULL,
  tipo_evento VARCHAR(50) NOT NULL,
  cantidad_invitados INTEGER NOT NULL,
  ubicacion VARCHAR(200),
  mobiliario_solicitado JSONB,        -- array de strings
  mensaje TEXT,
  estado VARCHAR(20) DEFAULT 'pendiente',  -- pendiente | contactado | confirmado | cancelado
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cotizaciones_fecha ON cotizaciones(fecha_evento);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_estado ON cotizaciones(estado);

-- Tabla de productos del catálogo
CREATE TABLE IF NOT EXISTS productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(120) NOT NULL,
  categoria VARCHAR(50) NOT NULL,    -- Mobiliario | Vajilla | Cubiertos | Cristalería | Mantelería | Accesorios
  descripcion TEXT,
  imagen_url VARCHAR(500),
  stock_disponible INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);
