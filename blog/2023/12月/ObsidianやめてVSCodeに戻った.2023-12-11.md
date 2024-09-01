---
slug: "801511a3-33a7-45f9-be82-d706ce3181ab"
title: "ObsidianやめてVSCodeに戻った"
thumbnail: null
draft: false
published_at: 2023-12-11T02:38:07Z
tags: ["markdown", "foam", "vscode"]
---

## Obsidian
- Markdown Editor
- Markdownで作った文書をタグ付けで管理できる
- マインドマップのようなグラフ表示もできる
- コミュニティプラグインによる機能拡張もできる

といった、ノートを取るのに特化したようなアプリ

最近ちょっと使ってたましたが、やっぱりVSCodeに戻った。


Obsidianの売りであるグラフ表示が[Foam](https://foambubble.github.io/foam/)というVSCodeの拡張機能で実現できるので、それを抜いたらテキスト編集(markdown含む)はほとんどVSCodeのほうが上位互換なため。


## 1つのリポジトリで全部の文書を管理

自分のホームページだとJAMStackでブログを書いてるし(サボり気味だけど)、Zennにもたまに投稿している。

Markdown文書を管理するところが分散してるので、一つのリポジトリにまとめることにした

https://github.com/harumaxy/docs

タグ機能と Foam を使うことで、違うサービスで利用している markdown 同士をリンクして参照できる。  
(Local の VSCode で閲覧するときのみ)


## Git submodule の一部だけ pull する

参考リンク : https://leico.github.io/TechnicalNote/Git/sparse-checkout-submodule

sparse checkout という技を使うと、git submoduleの一部分のフォルダだけを利用できる。

`docs`` リポジトリは複数サービス用にmarkdownをフォルダで分けているので、ブログで使うようのフォルダだけ利用できればいい。

今後、MarkdownとGitHubを連携させて文書を公開できるプラットフォームが増えた場合も同じ方法でスケールできる。

## TODO

blog用のファイルを編集したときに、ホームページのGithub Actionからデプロイを発火する  
(dispatch workflow を設定すれば行けそうだが、まだやってない)



