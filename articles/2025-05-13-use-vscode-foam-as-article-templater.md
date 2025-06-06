---
title: "Zenn の記事を書くときのスラッグ生成を楽にする [VSCode + Foam 拡張機能 テンプレーティング]"
emoji: "🪽"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: [vscode, foam, zenn]
published: true
---

表題のとおりです。

皆さま、Zenn で記事を書くときに **Github連携** を使ってますか？
Zenn CLI も使ってますか？

そのプロジェクトのツリー構造はこんな感じのはずです。

```txt
root
  - articles
  - books
```

で、 `npx zenn new:article` とすると新しく記事が作られるはずですが、
**デフォルト**だと**ハッシュ値**が入るはずです。

```diff: txt
root
  - articles
+   - 30433a77da3cca.md
  - books
```

実はこれ、 Zenn に公開されるときの **URL スラッグ** に使われます。

例: https://zenn.dev/submax/articles/30433a77da3cca


## スラッグがハッシュ値だと何が問題か

記事の**URLがちょっと不格好になる**のもダサいですが、何よりファイルシステムで管理するはずなので、ファイル名がめちゃくちゃ**視認性が悪いです。**

![ハッシュでタイトルを作ったときのVSCodeファイルツリー見づらい](https://blog-images.harumaxy.com/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88%202025-05-13%2018.21.59.png)

めっちゃ見づらい！
(整理しようと頑張ってる跡が見えるけど)

まあ、後で変更しようか...て思ってると、
Zenn のスラッグは記事の**ユニークID**なので、後から変更すると別の記事扱いをされて**いいねが失われます**。


スラッグだけは後で変えが利かない...ので、最初に面倒くさがると後で悲しい気持ちになります。
(この記事のスラッグで検証済みです)

[https://zenn.dev/submax/articles/2025-05-13-use-vscode-foam-as-article-template](https://zenn.dev/submax/articles/2025-05-13-use-vscode-foam-as-article-template)
[https://zenn.dev/submax/articles/2025-05-13-use-vscode-foam-as-article-templater](https://zenn.dev/submax/articles/2025-05-13-use-vscode-foam-as-article-templater)

`↑ 1文字違いで、 最後が ⭕template ❌templater になってる`

まあ、実は変えても前の記事は残っているので**スラッグを戻せば**いいね数は**復活**します。


でも痛みを伴わず(ラクして)、最初から**いい感じ**で記事を作成したい！と思いませんか？

## Zenn CLI だけでなんとかできるのか？ (= できるがメンドい)


`zenn new:article` のヘルプを見てみましょう

```sh
npx zenn new:article --help

# Usage:
#   npx zenn new:article [options]
# 
# Options:
#   ...省略
# 
# Example:
#   npx zenn new:article --slug enjoy-zenn-with-client --title タイトル --type idea --emoji ✨
```

Example のコマンドを見るに**オプション**できるのはわかるが... 毎回このコマンド打ちますか？

Git リポジトリだから、ルートディレクトリで **JavaScript** とか **シェル芸** とか書いてなんとかするぜ！って人もいるだろうけど、それはそれでめんどい。



## VSCode: Foam 拡張機能を記事テンプレートとして使う

Form for VSCode を使いましょう。

https://marketplace.visualstudio.com/items?itemName=foam.foam-vscode


Marketplace ページを見ると分かりますが、 **Obsidian** とかそれ系のナレッジ管理ツールです。
書いたノートを**タグ**を関連付けて、**グラフ**で知識の関連を表示できる機能とかついてるあれです。

実は**テンプレート作成機能**があって、それを使うと VSCode ツールパレットやショートカットから呼び出して、ファイルツリー上の **任意のパス、ファイル名、内容** のマークダウンファイルを生成できます。

やってみましょう。


## テンプレートを作る

コマンドパレットを開き、以下を実行します。
`Cmd + Shift + P` => `Foam: Create New Template`

![コマンドパレットからFoamテンプレートを作れ](https://blog-images.harumaxy.com/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88%202025-05-13%2018.41.35.png)


そしたら、 `.foam/templates` ディレクトリ以下に **Markdown テンプレートファイル** が作られるので、以下のような **Front Matter** を書きます。

```md
---
title: "$FOAM_TITLE"
emoji: "🦔"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: []
published: false
foam_template: 
  filepath: "articles/$FOAM_DATE_YEAR-$FOAM_DATE_MONTH-$FOAM_DATE_DATE-$FOAM_TITLE.md"
---
```

大体、Zenn記事のフロントマターと同じですね！
また、Foam 拡張特有の埋め込み変数が使えます。

- `$FOAM_TITLE`
  - VSCode コマンドパレットから `>Foam: create New Note From Template` で入力(後述)
- `$FOAM_DATE_YEAR`  : 年
- `$FOAM_DATE_MONTH` : 月
- `$FOAM_DATE_DATE`  : 日

一番下の、 `foam_template` フィールドだけ特別です。
ここで指定したものは、Foamテンプレート機能の振る舞いに影響を与えますが、 `filepath` だけ知ってればいいでしょう (自分も他はしらないです)


上記の設定は `articles/` ディレクトリ以下に指定したフォーマットのファイル名でテンプレートを出力します


## テンプレートを使う

コマンドパレットを開き、以下を実行します。(好みに応じてショートカットキーを振るのもよいでしょう)
`Cmd + Shift + P` => `Foam: Create New Note From Template`


![テンプレートを使う](https://blog-images.harumaxy.com/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88%202025-05-13%2019.08.26.png)

作成したテンプレートを選べば、`articles/` ディレクトリに作成されてるはずです！

例: `2025-05-13-use-vscode-foam-as-article-templater.md`

ファイルツリー上でも日付でソートされて、いつ何を書いたのかわかりやすくなりそうです！

## 注意 (ほぼないと思うけど)

ちなみに、Zenn はユーザー用ネームスペースとかないので、全記事でスラッグが**ユニーク**である必要があります。


この記事のやり方では **YYYY-mm-DD** を prefix として入れたので、**同じ日に同じネタ**を書こうとしている人がいない限り被らないと思いますが、留意しましょう。
(とはいえ、**UUIDが被らない理論**と同じで実用上は問題ないと思います)


## まとめ

この記事のテクニックを使って、気持ちよく技術記事を書き始めてください。

そういう自分はどうかって？三日坊主なので全然書いていません...
ブログ書くか！って Web サイトを作るには良いけど、作ったところで満足してコンテンツを充実させないタイプです。


(Get Started で満足して終わってる...😭)

モチベーションの維持って難しいですよね。毎日ランニングしてる人とか尊敬してます。