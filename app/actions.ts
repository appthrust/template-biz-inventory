"use server";

import { revalidatePath } from "next/cache";
import { getDatabase } from "@/lib/db";
import { itemHeaders, parseCsv } from "@/lib/csv";
import { InputError, identifier, itemInput, occurredAt, quantity, text, type ActionState } from "@/lib/validation";

async function mutate(work: () => Promise<string>): Promise<ActionState> {
  try {
    const success = await work();
    revalidatePath("/");
    return { success };
  } catch (error) {
    if (error instanceof InputError) return { error: error.message };
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return { error: "この品番は使われています（削除済みの品目を含みます）。別の品番にしてください。" };
    }
    console.error("Inventory write failed", error instanceof Error ? error.message : "unknown error");
    return { error: "保存できませんでした。入力内容を控え、時間をおいてもう一度お試しください。" };
  }
}

export async function saveItem(_state: ActionState, form: FormData): Promise<ActionState> {
  return mutate(async () => {
    const item = itemInput({ name: form.get("name"), sku: form.get("sku"), unit: form.get("unit"), reorder_point: form.get("reorder_point"), notes: form.get("notes") });
    const values = [item.name, item.sku, item.unit, item.reorder_point, item.notes];
    if (form.get("id")) {
      const id = identifier(form.get("id"));
      const result = await getDatabase().query(`
        UPDATE inventory_items SET name=$1, sku=$2, unit=$3, reorder_point=$4, notes=$5
        WHERE id=$6 AND deleted_at IS NULL
      `, [...values, id]);
      if (!result.rowCount) throw new InputError("この品目は削除されています。一覧を読み込み直してください。");
    } else {
      await getDatabase().query("INSERT INTO inventory_items (name, sku, unit, reorder_point, notes) VALUES ($1,$2,$3,$4,$5)", values);
    }
    return "品目を保存しました。";
  });
}

export async function deleteItem(_state: ActionState, form: FormData): Promise<ActionState> {
  return mutate(async () => {
    const id = identifier(form.get("id"));
    const confirmation = text(form.get("confirmation"), "確認用の品目名", 120);
    const result = await getDatabase().query(`
      UPDATE inventory_items SET deleted_at=NOW() WHERE id=$1 AND name=$2 AND deleted_at IS NULL
    `, [id, confirmation]);
    if (!result.rowCount) throw new InputError("品目名が一致しないか、すでに削除されています。一覧を確認してください。");
    return "品目を削除しました。入出庫履歴は残っています。";
  });
}

export async function recordMovement(_state: ActionState, form: FormData): Promise<ActionState> {
  return mutate(async () => {
    const id = identifier(form.get("item_id"));
    const at = occurredAt(form.get("occurred_at"));
    const amount = quantity(form.get("quantity"), true);
    const reason = text(form.get("reason"), "理由", 300);
    const recorder = text(form.get("recorder"), "記録者名", 80);
    const result = await getDatabase().query(`
      WITH item AS (SELECT id FROM inventory_items WHERE id=$1 AND deleted_at IS NULL FOR UPDATE)
      INSERT INTO inventory_movements (item_id, occurred_at, quantity, reason, recorder)
      SELECT id, $2, $3, $4, $5 FROM item
    `, [id, at, amount, reason, recorder]);
    if (!result.rowCount) throw new InputError("この品目は削除されています。別の品目を選んでください。");
    return "入出庫を記録しました。在庫数に反映されています。";
  });
}

export async function importItems(_state: ActionState, form: FormData): Promise<ActionState> {
  return mutate(async () => {
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) throw new InputError("CSVファイルを選んでください。");
    if (file.size > 512 * 1024) throw new InputError("CSVは512KB以内にしてください（最大500品目）。");
    let rows: string[][];
    try {
      const source = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
      rows = parseCsv(source);
    } catch (error) {
      throw new InputError(error instanceof TypeError ? "CSVをUTF-8で保存してから取り込んでください。" : (error as Error).message);
    }
    const header = rows.shift();
    const expected = header?.length === 7 ? [...itemHeaders, "在庫数", "状態"] : itemHeaders;
    if (!header || header.length !== expected.length || header.some((cell, i) => cell !== expected[i])) {
      throw new InputError("1行目を「名前,品番,単位,発注点,備考」にしてください。在庫一覧の書き出しも取り込めます。");
    }
    if (!rows.length || rows.length > 500) throw new InputError("CSVには1〜500品目を入れてください。");
    const seen = new Set<string>();
    const items = rows.map((row, index) => {
      try {
        if (row.length !== header.length) throw new InputError("列の数が見出しと一致しません。");
        const item = itemInput({ name: row[0], sku: row[1], unit: row[2], reorder_point: row[3], notes: row[4] });
        if (seen.has(item.sku)) throw new InputError(`品番「${item.sku}」がCSV内で重複しています。`);
        seen.add(item.sku);
        return item;
      } catch (error) {
        if (error instanceof InputError) throw new InputError(`${index + 2}行目: ${error.message}`);
        throw error;
      }
    });
    const client = await getDatabase().connect();
    try {
      await client.query("BEGIN");
      for (const item of items) {
        const result = await client.query(`
          INSERT INTO inventory_items (name, sku, unit, reorder_point, notes) VALUES ($1,$2,$3,$4,$5)
          ON CONFLICT (sku) DO UPDATE SET name=EXCLUDED.name, unit=EXCLUDED.unit,
            reorder_point=EXCLUDED.reorder_point, notes=EXCLUDED.notes
          WHERE inventory_items.deleted_at IS NULL
        `, [item.name, item.sku, item.unit, item.reorder_point, item.notes]);
        if (!result.rowCount) throw new InputError(`品番「${item.sku}」は削除済みです。別の品番にしてください。取込はすべて取り消しました。`);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return `${items.length}品目を取り込みました。在庫数は変更していません。`;
  });
}
