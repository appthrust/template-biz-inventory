import { encodeCsv, itemHeaders } from "@/lib/csv";
import { formatDate, listItems, listMovements } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const type = new URL(request.url).searchParams.get("type") ?? "stock";
  if (!["stock", "history", "template"].includes(type)) return new Response("書き出しの種類が正しくありません。", { status: 400 });
  try {
    let rows: (string | number)[][];
    if (type === "template") {
      rows = [itemHeaders, ["クリアファイル", "OFF-003", "枚", 20, "文具棚に保管"]];
    } else if (type === "history") {
      const movements = await listMovements();
      rows = [["日時（日本時間）", "名前", "品番", "単位", "数量±", "理由", "記録者名", "品目の状態"],
        ...movements.map((m) => [formatDate(m.occurred_at), m.name, m.sku, m.unit, Number(m.quantity), m.reason, m.recorder, m.deleted ? "削除済み" : "使用中"])];
    } else {
      const items = await listItems();
      rows = [[...itemHeaders, "在庫数", "状態"],
        ...items.map((item) => [item.name, item.sku, item.unit, Number(item.reorder_point), item.notes, Number(item.stock), Number(item.stock) < Number(item.reorder_point) ? "発注点割れ" : "通常"])];
    }
    return new Response(encodeCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="inventory-${type}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Inventory export failed", error instanceof Error ? error.message : "unknown error");
    return new Response("書き出しできませんでした。時間をおいてもう一度お試しください。", { status: 503 });
  }
}
