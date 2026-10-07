@AGENTS.md

在庫管理のデータモデル・SQLとCSVの不変条件はAGENTS.mdを正本とします。
`inventory_items` が品目、`inventory_movements` が追記型の入出庫記録です。
在庫数はquantityの合計で計算し、品目削除でも履歴を消さないでください。
マイグレーションはAppThrust DatabaseChangeに任せ、Web起動時に実行しないでください。
