# 在庫管理アプリを拡張するAIへ

## 技術と境界

- Next.js 16 App Router / React 19 / TypeScript。`app/page.tsx` がServer Component、`app/forms.tsx` がClient Component、書き込みは `app/actions.ts` のServer Actions。
- PostgreSQL接続は `lib/db.ts` の `getDatabase(): Pool` に集約。SQLはパラメーター化し、秘密情報を画面に出さない。
- `db/migrations/*.sql` は **AppThrust DatabaseChange** が適用する。Web起動時・リクエスト時には移行を実行しない。ローカルの手順はREADME参照。
- Dockerfile / `.github/workflows/deploy.yml` は元のひな形を維持。認証なし（SSOは公開先の入口）。記録者名を本人証明や権限判定に使わない。
- `node_modules/next/dist/docs/` の関連ガイドを読んでからNext.js APIを変更する。特に `searchParams` はPromise。

## データモデル（0002_inventory.sql）

### inventory_items

| 列 | 型・意味 |
| --- | --- |
| id | integer identity PK |
| name | varchar(120)、名前、必須 |
| sku | varchar(60)、品番、必須、一意・大文字小文字区別、削除後も予約 |
| unit | varchar(20)、単位、必須 |
| reorder_point | numeric(12,3)、発注点、0以上 |
| notes | varchar(2000)、備考、空文字可 |
| created_at | timestamptz、作成時刻 |
| deleted_at | timestamptz nullable、論理削除日時 |

### inventory_movements

| 列 | 型・意味 |
| --- | --- |
| id | integer identity PK |
| item_id | inventory_items.idへのFK。カスケード削除なし |
| occurred_at | timestamptz、業務上の日時。UIでは日本時間 |
| quantity | numeric(12,3)、入庫は正・出庫は負、0不可 |
| reason | varchar(300)、理由、必須 |
| recorder | varchar(80)、手入力の記録者名、必須 |
| created_at | timestamptz、保存時刻 |

## 守る動作

1. **在庫数 = 全入出庫quantityのSUM**。在庫列を別に持たない。履歴のない品目は0。負の在庫も許可。
2. **発注点割れは stock < reorder_point**（等号なし）。数値は小数3桁まで。`pg` が返すnumericは文字列。SQLで集計する。
3. 品目の削除は `deleted_at` を設定する。履歴と品番の一意性を保持。削除済み品目への入出庫・編集・CSV更新は拒否。
4. 入出庫は追記のみ。訂正は逆数量の記録で行う。品目名・品番・単位は現在のマスターから表示される。
5. 入出庫追加は対象品目を `FOR UPDATE` でロックし、削除との競合を直列化する。
6. CSVは `lib/csv.ts` でBOM・引用符・複数行を処理、`lib/validation.ts` で画面と共通の検証。UTF-8 / 512KB / 500行。品番単位でupsertし、全体を1トランザクションにする。重複品番や不正な行は全体を拒否。在庫数をCSVで直接更新しない。
7. `/export?type=stock|history|template` はBOM付きCSV。stock/historyは全件、画面履歴は100件。文字列セルの数式注入を防ぎ、数値列は数値として渡す。
8. `ActionState = { error?: string; success?: string }`。各Actionは `(state, form: FormData): Promise<ActionState>`。日本語で次の行動を伝え、フォーム入力をエラー時に保持する。
9. 移行は再適用可能にし、初期在庫を重複させない。新機能の表変更は新しい番号のSQLへ追加する。

## 主な編集箇所

- 一覧・検索・合計: `lib/inventory.ts` / `app/page.tsx`
- 入力・検証: `app/forms.tsx` / `lib/validation.ts`
- 保存・削除・CSV取込: `app/actions.ts`
- CSV書き出し: `app/export/route.ts`
- レイアウト・配色: `app/globals.css`（Tailwind導入済み、素のCSSも使用）
- 回帰確認: `node --test tests/inventory.test.mjs`、`npm run build`。変更した実経路もローカルの使い捨てPostgreSQLとブラウザで確認。

変更時は390pxと1280pxの両方で読みやすさ、入力ラベル、44px以上の操作対象、エラーと空状態を維持する。新しいデータ項目はUIだけでなくSQL・CSV・READMEも揃える。
