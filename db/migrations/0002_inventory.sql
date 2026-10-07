CREATE TABLE IF NOT EXISTS inventory_items (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(120) NOT NULL CHECK (btrim(name) <> ''),
  sku VARCHAR(60) NOT NULL UNIQUE CHECK (btrim(sku) <> ''),
  unit VARCHAR(20) NOT NULL CHECK (btrim(unit) <> ''),
  reorder_point NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (reorder_point >= 0),
  notes VARCHAR(2000) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES inventory_items(id),
  occurred_at TIMESTAMPTZ NOT NULL,
  quantity NUMERIC(12,3) NOT NULL CHECK (quantity <> 0),
  reason VARCHAR(300) NOT NULL CHECK (btrim(reason) <> ''),
  recorder VARCHAR(80) NOT NULL CHECK (btrim(recorder) <> ''),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inventory_movements_item_id_idx ON inventory_movements(item_id);
CREATE INDEX IF NOT EXISTS inventory_movements_occurred_at_idx ON inventory_movements(occurred_at DESC, id DESC);

-- Only rows created by this migration receive opening stock. Reapplying it does
-- not duplicate stock or recreate deleted sample items (deletion is logical).
WITH seeded AS (
  INSERT INTO inventory_items (name, sku, unit, reorder_point, notes)
  SELECT * FROM (VALUES
    ('コピー用紙 A4', 'OFF-001', '冊', 10, '共用棚の上段に保管'),
    ('ボールペン 黒', 'OFF-002', '本', 20, '来客用にも使用'),
    ('梱包テープ', 'PKG-001', '巻', 5, '発送作業用')
  ) AS examples(name, sku, unit, reorder_point, notes)
  WHERE NOT EXISTS (SELECT 1 FROM inventory_items)
  ON CONFLICT (sku) DO NOTHING
  RETURNING id, sku
)
INSERT INTO inventory_movements (item_id, occurred_at, quantity, reason, recorder)
SELECT id, NOW(), CASE sku WHEN 'OFF-001' THEN 24 WHEN 'OFF-002' THEN 8 ELSE 12 END,
       '開始時の棚卸', '総務担当'
FROM seeded;
