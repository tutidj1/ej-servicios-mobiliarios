-- EJ Casa · 0004 · permisos del rol de servicio
-- El proyecto no concede permisos por defecto: el rol service_role (solo servidor) necesita los suyos
-- explícitos para dar de alta cuentas, escribir la auditoría y los tests de armado de datos.
-- Es el único rol que saltea RLS; ningún endpoint que lea datos personales lo usa.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
