alter table public.reglas_categoria drop constraint if exists reglas_categoria_persona_patron_key;
alter table public.reglas_categoria drop column if exists veces;
