---
slug: "0d7005a0-6fdd-4cec-ad39-ee82663c8719"
title: "Typescriptでモダンなスタックの勉強 2024年版"
published_at: "2024-01-12T16:31:34Z"
is_slide: false
summary: "summary"
tags: [bun, typescript, drizzle, litefs, sqlite, htmx, jsx]
thumbnail_url: ""
---


正月に Fly.io を触る過程で、 Fly Machine を管理できるダッシュボードを作成した。

使用した技術

- Bun
- Elysia.js
- Drizzle ORM
- htmx
- LiteFS (SQLite)


## Bun

Node, Deno に続くサーバーサイドの JS/TS ランタイム

- パフォーマンスが高い
- ツールがオールインワン 
  - 何も入れなくても TS, JSX/TSX が動く
  - パッケージマネージャーが高速
  - hot module replacement
- Web標準なAPI
- NodeJS互換
- Zig言語で書かれている


## Elysia.js

- Bun に最適化された Web フレームワーク
- Express.js の約21倍のパフォーマンス、Hono.js よりちょっと早いらしい
- 高機能
  - REST API
  - WebSocket
  - JSX で SSR、サーバーコンポーネント
  - Swagger を自動生成
  
Hono でもいいかも(僅かなパフォーマンスの差)

## Drizzle ORM

- エッジランタイムで動作するらしい
- drizzle-kit でマイグレーション管理
- SQLite のサポートが甘い？
  - Strict Table や Enum の CHECK 構文が使えてないっぽい

## htmx

- HTML 志向のライブラリ
  - イベントをlisten,trigger
  - HTTPリクエストを送信
  - レスポンスのHTMLでDOMツリーをSwap
- できることはシンプルかつ完結だが、気を付けないと危険
- JSを書く必要が少ない(SSRバックエンドは書くが)
- Reactよりはライブラリが軽量？(Preactよりは重い)

## litefs

- 複数のマシンのファイルシステム上のSQLiteを同期する仕組み
  - つまりDBのレプリケーション
- Cloudflare D1 や Turso など類似のSaaSがあり、分散SQLiteが流行っている