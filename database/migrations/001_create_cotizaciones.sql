-- Migración 001: Creación de tablas de cotizaciones y productos
-- Ejecutar en el editor SQL de Supabase

-- Crear tabla cotizaciones si no existe
CREATE TABLE IF NOT EXISTS cotizaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(120) NOT NULL,
  whatsapp VARCHAR(30) NOT NULL,
  fecha_evento DATE NOT NULL,
  tipo_evento VARCHAR(50) NOT NULL,
  cantidad_invitados INTEGER NOT NULL,
  ubicacion VARCHAR(200),
  mobiliario_solicitado JSONB,
  mensaje TEXT,
  estado VARCHAR(20) DEFAULT 'pendiente',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cotizaciones_fecha ON cotizaciones(fecha_evento);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_estado ON cotizaciones(estado);

-- Crear tabla productos si no existe
CREATE TABLE IF NOT EXISTS productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(120) NOT NULL,
  categoria VARCHAR(50) NOT NULL,
  descripcion TEXT,
  imagen_url VARCHAR(500),
  stock_disponible INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);
