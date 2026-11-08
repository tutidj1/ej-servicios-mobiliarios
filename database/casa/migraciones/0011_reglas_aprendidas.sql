-- EJ Casa · 0011 · reglas de categoría aprendidas (privadas de cada persona)
-- "Si tres veces corrigieron que Carrefour es comida, la regla queda guardada y la cuarta vez no pregunta."
-- La regla cuenta cuántas veces se confirmó esa categoría para esa palabra; se aplica sola desde la tercera.

alter table public.reglas_categoria
  add column veces integer not null default 1 check (veces >= 1);

-- Una regla por palabra y persona
alter table public.reglas_categoria
  add constraint reglas_categoria_persona_patron_key unique (persona_id, patron);
