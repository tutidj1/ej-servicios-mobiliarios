-- 1. Habilitar el motor de Row Level Security (RLS) en las tablas críticas
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICAS PARA LA TABLA: productos
-- Permitir lectura (SELECT) a cualquier usuario de la web de forma anónima
CREATE POLICY "Permitir lectura pública de productos" 
ON productos FOR SELECT 
TO anon, authenticated
USING (true);

-- Permitir escritura completa (INSERT, UPDATE, DELETE) SOLO a tu cuenta de Google (Admin)
-- Nota: Reemplaza '00000000-0000-0000-0000-000000000000' por tu UUID real de la tabla auth.users de Supabase
CREATE POLICY "Permitir escritura solo a cuenta Administrador" 
ON productos FOR ALL 
TO authenticated
USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);


-- 3. POLÍTICAS PARA LA TABLA: cotizaciones
-- Restringir lectura y escritura total en el cliente web directo.
-- NOTA TÉCNICA: Las llamadas desde las API Routes (backend) que usan la clave 'service_role' 
-- saltan RLS automáticamente, por lo que la inserción de cotizaciones seguirá funcionando sin problemas.
CREATE POLICY "Restringir lectura/escritura directa en cliente para cotizaciones" 
ON cotizaciones FOR ALL 
TO authenticated
USING (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
