# Configuración de Base de Datos (Supabase)

Este directorio contiene los archivos necesarios para configurar tu base de datos relacional de **Supabase (PostgreSQL)**.

## Instrucciones de Setup

1. **Crear tu Proyecto en Supabase**:
   - Registrate en [supabase.com](https://supabase.com) (es totalmente gratuito).
   - Crea un nuevo proyecto llamado `ej-servicios-mobiliarios` o similar.

2. **Crear las Tablas e Índices**:
   - En tu panel de Supabase, ve a la sección **SQL Editor** en la barra lateral izquierda.
   - Crea un nuevo query, copia y pega el contenido del archivo [`database/schema.sql`](./schema.sql) y haz clic en **Run**.
   - Esto creará las tablas `cotizaciones` y `productos`, con todos sus respectivos índices de búsqueda rápida y restricciones.

3. **Cargar los Productos Iniciales (Catálogo)**:
   - En el mismo **SQL Editor**, crea otro query o limpia el anterior.
   - Copia y pega el contenido de [`database/seed/productos_iniciales.sql`](./seed/productos_iniciales.sql) y haz clic en **Run**.
   - Esto dejará cargado todo tu catálogo inicial de 20 productos clasificados en las categorías correspondientes: Mobiliario, Vajilla, Cubiertos, Cristalería, Mantelería y Accesorios.

4. **Obtener las Credenciales del Proyecto**:
   - Ve a **Project Settings** > **API**.
   - Copia la **Project URL** (ejemplo: `https://xxxx.supabase.co`) y la **anon public API key** (ejemplo: `eyJxxx`).
   - Ve a la sección **Project Settings** > **API** o **Database** para obtener la clave secreta `service_role` (usada de forma segura únicamente del lado del servidor de Next.js).
   - Completa el archivo `.env.local` en la carpeta `frontend/` con estos valores reales.

## Actualización 0003 — Panel admin, promo automática y cotizaciones completas

Ejecutar **una sola vez** en **SQL Editor**: [`migrations/0003_admin_promo_cotizaciones.sql`](./migrations/0003_admin_promo_cotizaciones.sql) (es idempotente).

Qué hace:
- Crea la tabla `promo_config` (un único registro) que controla el banner de promoción.
- Agrega a `productos`: `etiqueta_whatsapp` y `cantidad_segun_invitados`. Las categorías son libres: escribís una nueva y aparece sola en la web.
- Agrega a `cotizaciones`: teléfono, código, items por categoría, estado, notas.
- Crea el bucket público `productos` para subir fotos desde el panel.
- Deja las políticas RLS: lectura pública de productos/promo y escritura **solo** para la cuenta administradora.

### Panel de administración
Entrá a `https://tusitio.com/admin` con la cuenta administradora (email y contraseña de Supabase Auth).
Desde ahí podés: ver y gestionar cotizaciones (estado, WhatsApp/llamar al cliente), agregar/editar/ocultar/ordenar productos (con foto) y editar la promo.
El ingreso es con email y contraseña de Supabase Auth (nunca van escritos en el código).
Los cambios se reflejan en la web en menos de 1 minuto.

## Actualización 0007–0013 — Gestión de alquileres (Fase 1)

**No aplicar hasta que Tomás lo apruebe.** Ejecutar en orden en **SQL Editor** (son idempotentes):

| Archivo | Qué hace | ¿Toca datos existentes? |
|---|---|---|
| [`0007_roles.sql`](./migrations/0007_roles.sql) | Tabla `perfiles` (admin / operadora). `es_admin()` pasa a leer esa tabla. La operadora puede ver y cambiar el estado de cotizaciones (no borrarlas). | Solo redefine `es_admin()`; Tomás queda cargado como admin, así que todo sigue igual. |
| [`0008_gestion_nucleo.sql`](./migrations/0008_gestion_nucleo.sql) | Tablas nuevas: `items`, `clientes`, `eventos`, `evento_lineas`, `evento_costos`, `pagos`, `configuracion`. Reglas (precio obligatorio al confirmar, evento cerrado congelado) y RLS solo para el equipo. Precarga los 25 artículos del contrato: sillas 100 y tablones 16; el resto **sin límite** (nunca se limita un alquiler: lo que falta se marca como subalquilado). | No. Solo crea. |
| [`0009_disponibilidad.sql`](./migrations/0009_disponibilidad.sql) | Funciones de stock por día y confirmación con bloqueo (evita reservar dos veces lo mismo). | No. Solo funciones. |
| [`0010_auditoria.sql`](./migrations/0010_auditoria.sql) | Registro de quién cambió qué (eventos, líneas, costos, pagos, clientes). Solo el admin lo lee. | No. |
| [`0011_fix_costos.sql`](./migrations/0011_fix_costos.sql) | Corrección: el disparador de eventos cerrados rechazaba todo costo nuevo. Solo redefine una función. | No. |
| [`0012_locador_en_configuracion.sql`](./migrations/0012_locador_en_configuracion.sql) | Tres columnas vacías para los datos del locador (van en la base, no en el código: el repo es público). | No. |
| [`0013_proteger_eventos_cerrados.sql`](./migrations/0013_proteger_eventos_cerrados.sql) | Un evento cerrado solo lo puede borrar el administrador. Solo agrega un disparador. | No. |

**Vuelta atrás:** [`migrations/rollback/`](./migrations/rollback/), en orden inverso (0013 → 0007). La de 0008 borra todo lo cargado en gestión; exportar antes si ya hay datos reales.

**María Eugenia:** por ahora usa la cuenta de Tomás (admin); no hace falta crearle otra. Si más adelante se quiere una cuenta propia de operadora, está el `INSERT INTO perfiles …` comentado al final de `0007_roles.sql`.

**Prueba automática** (en un Postgres local de prueba, sin tocar Supabase): desde `frontend/`, `npm run test:db`.
