import Link from "next/link";
import { DeleteItemForm, ImportForm, ItemForm, MovementForm } from "./forms";
import { formatDate, formatQuantity, listItems, listMovements } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q.trim().slice(0, 200) : "";
  const history = params.tab === "history";
  let allItems;
  let items;
  let movements;
  try {
    [allItems, items, movements] = await Promise.all([
      listItems(), search ? listItems(search) : Promise.resolve(null), listMovements(101),
    ]);
  } catch (error) {
    console.error("Inventory load failed", error instanceof Error ? error.message : "unknown error");
    return <main className="unavailable"><p className="eyebrow">日々の備品を、ひと目で。</p><h1>在庫管理</h1><section className="panel"><h2>いま在庫を読み込めません</h2><p>時間をおいて読み込み直してください。初めて開いた場合は、準備が終わるまで少しお待ちください。</p><a className="button" href="/">読み込み直す</a><p className="hint">解消しない場合は、アプリの担当者に接続と初期設定の確認を依頼してください。</p></section></main>;
  }
  items ??= allItems;
  const lowItems = allItems.filter((item) => Number(item.stock) < Number(item.reorder_point));
  const editing = typeof params.edit === "string" ? allItems.find((item) => String(item.id) === params.edit) : undefined;
  const defaultDate = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 16);

  return <>
    <a className="skip-link" href="#main">本文へ移動</a>
    <header className="site-header"><Link href="/" className="brand"><span className="brand-mark" aria-hidden="true">棚</span>在庫管理</Link><span className="header-note">チームの備品と入出庫を、ひとつに。</span></header>
    <main id="main" className="container">
      <div className="page-heading"><div><p className="eyebrow">日々の備品を、ひと目で。</p><h1>{history ? "入出庫履歴" : "在庫一覧"}</h1><p className="lead">{history ? "いつ、何を、どれだけ動かしたか。" : "いまある数と、次に必要なものがわかります。"}</p></div><a className="button" href="#movement">入出庫を記録</a></div>
      <section className="metrics" aria-label="在庫の概要"><div><span>管理している品目</span><strong>{allItems.length}<small>品目</small></strong></div><div className={lowItems.length ? "attention" : ""}><span>発注点を下回っています</span><strong>{lowItems.length}<small>品目</small></strong></div><div className="metric-explain"><span>在庫数の数え方</span><p>入庫の合計 − 出庫の合計</p><small>入出庫を記録すると、自動で反映されます。</small></div></section>
      <nav className="tabs" aria-label="在庫管理メニュー"><Link href="/" aria-current={!history ? "page" : undefined}>在庫一覧</Link><Link href="/?tab=history" aria-current={history ? "page" : undefined}>入出庫履歴</Link></nav>
      <div className="workspace">
        <div className="main-column">
          {history ? <section className="panel list-panel"><div className="section-heading"><div><h2>最近の入出庫</h2><p className="hint">日本時間・新しい順{movements.length > 100 ? " / 最新100件（CSVは全件）" : ""}</p></div><a className="button secondary" href="/export?type=history">履歴を書き出す</a></div>
            <div className="movement-list">{movements.length ? movements.slice(0, 100).map((movement) => <article className="movement-row" key={movement.id}>
              <div className={`movement-sign ${Number(movement.quantity) > 0 ? "incoming" : "outgoing"}`}>{Number(movement.quantity) > 0 ? "入庫" : "出庫"}</div>
              <div className="movement-body"><h3>{movement.name}{movement.deleted && <span className="deleted-label">削除済み</span>}</h3><p>{movement.reason}</p><p className="hint"><time dateTime={movement.occurred_at.toISOString()}>{formatDate(movement.occurred_at)}</time> · {movement.recorder} · {movement.sku}</p></div>
              <strong className="movement-amount">{Number(movement.quantity) > 0 ? "+" : ""}{formatQuantity(movement.quantity)}<small>{movement.unit}</small></strong>
            </article>) : <div className="empty"><h3>まだ入出庫の記録がありません</h3><p>開始時の在庫も「入出庫を記録」から入力できます。</p></div>}</div>
          </section> : <section className="panel list-panel"><div className="section-heading"><h2>品目と在庫数</h2><a className="button secondary" href="/export?type=stock">在庫一覧を書き出す</a></div>
            <form className="search" method="get" action="/"><label htmlFor="search">品目を検索</label><div><input id="search" type="search" name="q" defaultValue={search} maxLength={200} placeholder="名前・品番・備考で検索" /><button className="secondary">検索</button></div></form>
            <div className="list-meta"><span aria-live="polite">{items.length}品目{search && ` /「${search}」の検索結果`}</span>{search && <Link href="/" className="text-link">検索をやめる</Link>}<span>書き出しは全品目が対象です</span></div>
            <div className="item-list">{items.map((item) => {
              const low = Number(item.stock) < Number(item.reorder_point);
              return <article key={item.id} className={`item-row ${low ? "low-stock" : ""}`}><div className="item-info"><div className="item-title"><h3>{item.name}</h3>{low && <span className="badge">発注点割れ</span>}</div><p className="hint">{item.sku} · 発注点 {formatQuantity(item.reorder_point)} {item.unit}</p>{item.notes && <p className="item-notes">{item.notes}</p>}</div><div className="item-count"><strong>{formatQuantity(item.stock)}</strong><span>{item.unit}</span></div><Link className="button secondary edit-button" href={`/?edit=${item.id}#item-editor`} aria-label={`${item.name}を編集`}>編集</Link></article>;
            })}{!items.length && <div className="empty"><h3>{search ? "該当する品目はありません" : "最初の品目を追加しましょう"}</h3><p>{search ? "別の名前や品番で探してみてください。" : "名前・品番・単位を登録すると、入出庫を記録できます。"}</p></div>}</div>
          </section>}
          <section className="panel" id="item-editor"><div className="section-heading"><div><p className="eyebrow">品目を整える</p><h2>{editing ? `${editing.name}を編集` : "品目を追加"}</h2></div></div><ItemForm key={editing?.id ?? "new"} item={editing} />{editing && <DeleteItemForm item={editing} />}</section>
          <details className="panel import-panel"><summary>CSVで品目をまとめて取り込む</summary><ImportForm /></details>
        </div>
        <aside className="panel movement-panel" id="movement"><p className="eyebrow">在庫の動きを残す</p><h2>入出庫を記録</h2><p className="hint panel-lead">受け取りも、持ち出しも、このフォームから。</p><MovementForm items={allItems} defaultDate={defaultDate} /></aside>
      </div>
      <footer>数量は小数3桁まで対応しています。発注点と同じ数のときは、お知らせしません。</footer>
    </main>
  </>;
}
