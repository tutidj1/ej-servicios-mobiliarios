# Base de datos de EJ Casa

Proyecto de Supabase **separado** del de EJ (variables `CASA_*` en `frontend/.env.local`).
Nada de esto se aplica al proyecto del negocio.

- `migraciones/` se aplican en orden con `npm run casa:migrar` (desde `frontend/`).
- `rollback/` tiene la vuelta atrás de cada migración (mismo número), para aplicar a mano.
- Montos siempre en **enteros de centavos** (`bigint`). La cotización (`tc_del_dia`) va en centavos de peso por dólar.
- Cada tabla tiene RLS activado y forzado, políticas explícitas y permisos explícitos
  (el proyecto no expone tablas por defecto). `anon` no tiene permiso sobre nada.
- Los helpers de las políticas viven en el esquema `casa_aux`, que la API no expone.
- `npm run casa:test` corre el test de privacidad contra el proyecto CASA.
