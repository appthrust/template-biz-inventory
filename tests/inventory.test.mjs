import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { encodeCsv, parseCsv } from "../lib/csv.ts";
import { identifier, itemInput, occurredAt, quantity } from "../lib/validation.ts";


test("CSV import fixture uses the Japanese item contract", () => {
  const rows = parseCsv(readFileSync(new URL("./fixtures/items.csv", import.meta.url), "utf8"));
  assert.equal(rows.length, 2);
  const [name, sku, unit, reorder_point, notes] = rows[1];
  assert.deepEqual(itemInput({ name, sku, unit, reorder_point, notes }), {
    name: "取込ラベル", sku: "CSV-001", unit: "枚", reorder_point: "3", notes: "棚,上段",
  });
});
test("CSV accepts BOM, CRLF, quoted commas, multiline notes and escaped quotes", () => {
  assert.deepEqual(parseCsv('\uFEFF名前,品番,単位,発注点,備考\r\n"用紙, A4",A4,冊,10,"棚\n\"\"上段\"\""\r\n'), [
    ["名前", "品番", "単位", "発注点", "備考"],
    ["用紙, A4", "A4", "冊", "10", '棚\n"上段"'],
  ]);
});

test("CSV rejects malformed quoting rather than shifting columns", () => {
  for (const source of ['"unclosed', 'abc"def', '"a"b,c']) assert.throws(() => parseCsv(source));
});

test("CSV export neutralizes formulas in text while retaining negative numeric quantities", () => {
  const csv = encodeCsv([["=1+1", " \t@SUM(A1)", "-item", -3, 'notes, "quoted"\nline']]);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.deepEqual(parseCsv(csv), [["'=1+1", "' \t@SUM(A1)", "'-item", "-3", 'notes, "quoted"\nline']]);
});

test("quantity accepts signed decimals and rejects zero movement, exponent, excess precision", () => {
  for (const value of ["-2.125", "+3", "0.001", "999999999.999"]) assert.equal(quantity(value, true), value);
  for (const value of ["0", "-0.000", "1e3", "1.2345", "1000000000", "NaN", ""]) assert.throws(() => quantity(value, true));
  assert.equal(quantity("0", false), "0");
  assert.throws(() => quantity("-1", false));
});

test("Japan time is explicit and impossible calendar values are rejected", () => {
  assert.equal(occurredAt("2026-10-07T12:30"), "2026-10-07T03:30:00.000Z");
  for (const value of ["2026-02-30T12:00", "2026-10-07T25:00", "2026-10-07", null]) assert.throws(() => occurredAt(value));
});

test("item validation preserves Japanese text and rejects missing or oversized values", () => {
  const value = { name: " 用紙 ", sku: "A-01", unit: "冊", reorder_point: "10", notes: "" };
  assert.equal(itemInput(value).name, "用紙");
  for (const patch of [{ name: " " }, { sku: "a".repeat(61) }, { notes: "\0" }, { reorder_point: "-1" }]) {
    assert.throws(() => itemInput({ ...value, ...patch }));
  }
});

test("identifiers are bounded integer database keys", () => {
  assert.equal(identifier("42"), 42);
  for (const value of ["1e2", "1.1", "0", "-1", "2147483648", null]) assert.throws(() => identifier(value));
});
