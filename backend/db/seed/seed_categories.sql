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
