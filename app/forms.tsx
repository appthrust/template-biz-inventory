"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { deleteItem, importItems, recordMovement, saveItem } from "./actions";
import type { Item } from "@/lib/inventory";
import type { ActionState } from "@/lib/validation";

function Feedback({ state }: { state: ActionState }) {
  return <div aria-live="polite">{state.error && <p className="feedback error" role="alert">{state.error}</p>}{state.success && <p className="feedback success">{state.success}</p>}</div>;
}

export function ItemForm({ item }: { item?: Item }) {
  const empty = { name: "", sku: "", unit: "個", reorder_point: "0", notes: "" };
  const [values, setValues] = useState(item ? { name: item.name, sku: item.sku, unit: item.unit, reorder_point: item.reorder_point, notes: item.notes } : empty);
  const [state, action, pending] = useActionState(async (previous: ActionState, data: FormData) => {
    const result = await saveItem(previous, data);
    if (result.success && !item) setValues(empty);
    return result;
  }, {});
  function field(key: keyof typeof values) {
    return { name: key, value: values[key], onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues({ ...values, [key]: event.target.value }) };
  }
  return <form action={action} className="form-stack">
    {item && <input type="hidden" name="id" value={item.id} />}
    <label>名前<input {...field("name")} required maxLength={120} autoComplete="off" /></label>
    <div className="form-grid">
      <label>品番<input {...field("sku")} required maxLength={60} autoComplete="off" /></label>
      <label>単位<input {...field("unit")} required maxLength={20} /></label>
    </div>
    <label>発注点<input {...field("reorder_point")} type="number" min="0" max="999999999.999" step="0.001" required /><span className="hint">在庫数がこの数を下回ると、お知らせします。</span></label>
    <label>備考 <span className="optional">任意</span><textarea {...field("notes")} rows={3} maxLength={2000} /></label>
    <Feedback state={state} />
    <div className="actions"><button disabled={pending}>{pending ? "保存中…" : item ? "変更を保存" : "品目を追加"}</button>{item && <Link className="button secondary" href="/">一覧に戻る</Link>}</div>
  </form>;
}

export function DeleteItemForm({ item }: { item: Item }) {
  const [state, action, pending] = useActionState(deleteItem, {});
  const [confirmation, setConfirmation] = useState("");
  return <details className="danger-zone"><summary>この品目を削除する</summary>
    <p>在庫一覧から取り除き、入出庫の記録を止めます。過去の履歴は残ります。この操作は画面から元に戻せません。</p>
    <form action={action} className="form-stack">
      <input type="hidden" name="id" value={item.id} />
      <label>確認のため「{item.name}」と入力<input name="confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" required /></label>
      <Feedback state={state} />
      <button className="danger" disabled={pending || confirmation.trim() !== item.name}>{pending ? "削除中…" : "品目を削除する"}</button>
    </form>
  </details>;
}

export function MovementForm({ items, defaultDate }: { items: Item[]; defaultDate: string }) {
  const [values, setValues] = useState({ item_id: "", occurred_at: defaultDate, quantity: "", reason: "", recorder: "" });
  const [state, action, pending] = useActionState(async (previous: ActionState, data: FormData) => {
    const result = await recordMovement(previous, data);
    if (result.success) setValues((current) => ({ ...current, quantity: "", reason: "" }));
    return result;
  }, {});
  function field(key: keyof typeof values) {
    return { name: key, value: values[key], onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setValues({ ...values, [key]: event.target.value }) };
  }
  return <form action={action} className="form-stack">
    <label>品目<select {...field("item_id")} required><option value="">品目を選んでください</option>{items.map((item) => <option key={item.id} value={item.id}>{item.name}（{item.sku} / {item.unit}）</option>)}</select></label>
    <label>日時 <span className="optional">日本時間</span><input {...field("occurred_at")} type="datetime-local" required /></label>
    <label>数量 ±<input {...field("quantity")} type="number" min="-999999999.999" max="999999999.999" step="0.001" required aria-describedby="quantity-hint" /><span className="hint" id="quantity-hint">入庫は 10、出庫は -3 のように入力します。</span></label>
    <label>理由<input {...field("reason")} maxLength={300} required /></label>
    <label>記録者名<input {...field("recorder")} maxLength={80} required autoComplete="name" /></label>
    <Feedback state={state} />
    <button disabled={pending || !items.length}>{pending ? "記録中…" : "入出庫を記録"}</button>
    {!items.length && <p className="hint">先に品目を追加してください。</p>}
    <p className="hint">記録は履歴として残ります。間違えたときは、逆の数量で訂正を記録してください。</p>
  </form>;
}

export function ImportForm() {
  const [state, action, pending] = useActionState(importItems, {});
  return <form action={action} className="form-stack">
    <p className="hint">同じ品番は品目情報を更新、新しい品番は追加します。在庫数は変わりません。1か所でも不備があれば、全体を取り込みません。</p>
    <a className="text-link" href="/export?type=template">取込用の見本をダウンロード</a>
    <label>品目のCSV<input name="file" type="file" accept=".csv,text/csv" required /><span className="hint">UTF-8 / 512KB以内 / 最大500品目</span></label>
    <Feedback state={state} />
    <button className="secondary" disabled={pending}>{pending ? "取込中…" : "CSVを取り込む"}</button>
  </form>;
}
