-- Vuelta atrás de la 0014: borra las tablas de la empresa (obligaciones recurrentes y objetivos). No toca nada más.
DROP TABLE IF EXISTS empresa_objetivo_movimientos, empresa_objetivos, empresa_obligacion_pagos, empresa_obligaciones CASCADE;
