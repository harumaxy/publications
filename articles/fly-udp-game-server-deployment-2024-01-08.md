---
title: "Fly.io で UDP ゲームサーバーをデプロイ・スケーリングする方法"
emoji: "🎈"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["flyio", "udp", "godot"]
published: false
---

時代はコンテナなので、Godotで作成したゲームサーバーをDockerizeしてホスティングできるサービスが無いかと考えたところ、仕事でも使ってる Fly.io が良さげだった。  
仕事で使ってるものの、あんまり詳しくないのでこれを機に色々調べて実践してみる。

https://fly.io/docs/


この記事で使用している Godot のバージョンは v4.2.1.stable です


## Fly.io での UDP アプリケーションのデプロイ

Dockerfile を用意して `fly launch` する。

```Dockerfile
FROM barichello/godot-ci as build
WORKDIR /app
COPY . /app
RUN godot --headless --export-debug "Linux/X11" /app/server.pck


FROM ubuntu:latest as app
WORKDIR /app
RUN apt-get update && apt-get install -y \
  curl \
  unzip
RUN curl -LO https://github.com/godotengine/godot-builds/releases/download/4.2.1-stable/Godot_v4.2.1-stable_linux.x86_64.zip \
  && unzip Godot_v4.2.1-stable_linux.x86_64.zip \
  && rm Godot_v4.2.1-stable_linux.x86_64.zip
RUN apt-get install -y fontconfig
COPY --from=build /app/server.pck /app/server.pck

# Godot can't listen the hostname, so we need to fix it to IP address
RUN export IP_ADDR=$(cat /etc/hosts | grep fly-global-services | awk '{print $1}')

ENTRYPOINT ["./Godot_v4.2.1-stable_linux.x86_64", "--headless", "--main-pack", "server.pck", "--server"]
```


```toml
app = "godot-game-server-pool"
primary_region = "nrt"

[build]
PORT=5000

[[services]]
protocol = "udp"
internal_port = 5000

[[services.ports]]
port = 5000

[[vm]]
cpu_kind = "shared"
cpus = 1
memory_mb = 256
```

[Fly で UDPトラフィックを受診するには、外部/内部で同じポートでlistenする必要がある](https://fly.io/docs/app-guides/udp-and-tcp/#udp-must-listen-on-the-same-port-externally-and-internally)

```sh
flyctl launch
flyctl deploy
flyctl ips allocate-v4
```

Fly.io のアプリを作成するとデフォルトで IPv6 が割り当てられるが、現在(2024年1月時点)では[Fly.ioでの UDP over IPv6 がサポートされていない](https://fly.io/docs/app-guides/udp-and-tcp/#udp-wont-work-over-ipv6)。  
UDP アプリケーションは専用IPv4アドレスを割り当てる必要がある。(有料 2$/mo)

更に、UDPサーバーの場合は `0.0.0.0` とか `*` とかではなく、この[割り当てた専用IPv4アドレスをbindする必要がある](https://fly.io/docs/app-guides/udp-and-tcp/#udp-wont-work-over-ipv6)。

UDPサーバーマシンを起動すると、 `/etc/hosts` に `{専用ipv4}  fly-global-services` が追加される。
ただし、Godotでゲームサーバーを立てる際はホスト名でリッスンできないので、IPアドレスを取り出して環境変数で渡すようにする。

```Dockerfile
RUN export IP_ADDR=$(cat /etc/hosts | grep fly-global-services | awk '{print $1}')
```



## サーバー/クライアント GDScript

とりあえず、
ゲームを起動するときのコマンド引数 (`--server`/`--client`) でモードを切り替える

```gdscript
extends Node2D

var IP_ADDR = "*"
var PORT = 5000
var SERVER_DOMAIN = "localhost"

func _ready() -> void:
  # load env
  if OS.get_environment("IP_ADDR"):
    IP_ADDR = OS.get_environment("IP_ADDR")
  if OS.get_environment("PORT"):
    PORT = int(OS.get_environment("PORT"))
  if OS.get_environment("SERVER_DOMAIN"):
    SERVER_DOMAIN = OS.get_environment("SERVER_DOMAIN")

  var args = OS.get_cmdline_args()
  if "--server" in args:
    start_server()
  elif "--client" in args:
    start_client()
  else:
    print("pass --server or --client to args")
    get_tree().quit()


func start_server():
  var server = ENetMultiplayerPeer.new()
  server.set_bind_ip(IP_ADDR)
  server.create_server(PORT, 4)
  multiplayer.multiplayer_peer = server
  multiplayer.peer_connected.connect(func(id):
    print("connected by: ", id)
  )
  multiplayer.peer_disconnected.connect(func(id):
    print("disconnected by: ", id)
  )

func start_client():
  var client = ENetMultiplayerPeer.new()
  client.create_client(SERVER_DOMAIN, PORT)
  print("connecting to server...")
  multiplayer.multiplayer_peer = client
  multiplayer.connected_to_server.connect(func():
    print("connected to server")
  )
  multiplayer.server_disconnected.connect(func():
    print("disconnected from server")
  )

```

デプロイしたサーバーへの接続を試すには以下のコマンド  
(Godot の実行ファイルに alias を貼っておくのを前提とする)

```sh
export SERVER_DOMAIN="{app_name}.fly.dev"
godot --headless -d main.tscn --client
```

## UDPサーバーをスケールアウトする

実際にゲームサービスを運用するとなると、プレイヤーの数に応じてゲームサーバーを増やす必要がある。  
ゲームサーバーマネージャー的な別の Fly App を立ち上げるのがベターだが、ここでは簡単にシェルスクリプトでやってみる。

#### NGな方法
app のコンフィグによる `flyctl scale` コマンドだと、同じポート設定のままマシンを増やすので良くない。  
試したところ、 5000 ポートをリッスンしているので `{app_name}.fly.dev:5000` にUDPを飛ばすと同じポートをlistenするマシンにラウンドロビン方式で順番にUDPリクエストが振り分けられる。

Webサーバーのようなステートレスなものなら問題ないが、リアルタイムゲームのサーバーのようなステートフルなものは接続を確立した特定の同じマシンに毎回リクエストを送りたい。

```sh
# これはダメ
flyctl scale count 3
```

#### OKな方法: Fly Machine API

https://fly.io/docs/machines/working-with-machines

fly は REST API 経由でマシンを作成・開始・停止・削除できる。

マニュアル作成では作成するマシンごとに詳細を設定できる。
例えば、マシンごとに個別にポートマッピングなどが設定できるので、特定のマシンにアクセスすることができるようになる。

例. 5001番ポートをリッスンするマシンの作成


```sh
OFFSET=1
PORT_START=5000
PORT=$(($PORT_START + $OFFSET))

CONFIG='{
  "config": {
    "env": {
      "PORT": "'$PORT'"
    },
    "guest": {
      "cpu_kind": "shared",
      "cpus": 1,
      "memory_mb": 256
    },
    "services": [
      {
        "protocol": "udp",
        "internal_port": '$PORT',
        "ports": [
          {
            "port": '$PORT'
          }
        ]
      }
    ],
    "image": "registry.fly.io/{app_name}:latest"
  }
}'

FLY_TOKEN="your fly token"


curl -X POST \
  -d "$CONFIG" \
  -H "Authorization: Bearer $FLY_TOKEN" \
  "https://api.machines.dev/v1/apps/{app_name}/machines"
```

これで作成すると、 `{app_name}.fly.dev:5001` のドメインからアクセスできるUDPゲームサーバーが立ち上がる。  
更に増やしたいときは `5002, 5003, 5004...` と既に立てたサーバーと被らないポートを設定していく。

#### flyctl deploy するときの docker image ラベル

そのまま `flyctl deploy` すると、Deployment ID を含んだラベルになる。  
例. `registry.fly.io/{app_name}:deployment-xxxx`

この Deployment ID を調べるのが面倒なので、毎回 `:latest` ラベルを付けてデプロイしておく

```sh
flyctl deploy --image-label latest
```


#### Fly Machine の効率的な軌道

ドキュメントによると、Fly Machine の start/stop のほうが create/destroy と比べてかなり速い。  
利用されるサーバー数を事前に予測できるなら、足りなくなるまえに事前に作成しておいて start,または使い終わった Machine は破棄せず stop して再利用するとアプリケーションのスケーリングが高速化するかも。

https://fly.io/docs/apps/scale-count/


## 番外: UDP ではなく WebSocket でリアルタイムサーバーを立てる時

Fly App へのリクエストは基本的にすべて Fly Proxy を経由している。
HTTPリクエストだと `fly-replay` ヘッダーを使って特定のマシンにリクエストをルーティングができる。

つまり、WebSocketでも最初のコネクション時のリクエストが HTTP なので、これを利用して特定のマシンにつなぐことができそう...?
(試してないのでわからないが...)

https://fly.io/docs/reference/dynamic-request-routing/


そのた役立ちそうなページ
- https://community.fly.io/t/does-fly-replay-work-with-websockets/10963
- https://fly.io/blog/replicache-machines-demo/


UDPのほうが通信速度は速いが、WebSocketはHTTP関連のサポートの恩恵を受けられるしブラウザでも動作するので、トレードオフ。  
Fly.io でホストすることを考えても、UDPサービスはWebSocketと比べてポートの管理が若干複雑な気がするので、それを考えなくていいというのもある。

ちなみに Godot では WebScoket peer を用いたマルチプレイヤーも可能。





## 感想・まとめ

Fly.io での Docker コンテナを使ったサービスの設定は簡単でやりやすいと思う。
(AWS ECS とか Kubernetes と比較して)
デプロイするだけならコマンド一発。マシンスペックのカスタマイズもConfigファイルベースでできる。
REST API 経由での操作も可能。

UDPサービスもできるし、ルーティングやマシンのスケーリングなど細かいところもいじれるのでおすすめ。



## 参考 : UDP echo デモ

同じポートで複数のUDPサーバーを立てるとラウンドロビン式で負荷分散されているのを確かめる時、下のサンプルを使用した

https://github.com/fly-apps/udp-echo-

環境変数で `FLY_MACHINE_ID` がわかるので、UDP echo のときにそれを付けて返す

```go
machine_id := os.Getenv("FLY_MACHINE_ID")
bytes := []byte(fmt.Sprintf("%s: %s", machine_id, string(packet[:n])))
c.WriteTo(bytes, addr)
```

netcat などのクライアントで接続すると簡単にデバッグできる。