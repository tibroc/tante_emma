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
