-- Give list_items their own category so typed (free-text) items can sort by
-- store shelf order, not just items picked from the product suggestions.
-- Category is resolved at add time on the backend; this column caches it so we
-- don't need a product link (which would collide with UNIQUE(list_id, product_id)).
ALTER TABLE list_items ADD COLUMN category_id TEXT REFERENCES categories(id);

-- Backfill: items already linked to a product inherit that product's category.
UPDATE list_items
   SET category_id = (SELECT p.category_id FROM products p WHERE p.id = list_items.product_id)
 WHERE product_id IS NOT NULL;

-- Backfill: typed items get the category of an exact (case-insensitive) name
-- match against the product catalogue, if one exists.
UPDATE list_items
   SET category_id = (
       SELECT p.category_id FROM products p
        WHERE p.category_id IS NOT NULL
          AND (lower(p.name_de) = lower(list_items.name_override)
            OR lower(p.name_en) = lower(list_items.name_override)
            OR lower(p.name_pt) = lower(list_items.name_override))
        LIMIT 1)
 WHERE product_id IS NULL AND name_override IS NOT NULL AND category_id IS NULL;

-- Backfill remaining typed items via a fuzzy FTS prefix match (the same logic
-- the add handler applies going forward). Quotes are stripped so a stray
-- character can't make the MATCH expression abort the migration. Only names
-- that start with a letter are considered.
UPDATE list_items
   SET category_id = (
       SELECT p.category_id
         FROM products_fts
         JOIN products p ON p.rowid = products_fts.rowid
        WHERE products_fts MATCH
              replace(replace(lower(list_items.name_override), '"', ''), '''', '') || '*'
          AND p.category_id IS NOT NULL
        ORDER BY bm25(products_fts) ASC
        LIMIT 1)
 WHERE product_id IS NULL AND category_id IS NULL
   AND name_override IS NOT NULL
   AND name_override GLOB '[A-Za-zÀ-ÿ]*';
