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
