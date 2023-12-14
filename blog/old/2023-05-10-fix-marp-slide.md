---
slug: 2023-05-10-fix-marp-slide
title: このブログで Marp でレンダリングしたスライドを再生できるようにした話
published_at: "2023-05-10T03:55:28.656Z"
is_slide: false
summary: runtimeでできないので、build timeでやる
tags: [fresh, marp, npm, deno]
---

# npm モジュールが fresh で使えない問題

https://github.com/denoland/fresh/issues/978

fresh のサーバーコードに npm specifier でインポートしたモジュールが含まれると、Deno Deploy で動かなくなる。

`deno compile` とか [esbuil_deno_loader](https://github.com/lucacasonato/esbuild_deno_loader/pull/40) が npm specifier に対応していないらしい。

このブログは Markdown で作成したスライドを再生する機能を実装しているが、そのスライドのレンダリングに npm モジュールの Marp を使用しているため、これをなんとか回避しないとせっかく実装したのに使えない...。

対応を待つ間、なんとかできないかやってみる。

## 解決策: ランタイムではなく、事前にレンダリングする

このブログの記事は git に commit された Markdown からレンダリングされるので、SSRしてはいるものの実際にはコンテンツは事前に静的に用意されている...ということになる。

ランタイムに npm モジュールのコードを含めなければいいという話なので、事前に [Marp](https://github.com/marp-team/marp-core) を使ってスライドの HTML を生成することにした。


## gen-slides.ts

```typescript
import { Marp } from "npm:@marp-team/marp-core";
import { getPosts } from "../utils/posts.ts";
import * as path from "$std/path/mod.ts";

const __dirname = path.dirname(path.fromFileUrl(import.meta.url));
const posts = await getPosts();
const marpMarkdowns = posts.filter((post) => post.marp);

for (const md of marpMarkdowns) {
  const marp = new Marp();
  const { html: htmls, css } = marp.render(md.content, {
    htmlAsArray: true,
  });
  Deno.writeTextFile(
    path.join(__dirname, `../slides/${md.slug}.json`),
    JSON.stringify({ htmls, css })
  );
}
```

`npm:@marp-team/marp-core` はこのスクリプト内のみで使う。

import_map.json に書かなければ fresh の実行時には依存関係はロードされない。


# fetch Slide HTML API

fresh に、JSONファイルとして保存されたスライドの HTML/CSS を取得する API ルートを実装する。

```typescript
// /api/slides/[slug].ts
import { HandlerContext } from "$fresh/server.ts";

const slideRegex = /api\/slides\/(.*)$/g;

export const handler = async (
  req: Request,
  _ctx: HandlerContext
): Promise<Response> => {
  const slug = Array.from(req.url.matchAll(slideRegex))[0][1];
  const marpJson = await Deno.readTextFile(`slides/${slug}.json`);
  return new Response(marpJson, {
    headers: {
      "content-type": "application/json",
    },
  });
};
```

`Deno.readTextFile` API を使い、ファイルに保存されたスライドの HTML/CSS を含む JSON を返す。



## この方法の欠点
- Marp対応の Markdown を書いたら、必ず `gen-slides.ts` を実行しないといけない
  - Github Actions とかで自動化できるけど
- スライドの HTML/CSS の生データをリポジトリにコミットしないといけない
  - 無駄にバージョン管理するデータが増えるのが欠点
  - コンパイルしたJSをコミットしているような Bad Practice さがある...

## まとめ

とりあえずのパッチ対応。

fresh のサーバーサイドで npm モジュールが使えるようになったら、SSR 時にレンダリングするようにしたい。
