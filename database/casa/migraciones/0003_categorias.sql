-- EJ Casa · 0003 · las nueve categorías iniciales (spec, "Categorías y clasificación")
insert into public.categorias (nombre, tipo_defecto, orden) values
  ('Impuestos y servicios',           'fijo_obligatorio',   1),
  ('Escuela y club de los chicos',    'fijo_obligatorio',   2),
  ('Cuotas y financiación',           'fijo_obligatorio',   3),
  ('Comida y supermercado',           'variable_necesario', 4),
  ('Transporte y nafta',              'variable_necesario', 5),
  ('Salud y farmacia',                'variable_necesario', 6),
  ('Transferencias a los hijos',      'variable_necesario', 7),
  ('Hogar y mantenimiento',           'variable_necesario', 8),
  ('Salidas, ropa y regalos',         'discrecional',       9)
on conflict (nombre) do nothing;
