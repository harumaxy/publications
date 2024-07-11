---
title: "【Godot4】 MultiplayerSpawner/Sychronizer でマルチプレイ実装"
emoji: "📶"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["godot", "gdscript", "multiplayer"]
published: true
---


Godot4で追加された`MultiplayerSpawner`と`MultiplayerSynchronizer`を使うと、マルチプレイヤーゲームの実装が簡単に出来そう！ということで触ってみた。

https://www.youtube.com/watch?v=nQ4P3ogXp2Q

基本的に上記のyoutubeチュートリアルを参考にしてます。ただ、現在の最新バージョンGodot 4.0 alpha 14だと動かない部分があったので後述。


## MultiplayerSpawner & MultiplayerSynchronizer のできること

- `MultiplayerSpawner` : SceneTreeの同期処理(Nodeの追加、削除)
- `MultiplayerSynchronizer` : Nodeプロパティの同期処理

他のエンジンで言うと何の機能に相当するんだろう...Photon Unity Networking の NetworkedObject とかそういう感じ？

Godotはゲームエンジン本体のAPIにネットワーク機能が組み込まれており、プラグインに頼らず標準機能だけでネットワークゲームを作れる。
`rpc`で他の端末(サーバー, クライアント)のgdscriptメソッドを呼び出すことができ、Godot4では`@rpc`アノテーションでどこで呼び出されるかなどの挙動を制御する(Godot3.xでは`master`, `puppet`のようなワードを使っていたが、4では廃止)

マルチプレイゲームでよく書く処理といえば位置情報などの同期処理だが、`rpc`を使って書くと結構複雑だしいろいろなところで同じようなコードを何度も書くことになる。
Godot4ではこのあたりの使い勝手も改良された機能が追加されており、`MultiplayerSpawner`と`MultiplayerSynchronizer`を使うことで少ないコード量で書けてバグを作り込む確率も少なくなる。

## 前提知識

Godotでネットワーク機能を利用する前提として `ENetMultiPlayerPeer`を作成し、それを`Node.multiplayer.multiplayer_peer`にセットしておく必要がある。


```gdscript
func start_network(is_server: bool):
	var peer = ENetMultiplayerPeer.new()
	if is_server:
		peer.create_server(PORT)
	else:
		peer.create_client("localhost", PORT)
	self.multiplayer.multiplayer_peer = peer
```

ちなみに、SceneTreeにぶら下がっているノードは上位のmultiplayer_peerを継承するので、ネットワーク機能を使うNodeより上で一回だけ設定すればいい。実はシーンノードの上には更に`root`ノードがあるのでそのプロパティにセットしても同様に動く。

```gdscript
  # これでもOK
  get_tree().root.multiplayer.multiplayer_peer = peer

```

これにより、リモートにあるサーバーとクライアントのSceneTreeが接続され、`rpc`が呼べる。`MultiplayerSpawner`, `MultiplayerSynchronizer`は親ノードから継承した`multiplayer_peer`を利用するらしいのでこのような接続確立のコードは前提として必須。

## MultiplayerSpawner

特定のNodeを監視し、その子要素の変更をリモートに同期する。
マルチプレイヤーを行うWorld, Levelに相当するシーンの子要素に追加しておく。

![](https://i.gyazo.com/39d642c3720de635c01689783038ffc9.png)

Inspector の項目

- Spawn Path
  - 同期するNodeのパス。指定したNodeに`add_child()`メソッドでノードが追加されたりするとリモートのSceneTreeにも同期される
- Auto Spawn List
  - 生成を同期するシーンファイル。
  - ここにないSceneノードは同期されない。
  - マルチプレイヤーの生成を同期したいので、`Player.tscn`を追加しておく。
- 残りはデフォルト値でOK

`MultiplayerSpawner` をシーンに追加しプロパティを設定しておくと`add_child()`, `remove_child()`など通常のNodeツリー操作を行うだけで
監視しているNodeのリモートへの同期は自動的に行われる。

```gdscript
# World.gd
extends Node2D

const PlayerScene = preload("res://Player.tscn")

@onready var networked_nodes = $NetworkedNodes
@onready var spawner: MultiplayerSpawner = $MultiplayerSpawner

# Called when the node enters the scene tree for the first time.
func _ready():
	spawner.spawned.connect(func (x): print(x))
	print(spawner._spawnable_scenes)
	print(OS.get_cmdline_args())
	if "--server" in OS.get_cmdline_args():
		start_network(true)
	else:
		start_network(false)

func start_network(is_server: bool):
	var peer = ENetMultiplayerPeer.new()

	if is_server:
		self.multiplayer.peer_connected.connect(self.create_player)
		self.multiplayer.peer_disconnected.connect(self.destroy_player)
		peer.create_server(4242)
		print("server listening on localhost 4242")
	else:
		var target_ip = "localhost"
		peer.create_client(target_ip, 4242)
	
	self.get_tree().root.multiplayer.multiplayer_peer = peer

func create_player(id):
	var p = PlayerScene.instantiate()
	p.name = str(id)
	networked_nodes.add_child(p)

func destroy_player(id):
	networked_nodes.get_node(str(id)).queue_free()
```

peerの接続があった際に、サーバー側の処理でPlayerSceneをインスタンス化してNetworkedNodesの子要素に追加する。クライアントへの同期は自動で行われる


なお、`MultiplayerSpawner`と`MultiplayerSynchronizer`に共通して、値の変更と同期の流れは サーバー -> クライアント となる。

これらのノードを使う際には、スクリプトでは `ローカルの変更をサーバーにpush` -> `サーバーのstateの更新` (-> 自動化された各クライアントへの同期) の流れになる、とイメージして書くと捗るかも



## MultiplayerSynchronizer

特定のNodeのプロパティを監視し、その変更をリモートに同期する。
`MultiplayerSpawner`で生成されるSceneNodeに含んでおく。

![スクリーンショット 2024-07-11 18.02.24.png](https://blog-images.harumaxy.com/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88%202024-07-11%2018.02.24.png)

プロパティ設定

- Root Path
  - 指定したNode Path以下にあるノードのプロパティを同期処理できる
- 残りはデフォルト値でOK

また、後述すると行っていた冒頭のyoutubeチュートリアルそのままだと動かないと行ってた点がここで、エディタでSceneTree上の`MultiplayerSynchronizer`を選択してる状態でエディタの下のパネルに出てくる`Replication`タブから、同期するプロパティを登録しておく必要がある。`Add property to sync...` > `Player.gd` > `sync_position`  と選択しておく。


位置情報の同期の例

```gdscript
#Player.gd
extends CharacterBody2D

...

@export
var sync_position := Vector2.ZERO

...

func is_local_authority() -> bool:
	return name == str(multiplayer.get_unique_id())

func _physics_process(delta):
	# Playerノードの所有者がlocalではなくremote serverの場合は同期されるpositionを使う
	if not is_local_authority():
		position = sync_position
		return
		
  ...
	# 移動処理
  ...
	
	# サーバーに移動後の位置をpushする。1 = server peer id, コールするとサーバーで実行される。
	rpc_id(1, StringName('push_to_server'), position)

@rpc(any_peer, unreliable_ordered)
func push_to_server(_sync_pos: Vector2):
	if not multiplayer.is_server():
		return
	if name != str(multiplayer.get_remote_sender_id()):
		print("someone being naughty!", multiplayer.get_remote_sender_id(), ' tried to update ', name)
		return
	sync_position = _sync_pos
	
```

`CharacterBody2D`のデフォルトスクリプトに、少し書き加えるとすぐにネットワーク同期されるオブジェクトにできる。

普通に自前で同期処理を書こうとしたら

1. クライアントでのstate更新
2. クライアント -> サーバーへのpush
3. サーバーでのstate更新
4. サーバー -> 他のクライアントへのpush
5. 各クライアントでの更新

`MultiplayerSynchronizer` は上の 4, 5　の処理を担うのでその分のコードを省けるが、クライアント->サーバーへのpush処理は書く必要がある。
ただし、これは クライアント->サーバー->他クライアント の方向での同期の話で、サーバー側処理のみで サーバー -> 全クライアント 方向で同期する場合1,2が必要ないので更にコード量は減る。
HPとかスタミナとかアニメーションの状態とか、同期するプロパティの数が多いとそれだけコードが省けるので複雑なゲームほど恩恵はデカそう。

## 参考

自分で書いたコード

https://github.com/harumaxy/godot4-multiplayer-sync-spawn-demo

参考にしたリポジトリ

https://github.com/MitchMakesThings/Godot-Things/tree/main/Networking


## 所感

rpcで同期処理も自前で書く場合と比べて、かなり少ないコードで書けると感じた。

同期処理は複雑だがよく使う機能なので、コードで制御するんじゃなくエンジンに実装されてる標準機能に任せるってのは安心感と手軽さがあって良い。

GodotのAnimationPlayerについて`Animate Everything`なんてフレーズが使われているのをどこかで見た気がするが、それに習って`MultiplayerSpawner`と`MultiplayerSynchronizer`は`Sync Everything`と言えるかもしれない。
