import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "在庫管理 | 品目・入出庫の記録",
  description: "チームの品目と入出庫を管理し、発注点を下回った在庫をひと目で確認できます。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja" data-scroll-behavior="smooth"><body>{children}</body></html>;
}
