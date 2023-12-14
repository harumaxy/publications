---
title: "Astro + Three.js + React で3Dモデルを表示する"
emoji: "🚀"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: [astro, React, threejs]
published: true
---

astro で three.js を使った3DなWebページって作れるかな〜と試してみたのでメモ。

# Why Astro?

動的なページ作るなら create-react-app とか vite でもいいけど、astroでも動的ページは作れるしパフォーマンス上のメリットがあるらしい。

### Partial hydreation

Astro はUIフレームワークを使ってレンダリングし、その結果を静的なHTMLとして出力する。
分類的には Static Site Generator だが、部分的にページを動的にできる。

https://docs.astro.build/en/concepts/islands/

デフォルトでは全部静的ですが、コンポーネント単位で動的にすることができる。
静的なページの海に浮かぶ動的コンポーネントの島という意味で`island`と呼ぶらしい。
必要な部分だけを動的にして残りは静的なHTMLになるので高速に表示できるとのこと。

これにより、静的なMPAだけでなく動的なSPAを作るに場合も高いパフォーマンスを得ることができる。
### UI-Framework integration

`npm run astro add` コマンドから、Astroでサポートされるフレームワークを追加できる。
メジャーなフレームワークはだいたいサポートされていて、設定ファイルなどもいい感じに生成してくれる。

React, Vue, Svelte などのUIフレームワークや、[MDX](https://docs.astro.build/en/guides/integrations-guide/mdx/)や[Tailwind CSS](https://docs.astro.build/en/guides/integrations-guide/tailwind/)も使える。

webpackやrollupを使う場合、ググって色々設定を書かないとだがastroはフレームワークの導入がコマンド一発でラクラクなのでフロントエンド開発ツールと言う観点でも使いやすい部類だと思われる。


## 環境

- macOS Monterey 12.5
- Node.js v18.7.0
- npm v8.15.0
- astro ^1.0.6

## setup

```sh
npm init astro
# > ./threejs-proj
# > Empty Project
# > Initialize a git repo > yes
# > TypeScript > Strict

cd threejs-proj
npm i
npm run astro add react
npm i @react-three/fiber@8.3.1 @react-three/drei@9.22.9
```

追記:
現時点(2022/9/3)の最新アップデートである`three@0.144.0`の`three-stdlib`で、必要なモジュールがexportされないバグがあるっぽいので、この記事を書いた時点(2022/08/20)で動作していたバージョンを指定してインストールします。
(関連issue: https://github.com/pmndrs/drei/issues/1029)

- @react-three/fiber@8.3.1
- @react-three/drei@9.22.9



## モデルを用意

とりあえずBlenderでデフォルトで用意されてる猿を使う

[![Image from Gyazo](https://i.gyazo.com/60b9c7560dd847ffd2f5fc92ee50998a.png)](https://gyazo.com/60b9c7560dd847ffd2f5fc92ee50998a)

`public`フォルダにコピーしておく

あと、3DモデルデータはサイズがでかいのでGitで管理するならGit LFSを使おう。


```sh
cp ~/Downloads/monkey.glb public/

git lfs track **/*.glb
git add .gitattributes public
git commit -m "add model"
```

## フロントページの実装

以下のようなディレクトリ構成で作っていく

```
src
├── islands
│   └── Monkey.tsx
└── pages
    └── index.astro
```

## Three.js を実行するコンポーネントを作成

この記事を参考にしました。

https://zenn.dev/ryotarohada/articles/e3322dcdf80b66

- `@react-three/fiber` : three.js の React ラッパー
- `@react-three/drei` : 便利なユーティリティを集めたライブラリ

```tsx:Monkey.tsx
import * as React from "react";
import * as Fiber from "@react-three/fiber";
import * as Drei from "@react-three/drei";

export default () => {
  const { scene } = Drei.useGLTF("http://localhost:3000/monkey.glb");

  return (
    <React.Suspense fallback={<p>...loading...</p>}>
      <Fiber.Canvas>
        <Drei.PerspectiveCamera makeDefault />
        <Drei.OrbitControls enablePan enableZoom enableRotate />
        <Drei.Sky
          distance={450000}
          sunPosition={[0, 1, 1]}
          inclination={0}
          azimuth={0.25}
        />
        <Drei.Stage>
          <group dispose={null}>
            <primitive scale={[1, 1, 1]} object={scene} />
          </group>
        </Drei.Stage>
      </Fiber.Canvas>
    </React.Suspense>
  );
};

```
- カメラ
- 簡易なパン、ズーム、回転コントロール
- SkyBox
- GLTFのロード(useGLTF)

`astro dev` を実行中は`public`以下のファイルが`localhost:3000`からサーブされているのでそこから`monkey.glb`をfetchしてロードする。



## indexページでコンポーネントをロード

`.astro`ファイルは、見た目は普通のHTMLっぽいけどコンポーネントをimportして使える。


```tsx:index.astro
---
import Monkey from "../islands/Monkey";
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <meta name="generator" content={Astro.generator} />
    <title>Astro</title>
  </head>
  <body>
    <h1>Astro</h1>
    <div>
      <Monkey client:only="react" />
    </div>
  </body>
</html>
```

## client:only="react"

`Monkey`コンポーネントを使っている部分で、propsに`client:only="react"`ディレクティブを指定

```tsx:index.astro
      <Monkey client:only="react" />
```

https://docs.astro.build/en/reference/directives-reference/#client-directives

client directive は、UIフレームワークコンポーネントがどのようにhydrateされるかを決める。
`client:only="react"`はHTMLのサーバレンダリングをスキップしてクライアント上でのみレンダリングするというオプション。
(サーバー上でコンポーネントを実行しないため、明示的にAstroにどのフレームワークを使用するのか指示する必要がある)

hydrateって[こういう意味](https://zenn.dev/smallstall/articles/5531fd6647f713)らしい

`three.js`が内部的にWebAPIの`ProgressEvent`を利用しているようでSSRするとReferenceError(ブラウザ上にしか無いAPIを参照しようとするため)を起こすので、three.jsを使用するコンポーネントはこのオプションを付ける必要がある。


## スタイルを整える

```sh
npm run astro add tailwind
```

`tailwind.config.cjs`の生成までやってくれる。

```diff tsx:index.astro
---
import Monkey from "../islands/Monkey";
---

  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width" />
      <meta name="generator" content={Astro.generator} />
      <title>Astro</title>
    </head>
    <body>
+      <div class="flex flex-col justify-center content-center">
+        <h1 class="text-center text-8xl font-bold">Astro</h1>
+        <div class="flex-1 h-screen">
+          <Monkey client:only="react" />
        </div>
      </div>
    </body>
  </html>
```

いい感じにthree.jsキャンバスが画面全体に広がるように

## 完成形

[![Image from Gyazo](https://i.gyazo.com/92dca4b1d537f45edab864b3d5295e4e.png)](https://gyazo.com/92dca4b1d537f45edab864b3d5295e4e)

