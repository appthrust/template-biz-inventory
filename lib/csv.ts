export const itemHeaders = ["名前", "品番", "単位", "発注点", "備考"];

/** RFC 4180-style UTF-8 CSV: BOM, CRLF, escaped quotes and multiline cells. */
export function parseCsv(source: string): string[][] {
  const input = source.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let closed = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') { cell += '"'; i++; }
        else { quoted = false; closed = true; }
      } else cell += char;
      continue;
    }
    if (char === '"') {
      if (cell || closed) throw new Error("CSVの引用符が正しくありません。");
      quoted = true;
    } else if (char === ",") {
      row.push(cell); cell = ""; closed = false;
    } else if (char === "\r" || char === "\n") {
      row.push(cell);
      if (row.some((value) => value !== "")) rows.push(row);
      row = []; cell = ""; closed = false;
      if (char === "\r" && input[i + 1] === "\n") i++;
    } else {
      if (closed) throw new Error("CSVの閉じ引用符の後には区切り文字が必要です。");
      cell += char;
    }
  }
  if (quoted) throw new Error("CSVの引用符が閉じられていません。");
  row.push(cell);
  if (row.some((value) => value !== "")) rows.push(row);
  return rows;
}

export function encodeCsv(rows: (string | number)[][]): string {
  const encode = (value: string | number) => {
    let cell = String(value);
    // Numeric columns remain numbers; untrusted text must not become a formula.
    if (typeof value === "string" && /^[\s]*[=+\-@]/.test(cell)) cell = `'${cell}`;
    return `"${cell.replaceAll('"', '""')}"`;
  };
  return "\uFEFF" + rows.map((row) => row.map(encode).join(",")).join("\r\n") + "\r\n";
}
