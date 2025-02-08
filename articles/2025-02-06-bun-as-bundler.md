---
title: "Bun がフロントエンド開発でかなり便利になりそう"
emoji: "🥟"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["bun", "typescript", "react", "tailwindcss", "hono"]
published: true
---

皆さんご存知の JavaScript ランタイム兼開発ツールの `Bun` が、v1.2.3 でフロントエンド開発のための便利な機能が使えるようになったので取り急ぎ。

現時点(2025/02/06)では Canary build なので試す方は以下のコマンドを実行してください。

```sh
bun upgrade
```

Bun でビルドした実際に動作する React + Tailwind CSS の SPA の URL を貼っておきます。

https://harumaxy.github.io/bun-as-bundler
(repo: https://github.com/harumaxy/bun-as-bundler)



## 開発サーバー機能

`bun` コマンドで引数に HTML ファイルを指定すると、開発サーバーが立ち上がります。

```sh
touch index.html
```

```html:index.html
<html>
  <body>
    Hello world
  </body>
</html>
```

```sh
bun index.html
# ➜ http://localhost:3000/
```

## バンドラー

CSS, JavaScript などのモジュールを HTML ファイルにバンドルすることが出来ます。

### Tailwind CSS を使う

まず Tailwind CSS を試してみます。
package.json を初期化して、 `bun-plugin-tailwind` をインストールします。

```sh
bun init -y
bun add -D bun-plugin-tailwind

# 必要なファイルを作成
touch bunfig.toml style.css
```

`bunfig.toml` にプラグインを使う設定を書き、Tailwind をインポートした CSS を用意して head タグ内でロードします。

```toml:bunfig.toml
[serve.static]
plugins = ["bun-plugin-tailwind"]
```

```css:style.css
@import "tailwindcss";
```

```html diff:index.html
...
+ <head>
+   <link rel="stylesheet" type="text/css" href="./style.css" />
+ </head>

+ <body class="bg-slate-600 flex items-center justify-center">
+   <div class="text-3xl font-bold text-lime-400">
+     This is tailwind styled text
    </div>
  </body>
...
```

そして、開発サーバーを立ててページを開くと Tailwind CSS のスタイルが適用されています。


### UIフレームワークを使う (React)

まずは NPM パッケージをインストール。

```sh
bun add react react-dom
bun add -D @types/react @types/react-dom
```

簡単な React コンポーネントを `src/index.tsx` ファイルに書きます。

```tsx:index.tsx
import * as React from "react";
import { createRoot } from "react-dom/client";

function App() {
  const [spin, setSpin] = React.useState(false);
  return (
    <div>
      <h1 className={`${spin ? "animate-spin" : ""} text-rose-400`}>
        Hello from React
      </h1>
      <button
        className="bg-indigo-400 text-white rounded-md p-2"
        onClick={() => setSpin(!spin)}>
          Toggle Spin
      </button>
    </div>
  );
}

createRoot(document.getElementById("app")!).render(<App />);
```

そして、 HTML ファイルの `<script>` タグで相対パス指定するだけで読み込む事ができます。

```html diff:index.html
...
  <body class="bg-slate-600 flex items-center justify-center">
    <div class="text-3xl font-bold text-lime-400">
      This is tailwind styled text
+     <div id="app"></div>
    </div>

+   <script src="./src/index.tsx"></script>
  </body>
...
```

React を簡単に使用することが出来ました！
(他のライブラリ・フレームワークも同様に可能)


## SPA をビルドする

とりあえず React + Tailwind を使った Single Page Application を開発するボイラープレートが出来たので、これらを静的な HTML+CSS+JavaScript にバンドルしてみます。

通常は `bun build index.html` でもできるのですが、 Tailwind を使用しているため、ビルドスクリプトを書くことでプラグインを適用しつつバンドルします。

```sh
touch build.ts
```

```ts:build.ts
import BunPluginTailwind from "bun-plugin-tailwind"

await Bun.build({
  entrypoints: ["index.html"],
  outdir: "dist",
  plugins: [BunPluginTailwind]
})
```

```sh
bun run build.ts

# HTMLファイルを serve して確認 -> http://localhost:3000
bunx serve dist 
```
#### 余談: MPA ビルド

最近は React Router とかで SPA でも疑似 Multi Page Application ができるためあまり需要はないかもしれませんが、 `bun <entrypoints...>` の引数に複数のファイルを渡すことで MPA 開発もできます。

```sh
bun index.html about.html blog.html

# ➜ http://localhost:3000/
Routes:
  ├── / → index.html
  ├── /about → about.html
  └── /blog → blog.html
```

ビルドも同様に、 entrypoints として HTML ファイルを複数渡せます。

```sh
bun build index.html about.html blog.html --outdir dist
```


## Web サーバーから配信する (+ バックエンドAPI実装)

Bun では HTML ファイルをモジュールとしてインポート可能です。
`Bun.serve()` API の `static` ルートとして設定することで、バンドルした HTML ファイルを Web サーバーから配信することが出来ます。（詳しくは[ここ](https://bun.sh/docs/bundler/fullstack#html-imports-are-routes)）

また、 Web 標準の `fetch` メソッド（`Request` を引数にして `Response` を返す）で HTTP リクエストを処理することも出来ます。

**Hono** など、Bun と同様に Web 標準に準拠した `fetch` メソッドを提供するサーバーフレームワークを組み込むことも可能です。

```ts:src/server.ts
import index from "../index.html";  // HTML インポートが可能
import about from "../about.html";
import { Hono } from "hono";

const app = new Hono();

app.get("/hono", (c) => c.text("This is Hono response"));

Bun.serve({
  development: true,  // リクエストのたびにリビルドするなど。開発時に便利。
  static: {  // バンドルした静的 HTML ページを配信する
    "/": index,
    "/about": about,
  },
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/hono") {
      return app.fetch(req); // Hono アプリケーションでレスポンスをハンドル
    }
    return new Response("This is default response"); // 標準的な Response オブジェクトを返すことも可能
  },
});

console.log("Server is running on http://localhost:3000");
```

フロントエンドとバックエンドを同時に開発できて、一挙両得ですね。

## Bun のフロントエンド開発機能で足りないもの

- ホットリロード
- プラグインの不足
- CORS やヘッダーの設定
  - etc...

これらの機能はまだ work in progress らしいです。将来的には提供されると思います。
将来的には Vite などを置き換える選択肢となって、Bun 以外の依存を必要とせずフロントエンド開発ができるようになるかもしれません。

## 参考

https://bun.sh/docs/bundler/fullstack

https://bun.sh/docs/bundler/html

https://www.youtube.com/watch?app=desktop&v=NvitRPQqaSs