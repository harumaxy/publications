---
title: "Zenn の記事を書くときのスラグ生成を楽にする [VSCode + Foam 拡張]"
emoji: "🪽"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: [vscode, foam, zenn]
published: true
---

表題のとおりです。

皆さま、Zenn で記事を書くときに Github 連携を使っておられるでしょうか？
Zenn CLI も使っておられますか？

そのプロジェクトのツリー構造はこんな感じのはずです。

```txt
root
  - articles
  - books
```

で、 `npx zenn new:article` とすると新しく記事が作られるはずですが、デフォルトだとハッシュ値が入るはずです。

```diff: txt
root
  - articles
+   - 30433a77da3cca.md
  - books
```

実はこれ、 Zenn に公開されるときの **URL スラグ** に使われます。

例: https://zenn.dev/submax/articles/30433a77da3cca


## 何が問題か

まあ記事の**URLがちょっと不格好になる**のもダサいですが、何よりファイルシステムから管理するはずなので、その場合に**めちゃめちゃ**視認性が悪いです。

https://blog-images.harumaxy.com/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88%202025-05-13%2018.21.59.png

めちゃめちゃ見づらい！
(整理しようと頑張ってる跡が見えるけど)


## Zenn CLI だけでなんとかできるのか？ => できるがメンドい


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
Git リポジトリだから、記事同じ場所に **JavaScript** とか **Shell Script** とか書いてなんとかするぜ！って人もいるだろうけど、それはそれでめんどい。



## VSCode: Foam 拡張機能を記事テンプレートとして使う

Form for VSCode を使いましょう。

https://marketplace.visualstudio.com/items?itemName=foam.foam-vscode


Marketplace ページを見ると分かりますが、 **Obsidian** とかそれ系のナレッジ管理ツールです。
書いたノートを**タグ**を関連付けて、**グラフ**で知識の関連を表示できる機能とかついてるあれです。

実はノートの**テンプレート機能**があって、それを使うと VSCode ツールパレットやショートカットから呼び出して、ファイルツリー上の **任意の場所** に **任意のファイル名**で、 **任意の中身** を生成できます。

やってみましょう。


## テンプレートを作る

コマンドパレットを開き、以下を実行します。
`Cmd + Shift + P` => `Foam: Create New Template`

https://blog-images.harumaxy.com/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88%202025-05-13%2018.41.35.png


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



