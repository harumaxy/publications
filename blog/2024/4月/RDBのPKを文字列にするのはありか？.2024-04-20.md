---
slug: "7a000d01-559c-43b4-a080-6d0b32eada9b"
title: "RDBのPKを文字列にするのはありか？"
published_at: "2024-04-20T15:49:03Z"
tags: []
thumbnail: null
draft: false
---

いわゆる、 surrogate key vs natural key の話。

- surrogate key: 人口キー、代理キー。uuidやintegerなど
- natural key: 自然なキー。名前、メールアドレス、人間が決めたidなど

# 文字列にしていいよ派

- 自然なビジネスロジックの中に人口キーが紛れてはいけない
- 人間にとって読みやすい
- 基本的に index でのアクセスになるので、 int と varchar でそこまでパフォーマンスに差がでない？
- ID に UUID を採用するパターンもあり、PostgreSQL以外では string や bytes で表現することが多い

# 文字列はダメだよ派

- PK は index を作るので、サイズがデカイデータ型を利用すると index が肥大化する
  - int は最大 4byte, varchar は utf8 なら 1文字　1-4 byte
- 自然キーは衝突可能性がある
  - serial なら自動で出してくれる
  - 登録の時系列性も id からわかる

## サロゲートキーはダメな場合もあるよ派


https://qiita.com/n_yamadamadamada/items/f61e16d0c0fe22d683c4

- UNIQUE で変更されなさそうなカラムがある場合でも、サロゲートキーを追加してしまう場合
  - それをPKにすればいい、別途 UNIQUE 制約をつけると別途インデックスが作成されて逆にサイズがデカくなる
- id に寿命があるよ派
  - integer を PK にすると、2^31 件までしか登録できない
  - 大量にデータが作られる場合に不利


## 実装によるよ派

MySQL のインデックスは B-tree (Balanced)
順序付けされたツリー構造

- シーケンスナンバーをインデックスにすると、遅くなる？
  - 書き込みコストの話かも


## その他
PKの話じゃないかも
https://qiita.com/tonbi_attack/items/8cb6ef014102022193d0


https://postgraphile.org/postgraphile/next/evaluatingm