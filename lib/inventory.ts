import { getDatabase } from "./db";

export interface Item {
  id: number;
  name: string;
  sku: string;
  unit: string;
  reorder_point: string;
  notes: string;
  stock: string;
}

export interface Movement {
  id: number;
  item_id: number;
  name: string;
  sku: string;
  unit: string;
  deleted: boolean;
  occurred_at: Date;
  quantity: string;
  reason: string;
  recorder: string;
}

export async function listItems(search = ""): Promise<Item[]> {
  const result = await getDatabase().query<Item>(`
    SELECT i.id, i.name, i.sku, i.unit, i.reorder_point, i.notes,
           COALESCE(SUM(m.quantity), 0)::text AS stock
    FROM inventory_items i
    LEFT JOIN inventory_movements m ON m.item_id = i.id
    WHERE i.deleted_at IS NULL
      AND ($1 = '' OR strpos(lower(i.name || ' ' || i.sku || ' ' || i.notes), lower($1)) > 0)
    GROUP BY i.id
    ORDER BY i.sku, i.id
  `, [search]);
  return result.rows;
}

export async function listMovements(limit?: number): Promise<Movement[]> {
  const result = await getDatabase().query<Movement>(`
    SELECT m.id, m.item_id, i.name, i.sku, i.unit, i.deleted_at IS NOT NULL AS deleted,
           m.occurred_at, m.quantity, m.reason, m.recorder
    FROM inventory_movements m JOIN inventory_items i ON i.id = m.item_id
    ORDER BY m.occurred_at DESC, m.id DESC
    LIMIT $1
  `, [limit ?? null]);
  return result.rows;
}

export function formatQuantity(value: string | number) {
  return new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 3 }).format(Number(value));
}

export function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(value);
}
