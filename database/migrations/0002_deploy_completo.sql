-- Schema completo y políticas RLS para Supabase (PostgreSQL)
-- Generado automáticamente para EJ Servicios Mobiliarios con UUID Administrador asignado.

-- =========================================================================
-- 1. CREACIÓN DE TABLAS E ÍNDICES (IDEMPOTENTE)
-- =========================================================================

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

-- =========================================================================
-- 2. HABILITAR MOTOR DE ROW LEVEL SECURITY (RLS)
-- =========================================================================
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 3. LIMPIEZA DE POLÍTICAS EXISTENTES (IDEMPOTENCIA)
-- =========================================================================
DROP POLICY IF EXISTS "Permitir lectura pública de productos" ON productos;
DROP POLICY IF EXISTS "Permitir escritura solo a cuenta Administrador" ON productos;
DROP POLICY IF EXISTS "Restringir lectura/escritura directa en cliente para cotizaciones" ON cotizaciones;

-- =========================================================================
-- 4. CREACIÓN DE POLÍTICAS DE SEGURIDAD (UUID: 42a4f12c-f891-42e4-ae35-2aa889711e4a)
-- =========================================================================

-- A. Políticas para la tabla 'productos'
-- Permitir lectura pública a usuarios anónimos y autenticados
CREATE POLICY "Permitir lectura pública de productos" 
ON productos FOR SELECT 
TO anon, authenticated
USING (true);

-- Permitir escritura completa (INSERT, UPDATE, DELETE) SOLO al administrador
CREATE POLICY "Permitir escritura solo a cuenta Administrador" 
ON productos FOR ALL 
TO authenticated
USING (auth.uid() = '42a4f12c-f891-42e4-ae35-2aa889711e4a'::uuid)
WITH CHECK (auth.uid() = '42a4f12c-f891-42e4-ae35-2aa889711e4a'::uuid);

-- B. Políticas para la tabla 'cotizaciones'
-- Restringir lectura y escritura total en el cliente web directo.
-- NOTA: Las llamadas backend (service_role) saltan RLS automáticamente.
CREATE POLICY "Restringir lectura/escritura directa en cliente para cotizaciones" 
ON cotizaciones FOR ALL 
TO authenticated
USING (auth.uid() = '42a4f12c-f891-42e4-ae35-2aa889711e4a'::uuid);
