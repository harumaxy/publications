---
title: "便利な Godot EditorScript の tips"
emoji: "✍️"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: [Godot, EditorScript, GDScript]
published: true
---

## EditorScript とは

ゲーム中ではなく、Godot Editor で実行できるツールスクリプト。  

簡単なタスクであれば、プラグインを書くよりもEditorScriptの方が手っ取り早く実行できる。

- 開いているシーンをコードから編集する
- 簡単なコードのデバッグ
- 単純な繰り返し作業の自動化

## 基本的な使い方

EditorScript を継承して、`_run()` メソッドを書くとその中身が実行される。

```gdscript
@tool
extends EditorScript

func _run() -> void:
  print("Hello EditorScript!")
```

EditorScript実行するには Script 画面を開いて `Cmd + Shift + X` のショートカットを押す。  
(または、Script メニューの `File > Run` )

#### Use External Editor を設定してる場合

`Editor Settings > Use External Editor` をオンにしているとスクリプトを開くときに設定した外部エディター(VSCodeなど)で開いてしまう。  
EditorScript を実行するには Godot に内蔵された Script エディターで開いている必要がある。

この問題を解決するには、シーンに空のNodeを作成し、 `Built-in Script: On` にしてスクリプトをアタッチする。

![スクリーンショット 2023-12-19 1.09.04.png](https://blog-images.harumaxy.com/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88%202023-12-19%201.09.04.png)

Built-in Script を編集する場合は、外部エディタを設定していようがGodot内蔵エディタで開かれる。  
`extends` を書き換えてEditorScriptを記述し、実行できる。

ただし、シーン実行しようとするとでエラーが発生する(NodeにアタッチされているのにEditorScriptを継承しようとしている)ので、EditorScriptを実行し終わったらアタッチしたBuilt-in Scriptごとノードを消すこと。

繰り返し使うロジックに関しては、 static method として別のスクリプトに保存しておいて、Built-in Script からはそれを呼び出すだけのコードにするという手もある

```gdscript
class_name MyLogic

static func run(es: EditorScript) -> void:
  # Some EditorScript code ...

```

```gdscript
# Built-in Script
@tool
extends EditorScript

func _run() -> void:
  MyLogic.run(self)

```

## 使用例

### 例.1 ノードのプロパティを表示

現在開いてるシーンのノードを取得し、そのプロパティを表示する。

Godot はエディターやゲーム内のノードなど全ての機能にGDScriptからアクセスできる。  
が、たまにドキュメントに載っていないプロパティや型の曖昧さで実際にどのようなデータがあるのか分かりづらい時がある。

そんなときは `obj.get_property_list()` メソッドの戻り値を print してみよう。


```gdscript
@tool
extends EditorScript

func _run() -> void:
  var skelton = get_scene().get_node("Mesh/Skeleton3D")
  print(skelton.get_property_list().map(func(p): return p.name))
```

ノードのプロパティがどうなってるか確認したかったら、とにかく print しまくるべし。  
`get_propety_list()` の戻り値は辞書型でJSONっぽいフォーマットで出力されるので、VSCodeに.jsonファイルとして貼り付けてフォーマットして閲覧するのも良いかも。


### 例.2 シーンにランダムにCubeを配置する

![スクリーンショット 2023-12-19 0.48.17.png](https://blog-images.harumaxy.com/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88%202023-12-19%200.48.17.png)

```gdscript
func _run() -> void:
  var scene = get_scene() # 現在開いているactiveなシーンを取得
  
  var cubes = Node3D.new()
  scene.add_child(cubes)
  cubes.set_owner(scene)
  cubes.name = "Cubes"
  for i in range(0, 20):
    var cube := CSGBox3D.new()
    cubes.add_child(cube)
    cube.set_owner(scene)
    cube.global_position = Vector3(randf_range(-2, 2), randf_range(-2, 2), randf_range(-2, 2))
```

- ポイント
  - `get_scene()` で現在開いているシーンを取得できる
  - EditorScript で編集した内容を PackedScene に永続化するには、 add_child() の後に `node.set_owner(scene)` を呼ぶ必要がある

コードからシーンを編集するスクリプトの例。  
これを応用することで、プロシージャルにシーンを生成することも可能。  
(ランダムに迷路を生成する、Raycastと組み合わせて地面を検知し草を生やす etc...)


### 例.3 AnimationBlendTree の filters を一括コピーする

EditorScript の威力を最も実感したのがコレ。

Godot 4 になり、アニメーション機能がかなり強化された。  
特に3Dボーンアニメーションは AnimationTree の追加により、アニメーションブレンドなどがかなり強化されている。

例えば、一部のボーンにフィルタをかけてアニメーションブレンドすることで、上半身と下半身で別々のアニメーションを再生することができる。

![スクリーンショット 2023-12-19 1.59.09.png](https://blog-images.harumaxy.com/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88%202023-12-19%201.59.09.png)

が、設定が若干メンドイ。  
ブレンドツリーのノードを選択して、フィルタを適用するボーンを一つ一つクリックしていく必要がある...

![スクリーンショット 2023-12-19 1.59.23.png](https://blog-images.harumaxy.com/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88%202023-12-19%201.59.23.png)

フィルタを適用したいBlendTreeNodeが増えるたびにこの作業をしていくと、クリック回数がかなり増える...作業効率が悪い。

```gdscript
@tool
extends EditorScript

func copy_filters(from_path: String, to_path_list: Array[String]):
  var root := get_scene().get_node("AnimationTree").tree_root as AnimationNodeBlendTree  
  var from := root.get_node(from_path)
  to_path_list.map(func(to_path: String):
    var to = root.get_node(to_path)
    to.filters = from.filters
  )

func _run():
  copy_filters("BlendNode1", ["BlendNode2"])
```

上記のスクリプトを実行することで、コピー元の最初の1つだけ手動で設定すれば、それ移行は同じフィルターを設定したい場合は機械的にコピーできるので楽。

もしくは、`filters`プロパティを print すると String Array で出力されるので、それをフィルターセットの値としてどこかに保存して使い回すという手もある。

```gdscript
@tool
extends EditorScript

func _run():
  var root := get_scene().get_node("AnimationTree").tree_root as AnimationNodeBlendTree
  var filters = root.get_node("BlendNode1").filters
  print(filters)

# [".",
#  "Mesh/Skeleton3D:clavicle_l",
#  "Mesh/Skeleton3D:clavicle_r",
#  "Mesh/Skeleton3D:hand_l",
#  ...]
```

## まとめ

EditorScriptはプラグインよりもかなり手軽に実行できて、ちょっとしたサンプルコードの実行から作業の自動化までいろいろできる。

使いこなして、ゲーム開発を効率化したい。