-- データタブに表示する表・列の日本語名を設定します。
COMMENT ON TABLE inventory_items IS '品目';
COMMENT ON COLUMN inventory_items.id IS '番号';
COMMENT ON COLUMN inventory_items.name IS '品名';
COMMENT ON COLUMN inventory_items.sku IS '品番';
COMMENT ON COLUMN inventory_items.unit IS '単位';
COMMENT ON COLUMN inventory_items.reorder_point IS '発注点';
COMMENT ON COLUMN inventory_items.notes IS '@long メモ';
COMMENT ON COLUMN inventory_items.created_at IS '登録日時';
COMMENT ON COLUMN inventory_items.deleted_at IS '@hidden';

COMMENT ON TABLE inventory_movements IS '入出庫';
COMMENT ON COLUMN inventory_movements.id IS '番号';
COMMENT ON COLUMN inventory_movements.item_id IS '品目';
COMMENT ON COLUMN inventory_movements.occurred_at IS '日時';
COMMENT ON COLUMN inventory_movements.quantity IS '数量';
COMMENT ON COLUMN inventory_movements.reason IS '理由';
COMMENT ON COLUMN inventory_movements.recorder IS '記録者';
COMMENT ON COLUMN inventory_movements.created_at IS '登録日時';
