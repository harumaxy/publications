---
title: "[Elixir] Plug を簡単なサーバーを実装して理解する"
emoji: "🔌"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["elixir", "plug", "phoenix"]
published: false
publication_name: "manabo_tech"
---


Elixir 最近触ってます。

Elixir のキラーアプリといえば Phoenix Framework ですが、その Web レイヤーとして使われている [Plug](https://hexdocs.pm/plug/readme.html) について勉強したので、理解を深めるためここにまとめたいと思います。

## Plug とは

Elixir で Web サーバーを扱うための抽象化を提供するライブラリです。
サーバー実装自体は別のライブラリをアダプターを介して利用します。([Cowboy](https://github.com/ninenines/cowboy), [Bandit](https://github.com/mtrudel/bandit) など)

この方式のメリットは、Plug の使用方法さえ覚えてしまえば、今後 Erlang/Elixir エコシステムでもっと効率的なサーバー実装が出たとしてもライブラリの使用方法を学び直す必要が無く、同じ抽象化を利用できるということです。
(Plug アダプターが必要ですが、 Plug は Elixir 公式プロジェクトなのでそのあたりの追従をする信頼は厚いと思っています。)

Phoenix でも利用されていますが、Phoenix 無しで Plug だけでもシンプルな Web サーバーの実装が可能です。

Elixir で Web 開発をしたい人はまず Plug の使い方を学ぶのが良さそうです。

## セットアップ

```sh
mix new simple-server --app simple_server --sup
```

```diff elixir:mix.exs
defp deps do
+  [{:bandit, "~> 1.0"}]
end
```
:::message
豆知識: Bandit は Plug で利用することを想定して作られたサーバー実装であり、依存関係に Plug が含まれるので Bandit だけインストールすればOK
:::

## 最初の Plug

最初の Plug を実装します

任意のモジュールに `init/1` と `call/2` コールバックを実装すれば、Plug ビヘイビアとして扱うことができます。
(単純なモジュールプラグを書くだけなら静的解析のため `@behaviour Plug` を宣言しておくのがおすすめ)


```diff elixir:lib/simple_server.ex
defmodule SimpleServer do
  @behaviour Plug

  import Plug.Conn

  def init(options), do: options

  def call(conn, _options) do
    conn |> send_resp(200, "Hello, world!")
  end
end
```

Application を編集して、 SimpleServer モジュールを plug として指定し、 Bandit サーバーを監視ツリーで起動します。

```diff elixir:lib/simple_server/application.ex
defmodule SimpleServer.Application do
+ require Logger
  use Application

  @impl true
  def start(_type, _args) do
    children = [
+     {Bandit, plug: SimpleServer, port: 4000}
    ]

    opts = [strategy: :one_for_one, name: SimpleServer.Supervisor]
+   Logger.info("server listening on http://localhost:4000")
    Supervisor.start_link(children, opts)
  end
end
```

サーバーを起動します

```sh
mix run --no-halt

curl http://localhost:4000 # => Hello, world!
```



これで、Plug を使用した Web サーバーを立ち上げることができました。


## Plug の概念

Plug の概念はミドルウェア志向の Web フレームワークにおける **ミドルウェア** に近いです。
HTTPリクエスト/レスポンスに関する情報を含む `Plug.Conn.t()` 構造体を引数で受取り、 ミドルウェア内部で操作し、 `Plug.Conn.t()` を返すというモデルになります。

それを踏まえて、Plug の形態には2種類あります

- モジュールプラグ
- 関数プラグ

### モジュールプラグ

先ほど立ち上げたWebサーバーの `SimpleServer` モジュールの実装がこれに当たります。

`Plug` ビヘイビアの以下のコールバック関数を実装したモジュールを Plug として扱うことができます

- `init/1` : call/2 の第二引数に渡すオプションを定義するための関数
- `call/2` : HTTPリクエストをハンドリングする関数
  - 型で表すと `(Plug.Conn.t(), any()) :: Plug.Conn.t()`

関数プラグのほうが単純ですが、モジュールプラグにはマクロにより組み合わせプラグを簡潔に書く機能が提供されています。(後述)

### 関数プラグ

最も単純な Plug の単位で、 モジュールプラグの `call/2` と同じ型の関数です。

モジュールプラグの `call/2` の説明にもなりますがパラメータについて説明すると、

- 第一引数が conn
- 第二引数が options
  - 何でも渡せるが、keyword list の場合が多い。パラメータで関数の挙動を変更するのに使う
- 戻り値で conn を返す


#### 関数プラグのパイプ

Plug のメンタルモデルである、引数で `conn` を渡して変更を加えて `conn` を返す関数、というのは関数型プログラミング言語でよく採用されるパイプ演算子 `|>` と相性がいいです。

先程の SimpleServer で、様々なミドルウェア的処理をする関数プラグを定義してパイプで繋ぐとこんな感じです。


```diff elixir:lib/simple_server.ex
defmodule SimpleServer do
  @behaviour Plug

  import Plug.Conn

  def init(options), do: options

  def call(conn, _options) do
+    try do
+      conn |> parse_query() |> auth() |> set_content_type("text/plain") |> route()
+    catch
+      :unauthorized -> conn |> send_resp(401, "Unauthorized")
+    end
  end

+ def parse_query(conn, _opts \\ []) do
+   queries = conn.query_string |> URI.decode_query()
+   conn |> assign(:queries, queries)
+ end
+
+ def auth(conn, _opts \\ []) do
+   case conn.assigns[:queries] do
+     %{"id" => "user", "password" => "password"} -> conn
+     _ -> throw(:unauthorized)
+   end
+ end
+
+ def set_content_type(conn, type) do
+   conn |> put_resp_header("content-type", type)
+ end
+
+ def route(conn, _opts \\ []) do
+   case {conn.method, conn.request_path} do
+      {"GET", "/"} -> conn |> send_resp(200, "Hello, world!")
+      {"GET", "/hello"} -> conn |> send_resp(200, "Hello, #{conn.assigns[:queries].id}!")
+      _ -> conn |> send_resp(404, "Path not found")
+   end
+ end
end

# $curl http://localhost:4000 => Unauthorized
# $curl 'http://localhost:4000?id=user&password=password' => Hello, world!
# $curl 'http://localhost:4000/some_path?id=user&password=password' => Path not found
```

Plug の概念は以上です
マクロを使わずモジュールプラグと関数プラグの概念だけでも Plug を使ったアプリケーションを書くことができます。



### モジュールプラグ vs 関数プラグ

ぱっと見、関数プラグのほうがメンタルモデルに合っていてかつ単純なので、モジュールプラグを使う必要性は無いように感じます。
が、モジュールプラグでしかできないこともあります。

- サーバー起動時のエントリーモジュールプラグの指定
- マクロを使用したプラグの構築

:::message
試した・見かけた限りでは上記ですが、他にもあったら教えて下さい
:::


## Plug を簡潔に書くためのマクロ

モジュールプラグの実装が簡潔になるマクロがいくつかあります。
特によく使う `Plug.Builder` および `Plug.Router` について見ていきましょう。

### Plug.Builder (= plug/2)

プラグパイプラインを書くのに使えるマクロが提供されます。


```diff elixir
defmodule SimpleServer do
- @behaviour Plug
-
- import Plug.Conn
-
- def init(options), do: options
-
- def call(conn, _options) do
-   # ...
- end
+ use Plug.Builder
+
+ plug(:parse_query)
+ plug(:auth)
+ plug(:set_content_type, "text/plain")
+ plug(:route)
  ...

  def auth(conn, _opts \\ []) do
    case conn.assigns[:queries] do
      %{"id" => "user", "password" => "password"} -> conn
-     _ -> throw(:unauthorized)
+     _ -> conn |> send_resp(401, "Unauthorized") |> halt()
    end
  end
  ...
```

use ディレクティブの説明に関しては[ここを見るのがおすすめ](https://elixir-lang.jp/getting-started/alias-require-and-import.html#use)

先に書いた実装から `init/1` と `call/2`コールバック関数が削除されていますが、SimpleServerモジュールは依然として Plug として動作します。
これらの関数が `use Plug.Builder` により自動で実装されるためです。


特に重要なのが `plug/2` マクロで、上から順にプラグをパイプした結果を `call/2` 関数として出力します。
また、関数プラグ/モジュールプラグの両方をパイプすることができます
(パイプ演算子`|>`だと関数しかできない)

```elixir
# 例
plug(:func_plug, options) # 関数名は atom で指定する
plug(ModulePlug, options)
```

また、 `Plug.Conn.halt/1` は `pipe/2`マクロにより構築されるプラグパイプラインを途中で中断できます。
`throw ~ catch` を書いて抜ける必要がなくなりました。


### Plug.Router (= get/3, post/3, match/3, etc...)

HTTPメソッド、パスによるルーティングに便利なマクロが提供されます


```diff elixir
defmodule SimpleServer do
- use Plug.Builder
+ use Plug.Router

  ...

- plug(:route)
+ plug(:match)
+ plug(:dispatch)

  ...

- def route(conn, _opts \\ []) do
-   case {conn.method, conn.request_path} do
-     {"GET", "/"} -> conn |> send_resp(200, "Hello, world!")
-     {"GET", "/hello"} -> conn |> send_resp(200, "Hello, #{conn.assigns[:queries].id}!")
-     _ -> conn |> send_resp(404, "Path not found")
-   end
- end

+ get "/" do
+   conn |> send_resp(200, "Hello, world!")
+ end
+
+ get "/hello" do
+   conn |> send_resp(200, "Hello, #{conn.assigns[:queries].id}!")
+ end
+
+ # match は全ての HTTP メソッドにマッチし、かつパスに _ を指定すると全てのパスにマッチする。 (どのルートにもマッチしなかった場合のデフォルトを定義する)
+ match _ do
+   conn |> send_resp(404, "Path not found")
+ end
end
```

`Router` は `Builder` の上に構築され、更に拡張されています。
`plug/2` マクロは引き続き使えて、URLパスとHTTPメソッドによるルーティングを行うためのマクロが追加されています(`get/3`, `post/3`, `put/3`, `patch/3`, `delete/3`...)


まず、ルーティングを行う2つの関数プラグを plug します
(`use Plug.Router` により自動で実装されます)

- `match/2` : 一致するルートを検索する (= `conn.private`にプラグ関数をセットして渡す)
- `dispatch/2` : 渡されたプラグ関数を実行してリクエストを最終的に処理する

その後に、`get/3`, `post/3` マクロなどで、ルートごとの処理を定義する事ができます。
定義されたルートは、Elixir の関数呼び出しパターンマッチングを利用して高速にルーティングされるようです。
(マクロを展開すると、大体↓のような感じになると思われます)

```diff elixir
defmodule SimpleServer do
...
-  plug(:match)
-  plug(:dispatch)
-
-  get "/", do: conn |> send_resp(200, "Hello, world!")
-  get "/hello", do: conn |> send_resp(200, "Hello,#{conn.assigns[:queries].id}!")
-  match _, do: conn |> send_resp(404, "Path not found")
+ # マクロ展開後のイメージ
+  def call(conn, opts) do
+    conn
+    |> # ...その他のプラグパイプライン
+    |> match
+    |> dispatch
+  end
+  
+  def match(conn, _opts) do
+    # do_match/4 の呼び出し (関数呼び出しのパターンマッチによりルーティングする)
+    do_match(conn, conn.method, Plug.Router.Utils.decode_path_info!(conn), conn.host)
+  end
+
+  def dispatch(conn, _opts) do
+    {_path, fun} = Map.fetch!(conn.private, :plug_route)
+    # 最終的に、マッチしたルートの関数でリクエストを処理する
+    fun.(conn)
+  end
+  
+  defp do_match(conn, "GET", "", "localhost") do
+    Plug.Conn.put_private(conn, :plug_route, {"", fn conn -> conn |> send_resp(200, "Hello, world!") end})
+  end
+
+  defp do_match(conn, "GET", "hello", "localhost") do
+    Plug.Conn.put_private(conn, :plug_route, {"hello", fn conn -> conn |> send_resp(200, "Hello,#{conn.assigns[:queries].id}!") end})
+  end
+
+  defp do_match(conn, _method, _path, host) do
+    Plug.Conn.put_private(conn, :plug_route, {_path, fn conn -> conn |> send_resp(404, "Path not found") end})
+  end
...
end
```

## まとめ


他にも色々ありますが、 Plug の基本的な概念や頻出の挙動はこんなところでしょうか。

Phoenix では更に拡張された Plug マクロも出てきます。
知らないマクロが出てきても Plug の基本的な考え方を知っていれば、最終的にはモジュールプラグか関数プラグに変換されて、パイプやパターンマッチなどElixirの標準的な機能で処理されているんだな〜、と推測できそうです。
基本が大事！

Elixir を学ぶ人の大半は Phoenix が目当てで、試しにスタータープロジェクトを作ったらそこにある謎のマクロ記述に圧倒されると思いますが(自分もそうでした)、フレームワークというのはライブラリの集合なので一つ一つ使い方を理解していくと驚きも減ると思われます。


自分も勉強中ですが、この記事がお役に立てば幸いです👋

