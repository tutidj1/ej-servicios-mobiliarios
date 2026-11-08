alter table public.inversiones drop constraint if exists inversiones_objetivo_fk;
drop table if exists public.objetivo_personal_movimientos, public.objetivos_personales cascade;
drop function if exists casa_aux.objetivo_personal_es_mio(uuid);
