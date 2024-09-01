---
slug: "3f44a5c6-ce99-4ea1-bd9c-535e71ee9b3b"
title: "BlenderでGLTFをインポート、エクスポートするときのアニメーションの名前"
published_at: "2023-12-28T00:04:26Z"
draft: false
thumbnail: 'https://blog-images.harumaxy.com/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88%202023-12-28%200.05.40.png'
tags: ["blender", "gltf", "nla"]
---


GLTF (GLB) 形式で Unreal Engine のアセットからエクスポートしてきたアニメーションを Godot で使ってみた際、アニメーションの名前がなんかすごい冗長な感じになっていた。  
`.00X_Mesh` みたいな連番数値が付いてたり、`Manny_` とか `Quinn_` とかのプレフィックスが付いてたりしていた。


で、いちいち目的のアニメーションを探すのに面倒なので、Blender Python で一括リネームしてみる

```python
import bpy
import re

suffix = re.compile(".[0-9]+_Mesh")
prefix = re.compile("(Manny|Quinn)_")

for a in bpy.data.actions:
    new_name = suffix.sub("", prefix.sub("", a.name))
    a.name = new_name

```

で、エクスポートしてみるがなぜか名前が変わってない...

## 原因

色々見てみた結果、 NLA (Non Linear Animation) トラックがあると、そっちの名前が優先されるらしい。  
(NLAが何なのか良く分かってない...)

アニメーションを含む GLTF をインポートすると、Action (blenderでのアニメーション単位)が全て NLA トラックにプッシュされた状態になる。

![スクリーンショット 2023-12-28 0.05.40.png](https://blog-images.harumaxy.com/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88%202023-12-28%200.05.40.png)

NLA トラックさえ消せば、 Action のほうの名前でエクスポートされるので、コレも Python で一括でやりたい。

NLAの操作方法がわからないので、ChatGPTに聞いてみた。


```python
## prompt : python で Blender の NLA トラックを削除する方法

import bpy

# オブジェクトの名前を指定
obj_name = "Mesh"

# オブジェクトを取得
obj = bpy.data.objects[obj_name]

# アニメーションデータがあることを確認
if obj.animation_data:
    # NLAトラックを取得
    nla_tracks = obj.animation_data.nla_tracks
    # 各NLAトラックに対して処理
    for track in nla_tracks:
        nla_tracks.remove(track)

```

## まとめ

これでGLTF形式でインポートしたアニメーション名から冗長なsuffix/prefixを削除して、GLTFとして再エクスポートできる。

Blender Python 便利だけど使い方がよくわからん...  
ChatGPT に感謝
