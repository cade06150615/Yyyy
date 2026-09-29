# Parts Finder V1

一個「零件需求 → 找可能有貨的本地店家」MVP。這一版不包含自動打電話。

## 已完成
- 前端搜尋介面
- 型號 / 名稱 / 規格搜尋
- 台中 / 台北 / 高雄篩選
- 相關度、價格、名稱排序
- 店家資料與 Google Maps 導航
- 收藏店家
- 建立詢問紀錄
- 後端 REST API
- JSON 資料儲存，不需要 SQLite/native module
- `/api/health` 健康檢查
- Render 部署設定

## 重要
「尚未確認現貨」是刻意設計的：系統沒有真的向店家確認前，不會假裝有即時庫存。

## 本機執行
需要 Node.js 18+。

```bash
npm install
npm start
```

然後開啟 `http://localhost:3000`。

## Render
把整個資料夾放到 GitHub，再在 Render 建立 Web Service。
- Build Command: `npm install`
- Start Command: `npm start`
- Node 18+

`render.yaml` 已經放好。

## 下一階段
1. 接真實店家資料
2. 店家自行回報庫存
3. 網站商品資料自動同步
4. 使用者詢問流程
5. 最後才接 AI 電話確認
