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
