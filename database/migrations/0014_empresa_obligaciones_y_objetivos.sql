-- =========================================================================
-- 0014 — Empresa: obligaciones recurrentes y objetivos de la familia (base de EJ)
-- Ejecutar en Supabase > SQL Editor del proyecto de EJ (idempotente). Requiere la 0007 (roles) y la 0010 (auditoría).
-- Solo agrega tablas nuevas: no toca ninguna tabla ni dato existente. Vuelta atrás: rollback/0014_empresa_obligaciones_y_objetivos_down.sql
--
-- Son DOS cosas de la EMPRESA (cuenta donde se cobra lo del negocio), distintas de las finanzas personales de EJ Casa
-- (que viven en otro proyecto de Supabase y nunca se mezclan con esto):
--   a) obligaciones recurrentes de la empresa (p. ej. el gasto mensual de campaña de anuncios)
--   b) objetivos que se pone la familia con la plata del negocio (comprar mobiliario nuevo, invertir, etc.)
-- Montos en ENTEROS DE CENTAVOS (bigint), a diferencia de las tablas viejas que guardan pesos. Por eso llevan prefijo "empresa_".
-- Quién ve y edita: el administrador y la operadora (es_staff()).
-- =========================================================================

-- ---- a) Obligaciones recurrentes de la empresa ----
CREATE TABLE IF NOT EXISTS empresa_obligaciones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concepto        TEXT NOT NULL CHECK (length(btrim(concepto)) > 0),
  monto_estimado  BIGINT NOT NULL CHECK (monto_estimado >= 0),               -- centavos
  dia_vencimiento INTEGER NOT NULL CHECK (dia_vencimiento BETWEEN 1 AND 31),
  recurrencia     TEXT NOT NULL DEFAULT 'mensual' CHECK (recurrencia IN ('mensual', 'bimestral', 'anual')),
  activa          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Una fila por obligación y período (mes): estimado vs real
CREATE TABLE IF NOT EXISTS empresa_obligacion_pagos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligacion_id  UUID NOT NULL REFERENCES empresa_obligaciones (id) ON DELETE CASCADE,
  periodo        DATE NOT NULL CHECK (EXTRACT(DAY FROM periodo) = 1),
  monto_real     BIGINT CHECK (monto_real >= 0),                              -- centavos
  fecha_pago     DATE,
  estado         TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (obligacion_id, periodo)
);

-- ---- b) Objetivos de la familia con la plata del negocio ----
CREATE TABLE IF NOT EXISTS empresa_objetivos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          TEXT NOT NULL CHECK (length(btrim(nombre)) > 0),
  meta            BIGINT NOT NULL CHECK (meta > 0),                           -- centavos de la moneda del objetivo
  moneda          TEXT NOT NULL CHECK (moneda IN ('ARS', 'USD')),
  fecha_objetivo  DATE,
  cuenta          TEXT NOT NULL DEFAULT '',                                   -- de qué cuenta sale
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS empresa_objetivo_movimientos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objetivo_id  UUID NOT NULL REFERENCES empresa_objetivos (id) ON DELETE CASCADE,
  monto        BIGINT NOT NULL CHECK (monto > 0),                              -- centavos de "moneda"; el signo lo da "tipo"
  moneda       TEXT NOT NULL CHECK (moneda IN ('ARS', 'USD')),
  tc_del_dia   BIGINT CHECK (tc_del_dia > 0),                                  -- centavos de peso por dólar, del día del movimiento
  tipo         TEXT NOT NULL CHECK (tipo IN ('aporte', 'retiro')),
  -- Solo los retiros: ¿fue inversión para EJ (mobiliario, publicidad) o gasto personal?
  destino      TEXT CHECK (destino IN ('inversion_ej', 'personal')),
  motivo       TEXT NOT NULL DEFAULT '',
  fecha        DATE NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (tipo = 'retiro' OR destino IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_empresa_oblig_pagos_periodo ON empresa_obligacion_pagos (periodo);
CREATE INDEX IF NOT EXISTS idx_empresa_obj_mov_objetivo ON empresa_objetivo_movimientos (objetivo_id, fecha);

-- ---- updated_at ----
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['empresa_obligaciones', 'empresa_obligacion_pagos', 'empresa_objetivos'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON %I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t, t);
  END LOOP;
END $$;

-- ---- Auditoría: quién cambió qué y cuándo (es plata) ----
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['empresa_obligaciones', 'empresa_obligacion_pagos', 'empresa_objetivos', 'empresa_objetivo_movimientos'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_audit ON %I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_audit AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION public.auditar()', t, t);
  END LOOP;
END $$;

-- ---- Seguridad: solo la cuenta del negocio (admin y operadora). Anónimos y cuentas sin rol: nada. ----
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['empresa_obligaciones', 'empresa_obligacion_pagos', 'empresa_objetivos', 'empresa_objetivo_movimientos'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON %I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO authenticated', t);
    EXECUTE format('DROP POLICY IF EXISTS "Empresa solo el negocio" ON %I', t);
    EXECUTE format('CREATE POLICY "Empresa solo el negocio" ON %I FOR ALL TO authenticated USING (public.es_staff()) WITH CHECK (public.es_staff())', t);
  END LOOP;
END $$;
