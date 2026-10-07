export class InputError extends Error {}

export type ActionState = { error?: string; success?: string };

export function text(value: FormDataEntryValue | string | null, label: string, max: number, optional = false): string {
  if (typeof value !== "string") throw new InputError(`${label}を入力してください。`);
  const result = value.trim();
  if ((!optional && !result) || result.length > max || result.includes("\0")) {
    throw new InputError(`${label}は${optional ? "0" : "1"}〜${max}文字で入力してください。`);
  }
  return result;
}

export function quantity(value: FormDataEntryValue | string | null, signed: boolean): string {
  const result = typeof value === "string" ? value.trim() : "";
  const pattern = signed ? /^[+-]?\d{1,9}(\.\d{1,3})?$/ : /^\d{1,9}(\.\d{1,3})?$/;
  if (!pattern.test(result) || (signed && Number(result) === 0)) {
    throw new InputError(signed
      ? "数量は0以外の数値を整数9桁・小数3桁以内で入力してください。入庫はプラス、出庫はマイナスです。"
      : "発注点は0以上の数値を整数9桁・小数3桁以内で入力してください。");
  }
  return result;
}

export function itemInput(values: { name: FormDataEntryValue | null; sku: FormDataEntryValue | null; unit: FormDataEntryValue | null; reorder_point: FormDataEntryValue | null; notes: FormDataEntryValue | null }) {
  return {
    name: text(values.name, "名前", 120),
    sku: text(values.sku, "品番", 60),
    unit: text(values.unit, "単位", 20),
    reorder_point: quantity(values.reorder_point, false),
    notes: text(values.notes ?? "", "備考", 2000, true),
  };
}

export function identifier(value: FormDataEntryValue | null): number {
  const raw = typeof value === "string" ? value : "";
  const id = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(id) || id <= 0 || id > 2147483647) {
    throw new InputError("品目が見つかりません。一覧を読み込み直してください。");
  }
  return id;
}

/** The form explicitly asks for Japan time, independent of browser/server TZ. */
export function occurredAt(value: FormDataEntryValue | null): string {
  const raw = typeof value === "string" ? value : "";
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) {
    throw new InputError("日時を入力してください（日本時間）。");
  }
  const date = new Date(`${raw}:00+09:00`);
  if (!Number.isFinite(date.getTime()) || new Date(date.getTime() + 9 * 3600000).toISOString().slice(0, 16) !== raw) {
    throw new InputError("実在する日時を入力してください（日本時間）。");
  }
  return date.toISOString();
}
