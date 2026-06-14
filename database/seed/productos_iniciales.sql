-- Semilla inicial de productos para EJ Servicios Mobiliarios
-- Carga los 20 productos correspondientes a la especificación oficial

-- Limpiar productos previos para evitar duplicados
TRUNCATE TABLE productos;

-- Insertar productos del catálogo
INSERT INTO productos (nombre, categoria, descripcion, imagen_url, stock_disponible, orden) VALUES
-- MOBILIARIO
('Sillas de plástico reforzado', 'Mobiliario', 'Sillas apilables elegantes y cómodas, ideales para cualquier tipo de evento social. Capacidad hasta 100 personas.', '/productos/sillas.jpg', 100, 1),
('Tablones de madera', 'Mobiliario', 'Tablones de madera firmes y amplios para armar mesas largas de banquetes. Se combinan con caballetes.', '/productos/tablones.jpg', 10, 2),
('Caballetes de hierro', 'Mobiliario', 'Soportes de hierro resistentes para armar los tablones de forma segura y firme.', '/productos/caballetes.jpg', 20, 3),

-- VAJILLA
('Plato principal', 'Vajilla', 'Plato playo principal de loza blanca clásica, elegante y minimalista para banquetes.', '/productos/plato-principal.jpg', 100, 4),
('Plato de postre', 'Vajilla', 'Plato de postre de loza blanca combinada con el juego principal.', '/productos/plato-postre.jpg', 100, 5),
('Taza de té', 'Vajilla', 'Taza de té de porcelana blanca para la mesa dulce o media tarde.', '/productos/taza-te.jpg', 100, 6),
('Platillo para taza de té', 'Vajilla', 'Platillo a juego para apoyar la taza de té de forma segura.', '/productos/platillo.jpg', 100, 7),
('Tetera de loza', 'Vajilla', 'Tetera clásica para servicio de té en mesa dulce.', '/productos/tetera.jpg', 10, 8),

-- CUBIERTOS
('Cuchillo de mesa', 'Cuchillo', 'Cuchillo de mesa de acero inoxidable con excelente filo y diseño clásico.', '/productos/cuchillo.jpg', 100, 9),
('Tenedor de mesa', 'Cubiertos', 'Tenedor de mesa de acero inoxidable a juego con la cuchillería.', '/productos/tenedor.jpg', 100, 10),
('Cuchara de postre', 'Cubiertos', 'Cuchara de postre de acero inoxidable para la mesa dulce.', '/productos/cuchara-postre.jpg', 100, 11),
('Cucharita de té', 'Cubiertos', 'Cucharita de té para infusión de acero inoxidable.', '/productos/cucharita-te.jpg', 100, 12),

-- CRISTALERÍA
('Copa de vino / agua', 'Cristalería', 'Copa de vidrio transparente y elegante para servir vino, agua o gaseosa.', '/productos/copa-vino.jpg', 100, 13),
('Copa de champagne', 'Cristalería', 'Copa de champagne tipo flauta para el brindis final.', '/productos/copa-champagne.jpg', 100, 14),

-- MANTELERÍA
('Mantelería blanca', 'Mantelería', 'Manteles blancos de tela de alta calidad, listos para vestir tablones de eventos.', '/productos/manteleria-blanca.jpg', 15, 15),
('Mantelería negra', 'Mantelería', 'Manteles negros de tela elegante que brindan un contraste sofisticado.', '/productos/manteleria-negra.jpg', 15, 16),
('Servilletas de tela', 'Mantelería', 'Servilletas de tela suave a juego en color blanco o negro.', '/productos/servilletas.jpg', 100, 17),

-- ACCESORIOS
('Bandeja de mozo', 'Accesorios', 'Bandeja antideslizante profesional para el servicio de mesas.', '/productos/bandeja.jpg', 5, 18),
('Frapera de acero inoxidable', 'Accesorios', 'Frapera elegante para mantener botellas bien frías en la mesa.', '/productos/frapera.jpg', 10, 19),
('Hielera de plástico', 'Accesorios', 'Hielera de plástico para mesa con pinza metálica para servir hielo.', '/productos/hielera.jpg', 10, 20);

-- Corrección rápida de categorías si corresponde (Cuchillo a Cubiertos)
UPDATE productos SET categoria = 'Cubiertos' WHERE nombre = 'Cuchillo de mesa';
