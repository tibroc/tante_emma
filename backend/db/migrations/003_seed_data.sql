-- ============================================================
-- SEED DATA: categories + 440 products
-- Source: backend/db/seed/ (canonical, takes precedence)
-- ============================================================

-- Fix FTS5 table: 001_initial.sql had product_id UNINDEXED which doesn't
-- exist as a column in the products content table (column is named 'id').
-- Drop and recreate so both fresh and existing dev DBs get the correct schema.
DROP TABLE IF EXISTS products_fts;
CREATE VIRTUAL TABLE products_fts USING fts5(
  name_de, name_en, name_pt, brand,
  content=products,
  content_rowid=rowid
);

-- TanteEmma – Category Seed Data
-- 20 categories with de/en/pt-BR names, emoji icons, and brand colors

INSERT INTO categories (id, name_de, name_en, name_pt, icon, color, sort_order) VALUES
  ('cat_01', 'Obst & Gemüse',      'Fruit & Vegetables', 'Frutas & Legumes',    '🥦', '#22c55e', 1),
  ('cat_02', 'Brot & Backwaren',   'Bread & Bakery',     'Pães & Padaria',      '🍞', '#f59e0b', 2),
  ('cat_03', 'Kühlregal',          'Dairy & Chilled',    'Laticínios & Frios',  '🥛', '#06b6d4', 3),
  ('cat_04', 'Käse',               'Cheese',             'Queijos',             '🧀', '#eab308', 4),
  ('cat_05', 'Fleisch & Wurst',    'Meat & Deli',        'Carnes & Frios',      '🥩', '#ef4444', 5),
  ('cat_06', 'Fisch & Meeresfrüchte', 'Fish & Seafood',  'Peixes & Frutos do Mar', '🐟', '#0ea5e9', 6),
  ('cat_07', 'Tiefkühl',           'Frozen',             'Congelados',          '🧊', '#818cf8', 7),
  ('cat_08', 'Nudeln & Reis',      'Pasta & Rice',       'Massas & Arroz',      '🍝', '#f97316', 8),
  ('cat_09', 'Konserven & Gläser', 'Canned & Jarred',    'Conservas & Vidros',  '🥫', '#84cc16', 9),
  ('cat_10', 'Gewürze & Saucen',   'Spices & Sauces',    'Temperos & Molhos',   '🧂', '#a78bfa', 10),
  ('cat_11', 'Öle & Essig',        'Oils & Vinegar',     'Óleos & Vinagres',    '🫙', '#ca8a04', 11),
  ('cat_12', 'Getränke',           'Beverages',          'Bebidas',             '🥤', '#3b82f6', 12),
  ('cat_13', 'Süßwaren & Snacks',  'Sweets & Snacks',    'Doces & Snacks',      '🍫', '#f43f5e', 13),
  ('cat_14', 'Frühstück & Cerealien', 'Breakfast & Cereals', 'Café da Manhã & Cereais', '🥣', '#fb923c', 14),
  ('cat_15', 'Backen',             'Baking',             'Confeitaria',         '🧁', '#e879f9', 15),
  ('cat_16', 'Hygiene & Pflege',   'Hygiene & Care',     'Higiene & Cuidados',  '🧴', '#d946ef', 16),
  ('cat_17', 'Reinigung & Haushalt', 'Cleaning & Home',  'Limpeza & Casa',      '🧹', '#14b8a6', 17),
  ('cat_18', 'Baby & Kind',        'Baby & Child',       'Bebê & Criança',      '🍼', '#fb7185', 18),
  ('cat_19', 'Tier & Zoo',         'Pet Supplies',       'Animais de Estimação','🐾', '#92400e', 19),
  ('cat_20', 'Sonstiges',          'Other',              'Outros',              '🛒', '#9ca3af', 20);

-- TanteEmma – Product Seed Data
-- ~800 products, curated for German household shopping
-- Columns: id, name_de, name_en, name_pt, brand, barcode, category_id, source, created_at, updated_at

-- Timestamps: 2024-01-01 00:00:00 UTC = 1704067200
-- source = 'builtin' for all seed products

-- ============================================================
-- 🥦 Obst & Gemüse (cat_01)
-- ============================================================
INSERT INTO products (id, name_de, name_en, name_pt, brand, category_id, source, created_at, updated_at) VALUES
  ('p0001', 'Äpfel',                  'Apples',               'Maçãs',                NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0002', 'Bananen',                'Bananas',               'Bananas',              NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0003', 'Orangen',                'Oranges',               'Laranjas',             NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0004', 'Zitronen',               'Lemons',                'Limões',               NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0005', 'Limetten',               'Limes',                 'Limas',                NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0006', 'Clementinen',            'Clementines',           'Clementinas',          NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0007', 'Trauben',                'Grapes',                'Uvas',                 NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0008', 'Erdbeeren',              'Strawberries',          'Morangos',             NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0009', 'Himbeeren',              'Raspberries',           'Framboesas',           NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0010', 'Heidelbeeren',           'Blueberries',           'Mirtilos',             NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0011', 'Birnen',                 'Pears',                 'Peras',                NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0012', 'Pfirsiche',              'Peaches',               'Pêssegos',             NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0013', 'Nektarinen',             'Nectarines',            'Nectarinas',           NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0014', 'Pflaumen',               'Plums',                 'Ameixas',              NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0015', 'Kirschen',               'Cherries',              'Cerejas',              NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0016', 'Melone',                 'Melon',                 'Melão',                NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0017', 'Wassermelone',           'Watermelon',            'Melancia',             NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0018', 'Mango',                  'Mango',                 'Manga',                NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0019', 'Ananas',                 'Pineapple',             'Abacaxi',              NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0020', 'Avocado',                'Avocado',               'Abacate',              NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0021', 'Kiwi',                   'Kiwi',                  'Kiwi',                 NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0022', 'Granatapfel',            'Pomegranate',           'Romã',                 NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0023', 'Papaya',                 'Papaya',                'Mamão',                NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0024', 'Tomaten',                'Tomatoes',              'Tomates',              NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0025', 'Kirschtomaten',          'Cherry Tomatoes',       'Tomates Cereja',       NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0026', 'Gurke',                  'Cucumber',              'Pepino',               NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0027', 'Paprika rot',            'Red Bell Pepper',       'Pimentão Vermelho',    NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0028', 'Paprika gelb',           'Yellow Bell Pepper',    'Pimentão Amarelo',     NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0029', 'Paprika grün',           'Green Bell Pepper',     'Pimentão Verde',       NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0030', 'Zucchini',               'Courgette',             'Abobrinha',            NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0031', 'Aubergine',              'Aubergine',             'Berinjela',            NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0032', 'Brokkoli',               'Broccoli',              'Brócolis',             NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0033', 'Blumenkohl',             'Cauliflower',           'Couve-flor',           NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0034', 'Weißkohl',               'White Cabbage',         'Repolho Branco',       NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0035', 'Rotkohl',                'Red Cabbage',           'Repolho Roxo',         NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0036', 'Spinat',                 'Spinach',               'Espinafre',            NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0037', 'Salat',                  'Lettuce',               'Alface',               NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0038', 'Rucola',                 'Rocket',                'Rúcula',               NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0039', 'Eisbergsalat',           'Iceberg Lettuce',       'Alface Americana',     NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0040', 'Karotten',               'Carrots',               'Cenouras',             NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0041', 'Kartoffeln',             'Potatoes',              'Batatas',              NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0042', 'Süßkartoffeln',          'Sweet Potatoes',        'Batata-doce',          NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0043', 'Zwiebeln',               'Onions',                'Cebolas',              NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0044', 'Rote Zwiebeln',          'Red Onions',            'Cebolas Roxas',        NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0045', 'Knoblauch',              'Garlic',                'Alho',                 NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0046', 'Lauch',                  'Leek',                  'Alho-poró',            NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0047', 'Champignons',            'Mushrooms',             'Cogumelos',            NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0048', 'Ingwer',                 'Ginger',                'Gengibre',             NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0049', 'Frische Petersilie',     'Fresh Parsley',         'Salsinha Fresca',      NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0050', 'Frischer Basilikum',     'Fresh Basil',           'Manjericão Fresco',    NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0051', 'Frischer Koriander',     'Fresh Coriander',       'Coentro Fresco',       NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0052', 'Frischer Thymian',       'Fresh Thyme',           'Tomilho Fresco',       NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0053', 'Mais',                   'Corn',                  'Milho',                NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0054', 'Erbsen',                 'Peas',                  'Ervilhas',             NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0055', 'Frühlingszwiebeln',      'Spring Onions',         'Cebolinha',            NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0056', 'Radieschen',             'Radishes',              'Rabanetes',            NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0057', 'Sellerie',               'Celery',                'Aipo',                 NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0058', 'Fenchel',                'Fennel',                'Funcho',               NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0059', 'Spargel',                'Asparagus',             'Aspargo',              NULL, 'cat_01', 'builtin', 1704067200, 1704067200),
  ('p0060', 'Bio Äpfel',              'Organic Apples',        'Maçãs Orgânicas',      'Demeter', 'cat_01', 'builtin', 1704067200, 1704067200);

-- ============================================================
-- 🍞 Brot & Backwaren (cat_02)
-- ============================================================
INSERT INTO products (id, name_de, name_en, name_pt, brand, category_id, source, created_at, updated_at) VALUES
  ('p0061', 'Vollkornbrot',           'Wholegrain Bread',      'Pão Integral',         NULL, 'cat_02', 'builtin', 1704067200, 1704067200),
  ('p0062', 'Toastbrot',              'Toast Bread',           'Pão de Forma',         NULL, 'cat_02', 'builtin', 1704067200, 1704067200),
  ('p0063', 'Toastbrot Vollkorn',     'Wholegrain Toast',      'Pão de Forma Integral','Harry-Brot', 'cat_02', 'builtin', 1704067200, 1704067200),
  ('p0064', 'Baguette',               'Baguette',              'Baguete',              NULL, 'cat_02', 'builtin', 1704067200, 1704067200),
  ('p0065', 'Ciabatta',               'Ciabatta',              'Ciabatta',             NULL, 'cat_02', 'builtin', 1704067200, 1704067200),
  ('p0066', 'Brötchen',               'Bread Rolls',           'Pãezinhos',            NULL, 'cat_02', 'builtin', 1704067200, 1704067200),
  ('p0067', 'Laugenbrötchen',         'Pretzel Rolls',         'Pãezinhos de Pretzel', NULL, 'cat_02', 'builtin', 1704067200, 1704067200),
  ('p0068', 'Roggenbrot',             'Rye Bread',             'Pão de Centeio',       NULL, 'cat_02', 'builtin', 1704067200, 1704067200),
  ('p0069', 'Pumpernickel',           'Pumpernickel',          'Pumpernickel',         'Mestemacher', 'cat_02', 'builtin', 1704067200, 1704067200),
  ('p0070', 'Knäckebrot',             'Crispbread',            'Pão Crocante',         'Wasa', 'cat_02', 'builtin', 1704067200, 1704067200),
  ('p0071', 'Knäckebrot Vollkorn',    'Wholegrain Crispbread', 'Pão Crocante Integral','Wasa', 'cat_02', 'builtin', 1704067200, 1704067200),
  ('p0072', 'Croissant',              'Croissant',             'Croissant',            NULL, 'cat_02', 'builtin', 1704067200, 1704067200),
  ('p0073', 'Laugenbrezel',           'Pretzel',               'Pretzel',              NULL, 'cat_02', 'builtin', 1704067200, 1704067200),
  ('p0074', 'Dinkelbrötchen',         'Spelt Rolls',           'Pãezinhos de Espelta', NULL, 'cat_02', 'builtin', 1704067200, 1704067200),
  ('p0075', 'Körner-Toast',           'Multigrain Toast',      'Toast Multigrãos',     'Harry-Brot', 'cat_02', 'builtin', 1704067200, 1704067200),
  ('p0076', 'Toastbrot weiß',         'White Toast Bread',     'Pão de Forma Branco',  'Toast n Joy', 'cat_02', 'builtin', 1704067200, 1704067200),
  ('p0077', 'Sandwich-Toast',         'Sandwich Bread',        'Pão para Sanduíche',   'Lieken Urkorn', 'cat_02', 'builtin', 1704067200, 1704067200),
  ('p0078', 'Tortilla Wraps',         'Tortilla Wraps',        'Tortillas',            'Old El Paso', 'cat_02', 'builtin', 1704067200, 1704067200),
  ('p0079', 'Pita Brot',              'Pita Bread',            'Pão Pita',             NULL, 'cat_02', 'builtin', 1704067200, 1704067200),
  ('p0080', 'Naan Brot',              'Naan Bread',            'Pão Naan',             NULL, 'cat_02', 'builtin', 1704067200, 1704067200);

-- ============================================================
-- 🥛 Kühlregal / Dairy & Chilled (cat_03)
-- ============================================================
INSERT INTO products (id, name_de, name_en, name_pt, brand, category_id, source, created_at, updated_at) VALUES
  ('p0081', 'Vollmilch 3,5%',         'Whole Milk 3.5%',       'Leite Integral 3,5%',  NULL, 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0082', 'Fettarme Milch 1,5%',    'Semi-skimmed Milk',     'Leite Semidesnatado',  NULL, 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0083', 'H-Vollmilch 3,5%',       'UHT Whole Milk',        'Leite Longa Vida',     'Weihenstephan', 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0084', 'H-Milch 1,5%',           'UHT Semi-skimmed Milk', 'Leite LS Semidesnatado','Weihenstephan', 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0085', 'Hafermilch',             'Oat Milk',              'Leite de Aveia',       'Oatly', 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0086', 'Hafermilch Barista',     'Oat Milk Barista',      'Leite de Aveia Barista','Oatly', 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0087', 'Mandelmilch',            'Almond Milk',           'Leite de Amêndoa',     'Alpro', 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0088', 'Sojamilch',              'Soy Milk',              'Leite de Soja',        'Alpro', 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0089', 'Kokosmilch Drink',       'Coconut Milk Drink',    'Bebida de Coco',       'Alpro', 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0090', 'Butter',                 'Butter',                'Manteiga',             NULL, 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0091', 'Butter gesalzen',        'Salted Butter',         'Manteiga com Sal',     'Kerrygold', 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0092', 'Kerrygold Butter',       'Kerrygold Butter',      'Manteiga Kerrygold',   'Kerrygold', 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0093', 'Margarine',              'Margarine',             'Margarina',            'Rama', 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0094', 'Pflanzenmargarine',      'Plant Margarine',       'Margarina Vegetal',    'Becel', 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0095', 'Joghurt Natur',          'Natural Yoghurt',       'Iogurte Natural',      NULL, 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0096', 'Joghurt Griechisch',     'Greek Yoghurt',         'Iogurte Grego',        'Fage', 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0097', 'Joghurt Griechisch',     'Greek Yoghurt',         'Iogurte Grego',        'Chobani', 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0098', 'Joghurt Erdbeere',       'Strawberry Yoghurt',    'Iogurte de Morango',   'Müller', 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0099', 'Joghurt Kirsche',        'Cherry Yoghurt',        'Iogurte de Cereja',    'Müller', 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0100', 'Fruchtjoghurt',          'Fruit Yoghurt',         'Iogurte de Frutas',    'Ehrmann', 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0101', 'Skyr Natur',             'Plain Skyr',            'Skyr Natural',         'Arla', 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0102', 'Skyr Vanille',           'Vanilla Skyr',          'Skyr Baunilha',        'Arla', 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0103', 'Quark Mager',            'Low-fat Quark',         'Quark Desnatado',      NULL, 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0104', 'Quark 20% Fett',         'Quark 20% Fat',         'Quark 20% Gordura',    NULL, 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0105', 'Schmand',                'Soured Cream',          'Creme Azedo',          NULL, 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0106', 'Saure Sahne',            'Sour Cream',            'Creme de Leite Azedo', NULL, 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0107', 'Crème fraîche',          'Crème fraîche',         'Creme Fraîche',        NULL, 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0108', 'Schlagsahne',            'Whipping Cream',        'Creme de Leite',       NULL, 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0109', 'Sahne 30%',              'Double Cream 30%',      'Creme 30%',            'Weihenstephan', 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0110', 'Frischkäse Natur',       'Cream Cheese',          'Cream Cheese Natural', 'Philadelphia', 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0111', 'Frischkäse Kräuter',     'Herb Cream Cheese',     'Cream Cheese Ervas',   'Philadelphia', 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0112', 'Frischkäse Natur',       'Cream Cheese',          'Cream Cheese Natural', 'Exquisa', 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0113', 'Eier 10er',              '10 Eggs',               'Ovos cx 10',           NULL, 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0114', 'Eier 6er',               '6 Eggs',                'Ovos cx 6',            NULL, 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0115', 'Bio Eier 10er',          'Organic Eggs 10',       'Ovos Orgânicos cx 10', NULL, 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0116', 'Frisch-Mozzarella',      'Fresh Mozzarella',      'Mozzarella Fresca',    'Galbani', 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0117', 'Hummus Natur',           'Plain Hummus',          'Homus Natural',        'Rewe', 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0118', 'Tzatziki',               'Tzatziki',              'Tzatziki',             NULL, 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0119', 'Orangensaft frisch',     'Fresh Orange Juice',    'Suco de Laranja Fresco',NULL, 'cat_03', 'builtin', 1704067200, 1704067200),
  ('p0120', 'Pudding Vanille',        'Vanilla Pudding',       'Pudim de Baunilha',    'Dr. Oetker', 'cat_03', 'builtin', 1704067200, 1704067200);

-- ============================================================
-- 🧀 Käse (cat_04)
-- ============================================================
INSERT INTO products (id, name_de, name_en, name_pt, brand, category_id, source, created_at, updated_at) VALUES
  ('p0121', 'Gouda jung',             'Young Gouda',           'Gouda Jovem',          NULL, 'cat_04', 'builtin', 1704067200, 1704067200),
  ('p0122', 'Gouda gereift',          'Aged Gouda',            'Gouda Curado',         NULL, 'cat_04', 'builtin', 1704067200, 1704067200),
  ('p0123', 'Edamer',                 'Edam',                  'Queijo Edam',          NULL, 'cat_04', 'builtin', 1704067200, 1704067200),
  ('p0124', 'Emmentaler',             'Emmental',              'Emmental',             NULL, 'cat_04', 'builtin', 1704067200, 1704067200),
  ('p0125', 'Tilsiter',               'Tilsit',                'Queijo Tilsit',        NULL, 'cat_04', 'builtin', 1704067200, 1704067200),
  ('p0126', 'Camembert',              'Camembert',             'Camembert',            'Président', 'cat_04', 'builtin', 1704067200, 1704067200),
  ('p0127', 'Brie',                   'Brie',                  'Brie',                 NULL, 'cat_04', 'builtin', 1704067200, 1704067200),
  ('p0128', 'Parmesan gerieben',      'Grated Parmesan',       'Parmesão Ralado',      'Galbani', 'cat_04', 'builtin', 1704067200, 1704067200),
  ('p0129', 'Parmesan am Stück',      'Parmesan Block',        'Parmesão Inteiro',     'Galbani', 'cat_04', 'builtin', 1704067200, 1704067200),
  ('p0130', 'Mozzarella gerieben',    'Shredded Mozzarella',   'Mozzarella Ralada',    NULL, 'cat_04', 'builtin', 1704067200, 1704067200),
  ('p0131', 'Käse gerieben Pizza',    'Grated Pizza Cheese',   'Queijo Ralado para Pizza', NULL, 'cat_04', 'builtin', 1704067200, 1704067200),
  ('p0132', 'Scheibletten',           'Processed Cheese Slices','Queijo Fatiado',       'Kraft', 'cat_04', 'builtin', 1704067200, 1704067200),
  ('p0133', 'Feta',                   'Feta',                  'Queijo Feta',          NULL, 'cat_04', 'builtin', 1704067200, 1704067200),
  ('p0134', 'Halloumi',               'Halloumi',              'Queijo Halloumi',      NULL, 'cat_04', 'builtin', 1704067200, 1704067200),
  ('p0135', 'Ricotta',                'Ricotta',               'Ricota',               'Galbani', 'cat_04', 'builtin', 1704067200, 1704067200),
  ('p0136', 'Mascarpone',             'Mascarpone',            'Mascarpone',           'Galbani', 'cat_04', 'builtin', 1704067200, 1704067200),
  ('p0137', 'Bergkäse',               'Mountain Cheese',       'Queijo Serrano',       NULL, 'cat_04', 'builtin', 1704067200, 1704067200),
  ('p0138', 'Gruyère',                'Gruyère',               'Gruyère',              NULL, 'cat_04', 'builtin', 1704067200, 1704067200),
  ('p0139', 'Manchego',               'Manchego',              'Manchego',             NULL, 'cat_04', 'builtin', 1704067200, 1704067200),
  ('p0140', 'Babybel',                'Babybel',               'Babybel',              'Babybel', 'cat_04', 'builtin', 1704067200, 1704067200);

-- ============================================================
-- 🥩 Fleisch & Wurst (cat_05)
-- ============================================================
INSERT INTO products (id, name_de, name_en, name_pt, brand, category_id, source, created_at, updated_at) VALUES
  ('p0141', 'Hähnchenbrust',          'Chicken Breast',        'Peito de Frango',      NULL, 'cat_05', 'builtin', 1704067200, 1704067200),
  ('p0142', 'Hähnchenschenkel',       'Chicken Thighs',        'Coxas de Frango',      NULL, 'cat_05', 'builtin', 1704067200, 1704067200),
  ('p0143', 'Ganzes Hähnchen',        'Whole Chicken',         'Frango Inteiro',       NULL, 'cat_05', 'builtin', 1704067200, 1704067200),
  ('p0144', 'Hackfleisch gemischt',   'Mixed Mince',           'Carne Moída Mista',    NULL, 'cat_05', 'builtin', 1704067200, 1704067200),
  ('p0145', 'Rinderhackfleisch',      'Beef Mince',            'Carne Moída Bovina',   NULL, 'cat_05', 'builtin', 1704067200, 1704067200),
  ('p0146', 'Schweineschnitzel',      'Pork Schnitzel',        'Escalope de Porco',    NULL, 'cat_05', 'builtin', 1704067200, 1704067200),
  ('p0147', 'Rindergulasch',          'Beef Goulash',          'Guisado de Carne',     NULL, 'cat_05', 'builtin', 1704067200, 1704067200),
  ('p0148', 'Lammhackfleisch',        'Lamb Mince',            'Carne Moída de Cordeiro', NULL, 'cat_05', 'builtin', 1704067200, 1704067200),
  ('p0149', 'Schweinebauch',          'Pork Belly',            'Barriga de Porco',     NULL, 'cat_05', 'builtin', 1704067200, 1704067200),
  ('p0150', 'Bratwurst',              'Bratwurst Sausages',    'Linguiças Bratwurst',  NULL, 'cat_05', 'builtin', 1704067200, 1704067200),
  ('p0151', 'Wiener Würstchen',       'Frankfurter Sausages',  'Salsichas Frankfurt',  'Böklunder', 'cat_05', 'builtin', 1704067200, 1704067200),
  ('p0152', 'Kochschinken',           'Cooked Ham',            'Presunto Cozido',      NULL, 'cat_05', 'builtin', 1704067200, 1704067200),
  ('p0153', 'Schwarzwälder Schinken', 'Black Forest Ham',      'Presunto Floresta Negra', NULL, 'cat_05', 'builtin', 1704067200, 1704067200),
  ('p0154', 'Salami',                 'Salami',                'Salame',               NULL, 'cat_05', 'builtin', 1704067200, 1704067200),
  ('p0155', 'Lyoner',                 'Lyoner Sausage',        'Mortadela',            NULL, 'cat_05', 'builtin', 1704067200, 1704067200),
  ('p0156', 'Mettwurst',              'Spreadable Sausage',    'Linguiça para Barrar', NULL, 'cat_05', 'builtin', 1704067200, 1704067200),
  ('p0157', 'Leberwurst',             'Liver Pâté',            'Patê de Fígado',       NULL, 'cat_05', 'builtin', 1704067200, 1704067200),
  ('p0158', 'Speck gewürfelt',        'Diced Bacon',           'Bacon em Cubos',       NULL, 'cat_05', 'builtin', 1704067200, 1704067200),
  ('p0159', 'Bacon Streifen',         'Bacon Rashers',         'Fatias de Bacon',      NULL, 'cat_05', 'builtin', 1704067200, 1704067200),
  ('p0160', 'Chorizo',                'Chorizo',               'Chouriço',             NULL, 'cat_05', 'builtin', 1704067200, 1704067200);

-- ============================================================
-- 🐟 Fisch & Meeresfrüchte (cat_06)
-- ============================================================
INSERT INTO products (id, name_de, name_en, name_pt, brand, category_id, source, created_at, updated_at) VALUES
  ('p0161', 'Lachsfilet',             'Salmon Fillet',         'Filé de Salmão',       NULL, 'cat_06', 'builtin', 1704067200, 1704067200),
  ('p0162', 'Räucherlachs',           'Smoked Salmon',         'Salmão Defumado',      NULL, 'cat_06', 'builtin', 1704067200, 1704067200),
  ('p0163', 'Thunfisch in Dosen',     'Canned Tuna',           'Atum em Lata',         'Followfish', 'cat_06', 'builtin', 1704067200, 1704067200),
  ('p0164', 'Thunfisch in Dosen',     'Canned Tuna',           'Atum em Lata',         'Rio Mare', 'cat_06', 'builtin', 1704067200, 1704067200),
  ('p0165', 'Sardinen in Öl',         'Sardines in Oil',       'Sardinhas em Azeite',  NULL, 'cat_06', 'builtin', 1704067200, 1704067200),
  ('p0166', 'Garnelen',               'Prawns',                'Camarões',             NULL, 'cat_06', 'builtin', 1704067200, 1704067200),
  ('p0167', 'Kabeljaufilet',          'Cod Fillet',            'Filé de Bacalhau',     NULL, 'cat_06', 'builtin', 1704067200, 1704067200),
  ('p0168', 'Forelle',                'Trout',                 'Truta',                NULL, 'cat_06', 'builtin', 1704067200, 1704067200),
  ('p0169', 'Hering in Sahnesauce',   'Herring in Cream',      'Arenque em Creme',     'Appel', 'cat_06', 'builtin', 1704067200, 1704067200),
  ('p0170', 'Matjes',                 'Matjes Herring',        'Arenque Matjes',       NULL, 'cat_06', 'builtin', 1704067200, 1704067200);

-- ============================================================
-- 🧊 Tiefkühl (cat_07)
-- ============================================================
INSERT INTO products (id, name_de, name_en, name_pt, brand, category_id, source, created_at, updated_at) VALUES
  ('p0171', 'Tiefkühl-Erbsen',        'Frozen Peas',           'Ervilhas Congeladas',  'iglo', 'cat_07', 'builtin', 1704067200, 1704067200),
  ('p0172', 'Tiefkühl-Spinat',        'Frozen Spinach',        'Espinafre Congelado',  'iglo', 'cat_07', 'builtin', 1704067200, 1704067200),
  ('p0173', 'Tiefkühl-Brokkoli',      'Frozen Broccoli',       'Brócolis Congelado',   NULL, 'cat_07', 'builtin', 1704067200, 1704067200),
  ('p0174', 'Tiefkühl-Gemüsemix',     'Frozen Veg Mix',        'Mix de Legumes Cong.', 'iglo', 'cat_07', 'builtin', 1704067200, 1704067200),
  ('p0175', 'Tiefkühl-Pommes',        'Frozen Fries',          'Batatas Fritas Cong.', 'McCain', 'cat_07', 'builtin', 1704067200, 1704067200),
  ('p0176', 'Tiefkühl-Lachs',         'Frozen Salmon',         'Salmão Congelado',     'iglo', 'cat_07', 'builtin', 1704067200, 1704067200),
  ('p0177', 'Fischstäbchen',          'Fish Fingers',          'Palitos de Peixe',     'iglo', 'cat_07', 'builtin', 1704067200, 1704067200),
  ('p0178', 'Tiefkühl-Pizza Salami',  'Frozen Pizza Salami',   'Pizza Congelada Salame','Dr. Oetker', 'cat_07', 'builtin', 1704067200, 1704067200),
  ('p0179', 'Tiefkühl-Pizza Margherita','Frozen Pizza Margherita','Pizza Margherita Cong.','Dr. Oetker', 'cat_07', 'builtin', 1704067200, 1704067200),
  ('p0180', 'Steinofen-Pizza',        'Stone Baked Pizza',     'Pizza Assada em Pedra', 'Gustavo Gusto', 'cat_07', 'builtin', 1704067200, 1704067200),
  ('p0181', 'Tiefkühl-Beeren-Mix',    'Frozen Berry Mix',      'Mix de Frutas Verm. Cong.', NULL, 'cat_07', 'builtin', 1704067200, 1704067200),
  ('p0182', 'Tiefkühl-Mango',         'Frozen Mango',          'Manga Congelada',      NULL, 'cat_07', 'builtin', 1704067200, 1704067200),
  ('p0183', 'Tiefkühl-Hähnchen',      'Frozen Chicken',        'Frango Congelado',     NULL, 'cat_07', 'builtin', 1704067200, 1704067200),
  ('p0184', 'Tiefkühl-Garnelen',      'Frozen Prawns',         'Camarões Congelados',  NULL, 'cat_07', 'builtin', 1704067200, 1704067200),
  ('p0185', 'Eis Vanille',            'Vanilla Ice Cream',     'Sorvete de Baunilha',  'Häagen-Dazs', 'cat_07', 'builtin', 1704067200, 1704067200),
  ('p0186', 'Eis Schokolade',         'Chocolate Ice Cream',   'Sorvete de Chocolate', 'Ben & Jerry''s', 'cat_07', 'builtin', 1704067200, 1704067200),
  ('p0187', 'Eis Cookie Dough',       'Cookie Dough Ice Cream','Sorvete Cookie Dough', 'Ben & Jerry''s', 'cat_07', 'builtin', 1704067200, 1704067200),
  ('p0188', 'Eis Erdbeer',            'Strawberry Ice Cream',  'Sorvete de Morango',   'Mövenpick', 'cat_07', 'builtin', 1704067200, 1704067200),
  ('p0189', 'Magnum Classic',         'Magnum Classic',        'Magnum Classic',       'Magnum', 'cat_07', 'builtin', 1704067200, 1704067200),
  ('p0190', 'Tiefkühl-Croissants',    'Frozen Croissants',     'Croissants Congelados','Bonne Maman', 'cat_07', 'builtin', 1704067200, 1704067200);

-- ============================================================
-- 🍝 Nudeln & Reis (cat_08)
-- ============================================================
INSERT INTO products (id, name_de, name_en, name_pt, brand, category_id, source, created_at, updated_at) VALUES
  ('p0191', 'Spaghetti',              'Spaghetti',             'Espaguete',            'Barilla', 'cat_08', 'builtin', 1704067200, 1704067200),
  ('p0192', 'Penne',                  'Penne',                 'Penne',                'Barilla', 'cat_08', 'builtin', 1704067200, 1704067200),
  ('p0193', 'Fusilli',                'Fusilli',               'Fusilli',              'Barilla', 'cat_08', 'builtin', 1704067200, 1704067200),
  ('p0194', 'Tagliatelle',            'Tagliatelle',           'Tagliatelle',          'Barilla', 'cat_08', 'builtin', 1704067200, 1704067200),
  ('p0195', 'Rigatoni',               'Rigatoni',              'Rigatoni',             'Barilla', 'cat_08', 'builtin', 1704067200, 1704067200),
  ('p0196', 'Farfalle',               'Farfalle',              'Farfalle',             'Barilla', 'cat_08', 'builtin', 1704067200, 1704067200),
  ('p0197', 'Lasagneplatten',         'Lasagne Sheets',        'Lasanha',              'Barilla', 'cat_08', 'builtin', 1704067200, 1704067200),
  ('p0198', 'Vollkornspaghetti',      'Wholegrain Spaghetti',  'Espaguete Integral',   'Barilla', 'cat_08', 'builtin', 1704067200, 1704067200),
  ('p0199', 'Nudeln Spaghetti',       'Spaghetti',             'Espaguete',            'De Cecco', 'cat_08', 'builtin', 1704067200, 1704067200),
  ('p0200', 'Reis Langkorn',          'Long Grain Rice',       'Arroz Agulha',         NULL, 'cat_08', 'builtin', 1704067200, 1704067200),
  ('p0201', 'Basmati Reis',           'Basmati Rice',          'Arroz Basmati',        NULL, 'cat_08', 'builtin', 1704067200, 1704067200),
  ('p0202', 'Jasmin Reis',            'Jasmine Rice',          'Arroz Jasmim',         NULL, 'cat_08', 'builtin', 1704067200, 1704067200),
  ('p0203', 'Vollkorn Reis',          'Brown Rice',            'Arroz Integral',       NULL, 'cat_08', 'builtin', 1704067200, 1704067200),
  ('p0204', 'Risotto Reis',           'Risotto Rice',          'Arroz para Risoto',    NULL, 'cat_08', 'builtin', 1704067200, 1704067200),
  ('p0205', 'Couscous',               'Couscous',              'Cuscuz',               NULL, 'cat_08', 'builtin', 1704067200, 1704067200),
  ('p0206', 'Quinoa',                 'Quinoa',                'Quinoa',               NULL, 'cat_08', 'builtin', 1704067200, 1704067200),
  ('p0207', 'Bulgur',                 'Bulgur',                'Bulgur',               NULL, 'cat_08', 'builtin', 1704067200, 1704067200),
  ('p0208', 'Reisnudeln',             'Rice Noodles',          'Macarrão de Arroz',    NULL, 'cat_08', 'builtin', 1704067200, 1704067200),
  ('p0209', 'Glasnudeln',             'Glass Noodles',         'Macarrão de Vidro',    NULL, 'cat_08', 'builtin', 1704067200, 1704067200),
  ('p0210', 'Mie Nudeln',             'Mie Noodles',           'Macarrão Mie',         NULL, 'cat_08', 'builtin', 1704067200, 1704067200),
  ('p0211', 'Gnocchi',                'Gnocchi',               'Nhoque',               NULL, 'cat_08', 'builtin', 1704067200, 1704067200),
  ('p0212', 'Polenta',                'Polenta',               'Polenta',              NULL, 'cat_08', 'builtin', 1704067200, 1704067200),
  ('p0213', 'Linsen rot',             'Red Lentils',           'Lentilhas Vermelhas',  NULL, 'cat_08', 'builtin', 1704067200, 1704067200),
  ('p0214', 'Linsen grün',            'Green Lentils',         'Lentilhas Verdes',     NULL, 'cat_08', 'builtin', 1704067200, 1704067200),
  ('p0215', 'Kichererbsen getrocknet','Dried Chickpeas',       'Grão-de-bico Seco',    NULL, 'cat_08', 'builtin', 1704067200, 1704067200);

-- ============================================================
-- 🥫 Konserven & Gläser (cat_09)
-- ============================================================
INSERT INTO products (id, name_de, name_en, name_pt, brand, category_id, source, created_at, updated_at) VALUES
  ('p0216', 'Tomaten gehackt',        'Chopped Tomatoes',      'Tomates Picados',      'Mutti', 'cat_09', 'builtin', 1704067200, 1704067200),
  ('p0217', 'Tomaten passiert',       'Passata',               'Molho de Tomate',      'Mutti', 'cat_09', 'builtin', 1704067200, 1704067200),
  ('p0218', 'Tomatenmark',            'Tomato Purée',          'Extrato de Tomate',    NULL, 'cat_09', 'builtin', 1704067200, 1704067200),
  ('p0219', 'Kichererbsen Dose',      'Canned Chickpeas',      'Grão-de-bico em Lata', NULL, 'cat_09', 'builtin', 1704067200, 1704067200),
  ('p0220', 'Kidneybohnen Dose',      'Canned Kidney Beans',   'Feijão Kidney em Lata',NULL, 'cat_09', 'builtin', 1704067200, 1704067200),
  ('p0221', 'Weiße Bohnen Dose',      'Canned White Beans',    'Feijão Branco em Lata',NULL, 'cat_09', 'builtin', 1704067200, 1704067200),
  ('p0222', 'Mais Dose',              'Canned Sweetcorn',      'Milho em Lata',        NULL, 'cat_09', 'builtin', 1704067200, 1704067200),
  ('p0223', 'Erbsen Dose',            'Canned Peas',           'Ervilhas em Lata',     NULL, 'cat_09', 'builtin', 1704067200, 1704067200),
  ('p0224', 'Linsen Dose',            'Canned Lentils',        'Lentilhas em Lata',    NULL, 'cat_09', 'builtin', 1704067200, 1704067200),
  ('p0225', 'Kokosmilch',             'Coconut Milk',          'Leite de Coco',        'Aroy-D', 'cat_09', 'builtin', 1704067200, 1704067200),
  ('p0226', 'Tomatensuppe',           'Tomato Soup',           'Sopa de Tomate',       'Campbell''s', 'cat_09', 'builtin', 1704067200, 1704067200),
  ('p0227', 'Gemüsebrühe Glas',       'Vegetable Stock Jar',   'Caldo de Legumes Vidro',NULL, 'cat_09', 'builtin', 1704067200, 1704067200),
  ('p0228', 'Oliven grün',            'Green Olives',          'Azeitonas Verdes',     NULL, 'cat_09', 'builtin', 1704067200, 1704067200),
  ('p0229', 'Oliven schwarz',         'Black Olives',          'Azeitonas Pretas',     NULL, 'cat_09', 'builtin', 1704067200, 1704067200),
  ('p0230', 'Kapern',                 'Capers',                'Alcaparras',           NULL, 'cat_09', 'builtin', 1704067200, 1704067200),
  ('p0231', 'Artischockenherzen',     'Artichoke Hearts',      'Corações de Alcachofra',NULL, 'cat_09', 'builtin', 1704067200, 1704067200),
  ('p0232', 'Sonnengetrocknete Tomaten','Sun-dried Tomatoes',  'Tomates Secos',        NULL, 'cat_09', 'builtin', 1704067200, 1704067200),
  ('p0233', 'Apfelmus',               'Apple Sauce',           'Compota de Maçã',      'Zwergenwiese', 'cat_09', 'builtin', 1704067200, 1704067200),
  ('p0234', 'Erdnussbutter',          'Peanut Butter',         'Pasta de Amendoim',    'Whole Earth', 'cat_09', 'builtin', 1704067200, 1704067200),
  ('p0235', 'Marmelade Erdbeere',     'Strawberry Jam',        'Geleia de Morango',    'Bonne Maman', 'cat_09', 'builtin', 1704067200, 1704067200),
  ('p0236', 'Marmelade Aprikose',     'Apricot Jam',           'Geleia de Damasco',    'Bonne Maman', 'cat_09', 'builtin', 1704067200, 1704067200),
  ('p0237', 'Honig',                  'Honey',                 'Mel',                  'Langnese', 'cat_09', 'builtin', 1704067200, 1704067200),
  ('p0238', 'Nuss-Nougat-Creme',      'Hazelnut Spread',       'Creme de Avelã',       'Nutella', 'cat_09', 'builtin', 1704067200, 1704067200),
  ('p0239', 'Nuss-Nougat-Creme',      'Hazelnut Spread',       'Creme de Avelã',       'Nutoka', 'cat_09', 'builtin', 1704067200, 1704067200),
  ('p0240', 'Tahini',                 'Tahini',                'Tahine',               NULL, 'cat_09', 'builtin', 1704067200, 1704067200);

-- ============================================================
-- 🧂 Gewürze & Saucen (cat_10)
-- ============================================================
INSERT INTO products (id, name_de, name_en, name_pt, brand, category_id, source, created_at, updated_at) VALUES
  ('p0241', 'Salz',                   'Salt',                  'Sal',                  NULL, 'cat_10', 'builtin', 1704067200, 1704067200),
  ('p0242', 'Meersalz',               'Sea Salt',              'Sal Marinho',          'Alnatura', 'cat_10', 'builtin', 1704067200, 1704067200),
  ('p0243', 'Pfeffer gemahlen',        'Ground Pepper',         'Pimenta Moída',        NULL, 'cat_10', 'builtin', 1704067200, 1704067200),
  ('p0244', 'Pfeffer ganz',           'Whole Peppercorns',     'Pimenta em Grão',      NULL, 'cat_10', 'builtin', 1704067200, 1704067200),
  ('p0245', 'Paprikapulver süß',      'Sweet Paprika',         'Páprica Doce',         NULL, 'cat_10', 'builtin', 1704067200, 1704067200),
  ('p0246', 'Paprikapulver scharf',   'Hot Paprika',           'Páprica Picante',      NULL, 'cat_10', 'builtin', 1704067200, 1704067200),
  ('p0247', 'Kreuzkümmel',            'Cumin',                 'Cominho',              NULL, 'cat_10', 'builtin', 1704067200, 1704067200),
  ('p0248', 'Kurkuma',                'Turmeric',              'Açafrão-da-terra',     NULL, 'cat_10', 'builtin', 1704067200, 1704067200),
  ('p0249', 'Zimt gemahlen',          'Ground Cinnamon',       'Canela em Pó',         NULL, 'cat_10', 'builtin', 1704067200, 1704067200),
  ('p0250', 'Oregano getrocknet',     'Dried Oregano',         'Orégano Seco',         NULL, 'cat_10', 'builtin', 1704067200, 1704067200),
  ('p0251', 'Thymian getrocknet',     'Dried Thyme',           'Tomilho Seco',         NULL, 'cat_10', 'builtin', 1704067200, 1704067200),
  ('p0252', 'Basilikum getrocknet',   'Dried Basil',           'Manjericão Seco',      NULL, 'cat_10', 'builtin', 1704067200, 1704067200),
  ('p0253', 'Curry Pulver',           'Curry Powder',          'Curry em Pó',          NULL, 'cat_10', 'builtin', 1704067200, 1704067200),
  ('p0254', 'Korianderpulver',        'Ground Coriander',      'Coentro em Pó',        NULL, 'cat_10', 'builtin', 1704067200, 1704067200),
  ('p0255', 'Chilipulver',            'Chilli Powder',         'Pimenta Chili em Pó',  NULL, 'cat_10', 'builtin', 1704067200, 1704067200),
  ('p0256', 'Chiliflocken',           'Chilli Flakes',         'Flocos de Chili',      NULL, 'cat_10', 'builtin', 1704067200, 1704067200),
  ('p0257', 'Ketchup',                'Ketchup',               'Ketchup',              'Heinz', 'cat_10', 'builtin', 1704067200, 1704067200),
  ('p0258', 'Senf mittelscharf',      'Medium Mustard',        'Mostarda Média',       'Thomy', 'cat_10', 'builtin', 1704067200, 1704067200),
  ('p0259', 'Dijon Senf',             'Dijon Mustard',         'Mostarda Dijon',       'Maille', 'cat_10', 'builtin', 1704067200, 1704067200),
  ('p0260', 'Mayonnaise',             'Mayonnaise',            'Maionese',             'Hellmann''s', 'cat_10', 'builtin', 1704067200, 1704067200),
  ('p0261', 'Sojasauce',              'Soy Sauce',             'Molho de Soja',        'Kikkoman', 'cat_10', 'builtin', 1704067200, 1704067200),
  ('p0262', 'Worcestershire Sauce',   'Worcestershire Sauce',  'Molho Inglês',         'Lea & Perrins', 'cat_10', 'builtin', 1704067200, 1704067200),
  ('p0263', 'Sriracha',               'Sriracha',              'Sriracha',             'Huy Fong', 'cat_10', 'builtin', 1704067200, 1704067200),
  ('p0264', 'Tabasco',                'Tabasco',               'Tabasco',              'Tabasco', 'cat_10', 'builtin', 1704067200, 1704067200),
  ('p0265', 'Pestosoße grün',         'Green Pesto',           'Pesto Verde',          'Barilla', 'cat_10', 'builtin', 1704067200, 1704067200),
  ('p0266', 'Pestosoße rot',          'Red Pesto',             'Pesto Vermelho',       'Barilla', 'cat_10', 'builtin', 1704067200, 1704067200),
  ('p0267', 'Bolognese Sauce',        'Bolognese Sauce',       'Molho Bolonhesa',      'Barilla', 'cat_10', 'builtin', 1704067200, 1704067200),
  ('p0268', 'Tomatensauce',           'Tomato Sauce',          'Molho de Tomate',      'Aldi', 'cat_10', 'builtin', 1704067200, 1704067200),
  ('p0269', 'Gemüsebrühe Pulver',     'Veg Stock Powder',      'Caldo de Legumes em Pó','Knorr', 'cat_10', 'builtin', 1704067200, 1704067200),
  ('p0270', 'Hühnerbrühe Pulver',     'Chicken Stock Powder',  'Caldo de Galinha',     'Knorr', 'cat_10', 'builtin', 1704067200, 1704067200);

-- ============================================================
-- 🫙 Öle & Essig (cat_11)
-- ============================================================
INSERT INTO products (id, name_de, name_en, name_pt, brand, category_id, source, created_at, updated_at) VALUES
  ('p0271', 'Olivenöl',               'Olive Oil',             'Azeite de Oliva',      'Bertolli', 'cat_11', 'builtin', 1704067200, 1704067200),
  ('p0272', 'Olivenöl nativ extra',   'Extra Virgin Olive Oil','Azeite Extra Virgem',  'Oliviers & Co', 'cat_11', 'builtin', 1704067200, 1704067200),
  ('p0273', 'Sonnenblumenöl',         'Sunflower Oil',         'Óleo de Girassol',     NULL, 'cat_11', 'builtin', 1704067200, 1704067200),
  ('p0274', 'Rapsöl',                 'Rapeseed Oil',          'Óleo de Canola',       NULL, 'cat_11', 'builtin', 1704067200, 1704067200),
  ('p0275', 'Kokosöl',                'Coconut Oil',           'Óleo de Coco',         NULL, 'cat_11', 'builtin', 1704067200, 1704067200),
  ('p0276', 'Sesamöl',                'Sesame Oil',            'Óleo de Gergelim',     NULL, 'cat_11', 'builtin', 1704067200, 1704067200),
  ('p0277', 'Weißweinessig',          'White Wine Vinegar',    'Vinagre de Vinho Branco',NULL, 'cat_11', 'builtin', 1704067200, 1704067200),
  ('p0278', 'Rotweinessig',           'Red Wine Vinegar',      'Vinagre de Vinho Tinto',NULL, 'cat_11', 'builtin', 1704067200, 1704067200),
  ('p0279', 'Balsamico',              'Balsamic Vinegar',      'Vinagre Balsâmico',    'Mazzetti', 'cat_11', 'builtin', 1704067200, 1704067200),
  ('p0280', 'Apfelessig',             'Apple Cider Vinegar',   'Vinagre de Maçã',      'Bragg', 'cat_11', 'builtin', 1704067200, 1704067200);

-- ============================================================
-- 🥤 Getränke (cat_12)
-- ============================================================
INSERT INTO products (id, name_de, name_en, name_pt, brand, category_id, source, created_at, updated_at) VALUES
  ('p0281', 'Wasser still 1,5L',      'Still Water 1.5L',      'Água sem Gás 1,5L',    'Evian', 'cat_12', 'builtin', 1704067200, 1704067200),
  ('p0282', 'Wasser still 1,5L',      'Still Water 1.5L',      'Água sem Gás 1,5L',    'Volvic', 'cat_12', 'builtin', 1704067200, 1704067200),
  ('p0283', 'Wasser medium 1,5L',     'Sparkling Water 1.5L',  'Água com Gás Leve 1,5L','Adelholzener', 'cat_12', 'builtin', 1704067200, 1704067200),
  ('p0284', 'Wasser sprudel 1,5L',    'Sparkling Water 1.5L',  'Água com Gás 1,5L',    'Gerolsteiner', 'cat_12', 'builtin', 1704067200, 1704067200),
  ('p0285', 'Cola 1,5L',              'Cola 1.5L',             'Cola 1,5L',            'Coca-Cola', 'cat_12', 'builtin', 1704067200, 1704067200),
  ('p0286', 'Cola Zero 1,5L',         'Cola Zero 1.5L',        'Cola Zero 1,5L',       'Coca-Cola', 'cat_12', 'builtin', 1704067200, 1704067200),
  ('p0287', 'Cola 1,5L',              'Cola 1.5L',             'Cola 1,5L',            'Pepsi', 'cat_12', 'builtin', 1704067200, 1704067200),
  ('p0288', 'Orangenlimo',            'Orange Soda',           'Refrigerante de Laranja','Fanta', 'cat_12', 'builtin', 1704067200, 1704067200),
  ('p0289', 'Zitronenlimo',           'Lemon Soda',            'Refrigerante de Limão', 'Sprite', 'cat_12', 'builtin', 1704067200, 1704067200),
  ('p0290', 'Orangensaft 1L',         'Orange Juice 1L',       'Suco de Laranja 1L',   'Tropicana', 'cat_12', 'builtin', 1704067200, 1704067200),
  ('p0291', 'Apfelsaft 1L',           'Apple Juice 1L',        'Suco de Maçã 1L',      NULL, 'cat_12', 'builtin', 1704067200, 1704067200),
  ('p0292', 'Multivitaminsaft',       'Multivitamin Juice',    'Suco Multivitamínico', 'Hohes C', 'cat_12', 'builtin', 1704067200, 1704067200),
  ('p0293', 'Energy Drink',           'Energy Drink',          'Energético',           'Red Bull', 'cat_12', 'builtin', 1704067200, 1704067200),
  ('p0294', 'Energy Drink Sugar Free','Energy Drink Sugar Free','Energético Sem Açúcar','Red Bull', 'cat_12', 'builtin', 1704067200, 1704067200),
  ('p0295', 'Kaffee gemahlen',        'Ground Coffee',         'Café Moído',           'Jacobs', 'cat_12', 'builtin', 1704067200, 1704067200),
  ('p0296', 'Kaffee gemahlen',        'Ground Coffee',         'Café Moído',           'Tchibo', 'cat_12', 'builtin', 1704067200, 1704067200),
  ('p0297', 'Kaffee ganze Bohne',     'Coffee Beans',          'Café em Grão',         'Lavazza', 'cat_12', 'builtin', 1704067200, 1704067200),
  ('p0298', 'Espresso Kapseln',       'Espresso Capsules',     'Cápsulas de Espresso', 'Nespresso', 'cat_12', 'builtin', 1704067200, 1704067200),
  ('p0299', 'Instantkaffee',          'Instant Coffee',        'Café Instantâneo',     'Nescafé', 'cat_12', 'builtin', 1704067200, 1704067200),
  ('p0300', 'Schwarzer Tee',          'Black Tea',             'Chá Preto',            'Teekanne', 'cat_12', 'builtin', 1704067200, 1704067200),
  ('p0301', 'Grüner Tee',             'Green Tea',             'Chá Verde',            'Teekanne', 'cat_12', 'builtin', 1704067200, 1704067200),
  ('p0302', 'Kamillentee',            'Camomile Tea',          'Chá de Camomila',      'Teekanne', 'cat_12', 'builtin', 1704067200, 1704067200),
  ('p0303', 'Pfefferminztee',         'Peppermint Tea',        'Chá de Hortelã-pimenta','Teekanne', 'cat_12', 'builtin', 1704067200, 1704067200),
  ('p0304', 'Bier Pils 6er',          'Lager Beer 6-pack',     'Cerveja Pilsen 6un',   'Warsteiner', 'cat_12', 'builtin', 1704067200, 1704067200),
  ('p0305', 'Bier Pils 6er',          'Lager Beer 6-pack',     'Cerveja Pilsen 6un',   'Bitburger', 'cat_12', 'builtin', 1704067200, 1704067200),
  ('p0306', 'Weißbier 6er',           'Wheat Beer 6-pack',     'Cerveja de Trigo 6un', 'Paulaner', 'cat_12', 'builtin', 1704067200, 1704067200),
  ('p0307', 'Rotwein',                'Red Wine',              'Vinho Tinto',          NULL, 'cat_12', 'builtin', 1704067200, 1704067200),
  ('p0308', 'Weißwein',               'White Wine',            'Vinho Branco',         NULL, 'cat_12', 'builtin', 1704067200, 1704067200),
  ('p0309', 'Sekt',                   'Sparkling Wine',        'Espumante',            'Rotkäppchen', 'cat_12', 'builtin', 1704067200, 1704067200),
  ('p0310', 'Kakao',                  'Cocoa Drink',           'Achocolatado',         'Nesquik', 'cat_12', 'builtin', 1704067200, 1704067200);

-- ============================================================
-- 🍫 Süßwaren & Snacks (cat_13)
-- ============================================================
INSERT INTO products (id, name_de, name_en, name_pt, brand, category_id, source, created_at, updated_at) VALUES
  ('p0311', 'Schokolade Vollmilch',   'Milk Chocolate',        'Chocolate ao Leite',   'Milka', 'cat_13', 'builtin', 1704067200, 1704067200),
  ('p0312', 'Schokolade Nuss',        'Nut Chocolate',         'Chocolate com Avelã',  'Milka', 'cat_13', 'builtin', 1704067200, 1704067200),
  ('p0313', 'Schokolade Zartbitter',  'Dark Chocolate',        'Chocolate Amargo',     'Lindt', 'cat_13', 'builtin', 1704067200, 1704067200),
  ('p0314', 'Schokolade Excellence',  'Excellence Dark Chocolate','Chocolate Excellence','Lindt', 'cat_13', 'builtin', 1704067200, 1704067200),
  ('p0315', 'Kinderschokolade',       'Kinder Chocolate',      'Kinder Chocolate',     'Ferrero', 'cat_13', 'builtin', 1704067200, 1704067200),
  ('p0316', 'Kinder Riegel',          'Kinder Bueno',          'Kinder Bueno',         'Ferrero', 'cat_13', 'builtin', 1704067200, 1704067200),
  ('p0317', 'Raffaello',              'Raffaello',             'Raffaello',            'Ferrero', 'cat_13', 'builtin', 1704067200, 1704067200),
  ('p0318', 'Rocher',                 'Rocher',                'Rocher',               'Ferrero', 'cat_13', 'builtin', 1704067200, 1704067200),
  ('p0319', 'Snickers',               'Snickers',              'Snickers',             'Mars', 'cat_13', 'builtin', 1704067200, 1704067200),
  ('p0320', 'Twix',                   'Twix',                  'Twix',                 'Mars', 'cat_13', 'builtin', 1704067200, 1704067200),
  ('p0321', 'Mars',                   'Mars Bar',              'Mars',                 'Mars', 'cat_13', 'builtin', 1704067200, 1704067200),
  ('p0322', 'Haribo Goldbären',       'Haribo Gold Bears',     'Haribo Ursinhos',      'Haribo', 'cat_13', 'builtin', 1704067200, 1704067200),
  ('p0323', 'Haribo Happy Cola',      'Haribo Happy Cola',     'Haribo Happy Cola',    'Haribo', 'cat_13', 'builtin', 1704067200, 1704067200),
  ('p0324', 'Haribo Starmix',         'Haribo Starmix',        'Haribo Starmix',       'Haribo', 'cat_13', 'builtin', 1704067200, 1704067200),
  ('p0325', 'Chips Paprika',          'Paprika Crisps',        'Batata Chips Páprica', 'Lay''s', 'cat_13', 'builtin', 1704067200, 1704067200),
  ('p0326', 'Chips Salzig',           'Salted Crisps',         'Batata Chips Salgada', 'Pringles', 'cat_13', 'builtin', 1704067200, 1704067200),
  ('p0327', 'Pringles Original',      'Pringles Original',     'Pringles Original',    'Pringles', 'cat_13', 'builtin', 1704067200, 1704067200),
  ('p0328', 'Popcorn',                'Popcorn',               'Pipoca',               NULL, 'cat_13', 'builtin', 1704067200, 1704067200),
  ('p0329', 'Nüsse Mix',              'Mixed Nuts',            'Mix de Nozes',         NULL, 'cat_13', 'builtin', 1704067200, 1704067200),
  ('p0330', 'Cashewkerne',            'Cashew Nuts',           'Castanha de Caju',     NULL, 'cat_13', 'builtin', 1704067200, 1704067200),
  ('p0331', 'Mandeln',                'Almonds',               'Amêndoas',             NULL, 'cat_13', 'builtin', 1704067200, 1704067200),
  ('p0332', 'Walnüsse',               'Walnuts',               'Nozes',                NULL, 'cat_13', 'builtin', 1704067200, 1704067200),
  ('p0333', 'Reiswaffeln',            'Rice Cakes',            'Bolacha de Arroz',     NULL, 'cat_13', 'builtin', 1704067200, 1704067200),
  ('p0334', 'Leibniz Kekse',          'Butter Biscuits',       'Biscoitos de Manteiga','Bahlsen', 'cat_13', 'builtin', 1704067200, 1704067200),
  ('p0335', 'Oreo',                   'Oreo',                  'Oreo',                 'Oreo', 'cat_13', 'builtin', 1704067200, 1704067200),
  ('p0336', 'Prinzenrolle',           'Prinzenrolle',          'Biscoito Recheado',    'Bahlsen', 'cat_13', 'builtin', 1704067200, 1704067200),
  ('p0337', 'Gummibärchen',           'Gummy Bears',           'Ursinhos de Gelatina', NULL, 'cat_13', 'builtin', 1704067200, 1704067200),
  ('p0338', 'Schokoriegel',           'Chocolate Bar',         'Barra de Chocolate',   'KitKat', 'cat_13', 'builtin', 1704067200, 1704067200),
  ('p0339', 'Trolli Erdbeeren',       'Trolli Strawberries',   'Trolli Morangos',      'Trolli', 'cat_13', 'builtin', 1704067200, 1704067200),
  ('p0340', 'Müsliriegel',            'Cereal Bar',            'Barrinha de Cereal',   'Corny', 'cat_13', 'builtin', 1704067200, 1704067200);

-- ============================================================
-- 🥣 Frühstück & Cerealien (cat_14)
-- ============================================================
INSERT INTO products (id, name_de, name_en, name_pt, brand, category_id, source, created_at, updated_at) VALUES
  ('p0341', 'Haferflocken zart',      'Porridge Oats',         'Flocos de Aveia Finos','Kölln', 'cat_14', 'builtin', 1704067200, 1704067200),
  ('p0342', 'Haferflocken kernig',    'Jumbo Oats',            'Flocos de Aveia Grossos','Kölln', 'cat_14', 'builtin', 1704067200, 1704067200),
  ('p0343', 'Müsli',                  'Muesli',                'Müsli',                'Seitenbacher', 'cat_14', 'builtin', 1704067200, 1704067200),
  ('p0344', 'Granola',                'Granola',               'Granola',              NULL, 'cat_14', 'builtin', 1704067200, 1704067200),
  ('p0345', 'Cornflakes',             'Cornflakes',            'Cornflakes',           'Kellogg''s', 'cat_14', 'builtin', 1704067200, 1704067200),
  ('p0346', 'Frosties',               'Frosties',              'Sucrilhos',            'Kellogg''s', 'cat_14', 'builtin', 1704067200, 1704067200),
  ('p0347', 'Cini Minis',             'Cini Minis',            'Cini Minis',           'Nestlé', 'cat_14', 'builtin', 1704067200, 1704067200),
  ('p0348', 'Smacks',                 'Smacks',                'Smacks',               'Kellogg''s', 'cat_14', 'builtin', 1704067200, 1704067200),
  ('p0349', 'Fitness Müsli',          'Fitness Muesli',        'Müsli Fitness',        'Nestlé', 'cat_14', 'builtin', 1704067200, 1704067200),
  ('p0350', 'Zucker',                 'Sugar',                 'Açúcar',               NULL, 'cat_14', 'builtin', 1704067200, 1704067200),
  ('p0351', 'Brauner Zucker',         'Brown Sugar',           'Açúcar Mascavo',       NULL, 'cat_14', 'builtin', 1704067200, 1704067200),
  ('p0352', 'Ahornsirup',             'Maple Syrup',           'Xarope de Bordo',      NULL, 'cat_14', 'builtin', 1704067200, 1704067200),
  ('p0353', 'Agavendicksaft',         'Agave Syrup',           'Xarope de Agave',      NULL, 'cat_14', 'builtin', 1704067200, 1704067200);

-- ============================================================
-- 🧁 Backen (cat_15)
-- ============================================================
INSERT INTO products (id, name_de, name_en, name_pt, brand, category_id, source, created_at, updated_at) VALUES
  ('p0354', 'Mehl Type 405',          'Plain Flour',           'Farinha de Trigo',     NULL, 'cat_15', 'builtin', 1704067200, 1704067200),
  ('p0355', 'Mehl Type 550',          'Strong Flour',          'Farinha de Trigo Forte',NULL, 'cat_15', 'builtin', 1704067200, 1704067200),
  ('p0356', 'Vollkornmehl',           'Wholemeal Flour',       'Farinha Integral',     NULL, 'cat_15', 'builtin', 1704067200, 1704067200),
  ('p0357', 'Dinkelmehl',             'Spelt Flour',           'Farinha de Espelta',   NULL, 'cat_15', 'builtin', 1704067200, 1704067200),
  ('p0358', 'Backpulver',             'Baking Powder',         'Fermento em Pó',       'Dr. Oetker', 'cat_15', 'builtin', 1704067200, 1704067200),
  ('p0359', 'Natron',                 'Bicarbonate of Soda',   'Bicarbonato de Sódio', NULL, 'cat_15', 'builtin', 1704067200, 1704067200),
  ('p0360', 'Trockenhefe',            'Dried Yeast',           'Fermento Seco',        'Dr. Oetker', 'cat_15', 'builtin', 1704067200, 1704067200),
  ('p0361', 'Vanillezucker',          'Vanilla Sugar',         'Açúcar de Baunilha',   'Dr. Oetker', 'cat_15', 'builtin', 1704067200, 1704067200),
  ('p0362', 'Vanilleextrakt',         'Vanilla Extract',       'Extrato de Baunilha',  NULL, 'cat_15', 'builtin', 1704067200, 1704067200),
  ('p0363', 'Kakaopulver',            'Cocoa Powder',          'Cacau em Pó',          'Dr. Oetker', 'cat_15', 'builtin', 1704067200, 1704067200),
  ('p0364', 'Schokostreusel',         'Chocolate Sprinkles',   'Granulado de Chocolate',NULL, 'cat_15', 'builtin', 1704067200, 1704067200),
  ('p0365', 'Puderzucker',            'Icing Sugar',           'Açúcar de Confeiteiro',NULL, 'cat_15', 'builtin', 1704067200, 1704067200),
  ('p0366', 'Mandeln gemahlen',       'Ground Almonds',        'Amêndoas Moídas',      NULL, 'cat_15', 'builtin', 1704067200, 1704067200),
  ('p0367', 'Stärke',                 'Cornflour',             'Amido de Milho',       'Mondamin', 'cat_15', 'builtin', 1704067200, 1704067200),
  ('p0368', 'Zartbitter Chips',       'Dark Chocolate Chips',  'Gotas de Chocolate',   'Dr. Oetker', 'cat_15', 'builtin', 1704067200, 1704067200),
  ('p0369', 'Kokosflocken',           'Desiccated Coconut',    'Coco Ralado',          NULL, 'cat_15', 'builtin', 1704067200, 1704067200),
  ('p0370', 'Rosinen',                'Raisins',               'Uvas-passas',          NULL, 'cat_15', 'builtin', 1704067200, 1704067200);

-- ============================================================
-- 🧴 Hygiene & Pflege (cat_16)
-- ============================================================
INSERT INTO products (id, name_de, name_en, name_pt, brand, category_id, source, created_at, updated_at) VALUES
  ('p0371', 'Shampoo Normal',         'Shampoo Normal',        'Shampoo Normal',       'Elvital', 'cat_16', 'builtin', 1704067200, 1704067200),
  ('p0372', 'Shampoo Fett',           'Shampoo Oily Hair',     'Shampoo Cabelo Oleoso','Head & Shoulders', 'cat_16', 'builtin', 1704067200, 1704067200),
  ('p0373', 'Conditioner',            'Conditioner',           'Condicionador',        'Elvital', 'cat_16', 'builtin', 1704067200, 1704067200),
  ('p0374', 'Duschgel',               'Shower Gel',            'Gel de Banho',         'Dove', 'cat_16', 'builtin', 1704067200, 1704067200),
  ('p0375', 'Duschgel',               'Shower Gel',            'Gel de Banho',         'Nivea', 'cat_16', 'builtin', 1704067200, 1704067200),
  ('p0376', 'Seife',                  'Hand Soap',             'Sabonete',             'Dove', 'cat_16', 'builtin', 1704067200, 1704067200),
  ('p0377', 'Flüssigseife',           'Liquid Hand Soap',      'Sabonete Líquido',     'Palmolive', 'cat_16', 'builtin', 1704067200, 1704067200),
  ('p0378', 'Deodorant Damen',        'Deodorant Women',       'Desodorante Feminino', 'Nivea', 'cat_16', 'builtin', 1704067200, 1704067200),
  ('p0379', 'Deodorant Herren',       'Deodorant Men',         'Desodorante Masculino','Axe', 'cat_16', 'builtin', 1704067200, 1704067200),
  ('p0380', 'Zahnpasta',              'Toothpaste',            'Creme Dental',         'Colgate', 'cat_16', 'builtin', 1704067200, 1704067200),
  ('p0381', 'Zahnpasta Whitening',    'Whitening Toothpaste',  'Creme Dental Clareador','Blend-a-med', 'cat_16', 'builtin', 1704067200, 1704067200),
  ('p0382', 'Zahnbürste',             'Toothbrush',            'Escova de Dentes',     'Oral-B', 'cat_16', 'builtin', 1704067200, 1704067200),
  ('p0383', 'Mundwasser',             'Mouthwash',             'Enxaguante Bucal',     'Listerine', 'cat_16', 'builtin', 1704067200, 1704067200),
  ('p0384', 'Rasiergel',              'Shaving Gel',           'Gel de Barbear',       'Gillette', 'cat_16', 'builtin', 1704067200, 1704067200),
  ('p0385', 'Rasierklingen',          'Razor Blades',          'Lâminas de Barbear',   'Gillette', 'cat_16', 'builtin', 1704067200, 1704067200),
  ('p0386', 'Tagescreme',             'Day Cream',             'Creme de Dia',         'Nivea', 'cat_16', 'builtin', 1704067200, 1704067200),
  ('p0387', 'Sonnencreme LSF 50',     'SPF 50 Sunscreen',      'Protetor Solar FPS 50','Nivea', 'cat_16', 'builtin', 1704067200, 1704067200),
  ('p0388', 'Damenbinden',            'Sanitary Towels',       'Absorvente',           'Always', 'cat_16', 'builtin', 1704067200, 1704067200),
  ('p0389', 'Tampons',                'Tampons',               'Tampões',              'ob', 'cat_16', 'builtin', 1704067200, 1704067200),
  ('p0390', 'Toilettenpapier 8er',    'Toilet Paper 8-pack',   'Papel Higiênico 8un',  'Hakle', 'cat_16', 'builtin', 1704067200, 1704067200),
  ('p0391', 'Toilettenpapier 3-lagig','3-ply Toilet Paper',    'Papel Higiênico 3 Cam.','Zewa', 'cat_16', 'builtin', 1704067200, 1704067200),
  ('p0392', 'Taschentücher',          'Tissues',               'Lenços de Papel',      'Tempo', 'cat_16', 'builtin', 1704067200, 1704067200),
  ('p0393', 'Wattepads',              'Cotton Pads',           'Disco de Algodão',     NULL, 'cat_16', 'builtin', 1704067200, 1704067200),
  ('p0394', 'Q-Tips',                 'Cotton Buds',           'Cotonetes',            'Q-tips', 'cat_16', 'builtin', 1704067200, 1704067200),
  ('p0395', 'Kondome',                'Condoms',               'Preservativos',        'Durex', 'cat_16', 'builtin', 1704067200, 1704067200);

-- ============================================================
-- 🧹 Reinigung & Haushalt (cat_17)
-- ============================================================
INSERT INTO products (id, name_de, name_en, name_pt, brand, category_id, source, created_at, updated_at) VALUES
  ('p0396', 'Spülmittel',             'Washing-up Liquid',     'Detergente de Louça',  'Fairy', 'cat_17', 'builtin', 1704067200, 1704067200),
  ('p0397', 'Spülmittel',             'Washing-up Liquid',     'Detergente de Louça',  'Pril', 'cat_17', 'builtin', 1704067200, 1704067200),
  ('p0398', 'Spülmaschinentabs',      'Dishwasher Tablets',    'Pastilhas Lava-louças','Finish', 'cat_17', 'builtin', 1704067200, 1704067200),
  ('p0399', 'Waschmittel flüssig',    'Liquid Laundry Detergent','Deterg. Roupa Líquido','Ariel', 'cat_17', 'builtin', 1704067200, 1704067200),
  ('p0400', 'Waschmittel Pulver',     'Washing Powder',        'Detergente Roupa Pó',  'Persil', 'cat_17', 'builtin', 1704067200, 1704067200),
  ('p0401', 'Weichspüler',            'Fabric Softener',       'Amaciante de Roupas',  'Lenor', 'cat_17', 'builtin', 1704067200, 1704067200),
  ('p0402', 'Allzweckreiniger',       'All-purpose Cleaner',   'Limpador Multiuso',    'Ajax', 'cat_17', 'builtin', 1704067200, 1704067200),
  ('p0403', 'Badreiniger',            'Bathroom Cleaner',      'Limpa-Banheiro',       'Meister Proper', 'cat_17', 'builtin', 1704067200, 1704067200),
  ('p0404', 'WC Reiniger',            'Toilet Cleaner',        'Limpador de Vaso',     'WC-Frisch', 'cat_17', 'builtin', 1704067200, 1704067200),
  ('p0405', 'Glasreiniger',           'Glass Cleaner',         'Limpa-Vidros',         'Sidolin', 'cat_17', 'builtin', 1704067200, 1704067200),
  ('p0406', 'Küchen-Einwegtücher',    'Kitchen Roll',          'Papel de Cozinha',     'Zewa', 'cat_17', 'builtin', 1704067200, 1704067200),
  ('p0407', 'Müllbeutel 35L',         'Bin Bags 35L',          'Sacos de Lixo 35L',    NULL, 'cat_17', 'builtin', 1704067200, 1704067200),
  ('p0408', 'Müllbeutel 70L',         'Bin Bags 70L',          'Sacos de Lixo 70L',    NULL, 'cat_17', 'builtin', 1704067200, 1704067200),
  ('p0409', 'Alufolie',               'Aluminium Foil',        'Papel Alumínio',       NULL, 'cat_17', 'builtin', 1704067200, 1704067200),
  ('p0410', 'Frischhaltefolie',       'Cling Film',            'Filme PVC',            NULL, 'cat_17', 'builtin', 1704067200, 1704067200),
  ('p0411', 'Backpapier',             'Baking Paper',          'Papel Manteiga',       NULL, 'cat_17', 'builtin', 1704067200, 1704067200),
  ('p0412', 'Gefrierbeutel',          'Freezer Bags',          'Sacos para Freezer',   NULL, 'cat_17', 'builtin', 1704067200, 1704067200),
  ('p0413', 'Schwamm',                'Sponge',                'Esponja',              NULL, 'cat_17', 'builtin', 1704067200, 1704067200),
  ('p0414', 'Geschirrtücher',         'Tea Towels',            'Panos de Prato',       NULL, 'cat_17', 'builtin', 1704067200, 1704067200),
  ('p0415', 'Batterien AA',           'AA Batteries',          'Pilhas AA',            'Duracell', 'cat_17', 'builtin', 1704067200, 1704067200),
  ('p0416', 'Batterien AAA',          'AAA Batteries',         'Pilhas AAA',           'Duracell', 'cat_17', 'builtin', 1704067200, 1704067200);

-- ============================================================
-- 🍼 Baby & Kind (cat_18)
-- ============================================================
INSERT INTO products (id, name_de, name_en, name_pt, brand, category_id, source, created_at, updated_at) VALUES
  ('p0417', 'Windeln Gr. 3',          'Nappies Size 3',        'Fraldas Tam. 3',       'Pampers', 'cat_18', 'builtin', 1704067200, 1704067200),
  ('p0418', 'Windeln Gr. 4',          'Nappies Size 4',        'Fraldas Tam. 4',       'Pampers', 'cat_18', 'builtin', 1704067200, 1704067200),
  ('p0419', 'Windeln Gr. 5',          'Nappies Size 5',        'Fraldas Tam. 5',       'Pampers', 'cat_18', 'builtin', 1704067200, 1704067200),
  ('p0420', 'Feuchttücher Baby',      'Baby Wipes',            'Lenços Umedecidos Baby','Pampers', 'cat_18', 'builtin', 1704067200, 1704067200),
  ('p0421', 'Babybrei Karotte',       'Baby Purée Carrot',     'Papinha de Cenoura',   'HiPP', 'cat_18', 'builtin', 1704067200, 1704067200),
  ('p0422', 'Babymilch Pre',          'Baby Formula Pre',      'Leite Infantil 0-6m',  'HiPP', 'cat_18', 'builtin', 1704067200, 1704067200),
  ('p0423', 'Babymilch 1',            'Baby Formula Stage 1',  'Leite Infantil 1',     'Aptamil', 'cat_18', 'builtin', 1704067200, 1704067200),
  ('p0424', 'Kindershampoo',          'Kids Shampoo',          'Shampoo Infantil',     'Johnson''s', 'cat_18', 'builtin', 1704067200, 1704067200),
  ('p0425', 'Kinderzahncreme',        'Kids Toothpaste',       'Creme Dental Infantil','Elmex', 'cat_18', 'builtin', 1704067200, 1704067200),
  ('p0426', 'Lunchbox Snack',         'Lunchbox Snack',        'Lanche para Lancheira','Capri-Sun', 'cat_18', 'builtin', 1704067200, 1704067200);

-- ============================================================
-- 🐾 Tier & Zoo (cat_19)
-- ============================================================
INSERT INTO products (id, name_de, name_en, name_pt, brand, category_id, source, created_at, updated_at) VALUES
  ('p0427', 'Katzenfutter nass',      'Wet Cat Food',          'Ração Úmida para Gato','Whiskas', 'cat_19', 'builtin', 1704067200, 1704067200),
  ('p0428', 'Katzenfutter trocken',   'Dry Cat Food',          'Ração Seca para Gato', 'Whiskas', 'cat_19', 'builtin', 1704067200, 1704067200),
  ('p0429', 'Katzenfutter nass',      'Wet Cat Food',          'Ração Úmida para Gato','Felix', 'cat_19', 'builtin', 1704067200, 1704067200),
  ('p0430', 'Hundefutter nass',       'Wet Dog Food',          'Ração Úmida para Cão', 'Pedigree', 'cat_19', 'builtin', 1704067200, 1704067200),
  ('p0431', 'Hundefutter trocken',    'Dry Dog Food',          'Ração Seca para Cão',  'Pedigree', 'cat_19', 'builtin', 1704067200, 1704067200),
  ('p0432', 'Hundesnacks',            'Dog Treats',            'Petisco para Cão',     'Pedigree', 'cat_19', 'builtin', 1704067200, 1704067200),
  ('p0433', 'Katzenstreu',            'Cat Litter',            'Areia para Gatos',     'Catsan', 'cat_19', 'builtin', 1704067200, 1704067200),
  ('p0434', 'Vogelfutter',            'Bird Seed',             'Ração para Pássaros',  NULL, 'cat_19', 'builtin', 1704067200, 1704067200);

-- ============================================================
-- 🛒 Sonstiges (cat_20)
-- ============================================================
INSERT INTO products (id, name_de, name_en, name_pt, brand, category_id, source, created_at, updated_at) VALUES
  ('p0435', 'Briefumschläge',         'Envelopes',             'Envelopes',            NULL, 'cat_20', 'builtin', 1704067200, 1704067200),
  ('p0436', 'Tüte groß',              'Large Carrier Bag',     'Sacola Grande',        NULL, 'cat_20', 'builtin', 1704067200, 1704067200),
  ('p0437', 'Streichhölzer',          'Matches',               'Fósforos',             NULL, 'cat_20', 'builtin', 1704067200, 1704067200),
  ('p0438', 'Kerzen',                 'Candles',               'Velas',                NULL, 'cat_20', 'builtin', 1704067200, 1704067200),
  ('p0439', 'Ibuprofen 400',          'Ibuprofen 400',         'Ibuprofeno 400',       'Ratiopharm', 'cat_20', 'builtin', 1704067200, 1704067200),
  ('p0440', 'Paracetamol 500',        'Paracetamol 500',       'Paracetamol 500',      NULL, 'cat_20', 'builtin', 1704067200, 1704067200);

-- ============================================================
-- FTS5 INDEX REBUILD (run after all inserts)
-- ============================================================
INSERT INTO products_fts(products_fts) VALUES('rebuild');


-- ============================================================
-- FTS5 TRIGGERS  (maintain products_fts after the initial rebuild)
-- ============================================================

CREATE TRIGGER IF NOT EXISTS products_ai AFTER INSERT ON products BEGIN
  INSERT INTO products_fts(rowid, name_de, name_en, name_pt, brand)
  VALUES (new.rowid, new.name_de, new.name_en, new.name_pt, new.brand);
END;

CREATE TRIGGER IF NOT EXISTS products_ad AFTER DELETE ON products BEGIN
  INSERT INTO products_fts(products_fts, rowid, name_de, name_en, name_pt, brand)
  VALUES ('delete', old.rowid, old.name_de, old.name_en, old.name_pt, old.brand);
END;

CREATE TRIGGER IF NOT EXISTS products_au AFTER UPDATE ON products BEGIN
  INSERT INTO products_fts(products_fts, rowid, name_de, name_en, name_pt, brand)
  VALUES ('delete', old.rowid, old.name_de, old.name_en, old.name_pt, old.brand);
  INSERT INTO products_fts(rowid, name_de, name_en, name_pt, brand)
  VALUES (new.rowid, new.name_de, new.name_en, new.name_pt, new.brand);
END;
