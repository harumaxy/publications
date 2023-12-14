---
title: Deno 布教用
published_at: "2023-04-11T17:17:01+09:00"
summary: Slideshow だが、`deno compile` が npm ディレクティブに対応してないのでただの記事
tags: ["blog", "slide", "deno"]
is_slide: true
marp: true
header: Deno 布教用
---

<!--
theme: default
class: lead
paginate: true
-->

# Deno の紹介

![bg right:33% height:200px](https://brandeps.com/icon-download/D/Deno-icon-vector-02.svg)

## refined server-side JavaScript runtime

---

最近作り直したこの HomePage は以下の技術を使用しています。
<br />

Agenda

- Deno について
- Deno Deploy について
- Fresh (Web framework) について

---

# Deno とは

Node.js の作者が作った新しい JavaScript Runtime

- デフォルトで TypeScript が使える
- ブラウザとより互換性のある API

<https://deno.com/runtime>

---

## First-class Typescrpt support

```sh
deno run main.ts
```

## Safe by default

```sh
# NG
deno run readYourFiles.ts
# OK
deno run --allow-read readYourFiles.ts
```

## No pacakge.json

```typescript
import * as preact from "https://esm.sh/preact@10.10.6";
import { useCallback, useEffect } from "https://esm.sh/preact@10.10.6/hooks";
```

(importMap.json で大規模アプリ向けの依存管理も可能)

---

# Why Deno?

Node.js は JavaScript のサーバーサイド実行環境として生まれたが 現在の JS
エコシステムにそぐわない部分が存在する

- commonJS
- Promise の非サポート
- Brower Runtime と互換性のない API

<br />

JavaScript でサーバーサイドが書けると思ったら、微妙に違う方言を書いている感覚...
(トランスパイラなどで対応可能な部分もあるが、事前インストールや build
時間が増え開発体験に影響する)

---

Deno を使えば...

---

Deno を使えば...

- ESModule が標準
- 最新の TypeScript(EcmaScript)仕様に準拠
- ビルトイン開発ツール (linter, transpiler, formatter, task runner)
- [ブラウザ互換の API](https://deno.land/manual@v1.32.4/runtime/web_platform_apis)
  - fetch とか
  - サーバーサイド特有の機能は `Deno` ネームスペースに集約 (FileSystem など)
    　これを使わないようにすればフロントと共通コードが書ける
---

でも、Node.jsで書かれたこれまでのコード資産は使えないってこと...？

---

## Node Polyfill 対応
  - Node.js のライブラリを使うことができる
  
このサイトでも、Markdownスライドのレンダリングに npm モジュールを使用してます！

```ts
import { Marp } from "@marp-team/marp-core";

const marp = new Marp();
const { html, css } = marp.render(post.content, {
  htmlAsArray: true,
});

```

> 体感、Node.jsライブラリはいける
> フロントライブラリはそのままだと無理な確率が高い...(React Componentとか)

---

# Deno Deploy について

![bg right:33% height:200px](https://brandeps.com/icon-download/D/Deno-icon-vector-02.svg)

---

## Deno Deploy について

### 速い！

- Serverless Deno Edge Function
  - 世界各地のエッジサーバーで実行され、レイテンシが最小限
- Github 連携


https://deno.com/deploy

---
## Deno Deploy について

### 安い！

- 0$プランの内容
  - 無料サブドメイン
    - 独自ドメインも設定可
  - 自動 HTTPS 化  
  - 10 万 リクエスト/日
  - 100 GiB outboud /月

https://deno.com/deploy/pricing

---




## Deno Deploy について

### 多機能！

- 静的ファイルのホスティング
- Deno.readFile API のサポート

このブログでも、Markdown ファイルを SSR して表示するのに Deno.readFile() API
を使用してます！

```ts
export async function getPost(slug: string): Promise<Post> {
  const text = await Deno.readTextFile(path.join(postsDir, `${slug}.md`));
  const { attrs, body } = front_matter.extract(text);
  return PostSchema.parse({
    ...(attrs as Post),
    slug: slug,
    content: body,
  });
}
```

---

## Deno Deploy について

### 多機能！

使ったことないけど、こんな機能も

- [BroadcastChannel](https://deno.com/deploy/docs/runtime-broadcast-channel#example)
  - 異なるタブ間でのメッセージング = チャットが作れる
- [Sockets API](https://deno.com/deploy/docs/runtime-sockets)
  - TCP, TLS connection により RDB が使用可能(postgreSQL, MongoDB, etc)
- [deployctl](https://deno.com/deploy/docs/deployctl)
  - CLIから Deno Deploy

---

ただし...

`npm:~` ディレクティブを使ってインポートしたnpm moduleを含んでいると `deno bundle ...` が使えない

`deno compile` では使えないだけで `deno run` では使える

https://deno.land/manual@v1.32.4/node/npm_specifiers#npm-specifiers

= Deno Deploy にデプロイ出来ない

2023年Q1 に対応する予定らしいと噂


https://github.com/GJZwiers/sentry_deno/issues/14


---

# Fresh について

## Web framework for Preact SSR

![bg right:33% height:200px](https://camo.githubusercontent.com/4e0efa262c9df8dc1a327535f87a53a57a68b6073677dc17806acf10e26c4956/68747470733a2f2f66726573682e64656e6f2e6465762f6c6f676f2e737667)


---

## Fresh

- preact
- FileSystem based routing
- API routes
- Island Architecture

![bg right:50% height:100](https://raw.githubusercontent.com/preactjs/preact/8b0bcc927995c188eca83cba30fbc83491cc0b2f/logo.svg?sanitize=true)


preactを使ってる以外は他のSSR/SSGフレームワークと似たような機能性

---

# Island Architecture

fresh の他には [astro](https://docs.astro.build/en/concepts/islands/) というフレームワークも採用している。

- SSR/SSG をすると zero JS の HTML が配信されページ読み込みが早くなる
- だが、部分的にJSで動作するインタラクティブなコンポーネントも使いたい
- そこで、ページの一部分のみをhydrationする
  - => 部分的に動的にしつつ残りは静的なコンテンツのままなので、ページロード速度の低下を抑えることができる(らしい)



※ hydration = 静的なHTMLページをJSをアタッチすることで動的にすること([wikipedia](https://en.wikipedia.org/wiki/Hydration_(web_development)))

---

このサイトに例えると...

- 赤い部分
  - JSがhydrateされた動的なアプリケーション
- 青い部分
  - 高速にロードされる静的HTML(zero JS)

青い部分が海、赤い部分が島(island)


![bg fit right](https://i.gyazo.com/ce7cc97aa51e364af277fb24d04514db.png)

---

# 終わり

---

# Appendix

importMap.json で依存関係の管理・エイリアス設定も可能
(大規模アプリケーション向け)

```json
{
  "imports": {
    "$fresh/": "https://deno.land/x/fresh@1.1.0/",
    "preact": "https://esm.sh/preact@10.10.6",
    "preact/": "https://esm.sh/preact@10.10.6/",
    "preact-render-to-string": "https://esm.sh/*preact-render-to-string@5.2.3/",
    "@preact/signals": "https://esm.sh/*@preact/signals@1.0.3",
    "@preact/signals-core": "https://esm.sh/*@preact/signals-core@1.0.1",
    "twind": "https://esm.sh/twind@0.16.17",
    "twind/": "https://esm.sh/twind@0.16.17/",
    "$std/": "https://deno.land/std@0.160.0/",
    ...
  }
}
```
